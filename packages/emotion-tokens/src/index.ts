/**
 * @youngro/emotion-tokens
 * Minimal token specs and helpers for EMOTE/DELAY (and reserved MOTION) markers.
 *
 * Notes:
 * - Keep this package side-effect free and framework agnostic.
 * - Do NOT change existing emotion collections elsewhere; only provide common specs here.
 * - Streaming cross-chunk buffering will be implemented in the chat layer.
 */

// Baseline known emotions (do not expand existing set here)
export const KNOWN_EMOTIONS = ["HAPPY", "SAD", "ANGRY", "THINK"] as const;
export type KnownEmotion = (typeof KNOWN_EMOTIONS)[number];

// Reserved examples (placeholders, not enforced)
export const RESERVED_EMOTIONS = ["SURPRISED", "CURIOUS"] as const;

// Token regexes (global, case-sensitive)
export const EMOTE_TOKEN_RE = /<\|EMOTE_([A-Z0-9_]+)\|>/g;
export const DELAY_TOKEN_RE = /<\|DELAY:([0-9]+(?:\.[0-9]+)?)\|>/g;
// Reserved
export const MOTION_TOKEN_RE = /<\|MOTION_([A-Z0-9_]+)\|>/g;

// Combined matcher to walk a string once
export const ANY_TOKEN_RE =
  /<\|(?:EMOTE_([A-Z0-9_]+)|DELAY:([0-9]+(?:\.[0-9]+)?)|MOTION_([A-Z0-9_]+))\|>/g;

export type BaseToken = {
  raw: string;
  start: number; // inclusive index in original string
  end: number; // exclusive index in original string
};

export type EmoteToken = BaseToken & {
  kind: "emote";
  name: string; // keep flexible; do not constrain to KnownEmotion
  known?: KnownEmotion; // present if matches baseline
};

export type DelayToken = BaseToken & {
  kind: "delay";
  seconds: number; // parsed float seconds
};

export type MotionToken = BaseToken & {
  kind: "motion";
  name: string;
};

export type Token = EmoteToken | DelayToken | MotionToken;

/**
 * parseTokens
 * Single-chunk parser that extracts tokens and returns text with tokens removed.
 * Cross-chunk buffering is intentionally deferred to the caller.
 */
export function parseTokens(input: string): { text: string; tokens: Token[] } {
  const tokens: Token[] = [];
  let m: RegExpExecArray | null;
  ANY_TOKEN_RE.lastIndex = 0;

  while ((m = ANY_TOKEN_RE.exec(input))) {
    const raw = m[0];
    const start = m.index;
    const end = start + raw.length;

    if (m[1]) {
      // EMOTE
      const name = m[1]!;
      const emote: EmoteToken = {
        kind: "emote",
        raw,
        start,
        end,
        name,
      };
      if ((KNOWN_EMOTIONS as readonly string[]).includes(name)) {
        emote.known = name as KnownEmotion;
      }
      tokens.push(emote);
    } else if (m[2]) {
      // DELAY
      const seconds = parseFloat(m[2]!);
      tokens.push({ kind: "delay", raw, start, end, seconds });
    } else if (m[3]) {
      // MOTION (reserved)
      const name = m[3]!;
      tokens.push({ kind: "motion", raw, start, end, name });
    }
  }

  // Remove tokens from text
  const text = stripTokens(input);
  return { text, tokens };
}

/**
 * stripTokens
 * Remove all token markers from text, leaving only user-visible content.
 */
export function stripTokens(input: string): string {
  return input.replace(ANY_TOKEN_RE, "");
}

/**
 * hasTokenQuickCheck
 * Fast boolean check without allocations.
 */
export function hasTokenQuickCheck(input: string): boolean {
  return /<\|(?:EMOTE_|DELAY:|MOTION_)/.test(input);
}

/**
 * nextToken
 * Find the next token from a given offset. Useful for stream slicing.
 */
