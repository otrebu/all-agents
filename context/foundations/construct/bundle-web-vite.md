---
tags: [frontend, execution, bundler]
depends:
  - "@context/blocks/construct/tsconfig-web.md"
  - "@context/blocks/construct/package-json-web.md"
  - "@context/blocks/construct/vite.md"
  - "@context/foundations/security/secrets-env-vite.md"
---

# TypeScript: Web App with Vite

Vite bundler for React/Vue frontend applications. Fast HMR, optimized production builds.

**For:** React apps, Vue apps, frontend SPAs

## TypeScript Config (Web/Bundler)

@context/blocks/construct/tsconfig-web.md

## Vite Config, Path Aliases, Tailwind

@context/blocks/construct/vite.md

## package.json (Web App)

@context/blocks/construct/package-json-web.md

## Vite Configuration

React + path aliases from tsconfig.json (via vite-tsconfig-paths):

```typescript
// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
});
```

## Development Workflow

Run scripts with your package manager (`npm run`, `pnpm`, `yarn`, `bun`):

```bash
dev              # Development with HMR
typecheck:watch  # Type-check in parallel (recommended)
build            # Production build
preview          # Preview production build
```

## Folder Structure

```
my-app/
├── public/               # Static assets (copied as-is)
│   └── favicon.ico
├── src/
│   ├── main.tsx         # Entry point
│   ├── App.tsx          # Root component
│   ├── components/
│   ├── utils/
│   ├── styles/
│   │   └── global.css
│   └── vite-env.d.ts    # Vite type declarations
├── index.html           # HTML entry (Vite-specific)
├── vite.config.ts
├── tsconfig.json
├── package.json
└── .gitignore
```

**Key difference from Node.js:** `index.html` at root is the entry point.

## index.html Entry Point

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>My App</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

## Environment Variables

Typed, validated config with Zod. Only `VITE_*` vars exposed to client.

@context/foundations/security/secrets-env-vite.md

## Testing

Use Vitest (Vite-compatible). Add to package.json:

```json
"scripts": { "test": "vitest run" },
"devDependencies": { "vitest": "*" }
```

## Troubleshooting

### Path aliases not working

1. Verify tsconfig.json paths match vite.config.ts alias
2. Restart Vite dev server
3. Check `baseUrl: "."` is set in tsconfig.json

### Type errors not caught in dev

Vite doesn't type-check during dev for speed. Run in parallel:

```bash
# Terminal 1
dev

# Terminal 2
typecheck:watch
```

### Build fails but dev works

Run type-check before build:

```bash
typecheck   # See errors
build       # Then build
```

## When to Use

- **React applications** — SPAs, dashboards, web apps
- **Vue applications** — Modern Vue 3 apps
- **Fast development** — HMR, instant feedback
- **Optimized builds** — Code splitting, tree shaking, minification

## When NOT to Use

- **Node.js backend** → @context/foundations/construct/transpile-esm-tsc.md
- **CLI tools** → @context/foundations/construct/exec-bun.md
- **SSR apps** → Consider Next.js or TanStack Start

## Comparison

| Aspect      | Vite              | Create React App    | Next.js         |
| ----------- | ----------------- | ------------------- | --------------- |
| HMR speed   | Instant           | Slow                | Fast            |
| Build speed | Fast (esbuild)    | Slower (webpack)    | Fast            |
| SSR         | Manual            | No                  | Built-in        |
| Best for    | SPAs, dashboards  | Legacy projects     | Full-stack apps |
