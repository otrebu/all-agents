# TOOLS = aaa

AI development reference for the `aaa` CLI.
For user docs (installation, usage, examples), see [tools/README.md](./README.md).

## Stack

MUST READ: @context/stacks/cli/cli-bun.md

## Directory Structure

Curated key-file map (not exhaustive). Keep this focused on command entrypoints and frequently edited modules.

```text
tools/
├── src/
│   ├── cli.ts                           # Top-level command registration
│   ├── env.ts                           # Process env parsing (AAA_* vars)
│   ├── lib/
│   │   └── config/                      # aaa.config defaults + loader + env mapping
│   ├── commands/
│   │   ├── task.ts
│   │   ├── story.ts
│   │   ├── uninstall.ts
│   │   ├── completion/
│   │   │   ├── index.ts
│   │   │   ├── bash.ts
│   │   │   ├── zsh.ts
│   │   │   ├── fish.ts
│   │   │   └── table.ts
│   │   ├── extract-conversations/      # Active command module
│   │   │   ├── index.ts
│   │   │   ├── parser.ts
│   │   │   ├── formatter.ts
│   │   │   └── types.ts
│   │   ├── gemini/
│   │   ├── github/
│   │   ├── notify/
│   │   ├── parallel-search/
│   │   ├── review/                     # Modes: interactive, supervised, headless
│   │   ├── session/
│   │   ├── sync-context/
│   │   ├── setup/
│   │   └── ralph/
│   │       ├── index.ts
│   │       ├── types.ts
│   │       ├── build.ts
│   │       ├── plan-preview.ts
│   │       ├── pipeline-renderer.ts
│   │       ├── post-iteration.ts
│   │       └── providers/
│   │           ├── registry.ts
│   │           ├── models.ts
│   │           ├── session-adapter.ts
│   │           ├── session-claude.ts
│   │           ├── session-opencode.ts
│   │           ├── summary.ts
│   │           └── utils.ts
│   └── utils/
│       └── paths.ts                     # Root/project resolution helpers
├── lib/
│   ├── log.ts
│   ├── milestones.ts
│   ├── numbered-files.ts
│   ├── research.ts
│   └── format.ts
└── tests/
    ├── e2e/
    ├── lib/
    ├── completion/
    └── providers/
```

## Command Structure Guidelines

**Simple commands** (single responsibility, usually one file):

- Single `.ts` file in `commands/`
- Inline types/errors when they do not hide command flow
- Pattern: `commands/task.ts`, `commands/story.ts`, `commands/uninstall.ts`

**Complex commands** (>100 LOC or has utilities):

- Folder structure: `commands/commandName/`
- Separate `types.ts` if >30 lines OR >3 interfaces/types
- Additional modules for utilities/sub-features
- Examples: `github/`, `parallel-search/` (keep types.ts), `notify/` (types separate)

**When to split `types.ts`:**

- Split when type declarations start obscuring command flow
- Practical heuristic: roughly >30 lines OR >3 exported types/interfaces

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

`src/utils/paths.ts` resolves all-agents root with four fallback strategies (in order):

1. **Resolve from installed symlink** (`~/.local/bin/aaa`)
2. **Resolve from binary path** (`process.argv[1]`)
3. **Walk up from CWD** (requires both `context/` and `tools/`)
4. **Resolve from exec path** (`process.execPath`)

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
