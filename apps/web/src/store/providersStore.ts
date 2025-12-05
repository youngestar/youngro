"use client";

// Lightweight provider state store inspired by AIRI's Pinia providers.ts
// Focus: configuration, configured status, basic model list placeholder, persistence.

import { create } from "zustand";
import { useEffect } from "react"; // useEffect for hydration
import type {
  ProviderMeta,
  ProviderCategory,
} from "../data/settings/providers";
import { allProviders } from "../data/settings/providers";
import { getChatAdapter } from "../lib/providers/registry";
import type { ProviderAdapterConfig } from "../lib/providers/adapter";

// ---- Types ----
export interface ChatProviderConfig {
  apiKey?: string;
  baseUrl?: string;
  defaultModel?: string;
}

export interface SpeechProviderConfig {
  // Generic fields (some providers use apiKey, some use secretId/secretKey)
  apiKey?: string;
  baseUrl?: string;
  voiceId?: string;
  // Tencent Cloud specific
  secretId?: string;
  secretKey?: string;
  region?: string;
  appId?: string | number;
  voiceType?: number | string;
  websiteType?: string | number;
}

export interface TranscriptionProviderConfig {
  apiKey?: string;
  baseUrl?: string;
  modelId?: string;
}

export type ProviderConfig =
  | ChatProviderConfig
  | SpeechProviderConfig
  | TranscriptionProviderConfig;

export interface ModelInfo {
  id: string;
  name: string;
  provider: string;
  description?: string;
  contextLength?: number;
  deprecated?: boolean;
  metadata?: Record<string, unknown>;
  tags?: string[];
  languages?: string[];
}

interface ResourceBucket {
  items: ModelInfo[];
  status: "idle" | "loading" | "success" | "error";
  error?: string | null;
  fetchedAt?: number;
  ttlMs: number; // default 10min
}

export interface ProviderState {
  meta: ProviderMeta;
  config: ProviderConfig; // dynamic user configuration
  configured: boolean; // derived flag
  validating: boolean;
  validateErrors: string[]; // all validation errors
  resources: ResourceBucket; // placeholder for models/voices
}

// ---- Helper: compute configured ----
function requiredFieldsFor(meta: { id: string; category: ProviderCategory }) {
  // Default per-category requirements
  const defaults: Record<ProviderCategory, string[]> = {
    chat: ["apiKey", "baseUrl"],
    speech: ["apiKey"],
    transcription: ["apiKey", "modelId"],
  };

  // Provider-specific overrides
  if (meta.id === "tencent-cloud-speech") {
    // Tencent 只需要密钥即可完成最小校验；Region/WebsiteType 有默认值
    return ["secretId", "secretKey"];
  }

  return defaults[meta.category];
}

function getField(config: ProviderConfig, key: string): unknown {
  switch (key) {
    case "apiKey":
      return "apiKey" in config ? config.apiKey : undefined;
    case "baseUrl":
      return "baseUrl" in config
        ? (config as ChatProviderConfig).baseUrl
        : undefined;
    case "voiceId":
      return "voiceId" in config
        ? (config as SpeechProviderConfig).voiceId
        : undefined;
    case "modelId":
      return "modelId" in config
        ? (config as TranscriptionProviderConfig).modelId
        : undefined;
    case "defaultModel":
      return "defaultModel" in config
        ? (config as ChatProviderConfig).defaultModel
        : undefined;
    case "secretId":
      return "secretId" in config
        ? (config as SpeechProviderConfig).secretId
        : undefined;
    case "secretKey":
      return "secretKey" in config
        ? (config as SpeechProviderConfig).secretKey
        : undefined;
    case "region":
      return "region" in config
        ? (config as SpeechProviderConfig).region
        : undefined;
    case "websiteType":
      return "websiteType" in config
        ? (config as SpeechProviderConfig).websiteType
        : undefined;
    default:
      return undefined;
  }
}

function hasRequiredFields(
  meta: ProviderMeta,
  config: ProviderConfig
): boolean {
  const req = requiredFieldsFor(meta as any);
  return req.every((f) => !!getField(config, f));
}

function shallowEqualConfig(a: ProviderConfig, b: ProviderConfig): boolean {
  const keys = new Set([...Object.keys(a || {}), ...Object.keys(b || {})]);
  for (const key of keys) {
    if (
      (a as Record<string, unknown>)[key] !==
      (b as Record<string, unknown>)[key]
    ) {
      return false;
    }
  }
  return true;
}

