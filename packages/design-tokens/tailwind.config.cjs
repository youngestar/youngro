// 开发期间优先使用 src 以实现 token 即时更新；如果失败则回退到 dist 以保证安全
let tokens;
try {
  tokens = require("./src/index");
} catch (e) {
  try {
    tokens = require("./dist/index.cjs");
  } catch (_) {
    tokens = {};
  }
}

module.exports = {
  // 使用 POSIX 风格的 glob 模式，避免 Windows 上的反斜杠路径意外匹配到 node_modules
  content: [
    // 仅扫描源码目录以避免匹配到 node_modules
    "../../apps/*/app/**/*.{js,ts,jsx,tsx,vue,html,mdx}",
    "../../apps/*/src/**/*.{js,ts,jsx,tsx,vue,html,mdx}",
    "../../packages/*/src/**/*.{js,ts,jsx,tsx,vue,html,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // 由变量驱动的颜色（可以通过 CSS 变量进行主题定制）
        primary: {
          DEFAULT: "hsl(var(--primary) / <alpha-value>)",
          50: "hsl(var(--primary-50) / <alpha-value>)",
          100: "hsl(var(--primary-100) / <alpha-value>)",
          150: "hsl(var(--primary-150) / <alpha-value>)",
          200: "hsl(var(--primary-200) / <alpha-value>)",
          250: "hsl(var(--primary-250) / <alpha-value>)",
          300: "hsl(var(--primary-300) / <alpha-value>)",
          350: "hsl(var(--primary-350) / <alpha-value>)",
          400: "hsl(var(--primary-400) / <alpha-value>)",
          450: "hsl(var(--primary-450) / <alpha-value>)",
          500: "hsl(var(--primary-500) / <alpha-value>)",
          550: "hsl(var(--primary-550) / <alpha-value>)",
          600: "hsl(var(--primary-600) / <alpha-value>)",
          650: "hsl(var(--primary-650) / <alpha-value>)",
          700: "hsl(var(--primary-700) / <alpha-value>)",
          750: "hsl(var(--primary-750) / <alpha-value>)",
          800: "hsl(var(--primary-800) / <alpha-value>)",
          850: "hsl(var(--primary-850) / <alpha-value>)",
          900: "hsl(var(--primary-900) / <alpha-value>)",
          950: "hsl(var(--primary-950) / <alpha-value>)",
        },
        "primary-foreground": "hsl(var(--primary-foreground) / <alpha-value>)",
        complementary: "hsl(var(--complementary) / <alpha-value>)",
        "complementary-foreground": "hsl(var(--complementary-foreground) / <alpha-value>)",
        background: "hsl(var(--background) / <alpha-value>)",
        foreground: "hsl(var(--foreground) / <alpha-value>)",
      },
      fontFamily: {
        // 优先使用来自 next/font 的 CSS 变量，降级使用命名字体族和系统字体栈
        sans: [
          "var(--font-sans)",
          // 当 sans 字体缺少字形时，降级使用 CJK 变量以实现东亚字形覆盖
          "var(--font-cjk)",
          tokens.fonts?.sans || "DM Sans",
          "ui-sans-serif",
          "system-ui",
        ],
        mono: [
          "var(--font-mono)",
          tokens.fonts?.mono || "Fira Code",
          "ui-monospace",
          "SFMono-Regular",
        ],
        cjk: [
          "var(--font-cjk)",
          tokens.fonts?.cjk || "Noto Sans CJK",
          "Noto Sans SC",
          "Noto Sans JP",
          "sans-serif",
        ],
      },
    },
  },
  // 引入 @tailwindcss/typography 及 @tailwindcss/forms 插件
  plugins: [require("@tailwindcss/typography"), require("@tailwindcss/forms")],
  safelist: tokens.safelistAllPrimaryBackgrounds ? tokens.safelistAllPrimaryBackgrounds() : [],
};
