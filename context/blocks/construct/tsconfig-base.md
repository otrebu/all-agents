---
tags: [core]
---

# TypeScript Base Configuration

# TypeScript Base Configuration

## tsconfig.base.json

```json
{
  "compilerOptions": {
    // Target ES2022 for stability (vs ESNext which moves)
    "target": "ES2022",
    "lib": ["ES2022"],

    // Skip type-checking node_modules for performance
    "skipLibCheck": true,

    // Allow .js and .json imports
    "allowJs": true,
    "resolveJsonModule": true,

    // Treat all files as modules, safe for bundlers
    "moduleDetection": "force",
    "isolatedModules": true,

    // All the strictness
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,

    // Module interop
    "esModuleInterop": true,
    "verbatimModuleSyntax": true
  },
  "exclude": ["**/node_modules", "**/dist"]
}
```

## tsconfig.json

```json
{
  "extends": "./tsconfig.base.json",
  "compilerOptions": {
    // Path aliases - must be here, not in base
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src/**/*"]
}
```

## Why paths Can't Be in Base

Paths resolve relative to the config file they're defined in, not the one that extends it. If `baseUrl: "."` is in `tsconfig.base.json`, it points to _that_ directory - not your project's directory.