export function nextToken(input: string, from = 0): Token | null {
  ANY_TOKEN_RE.lastIndex = from;
  const m = ANY_TOKEN_RE.exec(input);
  if (!m) return null;
  const raw = m[0];
  const start = m.index;
  const end = start + raw.length;
  if (m[1]) {
    const name = m[1]!;
    const tok: EmoteToken = { kind: "emote", raw, start, end, name };
    if ((KNOWN_EMOTIONS as readonly string[]).includes(name))
      tok.known = name as KnownEmotion;
    return tok;
  }
  if (m[2])
    return { kind: "delay", raw, start, end, seconds: parseFloat(m[2]!) };
  if (m[3]) return { kind: "motion", raw, start, end, name: m[3]! };
  return null;
}

/**
 * sliceWithoutTokens
 * Utility to slice a substring and then strip tokens within that slice only.
 */
export function sliceWithoutTokens(
  input: string,
  start: number,
  end?: number
): string {
  return stripTokens(input.slice(start, end));
}

// -------------------- Streaming Cross-Chunk Tokenizer --------------------
/**
 * createStreamTokenizer
 * Maintains an internal buffer to safely parse tokens that may arrive split across chunks.
 * Usage:
 *   const st = createStreamTokenizer();
 *   st.ingest(chunk) => { textDelta, tokens }
 *   - textDelta: user-visible text (tokens stripped) to append
 *   - tokens: newly completed tokens discovered in this ingestion
 *
 * Invariants:
 * - Never leaks partial token markers into textDelta.
 * - Keeps maximum buffer length bounded by MAX_BUFFER.
 */
export interface StreamTokenizerResult {
  textDelta: string;
  tokens: Token[];
}

export interface StreamTokenizer {
  ingest(chunk: string): StreamTokenizerResult;
  flush(): StreamTokenizerResult; // force flush remaining (treat incomplete token remnants as plain text)
}

const TOKEN_START = "<|";
const TOKEN_END = "|>";
const MAX_BUFFER = 4096; // safety cap; tokens are short so this is generous

export function createStreamTokenizer(): StreamTokenizer {
  let buffer = "";
  // Incremental scan: emit visible text in every ingest; keep only incomplete token prefix in buffer.
  function ingest(chunk: string): StreamTokenizerResult {
    if (!chunk) return { textDelta: "", tokens: [] };
    buffer += chunk;
    if (buffer.length > MAX_BUFFER) {
      const { text, tokens } = parseTokens(buffer);
      buffer = "";
      return { textDelta: text, tokens };
    }

    const tokens: Token[] = [];
    const visibleParts: string[] = [];
    let lastPos = 0;
    ANY_TOKEN_RE.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = ANY_TOKEN_RE.exec(buffer))) {
      const raw = m[0];
      const start = m.index;
      const end = start + raw.length;
      // push visible text before token
      if (start > lastPos) visibleParts.push(buffer.slice(lastPos, start));
      // build token
      if (m[1]) {
        const name = m[1]!;
        const emote: EmoteToken = { kind: "emote", raw, start, end, name };
        if ((KNOWN_EMOTIONS as readonly string[]).includes(name)) {
          emote.known = name as KnownEmotion;
        }
        tokens.push(emote);
      } else if (m[2]) {
        tokens.push({
          kind: "delay",
          raw,
          start,
          end,
          seconds: parseFloat(m[2]!),
        });
      } else if (m[3]) {
        tokens.push({ kind: "motion", raw, start, end, name: m[3]! });
      }
      lastPos = end;
    }
    // tail after last token
    const tail = buffer.slice(lastPos);
    if (tail) {
      const startIdx = tail.lastIndexOf(TOKEN_START);
      const hasEnd = tail.indexOf(TOKEN_END, startIdx + 2) !== -1;
      if (startIdx !== -1 && !hasEnd) {
        // keep partial token from startIdx; emit text before it
        if (startIdx > 0) visibleParts.push(tail.slice(0, startIdx));
        buffer = tail.slice(startIdx);
      } else {
        // no partial token, emit all
        visibleParts.push(tail);
        buffer = "";
      }
    } else {
      buffer = "";
    }

    const textDelta = stripTokens(visibleParts.join(""));
    return { textDelta, tokens };
  }

  function flush(): StreamTokenizerResult {
    if (!buffer) return { textDelta: "", tokens: [] };
    // Treat leftover as plain text; parse any complete tokens still.
    const { text, tokens } = parseTokens(buffer);
    buffer = "";
    return { textDelta: text, tokens };
  }

  return { ingest, flush };
}
