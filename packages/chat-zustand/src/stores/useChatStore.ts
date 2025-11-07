// HMR test: trivial comment to verify source-linked hot reload
import { create } from "zustand";
import { getRuntimeSystemPrompt } from "@youngro/store-card";
import { immer } from "zustand/middleware/immer";
import { persist, createJSONStorage } from "zustand/middleware";
import type { BaseMessage, AssistantMessage, StreamEvent } from "../types/chat";
// Emotion/Delay tokens integration
// Lazy import style: use require-like dynamic to avoid type resolution issues if package build not yet run.
// For type safety, declare a minimal interface.
// Local import to source (avoid relying on built types during dev):
// NOTE: Adjust relative path if package structure changes.
import {
  createStreamTokenizer,
  stripTokens,
  type Token as EmotionToken,
} from "../../../emotion-tokens/src/index";
const ENABLE_TOKEN_PARSE = true; // future: externalize via settings/feature flag
const streamTokenizer = createStreamTokenizer();

export interface ChatState {
  messages: BaseMessage[];
  streamingMessage: AssistantMessage | null;
  sending: boolean;
  abortController?: AbortController | null;
  // hooks
  onTokenLiteral: Array<(literal: string) => void>;
  onStreamEnd: Array<() => void>;

  // actions
  send: (text: string, options?: { model?: string }) => Promise<void>;
  cancel: () => void;
  cleanup: () => void;
  registerOnTokenLiteral: (cb: (s: string) => void) => () => void;
  registerOnStreamEnd: (cb: () => void) => () => void;
  // sync system prompt from active Youngro card
  applyActiveCardSystemPrompt: () => void;
}

