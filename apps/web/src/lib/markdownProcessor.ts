import type { Processor, Plugin } from "unified";
import type { Root as MdastRoot } from "mdast";
import type { Root as HastRoot } from "hast";
import type { BundledLanguage } from "shiki";

const processorCache = new Map<string, Promise<Processor>>();
let cachedFallbackProcessor: Promise<Processor> | null = null;
let cachedLiteProcessor: Promise<Processor> | null = null;
const langRegex = /```(.{2,})\s/g;

function extractLangs(markdown: string): BundledLanguage[] {
  const matches = markdown.matchAll(langRegex);
  const langs = new Set<BundledLanguage>();
  langs.add("python");
  for (const match of matches) {
    if (match[1]) langs.add(match[1] as BundledLanguage);
  }
  return [...langs];
}

async function createProcessor(langs: BundledLanguage[]): Promise<Processor> {
  // dynamic import heavy deps so they don't affect cold start
  const [
    unifiedModule,
    remarkParse,
    remarkMath,
    remarkRehype,
    rehypeKatex,
    rehypeShiki,
    rehypeStringify,
  ] = await Promise.all([
    import("unified"),
    import("remark-parse").then((m) => m.default),
    import("remark-math").then((m) => m.default),
    import("remark-rehype").then((m) => m.default),
    import("rehype-katex").then((m) => m.default),
    import("@shikijs/rehype").then((m) => m.default),
    import("rehype-stringify").then((m) => m.default),
  ]);

  const options = {
    themes: {
      light: "github-light",
      dark: "github-dark",
    },
    langs,
    defaultLanguage: langs[0] || "javascript",
  };

  const { unified } = unifiedModule;
  const remarkRehypePlugin = remarkRehype as unknown as Plugin<
    [],
    MdastRoot,
    HastRoot
  >;
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

  return unified()
    .use(remarkParse)
    .use(remarkMath)
    .use(remarkRehypePlugin)
    .use([rehypeKatex])
    .use([[rehypeShikiPlugin, options]])
    .use([rehypeStringify]);
}

function getProcessor(langs: BundledLanguage[]): Promise<Processor> {
  const cacheKey = [...langs].sort().join(",");
  if (!processorCache.has(cacheKey)) {
    const processorPromise = createProcessor(langs);
    processorCache.set(cacheKey, processorPromise);
  }
  return processorCache.get(cacheKey)!;
}

const fallback = async () => {
  if (!cachedFallbackProcessor) {
    cachedFallbackProcessor = (async () => {
      const { unified } = await import("unified");
      const remarkParse = (await import("remark-parse")).default;
      const remarkMath = (await import("remark-math")).default;
      const remarkRehype = (await import("remark-rehype")).default;
      const rehypeKatex = (await import("rehype-katex")).default;
      const rehypeStringify = (await import("rehype-stringify")).default;

      const remarkRehypePlugin = remarkRehype as unknown as Plugin<
        [],
        MdastRoot,
        HastRoot
      >;
      return unified()
        .use(remarkParse)
        .use(remarkMath)
        .use(remarkRehypePlugin)
        .use([rehypeKatex])
        .use([rehypeStringify]);
    })();
  }
  return cachedFallbackProcessor;
};

// 轻量 processor：不做 KaTeX/Shiki，用于流式期间的降级渲染以减少频繁重排
const lite = async () => {
  if (!cachedLiteProcessor) {
    cachedLiteProcessor = (async () => {
      const { unified } = await import("unified");
      const remarkParse = (await import("remark-parse")).default;
      const remarkRehype = (await import("remark-rehype")).default;
      const rehypeStringify = (await import("rehype-stringify")).default;
      const remarkRehypePlugin = remarkRehype as unknown as Plugin<
        [],
        MdastRoot,
        HastRoot
      >;
      return unified()
        .use(remarkParse)
        .use(remarkRehypePlugin)
        .use([rehypeStringify]);
    })();
  }
  return cachedLiteProcessor;
};

export async function processMarkdown(markdown: string): Promise<string> {
  try {
    // fast path when there are no fences
    if (!/`{3,}/.test(markdown)) {
      const fb = await fallback();
      return fb.processSync(markdown).toString();
    }

    const langs = extractLangs(markdown);
    const langSet = new Set(langs);
    langSet.add("python");
    const languagesToLoad = Array.from(langSet);

    const processor = await getProcessor(languagesToLoad);
    const result = await processor.process(markdown);
    return result.toString();
  } catch (err) {
    // fallback to simpler pipeline
    void err;
    const fb = await fallback();
    return fb.processSync(markdown).toString();
  }
}

export async function processMarkdownSync(markdown: string): Promise<string> {
  // We can't synchronously run the shiki pipeline here reliably since shiki is async;
  // use a simple fallback synchronous pipeline by calling unified sync processors.
  const fb = await fallback();
  return fb.processSync(markdown).toString();
}

export async function processMarkdownLite(markdown: string): Promise<string> {
  // 不做 KaTeX/Shiki 的轻量通路，适合流式更新期间降低抖动
  const lp = await lite();
  // lite 管线都为 sync-capable 处理器
  return lp.processSync(markdown).toString();
}
