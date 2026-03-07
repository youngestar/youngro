import { describe, it, expect } from "vitest";
import { createStreamTokenizer } from "./index";

describe("createStreamTokenizer cross-chunk", () => {
  it("handles token split across chunks", () => {
    const st = createStreamTokenizer();
    const r1 = st.ingest("Hello <|EMO");
    expect(r1.textDelta).toBe("Hello ");
    expect(r1.tokens.length).toBe(0);
    const r2 = st.ingest("TE_HAPPY|>!");
    expect(r2.textDelta).toBe("!");
    expect(r2.tokens.length).toBe(1);
  });

  it('does not lose lone "<" across boundary (non-token)', () => {
    const st = createStreamTokenizer();
    const r1 = st.ingest("1<");
    expect(r1.textDelta === "1" || r1.textDelta === "1<").toBe(true);
    const r2 = st.ingest("2");
    expect((r1.textDelta + r2.textDelta).includes("<")).toBe(true);
  });

  it("multiple tokens and text chunks", () => {
    const st = createStreamTokenizer();
    const a = st.ingest("<|EMOTE_SAD|>Hi ");
    const b = st.ingest("<|DELAY:0.5|>there");
    const c = st.ingest(" <|EMOTE_ANGRY|>!");
    const combinedText = a.textDelta + b.textDelta + c.textDelta;
    expect(combinedText).toBe("Hi there !");
    const toks = [...a.tokens, ...b.tokens, ...c.tokens];
    expect(toks.filter((t) => t.kind === "emote").length).toBe(2);
    expect(toks.filter((t) => t.kind === "delay").length).toBe(1);
  });
});
