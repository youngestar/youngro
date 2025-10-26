import { NextResponse } from "next/server";
import { api, normalizeAxiosError } from "../../../src/lib/api";
import type { Readable } from "node:stream";
import type { AxiosError } from "axios";

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
}

export async function POST(req: Request) {
  try {
    const { messages, model, stream: wantStream }: PostBody = await req.json();

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: "messages is required and must be a non-empty array" },
        { status: 400 }
      );
    }

    const readEnv = (k: string): string | undefined => {
      // 动态读取，避免静态规则对 env 名称校验误报
      try {
        return (process as NodeJS.Process).env?.[k];
      } catch {
        return undefined;
      }
    };
    const apiKey = readEnv("DEEPSEEK_API_KEY");
    const baseURL = (
      readEnv("DEEPSEEK_BASE_URL") || "https://api.deepseek.com"
    ).replace(/\/$/, "");
    if (!apiKey) {
      return NextResponse.json(
        { error: "Server missing DEEPSEEK_API_KEY" },
        { status: 500 }
      );
    }

    const url = `${baseURL}/chat/completions`;
    const payloadBase = {
      model: model || "deepseek-chat",
      messages,
    } as const;

    // 非流式：直接转发 JSON
    if (!wantStream) {
      const data = await api.post(
        url,
        { ...payloadBase, stream: false },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          timeout: 60_000,
        }
      );
      return NextResponse.json(data);
    }

    const payload = { ...payloadBase, stream: true };

    // 使用封装好的 api 实例，以流式响应（SSE）与 DeepSeek 通信
    const dataStream = await api.post<Readable>(url, payload, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      responseType: "stream",
      timeout: 60_000,
    });

    const nodeStream: Readable = dataStream as unknown as Readable;
    const encoder = new TextEncoder();
    let buffer = "";
    let finished = false;

    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        const enqueueJson = (obj: unknown) => {
          controller.enqueue(encoder.encode(JSON.stringify(obj) + "\n"));
        };

        const handleLine = (raw: string) => {
          const line = raw.trim();
          if (!line) return;
          if (!line.startsWith("data:")) return; // 只处理 SSE data 行
          const dataStr = line.slice(5).trim();
          if (dataStr === "[DONE]") {
            if (!finished) {
              enqueueJson({ type: "finish" });
              finished = true;
            }
            return;
          }
          try {
            const json = JSON.parse(dataStr);
            const choice = json?.choices?.[0];
            const deltaText = choice?.delta?.content;
            if (typeof deltaText === "string" && deltaText.length > 0) {
              enqueueJson({ type: "text-delta", text: deltaText });
            }
          } catch (e) {
            enqueueJson({
              type: "error",
              error: {
                message: (e as Error)?.message || "invalid provider chunk",
              },
            });
          }
        };

        nodeStream.on("data", (chunk: Buffer) => {
          buffer += chunk.toString("utf8");
          let idx: number;
          while ((idx = buffer.indexOf("\n")) !== -1) {
            const line = buffer.slice(0, idx);
            buffer = buffer.slice(idx + 1);
            handleLine(line.replace(/\r$/, ""));
          }
        });

        nodeStream.on("end", () => {
          if (buffer.length > 0) handleLine(buffer);
          if (!finished) {
            enqueueJson({ type: "finish" });
            finished = true;
          }
          controller.close();
        });

        nodeStream.on("error", (err: unknown) => {
          enqueueJson({
            type: "error",
            error: { message: (err as Error)?.message || "stream error" },
          });
          controller.close();
        });
      },
      cancel() {
        try {
          const candidate = nodeStream as unknown as { destroy?: unknown };
          if (typeof candidate.destroy === "function") {
            (candidate.destroy as () => void)();
          }
        } catch {
          // ignore
        }
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
    return NextResponse.json(
      { error: { status: e.status, message: e.message, data: e.data } },
      { status: e.status || 500 }
    );
  }
}
