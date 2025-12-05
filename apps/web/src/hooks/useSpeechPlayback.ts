import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useChatStore } from "@youngro/chat-zustand";

import { useSpeechStore } from "../store/speechStore";
import {
  useProvidersStore,
  type SpeechProviderConfig,
} from "../store/providersStore";
import { useSpeechResources } from "./useSpeechResources";
import type { BaseMessage } from "@youngro/chat-zustand";

export type SpeechPlaybackStatus = "idle" | "loading" | "playing" | "error";

interface UseSpeechPlaybackResult {
  enabled: boolean;
  setEnabled: (value: boolean) => void;
  status: SpeechPlaybackStatus;
  error: string | null;
  ready: boolean;
  canPlayLatest: boolean;
  playLatestManually: () => void;
  stopPlayback: () => void;
}

function base64ToBlob(base64: string, mimeType: string) {
  const byteCharacters = atob(base64);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i += 1) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: mimeType });
}

function findLatestAssistantMessage(messages: BaseMessage[]) {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const msg = messages[i];
    if (!msg) continue;
    if (msg.role !== "assistant") continue;
    if (typeof msg.content !== "string") continue;
    const trimmed = msg.content.trim();
    if (!trimmed) continue;
    return { id: msg.id ?? String(i), text: trimmed };
  }
  return null;
}

export function useSpeechPlayback(): UseSpeechPlaybackResult {
  const messages = useChatStore((state) => state.messages);
  const sending = useChatStore((state) => state.sending);
  const {
    activeProviderId,
    activeVoiceId,
    pitch,
    rate,
    useSSML,
    autoplayReplies,
    setAutoplayReplies,
  } = useSpeechStore((state) => ({
    activeProviderId: state.activeProviderId,
    activeVoiceId: state.activeVoiceId,
    pitch: state.pitch,
    rate: state.rate,
    useSSML: state.useSSML,
    autoplayReplies: state.autoplayReplies,
    setAutoplayReplies: state.setAutoplayReplies,
  }));

  const providerState = useProvidersStore((state) =>
    activeProviderId ? state.getProvider(activeProviderId) : undefined
  );

  const providerConfig = providerState?.config as
    | SpeechProviderConfig
    | undefined;

  const { voices, fetchVoices } = useSpeechResources({
    providerId: activeProviderId || undefined,
  });

  useEffect(() => {
    if (!activeProviderId || !providerState?.configured) return;
    if (voices?.length) return;
    if (!providerConfig) return;
    void fetchVoices(undefined, providerConfig);
  }, [activeProviderId, providerState, voices, fetchVoices, providerConfig]);

  const latestAssistant = useMemo(
    () => findLatestAssistantMessage(messages),
    [messages]
  );

  const [status, setStatus] = useState<SpeechPlaybackStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const lastPlayedIdRef = useRef<string | null>(null);
  const bootstrappedRef = useRef(false);

  const cleanupAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
    }
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    setStatus("idle");
  }, []);

  useEffect(() => {
    return () => {
      cleanupAudio();
    };
  }, [cleanupAudio]);

  const providerReady = Boolean(
    activeProviderId &&
      activeVoiceId &&
      providerState?.configured &&
      providerConfig
  );

  const synthesize = useCallback(
    async (text: string) => {
      if (!providerReady || !activeProviderId || !activeVoiceId) return;
      setStatus("loading");
      setErrorMessage(null);
      try {
        const voice = voices?.find((v) => v.id === activeVoiceId);
        const response = await fetch(
          `/api/speech/providers/${activeProviderId}/synthesize`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ...(providerConfig as SpeechProviderConfig),
              text,
              ssmlEnabled: useSSML,
              voiceId: activeVoiceId,
              voiceMetadata: voice?.metadata,
              pitch,
              rate,
            }),
          }
        );

        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as {
            error?: string;
            detail?: string;
          } | null;
          throw new Error(payload?.error || payload?.detail || "语音合成失败");
        }

        const data = (await response.json()) as {
          audio?: string;
          mimeType?: string;
        };

        if (!data.audio) {
          throw new Error("未获得音频数据");
        }

        const blob = base64ToBlob(data.audio, data.mimeType || "audio/mpeg");
        if (objectUrlRef.current) {
          URL.revokeObjectURL(objectUrlRef.current);
        }
        const url = URL.createObjectURL(blob);
        objectUrlRef.current = url;

        if (!audioRef.current) {
          audioRef.current = new Audio();
        } else {
          audioRef.current.pause();
          audioRef.current.currentTime = 0;
        }

        audioRef.current.src = url;
        await audioRef.current.play();
        setStatus("playing");
        audioRef.current.onended = () => {
          cleanupAudio();
        };
      } catch (error) {
        cleanupAudio();
        setStatus("error");
        setErrorMessage(error instanceof Error ? error.message : String(error));
      }
    },
    [
      providerReady,
      activeProviderId,
      activeVoiceId,
      voices,
      providerConfig,
      useSSML,
      pitch,
      rate,
      cleanupAudio,
    ]
  );

  useEffect(() => {
    if (!bootstrappedRef.current && latestAssistant) {
      bootstrappedRef.current = true;
      lastPlayedIdRef.current = latestAssistant.id;
    }
  }, [latestAssistant]);

  useEffect(() => {
    if (!autoplayReplies) return;
    if (!providerReady) return;
    if (!latestAssistant) return;
    if (sending) return;
    if (lastPlayedIdRef.current === latestAssistant.id) return;

    lastPlayedIdRef.current = latestAssistant.id;
    void synthesize(latestAssistant.text);
  }, [autoplayReplies, providerReady, latestAssistant, sending, synthesize]);

  useEffect(() => {
    if (!autoplayReplies && latestAssistant) {
      lastPlayedIdRef.current = latestAssistant.id;
    }
  }, [autoplayReplies, latestAssistant]);

  const playLatestManually = useCallback(() => {
    if (!latestAssistant || !providerReady) return;
    lastPlayedIdRef.current = latestAssistant.id;
    void synthesize(latestAssistant.text);
  }, [latestAssistant, providerReady, synthesize]);

  return {
    enabled: autoplayReplies,
    setEnabled: setAutoplayReplies,
    status,
    error: errorMessage,
    ready: providerReady,
    canPlayLatest: Boolean(latestAssistant && providerReady),
    playLatestManually,
    stopPlayback: cleanupAudio,
  };
}

export default useSpeechPlayback;
