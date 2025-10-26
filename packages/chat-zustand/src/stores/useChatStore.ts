import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
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
  registerOnTokenLiteral: (cb: (s: string) => void) => void;
  registerOnStreamEnd: (cb: () => void) => void;
}

export const useChatStore = create<ChatState>()(
  immer((set, get) => ({
    messages: [
      {
        id: "init",
        role: "system",
        content: "Welcome to the chat!",
      },
    ],
    streamingMessage: null,
    sending: false,
    abortController: null,

    onTokenLiteral: [],
    onStreamEnd: [],

    send: async (text: string) => {
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

      // For demo: simple mock streaming that emits chunks
      try {
        const chunks = ["Hi", ", this is", " a demo", " of streaming", "."];
        for (const chunk of chunks) {
          if (controller.signal.aborted) throw new Error("aborted");
          // simulate delay
          await new Promise((r) => setTimeout(r, 200));
          // append to streaming message
          set((s) => {
            if (!s.streamingMessage) return;
            s.streamingMessage.content += chunk;
            s.streamingMessage.slices = s.streamingMessage.slices || [];
            s.streamingMessage.slices.push({ type: "text", text: chunk });
          });
          // call hooks
          get().onTokenLiteral.forEach((cb) => cb(chunk));
        }

        // finish
        set((s) => {
          if (
            s.streamingMessage &&
            s.streamingMessage.slices &&
            s.streamingMessage.slices.length > 0
          ) {
            s.messages.push(s.streamingMessage as BaseMessage);
          }
          s.streamingMessage = null;
          s.sending = false;
          s.abortController = null;
        });

        get().onStreamEnd.forEach((cb) => cb());
      } catch (err) {
        set((s) => {
          s.sending = false;
          s.abortController = null;
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

    registerOnTokenLiteral: (cb) =>
      set((s) => {
        s.onTokenLiteral.push(cb);
      }),

    registerOnStreamEnd: (cb) =>
      set((s) => {
        s.onStreamEnd.push(cb);
      }),
  }))
);

export default useChatStore;
