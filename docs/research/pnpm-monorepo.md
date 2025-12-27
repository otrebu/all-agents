# pnpm Monorepo Patterns

> Comprehensive guide to advanced monorepo architecture with pnpm workspaces

## Table of Contents

- [Overview](#overview)
- [Project Structure Patterns](#project-structure-patterns)
- [Workspace Configuration](#workspace-configuration)
- [Package Organization](#package-organization)
- [Internal Package References](#internal-package-references)
- [Shared Configurations](#shared-configurations)
- [Dependency Management](#dependency-management)
- [Version Management Strategies](#version-management-strategies)
- [Publishing from Monorepo](#publishing-from-monorepo)
- [CI/CD Patterns](#cicd-patterns)
- [Performance Optimization](#performance-optimization)
- [Docker Integration](#docker-integration)
- [Build Orchestration Tools](#build-orchestration-tools)
- [Real-World Examples](#real-world-examples)
- [Best Practices & Pitfalls](#best-practices--pitfalls)
- [Sources](#sources)

---

## Overview

pnpm provides built-in support for monorepos through its workspace feature. Unlike npm or Yarn, pnpm uses a unique content-addressable store that creates hard links to shared dependencies, providing:

- **60-80% reduction** in disk usage compared to traditional approaches
- **3-5x faster** installation times through intelligent caching and linking
- **Strict dependency management** preventing phantom dependencies and version conflicts

### Why pnpm for Monorepos?

| Feature | pnpm | npm/Yarn |
|---------|------|----------|
| Disk efficiency | Hard links to shared store | Duplicated per project |
| Phantom dependencies | Prevented by strict `node_modules` | Possible due to hoisting |
| Installation speed | Fastest | Slower |
| Native workspace support | Built-in | Requires configuration |

---

## Project Structure Patterns

### App-Centric Structure (Most Common)

This pattern organizes code into deployable applications and shared packages:

```
my-monorepo/
├── apps/                          # Deployable applications
│   ├── web/                       # Next.js or React app
│   │   ├── src/
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── mobile/                    # React Native app
│   ├── api/                       # Backend service
│   └── storybook/                 # Documentation site
│
├── packages/                      # Shared internal packages
│   ├── ui/                        # Component library
│   │   ├── src/
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── utils/                     # Shared utilities
│   ├── types/                     # Shared TypeScript types
│   ├── api-client/                # API client library
│   ├── hooks/                     # Shared React hooks
│   ├── eslint-config/             # Shared ESLint config
│   └── typescript-config/         # Shared TypeScript config
│
├── pnpm-workspace.yaml            # Workspace definition
├── turbo.json                     # Turborepo configuration (optional)
├── package.json                   # Root package.json
├── pnpm-lock.yaml                 # Single lockfile
└── .npmrc                         # pnpm configuration
```

### Package-Centric Structure

For library authors publishing multiple related packages:

```
my-library/
├── packages/
│   ├── core/                      # @mylib/core
│   ├── react/                     # @mylib/react
│   ├── vue/                       # @mylib/vue
│   └── cli/                       # @mylib/cli
├── examples/                      # Example applications
│   ├── react-example/
│   └── vue-example/
└── docs/                          # Documentation site
```

### Domain-Driven Structure

For large enterprise applications:

```
enterprise-app/
├── apps/
│   └── main-app/
├── packages/
│   ├── shared/                    # Cross-domain shared code
│   │   ├── ui/
│   │   └── utils/
│   └── domains/                   # Domain-specific packages
│       ├── auth/
│       ├── billing/
│       └── orders/
└── tools/                         # Internal development tools
```

---

## Workspace Configuration

### pnpm-workspace.yaml

The workspace root must contain a `pnpm-workspace.yaml` file:

```yaml
# pnpm-workspace.yaml
packages:
  # All packages in apps and packages directories
  - 'apps/*'
  - 'packages/*'

  # Nested feature directories
  - 'packages/domains/**'

  # Exclude specific directories
  - '!**/test/**'
  - '!**/examples/**'
```

### Root package.json

```json
{
  "name": "my-monorepo",
  "private": true,
  "packageManager": "pnpm@9.15.0",
  "scripts": {
    "build": "turbo run build",
    "dev": "turbo run dev",
    "lint": "turbo run lint",
    "test": "turbo run test",
    "typecheck": "turbo run typecheck",
    "clean": "turbo run clean && rm -rf node_modules",
    "preinstall": "npx only-allow pnpm"
  },
  "devDependencies": {
    "turbo": "^2.3.0"
  },
  "engines": {
    "node": ">=20",
    "pnpm": ">=9"
  }
}
```

### .npmrc Configuration

```ini
# .npmrc - pnpm configuration

# Use a single lockfile for the entire workspace
shared-workspace-lockfile=true

# Only resolve local deps with workspace: protocol (explicit linking)
link-workspace-packages=false

# Automatically install peer dependencies
auto-install-peers=true

# Deduplicate peer dependencies when possible
dedupe-peer-dependents=true

# Resolve peers from workspace root
resolve-peers-from-workspace-root=true

# Strict peer dependencies (optional, for stricter checks)
# strict-peer-dependencies=true

# Hoist specific packages to root (use sparingly)
# public-hoist-pattern[]=*eslint*
# public-hoist-pattern[]=*prettier*

# Never use shamefully-hoist in monorepos - causes phantom dependencies
# shamefully-hoist=false
```

---

## Package Organization

### App Package Example

```json
// apps/web/package.json
{
  "name": "@myorg/web",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint .",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@myorg/ui": "workspace:*",
    "@myorg/utils": "workspace:*",
    "@myorg/api-client": "workspace:^",
    "next": "^15.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "devDependencies": {
    "@myorg/eslint-config": "workspace:*",
    "@myorg/typescript-config": "workspace:*",
    "@types/react": "^19.0.0",
    "typescript": "^5.7.0"
  }
}
```

### Library Package Example

```json
// packages/ui/package.json
{
  "name": "@myorg/ui",
  "version": "1.0.0",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./src/index.ts",
      "default": "./dist/index.js"
    },
    "./button": {
      "types": "./src/button/index.ts",
      "default": "./dist/button/index.js"
    }
  },
  "files": ["dist"],
  "scripts": {
    "build": "tsup src/index.ts --format esm --dts",
    "dev": "tsup src/index.ts --format esm --dts --watch",
    "lint": "eslint src/",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@myorg/utils": "workspace:*"
  },
  "peerDependencies": {
    "react": "^18.0.0 || ^19.0.0",
    "react-dom": "^18.0.0 || ^19.0.0"
  },
  "devDependencies": {
    "@myorg/typescript-config": "workspace:*",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "tsup": "^8.0.0",
    "typescript": "^5.7.0"
  }
}
```

---

## Internal Package References

### Workspace Protocol

pnpm's `workspace:` protocol ensures dependencies resolve to local workspace packages:

```json
{
  "dependencies": {
    // Always use latest local version
    "@myorg/utils": "workspace:*",

    // Caret range (compatible versions)
    "@myorg/core": "workspace:^",

    // Tilde range (patch versions)
    "@myorg/types": "workspace:~",

    // Alias a package
    "utils": "workspace:@myorg/utils@*"
  }
}
```

### Publishing Behavior

When publishing, `workspace:` protocols are automatically replaced:

```json
// Before publishing (in repo)
{
  "dependencies": {
    "@myorg/utils": "workspace:*",
    "@myorg/core": "workspace:^",
    "@myorg/types": "workspace:~"
  }
}

// After publishing (on npm) - assuming v1.5.0
{
  "dependencies": {
    "@myorg/utils": "1.5.0",
    "@myorg/core": "^1.5.0",
    "@myorg/types": "~1.5.0"
  }
}
```

### Best Practices

```bash
# Add a workspace dependency
pnpm add @myorg/utils --filter @myorg/web --workspace

# The --workspace flag ensures workspace: protocol is used
# Result in package.json: "@myorg/utils": "workspace:*"
```

---

## Shared Configurations

### ESLint Configuration Package

```
packages/eslint-config/
├── package.json
├── base.js
├── react.js
├── next.js
└── node.js
```

```json
// packages/eslint-config/package.json
{
  "name": "@myorg/eslint-config",
  "version": "1.0.0",
  "type": "module",
  "exports": {
    "./base": "./base.js",
    "./react": "./react.js",
    "./next": "./next.js",
    "./node": "./node.js"
  },
  "dependencies": {
    "@eslint/js": "^9.0.0",
    "eslint-plugin-import": "^2.30.0",
    "eslint-plugin-react": "^7.37.0",
    "eslint-plugin-react-hooks": "^5.0.0",
    "typescript-eslint": "^8.0.0",
    "globals": "^15.0.0"
  },
  "peerDependencies": {
    "eslint": "^9.0.0",
    "typescript": "^5.0.0"
  }
}
```

```javascript
// packages/eslint-config/base.js
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';

export default [
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.es2024,
      },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
];
```

```javascript
// packages/eslint-config/react.js
import base from './base.js';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import globals from 'globals';

export default [
  ...base,
  {
    plugins: {
      react: reactPlugin,
      'react-hooks': reactHooksPlugin,
    },
    languageOptions: {
      globals: {
        ...globals.browser,
      },
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
    rules: {
      ...reactPlugin.configs.recommended.rules,
      ...reactHooksPlugin.configs.recommended.rules,
      'react/react-in-jsx-scope': 'off',
    },
  },
];
```

**Usage in apps:**

```javascript
// apps/web/eslint.config.js
import reactConfig from '@myorg/eslint-config/react';

export default [
  ...reactConfig,
  {
    ignores: ['.next/**'],
  },
];
```

### TypeScript Configuration Package

```
packages/typescript-config/
├── package.json
├── base.json
├── react-library.json
├── nextjs.json
└── node.json
```

```json
// packages/typescript-config/package.json
{
  "name": "@myorg/typescript-config",
  "version": "1.0.0",
  "files": ["*.json"]
}
```

```json
// packages/typescript-config/base.json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "compilerOptions": {
    "strict": true,
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noUncheckedIndexedAccess": true,
    "noEmit": true
  }
}
```

```json
// packages/typescript-config/react-library.json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "extends": "./base.json",
  "compilerOptions": {
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "jsx": "react-jsx",
    "declaration": true,
    "declarationMap": true
  }
}
```

**Usage in packages:**

```json
// packages/ui/tsconfig.json
{
  "extends": "@myorg/typescript-config/react-library.json",
  "compilerOptions": {
    "outDir": "dist"
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
}
```

---

## Dependency Management

### pnpm Catalogs (v9.5+)

Catalogs enable centralized version management across the workspace:

```yaml
# pnpm-workspace.yaml
packages:
  - 'apps/*'
  - 'packages/*'

# Default catalog
catalog:
  react: ^19.0.0
  react-dom: ^19.0.0
  typescript: ^5.7.0
  vite: ^6.0.0

# Named catalogs for migration scenarios
catalogs:
  react18:
    react: ^18.3.1
    react-dom: ^18.3.1
  react19:
    react: ^19.0.0
    react-dom: ^19.0.0
```

**Usage in package.json:**

```json
{
  "dependencies": {
    // Uses default catalog
    "react": "catalog:",
    "react-dom": "catalog:",

    // Uses named catalog
    "typescript": "catalog:default",

    // For React 18 legacy apps
    // "react": "catalog:react18"
  }
}
```

**Catalog settings:**

```yaml
# pnpm-workspace.yaml settings
settings:
  # Enforce catalog usage
  catalogMode: strict

  # Auto-cleanup unused catalog entries
  cleanupUnusedCatalogs: true
```

### Overrides for Version Enforcement

```json
// Root package.json
{
  "pnpm": {
    "overrides": {
      // Force all packages to use same React version
      "react": "^19.0.0",
      "react-dom": "^19.0.0",

      // Fix security vulnerability in nested dependency
      "lodash": "^4.17.21",

      // Remove unused nested dependency
      "unused-package": "-"
    }
  }
}
```

### Peer Dependencies Strategy

```json
// packages/ui/package.json - Shared component library
{
  "peerDependencies": {
    "react": "^18.0.0 || ^19.0.0",
    "react-dom": "^18.0.0 || ^19.0.0"
  },
  "peerDependenciesMeta": {
    "react-dom": {
      "optional": true
    }
  },
  "devDependencies": {
    // Install for development/testing
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  }
}
```

---

## Version Management Strategies

### Independent Versioning (Recommended for Libraries)

Each package has its own version, managed independently:

```json
// packages/core/package.json
{ "name": "@myorg/core", "version": "2.1.0" }

// packages/utils/package.json
{ "name": "@myorg/utils", "version": "1.5.3" }
```

**Pros:**
- Only bump versions for packages that changed
- More granular control for consumers
- Common in library ecosystems (e.g., Gatsby)

**Cons:**
- More complex dependency tracking
- Harder to coordinate breaking changes

### Fixed Versioning

All packages share the same version:

```json
// packages/core/package.json
{ "name": "@myorg/core", "version": "5.0.0" }

// packages/utils/package.json
{ "name": "@myorg/utils", "version": "5.0.0" }
```

**Pros:**
- Simple mental model
- Easy to track compatible versions
- Common in framework ecosystems (e.g., Babel)

**Cons:**
- Must release all packages together
- Version bumps even for unchanged packages

---

## Publishing from Monorepo

### Changesets Integration

Changesets is the recommended tool for version management and publishing:

```bash
# Install changesets
pnpm add -Dw @changesets/cli

# Initialize
pnpm changeset init
```

```json
// .changeset/config.json
{
  "$schema": "https://unpkg.com/@changesets/config@3.0.0/schema.json",
  "changelog": "@changesets/cli/changelog",
  "commit": false,
  "fixed": [],
  "linked": [["@myorg/core", "@myorg/utils"]],
  "access": "public",
  "baseBranch": "main",
  "updateInternalDependencies": "patch",
  "ignore": ["@myorg/web", "@myorg/api"]
}
```

### Release Workflow

```bash
# 1. Create a changeset (run when making changes)
pnpm changeset
# Interactive prompt to select packages and version bump type

# 2. Version packages (updates package.json and CHANGELOG.md)
pnpm changeset version

# 3. Update lockfile
pnpm install

# 4. Commit version changes
git add .
git commit -m "chore: version packages"

# 5. Publish to npm
pnpm publish -r --access public

# 6. Push tags
git push --follow-tags
```

### GitHub Action for Automated Releases

```yaml
# .github/workflows/release.yml
name: Release

on:
  push:
    branches: [main]

concurrency: ${{ github.workflow }}-${{ github.ref }}

jobs:
  release:
    name: Release
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - uses: pnpm/action-setup@v4
        with:
          version: 9

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'
          registry-url: 'https://registry.npmjs.org'

      - run: pnpm install --frozen-lockfile

      - name: Create Release Pull Request or Publish
        uses: changesets/action@v1
        with:
          publish: pnpm publish -r
          version: pnpm changeset version
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
```

### Prereleases

```bash
# Enter prerelease mode
pnpm changeset pre enter next

# Create changesets and version as normal
pnpm changeset
pnpm changeset version

# Publish with prerelease tag
pnpm publish -r --tag next

# Exit prerelease mode
pnpm changeset pre exit
```

---

## CI/CD Patterns

### GitHub Actions with pnpm Caching

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0  # Needed for affected commands

      - uses: pnpm/action-setup@v4
        with:
          version: 9

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Lint
        run: pnpm lint

      - name: Type check
        run: pnpm typecheck

      - name: Test
        run: pnpm test

      - name: Build
        run: pnpm build
```

### Turborepo Remote Caching

```yaml
# .github/workflows/ci.yml (with Turbo remote cache)
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4
        with:
          version: 9

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'

      - run: pnpm install --frozen-lockfile

      - name: Build with Turbo cache
        run: pnpm turbo build lint test
        env:
          TURBO_TOKEN: ${{ secrets.TURBO_TOKEN }}
          TURBO_TEAM: ${{ vars.TURBO_TEAM }}
```

### Filtering Affected Packages

```yaml
# Run only for affected packages
- name: Test affected packages
  run: pnpm turbo test --filter="...[origin/main]"

# Or with pnpm native filtering
- name: Test affected
  run: pnpm --filter="...[origin/main]" test
```

---

## Performance Optimization

### Turborepo Configuration

```json
// turbo.json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "inputs": ["$TURBO_DEFAULT$", ".env*"],
      "outputs": ["dist/**", ".next/**", "!.next/cache/**"]
    },
    "lint": {
      "dependsOn": ["^build"],
      "inputs": ["$TURBO_DEFAULT$", ".eslintrc*", "eslint.config.*"],
      "outputs": []
    },
    "typecheck": {
      "dependsOn": ["^build"],
      "inputs": ["$TURBO_DEFAULT$", "tsconfig.json"],
      "outputs": []
    },
    "test": {
      "dependsOn": ["build"],
      "inputs": ["$TURBO_DEFAULT$", "vitest.config.*"],
      "outputs": ["coverage/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "clean": {
      "cache": false
    }
  },
  "globalDependencies": [
    ".env",
    "pnpm-lock.yaml"
  ],
  "globalEnv": [
    "NODE_ENV",
    "CI"
  ]
}
```

### Filtering Strategies

```bash
# Turborepo filters
turbo build --filter=@myorg/web              # Specific package
turbo build --filter=@myorg/web...           # Package + dependencies
turbo build --filter=...@myorg/ui            # Package + dependents
turbo build --filter="./apps/*"              # Directory glob
turbo build --filter="[HEAD^1]"              # Changed since last commit
turbo build --filter="[main...feature]"      # Changed between branches

# pnpm filters (for pnpm commands)
pnpm --filter @myorg/web dev                 # Run in specific package
pnpm --filter "@myorg/*" build               # Wildcard match
pnpm --filter "...@myorg/ui" test            # Package + dependents
pnpm --filter "...[origin/main]" test        # Changed packages + dependents
```

### Remote Caching Setup

```bash
# Login to Vercel (free remote cache)
pnpm dlx turbo login

# Link repository
pnpm dlx turbo link

# Or use environment variables for CI
export TURBO_TOKEN=your_token
export TURBO_TEAM=your_team
```

### Performance Results

With proper caching:
- Cold builds: Full execution time
- Warm builds (cache hit): **<1 second** for unchanged packages
- CI time reduction: Up to **85%** for typical workflows

---

## Docker Integration

### Optimized Dockerfile Pattern

```dockerfile
# Dockerfile
FROM node:20-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

FROM base AS deps
WORKDIR /app

# Copy only lockfile first for better layer caching
COPY pnpm-lock.yaml ./

# Fetch packages into virtual store
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm fetch

# Copy workspace config and all package.json files
COPY pnpm-workspace.yaml ./
COPY package.json ./
COPY apps/web/package.json ./apps/web/
COPY packages/ui/package.json ./packages/ui/
COPY packages/utils/package.json ./packages/utils/

# Install dependencies offline
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --offline --frozen-lockfile

FROM deps AS builder
WORKDIR /app

# Copy source code
COPY . .

# Build all packages
RUN pnpm build --filter=@myorg/web...

FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

# Copy only production artifacts
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /app/apps/web/public ./apps/web/public

EXPOSE 3000
CMD ["node", "apps/web/server.js"]
```

### Using pnpm deploy

For production-optimized deployments:

```dockerfile
FROM node:20-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

FROM base AS builder
WORKDIR /app
COPY . .
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile
RUN pnpm build --filter=@myorg/web...

# Use pnpm deploy to create optimized production package
RUN pnpm deploy --filter=@myorg/web --prod /prod/web

FROM base AS runner
WORKDIR /app

COPY --from=builder /prod/web ./

EXPOSE 3000
CMD ["node", "server.js"]
```

### Turbo Prune for Minimal Docker Context

```dockerfile
FROM node:20-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
RUN pnpm add -g turbo

FROM base AS pruner
WORKDIR /app
COPY . .
RUN turbo prune @myorg/web --docker

FROM base AS installer
WORKDIR /app

# Copy pruned lockfile and package.json files
COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/out/pnpm-lock.yaml ./pnpm-lock.yaml

RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile

# Copy pruned source
COPY --from=pruner /app/out/full/ .
RUN pnpm turbo build --filter=@myorg/web...

FROM base AS runner
WORKDIR /app
COPY --from=installer /app/apps/web/.next/standalone ./
COPY --from=installer /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=installer /app/apps/web/public ./apps/web/public

EXPOSE 3000
CMD ["node", "apps/web/server.js"]
```

---

## Build Orchestration Tools

### Turborepo

The most popular choice for pnpm monorepos:

```bash
# Install
pnpm add -Dw turbo

# Run tasks
pnpm turbo build          # Build all packages
pnpm turbo build --filter=@myorg/web  # Build specific package
pnpm turbo dev            # Development mode
pnpm turbo watch build    # Watch mode (v2.0.4+)
```

### Nx

Alternative with advanced features:

```bash
# Add Nx to existing pnpm workspace
pnpm dlx nx@latest init

# Run affected commands
pnpm nx affected --target=build
pnpm nx affected --target=test

# Visualize dependency graph
pnpm nx graph
```

### Comparison

| Feature | Turborepo | Nx |
|---------|-----------|-----|
| Setup complexity | Simple | More complex |
| Remote caching | Vercel (free) | Nx Cloud |
| Affected commands | Filter-based | Built-in |
| Generators | No | Yes |
| Plugins | Limited | Extensive |
| Best for | Build orchestration | Full monorepo toolkit |

---

## Real-World Examples

### Major Projects Using pnpm Workspaces

| Project | Repository | Notes |
|---------|------------|-------|
| Vue.js | [vuejs/core](https://github.com/vuejs/core) | Framework core |
| Vite | [vitejs/vite](https://github.com/vitejs/vite) | Build tool |
| Nuxt | [nuxt/nuxt](https://github.com/nuxt/nuxt) | Vue framework |
| Astro | [withastro/astro](https://github.com/withastro/astro) | Static site generator |
| Next.js | [vercel/next.js](https://github.com/vercel/next.js) | React framework |
| Material UI | [mui/material-ui](https://github.com/mui/material-ui) | Component library |

### Reference Implementations

- [belgattitude/nextjs-monorepo-example](https://github.com/belgattitude/nextjs-monorepo-example) - Comprehensive Next.js monorepo
- [turbo/examples](https://github.com/vercel/turborepo/tree/main/examples) - Official Turborepo examples
- [vue3-pnpm-workspace](https://github.com/ghiscoding/vue3-pnpm-workspace) - Vue 3 workspace boilerplate

---

## Best Practices & Pitfalls

### Do's

1. **Always use `workspace:*` protocol** for internal dependencies
2. **Keep versions consistent** across the workspace using catalogs or overrides
3. **Use peer dependencies** for shared libraries like React
4. **Run shared packages in watch mode** during development
5. **Enforce pnpm usage** with `preinstall` script
6. **Cache aggressively** in CI with Turborepo
7. **Keep packages small and focused** - easier to maintain and cache

### Don'ts

1. **Never use `shamefully-hoist`** - causes phantom dependencies
2. **Avoid circular dependencies** between packages
3. **Don't duplicate devDependencies** - hoist to root when possible
4. **Don't skip the lockfile** in CI - use `--frozen-lockfile`
5. **Don't commit node_modules** or the pnpm store
6. **Avoid mixing ESM and CJS** unnecessarily

### Common Pitfalls

| Problem | Solution |
|---------|----------|
| ESLint can't find plugins | Use shared config package with all dependencies |
| TypeScript can't resolve workspace packages | Check `exports` field and tsconfig paths |
| Build order issues | Use Turborepo with proper `dependsOn` |
| Docker builds are slow | Use `pnpm fetch` and BuildKit cache mounts |
| CI cache misses | Ensure lockfile hash is part of cache key |
| React version conflicts | Use peer dependencies in shared packages |

---

## Sources

### Official Documentation
- [pnpm Workspaces](https://pnpm.io/workspaces)
- [pnpm Catalogs](https://pnpm.io/catalogs)
- [pnpm Filtering](https://pnpm.io/filtering)
- [pnpm Docker](https://pnpm.io/docker)
- [pnpm Using Changesets](https://pnpm.io/using-changesets)
- [Turborepo Documentation](https://turborepo.com/docs)
- [Turborepo ESLint Guide](https://turborepo.com/docs/guides/tools/eslint)
- [Turborepo TypeScript Guide](https://turborepo.com/docs/guides/tools/typescript)
- [Turborepo Remote Caching](https://turborepo.com/docs/core-concepts/remote-caching)
- [Turborepo GitHub Actions](https://turborepo.com/docs/guides/ci-vendors/github-actions)

### Guides & Tutorials
- [Complete Monorepo Guide: pnpm + Workspace + Changesets (2025)](https://jsdev.space/complete-monorepo-guide/)
- [Mastering pnpm Workspaces](https://blog.glen-thomas.com/software%20engineering/2025/10/02/mastering-pnpm-workspaces-complete-guide-to-monorepo-management.html)
- [How to Bootstrap a Monorepo with PNPM](https://www.wisp.blog/blog/how-to-bootstrap-a-monorepo-with-pnpm-a-complete-guide)
- [Setup a Monorepo with PNPM workspaces and Nx](https://nx.dev/blog/setup-a-monorepo-with-pnpm-workspaces-and-speed-it-up-with-nx)
- [How we configured pnpm and Turborepo](https://nhost.io/blog/how-we-configured-pnpm-and-turborepo-for-our-monorepo)
- [Building a faster CI pipeline with Turborepo and pnpm](https://www.tinybird.co/blog/frontend-ci-monorepo-turborepo-pnpm)
- [Configure pnpm for the best possible developer experience](https://adamcoster.com/blog/pnpm-config)

### GitHub Repositories
- [belgattitude/nextjs-monorepo-example](https://github.com/belgattitude/nextjs-monorepo-example)
- [changesets/changesets](https://github.com/changesets/changesets)
- [azakharo/turborepo-starter](https://github.com/azakharo/turborepo-starter)
- [bakeruk/modern-typescript-monorepo-example](https://github.com/bakeruk/modern-typescript-monorepo-example)

### Articles
- [Versioning and Releasing Packages in a Monorepo](https://nx.dev/blog/versioning-and-releasing-packages-in-a-monorepo)
- [pnpm 9.5 Introduces Catalogs](https://socket.dev/blog/pnpm-9-5-introduces-catalogs-shareable-dependency-version-specifiers)
- [Peer dependencies in a pnpm monorepo](https://wmyers.github.io/technical/js/monorepo/Peer-dependencies-in-a-pnpm-monorepo/)
