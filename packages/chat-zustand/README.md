# @youngro/chat-zustand

A small demo package showing how to implement a chat store using Zustand (port of airi's Pinia chat store).

Usage:

- Run dev: `pnpm --filter @youngro/chat-zustand dev`
- Import `ChatDemo` from `@youngro/chat-zustand/src/components/ChatDemo` in a React app and mount it.

Notes:

- This package uses a mock streaming implementation in the store. Replace with a real adapter to connect to LLM providers.
