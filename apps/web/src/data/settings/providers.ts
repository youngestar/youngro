import type { LucideIcon } from "lucide-react";
import {
  MessageSquare,
  MessageSquareQuote,
  Bot,
  // speech
  Volume2,
  Waves,
  Mic,
  // transcription
  AudioLines,
  FileAudio2,
} from "lucide-react";

export type ProviderCategory = "chat" | "speech" | "transcription";

export interface ProviderMeta {
  id: string;
  category: ProviderCategory;
  localizedName: string;
  localizedDescription?: string;
  icon?: LucideIcon;
  iconColorClassName?: string;
  iconImageSrc?: string;
  configured?: boolean;
}

export const chatProviders: ProviderMeta[] = [
  {
    id: "deepseek",
    category: "chat",
    localizedName: "DeepSeek",
    localizedDescription: "高性价比推理与通用对话模型",
    icon: MessageSquare,
    iconColorClassName: "text-indigo-500 dark:text-indigo-400",
    configured: false,
  },
  {
    id: "openrouter",
    category: "chat",
    localizedName: "OpenRouter",
    localizedDescription: "聚合多家大模型的统一接口",
    icon: MessageSquareQuote,
    iconColorClassName: "text-primary-500 dark:text-primary-400",
    configured: false,
  },
  {
    id: "openai",
    category: "chat",
    localizedName: "OpenAI",
    localizedDescription: "GPT 系列与 Assistants",
    icon: Bot,
    iconColorClassName: "text-sky-500 dark:text-sky-400",
    configured: false,
  },
  {
    id: "ollama",
    category: "chat",
    localizedName: "Ollama",
    localizedDescription: "本地运行多种开源大模型",
    icon: MessageSquare,
    iconColorClassName: "text-emerald-500 dark:text-emerald-400",
    configured: false,
  },
];

export const audioSpeechProviders: ProviderMeta[] = [
  {
    id: "elevenlabs",
    category: "speech",
    localizedName: "ElevenLabs",
    localizedDescription: "高品质文本转语音 (TTS)",
    icon: Volume2,
    iconColorClassName: "text-purple-500 dark:text-purple-400",
    configured: false,
  },
  {
    id: "azure-speech",
    category: "speech",
    localizedName: "Azure Speech",
    localizedDescription: "微软语音服务 TTS",
    icon: Waves,
    iconColorClassName: "text-blue-500 dark:text-blue-400",
    configured: false,
  },
  {
    id: "local-tts",
    category: "speech",
    localizedName: "本地 TTS",
    localizedDescription: "基于本地引擎的文本转语音",
    icon: Mic,
    iconColorClassName: "text-amber-500 dark:text-amber-400",
    configured: false,
  },
];

export const audioTranscriptionProviders: ProviderMeta[] = [
  {
    id: "whisper-cpp",
    category: "transcription",
    localizedName: "Whisper.cpp",
    localizedDescription: "轻量本地语音转文字",
    icon: AudioLines,
    iconColorClassName: "text-teal-500 dark:text-teal-400",
    configured: false,
  },
  {
    id: "openai-transcription",
    category: "transcription",
    localizedName: "OpenAI",
    localizedDescription: "高准确率语音转文字",
    icon: FileAudio2,
    iconColorClassName: "text-rose-500 dark:text-rose-400",
    configured: false,
  },
];

export const allProviders: ProviderMeta[] = [
  ...chatProviders,
  ...audioSpeechProviders,
  ...audioTranscriptionProviders,
];
