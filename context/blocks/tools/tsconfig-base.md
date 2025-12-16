---
tags: [core]
---

# TypeScript Base Configuration

Universal TypeScript compiler options used by all projects. Every execution strategy extends this base.

## Complete Base Config

```json
{
  "compilerOptions": {
    // === Base Settings ===
    "target": "ES2022",
    "lib": ["ES2022"],
    "skipLibCheck": true,
    "allowJs": true,
    "resolveJsonModule": true,
    "moduleDetection": "force",
    "isolatedModules": true,

    // === Strict Type Safety ===
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,

    // === ESM Interop ===
    "esModuleInterop": true,
    "verbatimModuleSyntax": true,

    // === Path Aliases ===
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

## What's Included

### Base Settings
- **target: ES2022** - Modern JavaScript features
- **lib: ["ES2022"]** - Standard library definitions (override for DOM/Node-specific)
- **skipLibCheck: true** - Skip type checking node_modules (faster builds)
- **allowJs: true** - Allow importing .js files
- **resolveJsonModule: true** - Import JSON files
- **moduleDetection: force** - Treat all files as modules
- **isolatedModules: true** - Each file can be transpiled independently

### Strict Type Safety
- **strict: true** - All strict family checks enabled
- **noUncheckedIndexedAccess: true** - Array/object access returns `T | undefined`
- **noImplicitOverride: true** - Must use `override` keyword in classes

### ESM Interop
- **esModuleInterop: true** - Better CommonJS/ESM interop
- **verbatimModuleSyntax: true** - Explicit import/export syntax (no elision)

### Path Aliases
- **baseUrl: "."** - Root for relative paths
- **paths: {"@/*": ["./src/*"]}** - Clean imports with `@/`

Add more aliases as needed:
```json
{
  "paths": {
    "@/*": ["./src/*"],
    "@components/*": ["./src/components/*"],
    "@utils/*": ["./src/utils/*"]
  }
}
```

## Tool-Specific Extensions

This base config is EXTENDED by execution strategy foundations, which add:

- **Module settings** - `module`, `moduleResolution` (varies by tool)
- **Output settings** - `outDir`, `declaration`, `sourceMap` (build-first only)
- **noEmit** - Set to `true` for runtime execution (tsx, Bun, Vite)
- **lib overrides** - Add `["DOM", "DOM.Iterable"]` for frontend

See:
- @context/foundations/ts-node-tsc.md - Node via compiled JS
- @context/foundations/ts-node-tsx.md - Node via direct execution
- @context/foundations/ts-bun.md - Bun runtime
- @context/foundations/ts-web-vite.md - Vite frontend

## Monorepo Projects

Add monorepo-specific options on top of this base:

See: @context/blocks/tools/tsconfig-monorepo-additions.md

## Source

Based on [Total TypeScript TSConfig Cheat Sheet](https://www.totaltypescript.com/tsconfig-cheat-sheet)
