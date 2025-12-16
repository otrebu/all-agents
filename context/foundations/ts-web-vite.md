---
tags: [frontend, execution, bundler]
depends:
  - @context/blocks/tools/tsconfig-base.md
  - @context/blocks/tools/vite.md
---

# TypeScript: Web App with Vite

Vite bundler for React/Vue frontend applications. Fast HMR, optimized production builds.

**For:** React apps, Vue apps, frontend SPAs

## References

@context/blocks/tools/tsconfig-base.md
@context/blocks/tools/vite.md

## Tool-Specific TypeScript Config

Extends base config with frontend and Vite settings:

```json
{
  "extends": "./tsconfig.base.json",  // Or inline base settings
  "compilerOptions": {
    // === Module Settings (Bundler for Vite) ===
    "module": "Preserve",
    "moduleResolution": "bundler",

    // === Frontend Specific ===
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "jsx": "react-jsx",  // Or "preserve" for Vue

    // === No TypeScript Emit (Vite handles it) ===
    "noEmit": true,

    // === Import Resolution ===
    "allowImportingTsExtensions": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

**Why these settings:**
- `module: Preserve` - Keep import/export as-is (Vite handles transformation)
- `moduleResolution: bundler` - Works with Vite's module resolution
- `lib: ["DOM"]` - Browser APIs available
- `jsx: "react-jsx"` - Modern React JSX transform (or "preserve" for Vue)
- `noEmit: true` - Vite bundles, TypeScript only checks types
- `allowImportingTsExtensions: true` - Import `.ts` files in development

## Complete package.json

```json
{
  "name": "my-app",
  "version": "0.1.0",
  "type": "module",

  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "preview": "vite preview",
    "typecheck": "tsc --noEmit",
    "typecheck:watch": "tsc --noEmit --watch"
  },

  "dependencies": {
    "react": "^18.3.0",
    "react-dom": "^18.3.0"
  },

  "devDependencies": {
    "@vitejs/plugin-react": "^4.0.0",
    "typescript": "^5.0.0",
    "vite": "^5.0.0"
  }
}
```

**Key points:**
- `tsc --noEmit` before `vite build` (type-check before bundling)
- Vite handles all bundling, no tsc compilation

## Vite Configuration

Path aliases must be configured in both TypeScript and Vite:

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

**Important:** Vite aliases must match tsconfig.json paths.

## Development Workflow

```bash
# Development with HMR
pnpm dev   # vite

# Type-check in parallel (recommended)
pnpm typecheck:watch   # tsc --noEmit --watch

# Production build
pnpm build   # tsc --noEmit && vite build

# Preview production build
pnpm preview   # vite preview
```

## When to Use

- **React applications** - SPAs, dashboards, web apps
- **Vue applications** - Modern Vue 3 apps
- **Fast development** - HMR, instant feedback
- **Optimized builds** - Code splitting, tree shaking, minification

## When NOT to Use

- **Node.js backend** - Use @context/foundations/ts-node-tsc.md or @context/foundations/ts-node-tsx.md
- **CLI tools** - Use @context/foundations/ts-bun.md or @context/foundations/ts-node-tsx.md
- **Server-side rendering** - Consider Next.js, Remix, or SvelteKit

## Path Aliases

Configure path aliases in BOTH files:

**tsconfig.json:**
```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"],
      "@components/*": ["./src/components/*"],
      "@utils/*": ["./src/utils/*"]
    }
  }
}
```

**vite.config.ts:**
```typescript
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@utils': path.resolve(__dirname, './src/utils'),
    },
  },
});
```

Usage in code:

```typescript
import { Button } from '@components/Button';
import { formatDate } from '@utils/date';
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
│   │   └── Button.tsx
│   ├── utils/
│   │   └── date.ts
│   ├── styles/
│   │   └── global.css
│   └── vite-env.d.ts    # Vite type declarations
├── index.html           # HTML entry (Vite-specific)
├── vite.config.ts
├── tsconfig.json
├── package.json
├── .gitignore
└── README.md
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

Vite processes `<script type="module">` and bundles everything.

## Environment Variables

Vite uses `VITE_` prefix for client-side env vars:

```bash
# .env
VITE_API_URL=https://api.example.com
```

Access in code:

```typescript
const apiUrl = import.meta.env.VITE_API_URL;
```

**Note:** Only `VITE_*` variables are exposed to client code.

## .gitignore

```
node_modules/
dist/
*.log
.env.local
.env.*.local
```

## CI/CD Example

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v2
        with:
          version: 8

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm

      - run: pnpm install --frozen-lockfile
      - run: pnpm typecheck
      - run: pnpm build

      # Deploy dist/ to hosting (Vercel, Netlify, etc.)
```

## Tailwind CSS Integration

See @context/blocks/tools/vite.md for Tailwind setup:

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [tailwindcss()],
});
```

## Testing

Vite doesn't include a test runner. Use Vitest (Vite-compatible):

```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui"
  },
  "devDependencies": {
    "vitest": "^1.0.0",
    "@vitest/ui": "^1.0.0"
  }
}
```

## Troubleshooting

### Path aliases not working

1. Verify `tsconfig.json` paths match `vite.config.ts` alias
2. Restart Vite dev server
3. Check `baseUrl: "."` is set in tsconfig.json

### Type errors not caught in dev

Vite doesn't type-check during dev for speed. Run in parallel:

```bash
# Terminal 1
pnpm dev

# Terminal 2
pnpm typecheck:watch
```

### Build fails but dev works

Run type-check before build:

```bash
pnpm typecheck   # See errors
pnpm build       # Then build
```

## Comparison with Other Bundlers

| Aspect | Vite | Create React App | Next.js |
|--------|------|------------------|---------|
| HMR speed | ✅ Instant | ⚠️ Slow | ✅ Fast |
| Build speed | ✅ Fast (esbuild) | ⚠️ Slower (webpack) | ✅ Fast |
| SSR | ⚠️ Manual | ❌ No | ✅ Built-in |
| Best for | SPAs, dashboards | Legacy projects | Full-stack apps |

## Alternative Strategies

- **Server-side rendering?** Consider Next.js or Remix
- **Node.js backend?** Use @context/foundations/ts-node-tsc.md
- **CLI tools?** Use @context/foundations/ts-bun.md
