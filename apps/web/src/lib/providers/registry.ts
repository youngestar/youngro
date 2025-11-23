import type { ChatProviderAdapter } from "./adapter";
import { deepseekAdapter } from "./adapters/deepseek";
import { moonshotAdapter } from "./adapters/moonshot";

const adapters: Record<string, ChatProviderAdapter> = {
  [deepseekAdapter.id]: deepseekAdapter,
  [moonshotAdapter.id]: moonshotAdapter,
};

export function getChatAdapter(id: string): ChatProviderAdapter | undefined {
  return adapters[id];
}

export function listChatAdapters(): ChatProviderAdapter[] {
  return Object.values(adapters);
}
