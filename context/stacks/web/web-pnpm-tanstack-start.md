---
tags: [web, ssr]
---

# Web App: TanStack Start (SSR/Hybrid)

Full-stack React meta-framework with server-side rendering, server functions, and type-safe routing.

# Runtime & Build

@context/blocks/construct/pnpm.md
@context/blocks/construct/node.md
@context/blocks/construct/vite.md

# Framework

@context/blocks/construct/tanstack-start.md
@context/blocks/construct/react.md

# Routing

@context/blocks/construct/tanstack-router.md

# Server State

@context/blocks/construct/tanstack-query.md

# Auth

@context/blocks/security/better-auth.md
@context/foundations/security/auth-forms-better-auth.md
@context/foundations/security/auth-routes-react.md

# Forms

@context/blocks/construct/react-hook-form.md
@context/blocks/construct/zod.md

# Styling

@context/blocks/construct/tailwind.md
@context/blocks/construct/shadcn.md

# Testing

@context/foundations/test/test-component-vitest-rtl.md

# Code Standards

@context/foundations/quality/gate-standards.md

## When to Use

- SEO-critical applications
- Auth-heavy apps with server sessions
- Applications needing server functions (RPC)
- Hybrid rendering (SSR + CSR per route)

## When NOT to Use

- Simple SPAs without SEO needs (use Vite + React)
- Static sites (use Astro)
