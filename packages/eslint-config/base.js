import js from "@eslint/js";
import eslintConfigPrettier from "eslint-config-prettier";
import turboPlugin from "eslint-plugin-turbo";
import tseslint from "typescript-eslint";
import onlyWarn from "eslint-plugin-only-warn";
import jsxA11y from "eslint-plugin-jsx-a11y";

/**
 * A shared ESLint configuration for the repository.
 *
 * @type {import("eslint").Linter.Config[]}
 * */
export const config = [
  js.configs.recommended,
  eslintConfigPrettier,
  ...tseslint.configs.recommended,
  {
    plugins: {
      turbo: turboPlugin,
    },
    rules: {
      "turbo/no-undeclared-env-vars": "warn",
    },
  },
  // Accessibility and icon usage conventions
  {
    plugins: {
      "jsx-a11y": jsxA11y,
    },
    rules: {
      // Ensure <img> (and other elements) have alt text when necessary
      "jsx-a11y/alt-text": "error",
      // Disallow using next/image for SVG icons; prefer <img> for brand or <Icon> for system icons
      "no-restricted-syntax": [
        "error",
        {
          selector:
            "JSXOpeningElement[name.name='Image'] > JSXAttribute[name.name='src'] > Literal[value=/\\.svg$/]",
          message:
            "Do not use next/image for SVG. Use <Icon> for system icons or <img>/BrandLogo for brand assets.",
        },
      ],
    },
  },
  {
    plugins: {
      onlyWarn,
    },
  },
  {
    ignores: [
      "dist/**",
      ".next/**",
      ".turbo/**",
      "**/next-env.d.ts",
      "**/tailwind.config.*",
      "**/postcss.config.*",
    ],
  },
];
