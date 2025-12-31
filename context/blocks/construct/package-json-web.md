---
depends:
  - "@context/blocks/construct/package-json-base.md"
---

# package.json — Web App (Frontend/SPA)

Private, not published. Bundler (Vite/webpack) handles build.

## Pattern

```jsonc
{
  "name": "my-app",
  "version": "0.1.0",
  "private": true,
  "type": "module",

  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "preview": "vite preview",
    "typecheck": "tsc --noEmit",
    "typecheck:watch": "tsc --noEmit --watch",
    "test": "vitest run"
  },

  "dependencies": {
    "react": "*",
    "react-dom": "*"
  },

  "devDependencies": {
    "@vitejs/plugin-react": "*",
    "typescript": "*",
    "vite": "*",
    "vite-tsconfig-paths": "*",
    "vitest": "*"
  }
}
```

## Key fields

- `private: true` — Prevents accidental npm publish. Required for apps.
- `type: "module"` — Enables ESM. Required for Vite.
- No `main`/`exports`/`files` — Not needed; this is an app, not a package.
- `tsc --noEmit` in build — Type-check before bundling. Vite doesn't type-check.

## Scripts explained

| Script | Purpose |
|--------|---------|
| `dev` | Start dev server with HMR |
| `build` | Type-check + production bundle |
| `preview` | Serve production build locally |
| `typecheck` | Type-check only (CI, pre-commit) |
| `typecheck:watch` | Type-check in parallel with dev |

## When to Use

- React/Vue/Svelte SPAs
- Dashboards, admin panels
- Any frontend app with bundler

## When NOT to Use

- Publishable libraries → `package-json-react.md` or `package-json-library.md`
- Backend services → `package-json-app.md`
- CLIs → `package-json-cli.md`
