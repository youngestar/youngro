import { describe, it, expect } from "vitest";
import { createStreamTokenizer } from "./index";

describe("createStreamTokenizer cross-chunk", () => {
  it("handles token split across chunks", () => {
    const st = createStreamTokenizer();
    const r1 = st.ingest("Hello <|EMO");
    expect(r1.textDelta).toBe("Hello ");
    expect(r1.tokens.length).toBe(0);
    const r2 = st.ingest("TE_HAPPY|>!");
    // second ingest only finalizes emote token; trailing '!' held in buffer
    expect(r2.textDelta).toBe("");
    expect(r2.tokens.length).toBe(1);
    const r3 = st.ingest(""); // trigger no-op ingest
    const flushed = st.flush();
    expect(flushed.textDelta).toBe("!");
  });

  it('does not lose lone "<" across boundary (non-token)', () => {
    const st = createStreamTokenizer();
    const r1 = st.ingest("1<");
    // may withhold trailing '<' until next chunk
    expect(r1.textDelta === "1" || r1.textDelta === "1<").toBe(true);
    const r2 = st.ingest("2");
    // combined visible text should contain '<'
    expect((r1.textDelta + r2.textDelta).includes("<")).toBe(true);
  });

  it("multiple tokens and text chunks", () => {
    const st = createStreamTokenizer();
    const a = st.ingest("<|EMOTE_SAD|>Hi ");
    const b = st.ingest("<|DELAY:0.5|>there");
    const c = st.ingest(" <|EMOTE_ANGRY|>!");
    const flushed = st.flush();
    const combinedText =
      a.textDelta + b.textDelta + c.textDelta + flushed.textDelta;
    expect(combinedText).toBe("Hi there !");
    const toks = [...a.tokens, ...b.tokens, ...c.tokens, ...flushed.tokens];
    expect(toks.filter((t) => t.kind === "emote").length).toBe(2);
    expect(toks.filter((t) => t.kind === "delay").length).toBe(1);
  });
});
