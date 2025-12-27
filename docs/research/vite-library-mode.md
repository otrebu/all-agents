# Vite Library Mode: Comprehensive Guide

> Reference documentation for building publishable packages with Vite's library mode.

## Table of Contents

1. [Overview](#overview)
2. [Basic Configuration](#basic-configuration)
3. [Entry Points](#entry-points)
4. [Output Formats](#output-formats)
5. [External Dependencies](#external-dependencies)
6. [CSS Handling](#css-handling)
7. [TypeScript Declarations](#typescript-declarations)
8. [Package.json Configuration](#packagejson-configuration)
9. [Tree Shaking](#tree-shaking)
10. [React Component Libraries](#react-component-libraries)
11. [Common Pitfalls & Solutions](#common-pitfalls--solutions)
12. [Complete Examples](#complete-examples)

---

## Overview

Vite's library mode enables bundling browser-oriented and JavaScript framework libraries for distribution. It uses Rollup under the hood with a pre-configured setup optimized for library development.

**Key characteristics:**

- Uses `build.lib` configuration option
- Cannot use HTML as entry point (unlike application builds)
- Generates multiple output formats (ESM, CJS, UMD, IIFE)
- Requires manual externalization of dependencies
- CSS is bundled into a separate file by default

---

## Basic Configuration

### Minimal Setup

```typescript
// vite.config.ts
import { resolve } from 'path'
import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'MyLib',  // Global variable name for UMD/IIFE
      fileName: 'my-lib'
    }
  }
})
```

### Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `entry` | `string \| string[] \| object` | **Required** | Library entry point(s) |
| `name` | `string` | - | Global variable name (required for UMD/IIFE) |
| `formats` | `('es' \| 'cjs' \| 'umd' \| 'iife')[]` | `['es', 'umd']` (single entry) or `['es', 'cjs']` (multiple entries) | Output formats to generate |
| `fileName` | `string \| ((format, entryName) => string)` | package.json `name` | Output file naming |
| `cssFileName` | `string` | Same as `fileName` | CSS output file name |

---

## Entry Points

### Single Entry

```typescript
build: {
  lib: {
    entry: resolve(__dirname, 'src/index.ts'),
    name: 'MyLib',
    fileName: 'my-lib'
  }
}
```

### Multiple Entries (Object Notation)

```typescript
build: {
  lib: {
    entry: {
      'my-lib': resolve(__dirname, 'src/index.ts'),
      'secondary': resolve(__dirname, 'src/secondary.ts'),
      'utils': resolve(__dirname, 'src/utils/index.ts')
    },
    name: 'MyLib'
  }
}
```

### Multiple Entries (Array Notation)

```typescript
build: {
  lib: {
    entry: [
      resolve(__dirname, 'src/index.ts'),
      resolve(__dirname, 'src/secondary.ts')
    ]
  }
}
```

### Dynamic File Naming

```typescript
build: {
  lib: {
    entry: {
      index: resolve(__dirname, 'src/index.ts'),
      utils: resolve(__dirname, 'src/utils/index.ts')
    },
    fileName: (format, entryName) => {
      const ext = format === 'es' ? 'mjs' : 'cjs'
      return `${entryName}.${ext}`
    }
  }
}
```

---

## Output Formats

### Available Formats

| Format | Extension | Use Case |
|--------|-----------|----------|
| `es` | `.js` / `.mjs` | Modern ES modules (recommended default) |
| `cjs` | `.cjs` | CommonJS for Node.js |
| `umd` | `.umd.js` / `.umd.cjs` | Universal Module Definition (browsers + Node.js) |
| `iife` | `.iife.js` | Immediately Invoked Function Expression (browsers) |

### Format Selection

```typescript
build: {
  lib: {
    entry: resolve(__dirname, 'src/index.ts'),
    name: 'MyLib',
    formats: ['es', 'cjs'],  // Explicitly specify formats
    fileName: (format) => `my-lib.${format}.js`
  }
}
```

### File Extension Behavior

When `package.json` contains `"type": "module"`:
- ESM: `.js`
- CJS: `.cjs`

When `package.json` does **not** contain `"type": "module"`:
- ESM: `.mjs`
- CJS: `.js`

---

## External Dependencies

### Why Externalize?

Dependencies should be externalized to:
- Prevent duplicate code when consumers use the same dependencies
- Reduce bundle size
- Let consumers manage their own dependency versions

### Manual Externalization

```typescript
import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'MyLib'
    },
    rollupOptions: {
      // Externalize dependencies
      external: ['react', 'react-dom', 'react/jsx-runtime'],
      output: {
        // Provide global variable names for UMD build
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM',
          'react/jsx-runtime': 'jsxRuntime'
        }
      }
    }
  }
})
```

### Using vite-plugin-externalize-deps (Recommended)

Vite does **not** automatically externalize peer dependencies. Use this plugin for automatic handling:

```bash
npm install -D vite-plugin-externalize-deps
```

```typescript
import { defineConfig } from 'vite'
import { externalizeDeps } from 'vite-plugin-externalize-deps'

export default defineConfig({
  plugins: [
    externalizeDeps({
      deps: true,         // Externalize dependencies
      devDeps: false,     // Don't externalize devDependencies
      peerDeps: true,     // Externalize peerDependencies
      optionalDeps: true, // Externalize optionalDependencies
      nodeBuiltins: true, // Externalize Node.js built-ins
      except: []          // Exceptions to bundle
    })
  ],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'MyLib'
    }
  }
})
```

### Using External as a Function

```typescript
rollupOptions: {
  external: (id) => {
    // Externalize all node_modules
    return id.includes('node_modules') ||
           id.startsWith('react') ||
           id.startsWith('@radix-ui')
  }
}
```

### Externalization with Regex

```typescript
rollupOptions: {
  external: [
    /^react($|\/)/,        // react and react/*
    /^@radix-ui\//,        // All @radix-ui packages
    /^lodash-es($|\/)/     // lodash-es and subpaths
  ]
}
```

---

## CSS Handling

### Default Behavior

By default, Vite:
- Bundles all CSS into a single file (e.g., `dist/my-lib.css`)
- Sets `build.cssCodeSplit` to `false` in library mode
- Does **not** inject CSS automatically (except for IIFE/UMD)

### Plugin: vite-plugin-lib-inject-css

For automatic CSS import injection (recommended for component libraries):

```bash
npm install -D vite-plugin-lib-inject-css
```

```typescript
import { defineConfig } from 'vite'
import { libInjectCss } from 'vite-plugin-lib-inject-css'

export default defineConfig({
  plugins: [libInjectCss()],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      formats: ['es']
    },
    rollupOptions: {
      output: {
        // Recommended for per-component CSS files
        preserveModules: true,
        preserveModulesRoot: 'src'
      }
    }
  }
})
```

**How it works:**
- Injects `import "./component.css"` at the top of each chunk
- Uses standard import statements (SSR-compatible)
- Creates separate CSS files per component with `preserveModules`

### Configuring sideEffects for CSS

To prevent tree-shaking from removing CSS imports:

```json
// package.json
{
  "sideEffects": [
    "**/*.css",
    "**/*.scss"
  ]
}
```

### Alternative: vite-plugin-css-injected-by-js

For a single JS file with embedded CSS:

```bash
npm install -D vite-plugin-css-injected-by-js
```

```typescript
import { defineConfig } from 'vite'
import cssInjectedByJsPlugin from 'vite-plugin-css-injected-by-js'

export default defineConfig({
  plugins: [cssInjectedByJsPlugin()],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'MyLib'
    }
  }
})
```

**Note:** This approach uses `document.createElement('style')` which is **not SSR-compatible**.

### Exporting CSS in package.json

```json
{
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/my-lib.js",
      "require": "./dist/my-lib.cjs"
    },
    "./styles.css": "./dist/my-lib.css"
  }
}
```

---

## TypeScript Declarations

### Using vite-plugin-dts

```bash
npm install -D vite-plugin-dts
```

#### Basic Configuration

```typescript
import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'

export default defineConfig({
  plugins: [dts()],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'MyLib'
    }
  }
})
```

#### Configuration Options

| Option | Default | Description |
|--------|---------|-------------|
| `outDir` | `build.outDir` | Output directory for `.d.ts` files |
| `tsconfigPath` | auto-detected | Path to tsconfig.json |
| `rollupTypes` | `false` | Bundle all declarations into one file |
| `insertTypesEntry` | `false` | Generate types entry file |
| `strictOutput` | `true` | Restrict output to outDir |
| `copyDtsFiles` | `false` | Copy existing `.d.ts` files |
| `include` | tsconfig include | Files to include |
| `exclude` | tsconfig exclude | Files to exclude |

#### Bundled Declarations (Single File)

```typescript
import dts from 'vite-plugin-dts'

export default defineConfig({
  plugins: [
    dts({
      rollupTypes: true,  // Uses @microsoft/api-extractor
      insertTypesEntry: true
    })
  ]
})
```

#### Custom tsconfig Path

For projects using Vite's template with separate tsconfig files:

```typescript
dts({
  tsconfigPath: './tsconfig.app.json'  // Not tsconfig.json
})
```

#### ESM/CJS Dual Publishing

For TypeScript 5+ compatibility with dual publishing:

```typescript
dts({
  outDir: ['dist/esm', 'dist/cjs'],
  // Generates .d.mts and .d.cts files
})
```

### Alternative: vite-plugin-dts-build

For faster builds with worker threads:

```bash
npm install -D vite-plugin-dts-build
```

```typescript
import { dtsBuild } from 'vite-plugin-dts-build'

export default defineConfig({
  plugins: [
    dtsBuild({
      dtsForEsm: true,  // Generate .d.mts
      dtsForCjs: true   // Generate .d.cts
    })
  ]
})
```

---

## Package.json Configuration

### Minimal Configuration

```json
{
  "name": "my-lib",
  "version": "1.0.0",
  "type": "module",
  "main": "./dist/my-lib.cjs",
  "module": "./dist/my-lib.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/my-lib.js",
      "require": "./dist/my-lib.cjs"
    }
  },
  "files": ["dist"]
}
```

### Full Configuration with Multiple Entry Points

```json
{
  "name": "my-lib",
  "version": "1.0.0",
  "type": "module",
  "main": "./dist/index.cjs",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js",
      "require": "./dist/index.cjs"
    },
    "./utils": {
      "types": "./dist/utils/index.d.ts",
      "import": "./dist/utils/index.js",
      "require": "./dist/utils/index.cjs"
    },
    "./components/*": {
      "types": "./dist/components/*.d.ts",
      "import": "./dist/components/*.js",
      "require": "./dist/components/*.cjs"
    },
    "./styles.css": "./dist/styles.css"
  },
  "sideEffects": [
    "**/*.css"
  ],
  "files": ["dist"],
  "peerDependencies": {
    "react": "^18.0.0 || ^19.0.0",
    "react-dom": "^18.0.0 || ^19.0.0"
  }
}
```

### Conditional Exports

```json
{
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": {
        "types": "./dist/index.d.mts",
        "default": "./dist/index.mjs"
      },
      "require": {
        "types": "./dist/index.d.cts",
        "default": "./dist/index.cjs"
      }
    }
  }
}
```

### TypeScript moduleResolution

For consumers to properly resolve subpath exports, they need:

```json
// Consumer's tsconfig.json
{
  "compilerOptions": {
    "moduleResolution": "bundler"  // or "node16" / "nodenext"
  }
}
```

---

## Tree Shaking

### The Problem

Rollup's default bundling compiles everything into a single file, which can hurt tree-shaking in consumers using Webpack or other bundlers.

### Solution: preserveModules

```typescript
import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      formats: ['es', 'cjs']
    },
    rollupOptions: {
      output: {
        preserveModules: true,
        preserveModulesRoot: 'src'
      }
    }
  }
})
```

### Alternative: Multiple Entry Points

Turn every component into an entry point:

```typescript
import { glob } from 'glob'

const entries = Object.fromEntries(
  glob.sync('src/**/*.{ts,tsx}', { ignore: ['**/*.test.*', '**/*.spec.*'] })
    .map(file => [
      file.replace('src/', '').replace(/\.(ts|tsx)$/, ''),
      resolve(__dirname, file)
    ])
)

export default defineConfig({
  build: {
    lib: {
      entry: entries,
      formats: ['es', 'cjs']
    }
  }
})
```

### Required package.json Configuration

```json
{
  "sideEffects": false
}
```

Or if you have CSS:

```json
{
  "sideEffects": [
    "**/*.css"
  ]
}
```

---

## React Component Libraries

### Complete Configuration

```typescript
// vite.config.ts
import { resolve } from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import dts from 'vite-plugin-dts'
import { libInjectCss } from 'vite-plugin-lib-inject-css'
import { externalizeDeps } from 'vite-plugin-externalize-deps'

export default defineConfig({
  plugins: [
    react(),
    externalizeDeps(),
    libInjectCss(),
    dts({
      tsconfigPath: './tsconfig.app.json',
      rollupTypes: false  // Keep individual .d.ts files
    })
  ],
  build: {
    lib: {
      entry: {
        index: resolve(__dirname, 'src/index.ts'),
        button: resolve(__dirname, 'src/components/Button/index.ts'),
        input: resolve(__dirname, 'src/components/Input/index.ts')
      },
      formats: ['es', 'cjs']
    },
    rollupOptions: {
      output: {
        preserveModules: true,
        preserveModulesRoot: 'src',
        exports: 'named',
        // Fix for default export issues
        interop: 'auto'
      }
    }
  }
})
```

### Recommended package.json

```json
{
  "name": "@myorg/ui-components",
  "version": "1.0.0",
  "type": "module",
  "main": "./dist/index.cjs",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js",
      "require": "./dist/index.cjs"
    },
    "./button": {
      "types": "./dist/components/Button/index.d.ts",
      "import": "./dist/components/Button/index.js",
      "require": "./dist/components/Button/index.cjs"
    },
    "./input": {
      "types": "./dist/components/Input/index.d.ts",
      "import": "./dist/components/Input/index.js",
      "require": "./dist/components/Input/index.cjs"
    }
  },
  "sideEffects": ["**/*.css"],
  "files": ["dist"],
  "peerDependencies": {
    "react": "^18.0.0 || ^19.0.0",
    "react-dom": "^18.0.0 || ^19.0.0"
  },
  "devDependencies": {
    "@types/react": "^18.0.0",
    "@types/react-dom": "^18.0.0",
    "@vitejs/plugin-react": "^4.0.0",
    "react": "^18.0.0",
    "react-dom": "^18.0.0",
    "typescript": "^5.0.0",
    "vite": "^6.0.0",
    "vite-plugin-dts": "^4.0.0",
    "vite-plugin-externalize-deps": "^0.8.0",
    "vite-plugin-lib-inject-css": "^2.0.0"
  }
}
```

### Storybook Compatibility

Remove `libInjectCss` when building Storybook:

```typescript
// .storybook/main.ts
import { withoutVitePlugins } from '@storybook/builder-vite'

const config = {
  viteFinal: async (config) => ({
    ...config,
    plugins: await withoutVitePlugins(config.plugins, ['vite:lib-inject-css'])
  })
}
```

---

## Common Pitfalls & Solutions

### 1. __dirname Not Defined in ES Modules

**Problem:** `ReferenceError: __dirname is not defined in ES module scope`

**Solutions:**

```typescript
// Option A: Use import.meta.url
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Option B: Rename config to .cjs extension
// vite.config.cjs
```

### 2. React/jsx-runtime Not Externalized

**Problem:** JSX runtime code bundled into library

**Solution:**

```typescript
rollupOptions: {
  external: ['react', 'react-dom', 'react/jsx-runtime']
}
```

### 3. Default Import/Export Issues

**Problem:** Errors like "q is not a function" when consuming CJS output

**Solution:**

```typescript
rollupOptions: {
  output: {
    interop: 'auto'
  }
}
```

### 4. CSS Order Issues with Dynamic Imports

**Problem:** CSS appears in wrong order when using dynamic imports

**Solution:** Use CSS Layers:

```css
@layer base, components, utilities;

/* Component styles */
@layer components {
  .button { /* ... */ }
}
```

### 5. Missing Type Declarations

**Problem:** `.d.ts` files not generated

**Solutions:**

1. Check tsconfig `include` paths
2. Specify explicit `tsconfigPath` in vite-plugin-dts
3. Ensure no TypeScript errors in source files

```typescript
dts({
  tsconfigPath: './tsconfig.app.json',
  include: ['src/**/*.ts', 'src/**/*.tsx']
})
```

### 6. Peer Dependencies Bundled

**Problem:** react, react-dom included in bundle

**Solution:** Use `vite-plugin-externalize-deps` or explicit `external`:

```typescript
import { externalizeDeps } from 'vite-plugin-externalize-deps'

export default defineConfig({
  plugins: [externalizeDeps()]
})
```

### 7. Environment Variables Replaced in Library

**Problem:** `import.meta.env.*` values hardcoded in library output

**Solution:** Use `process.env` for consumer-configurable values:

```typescript
// Library code
const isDev = process.env.NODE_ENV !== 'production'

// Or define replacements
define: {
  'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV)
}
```

### 8. Library Not Tree-Shakeable in Webpack

**Problem:** Entire library imported even when using single component

**Solution:**

1. Enable `preserveModules`
2. Set `"sideEffects": false` in package.json
3. Create multiple entry points

### 9. CSS Not Loading for Consumers

**Problem:** Consumers must manually import CSS

**Solutions:**

1. Use `vite-plugin-lib-inject-css` for automatic imports
2. Document CSS import requirement
3. Export CSS path in `package.json` exports

### 10. UMD Global Name Conflicts

**Problem:** Multiple libraries with same global name

**Solution:** Use unique, namespaced global names:

```typescript
build: {
  lib: {
    name: 'MyOrg_ComponentLib'  // Instead of 'MyLib'
  }
}
```

---

## Complete Examples

### Minimal React Component Library

```typescript
// vite.config.ts
import { resolve } from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import dts from 'vite-plugin-dts'

export default defineConfig({
  plugins: [
    react(),
    dts({ tsconfigPath: './tsconfig.app.json' })
  ],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'MyComponents',
      formats: ['es', 'cjs'],
      fileName: (format) => `index.${format === 'es' ? 'js' : 'cjs'}`
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
  }
})
```

### Full-Featured Component Library

```typescript
// vite.config.ts
import { resolve } from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import dts from 'vite-plugin-dts'
import { libInjectCss } from 'vite-plugin-lib-inject-css'
import { externalizeDeps } from 'vite-plugin-externalize-deps'
import { glob } from 'glob'

// Generate entries from file structure
const componentEntries = Object.fromEntries(
  glob.sync('src/components/*/index.{ts,tsx}').map(file => {
    const name = file.match(/components\/(.+)\/index/)[1]
    return [name.toLowerCase(), resolve(__dirname, file)]
  })
)

export default defineConfig({
  plugins: [
    react(),
    externalizeDeps(),
    libInjectCss(),
    dts({
      tsconfigPath: './tsconfig.app.json',
      outDir: 'dist',
      include: ['src'],
      exclude: ['**/*.test.*', '**/*.spec.*', '**/*.stories.*']
    })
  ],
  build: {
    lib: {
      entry: {
        index: resolve(__dirname, 'src/index.ts'),
        ...componentEntries
      },
      formats: ['es', 'cjs']
    },
    rollupOptions: {
      output: {
        preserveModules: true,
        preserveModulesRoot: 'src',
        exports: 'named',
        interop: 'auto',
        assetFileNames: 'assets/[name][extname]',
        chunkFileNames: 'chunks/[name].[hash].js'
      }
    },
    sourcemap: true,
    minify: 'esbuild'
  }
})
```

### TypeScript Library (No Framework)

```typescript
// vite.config.ts
import { resolve } from 'path'
import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'

export default defineConfig({
  plugins: [
    dts({
      rollupTypes: true,
      insertTypesEntry: true
    })
  ],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'MyUtils',
      formats: ['es', 'cjs', 'umd'],
      fileName: (format) => {
        if (format === 'umd') return 'my-utils.umd.js'
        return `my-utils.${format === 'es' ? 'mjs' : 'cjs'}`
      }
    },
    sourcemap: true,
    minify: 'terser'
  }
})
```

---

## References

- [Vite Documentation - Building for Production](https://vite.dev/guide/build)
- [Vite Documentation - Build Options](https://vite.dev/config/build-options)
- [vite-plugin-dts GitHub](https://github.com/qmhc/vite-plugin-dts)
- [vite-plugin-lib-inject-css npm](https://www.npmjs.com/package/vite-plugin-lib-inject-css)
- [vite-plugin-externalize-deps GitHub](https://github.com/davidmyersdev/vite-plugin-externalize-deps)
- [Node.js Package Exports Documentation](https://nodejs.org/api/packages.html)
- [DEV Community - Create a Component Library Fast](https://dev.to/receter/how-to-create-a-react-component-library-using-vites-library-mode-4lma)
- [Build a JavaScript library with multiple entry points using Vite3](https://dev.to/raulfdm/build-a-javascript-library-with-multiple-entry-points-using-vite3-46e1)
