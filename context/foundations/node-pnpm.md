---
tags: [runtime, platform]
depends:
  - @context/blocks/tools/node.md
  - @context/blocks/tools/pnpm.md
---

# Node + pnpm Platform

Traditional Node.js runtime with pnpm package management. Foundation for TypeScript projects with ESM + path aliases.

## When to Use

- Enterprise requiring Node LTS support
- Full ecosystem compatibility needed
- Mature tooling requirements
- Projects needing maximum compatibility

## When NOT to Use

- Greenfield projects prioritizing speed (use Bun)
- Simple CLI tools (Bun simpler)

## Why pnpm over npm/yarn

- **Disk efficiency**: Shared store, symlinked to node_modules
- **Speed**: Faster installs than npm/yarn
- **Strictness**: No phantom dependencies by default
- **Monorepo support**: First-class workspaces

## package.json Structure

### ESM Setup

```json
{
  "type": "module"
}
```

Required for ESM. Enables `.js` files treated as modules, `import/export` syntax, `__dirname` unavailable (use `import.meta.url`).

### Key Fields

**For applications:**

```json
{
  "name": "my-app",
  "version": "1.0.0",
  "type": "module",
  "main": "./dist/index.js",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc && tsc-alias && tsc-esm-fix",
    "start": "node dist/index.js"
  }
}
```

**For libraries:**

```json
{
  "name": "@myorg/lib",
  "version": "1.0.0",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    }
  },
  "files": ["dist"]
}
```

**For CLIs:**

```json
{
  "name": "my-cli",
  "version": "1.0.0",
  "type": "module",
  "bin": {
    "mycli": "./dist/cli.js"
  },
  "files": ["dist"]
}
```

### exports Field

Controls package entry points. Replaces `main` for modern packages:

```json
{
  "exports": {
    ".": "./dist/index.js",
    "./utils": "./dist/utils.js"
  }
}
```

Consumers import: `import foo from "pkg"` or `import bar from "pkg/utils"`.

### Dependencies vs devDependencies

**dependencies**: Runtime requirements (prod + dev)
- Libraries your code imports
- CLI tools used in `scripts` that run in prod (`tsx` if runtime-direct strategy)

**devDependencies**: Dev-only tools (not needed in prod)
- Build tools (`tsc`, `tsc-alias`, `tsc-esm-fix`)
- Linters, formatters (`eslint`, `prettier`)
- Test frameworks (`vitest`)
- `tsx` if using build-first strategy (only dev needs it)

## Components

- **Runtime**: node.md
- **Package Manager**: pnpm.md
- **Workspaces**: See pnpm-monorepo.md for monorepos
