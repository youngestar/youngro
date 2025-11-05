import js from "@eslint/js";
import eslintConfigPrettier from "eslint-config-prettier";
import turboPlugin from "eslint-plugin-turbo";
import tseslint from "typescript-eslint";
import onlyWarn from "eslint-plugin-only-warn";
import jsxA11y from "eslint-plugin-jsx-a11y";
import boundaries from "eslint-plugin-boundaries";
import importPlugin from "eslint-plugin-import";

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
  // Dependency boundaries and import hygiene
  {
    plugins: {
      boundaries,
      import: importPlugin,
    },
    settings: {
      "boundaries/elements": [
        { type: "lib", pattern: "packages/lib-*/**" },
        { type: "store", pattern: "packages/store-*/**" },
        { type: "feature", pattern: "packages/feature-*/**" },
        { type: "ui", pattern: "packages/ui/**" },
        { type: "app", pattern: "apps/**" },
      ],
      "import/resolver": {
        node: { extensions: [".js", ".jsx", ".ts", ".tsx", ".mjs"] },
        typescript: { alwaysTryTypes: true },
      },
    },
    rules: {
      // 方向：lib → store → feature → ui → app
      "boundaries/element-types": [
        "warn",
        {
          default: "disallow",
          rules: [
            { from: "app", allow: ["ui", "feature", "store", "lib"] },
            { from: "ui", allow: ["lib"] },
            { from: "feature", allow: ["ui", "store", "lib"] },
            { from: "store", allow: ["lib"] },
            { from: "lib", allow: [] },
          ],
        },
      ],

      // 禁止跨包相对路径
      "import/no-relative-packages": "warn",

      // 禁止跨包深层导入（针对其他包暴露 src/dist 的不规范用法）
      // 注意：不影响包内相对路径导入
      "no-restricted-imports": [
        "warn",
        {
          patterns: [
            {
              group: [
                "@youngro/**/src/**",
                "@youngro/**/dist/**",
                "@repo/**/src/**",
                "@repo/**/dist/**",
              ],
              message: "只允许通过包入口导入（避免直接引用他包的 src/dist）",
            },
          ],
        },
      ],

      // 循环依赖提示
      "import/no-cycle": ["warn", { maxDepth: 1 }],

      // 依赖需在 package.json 声明
      "import/no-extraneous-dependencies": ["warn", { packageDir: ["."] }],
    },
  },
  // 针对各类配置文件的宽松规则（允许内部模块导入）
  {
    files: [
      "**/*eslint.config.*",
      "**/*tailwind*.config.*",
      "**/*tsup*.config.*",
      "**/*vite*.config.*",
      "**/*next*.config.*",
      "**/*postcss*.config.*",
    ],
    rules: {
      "no-restricted-imports": "off",
      "import/no-cycle": "off",
      "boundaries/element-types": "off",
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
