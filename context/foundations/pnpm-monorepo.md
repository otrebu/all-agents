---
tags: [platform, monorepo]
depends:
  - @context/blocks/tools/pnpm.md
  - @context/blocks/tools/pnpm-workspaces.md
  - @context/blocks/tools/tsconfig-base.md
  - @context/blocks/tools/tsconfig-monorepo-additions.md
---

# pnpm Monorepo Coordination

Monorepo structure and coordination patterns. Execution-agnostic - combines with execution strategy foundations in stacks.

## What This Covers

Monorepo COORDINATION only:
- Directory structure (packages/, apps/)
- workspace:* dependency pattern
- Project references
- Build coordination commands

Does NOT cover execution strategy (tsc/tsx/bun) - see execution foundations for that.

## Directory Structure

```
monorepo/
├── pnpm-workspace.yaml       # Workspace definition
├── package.json              # Root scripts (proxies)
├── tsconfig.json             # Project references only
├── tsconfig.base.json        # Shared compiler options
├── packages/
│   ├── core/
│   │   ├── src/
│   │   ├── package.json      # ESM, exports, workspace deps
│   │   └── tsconfig.json     # Extends base, adds references
│   └── utils/
│       ├── src/
│       ├── package.json
│       └── tsconfig.json
└── apps/
    └── api/
        ├── src/
        ├── package.json
        └── tsconfig.json
```

## File Coordination

### pnpm-workspace.yaml

```yaml
packages:
  - "packages/*"
  - "apps/*"
```

### Root package.json

Proxies commands to workspaces. NOT published.

```json
{
  "name": "monorepo",
  "private": true,
  "scripts": {
    "dev": "pnpm --filter @myorg/api dev",
    "build": "pnpm -r build",
    "test": "pnpm -r test",
    "typecheck": "tsc --build"
  }
}
```

### tsconfig.base.json

Shared options all packages extend. See @context/blocks/tools/tsconfig-base.md for base settings.

Monorepo additions from @context/blocks/tools/tsconfig-monorepo-additions.md:

```json
{
  "extends": "./tsconfig.base.json",  // Base config
  "compilerOptions": {
    "composite": true,           // Enable project references
    "declarationMap": true       // Source maps for .d.ts files
  }
}
```

### Root tsconfig.json

Project references only (no files):

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

Extends base, adds package-specific options + references:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "rootDir": "./src",
    "outDir": "./dist"
  },
  "references": [
    { "path": "../core" }
  ]
}
```

References enforce dependency graph and enable incremental builds.

### Package package.json

```json
{
  "name": "@myorg/api",
  "version": "1.0.0",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "scripts": {
    "dev": "<execution-strategy-specific>",
    "build": "<execution-strategy-specific>",
    "clean": "rm -rf dist"
  },
  "dependencies": {
    "@myorg/core": "workspace:*",
    "express": "^4.18.0"
  }
}
```

**workspace:\*** links to local package, converts to version on publish.

**Scripts:** dev/build commands depend on execution strategy:
- ts-node-tsc: `"build": "tsc --build"`, `"dev": "tsx watch src/index.ts"`
- ts-node-tsx: `"dev": "tsx watch src/index.ts"` (no build)
- ts-bun: `"dev": "bun --watch src/index.ts"` (no build)

See execution strategy foundations for specific scripts.

## Build Coordination

```bash
# Type-check entire monorepo (respects references)
tsc --build

# Build all packages in dependency order
pnpm -r build

# Clean all outputs
tsc --build --clean
```

**tsc --build** uses project references to:
- Build in dependency order (core before api)
- Skip unchanged packages (incremental)
- Parallelize independent builds

## Dependency Rules

- Packages MUST declare internal deps in package.json with `workspace:*`
- tsconfig references MUST match package.json dependencies
- Circular deps break incremental builds

## When to Use

- Multiple packages sharing code
- Coordinated releases
- Enforced dependency boundaries
- Large codebases needing incremental builds

## When NOT to Use

- Single app (simpler without monorepo)
- Unrelated projects (use separate repos)