export const useChatStore = create<ChatState>()(
  persist(
    immer((set, get) => ({
      // 初始包含一条系统提示，便于“清空=重置为系统提示”
      messages: [generateInitialSystemMessage()],
      streamingMessage: null,
      sending: false,
      abortController: null,

      onTokenLiteral: [],
      onStreamEnd: [],

      send: async (text: string, options?: { model?: string }) => {
        if (!text) return;
        const id = String(Date.now());
        const userMessage: BaseMessage = {
          id,
          role: "user",
          content: text,
          timestamp: new Date().toISOString(),
        };
        set((state) => {
          state.messages.push(userMessage);
          state.sending = true;
          state.streamingMessage = {
            id: `assistant-${id}`,
            role: "assistant",
            content: "",
            slices: [],
            tool_results: [],
          };
        });

        // create abort controller and attach
        const controller = new AbortController();
        set((s) => {
          s.abortController = controller;
        });

        // Build provider messages from store history (skip error messages)
        const toProviderMessages = () => {
          const current = get().messages;
          const msgs: Array<{
            role: "system" | "user" | "assistant" | "tool";
            content: any;
          }> = [];
          for (const m of current) {
            if (m.role === "error") continue;
            const role =
              m.role === "system" ||
              m.role === "user" ||
              m.role === "assistant" ||
              m.role === "tool"
                ? m.role
                : undefined;
            if (!role) continue;
            msgs.push({ role, content: m.content });
          }
          return msgs;
        };

        try {
          const res = await fetch("/api/chat", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              messages: toProviderMessages(),
              model: options?.model,
              stream: true,
            }),
            signal: controller.signal,
          });
          if (!res.ok) {
            throw new Error(`HTTP ${res.status}: ${await res.text()}`);
          }
          const reader = res.body?.getReader();
          if (!reader) throw new Error("ReadableStream reader unavailable");
          const decoder = new TextDecoder();
          let buffer = "";

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
                const obj = JSON.parse(s) as Record<string, unknown>;
                const t = obj.type as string | undefined;
                if (t === "text-delta") {
                  const rawChunk = typeof obj.text === "string" ? obj.text : "";
                  if (!rawChunk) continue;
                  let visible = rawChunk;
                  let newTokens: EmotionToken[] = [];
                  if (ENABLE_TOKEN_PARSE) {
                    const { textDelta, tokens } =
                      streamTokenizer.ingest(rawChunk);
                    visible = textDelta;
                    newTokens = tokens;
                    // (Future) dispatch tokens to emotion/delay queues here
                    // e.g., emotionQueue.add(tokens.filter(t => t.kind==='emote'))
                    //       delayQueue.add(tokens.filter(t => t.kind==='delay'))
                  }
                  // 强力兜底：再次剥离可能残留的标记（防止上游逻辑失效或旧数据混入）
                  if (visible) visible = stripTokens(visible);
                  if (visible) {
                    set((st) => {
                      if (!st.streamingMessage) return;
                      st.streamingMessage.content += visible;
                      st.streamingMessage.slices =
                        st.streamingMessage.slices || [];
                      st.streamingMessage.slices.push({
                        type: "text",
                        text: visible,
                      });
                    });
                    get().onTokenLiteral.forEach((cb) => cb(visible));
                  }
                  // 不再把 token 原文注入 slices，避免 UI 误渲染；后续若需调试可加独立调试队列。
                } else if (t === "finish") {
                  // push final assistant message
                  set((st) => {
                    if (
                      st.streamingMessage &&
                      st.streamingMessage.slices &&
                      st.streamingMessage.slices.length > 0
                    ) {
                      // 在入列前做一次彻底清洗，双保险（仅对字符串内容）
                      if (typeof st.streamingMessage.content === "string") {
                        st.streamingMessage.content = stripTokens(
                          st.streamingMessage.content
                        );
                      }
                      st.messages.push({
                        ...(st.streamingMessage as BaseMessage),
                        timestamp: new Date().toISOString(),
                      });
                    }
                    st.streamingMessage = null;
                    st.sending = false;
                    st.abortController = null;
                  });
                  get().onStreamEnd.forEach((cb) => cb());
                } else if (t === "error") {
                  const msg =
                    (obj.error &&
                      typeof obj.error === "object" &&
                      (obj.error as any).message) ||
                    "error";
                  throw new Error(String(msg));
                }
              } catch (e) {
                // Treat parse/stream error as failure and exit
                throw e;
              }
            }
          }
          // Flush remaining buffer if contains a last JSON
          const last = buffer.trim();
          if (last) {
            try {
              const obj = JSON.parse(last) as Record<string, unknown>;
              const t = obj.type as string | undefined;
              if (t === "finish") {
                set((st) => {
                  if (
                    st.streamingMessage &&
                    st.streamingMessage.slices &&
                    st.streamingMessage.slices.length > 0
                  ) {
                    st.messages.push({
                      ...(st.streamingMessage as BaseMessage),
                      timestamp: new Date().toISOString(),
                    });
                  }
                  st.streamingMessage = null;
                  st.sending = false;
                  st.abortController = null;
                });
                get().onStreamEnd.forEach((cb) => cb());
              }
            } catch {
              // ignore
            }
          }
        } catch (err) {
          set((s) => {
            s.sending = false;
            s.abortController = null;
            s.streamingMessage = null;
            s.messages.push({
              id: `err-${id}`,
              role: "error",
              content: (err as Error).message,
              timestamp: new Date().toISOString(),
            });
          });
        }
      },

      cancel: () => {
        const ctrl = get().abortController;
        if (ctrl) ctrl.abort();
        set((s) => {
          s.sending = false;
          s.abortController = null;
          // ensure flush remaining buffered plain text (if any)
          if (ENABLE_TOKEN_PARSE && s.streamingMessage) {
            const { textDelta } = streamTokenizer.flush();
            if (textDelta) {
              const cleaned = stripTokens(textDelta);
              s.streamingMessage.content += cleaned;
              s.streamingMessage.slices = s.streamingMessage.slices || [];
              s.streamingMessage.slices.push({ type: "text", text: cleaned });
            }
            if (typeof s.streamingMessage.content === "string") {
              s.streamingMessage.content = stripTokens(
                s.streamingMessage.content
              );
            }
          }
          s.streamingMessage = null;
        });
      },

      // 清空 = 重置为仅系统提示
      cleanup: () =>
        set((s) => {
          s.messages = [generateInitialSystemMessage()];
          s.streamingMessage = null;
          s.sending = false;
          s.abortController = null;
        }),

      registerOnTokenLiteral: (cb) => {
        set((s) => {
          s.onTokenLiteral.push(cb);
        });
        return () =>
          set((s) => {
            s.onTokenLiteral = s.onTokenLiteral.filter((fn) => fn !== cb);
          });
      },

      registerOnStreamEnd: (cb) => {
        set((s) => {
          s.onStreamEnd.push(cb);
        });
        return () =>
          set((s) => {
            s.onStreamEnd = s.onStreamEnd.filter((fn) => fn !== cb);
          });
      },

      // 将首条 system 消息更新为当前激活的 Youngro 卡片的系统提示（若存在）
      applyActiveCardSystemPrompt: () => {
        const prompt = generateSystemPrompt();
        set((s) => {
          const first = s.messages[0];
          if (!first || first.role !== "system") {
            s.messages = [
              {
                id: `system-${Date.now()}`,
                role: "system",
                content: prompt,
                timestamp: new Date().toISOString(),
              },
              ...s.messages,
            ];
          } else {
            first.content = prompt;
          }
        });
      },
    })),
    {
      name: "youngro.chat.history.v1",
      storage: createJSONStorage(() => localStorage),
      // 仅持久化 messages，避免将临时状态（如 sending/streamingMessage/handlers）写入存储
      partialize: (s) => ({ messages: s.messages }),
      version: 3,
      // 迁移：确保首条为 system，并使用最新系统提示；并清洗历史消息中的控制标记
      migrate: (persistedState: unknown, prevVersion: number) => {
        const state = (persistedState as Partial<ChatState>) || {};
        const msgs = Array.isArray((state as any).messages)
          ? ([...(state as any).messages] as BaseMessage[])
          : [];

        // 若无消息或首条非 system，则补上一条最新系统提示
        const first = msgs[0];
        if (!first || first.role !== "system") {
          const sys = generateInitialSystemMessage();
          (state as any).messages = [sys, ...msgs];
          return state as ChatState;
        }

        // 若首条为 system，但内容需要更新，则覆盖其 content
        const expected = generateSystemPrompt();
        let arr: BaseMessage[] = msgs;
        if (typeof first.content === "string" && first.content !== expected) {
          const updatedFirst: BaseMessage = { ...first, content: expected };
          arr = [updatedFirst, ...msgs.slice(1)];
        }
        // 清洗所有字符串消息中的控制标记（向后兼容旧版本存量数据）
        const cleaned = arr.map((m) => {
          if (typeof m.content === "string") {
            return { ...m, content: stripTokens(m.content) } as BaseMessage;
          }
          return m;
        });
        (state as any).messages = cleaned;
        return state as ChatState;
      },
    }
  )
);

