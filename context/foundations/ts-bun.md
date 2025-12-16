---
tags: [runtime, execution]
depends:
  - @context/blocks/tools/tsconfig-base.md
  - @context/blocks/tools/bun.md
---

# TypeScript: Bun Runtime

Bun runtime with native TypeScript support. Fast startup, no build step, all-in-one toolkit.

**For:** CLI tools, scripts, fastest execution

## References

@context/blocks/tools/tsconfig-base.md
@context/blocks/tools/bun.md

## Tool-Specific TypeScript Config

Extends base config with Bun runtime settings:

```json
{
  "extends": "./tsconfig.base.json",  // Or inline base settings
  "compilerOptions": {
    // === Module Settings (Bundler for Bun) ===
    "module": "Preserve",
    "moduleResolution": "bundler",

    // === No Build Output ===
    "noEmit": true,

    // === Bun-Specific ===
    "types": ["bun-types"]
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules"]
}
```

**Why these settings:**
- `module: Preserve` - Keep import/export as-is (Bun handles transformation)
- `moduleResolution: bundler` - Works with Bun's module resolution
- `noEmit: true` - No compilation, Bun runs TypeScript directly
- `types: ["bun-types"]` - Bun's built-in type definitions

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
    "dev": "bun --watch src/index.ts",
    "start": "bun src/index.ts",
    "build": "bun build src/index.ts --outdir=dist --target=bun",
    "typecheck": "tsc --noEmit",
    "test": "bun test"
  },

  "devDependencies": {
    "@types/bun": "latest",
    "typescript": "^5.0.0"
  }
}
```

**Key points:**
- No runtime dependencies (Bun is the runtime)
- `bun --watch` for development
- Optional: `bun build` for single-file executable
- `bun test` - Built-in test runner

## Execution Strategy

1. **Dev**: bun --watch (fast iteration with auto-restart)
2. **Prod**: bun src/index.ts (run TypeScript directly)
3. **Type-check**: tsc --noEmit (Bun doesn't check types)

```bash
# Development
bun dev   # bun --watch src/index.ts

# Production
bun start   # bun src/index.ts

# Type-check
bun typecheck   # tsc --noEmit
```

## When to Use

- **CLI tools** - Fast startup, single-file executables
- **Scripts** - Automation, data processing
- **Fastest execution** - Bun is faster than Node.js
- **All-in-one** - Runtime + package manager + test runner + bundler

## When NOT to Use

- **npm packages** - Consumers may not have Bun (use @context/foundations/ts-node-tsc.md)
- **Deployment restrictions** - Environment requires Node.js
- **Team not using Bun** - Stick with Node ecosystem

## CLI Tool Shebangs

For executable CLI tools, add shebang:

```typescript
#!/usr/bin/env bun
// src/cli.ts

console.log("Hello from Bun CLI!");
```

Make executable:

```bash
chmod +x src/cli.ts
```

Run directly:

```bash
./src/cli.ts
```

## Path Aliases

Bun supports path aliases natively (no tsc-alias needed):

```typescript
// Works out of the box with @/* paths from base config
import { helper } from '@/utils/helper';
```

## Built-in Features

### Test Runner

```typescript
// tests/example.test.ts
import { expect, test } from "bun:test";

test("example", () => {
  expect(2 + 2).toBe(4);
});
```

Run: `bun test`

### Environment Variables

```typescript
// Built-in .env loading
const apiKey = process.env.API_KEY;
```

Bun loads `.env` automatically.

### File I/O

```typescript
// Fast file operations
const file = Bun.file("data.json");
const data = await file.json();

// Write file
await Bun.write("output.txt", "Hello!");
```

## Folder Structure

```
my-cli/
├── src/
│   ├── index.ts           # Main entry point
│   ├── cli.ts             # CLI entry (with shebang)
│   └── utils/
│       └── helper.ts
├── tests/
│   └── example.test.ts
├── package.json
├── tsconfig.json
├── bunfig.toml            # Optional Bun config
├── .env
├── .gitignore
└── README.md
```

## .gitignore

```
node_modules/
*.log
.env
```

## Optional: Single-File Executable

Compile to standalone binary:

```bash
bun build src/index.ts --compile --outfile mycli
```

Produces `mycli` executable (no Bun runtime needed!).

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

      - uses: oven-sh/setup-bun@v1
        with:
          bun-version: latest

      - run: bun install --frozen-lockfile
      - run: bun typecheck
      - run: bun test
```

## Comparison with Node.js

| Aspect | Bun | Node.js (tsx) | Node.js (tsc) |
|--------|-----|---------------|---------------|
| Startup speed | ✅ Fastest | ⚠️ Fast | ⚠️ Slower (compiled) |
| Native TS support | ✅ Yes | ✅ Yes (tsx) | ❌ Needs build |
| Package manager | ✅ Built-in | ⚠️ Separate (pnpm) | ⚠️ Separate |
| Test runner | ✅ Built-in | ⚠️ Separate (vitest) | ⚠️ Separate |
| Ecosystem | ⚠️ Growing | ✅ Mature | ✅ Mature |
| Best for | CLI tools, scripts | Internal tools | npm packages |

## Troubleshooting

### Path aliases not working

Bun should resolve path aliases from tsconfig.json automatically. If not:

1. Verify `baseUrl` and `paths` in tsconfig.json
2. Update Bun: `bun upgrade`
3. Try explicit config: `bun --tsconfig tsconfig.json src/index.ts`

### Type errors not caught

Bun skips type-checking for speed. Always run:

```bash
tsc --noEmit   # Pre-commit hooks, CI/CD
```

### Node.js compatibility issues

Some Node.js packages may not work with Bun. Check:
- [Bun compatibility tracker](https://bun.sh/docs/runtime/nodejs-apis)
- Use Node.js if you hit compatibility issues

## Alternative Strategies

- **Need npm package artifacts?** Use @context/foundations/ts-node-tsc.md
- **Deployment requires Node.js?** Use @context/foundations/ts-node-tsx.md
- **Frontend app?** Use @context/foundations/ts-web-vite.md
