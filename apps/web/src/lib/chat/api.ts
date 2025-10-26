export type Role = "system" | "user" | "assistant" | "tool";

export interface ChatMessage {
  role: Role;
  content:
    | string
    | Array<{
        type: "text" | "image_url";
        text?: string;
        image_url?: { url: string };
      }>;
}

export interface ChatResponseJSON {
  id?: string;
  choices?: Array<{
    index?: number;
    message?: { role?: Role; content?: string };
    delta?: { content?: string };
    finish_reason?: string | null;
  }>;
  [k: string]: unknown;
}

export interface TextDeltaEvent {
  type: "text-delta";
  text: string;
}
export interface FinishEvent {
  type: "finish";
}
export interface ErrorEvent {
  type: "error";
  error: { message: string };
}
export type StreamEvent = TextDeltaEvent | FinishEvent | ErrorEvent;

// 非流式调用 /api/chat，返回完整 JSON
export async function chatNonStreaming(params: {
  messages: ChatMessage[];
  model?: string;
  signal?: AbortSignal;
}): Promise<ChatResponseJSON> {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ ...params, stream: false }),
    signal: params.signal,
  });
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      msg += `: ${await res.text()}`;
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }
  return (await res.json()) as ChatResponseJSON;
}

// 流式调用 /api/chat，逐行读取 NDJSON 事件
export async function chatStreaming(params: {
  messages: ChatMessage[];
  model?: string;
  onEvent: (ev: StreamEvent) => void;
  signal?: AbortSignal;
}): Promise<void> {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      messages: params.messages,
      model: params.model,
      stream: true,
    }),
    signal: params.signal,
  });
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      msg += `: ${await res.text()}`;
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }
  const reader = res.body?.getReader();
  if (!reader) {
    throw new Error("ReadableStream reader unavailable");
  }
  const decoder = new TextDecoder();
  let buffer = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let idx: number;
      while ((idx = buffer.indexOf("\n")) !== -1) {
        const line = buffer.slice(0, idx);
        buffer = buffer.slice(idx + 1);
        const s = line.trim();
        if (!s) continue;
        try {
          const obj = JSON.parse(s) as unknown;
          // 简单类型守卫：根据 type 字段精确收敛
          if (obj && typeof obj === "object") {
            const rec = obj as Record<string, unknown>;
            const t = rec.type as string | undefined;
            if (t === "text-delta") {
              const text = typeof rec.text === "string" ? rec.text : "";
              const ev: TextDeltaEvent = { type: "text-delta", text };
              params.onEvent(ev);
            } else if (t === "finish") {
              params.onEvent({ type: "finish" });
            } else if (t === "error") {
              const errObj =
                rec.error && typeof rec.error === "object"
                  ? (rec.error as Record<string, unknown>)
                  : undefined;
              const m =
                errObj?.message && typeof errObj.message === "string"
                  ? errObj.message
                  : undefined;
              params.onEvent({
                type: "error",
                error: { message: m || "error" },
              });
            }
          }
        } catch (e) {
          params.onEvent({
            type: "error",
            error: { message: (e as Error).message || "invalid ndjson" },
          });
        }
      }
    }
    // flush 最后一行
    const last = buffer.trim();
    if (last) {
      try {
        const obj = JSON.parse(last) as unknown;
        if (obj && typeof obj === "object") {
          const rec = obj as Record<string, unknown>;
          const t = rec.type as string | undefined;
          if (t === "text-delta") {
            const text = typeof rec.text === "string" ? rec.text : "";
            const ev: TextDeltaEvent = { type: "text-delta", text };
            params.onEvent(ev);
          } else if (t === "finish") {
            params.onEvent({ type: "finish" });
          } else if (t === "error") {
            const errObj =
              rec.error && typeof rec.error === "object"
                ? (rec.error as Record<string, unknown>)
                : undefined;
            const m =
              errObj?.message && typeof errObj.message === "string"
                ? errObj.message
                : undefined;
            params.onEvent({ type: "error", error: { message: m || "error" } });
          }
        }
      } catch {
        /* ignore */
      }
    }
  } finally {
    try {
      reader.releaseLock();
    } catch {
      /* ignore */
    }
  }
}
