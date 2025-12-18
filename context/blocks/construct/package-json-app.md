---
depends:
  - @context/blocks/construct/package-json-base.md
---

# package.json — TypeScript App (Backend/Service)

Private, not published. `tsc` builds, `tsx` for dev.

## Pattern

```jsonc
{
  "name": "@mono/api",
  "version": "1.0.0",
  "private": true,
  "type": "module",

  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "typecheck": "tsc --noEmit",
    "test": "vitest run"
  },

  "dependencies": {
    "@mono/shared": "workspace:*",
    "hono": "*"
  },

  "devDependencies": {
    "@types/node": "*",
    "tsx": "*",
    "typescript": "*",
    "vitest": "*"
  },

  "engines": { "node": ">=20" }
}
```

## Key fields

- `private: true` — Prevents accidental npm publish. Required for apps.
- `type: "module"` — Enables ESM (`import`/`export`). Without this, Node assumes CommonJS.
- `engines` — Documents required Node version. pnpm enforces this.
- No `main`/`exports`/`files` — Not needed; this package isn't consumed by others.

## tsconfig essentials

`outDir`, `rootDir` — standard output setup. No special flags needed.
