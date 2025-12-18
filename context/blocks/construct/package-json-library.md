---
depends:
  - @context/blocks/construct/package-json-base.md
---

# package.json — TypeScript Library

App + exports, declarations, publishing. `tsc` generates JS + `.d.ts`.

## Pattern

```jsonc
{
  "name": "@company/utils",
  "version": "1.0.0",
  "type": "module",

  // ─── ENTRY POINTS ───────────────────────────────────────────────
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    }
  },

  // ─── PUBLISHING ─────────────────────────────────────────────────
  "sideEffects": false,
  "files": ["dist"],
  "publishConfig": { "access": "public" },
  "license": "MIT",

  "scripts": {
    "dev": "tsc --watch",
    "build": "tsc",
    "test": "vitest run",
    "prepublishOnly": "pnpm build && pnpm test"
  },

  "devDependencies": {
    "typescript": "*",
    "vitest": "*"
  }
}
```

## Key fields

- `main` — Entry point for CommonJS `require()` and older bundlers.
- `types` — Entry point for TypeScript declarations. IDEs use this for autocomplete.
- `exports` — Modern entry point map. Takes precedence over `main` when supported. The `types` condition must come first.
- `sideEffects: false` — Tells bundlers this package is safe to tree-shake. Any unused exports can be eliminated.
- `files: ["dist"]` — Whitelist of files to include when publishing. Keeps package small.
- `publishConfig.access` — Required for scoped packages (`@company/*`) to publish publicly.
- `declaration: true` (tsconfig) — Generates `.d.ts` files alongside JS output.
- `declarationMap: true` (tsconfig) — Enables "Go to Definition" to jump to `.ts` source, not `.d.ts`.

## tsconfig essentials

`declaration: true` (generates `.d.ts`), `declarationMap: true` (enables "Go to Definition" to source).

## For dual ESM/CJS

(if you need CommonJS consumers):

```jsonc
{
  "main": "./dist/cjs/index.js",
  "module": "./dist/esm/index.js",
  "types": "./dist/esm/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/esm/index.d.ts",
      "import": "./dist/esm/index.js",
      "require": "./dist/cjs/index.js"
    }
  },

  "scripts": {
    "build": "pnpm build:esm && pnpm build:cjs",
    "build:esm": "tsc -p tsconfig.json",
    "build:cjs": "tsc -p tsconfig.cjs.json"
  }
}
```
