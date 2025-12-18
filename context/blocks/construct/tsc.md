---
depends: []
---

# tsc - TypeScript Compiler

TypeScript's official compiler for type-checking and building JavaScript output.

## Commands

**Type-checking (no output):**

```bash
tsc --noEmit              # Check types once
tsc --watch --noEmit      # Watch mode
```

**Building:**

```bash
tsc                       # Compile to JS (uses tsconfig outDir)
tsc --build               # Build with project references (monorepos)
```

## When to Use

- Type safety enforcement in CI/CD
- Building distributable npm packages
- Monorepo incremental builds (with project references)
- Generating .d.ts declaration files

## When NOT to Use

- Bundled frontend apps (Vite/Webpack compile TS)
- Development iteration (tsx is faster)
- Production runtime if using tsx directly

## Limitations

**Path aliases** (`@/*`) are NOT resolved in output. Use tsc-alias after compilation.

**ESM imports** won't have .js extensions. Use tsc-esm-fix for Node ESM compatibility.

**No bundling** - outputs 1:1 .ts to .js files. Use bundler (esbuild/Vite) if needed.

## Type-Checking vs Building

Type-checking with `--noEmit` is fast and safe for CI. Building generates .js files and requires resolving module paths for runtime.

## Project References

Monorepos with TypeScript can use project references for incremental builds across packages:

```bash
tsc --build               # Builds only changed packages
tsc --build --clean       # Clean all outputs
```

Requires `composite: true` in each package's tsconfig.json.

## Configuration

Controlled by tsconfig.json. See typescript-config.md for base setup.
