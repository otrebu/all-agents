---
depends: [@context/blocks/tools/typescript-config.md]
---

# TypeScript Frontend Configuration

Additional TypeScript configuration for frontend projects (React, Vue, Svelte, etc.).

**Extends:** @context/blocks/tools/typescript-config.md

## Frontend-Specific Options

Override base config with these options for frontend projects:

```json
{
  "compilerOptions": {
    "module": "preserve",
    "noEmit": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"]
  }
}
```

**Why these changes:**

- `"module": "preserve"` - Let bundler handle module resolution
- `"noEmit": true` - Bundler outputs files, not TypeScript
- `"lib": ["ES2022", "DOM", "DOM.Iterable"]` - Include browser APIs

## Bundler Integration

TypeScript only does type-checking in frontend projects. Your bundler (Vite, Webpack, etc.) handles compilation and bundling.

See @context/blocks/tools/vite.md for Vite-specific configuration including path alias setup.
