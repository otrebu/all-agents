---
tags: [web, spa]
---

# Web App: Client-Side React with Vite

Single-page applications with client-side rendering, TanStack Router, and modern React patterns.

# Build

@context/blocks/construct/pnpm.md
@context/blocks/construct/node.md
@context/foundations/construct/bundle-web-vite.md
@context/foundations/construct/code-splitting.md

# Framework

@context/blocks/construct/react.md
@context/foundations/construct/patterns-react.md
@context/foundations/construct/error-handling-react.md

# Routing

@context/blocks/construct/tanstack-router.md

# Server State

@context/blocks/construct/tanstack-query.md

# Forms

@context/blocks/construct/react-hook-form.md
@context/blocks/construct/zod.md

# Styling

@context/blocks/construct/tailwind.md
@context/blocks/construct/shadcn.md
@context/foundations/construct/patterns-design-tokens-tailwind.md

# Data

@context/blocks/construct/tanstack-table.md

# Testing

@context/foundations/test/test-component-vitest-rtl.md
@context/foundations/test/test-e2e-web-playwright.md
@context/foundations/test/mock-api-msw.md

# Observability

@context/foundations/observe/errors-sentry-react.md
@context/foundations/observe/metrics-web-vitals.md

# Security

@context/foundations/security/auth-session-better-auth.md
@context/foundations/security/auth-routes-react.md
@context/foundations/security/auth-forms-better-auth.md

# Quality

@context/foundations/quality/gate-standards.md
@context/blocks/quality/accessibility.md

## When to Use

- SPAs without SEO requirements
- Internal tools, dashboards, admin panels
- Applications behind authentication

## When NOT to Use

- SEO-critical pages (use TanStack Start)
- Apps needing server-side sessions
