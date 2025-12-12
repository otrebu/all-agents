---
tags: [runtime]
depends:
  - @context/blocks/tools/node.md
  - @context/blocks/tools/pnpm.md
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

- **Runtime**: @context/blocks/tools/node.md
- **Package Manager**: @context/blocks/tools/pnpm.md

See @context/blocks/tools/pnpm.md for workspace configuration.
