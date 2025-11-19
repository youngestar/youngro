// Minimal provider adapter interfaces for chat providers
// Focus: config validation, model listing, streaming chat

export interface ProviderValidationResult {
  valid: boolean;
  errors: string[];
}

export interface ProviderModelInfo {
  id: string;
  name: string;
  description?: string;
}

export interface ChatStreamChunk {
  type: "text-delta" | "finish" | "error";
  text?: string;
  error?: string;
}

export interface ProviderAdapterConfig {
  apiKey?: string;
  baseUrl?: string; // trailing slash optional; adapter should normalize
  model?: string;
}

export interface ChatProviderAdapter {
  id: string;
  validateConfig(
    config: ProviderAdapterConfig
  ): Promise<ProviderValidationResult>;
  listModels(config: ProviderAdapterConfig): Promise<ProviderModelInfo[]>; // may be static
  chatStream(
    messages: Array<{ role: string; content: any }>,
    config: ProviderAdapterConfig & { model?: string },
    options?: { signal?: AbortSignal }
  ): AsyncIterable<ChatStreamChunk>;
}
