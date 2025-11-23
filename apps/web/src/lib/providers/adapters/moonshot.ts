import type {
  ChatProviderAdapter,
  ProviderAdapterConfig,
  ProviderValidationResult,
  ProviderModelInfo,
  ChatStreamChunk,
} from "../adapter";
import { api } from "../../api";

const MOONSHOT_MODELS: ProviderModelInfo[] = [
  { id: "moonshot-v1-8k", name: "moonshot-v1-8k (8k context)" },
  { id: "moonshot-v1-32k", name: "moonshot-v1-32k (32k context)" },
  { id: "moonshot-v1-128k", name: "moonshot-v1-128k (128k context)" },
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

export const moonshotAdapter: ChatProviderAdapter = {
  id: "moonshot",
  async validateConfig(
    config: ProviderAdapterConfig
  ): Promise<ProviderValidationResult> {
    const apiKey = config.apiKey || readEnv("MOONSHOT_API_KEY");
    const rawBaseUrl =
      config.baseUrl ||
      readEnv("MOONSHOT_BASE_URL") ||
      "https://api.moonshot.cn/v1";

    const errors: string[] = [];
    if (!apiKey) errors.push("缺少 API Key");

    const baseUrls = rawBaseUrl
      ? rawBaseUrl.split(",").map((u) => u.trim())
      : [];
    const invalidUrls = baseUrls.filter((u) => !/^https?:\/\//.test(u));

    if (invalidUrls.length > 0) {
      errors.push(
        `Base URL 必须是 http/https 绝对地址 (发现无效地址: ${invalidUrls.join(", ")})`
      );
    }

    return { valid: errors.length === 0, errors };
  },

  async listModels(
    _config: ProviderAdapterConfig
  ): Promise<ProviderModelInfo[]> {
    void _config;
    return MOONSHOT_MODELS;
  },

  async *chatStream(
    messages: Array<{ role: string; content: unknown }>,
    config: ProviderAdapterConfig & { model?: string },
    options?: { signal?: AbortSignal }
  ): AsyncIterable<ChatStreamChunk> {
    const apiKey = config.apiKey || readEnv("MOONSHOT_API_KEY");
    const rawBaseUrl =
      config.baseUrl ||
      readEnv("MOONSHOT_BASE_URL") ||
      "https://api.moonshot.cn/v1";
    const model = config.model || "moonshot-v1-8k";

    if (!apiKey) {
      yield { type: "error", error: "配置不完整 (API Key)" };
      return;
    }

    const baseUrls = rawBaseUrl
      .split(",")
      .map((u) => normalizeBaseUrl(u.trim()))
      .filter((u): u is string => !!u);

    // 自动追加官方节点作为兜底 (如果尚未包含)
    const officialUrl = "https://api.moonshot.cn/v1";
    if (!baseUrls.includes(officialUrl)) {
      baseUrls.push(officialUrl);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let response: any;
    let lastError: Error | unknown = null;

    // 1. 尝试连接所有配置的端点
    for (const baseUrl of baseUrls) {
      const url = `${baseUrl}/chat/completions`;
      try {
        console.debug(`[Moonshot] Trying endpoint: ${url}`);

        response = await api.post(
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
        console.debug(`[Moonshot] Connected to ${url}`);
        break; // 连接成功，跳出循环
      } catch (e) {
        console.warn(
          `[Moonshot] Connection failed to ${url}:`,
          (e as Error).message
        );
        lastError = e;

        // 特殊处理：如果是官方节点失败，且错误疑似代理问题，尝试直连（绕过系统代理）
        if (baseUrl === officialUrl) {
          try {
            console.debug(
              `[Moonshot] Retrying official endpoint without proxy...`
            );
            response = await api.post(
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
                proxy: false, // 强制禁用代理
              }
            );
            console.debug(`[Moonshot] Connected to ${url} (Direct)`);
            break;
          } catch (e2) {
            console.warn(
              `[Moonshot] Direct connection failed too:`,
              (e2 as Error).message
            );
            lastError = e2;
          }
        }
      }
    }

    if (!response) {
      yield {
        type: "error",
        error: `所有服务端点均连接失败。最后错误: ${(lastError as Error)?.message || "Unknown error"}`,
      };
      return;
    }

    // 2. 处理流式响应
    try {
      const readable: import("node:stream").Readable =
        response as unknown as import("node:stream").Readable;

      let buffer = "";
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
          await new Promise((r) => setTimeout(r, 10));
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
          } catch {
            // ignore parse error for partial chunks
          }
        } else if (raw.startsWith("ERR_STREAM:")) {
          yield { type: "error", error: raw.slice("ERR_STREAM:".length) };
        }
      }
      // ensure finish emitted if not already
      yield { type: "finish" };
    } catch (e) {
      yield { type: "error", error: (e as Error).message };
    }
  },
};
