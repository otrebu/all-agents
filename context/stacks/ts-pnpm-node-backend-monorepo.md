---
tags: [monorepo, backend]
depends:
  - @context/blocks/tools/node.md
  - @context/blocks/tools/pnpm.md
  - @context/blocks/tools/pnpm-workspaces.md
  - @context/blocks/tools/typescript-config.md
  - @context/blocks/tools/typescript-config-monorepo.md
  - @context/foundations/node-pnpm-workspaces.md
  - @context/foundations/ts-execution-build-first.md
  - @context/foundations/code-standards.md
---

# TypeScript + pnpm + Node Backend Monorepo Stack

Complete monorepo setup for backend services with shared packages. Build-first strategy with ESM + path aliases.

## Layers

| Layer | Reference |
| --- | --- |
| Platform | node-pnpm-workspaces.md |
| Execution | ts-execution-build-first.md |
| Config | typescript-config-monorepo.md |
| DX | code-standards.md |

## When to Use

- Multiple backend services sharing code
- Shared libraries (db, utils, types)
- Coordinated releases
- Enforced dependency boundaries

## When NOT to Use

- Single service (monorepo overhead)
- Unrelated projects (separate repos)
- Small teams (< 3 devs, may not need complexity)

## Directory Structure

```
backend-monorepo/
├── pnpm-workspace.yaml
├── package.json              # Root scripts
├── tsconfig.json             # Project references
├── tsconfig.base.json        # Shared config
├── .eslintrc.json
├── .prettierrc
├── packages/
│   ├── db/                   # Database layer
│   │   ├── src/
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── types/                # Shared types
│   │   ├── src/
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── utils/                # Shared utilities
│       ├── src/
│       ├── package.json
│       └── tsconfig.json
└── apps/
    ├── api/                  # REST API
    │   ├── src/
    │   ├── package.json
    │   └── tsconfig.json
    └── worker/               # Background jobs
        ├── src/
        ├── package.json
        └── tsconfig.json
```

## Core Files

### pnpm-workspace.yaml

```yaml
packages:
  - "packages/*"
  - "apps/*"
```

### Root package.json

```json
{
  "name": "backend-monorepo",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "pnpm --filter @myorg/api dev",
    "dev:api": "pnpm --filter @myorg/api dev",
    "dev:worker": "pnpm --filter @myorg/worker dev",

    "build": "pnpm -r build",
    "build:api": "pnpm --filter @myorg/api build",
    "build:packages": "pnpm --filter './packages/*' build",

    "start": "pnpm --filter @myorg/api start",
    "start:worker": "pnpm --filter @myorg/worker start",

    "test": "pnpm -r test",
    "test:unit": "pnpm -r --filter './packages/*' test",
    "test:api": "pnpm --filter @myorg/api test",

    "lint": "eslint .",
    "lint:fix": "eslint . --fix",
    "format": "prettier --write .",
    "format:check": "prettier --check .",

    "typecheck": "tsc --build",
    "typecheck:watch": "tsc --build --watch",

    "clean": "pnpm -r clean && rm -rf node_modules",
    "prepare": "husky"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "typescript": "^5.0.0",
    "tsx": "^4.0.0",
    "tsc-alias": "^1.8.0",
    "tsc-esm-fix": "^3.0.0",
    "eslint": "^8.0.0",
    "prettier": "^3.0.0",
    "vitest": "^1.0.0",
    "husky": "^9.0.0"
  }
}
```

### tsconfig.base.json

Shared compiler options with strict mode:

```json
{
  "compilerOptions": {
    "esModuleInterop": true,
    "skipLibCheck": true,
    "target": "ES2022",
    "allowJs": true,
    "resolveJsonModule": true,
    "moduleDetection": "force",
    "isolatedModules": true,
    "verbatimModuleSyntax": true,

    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,

    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "sourceMap": true,
    "lib": ["ES2022"],

    "composite": true,
    "declaration": true,
    "declarationMap": true,

    "baseUrl": ".",
    "paths": {
      "@*": ["./src/*"]
    }
  }
}
```

**composite:true** enables project references and incremental builds.

### Root tsconfig.json

```json
{
  "files": [],
  "references": [
    { "path": "./packages/types" },
    { "path": "./packages/utils" },
    { "path": "./packages/db" },
    { "path": "./apps/api" },
    { "path": "./apps/worker" }
  ]
}
```

