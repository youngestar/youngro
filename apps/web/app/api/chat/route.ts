import { NextResponse } from "next/server";
import { deepseekAdapter } from "../../../src/lib/providers/adapters/deepseek";
import type {
  ChatProviderAdapter,
  ChatStreamChunk,
  ProviderAdapterConfig,
} from "../../../src/lib/providers/adapter";
import { getChatAdapter } from "../../../src/lib/providers/registry";

export const runtime = "nodejs";

type Role = "system" | "user" | "assistant" | "tool";

interface ChatMessage {
  role: Role;
  content:
    | string
    | Array<{
        type: "text" | "image_url";
        text?: string;
        image_url?: { url: string };
      }>;
}

interface PostBody {
  messages: ChatMessage[];
  model?: string;
  stream?: boolean;
  providerId?: string;
  providerConfig?: Record<string, unknown>;
}

// 显式解析 provider，避免无效 providerId 被静默回退到其他上游，
// 否则会出现“配置的是 A，实际请求发到 B”的混乱行为。
function resolveProviderAdapter(providerId?: string): ChatProviderAdapter | null {
  if (!providerId) return deepseekAdapter;
  return getChatAdapter(providerId) ?? null;
}

function normalizeProviderConfig(raw: PostBody["providerConfig"]): ProviderAdapterConfig {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return {};
  }
  return raw as ProviderAdapterConfig;
}

// 聊天请求应尽量保持轻量，这里只校验本地配置结构；
// 远程连通性与凭证探测放到专门的 Provider 校验流程中处理。
function validateProviderConfigShape(config: ProviderAdapterConfig): string[] {
  const errors: string[] = [];

  if ("apiKey" in config) {
    if (typeof config.apiKey !== "string" || !config.apiKey.trim()) {
      errors.push("providerConfig.apiKey 必须是非空字符串");
    }
  }

  if ("baseUrl" in config) {
    if (typeof config.baseUrl !== "string" || !config.baseUrl.trim()) {
      errors.push("providerConfig.baseUrl 必须是非空字符串");
    } else {
      try {
        const url = new URL(config.baseUrl);
        if (!/^https?:$/.test(url.protocol)) {
          errors.push("providerConfig.baseUrl 必须使用 http/https");
        }
      } catch {
        errors.push("providerConfig.baseUrl 非法");
      }
    }
  }

  if ("model" in config) {
    if (typeof config.model !== "string" || !config.model.trim()) {
      errors.push("providerConfig.model 必须是非空字符串");
    }
  }

  return errors;
}

function toStreamEvent(chunk: ChatStreamChunk) {
  if (chunk.type === "error") {
    return {
      type: "error" as const,
      error: { message: chunk.error || "error" },
    };
  }
  if (chunk.type === "text-delta") {
    return {
      type: "text-delta" as const,
      text: chunk.text || "",
    };
  }
  return { type: "finish" as const };
}

async function collectCompletionText(
  streamIterable: AsyncIterable<ChatStreamChunk>
): Promise<string> {
  let content = "";

  for await (const chunk of streamIterable) {
    if (chunk.type === "text-delta" && chunk.text) {
      content += chunk.text;
      continue;
    }
    if (chunk.type === "error") {
      throw new Error(chunk.error || "Provider stream failed");
    }
    if (chunk.type === "finish") {
      break;
    }
  }

  return content;
}

function toJsonErrorResponse(err: unknown) {
  if (err instanceof SyntaxError) {
    return NextResponse.json({ message: "Invalid JSON body" }, { status: 400 });
  }

  if (err instanceof Error) {
    const maybeStatus = "status" in err && typeof err.status === "number" ? err.status : 500;
    const maybeData = "data" in err ? err.data : undefined;
    return NextResponse.json(
      { status: maybeStatus, message: err.message || "Request failed", data: maybeData },
      { status: maybeStatus }
    );
  }

  return NextResponse.json({ message: "Request failed" }, { status: 500 });
}

export async function POST(req: Request) {
  try {
    const {
      messages,
      model,
      stream: wantStream,
      providerId,
      providerConfig,
    }: PostBody = await req.json();

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: "messages is required and must be a non-empty array" },
        { status: 400 }
      );
    }

    const adapter = resolveProviderAdapter(providerId);
    if (!adapter) {
      return NextResponse.json(
        { message: `Unsupported providerId: ${providerId}` },
        { status: 400 }
      );
    }

    const normalizedProviderConfig = normalizeProviderConfig(providerConfig);
    const configErrors = validateProviderConfigShape(normalizedProviderConfig);
    if (configErrors.length > 0) {
      return NextResponse.json({ message: configErrors.join(", ") }, { status: 400 });
    }

    const upstreamAbortController = new AbortController();
    const abortUpstream = () => {
      if (!upstreamAbortController.signal.aborted) {
        upstreamAbortController.abort();
      }
    };
    // 将前端断开/取消继续传递给上游 Provider，
    // 避免浏览器已停止接收后仍继续消耗 token。
    req.signal.addEventListener("abort", abortUpstream, { once: true });

    const createStreamIterable = () =>
      adapter.chatStream(
        messages.map((m) => ({ role: m.role, content: m.content })),
        { ...normalizedProviderConfig, model: model || normalizedProviderConfig.model },
        { signal: upstreamAbortController.signal }
      );

    if (!wantStream) {
      try {
        const content = await collectCompletionText(createStreamIterable());
        return NextResponse.json({
          id: `chatcmpl-${Date.now()}`,
          object: "chat.completion",
          created: Math.floor(Date.now() / 1000),
          model: model || normalizedProviderConfig.model || null,
          choices: [
            {
              index: 0,
              message: { role: "assistant", content },
              finish_reason: "stop",
            },
          ],
        });
      } finally {
        req.signal.removeEventListener("abort", abortUpstream);
      }
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        const streamIterable = createStreamIterable();
        let closed = false;
        const enqueueJson = (obj: unknown) => {
          if (closed || upstreamAbortController.signal.aborted) return;
          controller.enqueue(encoder.encode(JSON.stringify(obj) + "\n"));
        };
        const closeController = () => {
          if (closed) return;
          closed = true;
          try {
            controller.close();
          } catch {
            // ignore controller state errors during teardown
          }
        };
        (async () => {
          try {
            for await (const chunk of streamIterable) {
              // 统一转换为当前前端 chat store 与工具函数消费的 NDJSON 事件格式。
              enqueueJson(toStreamEvent(chunk));
              if (chunk.type === "finish") break;
            }
          } catch (e) {
            if (!upstreamAbortController.signal.aborted) {
              const message = e instanceof Error ? e.message : String(e);
              enqueueJson({ type: "error", error: { message } });
            }
          } finally {
            req.signal.removeEventListener("abort", abortUpstream);
            closeController();
          }
        })();
      },
      cancel() {
        abortUpstream();
        req.signal.removeEventListener("abort", abortUpstream);
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "application/x-ndjson; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
      },
    });
  } catch (err: unknown) {
    return toJsonErrorResponse(err);
  }
}
