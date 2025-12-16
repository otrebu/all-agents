---
tags: [runtime, execution]
depends:
  - @context/blocks/tools/tsx.md
  - @context/blocks/tools/tsc.md
---

# TypeScript Execution: Runtime-Direct

Run TypeScript directly with tsx. No build step. For internal tools, CLIs, fast iteration.

## Strategy

1. **Dev**: tsx watch (fast iteration)
2. **Prod**: tsx src/ (run TS directly)
3. **Type-check**: tsc --noEmit (separate)

## package.json Scripts

```json
{
  "type": "module",
  "bin": {
    "mycli": "./src/cli.ts"
  },
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "start": "tsx src/index.ts",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "tsx": "^4.0.0"
  },
  "devDependencies": {
    "typescript": "^5.0.0"
  }
}
```

**tsx in dependencies** - required at runtime in prod.

## TypeScript Config

Requires typescript-config.md base. No `outDir` needed:

```json
{
  "compilerOptions": {
    "module": "NodeNext",
    "noEmit": true,
    "baseUrl": ".",
    "paths": {
      "@*": ["./src/*"]
    }
  }
}
```

**noEmit:true** - we're not compiling, just type-checking.

## When to Use

- **Internal CLIs**: Tools for your team/company
- **Scripts**: Automation, data migration, one-offs
- **Fast iteration**: Skip build step overhead
- **Prototyping**: Quick experiments

## When NOT to Use

- **npm packages**: Consumers need .js + .d.ts artifacts (use build-first)
- **Libraries**: Need distributable code
- **Performance-critical**: Build-first has faster startup

## Type-Checking

tsx does NOT type-check. Run separately:

```bash
tsc --noEmit    # Pre-commit or CI
```

OR use watch mode during dev:

```json
{
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "typecheck:watch": "tsc --noEmit --watch"
  }
}
```

Run both in parallel terminals.

## Bin Shebang

For CLI tools, add shebang:

```typescript
#!/usr/bin/env tsx
// src/cli.ts
console.log("Hello!");
```

Make executable:

```bash
chmod +x src/cli.ts
./src/cli.ts
```

## CI/CD

```yaml
# .github/workflows/test.yml
- run: pnpm typecheck
- run: pnpm test
```

No build step needed.
