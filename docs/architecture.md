# Youngro Monorepo 架构规范（初版）

> 目标：清晰分层、稳定依赖方向、提升复用与可测试性，参考 airi 的组织方式并结合 Next.js/Turborepo 工具链。

## 分层与职责

- apps/
  - `web/`、`docs/` 等运行体，仅做「装配」：路由、布局、数据接驳，尽量不放可复用逻辑。
- packages/
  - `ui/`：通用 UI 库（Primitives/Atoms/Composites），只依赖 `design-tokens`、`youngro-icons`；禁止依赖 feature/store。
  - `design-tokens/`：设计令牌（主题/尺寸/色板）。
  - `youngro-icons/`：图标资源；UI 使用，App 不直接依赖。
  - `store-*`：领域状态（如 `store-card`、`store-chat`），暴露 hooks/selectors，不包含页面与路由。
  - `feature-*`：领域复合能力（如 `feature-youngro-card`），组合 UI 与 store，输出可复用的业务组件/帮助函数。
  - `lib-*`：纯工具库（如 `lib-utils`），不依赖 React/UI，便于 SSR 与脚本环境。
  - `eslint-config/`、`typescript-config/`：工程配置。

依赖方向（只允许从左到右）：

```
lib → store → feature → ui → app
```

- App 不直接依赖 `design-tokens`、`youngro-icons` 与低层 lib（通过 UI/feature 间接使用）。
- UI 禁止依赖 feature/store。

## 工程与任务

- 统一构建产物：包产物输出到 `dist/`；Turbo 缓存包含 `dist/**`（已在根 `turbo.json` 修正）。
- 包内脚本：
  - `build`: `tsc -p tsconfig.json`
  - `check-types`: `tsc -p tsconfig.json --noEmit`
  - UI/Feature 需要时可引入 tsup/tsdown 统一。

## 代码约定

- 导入路径：禁止跨包相对导入；一律通过包名（`exports`）访问。
- 命名：`@youngro/<layer>-<domain>`，如 `@youngro/store-card`、`@youngro/feature-youngro-card`、`@youngro/lib-utils`。
- 图标规范：系统图标使用 `@repo/ui` 的 `<Icon>` 搭配 `lucide-react`；品牌/Logo 使用 `<img>` 或 `BrandLogo`，SVG 不使用 `next/image`。参考仓库 README 的示例。

## 迁移建议（分阶段）

1. 架构承接（已完成）
   - 新增 `@youngro/lib-utils`、`@youngro/store-card`、`@youngro/feature-youngro-card` 基础脚手架。
   - 修正 Turbo `build.outputs`，加入 `dist/**`。
2. 低风险下沉
   - 将 `app/settings/youngro-card` 中可复用的 store/逻辑/复合组件，逐步迁移至 `store-card` / `feature-youngro-card`。
   - App 仅保留页面与路由装配。
3. 规则固化
   - 在仓库引入依赖边界检查（eslint-plugin-boundaries / dependency-cruiser），先警告后强制。
4. 测试与 CI
   - 为 `ui`/`feature-*`/`store-*` 增加最小单测；CI 跑 `lint`/`typecheck`/`test`。

## 备注

- 本文为初版，可在迁移过程中根据实际依赖关系微调；优先保证“依赖方向稳定、复用边界明确、构建可缓存”。
