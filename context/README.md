# Context Documentation

Atomic documentation structure: blocks → foundations → stacks.

## Quick Start

1. **Pick your stack:** `stacks/`

   - `ts-bun-cli.md` - Bun CLI tools
   - `ts-pnpm-node-cli.md` - Node + pnpm CLI
   - `ts-pnpm-node-rest-api.md` - REST API with Node + pnpm
   - `ts-vite-react.md` - React frontend

2. **Browse atomic docs** by layer (below)

## Structure

```
context/
├── blocks/
│   ├── tools/          # 37 single-tech docs
│   ├── principles/     # 8 universal philosophies
│   └── patterns/       # 11 context-specific techniques
├── foundations/        # 6 platform combos + execution strategies
├── stacks/            # 5 app shapes
└── workflows/         # 6 dev processes
```

## Blocks

### Tools (`blocks/tools/`)

Single library/technology docs.

**Runtime:** bun, node, pnpm, tsx, tsc, tsc-alias, tsc-esm-fix, tsconfig-base, tsconfig-monorepo-additions, pnpm-workspaces

**Frontend:** react, vite, tailwind, shadcn, storybook, tanstack-query, tanstack-router, tanstack-start

**Backend:** fastify, orpc

**Validation:** zod

**State:** xstate

**Utilities:** date-fns, dotenv

**CLI:** commander, chalk, ora, boxen

**DX:** eslint, prettier, husky, vitest, semantic-release

**External:** gemini-cli, gh-search, parallel-search

### Principles (`blocks/principles/`)

Universal philosophies and approaches.

| File                             | Description                     |
| -------------------------------- | ------------------------------- |
| coding-style.md                  | FP patterns, naming conventions |
| vocabulary.md                    | Terminology standards           |
| error-handling.md                | Error handling philosophy       |
| logging.md                       | Logging principles              |
| testing.md                       | Testing philosophy & patterns   |
| prompting.md                     | Context engineering             |
| optimize-prompt.md               | Prompt optimization             |
| claude-code-tools-permissions.md | Tool permissions reference      |

### Patterns (`blocks/patterns/`)

Context-specific techniques.

| File                      | Description                        |
| ------------------------- | ---------------------------------- |
| api-testing.md            | API test patterns                  |
| backend-testing.md        | Backend test patterns              |
| frontend-testing.md       | Frontend test patterns             |
| cli-e2e-testing.md        | CLI E2E test patterns              |
| forms-validation-react.md | React form validation              |
| logging-services.md       | Service logging (pino, structured) |
| logging-cli.md            | CLI logging (chalk, terminal)      |
| agent-templates.md        | AI agent patterns                  |
| task-management.md        | Task management approaches         |
| task-template.md          | Task file template                 |
| story-template.md         | Story file template                |

## Foundations

Platform choices (runtime + toolchain combos) and execution strategies.

### Platform Foundations

| File                       | Description                           |
| -------------------------- | ------------------------------------- |
| bun-runtime.md             | Bun as complete platform              |
| node-pnpm.md               | Node + pnpm platform (package.json structure) |
| pnpm-monorepo.md           | pnpm monorepo coordination            |
| code-standards.md          | ESLint + Prettier + Husky integration |

### TypeScript Execution Strategies

| File                            | Description                                |
| ------------------------------- | ------------------------------------------ |
| ts-node-tsc.md                  | Node via compiled JS (tsc build pipeline)  |
| ts-node-tsx.md                  | Node via direct execution (tsx runtime)    |
| ts-bun.md                       | Bun runtime with native TypeScript         |
| ts-web-vite.md                  | Vite bundler for React/Vue frontend        |

Execution strategies reference base config (`tsconfig-base.md`) and show tool-specific overrides.

## Stacks

App shapes built on foundations. Stacks compose platform + execution strategy.

| File                              | Description                  |
| --------------------------------- | ---------------------------- |
| ts-bun-cli.md                     | CLI tools with Bun           |
| ts-pnpm-node-cli.md               | CLI tools with Node + pnpm   |
| ts-pnpm-node-rest-api.md          | REST API with Fastify + oRPC |
| ts-pnpm-node-backend-monorepo.md  | Backend monorepo with workspaces |
| ts-vite-react.md                  | React frontend with Vite     |

### Stack Composition

Stacks reference **foundations** (platform + execution strategies):

- **CLI stacks** reference either `ts-bun.md`, `ts-node-tsc.md`, or `ts-node-tsx.md`
- **Frontend stacks** reference `ts-web-vite.md`
- **Monorepo stacks** reference `pnpm-monorepo.md` + execution strategy
- Flat structure - no subdirectories

Example: A backend monorepo would reference `ts-node-tsc.md` (build pipeline) + `tsconfig-monorepo-additions.md`.

## Workflows

Development processes.

| File                | Description             |
| ------------------- | ----------------------- |
| dev-lifecycle.md    | Complete dev workflow   |
| start-feature.md    | Feature branch creation |
| commit.md           | Conventional commits    |
| complete-feature.md | Merge to main           |
| code-review.md      | Review checklist        |
| refactoring.md      | Refactoring patterns    |

## Frontmatter

All files use YAML frontmatter:

```yaml
---
tags: [cli, runtime]          # Optional: existing folder/tech names only
depends:                       # Optional: dependency paths
  - @context/blocks/construct/bun.md
  - @context/foundations/quality/gate-standards.md
---
```

## Reference Format

Use `@` prefix for cross-references:

- `@context/blocks/construct/bun.md`
- `@context/foundations/node-pnpm.md`
- `@context/stacks/cli/cli-bun.md`
- `@context/workflows/commit.md`
