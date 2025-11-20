# GitHub Code Search: TanStack Start Configuration

**Date:** 2025-11-20
**Queries:** 5 targeted searches
**Total Results:** 186 files analyzed

## Summary

TanStack Start uses `app.config.ts` (via `@tanstack/start/config`) for config. Key patterns:
- **Server presets** for deployment targets (aws-lambda, node-server, static, vercel)
- **Vite plugin integration** (tsConfigPaths, tailwindcss, content collections)
- **TSR config** for routing (appDirectory, file-based routing)
- **SST integration** for AWS deployments

## Core Patterns

### 1. Basic Configuration

**Pattern:** Minimal `app.config.ts` with `defineConfig`

```typescript
import { defineConfig } from '@tanstack/start/config'

export default defineConfig({})
```

**Examples:**
- [sst/sst](https://github.com/sst/sst/blob/13b5cc0ecb3e820d0aec1bbe951930d06c0c0abd/examples/aws-tanstack-start-alpha/app.config.ts)
- [skyfe79/tanstack-router-ko-docs](https://github.com/skyfe79/tanstack-router-ko-docs/blob/77400fa87266a595bc62167e649e6d40dda0a6b6/docs/framework/react/start/build-from-scratch.md)

### 2. Server Presets

**Pattern:** `server.preset` defines deployment target

**AWS Lambda:**
```typescript
export default defineConfig({
  server: {
    preset: 'aws-lambda',
    awsLambda: {
      streaming: true,
    },
  },
})
```
**Refs:** [sst/sst](https://github.com/sst/sst/blob/13b5cc0ecb3e820d0aec1bbe951930d06c0c0abd/examples/internal/playground/sites/tanstack-start/app.config.ts)

**Node Server:**
```typescript
export default defineConfig({
  server: {
    preset: 'node-server',
  },
})
```
**Refs:** [trpc examples](https://github.com/PacktPublishing/TypeScript-5-Design-Patterns-and-Best-Practices/blob/77f4e0d9ee64a62081a88800a5a7d1af99a06998/external-repos/trpc/examples/tanstack-start/app.config.ts)

**Static:**
```typescript
export default defineConfig({
  server: {
    preset: 'static',
  },
})
```
**Refs:** [linsa-io/attempt](https://github.com/linsa-io/attempt/blob/e6ab7a8aa44cfc77c50b1e3c7e5bbd17dd7b8905/web/app.config.ts)

**Vercel:**
```typescript
export default defineConfig({
  server: {
    preset: 'vercel',
  },
})
```
**Refs:** [palmaresHQ/palmares](https://github.com/palmaresHQ/palmares/blob/c7063931a2863d220b0fe6e66e468c738ce729d1/docs/app.config.ts)

### 3. Vite Plugins Integration

**Pattern:** Common plugins via `vite.plugins`

```typescript
import tsConfigPaths from 'vite-tsconfig-paths'
import tailwindcss from '@tailwindcss/vite'
import contentCollections from '@content-collections/vite'

export default defineConfig({
  vite: {
    plugins: [
      tsConfigPaths({ projects: ['./tsconfig.json'] }),
      tailwindcss(),
      contentCollections(),
    ],
  },
})
```

**Refs:**
- [revokslab/codecrawl](https://github.com/revokslab/codecrawl/blob/73ae76ee9ee8848a3b7cdbdcc2bfb0dc9b668f94/apps/web/app.config.ts)
- [rxliuli/site](https://github.com/rxliuli/site/blob/859fb286bea93fe9d57caf073db4395f1522c547/packages/v5/app.config.ts)

### 4. TSR Configuration

**Pattern:** `tsr.appDirectory` for routing setup

```typescript
export default defineConfig({
  tsr: {
    appDirectory: 'src',
  },
})
```

**Refs:** [TanStack/create-tsrouter-app](https://github.com/TanStack/create-tsrouter-app/blob/59e349918975fcdf086f05a7563107b344db76b3/examples/react-cra/resume-starter/app.config.ts)

### 5. Advanced Server Config

**Pattern:** Custom headers, route rules (Nitro-based)

```typescript
export default defineConfig({
  server: {
    preset: 'vercel',
    plugins: ['./plugins/nitro-worker.plugin.ts'],
    esbuild: {
      options: {
        treeShaking: true,
        target: 'esnext',
      },
    },
    routeRules: {
      '/assets/**': {
        headers: {
          'Cross-Origin-Embedder-Policy': 'require-corp',
          'Cross-Origin-Opener-Policy': 'same-origin',
        },
      },
    },
  },
})
```

**Refs:** [palmaresHQ/palmares](https://github.com/palmaresHQ/palmares/blob/c7063931a2863d220b0fe6e66e468c738ce729d1/docs/app.config.ts)

### 6. Vite Base Path

**Pattern:** Custom base path for deployment

```typescript
export default defineConfig({
  vite: {
    base: '/tan',
  },
})
```

**Refs:** [sst/sst playground](https://github.com/sst/sst/blob/13b5cc0ecb3e820d0aec1bbe951930d06c0c0abd/examples/internal/playground/sites/tanstack-start/app.config.ts)

## Router Configuration (tsr.config.ts)

**Separate file:** `tsr.config.ts` for router-specific settings

```typescript
import { defineConfig } from '@tanstack/router-vite-plugin'

export default defineConfig({
  routesDirectory: './src/routes',
  generatedRouteTree: './src/routeTree.gen.ts',
})
```

**Refs:**
- [Poltergeist/bag-of-holding](https://github.com/Poltergeist/bag-of-holding/blob/2b66491b50907252104a27d6ccf192ea0aaae487/apps/web/tsr.config.ts)
- [bschreder/web-reader](https://github.com/bschreder/web-reader/blob/80503ca15e6ad284bc6f6124a0199b1f2ef3601e/frontend/tsr.config.ts)

## TanStack Query Integration (Angular)

**Pattern:** Angular-specific config with providers

```typescript
import { provideTanStackQuery } from '@tanstack/angular-query-experimental'
import { withDevtools } from '@tanstack/angular-query-experimental/devtools'

export const appConfig: ApplicationConfig = {
  providers: [
    provideHttpClient(withFetch()),
    provideTanStackQuery(
      new QueryClient({
        defaultOptions: {
          queries: {
            gcTime: 1000 * 60 * 60 * 24, // 24 hours
          },
        },
      }),
      withDevtools(),
    ),
  ],
}
```

**Refs:** [TanStack/query](https://github.com/TanStack/query/blob/62263251d660048f8546d3d3c9f2a74f48a9b4bf/examples/angular/rxjs/src/app/app.config.ts)

## Deployment-Specific Patterns

### AWS Lambda (SST)

**Must set:** `server.preset: 'aws-lambda'` for SST deployments

```typescript
export default defineConfig({
  server: {
    preset: 'aws-lambda',
    awsLambda: {
      streaming: true, // Enable response streaming
    },
  },
})
```

### Static Site (Tauri)

**Conditional config** for Tauri apps:

```typescript
const is_tauri = process.env.TAURI_ENV_TARGET_TRIPLE !== undefined

const config = is_tauri
  ? defineConfig({
      vite: {
        envPrefix: ['VITE_', 'TAURI_ENV_*'],
        build: {
          target: process.env.TAURI_ENV_PLATFORM == 'windows'
            ? 'chrome105'
            : 'safari13',
        },
      },
      server: {
        preset: 'static',
      },
    })
  : // ... web config
```

**Refs:** [linsa-io/attempt](https://github.com/linsa-io/attempt/blob/e6ab7a8aa44cfc77c50b1e3c7e5bbd17dd7b8905/web/app.config.ts)

## Common Plugin Stack

**Most frequent combo:**
1. `vite-tsconfig-paths` (path aliases)
2. `@tailwindcss/vite` (Tailwind CSS v4)
3. `@content-collections/vite` (content management)
4. `unplugin-markdown/vite` (Markdown processing)

## Key Learnings

- **Two config files:** `app.config.ts` (app-level) + optional `tsr.config.ts` (router-only)
- **Server presets crucial:** Determines build output format (Lambda, Node, static)
- **Vite-first:** All bundler config via `vite` property
- **SST requires aws-lambda preset:** Essential for AWS deployments
- **Plugin order matters:** tsConfigPaths typically first for path resolution
- **Tailwind v4 via Vite plugin:** New pattern replacing PostCSS config

## All Analyzed Files

### app.config.ts files (10)
1. [TanStack/query - Angular example](https://github.com/TanStack/query/blob/62263251d660048f8546d3d3c9f2a74f48a9b4bf/examples/angular/rxjs/src/app/app.config.ts)
2. [sst/sst - playground](https://github.com/sst/sst/blob/13b5cc0ecb3e820d0aec1bbe951930d06c0c0abd/examples/internal/playground/sites/tanstack-start/app.config.ts)
3. [sst/sst - aws-tanstack-start-alpha](https://github.com/sst/sst/blob/13b5cc0ecb3e820d0aec1bbe951930d06c0c0abd/examples/aws-tanstack-start-alpha/app.config.ts)
4. [TanStack/create-tsrouter-app - resume-starter](https://github.com/TanStack/create-tsrouter-app/blob/59e349918975fcdf086f05a7563107b344db76b3/examples/react-cra/resume-starter/app.config.ts)
5. [revokslab/codecrawl](https://github.com/revokslab/codecrawl/blob/73ae76ee9ee8848a3b7cdbdcc2bfb0dc9b668f94/apps/web/app.config.ts)
6. [palmaresHQ/palmares](https://github.com/palmaresHQ/palmares/blob/c7063931a2863d220b0fe6e66e468c738ce729d1/docs/app.config.ts)
7. [linsa-io/attempt](https://github.com/linsa-io/attempt/blob/e6ab7a8aa44cfc77c50b1e3c7e5bbd17dd7b8905/web/app.config.ts)
8. [brandonroberts/tanstack-angular-router](https://github.com/brandonroberts/tanstack-angular-router/blob/a89ddd27d8116392c6fbc1205c17f488fd19f660/projects/file-routing/src/app/app.config.ts)
9. [trpc examples](https://github.com/PacktPublishing/TypeScript-5-Design-Patterns-and-Best-Practices/blob/77f4e0d9ee64a62081a88800a5a7d1af99a06998/external-repos/trpc/examples/tanstack-start/app.config.ts)
10. [rxliuli/site](https://github.com/rxliuli/site/blob/859fb286bea93fe9d57caf073db4395f1522c547/packages/v5/app.config.ts)

### tsr.config.ts files (4)
1. [Poltergeist/bag-of-holding](https://github.com/Poltergeist/bag-of-holding/blob/2b66491b50907252104a27d6ccf192ea0aaae487/apps/web/tsr.config.ts)
2. [PUPUENDO/app-frontend](https://github.com/PUPUENDO/app-frontend/blob/a3b463b7bb8013fbf1e085cdc7df462c1dec60cc/tsr.config.ts)
3. [saddathasan/portfolio2.0](https://github.com/saddathasan/portfolio2.0/blob/b9cc969c0c4e41a26b6f08c37276bab075310c2c/tsr.config.ts)
4. [bschreder/web-reader](https://github.com/bschreder/web-reader/blob/80503ca15e6ad284bc6f6124a0199b1f2ef3601e/frontend/tsr.config.ts)

### SST Component Source (10)
1. [sst/sst - tan-stack-start.ts](https://github.com/sst/sst/blob/13b5cc0ecb3e820d0aec1bbe951930d06c0c0abd/platform/src/components/aws/tan-stack-start.ts)
2. [michaelcuneo/markdown-editor](https://github.com/michaelcuneo/markdown-editor/blob/18562525343b801f450cb51525d3cc0dc7601408/.sst/platform/src/components/aws/tan-stack-start.ts)
3-10. [Various SST forks with identical component code]

### Documentation (2)
1. [skyfe79/tanstack-router-ko-docs - build-from-scratch](https://github.com/skyfe79/tanstack-router-ko-docs/blob/77400fa87266a595bc62167e649e6d40dda0a6b6/docs/framework/react/start/build-from-scratch.md)
2. [skyfe79/tanstack-router-ko-docs - guide](https://github.com/skyfe79/tanstack-router-ko-docs/blob/77400fa87266a595bc62167e649e6d40dda0a6b6/docs/framework/react/guide/tanstack-start.md)
