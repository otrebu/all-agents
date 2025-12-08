---
depends: []
---

# TypeScript + Vite + React Stack

Modern React frontend: Vite build, Tailwind CSS, shadcn/ui components. Supports monorepo via pnpm workspaces.

## Layers

| Layer | Reference |
|-------|-----------|
| Runtime | @primitives/tools/PNPM.md, @primitives/tools/NODE.md, @primitives/tools/TYPESCRIPT.md |
| Frontend | @primitives/tools/REACT.md, @primitives/tools/VITE.md, @primitives/tools/TAILWIND.md |
| UI | @primitives/tools/SHADCN.md, @primitives/tools/COMPONENT_ARCHITECTURE.md |
| Data | @primitives/tools/TANSTACK.md, @primitives/tools/FORMS.md |
| Testing | @primitives/principles/testing.md, @primitives/tools/FRONTEND_TESTING.md, @primitives/tools/STORYBOOK.md |
| DX | @foundations/code-standards.md, @primitives/tools/husky.md |
| Libs | @primitives/tools/DATE_FNS.md, @primitives/tools/XSTATE.md |
| Workflow | @workflows/COMMIT.md, @workflows/DEV_LIFECYCLE.md |

## Quick Start (Standalone)

```bash
pnpm create vite myapp --template react-ts
cd myapp

pnpm add tailwindcss @tailwindcss/vite
pnpm dlx shadcn@latest init
pnpm add @tanstack/react-query @tanstack/react-router react-hook-form zod @hookform/resolvers
pnpm add -D eslint prettier uba-eslint-config vitest @testing-library/react husky
```

## Quick Start (Monorepo)

See @primitives/tools/PNPM.md for full workspace setup. Key gotchas below.

## When to Use

- SPAs with rich interactivity
- Dashboards, admin panels
- Applications needing design system
- Monorepos with shared packages (UI lib, utils, types)

## When NOT to Use

- Static sites (use Astro)
- SEO-critical sites (use Next.js)
- Simple landing pages

## Project Structure

```
src/
├── components/
│   ├── ui/          # shadcn
│   └── features/
├── hooks/
├── lib/
├── pages/
├── services/
└── main.tsx
```

## Commands

```bash
pnpm dev                    # Dev server + HMR
pnpm build                  # Production build
pnpm test                   # vitest run
pnpm typecheck              # tsc --noEmit
pnpm lint                   # eslint .
```

## vite.config.ts

```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
```

## Monorepo Setup

All configs must align. Example with `@myorg/ui` package:

**pnpm-workspace.yaml**
```yaml
packages:
  - "apps/*"
  - "packages/*"
```

**tsconfig.json** (root)
```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@myorg/ui": ["packages/ui/src"],
      "@myorg/utils": ["packages/utils/src"]
    }
  },
  "references": [
    { "path": "./apps/web" },
    { "path": "./packages/ui" }
  ]
}
```

**apps/web/package.json**
```json
{
  "name": "web",
  "dependencies": {
    "@myorg/ui": "workspace:*"
  }
}
```

**apps/web/vite.config.ts**
```typescript
resolve: {
  alias: {
    "@": path.resolve(__dirname, "./src"),
    "@myorg/ui": path.resolve(__dirname, "../../packages/ui/src")
  }
}
```

**packages/ui/package.json**
```json
{
  "name": "@myorg/ui",
  "main": "./src/index.ts",
  "types": "./src/index.ts"
}
```

**Key: configs must match**

| Config | Defines |
|--------|---------|
| pnpm-workspace.yaml | `packages/*` location |
| root tsconfig paths | `@myorg/ui` → `packages/ui/src` |
| app package.json | `@myorg/ui: workspace:*` |
| app vite.config | alias `@myorg/ui` → same path |
| package package.json | `name: @myorg/ui` |

**Commands**: `pnpm --filter web dev`, `pnpm add -Dw <pkg>` (root), `tsc --build`

## TanStack Query Setup

```typescript
// src/main.tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 60_000, gcTime: 300_000 },
  },
});

createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    <App />
  </QueryClientProvider>
);
```

## Form with Zod Validation

```typescript
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

type FormData = z.infer<typeof schema>;

function LoginForm() {
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  return (
    <form onSubmit={handleSubmit(console.log)}>
      <input {...register("email")} />
      {errors.email && <span>{errors.email.message}</span>}
    </form>
  );
}
```

## package.json

```json
{
  "name": "myapp",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "lint": "eslint .",
    "prepare": "husky"
  }
}
```
