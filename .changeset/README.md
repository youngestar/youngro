# Changesets in Youngro

This repository uses Changesets for internal package versioning and changelog generation.
Packages stay private; `changeset version` is used to record milestones and compatibility changes across the workspace.

## Current scope

Changesets currently ignores these workspace members:

- `web`
- `docs`
- `@youngro/eslint-config`
- `@youngro/typescript-config`

All other workspace packages are eligible for internal versioning.

## When to add a changeset

Add a changeset when a change is relevant to consumers of a shared workspace package, for example:

- new exports, components, tokens, or reusable APIs
- bug fixes in shared packages
- behavior changes that downstream packages need to know about
- breaking changes to package contracts

You usually do not need a changeset for:

- docs-only changes
- tests-only changes
- local refactors that do not change package behavior
- app-only changes in `apps/web` or `apps/docs`

## Common commands

Create a changeset during development:

```sh
pnpm changeset
```

Review pending internal release information:

```sh
pnpm changeset:status
```

This command exits with a non-zero status when versioned packages changed without an accompanying changeset, which also makes it useful as a lightweight CI guard.

Consume pending changesets and update package versions plus changelogs:

```sh
pnpm changeset:version
```

## Semver guidance

- `patch`: bug fix or internal improvement with no contract change
- `minor`: backward-compatible new capability
- `major`: breaking change that requires downstream updates

## Notes for this repository

- Workspace dependencies currently use `workspace:*` in many places, so package versions are primarily used for internal change tracking and compatibility signaling.
- `changeset version` does not publish packages. It only updates package versions and changelog files for private packages in this repository.
