const path = require("path");
const tokens = require("./dist/index.cjs") || require("./src/index");

module.exports = {
  content: [
    path.join(__dirname, "../../apps/**/*.{js,ts,jsx,tsx,vue,html,mdx}"),
    path.join(__dirname, "../../packages/**/*.{js,ts,jsx,tsx,vue,html,mdx}"),
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // basic primary palette; projects can extend or replace
        primary: {
          50: `hsl(${tokens.chromaticHueDefault} 100% 97%)`,
          100: `hsl(${tokens.chromaticHueDefault} 95% 92%)`,
          200: `hsl(${tokens.chromaticHueDefault} 90% 84%)`,
          500: `hsl(${tokens.chromaticHueDefault} 70% 50%)`,
          700: `hsl(${tokens.chromaticHueDefault} 60% 30%)`,
        },
      },
      fontFamily: {
        sans: [tokens.fonts?.sans || "DM Sans", "ui-sans-serif", "system-ui"],
        mono: [
          tokens.fonts?.mono || "Fira Code",
          "ui-monospace",
          "SFMono-Regular",
        ],
        cjk: [tokens.fonts?.cjk || "Xiaolai", "Noto Sans CJK"],
      },
    },
  },
  plugins: [require("@tailwindcss/typography"), require("@tailwindcss/forms")],
  safelist: tokens.safelistAllPrimaryBackgrounds
    ? tokens.safelistAllPrimaryBackgrounds()
    : [],
};
