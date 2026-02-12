# tools/CLAUDE.md

AI development reference for the `aaa` CLI.
For user docs (installation, usage, examples), see [tools/README.md](./README.md).
For repo-level info, see [/CLAUDE.md](/CLAUDE.md).

## Stack

MUST READ: @context/stacks/cli/cli-bun.md

## Directory Structure

```
tools/
├── src/
│   ├── cli.ts                    # Entry point (Commander.js)
│   ├── env.ts                    # Environment config (Zod validation)
│   ├── commands/
│   │   ├── task.ts               # Simple: single file, inline types
│   │   ├── story.ts              # Simple: single file, inline types
│   │   ├── uninstall.ts          # Simple: single file
│   │   ├── completion/           # Shell completion generators
│   │   │   ├── index.ts          # Main command + __complete handler
│   │   │   ├── bash.ts           # Bash completion script
│   │   │   ├── zsh.ts            # Zsh completion script
│   │   │   ├── fish.ts           # Fish completion script
│   │   │   └── table.ts          # Command/option table generator
│   │   ├── gemini/               # Complex: folder + types.ts (32L)
│   │   │   ├── index.ts
│   │   │   └── types.ts
│   │   ├── github/               # Complex: folder + types.ts + utils
│   │   │   ├── index.ts
│   │   │   ├── types.ts          # 108L - separate justified
│   │   │   ├── github.ts
│   │   │   ├── ranker.ts
│   │   │   └── query.ts
│   │   ├── notify/               # Push notifications via ntfy.sh
│   │   │   ├── index.ts
│   │   │   ├── config.ts
│   │   │   ├── client.ts
│   │   │   └── types.ts
│   │   ├── parallel-search/
│   │   │   ├── index.ts
│   │   │   ├── types.ts          # 95L - separate justified
│   │   │   ├── parallel-client.ts
│   │   │   └── formatter.ts
│   │   ├── ralph/                # Autonomous dev framework (TypeScript)
│   │   │   ├── index.ts          # CLI commands (plan, build, status, calibrate, etc.)
│   │   │   ├── types.ts          # All type definitions
│   │   │   ├── config.ts         # Config + subtasks loading
│   │   │   ├── build.ts          # Build loop implementation
│   │   │   ├── build-invariant.ts # Build invariant checks
│   │   │   ├── calibrate.ts      # Calibrate command implementation
│   │   │   ├── cascade.ts        # Cascade mode logic
│   │   │   ├── validation.ts     # Pre-build validation
│   │   │   ├── queue-ops.ts      # Subtask queue operations (CLI)
│   │   │   ├── approvals.ts      # Approval flow logic
│   │   │   ├── archive.ts        # Archive completed subtasks/sessions
│   │   │   ├── subtask-helpers.ts # Subtask queue parse/diff helpers
│   │   │   ├── session.ts        # Session file utilities
│   │   │   ├── session-analysis.ts # Session signal extraction detectors
│   │   │   ├── display.ts        # Terminal output utilities
│   │   │   ├── summary.ts        # Summary generation
│   │   │   ├── hooks.ts          # Hook execution (log, notify, pause)
│   │   │   ├── status.ts         # Status command implementation
│   │   │   ├── naming.ts         # Naming conventions
│   │   │   ├── template.ts       # Template utilities
│   │   │   ├── refresh-models.ts # Model discovery from CLI providers
│   │   │   ├── post-iteration.ts # Post-iteration hook logic
│   │   │   └── providers/        # Multi-provider support
│   │   │       ├── index.ts
│   │   │       ├── types.ts
│   │   │       ├── claude.ts     # Claude CLI invocation
│   │   │       ├── opencode.ts   # OpenCode CLI invocation
│   │   │       ├── registry.ts   # Provider registry
│   │   │       ├── models.ts     # Model resolution
│   │   │       ├── models-static.ts
│   │   │       ├── models-dynamic.ts
│   │   │       └── session-adapter.ts
│   │   ├── review/               # Code review CLI (modes: supervised, headless)
│   │   │   ├── index.ts          # CLI commands and mode logic
│   │   │   └── types.ts          # Finding, DiaryEntry, triage types
│   │   ├── session/              # Session file management (simple)
│   │   │   └── index.ts          # path and current commands
│   │   ├── sync-context/         # Context sync to target project
│   │   │   ├── index.ts
│   │   │   └── types.ts
│   │   └── setup/
│   │       ├── index.ts
│   │       └── utils.ts
│   └── utils/
│       └── paths.ts              # Root resolution, output paths
├── lib/                          # Shared utilities
│   ├── log.ts                    # CLI logging (chalk)
│   ├── milestones.ts             # Milestone discovery (completion + ralph)
│   ├── numbered-files.ts         # Auto-numbered file creation
│   ├── research.ts               # Research output formatting
│   └── format.ts                 # Filename sanitization
└── tests/
    ├── e2e/                      # Command E2E tests
    ├── lib/                      # Utility unit tests
    ├── completion/               # Completion tests
    ├── fixtures/                 # Test fixtures
    └── providers/                # Provider tests
```

