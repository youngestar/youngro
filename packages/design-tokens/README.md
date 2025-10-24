# @youngro/design-tokens

共享的 Tailwind 配置与主题 Tokens（Chromatic 色相主题、Typography、Forms、暗色模式）。

## 使用方法

1. 在应用的全局样式中引入 chromatic 变量：

```css
@import "@youngro/design-tokens/styles/chromatic.css";
```

2. Tailwind 配置继承本包（示例在 `packages/ui`、`apps/web` 已接入），颜色可直接使用：

- `bg-primary` / `text-primary` / `border-primary`
- `bg-complementary` / `text-complementary`
- `bg-background` / `text-foreground`
- 若需要少量色阶：`bg-primary-50|100|200|500|700`

这些颜色均由 CSS 变量驱动，支持不重建即可换色相。

3. 切换主题色相

在布局或页面容器上设置 `--chromatic-hue` 即可（0–360）：

```html
<html style="--chromatic-hue: 240.25">
  ...
</html>
```

或通过切换 `data-theme`/类名，在样式里设置不同预设，例如：

```css
:root[data-theme="green"] {
  --chromatic-hue: 150;
}
:root[data-theme="pink"] {
  --chromatic-hue: 330;
}
```

4. 暗色模式

使用 `class` 策略：在根节点加上 `.dark` 类即可启用暗色变量。

```html
<html class="dark">
  ...
</html>
```

## 注意事项

- 颜色采用 HSL + CSS 变量三元（`h s l`），Tailwind 中通过 `hsl(var(--token) / <alpha-value>)` 映射，支持透明度修饰。
- 如需更多色阶，可在本包的 `chromatic.css` 中按需扩展（保持以 `--primary-h` 为基准）。
- Icons 可由 UI 包的图标组件统一处理（本包暂未内置）。
