<p align="right">
  <a href="./README.md">English</a> |
  <a href="./README.zh-CN.md">简体中文</a> |
</p>

<p align="center">
  <sub>Built with Turborepo + pnpm</sub>
</p>

<h1 align="center">Project YOUNGRO</h1>

<p align="center">A modern full-stack monorepo for multimodal AI companions, orchestrating consciousness, speech, memory and peripherals in a single codebase.</p>

> [!NOTE]
> Youngro is evolving rapidly. This doc describes the current capabilities; features not yet merged are marked WIP.

## Why Youngro?

Inspired by AIRI’s workflow but re-imagined in TypeScript, Youngro runs its core experience on Next.js 15 + React 19. Strict dependency layers let Web, Desktop and Robot runtimes share the same infrastructure. You can prototype consciousness, speech and memory modules in the browser and instantly assemble your own digital character.

## Key Highlights

- **Unified Module Dashboard**  
  Consciousness, speech, hearing, memory, messaging and gaming modules are declared in `modulesList`; routes are auto-generated and can be toggled on/off at runtime.

- **Provider Hub + Validation**  
  Chat / speech / transcription providers register metadata, persist config and perform remote validation through `providersStore`; model catalogs are fetched on demand.

- **Real-time Speech Pipeline**  
  `useStreamingSpeechPlayback` splits model output into chunks, queues them via `/api/speech/providers/:id`, handles SSML, pitch/rate, latency and emotion tags.

- **Youngro Card Domain Model**  
  `@youngro/store-card` standardizes character cards, auto-completes module configs, persists to localStorage and exposes reusable prompt snippets for Web, Bot and MCP plug-ins.

- **Design System Out-of-the-box**  
  `@repo/ui`, `@youngro/design-tokens`, `@youngro/emotion-tokens` and `@youngro/youngro-icons` give you Tailwind themes, fonts and an SVG→React icon pipeline.

- **Type-safe Unidirectional Dependencies**  
  ESLint `boundaries` enforce `lib → store → feature → ui → app`. Shared TS / ESLint configs keep the graph acyclic and tree-shakable.

## Capability Roadmap

- [x] **Consciousness / Chat**  
       Multi-provider LLM, custom model priority, prompt templates, personality assembly via `YoungroCard`.

- [x] **Speech Synthesis**  
       Auto-read replies, pitch/rate control, SSML switching, emotion-tagged queue playback.

- [x] **Provider Management**  
       Persistent config, remote validation, dynamic model list, adapter registry (`apps/web/src/lib/providers`).

- [ ] **Hearing Input**  
       UI for mic/VAD/ASR ready; backend audio ingestion planned.

- [ ] **Memory (short & long term)**  
       UI for context window & vector DB in place; adapters WIP.

- [ ] **Messaging Bridge**  
       Discord connector UI stubbed; backend service pending.

- [ ] **Gaming Agent**  
       Minecraft module follows AIRI pattern; server-side controller TODO.

## Architecture

```mermaid
flowchart TD
  subgraph Apps
    Web[apps/web (Next.js 15 + Turbopack)]
    Docs[apps/docs (Next.js 15)]
  end

  subgraph Features & Stores
    ChatStore[@youngro/chat-zustand]
    CardStore[@youngro/store-card]
    FeatureCard[@youngro/feature-youngro-card]
    ProvidersStore[providersStore.ts]
  end

  subgraph UI System
    UI[@repo/ui]
    Tokens[@youngro/design-tokens]
    EmoTokens[@youngro/emotion-tokens]
    Icons[@youngro/youngro-icons]
  end

  subgraph Tooling
    ESLint[@repo/eslint-config]
    TSConfig[@repo/typescript-config]
    Utils[@youngro/lib-utils]
  end

  Web --> ChatStore
  Web --> ProvidersStore
  Web --> FeatureCard
  FeatureCard --> CardStore
  CardStore --> ChatStore
  FeatureCard --> UI
  UI --> Tokens
  UI --> EmoTokens
  UI --> Icons
  Docs --> UI
  Docs --> Tokens
  Docs --> ESLint
  Docs --> TSConfig
  Web --> Utils
```

## Packages at a Glance

