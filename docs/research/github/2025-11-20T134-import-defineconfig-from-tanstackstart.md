# GitHub Code Search Results

**Query:** `import { defineConfig } from '@tanstack/start'`
**Found:** 10 results, showing top 7
**Execution:** 1.5s

---

### 1. [daydreamsai/lucid-agents](https://github.com/daydreamsai/lucid-agents) ⭐ 106

**Path:** `packages/tanstack/tsup.config.ts`
**Language:** typescript | **Lines:** 21
**Link:** https://github.com/daydreamsai/lucid-agents/blob/35ebd40970616f843dada6eaca029b524a5edc06/packages/tanstack/tsup.config.ts

```typescript
import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  dts: true,
  sourcemap: true,
  clean: true,
  treeshake: true,
  tsconfig: "tsconfig.build.json",
  external: [
    '@lucid-agents/core',
    '@lucid-agents/payments',
    '@lucid-agents/types',
    '@lucid-agents/x402-tanstack-start',
    '@tanstack/start',
    '@tanstack/react-router',
    'viem',
    'x402',
  ],
});
```

---

### 2. [abhay-ramesh/pushduck](https://github.com/abhay-ramesh/pushduck) ⭐ 90

**Path:** `docs/content/docs/integrations/tanstack-start.mdx`
**Language:** mdx | **Lines:** 89
**Link:** https://github.com/abhay-ramesh/pushduck/blob/7b42bfd9127895736689b66899c57e58b6bbc824/docs/content/docs/integrations/tanstack-start.mdx

```mdx
## Full Application Example

### Project Structure

```
app/
├── components/
│   └── UploadDemo.tsx
├── lib/
│   └── upload.ts
├── routes/
│   ├── api.upload.$.ts
│   ├── upload.tsx
│   └── __root.tsx
├── router.ts
└── main.tsx
```

### Root Layout

```typescript title="app/routes/__root.tsx"
import { createRootRoute, Outlet } from '@tanstack/start';

export const Route = createRootRoute({
  component: RootComponent,
});

