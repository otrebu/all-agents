---
depends: []
---

# Vite

Fast build tool for modern web development. HMR, plugins, production optimization.

## Quick Start

```bash
pnpm create vite . --template react-ts
```

## Configuration (vite.config.ts)

**Basic:**

```typescript
import { defineConfig } from "vite";

export default defineConfig({
  // config here
});
```

**With React:**

```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
});
```

## Path Aliases

Must match tsconfig.json paths:

```typescript
import { defineConfig } from "vite";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@components": path.resolve(__dirname, "./src/components"),
      "@utils": path.resolve(__dirname, "./src/utils"),
    },
  },
});
```

See @context/blocks/tools/typescript.md for tsconfig.json alias setup.

## Tailwind CSS

Install:

```bash
pnpm add tailwindcss @tailwindcss/vite
```

**vite.config.ts:**

```typescript
import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [tailwindcss()],
});
```

**src/style.css:**

```css
@import "tailwindcss";
```

Usage: `className="flex items-center gap-4"`

## Commands

```bash
# Development (HMR)
pnpm vite
pnpm vite --port 3000

# Build
pnpm vite build

# Preview production build
pnpm vite preview
```

## When to Use Vite vs Bun Build

| Scenario                    | Use       |
| --------------------------- | --------- |
| Frontend w/ React, HMR      | Vite      |
| Complex plugin needs        | Vite      |
| Production web optimization | Vite      |
| Simple CLI tool             | Bun build |
| Fast iteration, no plugins  | Bun build |

Vite = frontend, HMR, plugins
Bun build = simplicity, speed, CLI tools
