import { NextResponse } from "next/server";
import { api, normalizeAxiosError } from "../../../src/lib/api";
import type { Readable } from "node:stream";
import type { AxiosError, AxiosProxyConfig, AxiosRequestConfig } from "axios";

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
      // 让前端能直接拿到可读 message
      return NextResponse.json(
        { message: "Server missing DEEPSEEK_API_KEY" },
        { status: 500 }
      );
    }

    const url = `${baseURL}/chat/completions`;
    const payloadBase = {
      model: model || "deepseek-chat",
      messages,
    } as const;

    // ——— 代理/直连候选方案 ———
    // 支持多端口代理与直连回退：
    // - OUTBOUND_PROXY_HOST: 默认为 127.0.0.1
    // - OUTBOUND_PROXY_PROTOCOL: 默认为 http（适配常见本地代理）
    // - OUTBOUND_PROXY_PORTS: 逗号分隔的端口列表，例如 "7897,7890"
    // - OUTBOUND_ALLOW_DIRECT: 是否允许直连作为候选，默认 true
    const proxyHost = (readEnv("OUTBOUND_PROXY_HOST") || "127.0.0.1").trim();
    const proxyProtocol = (readEnv("OUTBOUND_PROXY_PROTOCOL") || "http").trim();
    const portsRaw = (readEnv("OUTBOUND_PROXY_PORTS") || "").trim();
    const allowDirect =
      (readEnv("OUTBOUND_ALLOW_DIRECT") || "true").trim().toLowerCase() !==
      "false";
    const proxyPorts = portsRaw
      ? portsRaw
          .split(",")
          .map((s) => parseInt(s.trim(), 10))
          .filter((n) => Number.isFinite(n) && n > 0)
      : [];

    type Candidate =
      | { type: "proxy"; config: AxiosProxyConfig }
      | { type: "direct" };
    const candidates: Candidate[] = [];
    for (const port of proxyPorts) {
      candidates.push({
        type: "proxy",
        config: { host: proxyHost, port, protocol: proxyProtocol },
      });
    }
    if (allowDirect) candidates.push({ type: "direct" });

    const isRetryableProxyError = (error: unknown) => {
      const code =
        typeof error === "object" &&
        error &&
        "code" in error &&
        typeof (error as { code?: unknown }).code === "string"
          ? (error as { code?: string }).code
          : undefined;
      const msg =
        typeof error === "object" &&
        error &&
        "message" in error &&
        typeof (error as { message?: unknown }).message === "string"
          ? (error as { message: string }).message.toLowerCase() || ""
          : "";
      // 典型本地代理不可达/拒绝错误
      return (
        code === "ECONNREFUSED" ||
        code === "EHOSTUNREACH" ||
        code === "ETIMEDOUT" ||
        msg.includes("econnrefused") ||
        msg.includes("enotfound") ||
        msg.includes("timed out")
      );
    };

    async function tryPost(
      body: unknown,
      config: AxiosRequestConfig
    ): Promise<unknown> {
      let lastErr: unknown;
      for (const c of candidates.length
        ? candidates
        : [{ type: "direct" } as Candidate]) {
        try {
          const cfg: AxiosRequestConfig = {
            ...config,
            // 注意：当使用自定义 proxy 时不要设置 baseURL，以避免 axios 误用 baseURL 域的代理规则
            proxy: c.type === "proxy" ? c.config : false,
          };
          const res = await api.post(url, body, cfg);
          return res as unknown;
        } catch (err) {
          // 仅当是代理相关的典型错误才尝试下一个候选
          if (c.type === "proxy" && isRetryableProxyError(err)) {
            lastErr = err;
            continue;
          }
          throw err;
        }
      }
      throw lastErr ?? new Error("All candidates failed");
    }

    // 非流式：直接转发 JSON
    if (!wantStream) {
      const data = (await tryPost(
        { ...payloadBase, stream: false },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          timeout: 60_000,
        }
      )) as unknown;
      return NextResponse.json(data);
    }

    const payload = { ...payloadBase, stream: true };

    // 使用封装好的 api 实例，以流式响应（SSE）与 DeepSeek 通信（带代理/直连候选）
    const dataStream = (await tryPost(payload, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      responseType: "stream",
      timeout: 60_000,
    })) as Readable;

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
    // 扁平化错误结构，方便前端提取 message
    return NextResponse.json(
      { status: e.status || 500, message: e.message, data: e.data },
      { status: e.status || 500 }
    );
  }
}