function validateConfig(meta: ProviderMeta, config: ProviderConfig): string[] {
  const errs: string[] = [];
  const req = requiredFieldsFor(meta as any);
  for (const f of req) {
    if (!getField(config, f)) errs.push(`缺少必填字段: ${f}`);
  }
  const baseUrl = getField(config, "baseUrl") as string | undefined;
  if (baseUrl) {
    try {
      const u = new URL(baseUrl);
      if (!baseUrl.endsWith("/")) errs.push("Base URL 必须以 / 结尾");
      if (!u.protocol.startsWith("http"))
        errs.push("Base URL 协议需为 http/https");
    } catch {
      errs.push("Base URL 非法或不是绝对 URL");
    }
  } else if (requiredFieldsFor(meta as any).includes("baseUrl")) {
    errs.push("缺少必填字段: baseUrl");
  }
  return errs;
}

// ---- Initial registry from metadata ----
function createInitialState(): Record<string, ProviderState> {
  const now = Date.now();
  return Object.fromEntries(
    allProviders.map((m) => [
      m.id,
      {
        meta: m,
        config: {},
        configured: false,
        validating: false,
        validateErrors: [],
        resources: {
          items: [],
          status: "idle",
          error: null,
          fetchedAt: now,
          ttlMs: 10 * 60 * 1000,
        },
      } as ProviderState,
    ])
  );
}

// ---- Persistence key ----
const STORAGE_KEY = "youngro.providers.v1";
const STORAGE_VERSION = 2;

interface PersistShape {
  version: number;
  registry: Record<string, { config: ProviderConfig; configured: boolean }>; // minimal subset
}

function loadPersisted(): PersistShape | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    type LoosePersist = {
      registry?: Record<
        string,
        { config: ProviderConfig; configured: boolean }
      >;
      version?: number;
    };
    const parsed = JSON.parse(raw) as LoosePersist;
    if (typeof parsed.version !== "number") {
      return { version: STORAGE_VERSION, registry: parsed.registry || {} };
    }
    return { version: parsed.version, registry: parsed.registry || {} };
  } catch {
    return null;
  }
}

function savePersisted(registry: Record<string, ProviderState>) {
  if (typeof window === "undefined") return;
  const payload: PersistShape = {
    version: STORAGE_VERSION,
    registry: Object.fromEntries(
      Object.entries(registry).map(([id, s]) => [
        id,
        { config: s.config, configured: s.configured },
      ])
    ),
  };
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // ignore
  }
}

// ---- Store interface ----
export interface ProvidersStore {
  registry: Record<string, ProviderState>;
  hydrate: () => void;
  setConfig: (id: string, patch: Partial<ProviderConfig>) => void;
  validate: (id: string) => Promise<boolean>; // enhanced validation
  fetchModels: (id: string, force?: boolean) => Promise<void>; // stub
  getProvider: (id: string) => ProviderState | undefined;
  getProvidersByCategory: (cat: ProviderCategory) => ProviderState[];
}

