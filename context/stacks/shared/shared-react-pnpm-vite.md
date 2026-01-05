---
tags: [shared, react]
---

# Shared React Component Package (Vite)

Internal React component packages using Vite's library mode.

# Build

@context/blocks/construct/pnpm.md
@context/blocks/construct/node.md
@context/foundations/construct/bundle-web-vite.md
@context/blocks/construct/vite-plugin-dts.md

# Framework

@context/foundations/construct/patterns-react.md

# Styling

@context/foundations/construct/patterns-design-tokens-tailwind.md

# Testing

@context/foundations/test/test-component-vitest-rtl.md
@context/foundations/test/test-visual-chromatic.md

# Documentation

@context/blocks/test/storybook.md

# Quality

@context/foundations/quality/gate-standards.md
@context/blocks/quality/accessibility.md

## Vite Library Mode

Use `build.lib` in vite.config.ts with:
- `vite-plugin-dts` for TypeScript declarations
- `vite-plugin-externalize-deps` for peer deps
- `vite-plugin-lib-inject-css` for CSS injection

## package.json Exports

```json
{
  "type": "module",
  "main": "./dist/index.cjs",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js",
      "require": "./dist/index.cjs"
    }
  },
  "sideEffects": ["**/*.css"],
  "peerDependencies": {
    "react": "^18.0.0 || ^19.0.0",
    "react-dom": "^18.0.0 || ^19.0.0"
  }
}
```

## When to Use

- Shared component libraries within monorepo
- Design systems, UI packages
- Components with reuse potential

## When NOT to Use

- App-specific components (keep in app)
- Components without reuse potential
