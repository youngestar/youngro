"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { SpeechProviderConfig } from "./providersStore";

export interface VoiceInfo {
  id: string;
  name: string;
  provider: string;
  description?: string;
  previewUrl?: string;
  gender?: string;
  languages?: {
    code: string;
    title: string;
  }[];
  metadata?: Record<string, unknown>;
}

interface VoiceLoadBucket {
  status: "idle" | "loading" | "success" | "error";
  error?: string | null;
  lastFetched?: number;
}

interface VoiceFetchOptions {
  force?: boolean;
}

interface SpeechStoreState {
  activeProviderId: string | null;
  activeModelId: string | null;
  activeVoiceId: string | null;
  voiceSelections: Record<string, string>;
  pitch: number;
  rate: number;
  useSSML: boolean;
  autoplayReplies: boolean;
  availableVoices: Record<string, VoiceInfo[]>;
  voiceStatus: Record<string, VoiceLoadBucket>;
  setActiveProvider: (providerId: string | null) => void;
  setActiveModel: (modelId: string | null) => void;
  setActiveVoice: (voiceId: string | null) => void;
  clearVoiceSelection: (providerId?: string | null) => void;
  setPitch: (pitch: number) => void;
  setRate: (rate: number) => void;
  setUseSSML: (enabled: boolean) => void;
  setAutoplayReplies: (enabled: boolean) => void;
  fetchVoices: (
    providerId: string,
    config: SpeechProviderConfig,
    options?: VoiceFetchOptions
  ) => Promise<VoiceInfo[]>;
}

const VOICE_TTL_MS = 5 * 60 * 1000;

export const useSpeechStore = create<SpeechStoreState>()(
  persist(
    (set, get) => ({
      activeProviderId: null,
      activeModelId: null,
      activeVoiceId: null,
      voiceSelections: {},
      pitch: 0,
      rate: 1,
      useSSML: false,
      autoplayReplies: false,
      availableVoices: {},
      voiceStatus: {},
      setActiveProvider: (providerId) => {
        set((state) => {
          const nextVoice = providerId
            ? (state.voiceSelections[providerId] ?? null)
            : null;
          return { activeProviderId: providerId, activeVoiceId: nextVoice };
        });
      },
      setActiveModel: (modelId) => {
        set({ activeModelId: modelId });
      },
      setActiveVoice: (voiceId) => {
        set((state) => {
          const providerId = state.activeProviderId;
          if (!providerId) {
            return { activeVoiceId: voiceId };
          }
          const nextSelections = { ...state.voiceSelections };
          if (voiceId) {
            nextSelections[providerId] = voiceId;
          } else {
            delete nextSelections[providerId];
          }
          return { activeVoiceId: voiceId, voiceSelections: nextSelections };
        });
      },
      clearVoiceSelection: (providerId) => {
        set((state) => {
          const target = providerId ?? state.activeProviderId;
          if (!target) return {};
          if (!state.voiceSelections[target]) {
            const shouldClearActive =
              target === state.activeProviderId && state.activeVoiceId
                ? { activeVoiceId: null }
                : {};
            return shouldClearActive;
          }
          const nextSelections = { ...state.voiceSelections };
          delete nextSelections[target];
          const shouldClearActive =
            target === state.activeProviderId ? { activeVoiceId: null } : {};
          return { voiceSelections: nextSelections, ...shouldClearActive };
        });
      },
      setPitch: (pitch) => set({ pitch }),
      setRate: (rate) => set({ rate }),
      setUseSSML: (enabled) => set({ useSSML: enabled }),
      setAutoplayReplies: (enabled) => set({ autoplayReplies: enabled }),
      fetchVoices: async (providerId, config, options) => {
        if (!providerId) return [];
        const state = get();
        const status = state.voiceStatus[providerId];
        const now = Date.now();
        const fresh =
          status?.status === "success" &&
          status.lastFetched &&
          now - status.lastFetched < VOICE_TTL_MS;
        if (!options?.force && fresh) {
          return state.availableVoices[providerId] || [];
        }

        set((prev) => ({
          voiceStatus: {
            ...prev.voiceStatus,
            [providerId]: { status: "loading", error: null },
          },
        }));

        try {
          const response = await fetch(
            `/api/speech/providers/${providerId}/voices`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              // Send full config so provider-specific fields (e.g. secretId/secretKey)
              // are available to the server-side proxy handler.
              body: JSON.stringify(config),
            }
          );

          if (!response.ok) {
            const errorPayload = await response.json().catch(() => ({}));
            const message =
              (errorPayload as { error?: string; detail?: string }).error ||
              response.statusText ||
              "Failed to load voices";
            throw new Error(message);
          }

          const payload = (await response.json()) as { voices?: VoiceInfo[] };
          const voices = payload.voices || [];

          set((prev) => ({
            availableVoices: { ...prev.availableVoices, [providerId]: voices },
            voiceStatus: {
              ...prev.voiceStatus,
              [providerId]: { status: "success", lastFetched: Date.now() },
            },
          }));

          return voices;
        } catch (error) {
          const message =
            error instanceof Error ? error.message : String(error);
          set((prev) => ({
            voiceStatus: {
              ...prev.voiceStatus,
              [providerId]: { status: "error", error: message },
            },
          }));
          return [];
        }
      },
    }),
    {
      name: "youngro.speech.v1",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        activeProviderId: state.activeProviderId,
        activeModelId: state.activeModelId,
        activeVoiceId: state.activeVoiceId,
        voiceSelections: state.voiceSelections,
        pitch: state.pitch,
        rate: state.rate,
        useSSML: state.useSSML,
        autoplayReplies: state.autoplayReplies,
        availableVoices: state.availableVoices,
        voiceStatus: state.voiceStatus,
      }),
    }
  )
);
