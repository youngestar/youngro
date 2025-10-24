# `@repo/eslint-config`

共享的 ESLint 配置，用于 monorepo 内所有包与应用。

## 约定补充（图标体系）

- 禁止使用 `next/image` 渲染 `.svg` 资源（系统图标请使用 `@repo/ui` 的 `Icon`，品牌/Logo 使用 `BrandLogo` 或原生 `<img>`）。
  - 规则：`no-restricted-syntax` 针对 `<Image src="*.svg" />` 报错
- 必须为图片元素提供 `alt` 文本（`jsx-a11y/alt-text`）。

如需临时豁免，请在代码旁注明原因，并在近期修复。
