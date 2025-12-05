import type { ReaderLike } from "clustr";
import { readGraphemeClusters } from "clustr";

// Special markers injected by the chat streaming pipeline to control TTS playback.
export const TTS_FLUSH_INSTRUCTION = "\u200B";
export const TTS_SPECIAL_TOKEN = "\u2063";

const keptPunctuations = new Set(["?", "？", "!", "！"]);
const hardPunctuations = new Set([
  ".",
  "。",
  "?",
  "？",
  "!",
  "！",
  "…",
  "⋯",
  "～",
  "~",
  "\n",
  "\t",
  "\r",
]);
const softPunctuations = new Set([
  ",",
  "，",
  "、",
  "–",
  "—",
  ":",
  "：",
  ";",
  "；",
  "《",
  "》",
  "「",
  "」",
]);

export interface TTSInputChunk {
  text: string;
  words: number;
  reason: "boost" | "limit" | "hard" | "flush" | "special";
}

export interface TTSInputChunkOptions {
  boost?: number;
  minimumWords?: number;
  maximumWords?: number;
}

export interface TTSChunkItem {
  chunk: string;
  special: string | null;
}

function createReaderFromString(
  input: string
): ReadableStreamDefaultReader<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(encoder.encode(input));
      controller.close();
    },
  }).getReader();
}

export async function* chunkTTSInput(
  input: string | ReaderLike,
  options?: TTSInputChunkOptions
): AsyncGenerator<TTSInputChunk, void, unknown> {
  const { boost = 2, minimumWords = 4, maximumWords = 12 } = options ?? {};

  const iterator = readGraphemeClusters(
    typeof input === "string" ? createReaderFromString(input) : input
  );

  const segmenter = new Intl.Segmenter(undefined, { granularity: "word" });

  let yieldCount = 0;
  let buffer = "";
  let chunk = "";
  let chunkWordsCount = 0;

  let previousValue: string | undefined;
  let current = await iterator.next();

  while (!current.done) {
    let value = current.value;

    if (value.length > 1) {
      previousValue = value;
      current = await iterator.next();
      continue;
    }

    const flush = value === TTS_FLUSH_INSTRUCTION;
    const special = value === TTS_SPECIAL_TOKEN;
    const hard = hardPunctuations.has(value);
    const soft = softPunctuations.has(value);
    const kept = keptPunctuations.has(value);
    let next: IteratorResult<string, unknown> | undefined;
    let afterNext: IteratorResult<string, unknown> | undefined;

    if (flush || special || hard || soft) {
      switch (value) {
        case ".":
        case ",": {
          if (previousValue !== undefined && /\d/.test(previousValue)) {
            next = await iterator.next();
            if (!next.done && next.value && /\d/.test(next.value)) {
              buffer += value;
              current = next;
              next = undefined;
              continue;
            }
          } else if (value === ".") {
            next = await iterator.next();
            if (!next.done && next.value && next.value === ".") {
              afterNext = await iterator.next();
              if (
                !afterNext.done &&
                afterNext.value &&
                afterNext.value === "."
              ) {
                value = "…";
                next = undefined;
                afterNext = undefined;
              }
            }
          }
          break;
        }
        default:
      }

      if (buffer.length === 0) {
        if (special) {
          yield {
            text: "",
            words: 0,
            reason: "special",
          };
          yieldCount += 1;
          chunkWordsCount = 0;
        }

        previousValue = value;
        current = await iterator.next();
        continue;
      }

      const words = [...segmenter.segment(buffer)].filter((w) => w.isWordLike);

      if (
        chunkWordsCount > minimumWords &&
        chunkWordsCount + words.length > maximumWords
      ) {
        const text = kept ? chunk.trim() + value : chunk.trim();
        yield {
          text,
          words: chunkWordsCount,
          reason: "limit",
        };
        yieldCount += 1;
        chunk = "";
        chunkWordsCount = 0;
      }

      chunk += buffer + value;
      chunkWordsCount += words.length;
      buffer = "";

      if (special) {
        const text = chunk.slice(0, -1).trim();
        yield {
          text,
          words: chunkWordsCount,
          reason: "special",
        };
        yieldCount += 1;
        chunk = "";
        chunkWordsCount = 0;
      } else if (
        flush ||
        hard ||
        chunkWordsCount > maximumWords ||
        yieldCount < boost
      ) {
        const text = chunk.trim();
        yield {
          text,
          words: chunkWordsCount,
          reason: flush
            ? "flush"
            : hard
              ? "hard"
              : chunkWordsCount > maximumWords
                ? "limit"
                : "boost",
        };
        yieldCount += 1;
        chunk = "";
        chunkWordsCount = 0;
      }

      previousValue = value;
      if (next !== undefined) {
        if (afterNext !== undefined) {
          current = afterNext;
          next = undefined;
          afterNext = undefined;
        } else {
          current = next;
          next = undefined;
        }
      } else {
        current = await iterator.next();
      }
      continue;
    }

    buffer += value;
    previousValue = value;
    next = await iterator.next();
    current = next;
  }

  if (chunk.length > 0 || buffer.length > 0) {
    const words = [...segmenter.segment(buffer)].filter((w) => w.isWordLike);
    const text = (chunk + buffer).trim();
    yield {
      text,
      words: chunkWordsCount + words.length,
      reason: "flush",
    };
  }
}

export async function chunkEmitter(
  reader: ReaderLike,
  pendingSpecials: string[],
  handler: (ttsSegment: TTSChunkItem) => Promise<void> | void
): Promise<void> {
  const sanitizeChunk = (text: string) =>
    text
      .replaceAll(TTS_SPECIAL_TOKEN, "")
      .replaceAll(TTS_FLUSH_INSTRUCTION, "")
      .trim();

  try {
    for await (const chunk of chunkTTSInput(reader)) {
      if (chunk.reason === "special") {
        const specialToken = pendingSpecials.shift();
        await handler({
          chunk: sanitizeChunk(chunk.text),
          special: specialToken ?? null,
        });
      } else {
        await handler({ chunk: sanitizeChunk(chunk.text), special: null });
      }
    }
  } catch (error) {
    console.error("Error chunking stream to TTS queue:", error);
  }
}
