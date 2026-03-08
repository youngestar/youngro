// Generic NDJSON streaming parser for chat provider chunks
// Converts a ReadableStream<Uint8Array> into structured objects and invokes callbacks.
// Designed to be provider-agnostic: expects each line to be a standalone JSON object.

export interface NDJSONChunk {
  type: string;
  [key: string]: unknown;
}

export interface NDJSONParseOptions {
  onChunk: (chunk: NDJSONChunk) => void;
  onError: (error: Error) => void;
  onFinish: () => void;
  abortSignal?: AbortSignal;
}

export async function consumeNDJSONStream(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  opts: NDJSONParseOptions
): Promise<void> {
  const decoder = new TextDecoder();
  let buffer = "";
  try {
    while (true) {
      if (opts.abortSignal?.aborted) {
        throw new Error("aborted");
      }
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let idx: number;
      while ((idx = buffer.indexOf("\n")) !== -1) {
        const line = buffer.slice(0, idx);
        buffer = buffer.slice(idx + 1);
        const s = line.trim();
        if (!s) continue;
        try {
          const obj = JSON.parse(s) as NDJSONChunk;
          opts.onChunk(obj);
        } catch (e) {
          opts.onError(e instanceof Error ? e : new Error(String(e)));
        }
      }
    }
    const last = buffer.trim();
    if (last) {
      try {
        const obj = JSON.parse(last) as NDJSONChunk;
        opts.onChunk(obj);
      } catch (e) {
        // ignore trailing partial
      }
    }
  } catch (e) {
    // propagate error
    opts.onError(e instanceof Error ? e : new Error(String(e)));
  } finally {
    opts.onFinish();
  }
}

export function classifyError(err: unknown): "transient" | "fatal" {
  const msg = (err instanceof Error ? err.message : String(err)).toLowerCase();
  if (
    msg.includes("network") ||
    msg.includes("timeout") ||
    msg.includes("econnrefused") ||
    msg.includes("etimedout") ||
    msg.includes("aborted") ||
    msg.includes("failed to fetch") ||
    msg.includes("connection")
  ) {
    return "transient";
  }
  return "fatal";
}
