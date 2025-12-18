---
depends: []
---

# tsx - TypeScript Execution

Node.js loader that runs TypeScript directly via just-in-time transpilation. Fast, ESM-first alternative to ts-node.

## What tsx Is

- **Node.js loader**: Uses Node's --loader API to transform TS on-the-fly
- **JIT transpilation**: Compiles TypeScript to JavaScript in-memory (no build artifacts)
- **Zero config**: Works out of the box with reasonable defaults
- **ESM-first**: Native ESM support, no CommonJS compatibility issues

## Commands

```bash
tsx src/index.ts              # Run once
tsx watch src/index.ts        # Watch mode - reruns on file changes
```

**package.json scripts:**

```json
{
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "start": "tsx src/index.ts"
  }
}
```

## When to Use

- **Development iteration**: Fast feedback loop during coding
- **Internal tools**: Scripts, CLIs, automation tools
- **Runtime-direct strategy**: Run TS in prod without build step
- **Prototyping**: Quick experimentation without build setup

## When NOT to Use

- **npm packages**: Libraries need compiled artifacts (.js + .d.ts) for consumers
- **Distributable apps**: If users expect pre-built binaries
- **Build-first strategy**: When you're already using tsc for production

## Features

**Path aliases** - Native support for tsconfig paths:

```json
// tsconfig.json
{
  "compilerOptions": {
    "paths": {
      "@*": ["./src/*"]
    }
  }
}
```

```typescript
// Just works with tsx
import { foo } from "@utils/bar";
```

**ESM support** - Handles .ts imports naturally:

```typescript
// No .js extensions needed with tsx
import { helper } from "./utils/helper";
```

**TypeScript features** - Supports all TS syntax (types, generics, decorators, etc.)

## vs ts-node

- **Faster**: No type-checking during execution (use `tsc --noEmit` separately)
- **ESM-first**: Better ESM support than ts-node
- **Simpler**: Less configuration needed
- **Maintained**: Active development, modern Node.js features

## Dependencies

**If using runtime-direct strategy (tsx in prod):**

```bash
pnpm add tsx    # dependencies, not devDependencies
```

**If using only for dev (tsc for prod):**

```bash
pnpm add -D tsx    # devDependencies
```

## Type-Checking

tsx does NOT type-check. Run tsc separately:

```json
{
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "typecheck": "tsc --noEmit"
  }
}
```

Run `typecheck` before commits or in CI.
