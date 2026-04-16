import { processStreamingMarkdown } from "./processor";

export interface TextStreamSlice {
  type: "text";
  text: string;
}

export interface RenderedMarkdownBlock {
  id: string;
  source: string;
  html: string;
}

export interface StreamingMarkdownState {
  consumedSliceCount: number;
  consumedTextLength: number;
  finalizedBlocks: RenderedMarkdownBlock[];
  activeTailSource: string;
  activeTailHtml: string | null;
}

export interface AdvanceStreamingMarkdownResult {
  mode: "incremental" | "fallback-full";
  state: StreamingMarkdownState;
}

interface SplitBlocksResult {
  finalizedSources: string[];
  remainingTailSource: string;
}

interface MarkdownBlockScanState {
  fenceMarker: "```" | "~~~" | null;
  inDisplayMath: boolean;
}

export function createInitialStreamingMarkdownState(): StreamingMarkdownState {
  return {
    consumedSliceCount: 0,
    consumedTextLength: 0,
    finalizedBlocks: [],
    activeTailSource: "",
    activeTailHtml: null,
  };
}

export function canAdvanceIncrementally(
  prev: StreamingMarkdownState,
  fullContent: string,
  slices: TextStreamSlice[]
): boolean {
  return slices.length >= prev.consumedSliceCount && fullContent.length >= prev.consumedTextLength;
}

function getFenceMarker(line: string): "```" | "~~~" | null {
  const trimmed = line.trimStart();

  if (/^```+/.test(trimmed)) return "```";
  if (/^~~~+/.test(trimmed)) return "~~~";

  return null;
}

function isFenceCloseLine(line: string, fenceMarker: "```" | "~~~") {
  return line.trimStart().startsWith(fenceMarker);
}

function splitIntoLines(source: string) {
  const lines: Array<{ end: number; text: string }> = [];
  let start = 0;

  for (let index = 0; index < source.length; index += 1) {
    if (source[index] !== "\n") continue;

    const end = index + 1;
    lines.push({ end, text: source.slice(start, end) });
    start = end;
  }

  if (start < source.length) {
    lines.push({ end: source.length, text: source.slice(start) });
  }

  return lines;
}

export function splitStableMarkdownBlocks(source: string): SplitBlocksResult {
  if (!source) {
    return {
      finalizedSources: [],
      remainingTailSource: "",
    };
  }

  const finalizedSources: string[] = [];
  const lines = splitIntoLines(source);
  const scanState: MarkdownBlockScanState = {
    fenceMarker: null,
    inDisplayMath: false,
  };

  let blockStart = 0;

  for (const line of lines) {
    const trimmed = line.text.trim();
    let closedSpecialBlock = false;

    if (scanState.fenceMarker) {
      if (isFenceCloseLine(line.text, scanState.fenceMarker)) {
        scanState.fenceMarker = null;
        closedSpecialBlock = true;
      }
    } else if (scanState.inDisplayMath) {
      if (trimmed === "$$") {
        scanState.inDisplayMath = false;
        closedSpecialBlock = true;
      }
    } else {
      const fenceMarker = getFenceMarker(line.text);
      if (fenceMarker) {
        scanState.fenceMarker = fenceMarker;
      } else if (trimmed === "$$") {
        scanState.inDisplayMath = true;
      }
    }

    const outsideSpecialBlock = !scanState.fenceMarker && !scanState.inDisplayMath;
    if (!outsideSpecialBlock) {
      continue;
    }

    if (closedSpecialBlock || trimmed === "") {
      const candidate = source.slice(blockStart, line.end);
      if (candidate.trim()) {
        finalizedSources.push(candidate);
      }
      blockStart = line.end;
    }
  }

  return {
    finalizedSources,
    remainingTailSource: source.slice(blockStart),
  };
}

function createBlockId(index: number) {
  return `block-${index}`;
}

async function renderStreamingBlock(source: string) {
  return processStreamingMarkdown(source);
}

async function renderStreamingTail(source: string) {
  if (!source) return null;

  try {
    return await processStreamingMarkdown(source);
  } catch {
    return null;
  }
}

export async function advanceStreamingMarkdownState(
  prev: StreamingMarkdownState,
  fullContent: string,
  slices: TextStreamSlice[]
): Promise<AdvanceStreamingMarkdownResult> {
  if (!canAdvanceIncrementally(prev, fullContent, slices)) {
    return {
      mode: "fallback-full",
      state: prev,
    };
  }

  const appendedText = fullContent.slice(prev.consumedTextLength);

  if (!appendedText) {
    return {
      mode: "incremental",
      state: prev,
    };
  }

  const combinedTailSource = `${prev.activeTailSource}${appendedText}`;
  const { finalizedSources, remainingTailSource } = splitStableMarkdownBlocks(combinedTailSource);

  const finalizedBlocks: RenderedMarkdownBlock[] = [...prev.finalizedBlocks];

  for (const sourceFragment of finalizedSources) {
    try {
      finalizedBlocks.push({
        id: createBlockId(finalizedBlocks.length),
        source: sourceFragment,
        html: await renderStreamingBlock(sourceFragment),
      });
    } catch {
      return {
        mode: "fallback-full",
        state: prev,
      };
    }
  }

  return {
    mode: "incremental",
    state: {
      consumedSliceCount: slices.length,
      consumedTextLength: fullContent.length,
      finalizedBlocks,
      activeTailSource: remainingTailSource,
      activeTailHtml: await renderStreamingTail(remainingTailSource),
    },
  };
}
