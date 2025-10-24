/** @type {import('tailwindcss').Config} */
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const shared = require("../design-tokens/tailwind.config.cjs");

export default {
  ...(shared || {}),
  // include only this package's own sources to avoid broad workspace scans
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  darkMode: "class",
  plugins: [...(shared.plugins || [])],
};
