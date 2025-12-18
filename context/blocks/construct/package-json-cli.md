---
depends:
  - @context/blocks/construct/package-json-library.md
---

# package.json — TypeScript CLI

Library + `bin`.

## Pattern

```jsonc
{
  "name": "@company/cli",
  "version": "1.0.0",
  "type": "module",

  // ─── CLI ────────────────────────────────────────────────────────
  "bin": { "mycli": "./dist/cli.js" },

  // ─── LIBRARY EXPORTS ────────────────────────────────────────────
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    }
  },

  "files": ["dist"],
  "publishConfig": { "access": "public" },

  "scripts": {
    "dev": "tsc --watch",
    "build": "tsc",
    "prepublishOnly": "pnpm build"
  },

  "dependencies": {
    "commander": "*"
  },

  "devDependencies": {
    "typescript": "*"
  }
}
```

## Key fields

- `bin` — Maps command names to executable files. On `npm install -g`, creates symlink in PATH (e.g., `/usr/local/bin/mycli`). On local install, symlinks to `node_modules/.bin/`.
- Shebang (`#!/usr/bin/env node`) — Required in the entry file. Tells OS to run with Node.
- `files: ["dist"]` — Must include the bin target file.
- Library exports (`main`/`exports`) — Optional. Include if CLI should also be importable as a library.

## tsconfig essentials

Same as Library — `declaration: true`, `declarationMap: true`.

## src/cli.ts — needs shebang

```typescript
#!/usr/bin/env node
import { Command } from 'commander'
// ...
```
