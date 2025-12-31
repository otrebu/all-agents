---
tags: [frontend]
depends:
  - "@context/blocks/construct/tsconfig-base.md"
---

# TypeScript Config for Web/Frontend

Browser-targeted TypeScript with bundler handling transpilation.

## tsconfig.json

```json
{
  "extends": "./tsconfig.base.json",
  "compilerOptions": {
    "module": "Preserve",
    "moduleResolution": "bundler",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "jsx": "react-jsx",
    "noEmit": true,
    "allowImportingTsExtensions": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

## Why These Settings

| Setting | Value | Why |
|---------|-------|-----|
| `module` | `Preserve` | Keep imports as-is, bundler transforms |
| `moduleResolution` | `bundler` | Use bundler's resolution algorithm |
| `lib` | `["ES2022", "DOM", "DOM.Iterable"]` | Browser APIs + modern JS |
| `jsx` | `react-jsx` | Modern React transform (or `preserve` for Vue) |
| `noEmit` | `true` | Bundler emits, TypeScript only type-checks |
| `allowImportingTsExtensions` | `true` | Import `.ts` files directly in dev |

## Works With

- Vite
- webpack
- esbuild
- Rollup
- Any modern bundler

## When to Use

- React/Vue/Svelte SPAs
- Any frontend where bundler handles emit
- Browser-targeted code

## When NOT to Use

- Node.js backend → use `module: "NodeNext"`
- Libraries that emit → need `declaration: true`, `outDir`
- SSR with custom emit requirements