## Command Structure Guidelines

**Simple commands** (≤100 LOC, no utilities, types ≤10L):

- Single `.ts` file in `commands/`
- Inline all types and errors at top
- Pattern: `commands/task.ts`, `commands/story.ts`, `commands/uninstall.ts`

**Complex commands** (>100 LOC or has utilities):

- Folder structure: `commands/commandName/`
- Separate `types.ts` if >30 lines OR >3 interfaces/types
- Additional modules for utilities/sub-features
- Examples: `github/`, `parallel-search/` (keep types.ts), `notify/` (types separate)

**Threshold for separate types.ts:**

- > 30 lines of type definitions → separate file
- Keeps `index.ts` readable, prevents scrolling hell

## Repo-Specific Execution Hygiene

When running validation commands for `tools/` work, use these conventions:

- Run commands from `tools/` (set workdir to `tools`), not repo root.
- Prefer package scripts over direct runners (for example `bun run lint` instead of `bunx eslint`).
- For targeted checks, use script forwarding: `bun run lint -- <paths>` and `bun test <path>`.
- If re-running a command, say why (`failed due to path`, `after fixes`, `final verify`) so output volume is predictable.
- If a command emits noisy TUI/control output, summarize key lines in updates instead of pasting raw escape-heavy logs.

### Fast Iteration Defaults

Use this loop during implementation to minimize repeated full-tree scans:

- Use direct binaries for targeted checks:
  - `./node_modules/.bin/eslint <changed-files...>`
  - `./node_modules/.bin/prettier --check <changed-files...>`
  - `./node_modules/.bin/prettier --write <changed-files...>` (only when needed)
- Prefer targeted tests (`bun test <file-or-pattern>`) over `bun run test`.
- Do not run full `eslint .` repeatedly during edit loops.
- Before commit, run only targeted checks already needed; rely on pre-commit hooks for one final full validation pass.
- If pre-commit fails on formatting, format only reported files, re-stage, and commit again.

## Core Patterns

### Path Resolution

`utils/paths.ts` provides three fallback strategies to find all-agents root:

1. **Walk up from CWD** (most common - user runs from any subdirectory)
2. **Resolve from symlink target** (when using `~/.local/bin/aaa` symlink)
3. **Resolve from exec path** (fallback for compiled binary)

```typescript
import { getContextRoot, getOutputDir } from "@tools/utils/paths";

// Get all-agents root
const root = getContextRoot(); // /path/to/all-agents

// Get output directory (creates if missing)
const outputDir = getOutputDir("research/github");
// → /path/to/all-agents/docs/research/github
```

### Numbered Files

Auto-incrementing file pattern: `001-name.md`, `002-name.md`, etc.

```typescript
import { getNextFileName } from "@lib/numbered-files";

// Get next available number in sequence
const fileName = getNextFileName("docs/planning/tasks", "implement-auth");
// → 003-implement-auth.md (if 001 and 002 exist)

// Pattern: \d{3}-.*\.md
// Ignores non-matching files
// Creates parent directories recursively
```

### Shell Completion

Tab completion is implemented via the `completion` command.

**Files:**

- `src/commands/completion/index.ts` - Main command + `__complete` handler
- `src/commands/completion/bash.ts` - Bash script generator
- `src/commands/completion/zsh.ts` - Zsh script generator
- `src/commands/completion/fish.ts` - Fish script generator
- `lib/milestones.ts` - Shared milestone discovery (used by completion + ralph)

**Adding dynamic completions:**

For new flags needing dynamic values, add cases to the `__complete` handler in `completion/index.ts` and update the shell generators.

**Architecture:**

- `aaa completion <shell>` outputs shell script to stdout
- `aaa __complete <type>` is a hidden command that returns dynamic values
- Shell scripts call `aaa __complete milestone` etc. for dynamic completions
- Silent failures: completion errors go to stderr, always exit 0

### Research Output

Consistent pattern for research commands (gh-search, gemini-research, parallel-search):

```typescript
import { saveResearchOutput } from "@lib/research";

const results = await fetchResults(query);

// Saves two files:
// 1. JSON: docs/research/{type}/raw/YYYYMMDD-HHMMSS-{topic}.json
// 2. MD:   docs/research/{type}/YYYYMMDD-HHMMSS-{topic}.md
await saveResearchOutput(
  "github", // Research type
  query, // Topic for filename
  results, // Raw data (saved as JSON)
  formattedMarkdown, // Human-readable report
);
```
