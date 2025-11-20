# GitHub Code Search Results

**Query:** `filename:app.config language:typescript tanstack`
**Found:** 100 results, showing top 10
**Execution:** 2.9s

---

### 1. [TanStack/query](https://github.com/TanStack/query) ⭐ 47.4k

**Path:** `examples/angular/rxjs/src/app/app.config.ts`
**Language:** typescript | **Lines:** 31
**Link:** https://github.com/TanStack/query/blob/62263251d660048f8546d3d3c9f2a74f48a9b4bf/examples/angular/rxjs/src/app/app.config.ts

```typescript
import {
  provideHttpClient,
  withFetch,
  withInterceptors,
} from '@angular/common/http'
import {
  QueryClient,
  provideTanStackQuery,
} from '@tanstack/angular-query-experimental'
import { withDevtools } from '@tanstack/angular-query-experimental/devtools'
import { autocompleteMockInterceptor } from './api/autocomplete-mock.interceptor'
import type { ApplicationConfig } from '@angular/core'

export const appConfig: ApplicationConfig = {
  providers: [
    provideHttpClient(
      withFetch(),
      withInterceptors([autocompleteMockInterceptor]),
    ),
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

---

### 2. [sst/sst](https://github.com/sst/sst) ⭐ 24.9k

**Path:** `examples/internal/playground/sites/tanstack-start/app.config.ts`
**Language:** typescript | **Lines:** 19
**Link:** https://github.com/sst/sst/blob/13b5cc0ecb3e820d0aec1bbe951930d06c0c0abd/examples/internal/playground/sites/tanstack-start/app.config.ts

```typescript
import { defineConfig } from "@tanstack/react-start/config";
import tsConfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  server: {
    preset: "aws-lambda",
    awsLambda: {
      streaming: true,
    },
  },
  vite: {
    plugins: [
      tsConfigPaths({
        projects: ["./tsconfig.json"],
      }),
    ],
    base: "/tan",
  },
});
```

---

### 3. [sst/sst](https://github.com/sst/sst) ⭐ 24.9k

**Path:** `examples/aws-tanstack-start-alpha/app.config.ts`
**Language:** typescript | **Lines:** 18
**Link:** https://github.com/sst/sst/blob/13b5cc0ecb3e820d0aec1bbe951930d06c0c0abd/examples/aws-tanstack-start-alpha/app.config.ts

```typescript
import { defineConfig } from '@tanstack/start/config'
import tsConfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  server: {
    preset: 'aws-lambda',
    awsLambda: {
      streaming: true,
    },
  },
  vite: {
    plugins: [
      tsConfigPaths({
        projects: ['./tsconfig.json'],
      }),
    ],
  },
})
```

---

### 4. [TanStack/create-tsrouter-app](https://github.com/TanStack/create-tsrouter-app) ⭐ 1.1k

**Path:** `examples/react-cra/resume-starter/app.config.ts`
**Language:** typescript | **Lines:** 21
**Link:** https://github.com/TanStack/create-tsrouter-app/blob/59e349918975fcdf086f05a7563107b344db76b3/examples/react-cra/resume-starter/app.config.ts

```typescript
import { defineConfig } from "@tanstack/start/config";
import contentCollections from "@content-collections/vite";
import viteTsConfigPaths from "vite-tsconfig-paths";
import tailwindcss from "@tailwindcss/vite";

const config = defineConfig({
  tsr: {
    appDirectory: "src",
  },
  vite: {
    plugins: [
      contentCollections(),
      viteTsConfigPaths({
        projects: ["./tsconfig.json"],
      }),
      tailwindcss(),
    ],
  },
});

