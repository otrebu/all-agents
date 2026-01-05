---
tags: [web, ssr]
---

# Web App: TanStack Start (SSR/Hybrid)

Full-stack React meta-framework with server-side rendering, server functions, and type-safe routing.

# Build

@context/blocks/construct/pnpm.md
@context/blocks/construct/node.md
@context/foundations/construct/bundle-web-vite.md
@context/foundations/construct/code-splitting.md

# Framework

@context/blocks/construct/tanstack-start.md
@context/foundations/construct/patterns-react.md
@context/foundations/construct/error-handling-react.md

# Server State

@context/blocks/construct/tanstack-query.md

# Security

@context/foundations/security/auth-session-better-auth.md
@context/foundations/security/auth-routes-react.md
@context/foundations/security/auth-forms-better-auth.md

# Forms

@context/blocks/construct/react-hook-form.md
@context/blocks/construct/zod.md

# Styling

@context/foundations/construct/patterns-design-tokens-tailwind.md
@context/blocks/construct/shadcn.md

# Data

@context/blocks/construct/tanstack-table.md

# Testing

@context/foundations/test/test-component-vitest-rtl.md
@context/foundations/test/test-e2e-web-playwright.md
@context/foundations/test/mock-api-msw.md

# Observability

@context/foundations/observe/errors-sentry-react.md
@context/foundations/observe/metrics-web-vitals.md

# Quality

@context/foundations/quality/gate-standards.md
@context/blocks/quality/accessibility.md

## When to Use

- SEO-critical applications
- Auth-heavy apps with server sessions
- Applications needing server functions (RPC)
- Hybrid rendering (SSR + CSR per route)

## When NOT to Use

- Simple SPAs without SEO needs (use Vite + React)
- Static sites (use Astro)
