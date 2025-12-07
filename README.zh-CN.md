<p align="right">
  <a href="./README.md">English</a> |
  <a href="./README.zh-CN.md">简体中文</a> |
</p>

<p align="center">
  <sub>构建于 Turborepo + pnpm</sub>
</p>

<h1 align="center">Project YOUNGRO</h1>

<p align="center">一个面向多模态 AI 伴侣的现代化工程栈，用来在同一套单体仓库内编排意识、语音、记忆与外设。</p>

> [!NOTE]
> Youngro 仍在高速演进中。本文档描述的是当前代码库的能力；尚未合并的特性会在章节内标注 WIP。

## 为什么是 Youngro？

Youngro 参考了 AIRI 的整体工作流，却以 TypeScript 为中心重写：核心体验运行在 Next.js 15 + React 19 上，通过严格的依赖分层让 Web、桌面或机器人 Runtime 都能共用同一套基础设施。你可以在浏览器里体验意识模块、语音模块、记忆模块，并即时拼装属于自己的数字角色。

## 核心亮点

- **统一模块看板**：意识、语音、听觉、记忆、消息、游戏模块都通过 `modulesList` 定义，页面路由也统一，随时启用或关闭能力。
- **Provider 枢纽 + 验证**：聊天 / 语音 / 转写 Provider 在 `providersStore` 中注册元数据、持久化配置、远程校验，并按需拉取模型目录。
- **实时语音播放链路**：`useStreamingSpeechPlayback` 将模型输出拆分为流式片段，通过 `/api/speech/providers/:id` 排队合成，处理 SSML、音高/语速，以及延迟、情绪等特殊指令。
- **Youngro Card 领域模型**：`@youngro/store-card` 负责标准化人物卡片，自动补齐模块配置，落盘到 localStorage，并暴露在 Web、Bot、MCP 插件之间复用的 Prompt 片段。
- **设计系统即插即用**：`@repo/ui`、`@youngro/design-tokens`、`@youngro/emotion-tokens`、`@youngro/youngro-icons` 提供 Tailwind 主题、字体与 SVG 图标构建流水线。
- **类型安全的单向依赖**：ESLint `boundaries` 规则约束 `lib → store → feature → ui → app`，配合共享的 TS/ESLint 配置实现可摇树、无循环依赖的包。

## 能力进度

- [x] **意识 / 聊天**：多 Provider LLM，支持自定义模型优先级、提示词模板以及 `YoungroCard` 驱动的人格拼装。
- [x] **语音合成**：自动朗读回复、音高/语速控制、SSML 切换、情绪标签队列播放。
- [x] **Provider 管理**：持久化配置、远程验证、模型列表动态拉取、Adapter 注册表（位于 `apps/web/src/lib/providers`）。
- [ ] **听觉输入**：界面已提供麦克风/VAD/ASR 配置入口，后端音频接入正在规划。
- [ ] **记忆（短期/长期）**：短期上下文窗口与长期向量知识库 UI 已在位，适配器开发中。
- [ ] **消息桥接**：Discord 等连接模块已在设置页占位，等待后台服务上线。
- [ ] **游戏代理**：Minecraft 模块沿用 AIRI 思路，服务端控制器仍在 TODO。

## 架构

```mermaid
flowchart TD
  subgraph AppsSection["Apps"]
    Web[apps/web (Next.js 15 + Turbopack)]
    Docs[apps/docs (Next.js 15)]
  end

  subgraph FeatureStores["Features & Stores"]
    ChatStore[@youngro/chat-zustand]
    CardStore[@youngro/store-card]
    FeatureCard[@youngro/feature-youngro-card]
    ProvidersStore[providersStore.ts]
  end

  subgraph UISystem["UI System"]
    UI[@repo/ui]
    Tokens[@youngro/design-tokens]
    EmoTokens[@youngro/emotion-tokens]
    Icons[@youngro/youngro-icons]
  end

  subgraph ToolingStack["Tooling"]
    ESLint[@repo/eslint-config]
    TSConfig[@repo/typescript-config]
    Utils[@youngro/lib-utils]
  end

  Web --> ChatStore
  Web --> ProvidersStore
  Web --> FeatureCard
  FeatureCard --> CardStore
  CardStore --> ChatStore
  FeatureCard --> UI
  UI --> Tokens
  UI --> EmoTokens
  UI --> Icons
  Docs --> UI
  Docs --> Tokens
  Docs --> ESLint
  Docs --> TSConfig
  Web --> Utils
```

## 应用与包一览

