import type { Processor, Plugin } from "unified";
import type { Root as MdastRoot } from "mdast";
import type { Root as HastRoot } from "hast";
import type { BundledLanguage } from "shiki";
import { rehypeWrapTables } from "./plugins/rehypeWrapTables";

const processorCache = new Map<string, Promise<Processor>>();
let fallbackProcessorPromise: Promise<Processor> | null = null;
let coreModulesPromise: Promise<MarkdownCoreModules> | null = null;
let rehypeShikiPromise: Promise<ShikiRehypePlugin> | null = null;
const langRegex = /```([\w-]+)(?=[\s]|$)/g;

interface MarkdownProcessorOptions {
  highlight?: boolean;
  langs?: BundledLanguage[];
}

interface MarkdownCoreModules {
  unified: typeof import("unified").unified;
  remarkParse: typeof import("remark-parse").default;
  remarkGfm: typeof import("remark-gfm").default;
  remarkMath: typeof import("remark-math").default;
  remarkRehype: typeof import("remark-rehype").default;
  rehypeKatex: typeof import("rehype-katex").default;
  rehypeStringify: typeof import("rehype-stringify").default;
}

type ShikiRehypePlugin = typeof import("@shikijs/rehype").default;

// Allow disabling Shiki highlighting during build/CI via env flag.
// Any of these env vars set to '1' will force the fallback pipeline:
// - DISABLE_SHIKI
// - NEXT_DISABLE_SHIKI
// - MARKDOWN_NO_SHIKI
const SHIKI_DISABLED =
  process.env.DISABLE_SHIKI === "1" ||
  process.env.NEXT_DISABLE_SHIKI === "1" ||
  process.env.MARKDOWN_NO_SHIKI === "1";

/** 从 Markdown 文本中提取所有 fenced code block 的语言集 */
function extractLangs(markdown: string): BundledLanguage[] {
  const matches = markdown.matchAll(langRegex);
  const langs = new Set<BundledLanguage>();
  for (const match of matches) {
    if (match[1]) langs.add(match[1].toLowerCase() as BundledLanguage);
  }
  return [...langs];
}

/** 懒加载 unified 核心生态及基础解析、GFM、公式插件 */
function loadCoreModules(): Promise<MarkdownCoreModules> {
  if (!coreModulesPromise) {
    coreModulesPromise = Promise.all([
      import("unified"),
      import("remark-parse").then((m) => m.default),
      import("remark-gfm").then((m) => m.default),
      import("remark-math").then((m) => m.default),
      import("remark-rehype").then((m) => m.default),
      import("rehype-katex").then((m) => m.default),
      import("rehype-stringify").then((m) => m.default),
    ]).then(
      ([
        unifiedModule,
        remarkParse,
        remarkGfm,
        remarkMath,
        remarkRehype,
        rehypeKatex,
        rehypeStringify,
      ]) => ({
        unified: unifiedModule.unified,
        remarkParse,
        remarkGfm,
        remarkMath,
        remarkRehype,
        rehypeKatex,
        rehypeStringify,
      })
    );
  }

  return coreModulesPromise;
}

/** 按需懒加载 Shiki 代码高亮插件 */
function loadRehypeShiki(): Promise<ShikiRehypePlugin> {
  if (!rehypeShikiPromise) {
    rehypeShikiPromise = import("@shikijs/rehype").then((m) => m.default);
  }

  return rehypeShikiPromise;
}

/** 构建并装配 unified Markdown 处理器流水线 */
async function createMarkdownProcessor({
  highlight = false,
  langs = [],
}: MarkdownProcessorOptions): Promise<Processor> {
  const core = await loadCoreModules();
  const remarkRehypePlugin = core.remarkRehype as unknown as Plugin<[], MdastRoot, HastRoot>;

  const processor = core
    .unified()
    .use(core.remarkParse)
    .use(core.remarkGfm)
    .use(core.remarkMath)
    .use(remarkRehypePlugin)
    .use([core.rehypeKatex])
    .use(rehypeWrapTables);

  if (highlight) {
    const rehypeShiki = await loadRehypeShiki();
    const rehypeShikiPlugin = rehypeShiki as unknown as Plugin<
      [
        {
          themes: { light: string; dark: string };
          langs: BundledLanguage[];
          defaultLanguage: BundledLanguage;
        },
      ],
      HastRoot,
      HastRoot
    >;

    processor.use([
      [
        rehypeShikiPlugin,
        {
          themes: {
            light: "github-light",
            dark: "github-dark",
          },
          langs,
          defaultLanguage: langs[0] || "javascript",
        },
      ],
    ]);
  }

  return processor.use([core.rehypeStringify]);
}

/** 缓存并获取按需包含特定高亮语言的 Processor 实例 */
function getProcessor(langs: BundledLanguage[]): Promise<Processor> {
  const cacheKey = [...langs].sort().join(",");
  if (!processorCache.has(cacheKey)) {
    const processorPromise = createMarkdownProcessor({
      highlight: true,
      langs,
    });
    processorCache.set(cacheKey, processorPromise);
  }
  return processorCache.get(cacheKey)!;
}

/** 创建不包含高亮插件的降级 Processor */
async function createFallbackProcessor(): Promise<Processor> {
  return createMarkdownProcessor({ highlight: false });
}

/** 缓存并获取单例降级 Processor (无代码高亮) */
function getFallbackProcessor(): Promise<Processor> {
  if (!fallbackProcessorPromise) {
    fallbackProcessorPromise = createFallbackProcessor();
  }
  return fallbackProcessorPromise;
}

/**
 * 异步处理 Markdown 到 HTML 字符串的主入口
 * 根据内容自动判断是否加载高亮模块，并处理异常降级
 */
export async function processMarkdown(markdown: string): Promise<string> {
  try {
    // 检查环境变量
    if (SHIKI_DISABLED) {
      const fb = await getFallbackProcessor();
      const result = await fb.process(markdown);
      return result.toString();
    }

    // 检查是否含代码块
    if (!/`{3,}/.test(markdown)) {
      const fb = await getFallbackProcessor();
      const result = await fb.process(markdown);
      return result.toString();
    }

    const langs = extractLangs(markdown);
    const languagesToLoad = Array.from(new Set(langs));

    const processor = await getProcessor(languagesToLoad);
    const result = await processor.process(markdown);
    return result.toString();
  } catch (err) {
    // fallback to simpler pipeline
    void err;
    const fb = await getFallbackProcessor();
    const result = await fb.process(markdown);
    return result.toString();
  }
}

/** 提供基础内容的快捷同步渲染接口 (强制跳过高亮等异步流程) */
export async function processStreamingMarkdown(markdown: string): Promise<string> {
  const fb = await getFallbackProcessor();
  const result = await fb.process(markdown);
  return result.toString();
}
