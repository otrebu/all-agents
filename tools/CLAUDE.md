# tools/CLAUDE.md

AI development reference for the `aaa` CLI.
For user docs (installation, usage, examples), see [tools/README.md](./README.md).
For repo-level info, see [/CLAUDE.md](/CLAUDE.md).

## Stack

@context/stacks/ts-bun-cli.built.md

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
│   │   ├── download/             # Complex: folder structure
│   │   │   └── index.ts          # Types inlined
│   │   ├── gemini/               # Complex: folder + types.ts (32L)
│   │   │   ├── index.ts
│   │   │   └── types.ts
│   │   ├── github/               # Complex: folder + types.ts + utils
│   │   │   ├── index.ts
│   │   │   ├── types.ts          # 108L - separate justified
│   │   │   ├── github.ts
│   │   │   ├── ranker.ts
│   │   │   └── query.ts
│   │   ├── parallel-search/
│   │   │   ├── index.ts
│   │   │   ├── types.ts          # 95L - separate justified
│   │   │   ├── parallel-client.ts
│   │   │   └── formatter.ts
│   │   └── setup/
│   │       ├── index.ts
│   │       └── utils.ts
│   └── utils/
│       └── paths.ts              # Root resolution, output paths
├── lib/                          # Shared utilities
│   ├── log.ts                    # CLI logging (chalk)
│   ├── numbered-files.ts         # Auto-numbered file creation
│   ├── research.ts               # Research output formatting
│   └── format.ts                 # Filename sanitization
└── tests/
    ├── e2e/                      # Command E2E tests
    └── lib/                      # Utility unit tests
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
- Examples: `github/`, `parallel-search/` (keep types.ts), `download/` (types inlined)

**Threshold for separate types.ts:**

- > 30 lines of type definitions → separate file
- Keeps `index.ts` readable, prevents scrolling hell

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
