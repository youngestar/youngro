import antfu from "@antfu/eslint-config";

export default antfu({
  react: true, // 打开 react 规则
  typescript: true, // 打开 ts 规则
  tailwind: true, // 打开 tailwind 规则
  formatters: {
    css: true,
    html: true,
    md: true,
  },
});
