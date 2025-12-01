# TypeScript React Stack

Add-on for frontend projects with React.

## Required Reading

- @context/coding/frontend/REACT.md - React core (hooks, context)
- @context/coding/frontend/VITE.md - Build tool, HMR, path aliases
- @context/coding/frontend/TAILWIND.md - Utility-first CSS
- @context/coding/frontend/SHADCN.md - UI components (Radix + Tailwind)
- @context/coding/frontend/FORMS.md - react-hook-form + zod
- @context/coding/frontend/TANSTACK.md - Query + Router

## Base Stack

Choose one:
- @context/coding/stacks/STACK_TS_BUN.md
- @context/coding/stacks/STACK_TS_PNPM_NODE.md

## Quick Start

```bash
# New React project
pnpm create vite . --template react-ts

# Install Tailwind
pnpm add tailwindcss @tailwindcss/vite

# Install UI libs
pnpm dlx shadcn@latest init

# Install data/forms
pnpm add @tanstack/react-query react-hook-form zod @hookform/resolvers
```

## Vite Config

```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
```

## Project Structure

```
src/
├── components/      # UI components
├── hooks/           # Custom hooks
├── lib/             # Utilities
├── pages/           # Route pages
├── services/        # API calls
└── App.tsx
```

## Commands

```bash
pnpm dev      # Development w/ HMR
pnpm build    # Production build
pnpm preview  # Preview production
```