| 范围                            | 说明                                                                                                         |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `apps/web`                      | 主体体验。Next.js 15 应用，包含多面板聊天（`InteractiveArea`）、模块设置、Provider 管理与流式语音播放。      |
| `apps/docs`                     | 文档/市场站点，同样使用 Next.js 并复用 UI 组件库以保证视觉一致。                                             |
| `@repo/ui`                      | Headless + 风格化组件（Button、Icon、ScrollArea、Textarea 等），Tailwind + Radix，使用 tsup 编译到 `dist/`。 |
| `@youngro/design-tokens`        | 颜色、排版、safelist 与编译后的 CSS，供 Web/Docs/UI 套件共用。                                               |
| `@youngro/emotion-tokens`       | 情绪预设，将推理的情绪标签映射到 UI 状态和语音播放提示。                                                     |
| `@youngro/youngro-icons`        | 基于 SVGR 的 SVG → React 图标流水线，提供类型定义与多入口导出。                                              |
| `@youngro/store-card`           | 人物卡片领域模型与 `YoungroCardProvider`，负责解析 CCv3/自定义 schema。                                      |
| `@youngro/feature-youngro-card` | Feature 层，将 UI 组件与 card store 组合成可编辑的人格面板。                                                 |
| `@youngro/chat-zustand`         | 聊天 store：发送队列、流式回调、Provider Hook 等共享逻辑。                                                   |
| `@youngro/lib-utils`            | 纯 TypeScript 辅助函数集，供多个包复用。                                                                     |
| `@repo/eslint-config`           | 集中化 ESLint 预设，包含依赖边界、import 卫生等规则。                                                        |
| `@repo/typescript-config`       | 基础 / React / Package 级别的 TSConfig，供所有包 `extends`。                                                 |

## Provider 支持

定义位于 `apps/web/src/data/settings/providers.ts`，默认支持：

### 聊天

- DeepSeek
- Moonshot AI（Kimi）

### 语音

- 腾讯云语音 TTS

每个 Provider 都声明了管理特性（模型/语种/标签/语音预览等）。`providersStore` 会校验必填字段，将配置加密后写入 `localStorage`，并在必要时调用 `/api/.../validate` 或 Adapter 自检，通过后才会标记为「已配置」。

## 模块体系

| 模块     | 功能                                         | 路由                              |
| -------- | -------------------------------------------- | --------------------------------- |
| 意识控制 | 调整人格、语气、核心模型。                   | `/settings/modules/consciousness` |
| 语音合成 | 选择 Provider、模型、音色、SSML、音高/语速。 | `/settings/modules/speech`        |

<!-- | 听觉输入       | 麦克风来源、语音识别、VAD 行为。                     | `/settings/modules/hearing`           |
| 短期记忆       | 会话上下文窗口、刷新策略。                           | `/settings/modules/memory-short-term` |
| 长期记忆       | 向量库 / 知识库同步（计划支持 DuckDB / pglite 等）。 | `/settings/modules/memory-long-term`  |
| Discord 连接   | OAuth 授权、频道事件同步。                           | `/settings/modules/messaging-discord` |
| Minecraft 模块 | 游戏内聊天、指令与事件回调接入。                     | `/settings/modules/gaming-minecraft`  |
| 实验功能       | Beta 功能与实验性体验。                              | `/settings/modules/beta`              | -->

## 开发指南

### 环境要求

- Node.js >= 18
- pnpm 9（仓库已在 `packageManager` 中锁定）
- Turbo CLI（建议全局安装以直接执行 `turbo` 命令）

### 安装与初始化

```sh
pnpm install
```

开发/构建前需要生成设计 Token（`predev`/`prebuild` 已自动调用，但也可手动执行）：

```sh
pnpm --filter @youngro/design-tokens build
```

### 运行应用

```sh
# 同时运行 web + docs（由 Turborepo 协调）
pnpm dev

# 仅关注 web
où
pnpm dev:web

# 其他过滤方式
pnpm --filter web dev
pnpm --filter docs dev
```

### 构建 & 检查

```sh
pnpm build         # 对应 turbo run build
pnpm lint          # 对应 turbo run lint
pnpm check-types   # 对应 turbo run check-types
```

### 环境变量

以下变量通过 Turbo 的 `globalEnv` 传递，可放在 `.env.local` 或 shell 中：

- `DEEPSEEK_API_KEY`, `DEEPSEEK_BASE_URL`
- `DISABLE_SHIKI`, `NEXT_DISABLE_SHIKI`, `MARKDOWN_NO_SHIKI`

### 远程缓存（可选）

沿用 Turborepo 的远程缓存机制，可使用 Vercel 账号共享构建产物：

```sh
turbo login
# 然后
turbo link
```

## 目录速览

- `apps/web/src/components`：聊天 UI、工具条、Markdown 渲染、Widget。
- `apps/web/src/store`：Zustand Store（Providers、Speech、Consciousness 等）。
- `apps/web/src/lib/providers`：聊天 / 语音 / 转写 Provider Adapter 注册表与实现。
- `packages/*`：上文提到的所有复用包，包含源码与必要的构建产物。
- `docs/`：独立的文档站点内容与脚本。
- `scripts/`：辅助脚本（未来会加入更多 CI/自动化能力）。

## 图标规范

- 系统图标统一使用 `@repo/ui` 的 `Icon` + `lucide-react`，用 `text-*` 控制颜色、`size` 控制尺寸。
- 品牌 / Logo 使用 `@repo/ui` 的 `BrandLogo` 或 `<img>`；SVG 资源不走 `next/image`。
- ESLint 规则保证：
  - 禁止 `<Image src="*.svg" />`
  - `<img>` / `BrandLogo` 必须提供 `alt` 文本

```tsx
import { Icon, BrandLogo } from "@repo/ui";
import { Check } from "lucide-react";

<Icon icon={Check} size="sm" className="text-muted-foreground" aria-label="ok" />

<BrandLogo srcLight="logo-light.svg" srcDark="logo-dark.svg" alt="Brand" width={180} height={38} />
```
