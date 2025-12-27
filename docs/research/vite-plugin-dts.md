# vite-plugin-dts

TypeScript declaration file generation for Vite library mode.

## Overview

[vite-plugin-dts](https://github.com/qmhc/unplugin-dts) is a Vite plugin that generates declaration files (`*.d.ts`) from `.ts(x)` or `.vue` source files when using Vite in library mode. It has evolved into `unplugin-dts`, supporting multiple bundlers including Vite, Rollup, Rolldown, Webpack, Rspack, and esbuild.

**Key Statistics:**
- ~2M weekly npm downloads
- ~1,495 GitHub stars
- Current stable version: 4.5.4
- Beta version: 5.0.0-beta.6

---

## Installation

```bash
# npm
npm install vite-plugin-dts -D

# pnpm
pnpm add vite-plugin-dts -D

# yarn
yarn add vite-plugin-dts -D

# For type bundling with rollupTypes
pnpm add @microsoft/api-extractor -D
```

For Vue projects:
```bash
pnpm add @vue/language-core -D
```

---

## Basic Setup

### Minimal Configuration

```typescript
// vite.config.ts
import { resolve } from 'path'
import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'MyLib',
      formats: ['es'],
      fileName: 'my-lib'
    }
  },
  plugins: [dts()]
})
```

By default, generated declaration files follow the source structure.

### React Library Setup

```typescript
// vite.config.ts
import { resolve } from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import dts from 'vite-plugin-dts'

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'MyReactLib',
      formats: ['es', 'cjs'],
      fileName: (format) => `index.${format === 'es' ? 'mjs' : 'cjs'}`
    },
    rollupOptions: {
      external: ['react', 'react-dom', 'react/jsx-runtime'],
      output: {
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM'
        }
      }
    }
  },
  plugins: [
    react(),
    dts({ include: ['src'] })
  ]
})
```

### Vue Library Setup

```typescript
// vite.config.ts
import { resolve } from 'path'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import dts from 'vite-plugin-dts'

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'MyVueLib',
      formats: ['es']
    },
    rollupOptions: {
      external: ['vue']
    }
  },
  plugins: [
    vue(),
    dts({
      include: ['src'],
      cleanVueFileName: true  // Transform .vue.d.ts to .d.ts
    })
  ]
})
```

---

## Configuration Options

### Directory & Path Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `root` | `string` | `process.cwd()` | Project root directory |
| `outDir` | `string \| string[]` | `build.outDir` | Output directory for declarations. Supports array for multiple outputs |
| `entryRoot` | `string` | auto-calculated | Override root path of entry files (useful in monorepos) |
| `tsconfigPath` | `string` | auto-discovered | Path to tsconfig.json |
| `strictOutput` | `boolean` | `true` | Restricts generated files to `outDir` |

### File Selection Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `include` | `string \| string[]` | tsconfig `include` | Glob patterns for source files |
| `exclude` | `string \| string[]` | tsconfig `exclude` or `'node_modules/**'` | Glob patterns to exclude |
| `copyDtsFiles` | `boolean` | `false` | Copy existing `.d.ts` source files to output |

### Output Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `insertTypesEntry` | `boolean` | `false` | Generate types entry file using package.json `types` property |
| `declarationOnly` | `boolean` | `false` | Emit only declaration files, removing other outputs |
| `cleanVueFileName` | `boolean` | `false` | Transform `.vue.d.ts` to `.d.ts` |

### TypeScript Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `compilerOptions` | `ts.CompilerOptions` | `null` | Override TypeScript compiler settings |
| `skipDiagnostics` | `boolean` | `true` | Skip type diagnostics during build |
| `logDiagnostics` | `boolean` | `false` | Log type errors to terminal |

### Import Processing Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `clearPureImport` | `boolean` | `true` | Remove side-effect imports (`import 'xxx'`) |
| `staticImport` | `boolean` | `false` | Convert dynamic imports to static |
| `pathsToAliases` | `boolean` | `true` | Transform tsconfig `paths` into aliases |
| `aliasesExclude` | `RegExp[]` | `[]` | Paths to exclude from alias transformation |

### Type Bundling Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `rollupTypes` | `boolean` | `false` | Bundle declarations into single file via api-extractor |
| `bundledPackages` | `string[]` | `[]` | Packages to bundle when using api-extractor |
| `rollupConfig` | `object` | - | Override api-extractor configuration |

### Processor Options (v5+)

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `processor` | `'ts' \| 'vue'` | `'ts'` | Select processor for program creation |

---

## Lifecycle Hooks

### `afterBootstrap`
Executes after runtime initialization.

```typescript
dts({
  afterBootstrap: () => {
    console.log('Plugin initialized')
  }
})
```

### `afterDiagnostic`
Runs after type checking. Use to detect or handle type errors.

```typescript
dts({
  skipDiagnostics: false,
  afterDiagnostic: (diagnostics) => {
    if (diagnostics.length > 0) {
      console.error(`Found ${diagnostics.length} type errors`)
      // Optionally throw to fail the build
      // throw new Error('Type errors found')
    }
  }
})
```

### `beforeWriteFile`
Transform file path/content before writing. Return `false` to skip the file.

```typescript
dts({
  beforeWriteFile: (filePath, content) => {
    // Rename output file
    if (filePath.endsWith('main.d.ts')) {
      return {
        filePath: filePath.replace('main.d.ts', 'index.d.ts'),
        content
      }
    }

    // Skip certain files
    if (filePath.includes('internal')) {
      return false
    }

    return { filePath, content }
  }
})
```

### `afterRollup`
Executes after type bundling (when `rollupTypes` is enabled).

```typescript
dts({
  rollupTypes: true,
  afterRollup: () => {
    console.log('Types bundled successfully')
  }
})
```

### `afterBuild`
Final hook with map of all emitted files.

```typescript
dts({
  afterBuild: (emittedFiles) => {
    console.log('Generated files:', Object.keys(emittedFiles))
  }
})
```

---

## Declaration Bundling with rollupTypes

### Basic Bundle Configuration

```typescript
dts({
  rollupTypes: true  // Bundle all declarations into one file
})
```

### With bundledPackages

Include types from monorepo packages or specific dependencies:

```typescript
dts({
  rollupTypes: true,
  bundledPackages: [
    '@my-company/shared-types',
    '@my-company/utils'
  ]
})
```

### Custom api-extractor Configuration

```typescript
dts({
  rollupTypes: true,
  rollupConfig: {
    bundledPackages: ['@my-company/*'],
    dtsRollup: {
      untrimmedFilePath: '<projectFolder>/dist/types.d.ts'
    }
  }
})
```

### bundledPackages with Glob Patterns

```typescript
dts({
  rollupTypes: true,
  bundledPackages: [
    'specific-package',
    '@my-company/*'  // Matches declared dependencies only
  ]
})
```

**Note:** Glob patterns match only explicitly declared top-level dependencies in package.json.

---

## Handling Path Aliases

### The Problem

Path aliases defined in tsconfig.json may not resolve correctly in generated `.d.ts` files when using `vite-tsconfig-paths`.

### Solution 1: Use Vite resolve.alias

```typescript
// vite.config.ts
import { resolve } from 'path'
import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'

export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@components': resolve(__dirname, 'src/components'),
      '@utils': resolve(__dirname, 'src/utils')
    }
  },
  plugins: [dts()]
})
```

### Solution 2: Configure tsconfig with baseUrl

```json
// tsconfig.json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@components/*": ["src/components/*"]
    }
  }
}
```

### Excluding Certain Paths from Transformation

```typescript
dts({
  pathsToAliases: true,
  aliasesExclude: [
    /^@internal/,  // Keep @internal paths as-is
    /^lodash/
  ]
})
```

---

## Monorepo Configuration

### Nx Workspace Setup

```typescript
// packages/my-lib/vite.config.ts
import { resolve } from 'path'
import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'

export default defineConfig({
  root: __dirname,  // Important for monorepos
  build: {
    outDir: '../../dist/libs/my-lib',  // Relative to workspace root
    lib: {
      entry: 'src/index.ts',
      name: 'my-lib',
      fileName: 'index',
      formats: ['es']
    }
  },
  plugins: [
    dts({
      entryRoot: 'src',
      tsconfigPath: resolve(__dirname, 'tsconfig.lib.json'),
      skipDiagnostics: true
    })
  ]
})
```

### pnpm Workspace with Soft Links

Add paths configuration to handle pnpm symlinks:

```json
// tsconfig.json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@my-org/shared": ["../../packages/shared/src"],
      "package-name": ["node_modules/package-name"]
    }
  }
}
```

### Monorepo Type Re-exports

When re-exporting types from internal dependencies, use `bundledPackages`:

```typescript
dts({
  rollupTypes: true,
  bundledPackages: [
    '@my-org/types',
    '@my-org/utils'
  ]
})
```

---

## Vite 5+ Configuration

### Using tsconfig.app.json

Vite 5+ creates separate tsconfig files. Specify the correct one:

```typescript
// vite.config.ts
import { resolve } from 'path'
import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'

export default defineConfig({
  plugins: [
    dts({
      tsconfigPath: resolve(__dirname, 'tsconfig.app.json')
    })
  ]
})
```

### Creating a Build-specific tsconfig

```json
// tsconfig.lib.json
{
  "extends": "./tsconfig.app.json",
  "include": ["src"],
  "exclude": ["src/**/*.test.ts", "src/**/*.spec.ts"]
}
```

```typescript
dts({
  tsconfigPath: resolve(__dirname, 'tsconfig.lib.json')
})
```

---

## Comparison with Alternatives

### vite-plugin-dts vs tsc --declaration

| Feature | vite-plugin-dts | tsc --declaration |
|---------|-----------------|-------------------|
| Integration | Vite build pipeline | Separate command |
| Bundling | Yes (rollupTypes) | No |
| Path alias resolution | Yes | Needs additional tooling |
| Vue SFC support | Yes | No |
| Speed | Faster (skips type checking) | Slower (full type check) |
| Reliability | Good, occasional edge cases | Most reliable |

### vite-plugin-dts vs rollup-plugin-dts

| Feature | vite-plugin-dts | rollup-plugin-dts |
|---------|-----------------|-------------------|
| Weekly downloads | ~2M | ~1.2M |
| GitHub stars | ~1,495 | ~866 |
| Bundling engine | @microsoft/api-extractor | Custom Rollup-based |
| Vue support | Yes | TypeScript only |
| Primary bundler | Vite (also Rollup since v3) | Rollup |

### When to Use Each

- **vite-plugin-dts**: Vite projects, Vue libraries, need bundled types
- **tsc --declaration**: Maximum reliability, simple setups, CI validation
- **rollup-plugin-dts**: Pure Rollup projects, need fine-grained control

---

## Performance Optimization

### Skip Diagnostics (Default)

```typescript
dts({
  skipDiagnostics: true  // Default, fastest build
})
```

### Limit Include Scope

```typescript
dts({
  include: ['src/**/*.ts'],
  exclude: [
    '**/*.test.ts',
    '**/*.spec.ts',
    '**/test/**',
    '**/fixtures/**'
  ]
})
```

### Enable skipLibCheck in tsconfig

```json
// tsconfig.json
{
  "compilerOptions": {
    "skipLibCheck": true
  }
}
```

### Alternative: vite-plugin-dts-build

For large projects needing incremental builds:

```bash
pnpm add vite-plugin-dts-build -D
```

Features:
- Worker-thread TypeScript compilation
- Incremental builds with cached state
- Dual mode (ESM/CJS) support

---

## Troubleshooting

### Issue: Types Generated in Wrong Directory

**Symptom:** Files appear in `dist/src/` instead of `dist/`

**Solution:**
```typescript
dts({
  entryRoot: 'src'  // Set to your source directory
})
```

### Issue: tsconfig.app.json Not Recognized

**Symptom:** `--jsx is not set` errors with Vite 5+

**Solution:**
```typescript
dts({
  tsconfigPath: resolve(__dirname, 'tsconfig.app.json')
})
```

### Issue: Path Aliases Not Resolved

**Symptom:** `@/components/Button` appears in `.d.ts` instead of relative path

**Solution:**
```typescript
// Use Vite's resolve.alias
resolve: {
  alias: {
    '@': resolve(__dirname, 'src')
  }
}
```

### Issue: pnpm Soft Link Problems

**Symptom:** Type inference errors for symlinked packages

**Solution:**
```json
// tsconfig.json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "package-name": ["node_modules/package-name"]
    }
  }
}
```

### Issue: CJS Deprecation Error (Vite 5)

**Symptom:** "The CJS build of Vite's Node API is deprecated"

**Solution:**
```json
// package.json
{
  "type": "module"
}
```

### Issue: External Libraries Type Errors

**Symptom:** "Cannot find module 'vue'" during build

**Solution:**
```json
// tsconfig.json
{
  "compilerOptions": {
    "moduleResolution": "bundler"
  }
}
```

### Issue: Watch Mode Crashes

**Symptom:** Plugin crashes on file changes during `vite build --watch`

**Workaround:** Use `vite-plugin-dts-build` for better watch support, or run type generation separately.

### Issue: Empty Declarations Generated

**Symptom:** `.d.ts` files are empty or missing exports

**Check:**
1. Ensure exports are properly declared in entry file
2. Verify `include` patterns match your source files
3. Check for TypeScript errors with `skipDiagnostics: false`

---

## Package.json Configuration

### Standard Library Setup

```json
{
  "name": "my-lib",
  "version": "1.0.0",
  "type": "module",
  "main": "dist/index.cjs",
  "module": "dist/index.js",
  "types": "dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js",
      "require": "./dist/index.cjs"
    }
  },
  "files": ["dist"],
  "peerDependencies": {
    "react": "^18.0.0"
  },
  "scripts": {
    "build": "vite build",
    "prepublishOnly": "npm run build"
  }
}
```

### With Separate Type Checking

```json
{
  "scripts": {
    "build": "vite build",
    "typecheck": "tsc --noEmit",
    "prepublishOnly": "npm run typecheck && npm run build"
  }
}
```

---

## Complete Examples

### React Component Library

```typescript
// vite.config.ts
import { resolve } from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import dts from 'vite-plugin-dts'

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'MyComponentLib',
      formats: ['es', 'cjs'],
      fileName: (format) => `index.${format === 'es' ? 'mjs' : 'cjs'}`
    },
    rollupOptions: {
      external: ['react', 'react-dom', 'react/jsx-runtime'],
      output: {
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM'
        }
      }
    }
  },
  plugins: [
    react(),
    dts({
      include: ['src'],
      exclude: ['src/**/*.test.tsx', 'src/**/*.stories.tsx'],
      rollupTypes: true,
      insertTypesEntry: true
    })
  ]
})
```

### TypeScript Utility Library

```typescript
// vite.config.ts
import { resolve } from 'path'
import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'

export default defineConfig({
  build: {
    lib: {
      entry: {
        index: resolve(__dirname, 'src/index.ts'),
        utils: resolve(__dirname, 'src/utils/index.ts')
      },
      formats: ['es', 'cjs']
    },
    rollupOptions: {
      external: ['lodash-es']
    }
  },
  plugins: [
    dts({
      entryRoot: 'src',
      rollupTypes: false,  // Keep separate .d.ts per entry
      skipDiagnostics: true
    })
  ]
})
```

### Vue Component Library

```typescript
// vite.config.ts
import { resolve } from 'path'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import dts from 'vite-plugin-dts'

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'MyVueLib',
      formats: ['es']
    },
    rollupOptions: {
      external: ['vue'],
      output: {
        globals: { vue: 'Vue' }
      }
    }
  },
  plugins: [
    vue(),
    dts({
      include: ['src'],
      cleanVueFileName: true,
      tsconfigPath: resolve(__dirname, 'tsconfig.app.json'),
      rollupTypes: true
    })
  ]
})
```

---

## Migration from tsc --declaration

### Before (tsc approach)

```json
// package.json
{
  "scripts": {
    "build": "vite build && tsc --declaration --emitDeclarationOnly --outDir dist"
  }
}
```

### After (vite-plugin-dts)

```typescript
// vite.config.ts
import dts from 'vite-plugin-dts'

export default defineConfig({
  plugins: [dts()]
})
```

```json
// package.json
{
  "scripts": {
    "build": "vite build"
  }
}
```

---

## Resources

- [GitHub Repository](https://github.com/qmhc/unplugin-dts)
- [npm Package](https://www.npmjs.com/package/vite-plugin-dts)
- [Vite Library Mode Guide](https://vite.dev/guide/build.html#library-mode)
- [API Extractor Documentation](https://api-extractor.com/)
- [TypeScript Declaration Files](https://www.typescriptlang.org/docs/handbook/declaration-files/introduction.html)

---

*Last updated: December 2024*
