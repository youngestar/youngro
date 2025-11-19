import type { ChatProviderAdapter } from "./adapter";
import { deepseekAdapter } from "./adapters/deepseek";

const adapters: Record<string, ChatProviderAdapter> = {
  [deepseekAdapter.id]: deepseekAdapter,
};

export function getChatAdapter(id: string): ChatProviderAdapter | undefined {
  return adapters[id];
}

export function listChatAdapters(): ChatProviderAdapter[] {
  return Object.values(adapters);
}
