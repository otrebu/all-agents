# Vite Research Documentation

> **Version:** Vite 6.x (Latest: 6.0.0 released November 26, 2024)
> **Last Updated:** December 2024
> **Node.js Requirements:** 20.19+, 22.12+

## Table of Contents

1. [Architecture](#architecture)
2. [Configuration](#configuration)
3. [Dev Server](#dev-server)
4. [Plugins](#plugins)
5. [Build](#build)
6. [Monorepo](#monorepo)
7. [Sources](#sources)

---

## Architecture

Vite's architecture is built on a hybrid approach that leverages different tools for development and production to maximize both speed and optimization.

### Core Principles

1. **Native ESM in Development** - Vite serves source code over native ES modules, letting the browser take over part of the bundling job
2. **esbuild for Pre-bundling** - Dependencies are pre-bundled using esbuild (10-100x faster than JS-based bundlers)
3. **Rollup for Production** - Production builds use Rollup for advanced optimizations and flexible plugin API

### Why This Hybrid Approach?

```
Development Flow:
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Source     │────▶│   esbuild   │────▶│   Browser   │
│  Files      │     │  Pre-bundle │     │  (ESM)      │
└─────────────┘     └─────────────┘     └─────────────┘

Production Flow:
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Source     │────▶│   Rollup    │────▶│  Optimized  │
│  Files      │     │   Bundle    │     │   Bundle    │
└─────────────┘     └─────────────┘     └─────────────┘
```

### esbuild Pre-bundling

esbuild is used during development for:
- **Scanning node_modules** for dependencies
- **Bundling third-party dependencies** into single ESM files
- **Converting CommonJS to ESM** for browser compatibility
- **Flattening complex dependency graphs** to reduce HTTP requests
- **Transpilation and minification** during production builds

### Why Not esbuild for Everything?

While esbuild is incredibly fast, Vite uses Rollup for production because:
- Rollup has more stable and advanced **code splitting**
- Vite's **plugin API** is built on Rollup's flexible infrastructure
- Better **tree-shaking** and optimization capabilities
- Mature ecosystem of production-ready plugins

### Performance Benchmarks (2025)

| Metric | Vite | Webpack |
|--------|------|---------|
| Cold Start | ~1.2s | ~7s |
| HMR | 10-20ms | 500ms-1.6s |
| Adoption | 80% of new React projects | Legacy projects |

### Future: Rolldown

The Vite team is developing **Rolldown**, a Rust port of Rollup that will:
- Replace both Rollup and esbuild
- Improve build performance significantly
- Remove inconsistencies between development and production

---

## Configuration

Vite uses a `vite.config.ts` (or `.js`, `.mjs`) file for configuration.

### Basic Configuration

```typescript
// vite.config.ts
import { defineConfig } from 'vite'

export default defineConfig({
  // Your configuration options
})
```

### TypeScript with Type Safety

```typescript
import { defineConfig } from 'vite'
import type { UserConfig } from 'vite'

// Using defineConfig helper (recommended)
export default defineConfig({
  root: './src',
  base: '/',
  publicDir: 'public',
})

// Or using satisfies for type checking
const config = {
  root: './src',
} satisfies UserConfig

export default config
```

### Conditional Configuration

```typescript
import { defineConfig } from 'vite'

export default defineConfig(({ command, mode, isSsrBuild, isPreview }) => {
  if (command === 'serve') {
    // Dev-specific config
    return {
      define: {
        __DEV__: true,
      },
    }
  } else {
    // Build-specific config (command === 'build')
    return {
      define: {
        __DEV__: false,
      },
    }
  }
})
```

### Async Configuration

```typescript
export default defineConfig(async ({ command, mode }) => {
  const data = await asyncFunction()
  return {
    // config using data
  }
})
```

### Key Shared Options

```typescript
import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  // Project root directory
  root: process.cwd(),

  // Base public path
  base: '/',

  // Directory to serve static assets
  publicDir: 'public',

  // Cache directory
  cacheDir: 'node_modules/.vite',

  // Define global constant replacements
  define: {
    __APP_VERSION__: JSON.stringify('1.0.0'),
    'process.env.NODE_ENV': JSON.stringify('production'),
  },

  // Resolve options
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@components': resolve(__dirname, 'src/components'),
    },
    extensions: ['.mjs', '.js', '.ts', '.jsx', '.tsx', '.json'],
  },

  // CSS options
  css: {
    modules: {
      localsConvention: 'camelCase',
    },
    preprocessorOptions: {
      scss: {
        additionalData: `@import "@/styles/variables.scss";`,
      },
    },
    // Lightning CSS (faster alternative)
    // lightningcss: { ... }
  },

  // JSON handling
  json: {
    namedExports: true,
    stringify: false,
  },

  // esbuild options
  esbuild: {
    jsxFactory: 'h',
    jsxFragment: 'Fragment',
    // Exclude files
    exclude: /node_modules/,
  },
})
```

### TypeScript Path Resolution (vite-tsconfig-paths)

```typescript
import { defineConfig } from 'vite'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [
    tsconfigPaths({
      // New in v6 - lazy tsconfig discovery
      projectDiscovery: 'lazy',
    }),
  ],
})
```

---

## Dev Server

### Basic Server Configuration

```typescript
import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    // Host binding
    host: 'localhost', // or '0.0.0.0' for network access
    port: 5173,
    strictPort: true, // Exit if port is taken

    // Auto open browser
    open: true, // or '/path/to/page'

    // CORS
    cors: true,

    // Force dependency pre-bundling
    force: true,
  },
})
```

### HTTPS Configuration

#### Option 1: Basic SSL Plugin (Self-signed)

```typescript
import { defineConfig } from 'vite'
import basicSsl from '@vitejs/plugin-basic-ssl'

export default defineConfig({
  plugins: [
    basicSsl({
      name: 'dev-cert',
      domains: ['*.local.dev'],
      certDir: './.certs',
    }),
  ],
})
```

#### Option 2: mkcert Plugin (Trusted Certificates)

```bash
npm install -D vite-plugin-mkcert
```

```typescript
import { defineConfig } from 'vite'
import mkcert from 'vite-plugin-mkcert'

export default defineConfig({
  plugins: [mkcert()],
})
```

#### Option 3: Manual Certificates

```typescript
import { defineConfig } from 'vite'
import fs from 'fs'

export default defineConfig({
  server: {
    https: {
      key: fs.readFileSync('./certs/key.pem'),
      cert: fs.readFileSync('./certs/cert.pem'),
    },
  },
})
```

### HMR Configuration

```typescript
export default defineConfig({
  server: {
    hmr: {
      // Overlay for errors
      overlay: true,

      // For reverse proxy setups
      host: 'localhost',
      port: 5173,

      // Client port (for HTTPS proxies)
      clientPort: 443,

      // Protocol
      protocol: 'ws', // or 'wss'
    },
  },
})
```

### Proxy Configuration

```typescript
export default defineConfig({
  server: {
    proxy: {
      // Simple proxy
      '/foo': 'http://localhost:4567',

      // With options
      '/api': {
        target: 'http://jsonplaceholder.typicode.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
        // Custom headers
        headers: {
          'X-Custom-Header': 'value',
        },
      },

      // Regex path matching
      '^/fallback/.*': {
        target: 'http://jsonplaceholder.typicode.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/fallback/, ''),
      },

      // WebSocket proxy
      '/socket.io': {
        target: 'ws://localhost:5174',
        ws: true,
      },
    },
  },
})
```

### NGINX Reverse Proxy for HMR

```nginx
# nginx.conf
location / {
    proxy_pass http://localhost:5173;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "Upgrade";
}
```

### Environment Variables

#### .env File Types

```
.env                # Loaded in all cases
.env.local          # Loaded in all cases, git-ignored
.env.[mode]         # Only in specified mode
.env.[mode].local   # Only in specified mode, git-ignored
```

#### Usage in Code

```typescript
// Only VITE_ prefixed variables are exposed to client
console.log(import.meta.env.VITE_API_URL)
console.log(import.meta.env.VITE_APP_TITLE)

// Built-in variables
console.log(import.meta.env.MODE)        // 'development' or 'production'
console.log(import.meta.env.BASE_URL)    // Base URL from config
console.log(import.meta.env.PROD)        // boolean
console.log(import.meta.env.DEV)         // boolean
console.log(import.meta.env.SSR)         // boolean
```

#### TypeScript IntelliSense

```typescript
// src/vite-env.d.ts
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string
  readonly VITE_APP_TITLE: string
  // Add more env variables as needed
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
```

#### Custom Prefix

```typescript
export default defineConfig({
  envPrefix: ['VITE_', 'APP_'], // Multiple prefixes
})
```

#### Loading .env in Config

```typescript
import { defineConfig, loadEnv } from 'vite'

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current directory
  const env = loadEnv(mode, process.cwd(), '')

  return {
    define: {
      __APP_ENV__: JSON.stringify(env.APP_ENV),
    },
  }
})
```

---

## Plugins

Vite plugins extend Rollup's plugin interface with Vite-specific options.

### Using Plugins

```typescript
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    vue(),
    // Or for React
    // react(),
  ],
})
```

### Official Framework Plugins

#### React

```bash
npm install -D @vitejs/plugin-react
# Or with SWC (faster)
npm install -D @vitejs/plugin-react-swc
```

```typescript
// Using Babel (more features)
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    react({
      // Babel options
      babel: {
        plugins: ['@babel/plugin-proposal-decorators'],
      },
    }),
  ],
})

// Using SWC (faster)
import react from '@vitejs/plugin-react-swc'

export default defineConfig({
  plugins: [react()],
})
```

#### Vue

```bash
npm install -D @vitejs/plugin-vue @vitejs/plugin-vue-jsx
```

```typescript
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'

export default defineConfig({
  plugins: [vue(), vueJsx()],
})
```

#### Svelte

```bash
npm install -D @sveltejs/vite-plugin-svelte
```

```typescript
import { svelte } from '@sveltejs/vite-plugin-svelte'

export default defineConfig({
  plugins: [svelte()],
})
```

### Writing Custom Plugins

#### Basic Plugin Structure

```typescript
// vite-plugin-my-plugin.ts
import type { Plugin } from 'vite'

export default function myPlugin(options: MyPluginOptions = {}): Plugin {
  return {
    name: 'vite-plugin-my-plugin',

    // Hook: Modify Vite config
    config(config, { command, mode }) {
      return {
        // Return partial config to merge
      }
    },

    // Hook: Final config after all modifications
    configResolved(config) {
      // Store or use resolved config
    },

    // Hook: Configure dev server
    configureServer(server) {
      // Add custom middleware
      server.middlewares.use((req, res, next) => {
        // Custom middleware logic
        next()
      })
    },

    // Hook: Transform index.html
    transformIndexHtml(html) {
      return html.replace(
        /<title>(.*?)<\/title>/,
        `<title>My App</title>`
      )
    },

    // Hook: Resolve module IDs
    resolveId(id) {
      if (id === 'virtual:my-module') {
        return id
      }
    },

    // Hook: Load virtual modules
    load(id) {
      if (id === 'virtual:my-module') {
        return `export const msg = "Hello from virtual module"`
      }
    },

    // Hook: Transform code
    transform(code, id) {
      if (id.endsWith('.special')) {
        return {
          code: transformedCode,
          map: null,
        }
      }
    },
  }
}
```

#### Plugin Ordering

```typescript
export default function myPlugin(): Plugin {
  return {
    name: 'vite-plugin-my-plugin',
    enforce: 'pre', // Run before Vite core plugins
    // enforce: 'post', // Run after Vite core plugins
  }
}
```

#### Conditional Application

```typescript
export default function myPlugin(): Plugin {
  return {
    name: 'vite-plugin-my-plugin',
    apply: 'build', // Only during build
    // apply: 'serve', // Only during dev
    // apply: (config, { command }) => command === 'build' && config.mode === 'production'
  }
}
```

#### Virtual Modules

```typescript
const virtualModuleId = 'virtual:my-module'
const resolvedVirtualModuleId = '\0' + virtualModuleId

export default function virtualPlugin(): Plugin {
  return {
    name: 'vite-plugin-virtual',

    resolveId(id) {
      if (id === virtualModuleId) {
        return resolvedVirtualModuleId
      }
    },

    load(id) {
      if (id === resolvedVirtualModuleId) {
        return `export const data = ${JSON.stringify({ hello: 'world' })}`
      }
    },
  }
}
```

### Common Utility Plugins

```typescript
import { defineConfig } from 'vite'
import tsconfigPaths from 'vite-tsconfig-paths'
import { visualizer } from 'rollup-plugin-visualizer'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    // TypeScript path resolution
    tsconfigPaths(),

    // Bundle visualizer
    visualizer({
      filename: 'dist/stats.html',
      open: true,
    }),

    // PWA support
    VitePWA({
      registerType: 'autoUpdate',
    }),
  ],
})
```

### Debugging Plugins

```bash
npm install -D vite-plugin-inspect
```

```typescript
import inspect from 'vite-plugin-inspect'

export default defineConfig({
  plugins: [inspect()],
})

// Visit localhost:5173/__inspect/ to debug
```

---

## Build

### Basic Build Configuration

```typescript
import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    // Output directory
    outDir: 'dist',

    // Assets directory (relative to outDir)
    assetsDir: 'assets',

    // Inline assets smaller than this (bytes)
    assetsInlineLimit: 4096,

    // Generate source maps
    sourcemap: true, // or 'inline' | 'hidden'

    // Minification
    minify: 'esbuild', // 'esbuild' | 'terser' | false

    // Browser target (2025 default)
    target: 'baseline-widely-available',
    // Specifically: ['chrome107', 'edge107', 'firefox104', 'safari16']

    // CSS code splitting
    cssCodeSplit: true,

    // CSS minification
    cssMinify: 'esbuild', // or 'lightningcss'

    // Chunk size warning limit (kB)
    chunkSizeWarningLimit: 500,

    // Empty outDir before build
    emptyOutDir: true,
  },
})
```

### Minification Options

#### esbuild (Default - Faster)

```typescript
export default defineConfig({
  build: {
    minify: 'esbuild',
    // esbuild is 20-40x faster than terser
  },
})
```

#### Terser (Smaller Output)

```bash
npm install -D terser
```

```typescript
export default defineConfig({
  build: {
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
      mangle: {
        safari10: true,
      },
    },
  },
})
```

### Source Maps

```typescript
export default defineConfig({
  build: {
    // Separate .map files
    sourcemap: true,

    // Inline in bundle (larger files)
    sourcemap: 'inline',

    // Generate but don't add reference comment
    sourcemap: 'hidden',
  },
})
```

### Code Splitting & Chunking

#### Manual Chunks

```typescript
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunk for React
          vendor: ['react', 'react-dom'],

          // UI library chunk
          ui: ['@mui/material', '@mui/icons-material'],

          // Utility libraries
          utils: ['lodash', 'date-fns'],
        },
      },
    },
  },
})
```

#### Dynamic Manual Chunks (Function)

```typescript
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            // Split large dependencies
            if (id.includes('react')) {
              return 'vendor-react'
            }
            if (id.includes('lodash')) {
              return 'vendor-lodash'
            }
            // Default vendor chunk
            return 'vendor'
          }
        },
      },
    },
  },
})
```

#### Split Vendor Chunk Plugin

```typescript
import { defineConfig, splitVendorChunkPlugin } from 'vite'

export default defineConfig({
  plugins: [splitVendorChunkPlugin()],
})
```

### Library Mode

```typescript
import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  build: {
    lib: {
      // Entry point
      entry: resolve(__dirname, 'lib/main.ts'),

      // Global name for UMD
      name: 'MyLib',

      // Output file name (without extension)
      fileName: 'my-lib',

      // Formats to generate
      formats: ['es', 'umd', 'cjs'],
    },

    rollupOptions: {
      // Externalize dependencies
      external: ['vue', 'react', 'react-dom'],

      output: {
        // Global variable names for UMD
        globals: {
          vue: 'Vue',
          react: 'React',
          'react-dom': 'ReactDOM',
        },
      },
    },
  },
})
```

#### package.json for Library

```json
{
  "name": "my-lib",
  "type": "module",
  "files": ["dist"],
  "main": "./dist/my-lib.umd.cjs",
  "module": "./dist/my-lib.js",
  "types": "./dist/types/main.d.ts",
  "exports": {
    ".": {
      "import": "./dist/my-lib.js",
      "require": "./dist/my-lib.umd.cjs",
      "types": "./dist/types/main.d.ts"
    }
  }
}
```

### Multi-Page Apps

```typescript
import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        admin: resolve(__dirname, 'admin/index.html'),
        nested: resolve(__dirname, 'nested/index.html'),
      },
    },
  },
})
```

### Watch Mode

```bash
vite build --watch
```

```typescript
export default defineConfig({
  build: {
    watch: {
      // Rollup watch options
      include: 'src/**',
      exclude: 'node_modules/**',
    },
  },
})
```

---

## Monorepo

### pnpm Workspace Setup

#### Directory Structure

```
my-monorepo/
├── apps/
│   ├── web/
│   │   ├── package.json
│   │   ├── vite.config.ts
│   │   └── src/
│   └── admin/
│       ├── package.json
│       ├── vite.config.ts
│       └── src/
├── packages/
│   ├── ui/
│   │   ├── package.json
│   │   └── src/
│   ├── utils/
│   │   ├── package.json
│   │   └── src/
│   └── config/
│       ├── package.json
│       └── vite.config.ts
├── package.json
└── pnpm-workspace.yaml
```

#### pnpm-workspace.yaml

```yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

#### Root package.json

```json
{
  "name": "my-monorepo",
  "private": true,
  "scripts": {
    "dev": "pnpm --filter @my-org/web dev",
    "dev:admin": "pnpm --filter @my-org/admin dev",
    "build": "pnpm -r build",
    "build:web": "pnpm --filter @my-org/web build",
    "lint": "pnpm -r lint",
    "test": "pnpm -r test"
  },
  "devDependencies": {
    "vite": "^6.0.0",
    "typescript": "^5.3.0"
  }
}
```

### Package Configuration

#### Shared UI Package (packages/ui/package.json)

```json
{
  "name": "@my-org/ui",
  "version": "1.0.0",
  "type": "module",
  "main": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts",
    "./components/*": "./src/components/*"
  },
  "peerDependencies": {
    "react": "^18.0.0",
    "react-dom": "^18.0.0"
  }
}
```

#### App Package (apps/web/package.json)

```json
{
  "name": "@my-org/web",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "@my-org/ui": "workspace:*",
    "@my-org/utils": "workspace:*",
    "react": "^18.0.0",
    "react-dom": "^18.0.0"
  }
}
```

### Vite Configuration for Monorepo

```typescript
// apps/web/vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'
import { resolve } from 'path'

export default defineConfig({
  plugins: [
    react(),
    tsconfigPaths({
      root: '../..',
    }),
  ],

  resolve: {
    alias: {
      '@my-org/ui': resolve(__dirname, '../../packages/ui/src'),
      '@my-org/utils': resolve(__dirname, '../../packages/utils/src'),
    },
  },

  // Optimize dependencies from workspace
  optimizeDeps: {
    include: ['@my-org/ui', '@my-org/utils'],
  },

  build: {
    rollupOptions: {
      // Ensure workspace packages are bundled
    },
  },
})
```

### Shared Vite Config

```typescript
// packages/config/vite.config.ts
import { defineConfig, mergeConfig, type UserConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'

export const baseConfig: UserConfig = {
  plugins: [react(), tsconfigPaths()],
  build: {
    sourcemap: true,
    target: 'esnext',
  },
}

export function createConfig(config: UserConfig = {}): UserConfig {
  return mergeConfig(baseConfig, config)
}

// Usage in apps/web/vite.config.ts
import { defineConfig } from 'vite'
import { createConfig } from '@my-org/config'

export default defineConfig(createConfig({
  server: {
    port: 3000,
  },
}))
```

### Catalog Feature (pnpm v9+)

```yaml
# pnpm-workspace.yaml
packages:
  - 'apps/*'
  - 'packages/*'

catalog:
  vite: ^6.0.0
  react: ^18.0.0
  typescript: ^5.3.0
```

```json
// packages/ui/package.json
{
  "dependencies": {
    "react": "catalog:"
  },
  "devDependencies": {
    "vite": "catalog:",
    "typescript": "catalog:"
  }
}
```

### TypeScript Configuration

```json
// tsconfig.json (root)
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@my-org/ui": ["packages/ui/src"],
      "@my-org/ui/*": ["packages/ui/src/*"],
      "@my-org/utils": ["packages/utils/src"],
      "@my-org/utils/*": ["packages/utils/src/*"]
    }
  },
  "references": [
    { "path": "./apps/web" },
    { "path": "./apps/admin" },
    { "path": "./packages/ui" },
    { "path": "./packages/utils" }
  ]
}
```

---

## Vite 6 New Features

### Environment API

The most significant feature in Vite 6, enabling:
- **Multiple environments** in a single config (client, SSR, edge)
- **Separate module graphs** per environment
- **Edge runtime development** with full HMR support

```typescript
// vite.config.ts
export default defineConfig({
  environments: {
    client: {
      // Client environment config
    },
    ssr: {
      // SSR environment config
    },
    edge: {
      // Edge/Worker environment config
    },
  },
})
```

### Key Benefits

1. **Closer to production** - Development environment mirrors production more closely
2. **Edge development** - Develop Cloudflare Workers/Vercel Edge with full Vite experience
3. **Framework flexibility** - Framework authors can build better dev tools

### Updated Defaults

- **Sass Modern API** - Now default (legacy via `css.preprocessorOptions.sass.api: 'legacy'`)
- **CSS filename** - Library mode now uses package name instead of `style.css`
- **postcss-load-config** - Updated from v4 to v6

---

## Sources

### Official Documentation
- [Vite Official Guide](https://vite.dev/guide/)
- [Why Vite](https://vite.dev/guide/why)
- [Vite Configuration](https://vite.dev/config/)
- [Server Options](https://vite.dev/config/server-options)
- [Build Options](https://vite.dev/config/build-options)
- [Plugin API](https://vite.dev/guide/api-plugin)
- [Env Variables and Modes](https://vite.dev/guide/env-and-mode)
- [Building for Production](https://vite.dev/guide/build)

### Vite 6 Release
- [Vite 6.0 Announcement](https://vite.dev/blog/announcing-vite6)
- [Why Vite 6 is Groundbreaking](https://vike.dev/blog/vite-6)
- [Environment API Guide](https://main.vite.dev/guide/api-environment)
- [Increasing Vite's Potential with Environment API](https://green.sapphi.red/blog/increasing-vites-potential-with-the-environment-api)

### Plugins
- [Using Plugins](https://vite.dev/guide/using-plugins)
- [vite-tsconfig-paths](https://www.npmjs.com/package/vite-tsconfig-paths)
- [@vitejs/plugin-basic-ssl](https://github.com/vitejs/vite-plugin-basic-ssl)
- [vite-plugin-mkcert](https://www.npmjs.com/package/vite-plugin-mkcert)
- [Awesome Vite](https://github.com/vitejs/awesome-vite)

### Architecture Deep Dives
- [Vite's Core Magic: esbuild and Native ESM](https://leapcell.io/blog/vite-s-core-magic-how-esbuild-and-native-esm-reinvent-frontend-development)
- [esbuild vs Vite Comparison](https://betterstack.com/community/guides/scaling-nodejs/esbuild-vs-vite/)
- [Why Vite uses both Rollup and esbuild](https://github.com/vitejs/vite/discussions/7622)

### Build & Optimization
- [Manual Chunks for Caching](https://soledadpenades.com/posts/2025/use-manual-chunks-with-vite-to-facilitate-dependency-caching/)
- [Taming Large Chunks in Vite](https://www.mykolaaleksandrov.dev/posts/2025/11/taming-large-chunks-vite-react/)
- [vite-plugin-chunk-split](https://www.npmjs.com/package/vite-plugin-chunk-split)

### Monorepo Setup
- [React Monorepo with pnpm and Vite Tutorial](https://dev.to/lico/react-monorepo-setup-tutorial-with-pnpm-and-vite-react-project-ui-utils-5705)
- [Frontend Monorepo Guide](https://medium.com/@hibamalhiss/ultimate-guide-how-to-set-up-a-frontend-monorepo-with-vite-pnpm-and-shared-ui-libraries-4081585c069e)
- [pnpm Workspaces](https://pnpm.io/workspaces)
- [Setting Up Monorepo with Vite, TypeScript, and pnpm](https://www.rickyspears.com/technology/setting-up-a-monorepo-with-vite-typescript-and-pnpm-workspaces-a-comprehensive-guide/)

### HMR & Dev Server
- [HTTPS with Vite Dev Server](https://mattrossman.com/2024/03/15/https-with-the-vite-development-server)
- [Enabling HMR with NGINX Reverse Proxy](https://aronschueler.de/blog/2024/07/29/enabling-hot-module-replacement-hmr-in-vite-with-nginx-reverse-proxy/)