export const useProvidersStore = create<ProvidersStore>()((set, get) => ({
  registry: createInitialState(),
  hydrate: () => {
    const persisted = loadPersisted();
    if (!persisted) return;
    const persistedVersion = persisted.version ?? 1;
    set((state) => {
      const next = { ...state.registry };
      for (const [id, p] of Object.entries(persisted.registry)) {
        if (next[id]) {
          const persistedConfig = p.config || {};
          const validateErrors = validateConfig(next[id].meta, persistedConfig);
          const meetsRequired = hasRequiredFields(
            next[id].meta,
            persistedConfig
          );
          const wasValidated =
            persistedVersion >= 2 ? Boolean(p.configured) : false;
          const configured =
            wasValidated && meetsRequired && validateErrors.length === 0;
          next[id] = {
            ...next[id],
            config: persistedConfig,
            configured,
            validateErrors,
          };
        }
      }
      return { registry: next };
    });
  },
  setConfig: (id, patch) => {
    set((state) => {
      const cur = state.registry[id];
      if (!cur) return {};
      const config = { ...cur.config, ...patch };
      const configChanged = !shallowEqualConfig(cur.config, config);
      const validateErrors = validateConfig(cur.meta, config);
      const configured = configChanged
        ? false
        : cur.configured && validateErrors.length === 0;
      const next = {
        ...state.registry,
        [id]: { ...cur, config, configured, validateErrors },
      };
      savePersisted(next);
      return { registry: next };
    });
  },
  validate: async (id) => {
    const state = get().registry[id];
    if (!state) return false;

    set((s) => ({
      registry: {
        ...s.registry,
        [id]: { ...state, validating: true },
      },
    }));

    let validateErrors: string[] = [];

    // 1. Local structural validation
    const localErrors = validateConfig(state.meta, state.config);
    if (localErrors.length > 0) {
      validateErrors = localErrors;
    } else {
      // 2. Remote validation via adapter or provider-specific endpoint
      if (state.meta.category === "chat") {
        try {
          const adapter = getChatAdapter(id);
          if (adapter && adapter.validateConfig) {
            const cfg: ProviderAdapterConfig = {
              apiKey: (state.config as ChatProviderConfig).apiKey,
              baseUrl: (state.config as ChatProviderConfig).baseUrl,
              model: (state.config as ChatProviderConfig).defaultModel,
            };
            const result = await adapter.validateConfig(cfg);
            if (!result.valid) {
              validateErrors = result.errors || ["Remote validation failed"];
            }
          }
        } catch (err) {
          validateErrors = [(err as Error).message || "Validation error"];
        }
      } else if (state.meta.category === "speech") {
        try {
          const response = await fetch(`/api/speech/providers/${id}/validate`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(state.config),
          });
          if (!response.ok) {
            const errorPayload = (await response.json().catch(() => ({}))) as {
              error?: string;
              detail?: string;
            };
            const remoteMessage =
              errorPayload.error || `远程验证失败 (HTTP ${response.status})`;
            validateErrors = errorPayload.detail
              ? [remoteMessage, errorPayload.detail]
              : [remoteMessage];
          }
        } catch (err) {
          validateErrors = [(err as Error).message || "远程验证出现异常"];
        }
      }
    }

    const configured = validateErrors.length === 0;

    set((s) => {
      const current = s.registry[id]!;
      return {
        registry: {
          ...s.registry,
          [id]: {
            ...current,
            validating: false,
            configured,
            validateErrors,
          },
        },
      };
    });

    // persist
    savePersisted(get().registry);
    return configured;
  },
  fetchModels: async (id, force) => {
    const st = get().registry[id];
    if (!st) return;
    const now = Date.now();
    const age = now - (st.resources.fetchedAt || 0);
    if (!force && st.resources.status === "success" && age < st.resources.ttlMs)
      return; // fresh
    // mark loading
    set((s) => ({
      registry: {
        ...s.registry,
        [id]: {
          ...st,
          resources: { ...st.resources, status: "loading", error: null },
        },
      },
    }));
    try {
      let items: ModelInfo[] = [];
      if (st.meta.category === "chat") {
        const adapter = getChatAdapter(id);
        if (adapter) {
          const cfg: ProviderAdapterConfig = {
            apiKey: (st.config as ChatProviderConfig).apiKey,
            baseUrl: (st.config as ChatProviderConfig).baseUrl,
          };
          const models = await adapter.listModels(cfg);
          items = models.map((m) => ({
            id: m.id,
            name: m.name,
            provider: id,
            description: m.description,
          }));
        }
      } else if (st.meta.category === "speech") {
        const response = await fetch(`/api/speech/providers/${id}/models`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(st.config ?? {}),
          cache: "no-store",
        });
        const raw = (await response.json().catch(() => null)) as {
          models?: Array<Partial<ModelInfo>>;
          error?: string;
          detail?: string;
        } | null;
        if (!response.ok) {
          const message = raw?.error || raw?.detail || response.statusText;
          throw new Error(message || "无法获取语音模型列表");
        }
        const payload = raw?.models ?? [];
        items = payload
          .map((model) => {
            if (!model?.id) return null;
            return {
              id: model.id,
              name: model.name || model.id,
              provider: id,
              description: model.description,
              contextLength: model.contextLength,
              deprecated: model.deprecated,
              metadata: model.metadata,
              tags: model.tags,
              languages: model.languages,
            } satisfies ModelInfo;
          })
          .filter(Boolean) as ModelInfo[];
      }
      // Fallback if adapter unavailable or provider未返回
      if (items.length === 0) {
        items = [
          {
            id: `${id}-default`,
            name: "默认模型",
            provider: id,
            description: "当前 Provider 未返回模型列表",
          },
        ];
      }
      set((s) => {
        const cur = s.registry[id]!;
        return {
          registry: {
            ...s.registry,
            [id]: {
              ...cur,
              resources: {
                items,
                status: "success",
                error: null,
                fetchedAt: Date.now(),
                ttlMs: cur.resources.ttlMs,
              },
            },
          },
        };
      });
    } catch (e) {
      set((s) => {
        const cur = s.registry[id]!;
        return {
          registry: {
            ...s.registry,
            [id]: {
              ...cur,
              resources: {
                ...cur.resources,
                status: "error",
                error: (e as Error).message,
              },
            },
          },
        };
      });
    }
  },
  getProvider: (id) => get().registry[id],
  getProvidersByCategory: (cat) =>
    Object.values(get().registry).filter((p) => p.meta.category === cat),
}));

// Optional hook for hydration on mount (client only)
export function useProvidersHydrate() {
  const hydrate = useProvidersStore((s) => s.hydrate);
  useEffect(() => {
    hydrate();
  }, [hydrate]);
}
