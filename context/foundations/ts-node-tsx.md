---
tags: [runtime, execution]
depends:
  - @context/blocks/tools/tsconfig-base.md
  - @context/blocks/tools/tsx.md
  - @context/blocks/tools/tsc.md
  - @context/blocks/tools/node.md
---

# TypeScript: Node.js via Direct Execution

Node.js runtime with tsx. Run TypeScript directly, no build step.

**For:** Internal tools, CLIs, scripts, fast iteration

## References

@context/blocks/tools/tsconfig-base.md

## Tool-Specific TypeScript Config

Extends base config with runtime execution settings:

```json
{
  "extends": "./tsconfig.base.json",  // Or inline base settings
  "compilerOptions": {
    // === Module Settings (Bundler for tsx) ===
    "module": "Preserve",
    "moduleResolution": "bundler",

    // === No Build Output ===
    "noEmit": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules"]
}
```

**Why these settings:**
- `module: Preserve` - Keep import/export as-is (tsx handles transformation)
- `moduleResolution: bundler` - Works with tsx's module resolution
- `noEmit: true` - No compilation, just type-checking

## Complete package.json

```json
{
  "name": "my-cli",
  "version": "1.0.0",
  "type": "module",

  "bin": {
    "mycli": "./src/cli.ts"
  },

  "scripts": {
    "dev": "tsx watch src/index.ts",
    "start": "tsx src/index.ts",
    "typecheck": "tsc --noEmit",
    "typecheck:watch": "tsc --noEmit --watch"
  },

  "dependencies": {
    "tsx": "^4.0.0"
  },

  "devDependencies": {
    "typescript": "^5.0.0",
    "@types/node": "^20.0.0"
  }
}
```

**Key points:**
- `tsx` in **dependencies** (required at runtime in production)
- `bin` field points directly to `.ts` file
- No build scripts needed

## Execution Strategy

1. **Dev**: tsx watch (fast iteration with auto-restart)
2. **Prod**: tsx src/index.ts (run TypeScript directly)
3. **Type-check**: tsc --noEmit (separate step, tsx doesn't check types)

```bash
# Development
pnpm dev   # tsx watch src/index.ts

# Production
pnpm start   # tsx src/index.ts

# Type-check
pnpm typecheck   # tsc --noEmit
```

## When to Use

- **Internal CLIs** - Tools for your team/company
- **Scripts** - Automation, data migration, one-offs
- **Fast iteration** - Skip build step overhead
- **Prototyping** - Quick experiments
- **Monorepo apps** - Not published, no artifacts needed

## When NOT to Use

- **npm packages** - Consumers need `.js` + `.d.ts` (use @context/foundations/ts-node-tsc.md)
- **Libraries** - Need distributable code
- **Performance-critical** - Build-first has faster cold starts

## Type-Checking

**Important:** tsx does NOT type-check. Run tsc separately:

```bash
# Pre-commit or CI
tsc --noEmit
```

**During development:** Run both in parallel terminals:

```bash
# Terminal 1
pnpm dev   # tsx watch src/index.ts

# Terminal 2
pnpm typecheck:watch   # tsc --noEmit --watch
```

## CLI Tool Shebangs

For executable CLI tools, add shebang to entry file:

```typescript
#!/usr/bin/env tsx
// src/cli.ts

console.log("Hello from CLI!");
```

Make executable:

```bash
chmod +x src/cli.ts
```

Now you can run directly:

```bash
./src/cli.ts
```

Or via npm bin:

```bash
pnpm mycli
```

## Path Aliases

tsx supports path aliases natively (no tsc-alias needed):

```typescript
// Works out of the box with @/* paths from base config
import { helper } from '@/utils/helper';
```

## Folder Structure

```
my-cli/
├── src/
│   ├── index.ts           # Main entry point
│   ├── cli.ts             # CLI entry (with shebang)
│   ├── commands/
│   │   └── hello.ts
│   └── utils/
│       └── helper.ts
├── package.json
├── tsconfig.json
├── .gitignore
└── README.md
```

No `dist/` folder needed.

## .gitignore

```
node_modules/
*.log
.env
```

## CI/CD Example

```yaml
# .github/workflows/test.yml
name: Test

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v2
        with:
          version: 8

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm

      - run: pnpm install --frozen-lockfile
      - run: pnpm typecheck   # Type-check
      - run: pnpm test        # Tests

# No build step needed
```

## Troubleshooting

### Path aliases not working

tsx should resolve path aliases from tsconfig.json automatically. If not working:

1. Verify `baseUrl` and `paths` in tsconfig.json
2. Ensure you're using tsx v4.0.0+
3. Try explicit paths:

```bash
tsx --tsconfig tsconfig.json src/index.ts
```

### Slow startup

tsx has some overhead vs compiled JS. For production at scale, consider:
- Use @context/foundations/ts-node-tsc.md (compile first)
- Or use @context/foundations/ts-bun.md (faster runtime)

### Type errors not caught

tsx skips type-checking for speed. Always run `tsc --noEmit` in:
- Pre-commit hooks
- CI/CD pipeline
- During development (watch mode in parallel terminal)

## Comparison with Build-First

| Aspect | tsx (runtime-direct) | tsc (build-first) |
|--------|---------------------|-------------------|
| Dev speed | ✅ Instant | ⚠️ Needs rebuild |
| Prod startup | ⚠️ Slower | ✅ Fast (pre-compiled) |
| Build step | ✅ None | ⚠️ Required |
| Type-checking | ⚠️ Separate | ✅ During build |
| npm package | ❌ No artifacts | ✅ .js + .d.ts |
| Best for | Internal tools, CLIs | Libraries, packages |

## Alternative Strategies

- **Need build artifacts?** Use @context/foundations/ts-node-tsc.md
- **Want faster runtime?** Use @context/foundations/ts-bun.md
- **Frontend app?** Use @context/foundations/ts-web-vite.md
