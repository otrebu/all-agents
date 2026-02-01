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
│   │   ├── ralph/                # Autonomous dev framework (TypeScript)
│   │   │   ├── index.ts          # CLI commands (plan, build, status, calibrate)
│   │   │   ├── claude.ts         # Claude invocation helpers
│   │   │   ├── types.ts          # All type definitions
│   │   │   ├── config.ts         # Config + subtasks loading
│   │   │   ├── session.ts        # Session file utilities
│   │   │   ├── display.ts        # Terminal output utilities
│   │   │   ├── hooks.ts          # Hook execution (log, notify, pause)
│   │   │   ├── status.ts         # Status command implementation
│   │   │   ├── calibrate.ts      # Calibrate command implementation
│   │   │   ├── build.ts          # Build loop implementation
│   │   │   └── post-iteration.ts # Post-iteration hook logic
│   │   ├── review/               # Code review CLI (modes: supervised, headless)
│   │   │   ├── index.ts          # CLI commands and mode logic
│   │   │   └── types.ts          # Finding, DiaryEntry, triage types
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

### Effect.ts Services

All commands use Effect.ts for error handling, composability, and testability.

**Core services** (`src/lib/effect/`):

| Service         | Description                        | Layers                                         |
| --------------- | ---------------------------------- | ---------------------------------------------- |
| `Logger`        | Chalk-based logging                | `LoggerLive`, `LoggerDebug`, `LoggerSilent`    |
| `Config`        | Effect-based config loading        | `ConfigLive`, `makeConfigLayer(config)`        |
| `FileSystem`    | fs operations with error handling  | `FileSystemLive`, `makeTestFileSystem()`       |
| `HttpClient`    | HTTP with retry/timeout/rate-limit | `HttpClientLive`, `makeTestHttpClient()`       |
| `ClaudeService` | Claude CLI invocation wrapper      | `ClaudeServiceLive`, `makeTestClaudeService()` |

**Error types** (`src/lib/effect/errors.ts`):

Uses `Data.TaggedError` pattern for type-safe error handling:

- **Auth**: `AuthError`
- **Config**: `ConfigLoadError`, `ConfigParseError`, `ConfigValidationError`
- **FileSystem**: `FileNotFoundError`, `FileReadError`, `FileWriteError`, `PathResolutionError`
- **HTTP**: `NetworkError`, `TimeoutError`, `RateLimitError`
- **Claude**: `ClaudeSpawnError`, `ClaudeExitError`, `ClaudeParseError`, `ClaudeInterruptedError`
- **Review**: `ReviewSkillNotFoundError`, `ReviewFindingsParseError`, `ReviewValidationError`
- **Ralph**: `SubtasksNotFoundError`, `SubtasksParseError`, `MaxIterationsExceededError`

**Key patterns used**:

```typescript
// Generator-based composition
const program = Effect.gen(function* () {
  const logger = yield* Logger;
  const fs = yield* FileSystem;
  yield* Effect.sync(() => logger.info("Starting..."));
  return yield* fs.readFile("./data.txt");
});

// Parallel execution with concurrency
const results = yield * Effect.all(items.map(processItem), { concurrency: 5 });

// Retry with exponential backoff and jitter
const retrySchedule = pipe(
  Schedule.exponential(Duration.seconds(1)),
  Schedule.jittered,
  Schedule.compose(Schedule.recurs(3)),
);
yield * Effect.retry(apiCall, retrySchedule);

// Iteration loop with mutable state
const stateRef = yield * Ref.make(initialState);
yield *
  Effect.iterate(initial, {
    while: (s) => s.shouldContinue,
    body: (s) => runIteration(stateRef, s),
  });

// Type-safe error handling
yield *
  Effect.catchTags(program, {
    FileNotFoundError: (e) => Effect.succeed(fallback),
    NetworkError: (e) => Effect.fail(new UserError(e.message)),
  });

// Layer composition
const AppLive = Layer.mergeAll(FileSystemLive, LoggerLive, HttpClientLive);
await Effect.runPromise(program.pipe(Effect.provide(AppLive)));
```

**Commands using Effect**:

| Command                               | Key Effect Patterns                                               |
| ------------------------------------- | ----------------------------------------------------------------- |
| `task`, `story`, `uninstall`          | `Effect.gen`, `Effect.runPromise`, error catching                 |
| `gh-search`                           | `Effect.all` for parallel fetch, `Effect.retry` with jitter       |
| `parallel-search`, `gemini-research`  | External API/process wrapping, `saveResearchOutput`               |
| `notify`                              | `HttpClient` service, quiet hours logic as Effect combinators     |
| `extract-conversations`               | `Effect.all({ concurrency: 5 })` for parallel parsing             |
| `setup`, `sync-context`, `completion` | `FileSystemService`, `Effect.Stream` for watch mode               |
| `ralph build`                         | `Effect.iterate` for loop, `Effect.Ref` for state, parallel hooks |
| `ralph status`, `ralph calibrate`     | `ClaudeService`, parallel file reading                            |
| `review`                              | Parallel hook execution, `Effect.reduce` for finding aggregation  |

**Testing with Effect**:

```typescript
import { Effect, Layer } from "effect";
import { makeTestFileSystem, makeConfigLayer } from "@tools/lib/effect";

// Mock services for testing
const TestLayer = Layer.merge(
  makeTestFileSystem({ readFile: () => Effect.succeed("mock content") }),
  makeConfigLayer({ debug: true }),
);

const result = await Effect.runPromise(program.pipe(Effect.provide(TestLayer)));
```
