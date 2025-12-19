---
depends:
  - "@context/foundations/security/secrets-env-monorepo.md"
---

# TypeScript + pnpm workspaces + Node + oRPC REST API and RPC Stack

Typescript monorepo with pnpm workspaces, Node.js, and oRPC for REST API and RPC.

# Runtime, Package Manager, Types configuration, Structure and execution strategy ( No transpilation )

@context/foundations/construct/pnpm-monorepo-base.md

@context/foundations/construct/exec-tsx.md

# Environment Variables

@context/foundations/security/secrets-env-monorepo.md

Monorepo uses layered `.env` files: root for shared config, package-level for overrides.

# Code Standards

@context/foundations/quality/gate-standards.md

# REST API and RPC

@context/blocks/construct/orpc.md
