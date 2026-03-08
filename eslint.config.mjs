import { config as baseConfig } from "@youngro/eslint-config/base";

export default [
  ...baseConfig,
  {
    ignores: ["**/dist/**", "**/node_modules/**", "**/.next/**", "**/.turbo/**", "**/coverage/**"],
  },
];
