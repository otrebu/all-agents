---
tags: [runtime]
depends:
  - @context/primitives/tools/node.md
  - @context/primitives/tools/pnpm.md
---

# Node + pnpm Platform

Traditional Node.js runtime with pnpm package management.

## When to Use

- Enterprise requiring Node LTS support
- Full ecosystem compatibility needed
- Monorepos with workspaces
- Mature tooling requirements

## When NOT to Use

- Greenfield projects where speed is priority
- Simple CLI tools (consider Bun)

## Components

- **Runtime**: @context/primitives/tools/node.md
- **Package Manager**: @context/primitives/tools/pnpm.md

See @context/primitives/tools/pnpm.md for workspace configuration.
