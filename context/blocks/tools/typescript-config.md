# TypeScript Configuration

Base TypeScript configuration for Node.js/CLI projects with strict mode enabled.

## Base tsconfig.json

Standard config for most Node.js/CLI projects:

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
    "sourceMap": true,
    "lib": ["ES2022"],

    "baseUrl": ".",
    "paths": {
      "@*": ["./src/*"]
    }
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

Source: https://www.totaltypescript.com/tsconfig-cheat-sheet

## Import Aliases

Make imports readable and stable using path aliases.

**tsconfig.json:**

```json
{
  "compilerOptions": {
    ...
    "baseUrl": ".",
    "paths": {
      "@*": ["./src/*"],
      "@components/*": ["./src/components/*"],
      "@utils/*": ["./src/utils/*"],
      "@services/*": ["./src/services/*"]
    }
  }
}
```

**IMPORTANT:** Path aliases must be configured in also in your vite bundler config if you are using vite.

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
