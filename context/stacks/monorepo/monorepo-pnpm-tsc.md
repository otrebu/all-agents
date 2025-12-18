---
tags: [monorepo, backend]
depends:
  - @context/blocks/construct/node.md
  - @context/blocks/construct/pnpm.md
  - @context/blocks/construct/pnpm-workspaces.md
  - @context/foundations/construct/manifest-monorepo-root.md
  - @context/blocks/construct/tsconfig-base.md
  - @context/blocks/construct/tsconfig-monorepo-root.md
  - @context/foundations/construct/transpile-esm-tsc.md
  - @context/foundations/quality/gate-standards.md
---

# TypeScript + pnpm + Node Backend Monorepo Stack

Base setup for a monorepo with TypeScript, pnpm, and Node.js, using tsc as the compiler with tsc-alias and tsc-esm-fix to fix the path aliases and ESM imports. Mostly used for backend services.

# Runtime, Package Manager

@context/blocks/construct/node.md
@context/blocks/construct/package-json-base.md
@context/blocks/construct/pnpm.md
@context/blocks/construct/pnpm-workspaces.md

## TypeScript Config for Monorepo

@context/blocks/construct/tsconfig-base.md
@context/blocks/construct/tsconfig-monorepo-root.md

### Execution Strategy

@context/foundations/construct/transpile-esm-tsc.md

# Environment Variables

@context/foundations/security/secrets-env.md

### Code Standards

@context/foundations/quality/gate-standards.md
