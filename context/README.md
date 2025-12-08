# Context Documentation

Atomic documentation structure: primitives → foundations → stacks.

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
├── primitives/
│   ├── tools/          # 31 single-tech docs
│   ├── principles/     # 8 universal philosophies
│   └── patterns/       # 11 context-specific techniques
├── foundations/        # 4 platform combos
├── stacks/            # 4 app shapes
└── workflows/         # 6 dev processes
```

## Primitives

### Tools (`primitives/tools/`)

Single library/technology docs.

**Runtime:** bun, node, pnpm, typescript

**Frontend:** react, vite, tailwind, shadcn, storybook, tanstack-query, tanstack-router, tanstack-start

**Backend:** fastify, orpc

**Validation:** zod

**State:** xstate

**Utilities:** date-fns, dotenv

**CLI:** commander, chalk, ora, boxen

**DX:** eslint, prettier, husky, vitest, semantic-release

**External:** gemini-cli, gh-search, parallel-search

### Principles (`primitives/principles/`)

Universal philosophies and approaches.

| File | Description |
|------|-------------|
| coding-style.md | FP patterns, naming conventions |
| vocabulary.md | Terminology standards |
| error-handling.md | Error handling philosophy |
| logging.md | Logging principles |
| testing.md | Testing philosophy & patterns |
| prompting.md | Context engineering |
| optimize-prompt.md | Prompt optimization |
| claude-code-tools-permissions.md | Tool permissions reference |

### Patterns (`primitives/patterns/`)

Context-specific techniques.

| File | Description |
|------|-------------|
| api-testing.md | API test patterns |
| backend-testing.md | Backend test patterns |
| frontend-testing.md | Frontend test patterns |
| cli-e2e-testing.md | CLI E2E test patterns |
| forms-validation-react.md | React form validation |
| logging-services.md | Service logging (pino, structured) |
| logging-cli.md | CLI logging (chalk, terminal) |
| agent-templates.md | AI agent patterns |
| task-management.md | Task management approaches |
| task-template.md | Task file template |
| story-template.md | Story file template |

## Foundations

Platform choices (runtime + toolchain combos).

| File | Description |
|------|-------------|
| bun-runtime.md | Bun as complete platform |
| node-pnpm.md | Node + pnpm platform |
| typescript-config.md | TypeScript configurations |
| code-standards.md | ESLint + Prettier + Husky integration |

## Stacks

App shapes built on foundations.

| File | Description |
|------|-------------|
| ts-bun-cli.md | CLI tools with Bun |
| ts-pnpm-node-cli.md | CLI tools with Node + pnpm |
| ts-pnpm-node-rest-api.md | REST API with Fastify + oRPC |
| ts-vite-react.md | React frontend with Vite |

## Workflows

Development processes.

| File | Description |
|------|-------------|
| dev-lifecycle.md | Complete dev workflow |
| start-feature.md | Feature branch creation |
| commit.md | Conventional commits |
| complete-feature.md | Merge to main |
| code-review.md | Review checklist |
| refactoring.md | Refactoring patterns |

## Frontmatter

All files use YAML frontmatter:

```yaml
---
tags: [cli, runtime]          # Optional: existing folder/tech names only
depends:                       # Optional: dependency paths
  - @primitives/tools/bun.md
  - @foundations/code-standards.md
---
```

## Reference Format

Use `@` prefix for cross-references:

- `@primitives/tools/bun.md`
- `@foundations/node-pnpm.md`
- `@stacks/ts-bun-cli.md`
- `@workflows/commit.md`