| Scope                           | Description                                                                                                              |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `apps/web`                      | Main experience. Next.js 15 app with multi-panel chat (`InteractiveArea`), module settings, provider & speech streaming. |
| `apps/docs`                     | Doc / marketplace site, also Next.js, reuses UI kit for visual consistency.                                              |
| `@repo/ui`                      | Headless + styled components (Button, Icon, ScrollArea, Textarea …). Tailwind + Radix, built with tsup to `dist/`.       |
| `@youngro/design-tokens`        | Colors, typography, safelist and compiled CSS, shared by Web / Docs / UI.                                                |
| `@youngro/emotion-tokens`       | Emotion presets mapping inference labels to UI state and speech hints.                                                   |
| `@youngro/youngro-icons`        | SVGR pipeline SVG → React icons with types and multi-entry exports.                                                      |
| `@youngro/store-card`           | Character-card domain model & `YoungroCardProvider`, parses CCv3 / custom schema.                                        |
| `@youngro/feature-youngro-card` | Feature layer wiring UI components to card store for an editable persona panel.                                          |
| `@youngro/chat-zustand`         | Chat store: send queue, streaming callbacks, provider hooks.                                                             |
| `@youngro/lib-utils`            | Pure TypeScript helpers used across packages.                                                                            |
| `@repo/eslint-config`           | Centralized ESLint preset with import hygiene & boundary rules.                                                          |
| `@repo/typescript-config`       | Base / React / Package-level TSConfigs for all packages to `extends`.                                                    |

## Supported Providers

Definitions live in `apps/web/src/data/settings/providers.ts`. Defaults:

### Chat

- DeepSeek
- Moonshot AI (Kimi)

### Speech

- Tencent Cloud TTS

Each provider declares capabilities (models, languages, tags, voice preview). `providersStore` validates required fields, encrypts and stores config in `localStorage`, then calls `/api/.../validate` or adapter self-check before marking “configured”.

## Module System

| Module        | Purpose                                        | Route                             |
| ------------- | ---------------------------------------------- | --------------------------------- |
| Consciousness | Tune persona, tone, core model.                | `/settings/modules/consciousness` |
| Speech        | Pick provider, model, voice, SSML, pitch/rate. | `/settings/modules/speech`        |

<!-- | Hearing        | Mic source, ASR, VAD behavior.                        | `/settings/modules/hearing`           |
| Short Memory   | Session context window, refresh policy.               | `/settings/modules/memory-short-term` |
| Long Memory    | Vector / knowledge sync (DuckDB / pglite planned).    | `/settings/modules/memory-long-term`  |
| Discord Bridge | OAuth, channel event sync.                            | `/settings/modules/messaging-discord` |
| Minecraft      | In-game chat, commands, event callbacks.              | `/settings/modules/gaming-minecraft`  |
| Beta Features  | Toggle experimental capabilities.                     | `/settings/modules/beta`              | -->

## Development Guide

### Requirements

- Node.js ≥ 18
- pnpm 9 (locked in `packageManager`)
- Turbo CLI (install globally to run bare `turbo` commands)

### Install & Bootstrap

```sh
pnpm install
```

Design tokens must be built before dev/build (automated via `predev`/`prebuild`, but you can run manually):

```sh
pnpm --filter @youngro/design-tokens build
```

### Run Apps

```sh
# web + docs concurrently, orchestrated by Turborepo
pnpm dev

# web only
pnpm dev:web

# filter examples
pnpm --filter web dev
pnpm --filter docs dev
```

### Build & Check

```sh
pnpm build        # turbo run build
pnpm lint         # turbo run lint
pnpm check-types  # turbo run check-types
```

### Environment Variables

Passed via Turbo `globalEnv`, place in `.env.local` or shell:

- `DEEPSEEK_API_KEY`, `DEEPSEEK_BASE_URL`
- `DISABLE_SHIKI`, `NEXT_DISABLE_SHIKI`, `MARKDOWN_NO_SHIKI`

### Remote Caching (optional)

Leverage Turborepo remote cache with a Vercel account:

```sh
turbo login
turbo link
```

## Directory Cheat-sheet

- `apps/web/src/components` – Chat UI, toolbar, Markdown renderer, widgets.
- `apps/web/src/store` – Zustand stores (Providers, Speech, Consciousness …).
- `apps/web/src/lib/providers` – Chat / speech / transcription adapter registry & impl.
- `packages/*` – Reusable packages with source + build outputs.
- `docs/` – Standalone doc site content & scripts.
- `scripts/` – Helper scripts (more CI/automation incoming).

## Icon Guidelines

- System icons: use `@repo/ui` `Icon` + `lucide-react`, color via `text-*`, size via `size` prop.
- Brand / logos: use `@repo/ui` `BrandLogo` or plain `<img>`; SVG assets skip `next/image`.
- ESLint enforces:
  - No `<Image src="*.svg" />`
  - `<img>` / `BrandLogo` must have `alt` text

```tsx
import { Icon, BrandLogo } from "@repo/ui";
import { Check } from "lucide-react";

<Icon icon={Check} size="sm" className="text-muted-foreground" aria-label="ok" />

<BrandLogo srcLight="logo-light.svg" srcDark="logo-dark.svg" alt="Brand" width={180} height={38} />
```
