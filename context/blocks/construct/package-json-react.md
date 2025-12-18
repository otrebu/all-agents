---
depends:
  - @context/blocks/construct/package-json-library.md
---

# package.json — React Library

Uses Vite — handles JSX, CSS, bundling for browsers.

## Pattern

```jsonc
{
  "name": "@company/ui",
  "version": "1.0.0",
  "type": "module",

  "main": "./dist/ui.cjs",
  "module": "./dist/ui.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/ui.js",
      "require": "./dist/ui.cjs"
    },
    "./styles.css": "./dist/ui.css"
  },

  "sideEffects": ["*.css"],
  "files": ["dist"],

  "peerDependencies": {
    "react": ">=18",
    "react-dom": ">=18"
  },

  "scripts": {
    "dev": "vite build --watch",
    "build": "vite build",
    "typecheck": "tsc --noEmit",
    "test": "vitest run"
  },

  "dependencies": {
    "clsx": "*"
  },

  "devDependencies": {
    "@vitejs/plugin-react": "*",
    "vite": "*",
    "vite-plugin-dts": "*",
    "react": "*",
    "react-dom": "*",
    "@types/react": "*",
    "typescript": "*"
  }
}
```

## Key fields

- `peerDependencies` — Declares React as consumer's responsibility. Prevents duplicate React bundles (which breaks hooks).
- `sideEffects: ["*.css"]` — Tells bundlers CSS imports have side effects (they inject styles). Without this, CSS gets tree-shaken away.
- `module` — ESM entry point for bundlers. Some tools prefer this over `exports`.
- `"./styles.css"` export — Lets consumers import CSS explicitly: `import "@company/ui/styles.css"`.
- `external` (vite config) — Excludes React from bundle. Critical: must include `react/jsx-runtime` or JSX transform gets bundled.
- React in `devDependencies` — Needed for development/testing, but not shipped (it's a peer dep).

## tsconfig essentials

`noEmit: true` — Vite handles compilation; tsc is for type-checking only.

## vite.config.ts

```typescript
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import dts from 'vite-plugin-dts'

const __dirname = dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [react(), dts({ include: ['src'] })],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      fileName: 'ui',
    },
    rollupOptions: {
      external: ['react', 'react-dom', 'react/jsx-runtime'],
    },
  },
})
```
