---
depends: [@context/blocks/tools/typescript-config.md]
---

# TypeScript Monorepo Configuration

Additional TypeScript configuration for monorepo projects with project references.

**Extends:** @context/blocks/tools/typescript-config.md

## Monorepo Library Options

Add these to your package-level `tsconfig.json` for monorepo libraries:

```json
{
  "compilerOptions": {
    "composite": true,
    "declarationMap": true
  }
}
```

These enable TypeScript project references and allow cross-package type navigation.

## Project References

See @context/blocks/tools/pnpm.md for full pnpm workspace setup.

**Root tsconfig.json:**

```json
{
  "files": [],
  "references": [{ "path": "./packages/core" }, { "path": "./packages/cli" }]
}
```

**Package tsconfig.json:**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "composite": true,
    "declarationMap": true,
    "rootDir": "./src",
    "outDir": "./dist"
  },
  "references": [{ "path": "../core" }]
}
```

**Build:**

```bash
tsc --build
```

This respects project references and enables incremental builds across packages.
