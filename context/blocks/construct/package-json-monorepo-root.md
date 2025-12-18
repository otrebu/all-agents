---
tags: [monorepo]
depends:
  - @context/blocks/construct/package-json-base.md
---

# package.json — Monorepo Root

Orchestration only.

## Pattern

```jsonc
{
  "name": "my-monorepo",
  "private": true,

  "workspaces": ["packages/*", "apps/*"],

  "scripts": {
    "build": "pnpm -r run build",
    "test": "pnpm -r run test",
    "typecheck": "pnpm -r run typecheck",
    "dev:api": "pnpm --filter @mono/api dev",
    "dev:web": "pnpm --filter @mono/web dev"
  },

  "devDependencies": {
    "typescript": "*",
    "vitest": "*",
    "prettier": "*"
  },

  "packageManager": "pnpm@9",
  "engines": {
    "node": ">=20",
    "pnpm": ">=9"
  }
}
```

## Key fields

- `private: true` — Root should never be published.
- `workspaces` — Declares package locations. pnpm reads this but primarily uses `pnpm-workspace.yaml`.
- `packageManager` — Enables Corepack. Running `npm install` in this repo auto-switches to specified pnpm version.
- `engines` — Documents required versions. pnpm enforces these.
- Root `devDependencies` — Shared tools (typescript, prettier, vitest) hoisted here. Packages don't need to duplicate them.
- Scripts use `pnpm -r` (recursive) and `--filter` — Orchestrates workspace packages.
- No `main`/`exports`/`types` — Root doesn't export anything.

## pnpm-workspace.yaml

```yaml
packages:
  - 'packages/*'
  - 'apps/*'
```

## tsconfig essentials

Root has base config (no `outDir`/`rootDir`). Packages extend it and add `declaration: true`.
