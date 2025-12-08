---
tags: [runtime]
depends:
  - @primitives/tools/bun.md
---

# Bun Runtime

Bun as complete platform: runtime + package manager + bundler + test runner.

## When to Use

- Greenfield projects
- Maximum development speed
- Single-file executables
- Serverless CLIs (fast cold starts)

## When NOT to Use

- Full Node.js ecosystem compatibility required
- Complex native addon dependencies
- Enterprise requiring Node LTS support

## Components

- **Runtime**: @primitives/tools/bun.md
- Fast, all-in-one JavaScript/TypeScript toolkit
- Native TypeScript support (no tsc needed for execution)
- Built-in package manager, bundler, and test runner
