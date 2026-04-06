---
name: youngro-architecture
description: Use when writing, refactoring, or locating code for the Youngro project.
---

# Youngro 架构与开发指南

## 1. 项目概览 (Overview)

这是一个基于 `pnpm workspace` 和 `Turborepo` 构建的 Monorepo 前端项目。核心业务是一个具备 AI 聊天与特殊卡片展示功能的沉浸式 Web 应用。
应用主框架使用 Next.js (App Router)，并被拆分为严格的 `apps/`（宿主）和 `packages/`（领域/基建）结构。

## 2. 目录职责字典 (Package Dictionary)

### 📂 Apps (宿主与装配层)

包含具体的应用入口，负责组合底层的 `packages`，处理全局路由、应用级别状态与 API。

- `apps/web/`: 主线 Next.js Web 应用。包含页面路由 (`app/`)、API 路由 (`api/`) 和直接相关的业务页面组件。
- `apps/docs/`: 存放项目文档/架构说明的静态站点/文档应用。

### 📂 Packages (领域特性与基础库)

包含可复用的 UI、独立业务逻辑以及基础工具。所有子包的作用域命名空间均为 `@youngro/`。

_基础 UI 与样式 (Foundation)_

- `packages/ui/`: 通用、无状态的展示型 UI 组件库。基于 **Radix UI + Tailwind CSS + class-variance-authority (CVA)** 进行封装。
- `packages/design-tokens/`: 全局设计令牌（Design Tokens\CSS 变量），如 `chromatic.css`。
- `packages/icons/`: SVG 图标仓库及自动生成 React 组件的脚本。

_业务特性层 (Features)_

- `packages/feature-chat/`: 核心聊天界面组件、消息列表渲染等。
- `packages/chat-zustand/`: 独立的状态管理库，专为 AI 聊天会话提供 Store。
- `packages/feature-card/` & `packages/feature-youngro-card/`: 业务特定的卡片展示组件和逻辑。
- `packages/llm-tokens/`: 处理 LLM 流式输出与 Token 解析的核心逻辑包。

_工具与规范 (Infrastructure)_

- `packages/utils/`: 纯函数、日期/字符串处理等通用工具方法。
- `packages/eslint-config/` & `packages/typescript-config/`: 全局共享的代码质量检查与 TS 编译配置。

## 3. 依赖规则 (Dependency Rules)

1. **单向数据流向**：`apps/` -> `packages/feature-*` -> `packages/ui` -> `packages/utils` & `packages/design-tokens`。
2. **严禁反向依赖**：`packages/` 目录下的代码绝对不能直接导入（`import`） `apps/web/` 中的任何文件。
3. **Workspace 引用规范**：跨包引用必须使用 NPM 作用域包名，例如 `import { Button } from '@youngro/ui'`，**绝对禁止**使用长相对路径如 `../../../packages/ui`。

## 4. 给 AI 助手的行动指令 (Actionable Instructions)

- **新增 UI 组件**：如果是通用、无状态、跨业务复用的组件，请放置在 `packages/ui/src/` 中，使用 Radix UI 作为无障碍基础，结合 Tailwind CSS 和 CVA 进行样式封装，并在 `packages/ui/src/index.ts` 中导出。
- **新增业务功能**：与具体业务逻辑强绑定（如新的聊天工具面板）的代码，优先在 `packages/feature-*` 下开发，然后再在 `apps/web` 中组装引入。
- **状态管理**：
  - AI 聊天等复杂的全局状态必须收敛于 `packages/chat-zustand/`，并在其他包中作为 hooks 引入。
  - 组件的内部局部状态请优先使用原生 `useState` / `useReducer`。
  - 跨层级的轻量依赖注入或主题控制，可适当使用 React Context。
- **新增页面**：若要求添加新路由页面，请在 `apps/web/app/<route-name>/page.tsx` 中创建，不要在 page 文件中堆砌复杂逻辑，而是将其抽离到对应的 feature 包或局部的 `_components` 目录下。
- **样式处理**：默认使用 TailwindCSS。如果需要扩展全局颜色或间距，请在 `packages/design-tokens` 中的配置文件修改，然后在对应的 tailwind 配置文件中集成。
