import type { Processor, Plugin } from "unified";
import type { Root as MdastRoot } from "mdast";
import type { Root as HastRoot } from "hast";
import type { BundledLanguage } from "shiki";

const processorCache = new Map<string, Promise<Processor>>();
let fallbackProcessorPromise: Promise<Processor> | null = null;
let coreModulesPromise: Promise<MarkdownCoreModules> | null = null;
let rehypeShikiPromise: Promise<ShikiRehypePlugin> | null = null;
const langRegex = /```(.{2,})\s/g;

interface MarkdownProcessorOptions {
  highlight?: boolean;
  langs?: BundledLanguage[];
}

interface MarkdownCoreModules {
  unified: typeof import("unified").unified;
  remarkParse: typeof import("remark-parse").default;
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

function extractLangs(markdown: string): BundledLanguage[] {
  const matches = markdown.matchAll(langRegex);
  const langs = new Set<BundledLanguage>();
  langs.add("python");
  for (const match of matches) {
    if (match[1]) langs.add(match[1] as BundledLanguage);
  }
  return [...langs];
}

function loadCoreModules(): Promise<MarkdownCoreModules> {
  if (!coreModulesPromise) {
    coreModulesPromise = Promise.all([
      import("unified"),
      import("remark-parse").then((m) => m.default),
      import("remark-math").then((m) => m.default),
      import("remark-rehype").then((m) => m.default),
      import("rehype-katex").then((m) => m.default),
      import("rehype-stringify").then((m) => m.default),
    ]).then(
      ([unifiedModule, remarkParse, remarkMath, remarkRehype, rehypeKatex, rehypeStringify]) => ({
        unified: unifiedModule.unified,
        remarkParse,
        remarkMath,
        remarkRehype,
        rehypeKatex,
        rehypeStringify,
      })
    );
  }

  return coreModulesPromise;
}

function loadRehypeShiki(): Promise<ShikiRehypePlugin> {
  if (!rehypeShikiPromise) {
    rehypeShikiPromise = import("@shikijs/rehype").then((m) => m.default);
  }

  return rehypeShikiPromise;
}

async function createMarkdownProcessor({
  highlight = false,
  langs = [],
}: MarkdownProcessorOptions): Promise<Processor> {
  const core = await loadCoreModules();
  const remarkRehypePlugin = core.remarkRehype as unknown as Plugin<[], MdastRoot, HastRoot>;

  const processor = core
    .unified()
    .use(core.remarkParse)
    .use(core.remarkMath)
    .use(remarkRehypePlugin)
    .use([core.rehypeKatex]);

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

async function createFallbackProcessor(): Promise<Processor> {
  return createMarkdownProcessor({ highlight: false });
}

function getFallbackProcessor(): Promise<Processor> {
  if (!fallbackProcessorPromise) {
    fallbackProcessorPromise = createFallbackProcessor();
  }
  return fallbackProcessorPromise;
}

export async function processMarkdown(markdown: string): Promise<string> {
  try {
    // If Shiki is disabled via env, always use fallback (no syntax highlighting).
    if (SHIKI_DISABLED) {
      const fb = await getFallbackProcessor();
      return fb.processSync(markdown).toString();
    }

    // fast path when there are no fences
    if (!/`{3,}/.test(markdown)) {
      const fb = await getFallbackProcessor();
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
    const fb = await getFallbackProcessor();
    return fb.processSync(markdown).toString();
  }
}

export async function processMarkdownSync(markdown: string): Promise<string> {
  // We can't synchronously run the shiki pipeline here reliably since shiki is async;
  // use a simple fallback synchronous pipeline by calling unified sync processors.
  const fb = await getFallbackProcessor();
  return fb.processSync(markdown).toString();
}
