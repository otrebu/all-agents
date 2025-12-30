---
depends: []
tags: [core]
---

# vite-plugin-dts

Generate `.d.ts` declaration files for Vite library builds.

## Quick Start

```bash
# install
install -D vite-plugin-dts @microsoft/api-extractor
```

## Configuration

```typescript
// vite.config.ts
import { defineConfig } from "vite";
import dts from "vite-plugin-dts";

export default defineConfig({
  build: {
    lib: {
      entry: "src/index.ts",
      formats: ["es"],
      fileName: "index",
    },
  },
  plugins: [
    dts({
      include: ["src"],
      outDir: "dist",
      tsconfigPath: "./tsconfig.app.json", // important for Vite templates
    }),
  ],
});
```

## Key Options

| Option | Default | Description |
|--------|---------|-------------|
| `include` | - | Glob patterns for source files |
| `outDir` | `build.outDir` | Output directory for `.d.ts` |
| `entryRoot` | auto | Root path for calculating output paths |
| `bundleTypes` | `false` | Bundle all declarations into one file (requires api-extractor) |
| `tsconfigPath` | auto | Path to tsconfig.json |
| `skipDiagnostics` | `false` | Skip type checking (faster builds) |
| `strictOutput` | `true` | Only output to `outDir` |
| `pathsToAliases` | `true` | Convert tsconfig paths to aliases |

## Common Configurations

### Single Entry Library

```typescript
dts({
  include: ["src"],
  bundleTypes: true, // single index.d.ts (slower builds)
})
```

### Monorepo Package

```typescript
dts({
  include: ["src"],
  entryRoot: "src",
  tsconfigPath: "./tsconfig.json",
  pathsToAliases: true, // resolve workspace imports
})
```

### Fast Builds

```typescript
dts({
  include: ["src"],
  skipDiagnostics: true, // CI should run tsc separately
})
```

## tsconfig.json Requirements

```json
{
  "compilerOptions": {
    "declaration": true,
    "declarationMap": true
  },
  "include": ["src"]
}
```

> **Note:** The plugin reads `include` from tsconfig. Ensure it matches your source files.

## Troubleshooting

### Missing Declarations

1. Check `include` in tsconfig.json matches source paths
2. Verify `entryRoot` is correct for monorepos
3. For Vite templates, use `tsconfigPath: './tsconfig.app.json'`

### Duplicate Declarations

Set `strictOutput: true` to prevent output outside `outDir`.

### Slow Builds

Use `skipDiagnostics: true` and run type checking separately in CI.

vite-plugin-dts = library builds needing `.d.ts` generation.
