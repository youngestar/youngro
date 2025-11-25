import { createOpenAICompatibleAdapter } from "./openaiCompatible";

export const deepseekAdapter = createOpenAICompatibleAdapter({
  id: "deepseek",
  displayName: "DeepSeek",
  description: "DeepSeek 推理与通用模型",
  defaultBaseUrl: "https://api.deepseek.com",
  defaultModel: "deepseek-chat",
  modelList: [
    { id: "deepseek-chat", name: "deepseek-chat" },
    { id: "deepseek-reasoner", name: "deepseek-reasoner" },
  ],
  envApiKey: "DEEPSEEK_API_KEY",
});