export default config;
```

---

### 5. [revokslab/codecrawl](https://github.com/revokslab/codecrawl) ⭐ 73

**Path:** `apps/web/app.config.ts`
**Language:** typescript | **Lines:** 19
**Link:** https://github.com/revokslab/codecrawl/blob/73ae76ee9ee8848a3b7cdbdcc2bfb0dc9b668f94/apps/web/app.config.ts

```typescript
import { defineConfig } from '@tanstack/react-start/config';
import tsConfigPaths from 'vite-tsconfig-paths';
import contentCollections from '@content-collections/vinxi';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  tsr: {
    appDirectory: 'src',
  },
  vite: {
    plugins: [
      contentCollections(),
      tailwindcss(),
      tsConfigPaths({
        projects: ['./tsconfig.json'],
      }),
    ],
  },
});
```

---

### 6. [palmaresHQ/palmares](https://github.com/palmaresHQ/palmares) ⭐ 55

**Path:** `docs/app.config.ts`
**Language:** typescript | **Lines:** 27
**Link:** https://github.com/palmaresHQ/palmares/blob/c7063931a2863d220b0fe6e66e468c738ce729d1/docs/app.config.ts

```typescript
import { defineConfig } from '@tanstack/react-start/config';
import monacoWorkerPlugin from './plugins/vite-worker-plugin';
import tsConfigPaths from 'vite-tsconfig-paths';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  tsr: {
    appDirectory: 'src'
  },
  server: {
    preset: 'vercel',
    plugins: ['./plugins/nitro-worker.plugin.ts'],
    esbuild: {
      options: {
        treeShaking: true,
        target: 'esnext'
      }
    },
    routeRules: {
      '/assets/**': {
        headers: {
          'Cross-Origin-Embedder-Policy': 'require-corp',
          'Cross-Origin-Opener-Policy': 'same-origin'
        }
      },
      '/_build/assets/**': {
        headers: {
```

---

### 7. [linsa-io/attempt](https://github.com/linsa-io/attempt) ⭐ 52

**Path:** `web/app.config.ts`
**Language:** typescript | **Lines:** 27
**Link:** https://github.com/linsa-io/attempt/blob/e6ab7a8aa44cfc77c50b1e3c7e5bbd17dd7b8905/web/app.config.ts

```typescript
import { defineConfig } from "@tanstack/start/config"
import tsConfigPaths from "vite-tsconfig-paths"

const is_tauri = process.env.TAURI_ENV_TARGET_TRIPLE !== undefined

const config = is_tauri
  ? defineConfig({
      vite: {
        envPrefix: ["VITE_", "TAURI_ENV_*"],
        build: {
          target:
            process.env.TAURI_ENV_PLATFORM == "windows"
              ? "chrome105"
              : "safari13",
          minify: !process.env.TAURI_ENV_DEBUG ? "esbuild" : false,
          sourcemap: !!process.env.TAURI_ENV_DEBUG,
        },
        plugins: [
          tsConfigPaths({
            projects: ["./tsconfig.json"],
          }),
        ],
      },
      server: {
        preset: "static",
      },
    })
```

---

### 8. [brandonroberts/tanstack-angular-router](https://github.com/brandonroberts/tanstack-angular-router) ⭐ 29

**Path:** `projects/file-routing/src/app/app.config.ts`
**Language:** typescript | **Lines:** 10
**Link:** https://github.com/brandonroberts/tanstack-angular-router/blob/a89ddd27d8116392c6fbc1205c17f488fd19f660/projects/file-routing/src/app/app.config.ts

```typescript
import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from 'tanstack-angular-router-experimental';
import { routeTree } from '../routeTree.gen';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter({ routeTree }),
  ],
};
```

---

### 9. [PacktPublishing/TypeScript-5-Design-Patterns-and-Best-Practices](https://github.com/PacktPublishing/TypeScript-5-Design-Patterns-and-Best-Practices) ⭐ 20

**Path:** `external-repos/trpc/examples/tanstack-start/app.config.ts`
**Language:** typescript | **Lines:** 35
**Link:** https://github.com/PacktPublishing/TypeScript-5-Design-Patterns-and-Best-Practices/blob/77f4e0d9ee64a62081a88800a5a7d1af99a06998/external-repos/trpc/examples/tanstack-start/app.config.ts

```typescript
import { defineConfig } from '@tanstack/start/config';
import tsConfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  server: {
    // https://tanstack.com/router/v1/docs/framework/react/start/hosting
    preset: 'node-server',
  },
  vite: {
    plugins: [
      tsConfigPaths({
        projects: ['./tsconfig.json'],
      }),
    ],
  },
});

---

import { defineConfig } from '@tanstack/start/config';
import tsConfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  server: {
    // https://tanstack.com/router/v1/docs/framework/react/start/hosting
    preset: 'node-server',
  },
  vite: {
    plugins: [
      tsConfigPaths({
        projects: ['./tsconfig.json'],
      }),
    ],
  },
});
```

---

### 10. [rxliuli/site](https://github.com/rxliuli/site) ⭐ 18

**Path:** `packages/v5/app.config.ts`
**Language:** typescript | **Lines:** 27
**Link:** https://github.com/rxliuli/site/blob/859fb286bea93fe9d57caf073db4395f1522c547/packages/v5/app.config.ts

```typescript
import { defineConfig } from '@tanstack/react-start/config'
import viteTsConfigPaths from 'vite-tsconfig-paths'
import tailwindcss from '@tailwindcss/vite'
import markdownPlugin from 'unplugin-markdown/vite'
import type { Plugin } from 'vite'

const config = defineConfig({
  tsr: {
    appDirectory: 'src',
  },
  vite: {
    plugins: [
      // this is the plugin that enables path aliases
      viteTsConfigPaths({
        projects: ['./tsconfig.json'],
      }),
      tailwindcss(),
      markdownPlugin() as Plugin,
      // analyzer({
      //   analyzerMode: 'static',
      //   fileName: 'stats.html',
      // }),
    ],
  },
  server: {
    prerender: {
      routes: ['/', '/ping/privacy', '/webstore/privacy'],
```

---
