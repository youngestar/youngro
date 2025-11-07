import { describe, it, expect } from "vitest";
import {
  parseTokens,
  stripTokens,
  nextToken,
  KNOWN_EMOTIONS,
  ANY_TOKEN_RE,
} from "./index";

describe("emotion-tokens basic parsing", () => {
  it("parses mixed emote and delay tokens", () => {
    const input = "<|EMOTE_HAPPY|>Hello<|DELAY:1|> world <|EMOTE_SAD|>!";
    const { text, tokens } = parseTokens(input);
    expect(text).toBe("Hello world !");
    expect(tokens.length).toBe(3);
    expect(tokens[0].kind).toBe("emote");
    expect(tokens[1].kind).toBe("delay");
    expect(tokens[2].kind).toBe("emote");
  });

  it("marks known emotions", () => {
    const { tokens } = parseTokens("<|EMOTE_THINK|>thinking");
    expect(tokens[0].kind).toBe("emote");
    if (tokens[0].kind === "emote") {
      expect(tokens[0].known).toBe("THINK");
    }
  });

  it("handles unknown emotion without known flag", () => {
    const { tokens } = parseTokens("<|EMOTE_SURPRISED|>wow");
    expect(tokens[0].kind).toBe("emote");
    if (tokens[0].kind === "emote") {
      expect(tokens[0].known).toBeUndefined();
    }
  });

  it("parses float delay values", () => {
    const { tokens } = parseTokens("a<|DELAY:0.25|>b");
    const delay = tokens.find((t) => t.kind === "delay");
    expect(delay).toBeTruthy();
    expect((delay as any).seconds).toBeCloseTo(0.25, 5);
  });

  it("stripTokens removes all markers", () => {
    const input = "Test<|EMOTE_HAPPY|>A<|DELAY:2|>B";
    expect(stripTokens(input)).toBe("TestAB");
  });

  it("nextToken iterates sequentially", () => {
    const input = "<|EMOTE_HAPPY|>A<|DELAY:1|>B";
    let offset = 0;
    const found: string[] = [];
    while (true) {
      const tok = nextToken(input, offset);
      if (!tok) break;
      found.push(tok.raw);
      offset = tok.end;
    }
    expect(found).toEqual(["<|EMOTE_HAPPY|>", "<|DELAY:1|>"]);
  });

  it("ANY_TOKEN_RE global reset does not leak state", () => {
    const first = "<|EMOTE_HAPPY|>";
    const second = "<|DELAY:1|>";
    ANY_TOKEN_RE.lastIndex = 0;
    expect(ANY_TOKEN_RE.test(first)).toBe(true);
    ANY_TOKEN_RE.lastIndex = 0;
    expect(ANY_TOKEN_RE.test(second)).toBe(true);
  });
});

describe("constants sanity", () => {
  it("KNOWN_EMOTIONS baseline list stable", () => {
    expect(KNOWN_EMOTIONS).toEqual(["HAPPY", "SAD", "ANGRY", "THINK"]);
  });
});
