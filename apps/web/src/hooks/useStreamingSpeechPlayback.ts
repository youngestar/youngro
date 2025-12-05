import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useChatStore } from "@youngro/chat-zustand";

import {
  useProvidersStore,
  type SpeechProviderConfig,
} from "../store/providersStore";
import { useSpeechStore } from "../store/speechStore";
import { useSpeechResources } from "./useSpeechResources";
import {
  chunkEmitter,
  TTS_FLUSH_INSTRUCTION,
  TTS_SPECIAL_TOKEN,
  type TTSChunkItem,
} from "../lib/tts/chunker";

export type StreamingSpeechStatus =
  | "idle"
  | "chunking"
  | "buffering"
  | "playing"
  | "error";

export interface StreamingSpeechPlaybackState {
  enabled: boolean;
  setEnabled: (value: boolean) => void;
  ready: boolean;
  status: StreamingSpeechStatus;
  error: string | null;
  queueSize: number;
  lastEmotion: string | null;
  stop: () => void;
}

interface TextPipeline {
  pushLiteral: (value: string) => void;
  pushSpecial: (token: string) => void;
  flush: () => void;
  dispose: () => void;
}

interface PlaybackAudioItem {
  kind: "audio";
  url: string;
  text: string;
  special: string | null;
}

interface QueuedChunk {
  payload: TTSChunkItem;
  generation: number;
}

const encoder = new TextEncoder();

function base64ToBlob(base64: string, mimeType: string) {
  const byteCharacters = atob(base64);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i += 1) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: mimeType });
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function createTextPipeline(
  onChunk: (chunk: TTSChunkItem) => Promise<void> | void
): TextPipeline {
  const pendingSpecials: string[] = [];
  let controller: ReadableStreamDefaultController<Uint8Array> | null = null;
  let disposed = false;

  const stream = new ReadableStream<Uint8Array>({
    start(ctrl) {
      controller = ctrl;
    },
  });

  const reader = stream.getReader();
  void chunkEmitter(reader, pendingSpecials, async (chunk) => {
    if (disposed) return;
    await onChunk(chunk);
  }).catch((error) => {
    if (!disposed) {
      console.error("TTS chunk emitter failed", error);
    }
  });

  return {
    pushLiteral: (value) => {
      if (!controller || !value) return;
      controller.enqueue(encoder.encode(value));
    },
    pushSpecial: (token) => {
      if (!controller) return;
      pendingSpecials.push(token);
      controller.enqueue(encoder.encode(TTS_SPECIAL_TOKEN));
    },
    flush: () => {
      if (!controller) return;
      controller.enqueue(encoder.encode(TTS_FLUSH_INSTRUCTION));
    },
    dispose: () => {
      disposed = true;
      try {
        controller?.close();
      } catch {
        /* ignore */
      }
      controller = null;
    },
  } satisfies TextPipeline;
}

function parseDelaySeconds(token: string): number | null {
  const match = /<\|DELAY:([0-9]+(?:\.[0-9]+)?)\|>/i.exec(token);
  if (!match || !match[1]) return null;
  const seconds = parseFloat(match[1]);
  if (Number.isNaN(seconds) || seconds <= 0) return null;
  return seconds;
}

function parseEmotionName(token: string): string | null {
  const match = /<\|EMOTE_([A-Z0-9_]+)\|>/i.exec(token);
  if (!match || !match[1]) return null;
  return match[1];
}