Order matters: packages before apps (dependency graph).

## Package Setup

### packages/types/package.json

```json
{
  "name": "@myorg/types",
  "version": "1.0.0",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "scripts": {
    "build": "tsc --build && tsc-alias && tsc-esm-fix",
    "dev": "tsc --build --watch",
    "clean": "rm -rf dist",
    "test": "vitest run"
  }
}
```

### packages/types/tsconfig.json

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "rootDir": "./src",
    "outDir": "./dist"
  },
  "include": ["src"]
}
```

### packages/db/package.json

```json
{
  "name": "@myorg/db",
  "version": "1.0.0",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "scripts": {
    "build": "tsc --build && tsc-alias && tsc-esm-fix",
    "dev": "tsc --build --watch",
    "clean": "rm -rf dist",
    "test": "vitest run"
  },
  "dependencies": {
    "@myorg/types": "workspace:*",
    "pg": "^8.11.0"
  },
  "devDependencies": {
    "@types/pg": "^8.11.0"
  }
}
```

### packages/db/tsconfig.json

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "rootDir": "./src",
    "outDir": "./dist"
  },
  "references": [
    { "path": "../types" }
  ],
  "include": ["src"]
}
```

## App Setup

### apps/api/package.json

```json
{
  "name": "@myorg/api",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "main": "./dist/index.js",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc --build && tsc-alias && tsc-esm-fix",
    "start": "node dist/index.js",
    "test": "vitest run",
    "test:watch": "vitest",
    "clean": "rm -rf dist"
  },
  "dependencies": {
    "@myorg/db": "workspace:*",
    "@myorg/types": "workspace:*",
    "@myorg/utils": "workspace:*",
    "express": "^4.18.0",
    "dotenv": "^16.0.0"
  },
  "devDependencies": {
    "@types/express": "^4.17.0"
  }
}
```

### apps/api/tsconfig.json

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "rootDir": "./src",
    "outDir": "./dist"
  },
  "references": [
    { "path": "../../packages/types" },
    { "path": "../../packages/utils" },
    { "path": "../../packages/db" }
  ],
  "include": ["src"]
}
```

## Build Commands

```bash
# Dev - single app with hot reload
pnpm dev                    # API only
pnpm dev:worker             # Worker only

# Build - all packages in dependency order
pnpm build                  # All packages + apps
pnpm build:packages         # Packages only
tsc --build                 # TypeScript incremental build

# Type-check without emit
pnpm typecheck              # One-time
pnpm typecheck:watch        # Watch mode

# Test
pnpm test                   # All packages
pnpm test:unit              # Packages only
pnpm test:api               # API only

# Clean
pnpm clean                  # Remove all dist/ + node_modules
tsc --build --clean         # Remove TS build artifacts
```

## DX Toolchain

### ESLint

```json
{
  "extends": ["uba-eslint-config"],
  "ignorePatterns": ["dist", "node_modules"]
}
```

### Prettier

```json
{
  "semi": true,
  "singleQuote": false,
  "trailingComma": "es5"
}
```

### Husky

```bash
# .husky/pre-commit
pnpm lint:fix
pnpm format
pnpm typecheck
```

## Working with Workspaces

**Add dependency to specific package:**

```bash
pnpm add express --filter @myorg/api
pnpm add -D @types/express --filter @myorg/api
```

**Add to root (shared devDeps):**

```bash
pnpm add -D -w vitest
```

**Link internal packages:**

Always use `workspace:*` in package.json, never versions.

**Run command in specific package:**

```bash
pnpm --filter @myorg/api dev
```

**Run in multiple packages:**

```bash
pnpm --filter "./packages/*" build
pnpm --filter "@myorg/{api,worker}" start
```

## CI/CD

```yaml
name: CI

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: "pnpm"

      - run: pnpm install --frozen-lockfile
      - run: pnpm typecheck
      - run: pnpm lint
      - run: pnpm test
      - run: pnpm build
```

## Key Principles

- **workspace:\*** for internal deps (converts on publish)
- **Project references** enforce dependency graph
- **Incremental builds** via tsc --build (fast)
- **ESM everywhere** with `"type": "module"`
- **Path aliases** with @/* resolved by tsc-alias
- **Strict mode** shared via tsconfig.base.json
- **Build-first** for production (tsc pipeline)
- **tsx watch** for dev (fast iteration)
