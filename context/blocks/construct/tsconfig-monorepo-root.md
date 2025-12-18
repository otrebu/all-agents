---
tags: [monorepo]
depends:
  - @context/blocks/construct/tsconfig-base.md
---

# TypeScript Config for Monorepo

## Root tsconfig.json

Additional compiler options needed ONLY for monorepo packages. Extends the base config and adds project references.

At root level, tsconfig.json:

```json
// tsconfig.json (root) - orchestrator, extends base
{
  "extends": "./tsconfig.base.json",

  // No files at root - just coordinates builds
  "files": [],

  // All workspace packages
  "references": [{ "path": "./packages/core" }, { "path": "./packages/utils" }]
}
```

**references** - Lists all workspace packages (no files compiled at root)

## Base config for all packages, extends base

Extends base + adds composite + declaration + declarationMap:

```json
// tsconfig.package.json - base for all packages, extends base
{
  "extends": "./tsconfig.base.json",
  "compilerOptions": {
    // Required for project references
    "composite": true,

    // Generate .d.ts for other packages to consume
    "declaration": true,

    // Enables go-to-definition to .ts source
    "declarationMap": true
  }
}
```

**composite: true** - Enables TypeScr
**declarationMap: true** - Source maps for `.d.ts` files (go-to-definition across packages)

## Package tsconfig.json

```json
// packages/*/tsconfig.json - each package extends package base
{
  "extends": "../../tsconfig.package.json",
  "compilerOptions": {
    "rootDir": "./src",
    "outDir": "./dist"
  },
  "include": ["src/**/*"],

  // Dependencies on other packages
  "references": [{ "path": "../core" }]
}
```

**references** - Must match `package.json` workspace dependencies.

# Build Coordination

```bash
# Type-check entire monorepo (respects dependency order)
tsc --build

# Clean all outputs
tsc --build --clean

# Watch mode
tsc --build --watch
```

**Benefits:**

- Builds packages in dependency order (core before api)
- Skips unchanged packages (incremental)
- Parallelizes independent builds

# When to Use

- Monorepo with multiple TypeScript packages
- Need cross-package type checking
- Want incremental builds for large codebases

# When NOT to Use

- Single package projects (no need for project references)
- Monorepo with independent packages (no shared types)
