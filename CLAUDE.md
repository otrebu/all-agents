# CLAUDE.md

Development reference for Claude Code when working in this repo. For setup, usage, and features overview, see [README.md](README.md).

## Stack

- **Runtime:** Bun (TypeScript)
- **CLI libs:** commander, chalk, ora, boxen
- **Linting:** ESLint (uba-eslint-config), `no-console` allowed
- **Testing:** bun:test (E2E)

**Import aliases:**
- `@lib/*` → `./tools/lib/*`
- `@tools/*` → `./tools/src/*`

See @context/coding/stacks/STACK_TS_BUN_CLI.md for full stack patterns.

## Coding Style

See @context/coding/CODING_STYLE.md. Key points:

- FP-first, avoid classes (except custom errors)
- Small, focused functions
- Explicit naming: `timeoutMs`, `priceGBP`, `isValid`
- CLI logging via `tools/lib/log.ts` (chalk-based)

## Extending the CLI

### 1. Create Command Module

Create `tools/src/commands/<name>/`:

```
tools/src/commands/my-cmd/
├── main.ts      # Entry point
├── types.ts     # Custom errors
└── utils.ts     # Helpers (optional)
```

### 2. Implement the Command

```typescript
// tools/src/commands/my-cmd/types.ts
export class MyCmdError extends Error {
  name = 'MyCmdError'
}

// tools/src/commands/my-cmd/main.ts
import log from '@lib/log.js'
import { MyCmdError } from './types.js'

interface MyCmdOptions {
  verbose?: boolean
}

async function runMyCmd(query: string, options: MyCmdOptions): Promise<void> {
  log.header('\n🔍 My Command\n')
  log.dim(`Query: ${query}`)

  // ... implementation

  log.success('✓ Done')
}

export async function runMyCmdCli(query: string, options: MyCmdOptions): Promise<void> {
  try {
    await runMyCmd(query, options)
  } catch (error) {
    if (error instanceof MyCmdError) {
      log.error(`✗ ${error.message}`)
    } else {
      log.error('Unexpected error')
      console.error(error)
    }
    process.exit(1)
  }
}
```

### 3. Register in cli.ts

```typescript
// tools/src/cli.ts
import { runMyCmdCli } from './commands/my-cmd/main.js'

program.addCommand(
  new Command('my-cmd')
    .description('Does something useful')
    .argument('<query>', 'Search query')
    .option('-v, --verbose', 'Verbose output')
    .action(runMyCmdCli)
)
```

### 4. Shared Utilities

```typescript
import log from '@lib/log.js'           // Colored output
import { saveResearchOutput } from '@lib/research.js'  // Save JSON + MD
import { sanitizeForFilename } from '@lib/format.js'   // Safe filenames
import { getOutputDir } from '@tools/utils/paths.js'   // Output paths
```

### 5. (Optional) Claude Code Integration

Create `.claude/commands/my-cmd.md`:

```yaml
---
description: Run my-cmd for X
allowed-tools: Bash(aaa my-cmd:*), Read
argument-hint: <query>
---

Execute `aaa my-cmd "$ARGUMENTS"` and summarize results.
```

## Architecture

```
tools/
├── src/
│   ├── cli.ts              # Entry point (Commander.js)
│   ├── commands/           # Command implementations
│   │   ├── github/         # gh-search
│   │   ├── gemini/         # gemini-research
│   │   ├── parallel-search/
│   │   ├── setup/
│   │   └── task/
│   └── utils/paths.ts      # Path resolution
├── lib/                    # Shared utilities
│   ├── log.ts              # CLI logging
│   ├── research.ts         # saveResearchOutput()
│   └── format.ts           # sanitizeForFilename()
└── tests/e2e/
```

**Pattern:** Commands reference docs in `context/`, generate output to `docs/research/`.

## Workflow

### Definition of Done

1. Tests passing (when tests exist)
2. README/docs updated
3. Committed with conventional commit

### Commits

Use **Conventional Commits**: `feat(scope): description`

Run `/dev:git-commit` to create commits. **Never** add Claude signature/co-authorship.

### Branching

Ask before creating feature branches. Use `/dev:start-feature <description>` if needed.

## Important Notes

- No emojis in code/commits unless requested
- FP-first: avoid `this`, `new`, classes (except errors)
- Follow @context/coding/workflow/DEV_LIFECYCLE.md when coding
