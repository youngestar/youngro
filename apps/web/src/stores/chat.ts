import { create } from "zustand";

export type Role = "user" | "assistant" | "error";

export interface Message {
  role: Role;
  content: string;
}

interface StreamingMessage {
  content: string;
}

interface ChatStore {
  messages: Message[];
  sending: boolean;
  streamingMessage: StreamingMessage;
  onBeforeMessageComposed: (cb: () => void) => void;
  onTokenLiteral: (cb: () => void) => void;
}

export const useChatStore = create<ChatStore>(() => ({
  messages: [],
  sending: false,
  streamingMessage: { content: "" },
  // Minimal no-op implementations to satisfy current usages
  onBeforeMessageComposed: () => {},
  onTokenLiteral: () => {},
}));
