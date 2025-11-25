import { createOpenAICompatibleAdapter } from "./openaiCompatible";

export const moonshotAdapter = createOpenAICompatibleAdapter({
  id: "moonshot",
  displayName: "Moonshot AI",
  description: "Kimi 智能助手 (长上下文)",
  defaultBaseUrl: "https://api.moonshot.cn/v1",
  defaultModel: "moonshot-v1-8k",
  modelList: [
    { id: "moonshot-v1-8k", name: "moonshot-v1-8k (8k context)" },
    { id: "moonshot-v1-32k", name: "moonshot-v1-32k (32k context)" },
    { id: "moonshot-v1-128k", name: "moonshot-v1-128k (128k context)" },
  ],
  envApiKey: "MOONSHOT_API_KEY",
});
