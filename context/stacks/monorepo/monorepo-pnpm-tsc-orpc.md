---
depends:
  - "@context/foundations/security/secrets-env-monorepo-node.md"
---

# TypeScript + pnpm workspaces + Node + oRPC REST API and RPC Stack

Typescript monorepo with pnpm workspaces, Node.js, and oRPC for REST API and RPC.

# Runtime, Package Manager, Types configuration, Structure and Transpililation and execution

@context/foundations/construct/monorepo-pnpm-base.md

@context/foundations/construct/transpile-esm-tsc.md

# Environment Variables

@context/foundations/security/secrets-env-monorepo-node.md

Monorepo uses layered `.env` files with Node.js `--env-file` flag: root for shared config, package-level for overrides.

# Code Standards

@context/foundations/quality/gate-standards.md

# REST API and RPC

@context/blocks/construct/orpc.md

# Database

@context/foundations/construct/data-persist-prisma.md
