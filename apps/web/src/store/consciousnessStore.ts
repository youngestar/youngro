"use client";

import { create } from "zustand";
import { useEffect } from "react";
import { useProvidersStore } from "./providersStore";

interface ConsciousnessState {
  activeProviderId: string;
  activeModelId: string;
  customModelName: string;
  modelSearchQuery: string;
  setActiveProvider: (id: string) => void;
  setActiveModel: (id: string) => void;
  setCustomModelName: (name: string) => void;
  setModelSearchQuery: (q: string) => void;
}

const STORAGE_KEY = "youngro.consciousness.v1";

type PersistShape = Pick<
  ConsciousnessState,
  "activeProviderId" | "activeModelId" | "customModelName"
>;

function loadPersisted(): PersistShape | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PersistShape>;
    return {
      activeProviderId: parsed.activeProviderId || "",
      activeModelId: parsed.activeModelId || "",
      customModelName: parsed.customModelName || "",
    };
  } catch {
    return null;
  }
}

function savePersisted(state: ConsciousnessState) {
  if (typeof window === "undefined") return;
  const payload: PersistShape = {
    activeProviderId: state.activeProviderId,
    activeModelId: state.activeModelId,
    customModelName: state.customModelName,
  };
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // ignore
  }
}

export const useConsciousnessStore = create<ConsciousnessState>((set, get) => {
  const persisted = typeof window !== "undefined" ? loadPersisted() : null;

  return {
    activeProviderId: persisted?.activeProviderId || "",
    activeModelId: persisted?.activeModelId || "",
    customModelName: persisted?.customModelName || "",
    modelSearchQuery: "",
    setActiveProvider: (id) => {
      set((state) => {
        const next = {
          ...state,
          activeProviderId: id,
          // 当切换 provider 时，重置模型与搜索状态
          activeModelId: "",
          customModelName: "",
          modelSearchQuery: "",
        };
        savePersisted({ ...get(), ...next });
        return next;
      });
    },
    setActiveModel: (id) => {
      set((state) => {
        const next = { ...state, activeModelId: id };
        savePersisted({ ...get(), ...next });
        return next;
      });
    },
    setCustomModelName: (name) => {
      set((state) => {
        const next = { ...state, customModelName: name };
        savePersisted({ ...get(), ...next });
        return next;
      });
    },
    setModelSearchQuery: (q) => set({ modelSearchQuery: q }),
  };
});

// 可选：在页面挂载时，如果已经有 activeProviderId 且对应 provider 没有模型缓存，则尝试加载一次
export function useConsciousnessHydrate() {
  const { activeProviderId } = useConsciousnessStore();
  const fetchModels = useProvidersStore((s) => s.fetchModels);

  useEffect(() => {
    if (!activeProviderId) return;
    fetchModels(activeProviderId).catch(() => {
      // ignore
    });
  }, [activeProviderId, fetchModels]);
}
