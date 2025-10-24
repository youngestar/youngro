/** @type {import('tailwindcss').Config} */
const shared = require("../../packages/design-tokens/tailwind.config.cjs");

module.exports = {
  ...shared,
  // web-specific content (if any) can be appended here
  content: [
    ...shared.content,
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  // web prefers class-based dark mode
  darkMode: "class",
  plugins: [...(shared.plugins || [])],
};
