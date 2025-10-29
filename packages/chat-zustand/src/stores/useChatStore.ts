// HMR test: trivial comment to verify source-linked hot reload
import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { persist, createJSONStorage } from "zustand/middleware";
import type { BaseMessage, AssistantMessage, StreamEvent } from "../types/chat";

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
}

export const useChatStore = create<ChatState>()(
  persist(
    immer((set, get) => ({
      messages: [],
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
                  const chunk = typeof obj.text === "string" ? obj.text : "";
                  if (!chunk) continue;
                  set((st) => {
                    if (!st.streamingMessage) return;
                    st.streamingMessage.content += chunk;
                    st.streamingMessage.slices =
                      st.streamingMessage.slices || [];
                    st.streamingMessage.slices.push({
                      type: "text",
                      text: chunk,
                    });
                  });
                  get().onTokenLiteral.forEach((cb) => cb(chunk));
                } else if (t === "finish") {
                  // push final assistant message
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
          s.streamingMessage = null;
        });
      },

      cleanup: () =>
        set((s) => {
          s.messages = [];
          s.streamingMessage = null;
          s.sending = false;
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
    })),
    {
      name: "youngro.chat.history.v1",
      storage: createJSONStorage(() => localStorage),
      // 仅持久化 messages，避免将临时状态（如 sending/streamingMessage/handlers）写入存储
      partialize: (s) => ({ messages: s.messages }),
      version: 1,
    }
  )
);

export default useChatStore;