function RootComponent() {
  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>TanStack Start + Pushduck</title>
      </head>
      <body>
        <div className="min-h-screen bg-gray-50">
          <nav className="bg-white shadow">
            <div className="container mx-auto px-4 py-4">
              <h1 className="text-xl font-semibold">Upload Demo</h1>
// ... truncated ...
```

---

### 3. [TarunTomar122/digital-garden](https://github.com/TarunTomar122/digital-garden) ⭐ 5

**Path:** `v3/faster-digital-garden/vite.edge.config.ts`
**Language:** typescript | **Lines:** 57
**Link:** https://github.com/TarunTomar122/digital-garden/blob/ff8efe5e4de9318b4d8785f132b538a200a6e605/v3/faster-digital-garden/vite.edge.config.ts

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { TanStackRouterVite } from '@tanstack/router-plugin/vite'

export default defineConfig({
  plugins: [TanStackRouterVite({}), react()],
  build: {
    target: 'esnext',
    ssr: true,
    rollupOptions: {
      input: 'src/server-edge.ts',
      output: {
        format: 'es'
      },
      external: [
        'formidable',
        'express',
        'node:stream',
        'node:stream/promises',
        'fs',
        'path',
        'spotify-web-api-node',
        /\.css$/
      ]
    }
  },

---

build: {
    target: 'esnext',
    ssr: true,
    rollupOptions: {
      input: 'src/server-edge.ts',
      output: {
        format: 'es'
      },
      external: [
        'formidable',
        'express',
// ... truncated ...
```

---

### 4. [Volt-js/volt.js](https://github.com/Volt-js/volt.js) ⭐ 1

**Path:** `packages/cli/src/adapters/setup/templates.ts`
**Language:** typescript | **Lines:** 89
**Link:** https://github.com/Volt-js/volt.js/blob/9d03f6bd94634bcfcd2b87f2e5ce9ed4e6cb9a50/packages/cli/src/adapters/setup/templates.ts

```typescript
const allDeps = getAllDependencies(
    enabledFeatures,
    config.database.provider,
    config.orm,
    config.styling,
    config.ui.shadcn
  )

  // Base dependencies for all projects
  const baseDependencies = {
    '@volt.js/core': 'latest',
    'zod': '^3.25.0'
  }

  // Framework-specific dependencies
  const frameworkDeps = getFrameworkDependencies(config.framework)

  // Combine all dependencies
  const dependencies = {
    ...baseDependencies,
    ...frameworkDeps.dependencies,
    ...allDeps.dependencies.reduce((acc, dep) => ({ ...acc, [dep.name]: dep.version }), {})
  }

  const devDependencies = {
    'typescript': '^5.6.0',
    '@types/node': '^22.0.0',
    'tsx': '^4.7.0',
    ...frameworkDeps.devDependencies,
    ...allDeps.devDependencies.reduce((acc, dep) => ({ ...acc, [dep.name]: dep.version }), {})
  }

  // Generate scripts dynamically
  const scripts = generateScripts(config)

  const packageJson = {
    name: config.projectName,
    version: "0.1.0",
    private: true,
    scripts,
// ... truncated ...
```

---

### 5. [adgang/deno-tanstack-start](https://github.com/adgang/deno-tanstack-start) ⭐ 1

**Path:** `app.config.ts`
**Language:** typescript | **Lines:** 78
**Link:** https://github.com/adgang/deno-tanstack-start/blob/0bd3f9a74c679290924b5e8df1d72ce942f5a07a/app.config.ts

```typescript
// app.config.ts

import viteReact from '@vitejs/plugin-react';
// import  from '@vitejs/plugin-react'
import { TanStackRouterVite } from '@tanstack/router-plugin/vite';

import { defineConfig } from '@tanstack/start/config';
// import ssr from "npm:vite-plugin-ssr@^0.4.69/plugin";
import path from 'node:path';

export default defineConfig({
  tsr: {
    addExtensions: true,
    routesDirectory: 'src/routes',
  },
  vite: {
    plugins: [
      // deno(),
      // viteDeno({}),
      // pluginDeno({

      // }),
      // pluginDeno( // env: "deno",
      //     // see configuration docs
      // ),

      TanStackRouterVite({
        enableRouteGeneration: false,
        routesDirectory: 'app/routes',
        semicolons: true,
        addExtensions: true,
      }),

---

// deno(),
      // viteDeno({}),
      // pluginDeno({

      // }),
// ... truncated ...
```

---

### 6. [skyfe79/tanstack-router-ko-docs](https://github.com/skyfe79/tanstack-router-ko-docs) ⭐ 0

**Path:** `docs/framework/react/start/build-from-scratch.md`
**Language:** markdown | **Lines:** 87
**Link:** https://github.com/skyfe79/tanstack-router-ko-docs/blob/77400fa87266a595bc62167e649e6d40dda0a6b6/docs/framework/react/start/build-from-scratch.md

```markdown
먼저 `package.json` 파일을 수정하여 새로운 Vinxi 진입점을 참조하고 `"type": "module"`을 설정합니다.

```json
{
  // ...
  "type": "module",
  "scripts": {
    "dev": "vinxi dev",
    "build": "vinxi build",
    "start": "vinxi start"
  }
}
```

Vinxi가 TanStack Start의 최소 동작을 시작하도록 하려면 `app.config.ts` 파일을 설정해야 합니다.

```typescript
// app.config.ts
import { defineConfig } from '@tanstack/start/config'

export default defineConfig({})
```


## 기본 템플릿 추가하기

TanStack Start를 사용하려면 다음 네 가지 파일이 필요합니다:

1. 라우터 설정 파일
2. 서버 진입점 파일
3. 클라이언트 진입점 파일
4. 애플리케이션의 루트 파일

설정이 완료되면 다음과 같은 파일 트리가 생성됩니다:

```
.
├── app/
│   ├── routes/
│   │   └── `__root.tsx`
// ... truncated ...
```

---

### 7. [skyfe79/tanstack-router-ko-docs](https://github.com/skyfe79/tanstack-router-ko-docs) ⭐ 0

**Path:** `docs/framework/react/guide/tanstack-start.md`
**Language:** markdown | **Lines:** 87
**Link:** https://github.com/skyfe79/tanstack-router-ko-docs/blob/77400fa87266a595bc62167e649e6d40dda0a6b6/docs/framework/react/guide/tanstack-start.md

```markdown
이제 `package.json` 파일을 업데이트하여 새로운 Vinxi 진입점을 참조하고 `"type": "module"`을 설정하겠습니다.

```jsonc
{
  // ...
  "type": "module",
  "scripts": {
    "dev": "vinxi dev",
    "build": "vinxi build",
    "start": "vinxi start",
  },
}
```

Vinxi가 TanStack Start의 최소 동작을 시작하도록 하려면 `app.config.ts` 파일을 구성해야 합니다.

```typescript
// app.config.ts
import { defineConfig } from '@tanstack/start/config'

export default defineConfig({})
```


# 기본 템플릿 추가하기

TanStack Start를 사용하려면 다음 네 가지 파일이 필요합니다:

1. 라우터 설정 파일
2. 서버 진입점 파일
3. 클라이언트 진입점 파일
4. 애플리케이션의 루트 파일

설정이 완료되면 다음과 같은 파일 트리가 생성됩니다:

```
.
├── app/
│   ├── routes/
│   │   └── `__root.tsx`
// ... truncated ...
```

---
