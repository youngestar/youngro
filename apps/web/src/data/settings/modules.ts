import type { LucideIcon } from "lucide-react";
import {
  Brain,
  Ghost,
  Gamepad2,
  Headphones,
  MessageCircle,
  Mic,
  Rocket,
  Waves,
} from "lucide-react";

export interface SettingsModuleEntry {
  id: string;
  name: string;
  description: string;
  /** Icon component to render for the module card. */
  icon?: LucideIcon;
  /** Tailwind classes to tint the icon wrapper. */
  iconColorClassName?: string;
  /** Optional image URL to render instead of the icon node. */
  iconImageSrc?: string;
  /** Destination href for the module card. */
  href: string;
  /** Whether the module has been configured by the user. */
  configured?: boolean;
}

export const modulesList: SettingsModuleEntry[] = [
  {
    id: "consciousness",
    name: "意识控制",
    description: "配置人格、语气和行为模式。",
    icon: Ghost,
    iconColorClassName: "text-neutral-500",
    href: "/settings/modules/consciousness",
  },
  {
    id: "speech",
    name: "语音合成",
    description: "配置语音提供商、模型与发声参数。",
    icon: Mic,
    iconColorClassName: "text-neutral-500",
    href: "/settings/modules/speech",
  },
  {
    id: "hearing",
    name: "听觉输入",
    description: "管理麦克风来源、语音识别与 VAD 行为。",
    icon: Headphones,
    iconColorClassName: "text-neutral-500",
    href: "/settings/modules/hearing",
  },
  {
    id: "memory-short-term",
    name: "短期记忆",
    description: "调整对话上下文窗口及刷新策略。",
    icon: Brain,
    iconColorClassName: "text-neutral-500",
    href: "/settings/modules/memory-short-term",
  },
  {
    id: "memory-long-term",
    name: "长期记忆",
    description: "同步向量数据库与知识库来源。",
    icon: Waves,
    iconColorClassName: "text-neutral-500",
    href: "/settings/modules/memory-long-term",
  },
  {
    id: "messaging-discord",
    name: "Discord 连接",
    description: "授权并同步 Discord 频道事件。",
    icon: MessageCircle,
    iconColorClassName: "text-neutral-500",
    href: "/settings/modules/messaging-discord",
  },
  {
    id: "gaming-minecraft",
    name: "Minecraft 模块",
    description: "管理游戏内聊天、指令与事件回调。",
    icon: Gamepad2,
    iconColorClassName: "text-neutral-500",
    href: "/settings/modules/gaming-minecraft",
  },
  {
    id: "beta",
    name: "实验功能",
    description: "探索即将上线的增强体验。",
    icon: Rocket,
    iconColorClassName: "text-neutral-500",
    href: "/settings/modules/beta",
  },
];
