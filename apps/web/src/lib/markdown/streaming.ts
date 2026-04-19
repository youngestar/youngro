import { processStreamingMarkdown } from "./processor";

export interface TextStreamSlice {
  type: "text";
  text: string;
}

export type SplitReason =
  | "blank-line"
  | "blockquote"
  | "closed-display-math"
  | "closed-fence"
  | "heading"
  | "list"
  | "thematic-break";

export type BlockKind =
  | "blockquote"
  | "code-fence"
  | "display-math"
  | "heading"
  | "list"
  | "paragraph"
  | "thematic-break";

export interface RenderedMarkdownBlock {
  endOffset: number;
  id: string;
  kind: BlockKind;
  reason: SplitReason;
  source: string;
  startOffset: number;
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

export interface FinalizedMarkdownSegment {
  endOffset: number;
  kind: BlockKind;
  reason: SplitReason;
  source: string;
  startOffset: number;
}

interface SplitBlocksResult {
  finalizedSegments: FinalizedMarkdownSegment[];
  remainingTailSource: string;
}

interface MarkdownBlockScanState {
  fenceMarker: "```" | "~~~" | null;
  inDisplayMath: boolean;
  openSimpleBlock: { kind: "blockquote" } | { kind: "list"; listKind: "bullet" | "ordered" } | null;
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

function isBlankLine(line: string) {
  return line.trim() === "";
}

function stripTrailingNewline(line: string) {
  return line.endsWith("\n") ? line.slice(0, -1) : line;
}

function isAtxHeadingLine(line: string) {
  return /^ {0,3}#{1,6}(?:\s|$)/.test(stripTrailingNewline(line));
}

function isThematicBreakLine(line: string) {
  return /^ {0,3}(?:(?:-\s*){3,}|(?:_\s*){3,}|(?:\*\s*){3,})$/.test(stripTrailingNewline(line));
}

function isBlockquoteLine(line: string) {
  return /^ {0,3}> ?/.test(stripTrailingNewline(line));
}

function getSimpleListKind(line: string): "bullet" | "ordered" | null {
  const normalized = stripTrailingNewline(line);

  if (/^ {0,3}[*+-] +/.test(normalized)) return "bullet";
  if (/^ {0,3}\d+[.)] +/.test(normalized)) return "ordered";

