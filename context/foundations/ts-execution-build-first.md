---
tags: [runtime, execution]
depends:
  - @context/blocks/tools/tsc.md
  - @context/blocks/tools/tsc-alias.md
  - @context/blocks/tools/tsc-esm-fix.md
  - @context/blocks/tools/tsx.md
  - @context/blocks/tools/node.md
---

# TypeScript Execution: Build-First

Compile TypeScript to JavaScript, then run compiled output. For distributable packages, npm libraries, production builds.

## Strategy

1. **Dev**: tsx watch (fast iteration)
2. **Build**: tsc → tsc-alias → tsc-esm-fix (compile + transform)
3. **Prod**: node dist/ (run compiled JS)

## Command Pipeline

```bash
tsc && tsc-alias && tsc-esm-fix
```

**Why this order:**

1. **tsc**: Compiles .ts → .js, BUT leaves `@/*` imports unchanged and omits .js extensions
2. **tsc-alias**: Resolves `@/*` aliases to relative paths
3. **tsc-esm-fix**: Adds .js extensions for Node ESM compliance

## package.json Scripts

```json
{
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc && tsc-alias && tsc-esm-fix",
    "start": "node dist/index.js",
    "typecheck": "tsc --noEmit"
  },
  "devDependencies": {
    "tsx": "^4.0.0",
    "typescript": "^5.0.0",
    "tsc-alias": "^1.8.0",
    "tsc-esm-fix": "^3.0.0"
  }
}
```

**tsx in devDependencies** - only used for dev, prod runs node.

## TypeScript Config

Requires typescript-config.md base with:

```json
{
  "compilerOptions": {
    "module": "NodeNext",
    "outDir": "dist",
    "declaration": true,
    "baseUrl": ".",
    "paths": {
      "@*": ["./src/*"]
    }
  }
}
```

## When to Use

- **npm packages**: Consumers need .js + .d.ts artifacts
- **Libraries**: Distributable code
- **Production builds**: Pre-compile for faster startup
- **Type declarations**: Need .d.ts files

## When NOT to Use

- **Internal tools**: runtime-direct simpler (see ts-execution-runtime-direct.md)
- **Fast prototyping**: Skip build step overhead
- **Monorepo apps**: May not need artifacts if not published

## Build Artifacts

```
dist/
├── index.js           # Compiled JS
├── index.d.ts         # Type declarations
├── index.d.ts.map     # Sourcemap for types
└── index.js.map       # Runtime sourcemap
```

Commit dist/ if publishing to npm, gitignore if not.

## CI/CD

```yaml
# .github/workflows/release.yml
- run: pnpm build
- run: pnpm test
- run: npm publish
```

Build artifacts required for npm publish.
