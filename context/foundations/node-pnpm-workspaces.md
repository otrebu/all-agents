---
tags: [platform, monorepo]
depends:
  - @context/blocks/tools/pnpm.md
  - @context/blocks/tools/pnpm-workspaces.md
  - @context/blocks/tools/typescript-config-monorepo.md
---

# Node + pnpm Workspaces Platform

Monorepo coordination with pnpm workspaces + TypeScript project references.

## Integration Glue

Shows how pnpm workspaces, TypeScript project references, and package.json structure coordinate in a monorepo.

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

Shared options all packages extend:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "strict": true,
    "composite": true,
    "declaration": true,
    "declarationMap": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  }
}
```

**composite:true** enables project references and incremental builds.

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
    "dev": "tsx watch src/index.ts",
    "build": "tsc --build",
    "clean": "rm -rf dist"
  },
  "dependencies": {
    "@myorg/core": "workspace:*",
    "express": "^4.18.0"
  }
}
```

**workspace:\*** links to local package, converts to version on publish.

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
