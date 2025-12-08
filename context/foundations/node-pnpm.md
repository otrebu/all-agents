---
tags: [runtime]
depends:
  - @primitives/tools/node.md
  - @primitives/tools/pnpm.md
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

- **Runtime**: @primitives/tools/node.md
- **Package Manager**: @primitives/tools/pnpm.md

See @primitives/tools/pnpm.md for workspace configuration.
