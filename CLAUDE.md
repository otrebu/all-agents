# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**all-agents** bridges Cursor and Claude Code AI configuration, making prompts work across local and cloud-based AI agents.

The repo provides:
- Claude Code slash commands for development workflows
- Research/search integrations (Gemini, GitHub, Parallel Search)
- Meta-commands for creating agents, commands, and skills
- Shared coding guidelines and documentation

## Setup

```bash
# First time setup (builds CLI and creates symlink)
cd tools && ./setup.sh

# If ~/.local/bin not in PATH, add to ~/.zshrc:
export PATH="$HOME/.local/bin:$PATH"
```

## Commands

### Build & Development

```bash
# From tools/ directory
cd tools

# Install dependencies
bun install

# Build CLI binary
bun run build              # Creates bin/aaa

# Testing
bun run test               # Run E2E tests (requires API keys/tokens)
bun run test:watch         # Run tests in watch mode

# Linting
bun run lint               # Check for linting errors
bun run lint:fix           # Auto-fix linting errors

# Research/Search Tools (via compiled binary)
aaa gh-search <query>           # GitHub code search
aaa parallel-search --objective "query"  # Parallel Search API
aaa gemini-research <query>     # Gemini CLI research

# Or via dev mode
bun run dev gh-search <query>
```

**E2E Tests**: Tests verify CLI functionality end-to-end. They require authentication:
- `gh-search` needs GitHub token (via `gh auth login` or `GITHUB_TOKEN`)
- `parallel-search` needs `PARALLEL_API_KEY` env var

**Note**: `gemini-research` tests are skipped by default - Gemini CLI web search is currently unreliable. Set `GEMINI_TEST_ENABLED=1` to run them anyway.

Tests fail with clear auth instructions if credentials are missing.

### Slash Commands

Available via `/` prefix (see `.claude/commands/`):

**Development:**
- `/dev:git-commit` - Create conventional commits from diffs
- `/dev:start-feature` - Create/switch feature branches
- `/dev:complete-feature` - Merge feature branch to main
- `/dev:code-review` - Review code quality

**Research:**
- `/gh-search <query>` - Search GitHub for code examples
- `/gemini-research <query>` - Google Search via Gemini CLI
- `/parallel-search <topic>` - Multi-angle web research

**Meta (creating Claude Code artifacts):**
- `/meta:claude-code:create-skill` - Create new skill
- `/meta:claude-code:create-command` - Create new command
- `/meta:claude-code:create-agent` - Create new agent
- `/meta:claude-code:create-plugin` - Create new plugin
- `/meta:create-cursor-rule` - Create Cursor rules file
- `/meta:how-to-prompt` - Prompting guidance
- `/meta:optimize-prompt` - Optimize existing prompt

## Architecture

### Directory Structure

```
all-agents/
├── bin/                           # Compiled binary (gitignored)
│   └── aaa
├── context/                       # Documentation (was docs/)
│   ├── knowledge/
│   │   ├── github/
│   │   │   └── GH_SEARCH.md
│   │   ├── parallel-search/
│   │   │   └── PARALLEL_SEARCH.md
│   │   └── gemini-cli/
│   │       └── GEMINI_CLI.md
│   ├── research/                  # Output directory
│   ├── coding/
│   └── meta/
├── tools/
│   ├── lib/                       # Shared utilities
│   │   ├── log.ts
│   │   ├── format.ts
│   │   └── research.ts
│   ├── src/
│   │   ├── cli.ts                 # Main entry point
│   │   ├── env.ts                 # Zod env parser
│   │   ├── commands/              # CLI command implementations
│   │   │   ├── github/            # GitHub search command
│   │   │   ├── parallel-search/   # Parallel search command
│   │   │   └── gemini/            # Gemini research command
│   │   └── utils/
│   │       └── paths.ts           # Runtime path resolution
│   ├── tests/
│   │   ├── lib/
│   │   └── e2e/
│   ├── package.json
│   ├── tsconfig.json
│   ├── eslint.config.js
│   └── vitest.config.ts
├── .claude/
│   ├── agents/          # Sub-agents (gemini-research, parallel-search)
│   ├── commands/        # Slash commands (dev, meta, research)
│   ├── skills/          # Skills (brainwriting, dev-work-summary)
│   ├── hooks/           # Command hooks
│   └── settings.json    # Tool permissions & hooks
├── .env.example
├── CLAUDE.md
└── README.md
```

### Key Architecture Patterns

**Commands reference documentation files:**
Commands in `.claude/commands/` typically reference docs in `context/` (via `@context/path/to/file.md`).

Example: `/dev:git-commit` → `@context/coding/COMMIT.md`

**Research tools generate reports:**
Research commands execute scripts in `tools/src/commands/` and save results to `context/research/*/`.

**Shared utilities in `tools/lib/`:**
Common functions (e.g., `sanitizeForFilename`, `log`) live in `tools/lib/` with path alias `@lib/*`.

