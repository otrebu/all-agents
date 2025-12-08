---
depends: []
---

# TypeScript

TypeScript configuration, compiler options, and patterns.

## tsconfig.json

Standard config for most projects (strict mode):

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
    "outDir": "dist",
    "sourceMap": true
  }
}
```

**Library builds** - add:

```json
{
  "compilerOptions": {
    "declaration": true
  }
}
```

**Monorepo library** - add:

```json
{
  "compilerOptions": {
    "composite": true,
    "declarationMap": true
  }
}
```

**Frontend (no emit, bundler handles it):**

```json
{
  "compilerOptions": {
    "module": "preserve",
    "noEmit": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"]
  }
}
```

**Node/CLI (no DOM):**

```json
{
  "compilerOptions": {
    "lib": ["ES2022"]
  }
}
```

Source: https://www.totaltypescript.com/tsconfig-cheat-sheet

## Import Aliases

Make imports readable and stable using path aliases.

**tsconfig.json:**

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"],
      "@/components/*": ["./src/components/*"],
      "@/utils/*": ["./src/utils/*"],
      "@/services/*": ["./src/services/*"]
    }
  }
}
```

**IMPORTANT:** Path aliases must be configured in BOTH:
1. `tsconfig.json` (for TypeScript)
2. Your bundler config (Vite, Webpack, etc.)

See @primitives/tools/vite.md for Vite alias config.

## Type-Checking

```bash
# Check types (no output)
tsc --noEmit

# Build with types
tsc --build

# Watch mode
tsc --watch --noEmit
```

**package.json scripts:**

```json
{
  "scripts": {
    "typecheck": "tsc --noEmit",
    "build": "tsc --build"
  }
}
```

## Monorepo with Project References

See @primitives/tools/pnpm.md for full pnpm workspace setup.

**Root tsconfig.json:**

```json
{
  "files": [],
  "references": [
    { "path": "./packages/core" },
    { "path": "./packages/cli" }
  ]
}
```

**Package tsconfig.json:**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "rootDir": "./src",
    "outDir": "./dist"
  },
  "references": [
    { "path": "../core" }
  ]
}
```

Build: `tsc --build` (respects references, incremental)
