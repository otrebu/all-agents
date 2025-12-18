---
tags: [platform, monorepo]
depends:
  - @context/blocks/construct/pnpm.md
  - @context/blocks/construct/pnpm-workspaces.md
  - @context/blocks/construct/tsconfig-base.md
  - @context/blocks/construct/tsconfig-monorepo-root.md
---

# pnpm Monorepo Coordination

Monorepo structure and coordination patterns. Execution-agnostic - combines with execution strategy foundations in stacks.

We are using pnpm and pnpm workspaces to manage the monorepo with the appropriate project structure and tsconfig configurations.
tsc, tsc-alias, tsc-esm-fix to compile the TypeScript code.
In here we do not define how to build, run, test or execute the code.

## Runtime

@context/blocks/construct/node.md

## Package Manager

@context/blocks/construct/pnpm.md

## Project Structure

@context/blocks/construct/tree-monorepo.md

## package.json

@context/blocks/construct/package-json-base.md
@context/blocks/construct/package-json-monorepo-root.md

## TypeScript Config

@context/blocks/construct/tsconfig-base.md
@context/blocks/construct/tsconfig-monorepo-root.md