export function useStreamingSpeechPlayback(): StreamingSpeechPlaybackState {
  const { registerOnStreamingTokens, registerOnStreamFlush, sending } =
    useChatStore();

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
    if (!providerConfig) return;
    if (voices?.length) return;
    void fetchVoices(undefined, providerConfig);
  }, [
    activeProviderId,
    providerConfig,
    providerState?.configured,
    voices,
    fetchVoices,
  ]);

  const providerReady = useMemo(
    () =>
      Boolean(
        activeProviderId &&
          activeVoiceId &&
          providerState?.configured &&
          providerConfig
      ),
    [activeProviderId, activeVoiceId, providerState?.configured, providerConfig]
  );

  const [status, setStatus] = useState<StreamingSpeechStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastEmotion, setLastEmotion] = useState<string | null>(null);
  const [queueSize, setQueueSize] = useState(0);

  const pipelineRef = useRef<TextPipeline | null>(null);
  const chunkGenerationRef = useRef(0);
  const chunkQueueRef = useRef<QueuedChunk[]>([]);
  const chunkWorkerPromiseRef = useRef<Promise<void> | null>(null);
  const playbackQueueRef = useRef<PlaybackAudioItem[]>([]);
  const isPlayingRef = useRef(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const clearPlaybackQueue = useCallback(() => {
    const queue = playbackQueueRef.current;
    while (queue.length > 0) {
      const item = queue.shift();
      if (item?.kind === "audio") {
        URL.revokeObjectURL(item.url);
      }
    }
    setQueueSize(0);
  }, []);

  const stopAudioPlayback = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current.onended = null;
      audioRef.current.onerror = null;
    }
    isPlayingRef.current = false;
    clearPlaybackQueue();
    setStatus("idle");
  }, [clearPlaybackQueue]);

  const clearPendingWork = useCallback(() => {
    chunkGenerationRef.current += 1;
    chunkQueueRef.current = [];
    stopAudioPlayback();
    setLastEmotion(null);
  }, [stopAudioPlayback]);

  const hardResetPipeline = useCallback(() => {
    try {
      pipelineRef.current?.dispose();
    } finally {
      pipelineRef.current = null;
    }
    clearPendingWork();
  }, [clearPendingWork]);

  const handleSpecialInstruction = useCallback(async (token: string | null) => {
    if (!token) return;
    const delaySeconds = parseDelaySeconds(token);
    if (delaySeconds) {
      setStatus("buffering");
      await sleep(delaySeconds * 1000);
      return;
    }
    const emotion = parseEmotionName(token);
    if (emotion) {
      setLastEmotion(emotion);
    }
  }, []);

  const scheduleNextPlayback = useCallback(() => {
    if (isPlayingRef.current) return;
    const next = playbackQueueRef.current.shift();
    setQueueSize(playbackQueueRef.current.length);
    if (!next) {
      if (!sending) setStatus("idle");
      return;
    }

    if (next.kind === "audio") {
      let audio = audioRef.current;
      if (!audio) {
        audio = new Audio();
        audioRef.current = audio;
      }
      isPlayingRef.current = true;
      setStatus("playing");
      audio.src = next.url;
      const finalize = () => {
        URL.revokeObjectURL(next.url);
        void handleSpecialInstruction(next.special).finally(() => {
          isPlayingRef.current = false;
          scheduleNextPlayback();
        });
      };
      audio.onended = finalize;
      audio.onerror = (event) => {
        console.error("Audio playback error", event);
        setErrorMessage("语音播放失败");
        setStatus("error");
        finalize();
      };
      void audio.play().catch((error) => {
        console.error("audio play rejected", error);
        setErrorMessage(
          error instanceof Error ? error.message : "语音播放失败"
        );
        setStatus("error");
        finalize();
      });
    }
  }, [handleSpecialInstruction, sending]);

  const enqueuePlaybackItem = useCallback(
    (item: PlaybackAudioItem) => {
      playbackQueueRef.current.push(item);
      setQueueSize(playbackQueueRef.current.length);
      if (!isPlayingRef.current) {
        scheduleNextPlayback();
      }
    },
    [scheduleNextPlayback]
  );

  const synthesizeChunk = useCallback(
    async (text: string) => {
      if (!providerReady || !activeProviderId || !activeVoiceId) {
        return null;
      }
      const trimmed = text.trim();
      if (!trimmed) return null;
      setStatus((prev) => (prev === "playing" ? prev : "buffering"));
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
              text: trimmed,
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
        return base64ToBlob(data.audio, data.mimeType || "audio/mpeg");
      } catch (error) {
        setStatus("error");
        setErrorMessage(error instanceof Error ? error.message : String(error));
        console.error("synthesize chunk failed", error);
        return null;
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
    ]
  );

  const processChunk = useCallback(
    async (chunk: TTSChunkItem) => {
      if (!chunk.chunk?.trim() && chunk.special) {
        await handleSpecialInstruction(chunk.special);
        return;
      }
      if (!chunk.chunk?.trim()) return;
      const blob = await synthesizeChunk(chunk.chunk);
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      enqueuePlaybackItem({
        kind: "audio",
        url,
        text: chunk.chunk,
        special: chunk.special ?? null,
      });
    },
    [enqueuePlaybackItem, handleSpecialInstruction, synthesizeChunk]
  );

  const ensureChunkWorker = useCallback(() => {
    if (chunkWorkerPromiseRef.current) return;
    chunkWorkerPromiseRef.current = (async () => {
      while (chunkQueueRef.current.length > 0) {
        const next = chunkQueueRef.current.shift();
        if (!next) continue;
        if (next.generation !== chunkGenerationRef.current) {
          continue; // dropped due to reset
        }
        try {
          await processChunk(next.payload);
        } catch (error) {
          console.error("process chunk failed", error);
        }
      }
    })()
      .catch((error) => {
        console.error("chunk queue drain failed", error);
      })
      .finally(() => {
        chunkWorkerPromiseRef.current = null;
        if (chunkQueueRef.current.length > 0) {
          ensureChunkWorker();
        }
      });
  }, [processChunk]);

  const enqueueChunk = useCallback(
    (chunk: TTSChunkItem) => {
      chunkQueueRef.current.push({
        payload: chunk,
        generation: chunkGenerationRef.current,
      });
      ensureChunkWorker();
    },
    [ensureChunkWorker]
  );

  const enqueueChunkRef = useRef(enqueueChunk);
  useEffect(() => {
    enqueueChunkRef.current = enqueueChunk;
  }, [enqueueChunk]);

  useEffect(() => {
    if (!autoplayReplies || !providerReady) {
      hardResetPipeline();
      return;
    }

    pipelineRef.current = createTextPipeline(async (chunk) => {
      enqueueChunkRef.current?.(chunk);
    });

    setStatus("chunking");

    return () => {
      hardResetPipeline();
    };
  }, [autoplayReplies, providerReady, hardResetPipeline]);

  useEffect(() => {
    if (!autoplayReplies || !providerReady || !pipelineRef.current) return;
    const unsubTokens = registerOnStreamingTokens?.((payload) => {
      if (!payload.text && !payload.tokens?.length) return;
      if (payload.text) {
        pipelineRef.current?.pushLiteral(payload.text);
      }
      payload.tokens?.forEach((token) => {
        pipelineRef.current?.pushSpecial(token.raw);
      });
      setStatus((prev) => (prev === "idle" ? "chunking" : prev));
    });
    const unsubFlush = registerOnStreamFlush?.(() => {
      const pipeline = pipelineRef.current;
      if (!pipeline) return;
      // Mimic AIRI's behavior by injecting explicit flush markers via the literal path
      // so chunkEmitter always sees a final boundary before we trigger the manual flush.
      pipeline.pushLiteral(`${TTS_FLUSH_INSTRUCTION}${TTS_FLUSH_INSTRUCTION}`);
      pipeline.flush();
    });
    return () => {
      unsubTokens?.();
      unsubFlush?.();
    };
  }, [
    autoplayReplies,
    providerReady,
    registerOnStreamFlush,
    registerOnStreamingTokens,
  ]);

  useEffect(() => {
    return () => {
      hardResetPipeline();
    };
  }, [hardResetPipeline]);

  return {
    enabled: autoplayReplies,
    setEnabled: setAutoplayReplies,
    ready: providerReady,
    status,
    error: errorMessage,
    queueSize,
    lastEmotion,
    stop: clearPendingWork,
  } satisfies StreamingSpeechPlaybackState;
}

export default useStreamingSpeechPlayback;
