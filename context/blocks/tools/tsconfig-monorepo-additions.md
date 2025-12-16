---
tags: [monorepo]
depends:
  - @context/blocks/tools/tsconfig-base.md
---

# TypeScript Monorepo Additions

Additional compiler options needed ONLY for monorepo packages. Add these on top of the base config.

## Monorepo-Specific Options

```json
{
  "compilerOptions": {
    "composite": true,
    "declarationMap": true
  }
}
```

### What These Enable

- **composite: true** - Enables TypeScript project references and incremental builds
- **declarationMap: true** - Source maps for `.d.ts` files (go-to-definition across packages)

## Project References

### Root tsconfig.json

Lists all workspace packages (no files compiled at root):

```json
{
  "files": [],
  "references": [
    { "path": "./packages/core" },
    { "path": "./packages/utils" },
    { "path": "./apps/api" }
  ]
}
```

### Package tsconfig.json

Extends base + adds composite + declares dependencies:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "composite": true,
    "declarationMap": true,
    "rootDir": "./src",
    "outDir": "./dist"
  },
  "references": [
    { "path": "../core" }
  ]
}
```

**Key:** `references` must match `package.json` workspace dependencies.

## Build with Project References

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

## When to Use

- Monorepo with multiple TypeScript packages
- Need cross-package type checking
- Want incremental builds for large codebases

## When NOT to Use

- Single package projects (no need for project references)
- Monorepo with independent packages (no shared types)

## See Also

- @context/foundations/node-pnpm-workspaces.md - Complete monorepo setup
- @context/blocks/tools/pnpm-workspaces.md - pnpm workspace configuration
