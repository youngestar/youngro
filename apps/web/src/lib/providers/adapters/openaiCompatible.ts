import type {
  ChatProviderAdapter,
  ProviderAdapterConfig,
  ProviderValidationResult,
  ProviderModelInfo,
  ChatStreamChunk,
} from "../adapter";

export interface OpenAICompatibleOptions {
  id: string;
  displayName: string;
  description?: string;
  defaultBaseUrl: string;
  defaultModel?: string;
  modelList?: ProviderModelInfo[];
  needsBaseUrl?: boolean;
  envApiKey?: string;
  validationChecks?: Array<"model_list" | "chat_completions" | "health">;
}

type ChatMessageInput = Array<{ role: string; content: unknown }>;

function trimEndSlash(url: string): string {
  return url.endsWith("/") ? url.slice(0, -1) : url;
}

function readEnv(key?: string): string | undefined {
  if (!key) return undefined;
  try {
    const env = (process as NodeJS.Process).env;
    return env ? env[key] : undefined;
  } catch {
    return undefined;
  }
}

interface ResolvedConnection {
  apiKey?: string;
  baseUrl?: string;
}

function resolveConnection(
  config: ProviderAdapterConfig,
  options: OpenAICompatibleOptions
): ResolvedConnection {
  const apiKey = config.apiKey || readEnv(options.envApiKey);
  const envBase = readEnv(
    `${options.envApiKey ?? options.id.toUpperCase()}_BASE_URL`
  );
  const baseUrl = config.baseUrl?.trim() || envBase || options.defaultBaseUrl;
  return { apiKey, baseUrl };
}

async function fetchJson<T>(url: string, init: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  }
  return (await res.json()) as T;
}

async function fetchModelListFromApi(
  apiKey: string,
  baseUrl: string,
  headers?: Record<string, string>
): Promise<ProviderModelInfo[]> {
  const url = `${trimEndSlash(baseUrl)}/models`;
  const body = await fetchJson<{
    data?: Array<{ id: string; object?: string }>;
  }>(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      ...headers,
    },
  });
  const data = Array.isArray(body.data) ? body.data : [];
  return data.map((model) => ({
    id: model.id,
    name: model.id,
  }));
}

async function runChatCompletionProbe(params: {
  apiKey: string;
  baseUrl: string;
  model: string;
}) {
  const endpoint = `${trimEndSlash(params.baseUrl)}/chat/completions`;
  await fetchJson(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${params.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: params.model,
      stream: false,
      max_tokens: 4,
      messages: [
        { role: "system", content: "ping" },
        { role: "user", content: "ping" },
      ],
    }),
  });
}

export function createOpenAICompatibleAdapter(
  options: OpenAICompatibleOptions
): ChatProviderAdapter {
  const {
    id,
    defaultModel = "",
    modelList = [],
    validationChecks = ["model_list", "chat_completions"],
  } = options;

  async function validateConfig(
    config: ProviderAdapterConfig
  ): Promise<ProviderValidationResult> {
    const { apiKey, baseUrl } = resolveConnection(config, options);

    const errors: string[] = [];
    if (!apiKey) errors.push("缺少 API Key");

    if (!baseUrl) {
      errors.push("缺少 Base URL");
    } else {
      try {
        const u = new URL(baseUrl);
        if (!/https?:/.test(u.protocol)) {
          errors.push("Base URL 必须是 http/https");
        }
      } catch {
        errors.push("Base URL 非法");
      }
    }

    if (errors.length === 0 && apiKey && baseUrl) {
      let cachedModelList: ProviderModelInfo[] | null = null;
      const ensureModelList = async () => {
        if (cachedModelList) return cachedModelList;
        cachedModelList = await fetchModelListFromApi(apiKey, baseUrl);
        return cachedModelList;
      };

      for (const check of validationChecks) {
        try {
          if (check === "model_list") {
            await ensureModelList();
          } else if (check === "chat_completions" || check === "health") {
            let probeModel: string | undefined = config.model || defaultModel;
            if (!probeModel) {
              const models = await ensureModelList();
              probeModel = models[0]?.id;
            }
            const finalModel = probeModel ?? "gpt-3.5-turbo";
            await runChatCompletionProbe({
              apiKey,
              baseUrl,
              model: finalModel,
            });
          }
        } catch (err) {
          errors.push(
            `${check} 校验失败: ${(err as Error).message || "未知错误"}`
          );
        }
      }
    }

    return { valid: errors.length === 0, errors };
  }

  async function listModels(
    config: ProviderAdapterConfig
  ): Promise<ProviderModelInfo[]> {
    const staticModels = modelList.length ? modelList : undefined;

    const { apiKey, baseUrl } = resolveConnection(config, options);
    if (apiKey && baseUrl) {
      try {
        const models = await fetchModelListFromApi(apiKey, baseUrl);
        if (models.length) {
          return models;
        }
      } catch {
        // ignore, fallback to default list below
      }
    }

    if (staticModels?.length) return staticModels;

    return [
      {
        id: defaultModel || config.model || "default",
        name: defaultModel || config.model || "默认模型",
      },
    ];
  }

  async function* chatStream(
    messages: ChatMessageInput,
    config: ProviderAdapterConfig & { model?: string },
    streamOptions?: { signal?: AbortSignal }
  ): AsyncIterable<ChatStreamChunk> {
    const { apiKey, baseUrl } = resolveConnection(config, options);
    const normalizedBase = baseUrl ? trimEndSlash(baseUrl) : "";
    const modelId = config.model || defaultModel;

    if (!apiKey || !normalizedBase || !modelId) {
      yield { type: "error", error: "配置不完整" };
      return;
    }

    const endpoint = `${normalizedBase}/chat/completions`;
    const body = {
      model: modelId,
      messages,
      stream: true,
    };

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
        signal: streamOptions?.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        yield {
          type: "error",
          error: `API Error (${response.status}): ${errorText}`,
        };
        return;
      }

      if (!response.body) {
        yield { type: "error", error: "Empty response" };
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          if (!trimmed.startsWith("data:")) continue;
          const dataStr = trimmed.slice(5).trim();
          if (dataStr === "[DONE]") {
            yield { type: "finish" };
            continue;
          }
          try {
            const json = JSON.parse(dataStr);
            const delta = json?.choices?.[0]?.delta?.content;
            if (typeof delta === "string") {
              yield { type: "text-delta", text: delta };
            }
          } catch {
            // ignore
          }
        }
      }

      if (buffer.trim().startsWith("data:")) {
        const leftover = buffer.trim().slice(5).trim();
        if (leftover && leftover !== "[DONE]") {
          try {
            const json = JSON.parse(leftover);
            const delta = json?.choices?.[0]?.delta?.content;
            if (typeof delta === "string") {
              yield { type: "text-delta", text: delta };
            }
          } catch {
            // ignore leftover parse errors
          }
        }
      }

      yield { type: "finish" };
    } catch (e) {
      yield { type: "error", error: (e as Error).message };
    }
  }

  return {
    id,
    validateConfig,
    listModels,
    chatStream,
  } satisfies ChatProviderAdapter;
}
