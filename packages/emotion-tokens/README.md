# @youngro/emotion-tokens

Streaming-friendly token specs and lightweight utilities for emotion and delay markers in chat text.

- Tokens supported:
  - Emotes: `<|EMOTE_<NAME>|>` (e.g., `<|EMOTE_HAPPY|>`, `<|EMOTE_SAD|>`)
  - Delays: `<|DELAY:<seconds>|>` (e.g., `<|DELAY:1|>`, `<|DELAY:0.5|>`)
  - Reserved (not yet integrated): `<|MOTION_<NAME>|>`

- Exports:
  - Regular expressions: `EMOTE_TOKEN_RE`, `DELAY_TOKEN_RE`, `MOTION_TOKEN_RE`, `ANY_TOKEN_RE`
  - Types: `EmoteToken`, `DelayToken`, `MotionToken`, `Token`
  - Known lists: `KNOWN_EMOTIONS` (baseline only)
  - Utils: `parseTokens(text)`, `stripTokens(text)`

This package is intentionally minimal and side-effect free. Cross-chunk buffering and stream integration will be implemented in the chat layer.