  return null;
}

function splitIntoLines(source: string) {
  const lines: Array<{ end: number; start: number; text: string }> = [];
  let start = 0;

  for (let index = 0; index < source.length; index += 1) {
    if (source[index] !== "\n") continue;

    const end = index + 1;
    lines.push({ end, start, text: source.slice(start, end) });
    start = end;
  }

  if (start < source.length) {
    lines.push({ end: source.length, start, text: source.slice(start) });
  }

  return lines;
}

function isLineTerminated(line: string) {
  return line.endsWith("\n");
}

function inferBlockKind(source: string, reason: SplitReason): BlockKind {
  if (reason === "blockquote") return "blockquote";
  if (reason === "closed-fence") return "code-fence";
  if (reason === "closed-display-math") return "display-math";
  if (reason === "heading" || isAtxHeadingLine(source)) return "heading";
  if (reason === "list") return "list";
  if (reason === "thematic-break" || isThematicBreakLine(source)) return "thematic-break";
  return "paragraph";
}

export function splitStableMarkdownBlocks(source: string): SplitBlocksResult {
  if (!source) {
    return {
      finalizedSegments: [],
      remainingTailSource: "",
    };
  }

  const finalizedSegments: FinalizedMarkdownSegment[] = [];
  const lines = splitIntoLines(source);
  const scanState: MarkdownBlockScanState = {
    fenceMarker: null,
    inDisplayMath: false,
    openSimpleBlock: null,
  };

  let blockStart = 0;

  const pushSegment = (
    startOffset: number,
    endOffset: number,
    reason: SplitReason,
    kind?: BlockKind
  ) => {
    const candidate = source.slice(startOffset, endOffset);
    if (!candidate.trim()) {
      return;
    }

    finalizedSegments.push({
      endOffset,
      kind: kind ?? inferBlockKind(candidate, reason),
      reason,
      source: candidate,
      startOffset,
    });
  };

  for (const line of lines) {
    const trimmed = line.text.trim();
    let closedSpecialBlock = false;
    let closingReason: SplitReason | null = null;

    if (scanState.fenceMarker) {
      if (isFenceCloseLine(line.text, scanState.fenceMarker)) {
        scanState.fenceMarker = null;
        closedSpecialBlock = true;
        closingReason = "closed-fence";
      }
    } else if (scanState.inDisplayMath) {
      if (trimmed === "$$") {
        scanState.inDisplayMath = false;
        closedSpecialBlock = true;
        closingReason = "closed-display-math";
      }
    } else {
      const blockquoteLine = isBlockquoteLine(line.text);
      const listKind = getSimpleListKind(line.text);

      if (scanState.openSimpleBlock) {
        const continuesBlockquote =
          scanState.openSimpleBlock.kind === "blockquote" && blockquoteLine;
        const continuesList =
          scanState.openSimpleBlock.kind === "list" &&
          listKind !== null &&
          scanState.openSimpleBlock.listKind === listKind;

        if (!(continuesBlockquote || continuesList)) {
          pushSegment(
            blockStart,
            line.start,
            scanState.openSimpleBlock.kind === "blockquote" ? "blockquote" : "list",
            scanState.openSimpleBlock.kind
          );
          blockStart = line.start;
          scanState.openSimpleBlock = null;
        }
      }

      if (isAtxHeadingLine(line.text)) {
        if (line.start > blockStart) {
          pushSegment(blockStart, line.start, "heading", "paragraph");
        }

        // Do not freeze the current heading line until it has actually ended.
        // During streaming, a partial line like `#` or `# Tit` can still grow.
        if (isLineTerminated(line.text)) {
          pushSegment(line.start, line.end, "heading", "heading");
          blockStart = line.end;
        } else {
          blockStart = line.start;
        }
        continue;
      }

      if (isThematicBreakLine(line.text)) {
        if (line.start > blockStart) {
          pushSegment(blockStart, line.start, "thematic-break", "paragraph");
        }

        // Keep an unterminated last line in the active tail so it can still
        // evolve into another structure before the newline arrives.
        if (isLineTerminated(line.text)) {
          pushSegment(line.start, line.end, "thematic-break", "thematic-break");
          blockStart = line.end;
        } else {
          blockStart = line.start;
        }
        continue;
      }

      if (blockquoteLine) {
        if (!scanState.openSimpleBlock) {
          if (line.start > blockStart) {
            pushSegment(blockStart, line.start, "blockquote", "paragraph");
          }
          blockStart = line.start;
          scanState.openSimpleBlock = { kind: "blockquote" };
        }
        continue;
      }

      if (listKind) {
        if (!scanState.openSimpleBlock) {
          if (line.start > blockStart) {
            pushSegment(blockStart, line.start, "list", "paragraph");
          }
          blockStart = line.start;
          scanState.openSimpleBlock = { kind: "list", listKind };
        }
        continue;
      }

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

    if (closedSpecialBlock && closingReason) {
      pushSegment(blockStart, line.end, closingReason);
      blockStart = line.end;
      continue;
    }

    if (isBlankLine(line.text)) {
      pushSegment(blockStart, line.end, "blank-line");
      blockStart = line.end;
    }
  }

  return {
    finalizedSegments,
    remainingTailSource: source.slice(blockStart),
  };
}

function createBlockId(startOffset: number, endOffset: number) {
  return `block-${startOffset}-${endOffset}`;
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
  const { finalizedSegments, remainingTailSource } = splitStableMarkdownBlocks(combinedTailSource);

  const finalizedBlocks: RenderedMarkdownBlock[] = [...prev.finalizedBlocks];
  const tailBaseOffset = prev.consumedTextLength - prev.activeTailSource.length;

  for (const segment of finalizedSegments) {
    try {
      finalizedBlocks.push({
        endOffset: tailBaseOffset + segment.endOffset,
        id: createBlockId(tailBaseOffset + segment.startOffset, tailBaseOffset + segment.endOffset),
        kind: segment.kind,
        reason: segment.reason,
        source: segment.source,
        startOffset: tailBaseOffset + segment.startOffset,
        html: await renderStreamingBlock(segment.source),
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