### Creating New Prompts/Commands/Agents

**Standard workflow for extending this repo:**

1. **Create atomic documentation** in `context/` (organized by folders)
2. **Add TypeScript CLI** (if script improves reliability)
   - Reuse utilities from `tools/lib/` (e.g., `log`, `sanitizeForFilename`)
   - Save scripts to `tools/src/commands/`
3. **Follow** @context/meta/PROMPTING.md (context engineering standards)
4. **Create command** using `/meta:claude-code:create-command` (if applicable)
5. **Create sub-agent** (if complex multi-step workflow)
6. **Create skill** (if proactive invocation needed)
7. **Update CLAUDE.md** (if foundational change)

**Example:** `/gemini-research` command
- Docs: `context/knowledge/gemini-cli/GEMINI_CLI.md`
- Script: `tools/src/commands/gemini/search.ts`
- Command: `.claude/commands/gemini-research.md`
- Agent: `.claude/agents/gemini-research.md`

## Development Workflow

**MANDATORY:** Follow @context/coding/DEVELOPMENT_WORKFLOW.md for all code changes.

### Definition of Done

1.  Tests added/updated and passing (when tests exist)
2.  README/docs updated
3.  Committed with conventional commit message
4.  On feature branch (when appropriate)

### Commit Discipline

Use **Conventional Commits**: `feat(scope): description`

Run `/dev:git-commit` to create commits from diffs following the workflow in @context/coding/COMMIT.md.

**Never** add Claude signature/co-authorship to commits.

### Branching

Ask before creating feature branches. Some workflows allow direct commits to `main`. Use `/dev:start-feature <description>` if branching is needed.

## Coding Style

See @context/coding/CODING_STYLE.md for comprehensive guidelines. Key points:

**Functional Programming:**
- Avoid classes (except custom Error types)
- Small, focused functions
- Immutable returns, pure functions
- Composition over inheritance

**Naming:**
- Explicit, descriptive (include units: `timeoutMs`, `priceGBP`)
- Booleans: `is/has/should`
- Functions: verbs; Data: nouns

**Logging (CLI projects):**
This is a CLI-focused repo. Use human-readable output with `tools/lib/log.ts` (chalk-based):
```typescript
import log from '@lib/log'
log.success('Operation complete')
log.error('Failed to process')
```

See @context/coding/CODING_STYLE.md#logging for service vs CLI patterns.

## TypeScript Stack

See @context/coding/ts/STACK.md for full list. Preferred tools:

- **Package manager:** pnpm (for tools/), bun (for runtime/build)
- **Runtime:** Bun, TypeScript
- **Linting:** ESLint (uba-eslint-config), no-console allowed for CLI
- **CLI libs:** chalk, commander, ora, boxen
- **Testing:** Vitest (when tests added)
- **Utils:** date-fns, dotenv, zod

**Import aliases:**
- `@lib/*` maps to `./tools/lib/*`
- `@tools/*` maps to `./tools/src/*`
- `@context/*` maps to `./context/*`

## Testing

When tests are added, follow @context/coding/ts/TESTING.md.

**Parameterized vs Individual:**
- Pure functions with similar edge cases → `test.each()`
- Different setup/mocks or business scenarios → individual tests

## Research Tools

### Gemini Research (`/gemini-research`)

Google Search-grounded research via Gemini CLI. Outputs JSON + Markdown to `context/research/google/`.

**After running:** Must read raw JSON, synthesize analysis, and update Markdown report.

See @context/knowledge/gemini-cli/GEMINI_CLI.md

### Parallel Search (`/parallel-search`)

Multi-angle web research (up to 30K chars/result). Outputs to `context/research/parallel/`.

See @context/knowledge/parallel-search/PARALLEL_SEARCH.md

### GitHub Search (`/gh-search`)

Search GitHub for real-world code examples. Outputs to `context/research/github/`.

See @context/knowledge/github/GH_SEARCH.md

## Configuration Files

- **tools/tsconfig.json:** Strict mode, ESNext, path aliases (`@lib/*`, `@tools/*`, `@context/*`)
- **tools/eslint.config.js:** Uses `uba-eslint-config`, `no-console` disabled for CLI
- **.claude/settings.json:** Tool permissions, hooks, statusline config

## Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
# Parallel Search API (https://platform.parallel.ai/)
AAA_PARALLEL_API_KEY=

# GitHub token (optional, uses gh CLI by default)
AAA_GITHUB_TOKEN=

# Project root override (for compiled binary)
AAA_ROOT_PATH=

# Debug mode - enables verbose logging
AAA_DEBUG=false
```

## Important Notes

- **No emojis in code/commits** unless explicitly requested
- **Follow AGENTS.md directive:** Always follow @context/coding/DEVELOPMENT_WORKFLOW.md when coding
- **FP-first:** Avoid `this`, `new`, classes (except errors)
- **Explicit over clever:** Verbose naming, self-documenting code
