# Contributing to OpenAutonomyX Marketplace

Thanks for your interest. This project is open source under the
[Apache License 2.0](LICENSE), and anyone is welcome to contribute.

## Getting started

```bash
npm install
npm run typecheck   # tsc --noEmit
npm run test        # node:test via tsx
npm run lint        # eslint
```

Node ≥ 20.11 (CI uses Node 22). The repo is an npm-workspaces monorepo; each
engine lives in `packages/*` and is imported via its `@oax/*` alias (configured in
`tsconfig.json` paths).

## Project layout

| Area | Where |
|------|-------|
| Engines | `packages/*-engine`, `packages/consumer-sdk`, `packages/module-registry` |
| Tests | `tests/*.test.ts` (node:test) |
| Docs | `docs/` |
| Examples | `examples/` (runnable via `npx tsx examples/<file>.ts`) |
| Site | `site/` (static, modular Web Components) |

## Adding a capability (engine + action)

1. Create `packages/<name>-engine/` with a `package.json` and `src/` (`types.ts`,
   implementation, `index.ts`).
2. Register the `@oax/<name>-engine` path alias in `tsconfig.json`.
3. If it's a new capability, expose it as an action in
   `packages/action-engine/src/actions.ts` and register the module in
   `packages/module-registry/src/modules.ts`.
4. Add tests under `tests/` and docs under `docs/`.

## Pull requests

- Keep PRs focused and reviewable.
- Ensure `npm run typecheck`, `npm run test`, and `npm run lint` all pass — CI runs
  the same on every PR.
- Use clear, descriptive commit messages.

## Licensing of contributions

By submitting a contribution, you agree it is licensed under the Apache License
2.0, consistent with the rest of the project.
