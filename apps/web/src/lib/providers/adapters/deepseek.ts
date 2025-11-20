import type {
  ChatProviderAdapter,
  ProviderAdapterConfig,
  ProviderValidationResult,
  ProviderModelInfo,
  ChatStreamChunk,
} from "../adapter";
import { api } from "../../api";

// Static DeepSeek model list (can be refined via remote fetch later)
const DEEPSEEK_MODELS: ProviderModelInfo[] = [
  { id: "deepseek-chat", name: "deepseek-chat" },
  { id: "deepseek-reasoner", name: "deepseek-reasoner" },
];

function readEnv(key: string): string | undefined {
  try {
    const envObj: NodeJS.Process["env"] | undefined = (
      process as NodeJS.Process
    ).env;
    return envObj ? envObj[key] : undefined;
  } catch {
    return undefined;
  }
}

function normalizeBaseUrl(raw?: string): string | undefined {
  if (!raw) return undefined;
  return raw.replace(/\/$/, "");
}

export const deepseekAdapter: ChatProviderAdapter = {
  id: "deepseek",
  async validateConfig(
    config: ProviderAdapterConfig
  ): Promise<ProviderValidationResult> {
    const apiKey = config.apiKey || readEnv("DEEPSEEK_API_KEY");
    const baseUrl = normalizeBaseUrl(
      config.baseUrl ||
        readEnv("DEEPSEEK_BASE_URL") ||
        "https://api.deepseek.com"
    );
    const errors: string[] = [];
    if (!apiKey) errors.push("缺少 API Key");
    if (!baseUrl) errors.push("缺少 Base URL");
    if (baseUrl && !/^https?:\/\//.test(baseUrl))
      errors.push("Base URL 必须是 http/https 绝对地址");
    return { valid: errors.length === 0, errors };
  },
  async listModels(
    _config: ProviderAdapterConfig
  ): Promise<ProviderModelInfo[]> {
    void _config; // reserved for future dynamic fetch
    // Future: call remote listing; now static
    return DEEPSEEK_MODELS;
  },
  async *chatStream(
    messages: Array<{ role: string; content: unknown }>,
    config: ProviderAdapterConfig & { model?: string },
    options?: { signal?: AbortSignal }
  ): AsyncIterable<ChatStreamChunk> {
    const apiKey = config.apiKey || readEnv("DEEPSEEK_API_KEY");
    const baseUrl = normalizeBaseUrl(
      config.baseUrl ||
        readEnv("DEEPSEEK_BASE_URL") ||
        "https://api.deepseek.com"
    );
    const model = config.model || "deepseek-chat";
    if (!apiKey || !baseUrl) {
      yield { type: "error", error: "配置不完整 (API Key/Base URL)" };
      return;
    }
    const url = `${baseUrl}/chat/completions`;
    try {
      const response = await api.post(
        url,
        { model, messages, stream: true },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          responseType: "stream",
          timeout: 60_000,
          signal: options?.signal,
        }
      );
      const readable: import("node:stream").Readable =
        response as unknown as import("node:stream").Readable;
      let buffer = "";
      // Promisify 'data' events into queued text chunks processed incrementally
      const queue: string[] = [];
      let done = false;
      readable.on("data", (chunk: Buffer) => {
        buffer += chunk.toString("utf8");
        let idx: number;
        while ((idx = buffer.indexOf("\n")) !== -1) {
          const line = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 1);
          queue.push(line.replace(/\r$/, ""));
        }
      });
      readable.on("end", () => {
        if (buffer.length) queue.push(buffer);
        done = true;
      });
      readable.on("error", (err: Error) => {
        queue.push(`ERR_STREAM:${err.message}`);
        done = true;
      });
      while (!done || queue.length) {
        if (queue.length === 0) {
          await new Promise((r) => setTimeout(r, 30));
          continue;
        }
        const raw = queue.shift()!;
        if (!raw.trim()) continue;
        if (raw.startsWith("data:")) {
          const dataStr = raw.slice(5).trim();
          if (dataStr === "[DONE]") {
            yield { type: "finish" };
            continue;
          }
          try {
            const json = JSON.parse(dataStr);
            const choice = json?.choices?.[0];
            const deltaText = choice?.delta?.content;
            if (typeof deltaText === "string" && deltaText.length > 0) {
              yield { type: "text-delta", text: deltaText };
            }
          } catch (e) {
            yield { type: "error", error: (e as Error).message || "解析失败" };
          }
        } else if (raw.startsWith("ERR_STREAM:")) {
          yield { type: "error", error: raw.slice("ERR_STREAM:".length) };
        }
      }
      // ensure finish emitted
      yield { type: "finish" };
    } catch (e) {
      yield { type: "error", error: (e as Error).message };
    }
  },
};
