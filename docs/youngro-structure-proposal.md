# Youngro Monorepo: Structure Modernization Proposal

This document proposes a pragmatic structure for the youngro monorepo, inspired by the AIRI project, and an incremental migration plan with quick wins.

## Goals

- Keep app code thin; move feature logic (UI + store) into packages for reuse.
- Standardize component export pattern, build pipelines, TS configs, and linting.
- Provide clear boundaries: apps vs. packages vs. services.
- Enable gradual migration without breaking dev flows.

## Target Layout (inspired by AIRI)

```
/ (repo root)
  apps/
    web/                  # Next.js app (App Router)
    docs/                 # (optional) documentation app
  packages/
    ui/                   # shared UI library (@repo/ui)
    design-tokens/        # Tailwind + design tokens
    stores/               # cross-app Zustand store modules (@youngro/stores)
    feature-youngro-card/ # youngro-card feature (store + React components)
    feature-chat/         # chat feature (store + components)
    server-shared/        # shared types/utils for server
  services/
    ...                   # bot/integration services if any
  scripts/
  turbo.json
  pnpm-workspace.yaml
  tsconfig.json
  eslint configs
```

Notes:

- AIRI has `stage-pages` (page-level components) and `stage-ui` (UI + stores). For Next.js we recommend keeping routes in `apps/web/app/...`, and moving feature UIs/stores into packages (analogous to AIRI's `stage-*`).
- If Rust or plugins exist, mirror AIRI's `crates/` or `plugins/` as needed.

## Conventions

- UI components: `Component.tsx + index.ts` per folder. Barrel export from `src/components/index.ts`.
- Build: `tsup` for ESM+CJS+types; `tailwindcss` emits `dist/ui-tw.css` for UI package.
- TS: shared base config in `@repo/typescript-config` with project references.
- ESLint: shared config in `@repo/eslint-config`.
- Styling: Tailwind with shared `packages/design-tokens/tailwind.config.cjs`; apps can extend.
- i18n: centralize translation keys; align with AIRI `settings.pages.card.*` where practical.

## Feature: youngro-card

- Move current `apps/web/app/settings/youngro-card` feature into `packages/feature-youngro-card`:
  - `src/lib/` → types, ccv3 conversion, sanitize helper
  - `src/store/` → provider hook + persistence
  - `src/components/` → CreateCardTile, FileInput, CardListItem, CardCreationDialog, CardDetailDialog, DeleteDialog
  - `src/index.ts` → exports
- Keep `apps/web/app/settings/youngro-card/page.tsx` thin; import from the package and compose.

## Quick Wins (immediate)

- Tailwind content globs: avoid scanning `node_modules`. Use POSIX globs in `packages/design-tokens/tailwind.config.cjs` (already aligned). Ensure `apps/web/tailwind.config.cjs` only extends `shared.content`.
- UI icon exports: ensure only `Icon.tsx + index.ts` exist. Remove any duplicate `index.tsx`.
- Component export pattern: refactor any remaining components to the standard `Component.tsx + index.ts`.

## Phase Plan

- Phase 1 (Done/Next)
  - [x] youngro-card MVP in app (import/create/list/activate/delete)
  - [x] PageHeader integration on settings pages
  - [x] UI export structure normalized for Card, Icon, BrandLogo
  - [ ] Creation/Detail/Delete dialogs (React) with validation and safe HTML
  - [ ] Toolbar (search/sort) and empty states

- Phase 2
  - [ ] Extract youngro-card to `packages/feature-youngro-card`
  - [ ] Introduce `@youngro/stores` for cross-feature global state
  - [ ] Wire active card -> global modules (consciousness/speech)
  - [ ] i18n keys & translations (zh/en)

- Phase 3
  - [ ] Polish UI (animations, gradients) akin to AIRI micro-interactions
  - [ ] Add docs and examples
  - [ ] Optional: extract more features (chat, settings modules) into packages

## Migration Steps (youngro-card example)

1. Create `packages/feature-youngro-card` with current lib/store/components as-is.
2. Export provider and components from the package.
3. Replace app imports in `apps/web/app/settings/youngro-card/page.tsx` to use the package.
4. Delete duplicated files from app after verification.
5. Add build + typecheck tasks for the new package in turborepo.

## Risks & Mitigations

- SSR hydration: keep initial render deterministic; load browser-only state in `useEffect`.
- Type bleed: use strict types and avoid `any`. Provide minimal CCV3 typings locally.
- Build conflicts: ensure single source of truth for component exports.

## Tracking

- Use the repo TODO to track the listed tasks.
- CI should run lint, typecheck, and build for all packages/apps.

---

If you approve, I can start by extracting `youngro-card` into a feature package and implementing the three dialogs to reach feature parity with AIRI.
