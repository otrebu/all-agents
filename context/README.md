# Context Documentation Index

Shareable AI context docs - atomic building blocks + stack aggregators.

## Quick Start

1. **Pick your stack:** `coding/stacks/`
   - `STACK_TS_BUN.md` - Bun all-in-one
   - `STACK_TS_PNPM_NODE.md` - Traditional (pnpm + Node)
   - `STACK_TS_REACT.md` - Frontend
   - `STACK_TS_CLI.md` - CLI tools

2. **Browse atomic docs** by domain (below)

## Atomic Docs

### Runtime (`coding/runtime/`)

| File | Description |
|------|-------------|
| BUN.md | Bun: runtime, pkg mgr, bundler, test |
| PNPM.md | pnpm commands, workspaces |
| NODE.md | Node.js runtime, nvm |
| TYPESCRIPT.md | tsconfig, path aliases, FP patterns |

### Frontend (`coding/frontend/`)

| File | Description |
|------|-------------|
| REACT.md | Hooks, context |
| VITE.md | Bundler, HMR |
| TAILWIND.md | Utility CSS |
| SHADCN.md | UI components |
| FORMS.md | react-hook-form + zod |
| TANSTACK.md | Query + Router |
| STORYBOOK.md | Component isolation |

### CLI (`coding/cli/`)

| File | Description |
|------|-------------|
| CLI_LIBS.md | commander, chalk, ora, boxen |
| LOGGING_CLI.md | Terminal output patterns |

### Libs (`coding/libs/`)

| File | Description |
|------|-------------|
| XSTATE.md | State machines (v5) |
| DATE_FNS.md | Date utilities |
| DOTENV.md | Env vars |

### DevOps (`coding/devops/`)

| File | Description |
|------|-------------|
| SEMANTIC_RELEASE.md | Automated versioning |

### DX (`coding/dx/`)

| File | Description |
|------|-------------|
| LINT_FORMATTING.md | ESLint + Prettier |
| HUSKY.md | Git hooks |

### Testing (`coding/testing/`)

| File | Description |
|------|-------------|
| UNIT_TESTING.md | Vitest patterns |

### Workflow (`coding/workflow/`)

| File | Description |
|------|-------------|
| DEV_LIFECYCLE.md | Dev workflow |
| START_FEATURE.md | Feature branches |
| COMMIT.md | Conventional commits |
| COMPLETE_FEATURE.md | Merge to main |
| CODE_REVIEW.md | Review checklist |

### Core

| File | Description |
|------|-------------|
| CODING_STYLE.md | FP patterns, naming |

## Knowledge (External Tools)

| Dir | Description |
|-----|-------------|
| `knowledge/gemini-cli/` | Google Search research |
| `knowledge/github/` | GitHub code search |
| `knowledge/parallel-search/` | Multi-angle web research |

## Meta (Prompting)

| File | Description |
|------|-------------|
| PROMPTING.md | Context engineering |
| AGENT_TEMPLATES.md | Agent patterns |

## Directory Structure

```
context/
├── coding/
│   ├── runtime/      # BUN, NODE, PNPM, TYPESCRIPT
│   ├── frontend/     # React, Vite, Tailwind, etc.
│   ├── cli/          # CLI libs, logging
│   ├── libs/         # XState, date-fns, dotenv
│   ├── backend/      # API patterns (universal)
│   ├── devops/       # Semantic release
│   ├── dx/           # Lint, Husky
│   ├── testing/      # Unit testing
│   ├── stacks/       # Stack aggregators
│   └── workflow/     # Git workflows
├── knowledge/        # External tool guides
└── meta/             # Prompting standards
```
