import type { ComponentType, SVGProps } from "react";
import type { LucideIcon } from "lucide-react";
import { DeepseekIcon, MoonshotIcon, TencentcloudIcon } from "@youngro/icons";

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

type ProviderIcon = LucideIcon | ComponentType<SVGProps<SVGSVGElement>>;

export interface SpeechModelCapabilities {
  /** Indicates whether the provider exposes a model catalog we can fetch. */
  managed?: boolean;
  /** Provider returns language metadata for each model. */
  exposesLanguages?: boolean;
  /** Provider returns tag/feature metadata for each model. */
  exposesTags?: boolean;
}

export interface SpeechVoiceCapabilities {
  /** Indicates whether the provider exposes a remote voice list. */
  managed?: boolean;
  /** Provider includes language metadata for each voice. */
  exposesLanguages?: boolean;
  /** Provider includes preview audio URLs for each voice. */
  exposesPreview?: boolean;
}

export interface SpeechProviderCapabilities {
  supportsSSML?: boolean;
  models?: SpeechModelCapabilities;
  voices?: SpeechVoiceCapabilities;
}

export interface ProviderCapabilities {
  speech?: SpeechProviderCapabilities;
}

export interface ProviderMeta {
  id: string;
  category: ProviderCategory;
  localizedName: string;
  localizedDescription?: string;
  icon?: ProviderIcon;
  iconColorClassName?: string;
  iconImageSrc?: string;
  configured?: boolean;
  capabilities?: ProviderCapabilities;
}

export const chatProviders: ProviderMeta[] = [
  {
    id: "deepseek",
    category: "chat",
    localizedName: "DeepSeek",
    localizedDescription: "高性价比推理与通用对话模型",
    icon: DeepseekIcon,
    iconColorClassName: "text-indigo-500 dark:text-indigo-400",
    configured: false,
  },
  {
    id: "moonshot",
    category: "chat",
    localizedName: "Moonshot AI",
    localizedDescription: "Kimi 智能助手 (长上下文支持)",
    icon: MoonshotIcon,
    iconColorClassName: "text-blue-500 dark:text-blue-400",
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
    id: "tencent-cloud-speech",
    category: "speech",
    localizedName: "腾讯云语音",
    localizedDescription: "腾讯云 TTS 语音合成",
    icon: TencentcloudIcon,
    iconColorClassName: "text-cyan-500 dark:text-cyan-400",
    configured: false,
    capabilities: {
      speech: {
        supportsSSML: false,
        models: {
          managed: true,
        },
        voices: {
          managed: true,
          exposesLanguages: true,
        },
      },
    },
  },
  {
    id: "elevenlabs",
    category: "speech",
    localizedName: "ElevenLabs",
    localizedDescription: "高品质文本转语音 (TTS)",
    icon: Volume2,
    iconColorClassName: "text-purple-500 dark:text-purple-400",
    configured: false,
    capabilities: {
      speech: {
        supportsSSML: true,
        models: {
          managed: true,
          exposesLanguages: true,
          exposesTags: true,
        },
        voices: {
          managed: true,
          exposesLanguages: true,
          exposesPreview: true,
        },
      },
    },
  },
  {
    id: "azure-speech",
    category: "speech",
    localizedName: "Azure Speech",
    localizedDescription: "微软语音服务 TTS",
    icon: Waves,
    iconColorClassName: "text-blue-500 dark:text-blue-400",
    configured: false,
    capabilities: {
      speech: {
        supportsSSML: true,
        models: {
          managed: true,
          exposesLanguages: true,
        },
        voices: {
          managed: false,
        },
      },
    },
  },
  {
    id: "local-tts",
    category: "speech",
    localizedName: "本地 TTS",
    localizedDescription: "基于本地引擎的文本转语音",
    icon: Mic,
    iconColorClassName: "text-amber-500 dark:text-amber-400",
    configured: false,
    capabilities: {
      speech: {
        supportsSSML: true,
        models: {
          managed: true,
        },
        voices: {
          managed: false,
        },
      },
    },
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

export function getSpeechCapabilities(
  meta?: ProviderMeta | null
): SpeechProviderCapabilities {
  return meta?.capabilities?.speech ?? {};
}

export function speechProviderSupportsSSML(
  meta?: ProviderMeta | null
): boolean {
  return Boolean(meta?.capabilities?.speech?.supportsSSML);
}

export function speechProviderHasManagedModels(
  meta?: ProviderMeta | null
): boolean {
  return Boolean(meta?.capabilities?.speech?.models?.managed);
}

export function speechProviderHasManagedVoices(
  meta?: ProviderMeta | null
): boolean {
  return Boolean(meta?.capabilities?.speech?.voices?.managed);
}

export function speechProviderExposesModelMetadata(
  meta: ProviderMeta | null | undefined,
  key: "exposesLanguages" | "exposesTags"
): boolean {
  return Boolean(meta?.capabilities?.speech?.models?.[key]);
}

export function speechProviderExposesVoiceMetadata(
  meta: ProviderMeta | null | undefined,
  key: "exposesLanguages" | "exposesPreview"
): boolean {
  return Boolean(meta?.capabilities?.speech?.voices?.[key]);
}
