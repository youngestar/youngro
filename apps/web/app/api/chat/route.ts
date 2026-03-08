import { NextResponse } from "next/server";
import { normalizeAxiosError } from "../../../src/lib/api";
import type { AxiosError } from "axios";
import { deepseekAdapter } from "../../../src/lib/providers/adapters/deepseek";
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

    // Select adapter (only deepseek for now)
    const effectiveProviderId = providerId || "deepseek";
    const adapter = getChatAdapter(effectiveProviderId) || deepseekAdapter;
    const validation = await adapter.validateConfig(
      (providerConfig as Record<string, unknown>) || {}
    );
    if (!validation.valid) {
      return NextResponse.json(
        { message: `Provider config invalid: ${validation.errors.join(", ")}` },
        { status: 500 }
      );
    }

    // Legacy non-stream mode using adapter (will call remote without streaming flag)
    if (!wantStream) {
      // For now listModels not used here; adapter only supports stream variant; fallback error
      return NextResponse.json(
        { message: "Non-stream mode not yet implemented for adapter" },
        { status: 501 }
      );
    }

    // Use adapter streaming API
    const streamIterable = adapter.chatStream(
      messages.map((m) => ({ role: m.role, content: m.content })),
      { model, ...(providerConfig as Record<string, unknown>) },
      { signal: undefined }
    );
    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        const enqueueJson = (obj: unknown) => {
          controller.enqueue(encoder.encode(JSON.stringify(obj) + "\n"));
        };
        (async () => {
          try {
            for await (const chunk of streamIterable) {
              enqueueJson(chunk);
              if (chunk.type === "finish") break;
            }
          } catch (e) {
            enqueueJson({ type: "error", error: (e as Error).message });
          } finally {
            controller.close();
          }
        })();
      },
      cancel() {
        // TODO: support AbortSignal plumb through adapter.chatStream options
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "application/x-ndjson; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
      },
    });
  } catch (err: unknown) {
    const e = normalizeAxiosError(err as AxiosError);
    // 扁平化错误结构，方便前端提取 message
    return NextResponse.json(
      { status: e.status || 500, message: e.message, data: e.data },
      { status: e.status || 500 }
    );
  }
}