// 从 localStorage 读取激活的 Youngro 卡片（若有）
function getActiveYoungroCardFromStorage():
  | (Record<string, unknown> & {
      systemPrompt?: string;
      postHistoryInstructions?: string;
      name?: string;
      description?: string;
      personality?: string;
      scenario?: string;
    })
  | null {
  if (typeof window === "undefined") return null;
  try {
    const rawCards = window.localStorage.getItem("youngro-cards");
    const activeId =
      window.localStorage.getItem("youngro-card-active-id") || "";
    if (!rawCards || !activeId) return null;
    const map = JSON.parse(rawCards) as Record<string, any>;
    return map[activeId] || null;
  } catch {
    return null;
  }
}

// 单一真源：系统提示（优先使用激活 Youngro 卡片，否则使用通用提示）
function generateSystemPrompt(): string {
  const fallbackCodeBlockHint =
    "- For code blocks, specify the language (e.g., ```ts) to enable proper highlighting.";
  const fallbackMathHint =
    "- Use LaTeX for math (e.g., $x^3$); escape dollar signs when not in math.";
  const header = `${fallbackCodeBlockHint}\n${fallbackMathHint}`;

  const active = getActiveYoungroCardFromStorage();
  const base = active ? getRuntimeSystemPrompt(active as any) : "";
  const tail = base.trim();
  return tail ? `${header}\n${tail}` : header;
}

function generateInitialSystemMessage(): BaseMessage {
  return {
    id: `system-${Date.now()}`,
    role: "system",
    content: generateSystemPrompt(),
    timestamp: new Date().toISOString(),
  };
}

export default useChatStore;
