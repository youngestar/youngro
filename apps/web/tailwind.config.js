/** @type {import('tailwindcss').Config} */
import { createRequire } from "module";
import path from "node:path";
import { fileURLToPath } from "node:url";
const require = createRequire(import.meta.url);
// Inherit shared design tokens Tailwind config (CJS) for theme/plugins
const shared = require("../../packages/design-tokens/tailwind.config.cjs");

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default {
  ...(shared || {}),
  content: [
    // Use absolute paths to avoid Windows backslash glob pitfalls
    path.join(__dirname, "app/**/*.{js,ts,jsx,tsx,mdx}"),
    path.join(__dirname, "src/**/*.{js,ts,jsx,tsx,mdx}"),
    path.join(__dirname, "../../packages/ui/src/**/*.{js,ts,jsx,tsx,mdx}"),
  ],
  // Unify dark mode behavior with shared config (prefer class)
  darkMode: "class",
  theme: {
    ...((shared && shared.theme) || {}),
    extend: {
      ...((shared && shared.theme && shared.theme.extend) || {}),
      // web-specific extensions can go here
    },
  },
  plugins: [
    ...((shared && shared.plugins) || []),
    // web-specific plugins can be appended here
  ],
};
