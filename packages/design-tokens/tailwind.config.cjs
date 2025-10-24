const tokens = require("./dist/index.cjs") || require("./src/index");

module.exports = {
  // Use POSIX-style globs to avoid backslash patterns on Windows which can accidentally match node_modules
  content: [
    // Scan only source folders to avoid node_modules
    "../../apps/**/app/**/*.{js,ts,jsx,tsx,vue,html,mdx}",
    "../../apps/**/src/**/*.{js,ts,jsx,tsx,vue,html,mdx}",
    "../../packages/**/src/**/*.{js,ts,jsx,tsx,vue,html,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // Variable-driven colors (can be themed via CSS variables)
        primary: {
          DEFAULT: "hsl(var(--primary) / <alpha-value>)",
          50: "hsl(var(--primary-50) / <alpha-value>)",
          100: "hsl(var(--primary-100) / <alpha-value>)",
          200: "hsl(var(--primary-200) / <alpha-value>)",
          300: "hsl(var(--primary-300) / <alpha-value>)",
          400: "hsl(var(--primary-400) / <alpha-value>)",
          500: "hsl(var(--primary-500) / <alpha-value>)",
          600: "hsl(var(--primary-600) / <alpha-value>)",
          700: "hsl(var(--primary-700) / <alpha-value>)",
          800: "hsl(var(--primary-800) / <alpha-value>)",
          900: "hsl(var(--primary-900) / <alpha-value>)",
          950: "hsl(var(--primary-950) / <alpha-value>)",
        },
        "primary-foreground": "hsl(var(--primary-foreground) / <alpha-value>)",
        complementary: "hsl(var(--complementary) / <alpha-value>)",
        "complementary-foreground":
          "hsl(var(--complementary-foreground) / <alpha-value>)",
        background: "hsl(var(--background) / <alpha-value>)",
        foreground: "hsl(var(--foreground) / <alpha-value>)",
      },
      fontFamily: {
        // Prefer CSS variable from next/font, fallback to named families and system stack
        sans: [
          "var(--font-sans)",
          // Fallback to CJK variable for East Asian glyph coverage when sans lacks glyphs
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
  plugins: [require("@tailwindcss/typography"), require("@tailwindcss/forms")],
  safelist: tokens.safelistAllPrimaryBackgrounds
    ? tokens.safelistAllPrimaryBackgrounds()
    : [],
};
