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

**Runtime:** bun, node, pnpm, tsx, tsc, tsc-alias, tsc-esm-fix, typescript-config, typescript-config-monorepo, typescript-config-frontend, pnpm-workspaces

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
| node-pnpm-workspaces.md    | Node + pnpm monorepo coordination     |
| code-standards.md          | ESLint + Prettier + Husky integration |

### Execution Strategies (Pluggable)

| File                            | Description                                |
| ------------------------------- | ------------------------------------------ |
| ts-execution-build-first.md     | tsc + tsc-alias + tsc-esm-fix → node       |
| ts-execution-runtime-direct.md  | tsx direct execution (no build)            |

Execution strategies are **pluggable** - stacks can mix platform + execution choice.

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

Stacks can reference **other stacks** or **foundations**:

- **REST API** can reference **backend-monorepo** stack if building on monorepo
- **CLI** can reference either **build-first** or **runtime-direct** execution strategy
- Flat structure preferred - no subdirectories needed

Example: A REST API in a monorepo would reference both the monorepo stack (for structure) and build-first execution (for deployment).

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
  - @context/blocks/tools/bun.md
  - @context/foundations/code-standards.md
---
```

## Reference Format

Use `@` prefix for cross-references:

- `@context/blocks/tools/bun.md`
- `@context/foundations/node-pnpm.md`
- `@context/stacks/ts-bun-cli.md`
- `@context/workflows/commit.md`
