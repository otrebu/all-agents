# Restructure & Bun CLI Plan

**Binary name:** `aaa`
**Architecture:** Code bundled at build-time, output dirs external at runtime

---

## Phase 1: Rename & Organize Directories

### 1.1 Rename `docs/` → `context/`

Use `git mv` to preserve history:

```bash
git mv docs context
```

### 1.2 Reorganize into `tools/`

Use `git mv` for all moves to preserve history:

```bash
# Create tools structure
mkdir -p tools/src/utils

# Move with git mv (preserves history)
git mv lib tools/lib
git mv tests tools/tests
git mv package.json tools/
git mv tsconfig.json tools/
git mv eslint.config.js tools/
git mv vitest.config.ts tools/
git mv pnpm-lock.yaml tools/

# Create bin directory
mkdir -p bin
echo 'bin/aaa' >> .gitignore
```

### 1.3 Update all references (30+ files)

**Find/replace patterns:**
- `docs/` → `context/` (in paths)
- `"docs/research/` → use `getOutputDir()` (see Phase 4)

**Files to update:**
- `CLAUDE.md` (~25 occurrences)
- `README.md` (~10 occurrences)
- `.claude/commands/*.md` (~15 files)
- `.claude/agents/*.md` (2 files)
- `context/knowledge/*/scripts/*.ts` (3 files - RESEARCH_DIR constants)
- `context/meta/*.md` (2 files)

**Root structure after:**
```
all-agents/
├── bin/                           # Compiled binary (gitignored)
│   └── aaa
├── context/                       # Documentation & scripts (was docs/)
│   ├── knowledge/
│   │   ├── github/
│   │   │   ├── GH_SEARCH.md
│   │   │   └── scripts/
│   │   │       ├── main.ts        # Core logic (export runGitHubSearch)
│   │   │       ├── command.ts     # Command factory
│   │   │       ├── github.ts
│   │   │       ├── query.ts
│   │   │       ├── ranker.ts
│   │   │       └── types.ts
│   │   ├── parallel-search/
│   │   │   ├── PARALLEL_SEARCH.md
│   │   │   └── scripts/
│   │   │       ├── search.ts      # Core logic (export runParallelSearch)
│   │   │       ├── command.ts     # Command factory
│   │   │       ├── parallel-client.ts
│   │   │       ├── formatter.ts
│   │   │       └── types.ts
│   │   └── gemini-cli/
│   │       ├── GEMINI_CLI.md
│   │       └── scripts/
│   │           ├── search.ts      # Core logic (export runGeminiResearch)
│   │           ├── command.ts     # Command factory
│   │           └── types.ts
│   ├── research/                  # Output directory (unchanged)
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
│   │   └── utils/
│   │       └── paths.ts           # Runtime path resolution
│   ├── tests/
│   │   ├── lib/
│   │   └── e2e/
│   ├── package.json
│   ├── tsconfig.json
│   ├── eslint.config.js
│   └── vitest.config.ts
├── .env.example
├── CLAUDE.md
└── README.md
```

---

## Phase 2: Environment Variables with Zod

### 2.1 Create `tools/src/env.ts`

```typescript
import { config } from 'dotenv'
import { z } from 'zod'

// Load .env file
config()

const envSchema = z.object({
  // Required for parallel-search
  AAA_PARALLEL_API_KEY: z.string().optional(),

  // Optional GitHub token override
  AAA_GITHUB_TOKEN: z.string().optional(),

  // Project root override (for binary deployment)
  AAA_ROOT_PATH: z.string().optional(),

  // Debug mode - enables verbose logging
  AAA_DEBUG: z.enum(['true', 'false', '1', '0']).optional()
    .transform(v => v === 'true' || v === '1'),
})

export type Env = z.infer<typeof envSchema>

// Parse and validate environment
const parseResult = envSchema.safeParse(process.env)

if (!parseResult.success) {
  console.error('Invalid environment variables:')
  console.error(parseResult.error.format())
  process.exit(1)
}

export const env = parseResult.data

// Debug helper - only logs when AAA_DEBUG is true
export function debug(...args: unknown[]) {
  if (env.AAA_DEBUG) {
    console.log('[DEBUG]', ...args)
  }
}
```

### 2.2 Create `.env.example`

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

---

## Phase 3: Refactor Scripts for Module Export

Current scripts call `program.parse()` directly. Refactor to:
1. Export core logic as reusable functions
2. Create command factories using `.addCommand()` pattern
3. Support both standalone and CLI modes via `import.meta.main`

### 3.1 GitHub Search (`context/knowledge/github/scripts/`)

**main.ts** → Export core logic:

```typescript
import log from '@lib/log.js'
import { saveResearchOutput } from '@lib/research.js'
import { env, debug } from '@tools/env.js'
import { getOutputDir } from '@tools/utils/paths.js'

// ... existing imports

export interface GitHubSearchResult {
  files: CodeFile[]
  jsonPath: string
  mdPath: string
}

export async function runGitHubSearch(query: string): Promise<GitHubSearchResult> {
  const RESEARCH_DIR = getOutputDir('research/github')
  debug('Research dir:', RESEARCH_DIR)

  // ... existing action logic (lines 28-96)
  return { files, jsonPath, mdPath }
}

// Standalone execution
if (import.meta.main) {
  const { Command } = await import('@commander-js/extra-typings')
  const { makeGhSearchCommand } = await import('./command.js')

  const program = new Command()
  program.addCommand(makeGhSearchCommand())
  program.parse()
}
```

**command.ts** → Command factory (NEW FILE):

```typescript
import { Command } from '@commander-js/extra-typings'
import { runGitHubSearch } from './main.js'

export function makeGhSearchCommand() {
  return new Command('gh-search')
    .description('Search GitHub for real-world code examples')
    .argument('<query>', 'Search query')
    .action(async (query) => {
      // query is typed as string automatically
      await runGitHubSearch(query)
    })
}
```

### 3.2 Parallel Search (`context/knowledge/parallel-search/scripts/`)

**search.ts** → Export core logic:

```typescript
import { env, debug } from '@tools/env.js'
import { getOutputDir } from '@tools/utils/paths.js'

export interface ParallelSearchOptions {
  objective: string
  queries?: string[]
  processor?: 'lite' | 'base' | 'pro' | 'ultra'
  maxResults?: number
  maxChars?: number
}

export interface ParallelSearchResult {
  results: unknown[]
  jsonPath: string
  mdPath: string
}

export async function runParallelSearch(options: ParallelSearchOptions): Promise<ParallelSearchResult> {
  const RESEARCH_DIR = getOutputDir('research/parallel')
  const apiKey = env.AAA_PARALLEL_API_KEY
  debug('Parallel search config:', options)

  // ... existing action logic
  return { results, jsonPath, mdPath }
}

// Standalone execution
if (import.meta.main) {
  const { Command } = await import('@commander-js/extra-typings')
  const { makeParallelSearchCommand } = await import('./command.js')

  const program = new Command()
  program.addCommand(makeParallelSearchCommand())
  program.parse()
}
```

**command.ts** → Command factory (NEW FILE):

```typescript
import { Command } from '@commander-js/extra-typings'
import { runParallelSearch } from './search.js'

export function makeParallelSearchCommand() {
  return new Command('parallel-search')
    .description('Multi-angle web research via Parallel Search API')
    .requiredOption('--objective <string>', 'Main search objective')
    .option('--queries <string...>', 'Additional search queries')
    .option('--processor <string>', 'Processing level: lite|base|pro|ultra', 'pro')
    .option('--max-results <number>', 'Maximum results', (v) => Number.parseInt(v, 10), 15)
    .option('--max-chars <number>', 'Max chars per excerpt', (v) => Number.parseInt(v, 10), 5000)
    .argument('[extraQueries...]', 'Additional queries (positional)')
    .action(async (extraQueries, options) => {
      // options is fully typed: { objective: string, queries?: string[], ... }
      await runParallelSearch({
        objective: options.objective,
        queries: [...(options.queries ?? []), ...extraQueries],
        processor: options.processor as 'lite' | 'base' | 'pro' | 'ultra',
        maxResults: options.maxResults,
        maxChars: options.maxChars,
      })
    })
}
```

### 3.3 Gemini Research (`context/knowledge/gemini-cli/scripts/`)

**search.ts** → Export core logic:

```typescript
import { env, debug } from '@tools/env.js'
import { getOutputDir } from '@tools/utils/paths.js'

export type GeminiMode = 'quick' | 'deep' | 'code'

export interface GeminiResearchResult {
  data: GeminiResponse
  jsonPath: string
  mdPath: string
}

export async function runGeminiResearch(query: string, mode: GeminiMode = 'quick'): Promise<GeminiResearchResult> {
  const RESEARCH_DIR = getOutputDir('research/google')
  debug('Gemini research:', { query, mode })

  // ... existing action logic
  return { data, jsonPath, mdPath }
}

// Standalone execution
if (import.meta.main) {
  const { Command } = await import('@commander-js/extra-typings')
  const { makeGeminiResearchCommand } = await import('./command.js')

  const program = new Command()
  program.addCommand(makeGeminiResearchCommand())
  program.parse()
}
```

**command.ts** → Command factory (NEW FILE):

```typescript
import { Command } from '@commander-js/extra-typings'
import { runGeminiResearch } from './search.js'
import type { GeminiMode } from './search.js'

export function makeGeminiResearchCommand() {
  return new Command('gemini-research')
    .description('Google Search research via Gemini CLI')
    .argument('<query>', 'Search query')
    .option('--mode <string>', 'Research mode: quick|deep|code', 'quick')
    .action(async (query, options) => {
      // query typed as string, options.mode typed as string
      await runGeminiResearch(query, options.mode as GeminiMode)
    })
}
```

---

## Phase 4: Output Directory Resolution

### 4.1 Create path resolver (`tools/src/utils/paths.ts`)

```typescript
import { existsSync, realpathSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { env } from '@tools/env.js'

let cachedRoot: string | null = null

export function getProjectRoot(): string {
  if (cachedRoot) return cachedRoot

  // 1. Environment override (AAA_ROOT_PATH)
  if (env.AAA_ROOT_PATH) {
    cachedRoot = env.AAA_ROOT_PATH
    return cachedRoot
  }

  // 2. Relative to binary (handles symlinks)
  const binaryPath = process.argv[1]
  if (binaryPath) {
    const realPath = existsSync(binaryPath) ? realpathSync(binaryPath) : binaryPath
    const binaryDir = dirname(realPath)

    // Check ../context (binary in bin/, context at root)
    const fromBin = resolve(binaryDir, '..')
    if (existsSync(resolve(fromBin, 'context'))) {
      cachedRoot = fromBin
      return cachedRoot
    }
  }

  // 3. CWD fallback (development)
  if (existsSync(resolve(process.cwd(), 'context'))) {
    cachedRoot = process.cwd()
    return cachedRoot
  }

  throw new Error(
    'Cannot find project root. Set AAA_ROOT_PATH or run from project directory.'
  )
}

export function getOutputDir(subpath: string): string {
  return resolve(getProjectRoot(), 'context', subpath)
}
```

### 4.2 Update scripts to use resolver

Replace hardcoded paths in each script:

```typescript
// Before
const RESEARCH_DIR = 'docs/research/github'

// After
import { getOutputDir } from '@tools/utils/paths.js'
const RESEARCH_DIR = getOutputDir('research/github')
```

---

## Phase 5: Unified CLI with .addCommand()

### 5.1 Create entry point (`tools/src/cli.ts`)

```typescript
#!/usr/bin/env bun
import { Command } from '@commander-js/extra-typings'
import { makeGhSearchCommand } from '@context/knowledge/github/scripts/command.js'
import { makeParallelSearchCommand } from '@context/knowledge/parallel-search/scripts/command.js'
import { makeGeminiResearchCommand } from '@context/knowledge/gemini-cli/scripts/command.js'

const program = new Command()

program
  .name('aaa')
  .description('All-Agents CLI Toolkit')
  .version('1.0.0')

// Add pre-configured subcommands using .addCommand()
program.addCommand(makeGhSearchCommand())
program.addCommand(makeParallelSearchCommand())
program.addCommand(makeGeminiResearchCommand())

program.parse()
```

---

## Phase 6: TypeScript & Bun Configuration

### 6.1 Update `tools/tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "verbatimModuleSyntax": true,
    "outDir": "./dist",
    "rootDir": "..",
    "baseUrl": "..",
    "paths": {
      "@context/*": ["./context/*"],
      "@tools/*": ["./tools/src/*"],
      "@lib/*": ["./tools/lib/*"]
    },
    "types": ["bun-types"]
  },
  "include": [
    "src/**/*",
    "lib/**/*",
    "../context/knowledge/*/scripts/**/*"
  ],
  "exclude": ["node_modules", "dist", "tests"]
}
```

### 6.2 Update `tools/package.json`

```json
{
  "name": "all-agents-tools",
  "type": "module",
  "version": "1.0.0",
  "scripts": {
    "dev": "bun run src/cli.ts",
    "build": "bun build --compile --outfile ../bin/aaa ./src/cli.ts",
    "test": "vitest run",
    "test:watch": "vitest",
    "lint": "eslint .",
    "lint:fix": "eslint . --fix"
  },
  "dependencies": {
    "@commander-js/extra-typings": "^14.0.0",
    "@google/gemini-cli": "^0.16.0",
    "@octokit/rest": "^22.0.1",
    "chalk": "^5.3.0",
    "commander": "^14.0.0",
    "dotenv": "^16.4.5",
    "execa": "^9.6.0",
    "ora": "^8.0.1",
    "parallel-web": "latest",
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "@types/node": "^24.10.1",
    "bun-types": "latest",
    "eslint": "^9.39.1",
    "glob": "^13.0.0",
    "typescript": "^5.9.3",
    "uba-eslint-config": "^1.1.2",
    "vitest": "^4.0.12"
  }
}
```

**Key dependency changes:**
- Upgrade `commander` from 12.1.0 → 14.0.0
- Add `@commander-js/extra-typings` ^14.0.0 (must match commander version)
- Add `dotenv` ^16.4.5
- Add `zod` ^3.23.8
- Remove `tsx` (using bun runtime)
- Add `bun-types`

### 6.3 Update `tools/vitest.config.ts`

```typescript
import { resolve } from 'node:path'
import { defineConfig } from 'vitest/config'

const currentDirectory = import.meta.dirname

export default defineConfig({
  resolve: {
    alias: {
      '@lib': resolve(currentDirectory, './lib'),
      '@tools': resolve(currentDirectory, './src'),
      '@context': resolve(currentDirectory, '../context'),
    },
  },
  test: {
    globals: true,
  },
})
```

---

## Phase 7: Documentation Updates

### 7.1 Update `CLAUDE.md`

- Replace `pnpm gh-search` → `aaa gh-search` (or `bin/aaa gh-search`)
- Replace `pnpm parallel-search` → `aaa parallel-search`
- Replace `pnpm gemini-research` → `aaa gemini-research`
- Update directory structure section
- Add build instructions: `cd tools && bun run build`
- Update path alias documentation

### 7.2 Update `.claude/commands/*.md`

Update `allowed-tools` patterns:

```yaml
# Before
allowed-tools: Bash(pnpm gh-search:*)

# After
allowed-tools: Bash(aaa gh-search:*), Bash(bin/aaa gh-search:*)
```

### 7.3 Update `.claude/agents/*.md`

Same tool permission updates.

### 7.4 Update `context/knowledge/*/` docs

- `GEMINI_CLI.md`: Update command examples
- `PARALLEL_SEARCH.md`: Update command examples
- `GH_SEARCH.md`: Update command examples

---

## Phase 8: Testing & Verification

### 8.1 Update test paths

In `tools/tests/e2e/*.test.ts`:

```typescript
// Update imports to use path aliases
import { getOutputDir } from '@tools/utils/paths.js'
```

### 8.2 Build & verify

```bash
cd tools
bun install
bun run build

# Test CLI
../bin/aaa --help
../bin/aaa gh-search "test query"
../bin/aaa parallel-search --objective "test" --queries "q1"
../bin/aaa gemini-research "test query"

# Test standalone scripts (both modes supported)
bun ../context/knowledge/github/scripts/main.ts "test query"
```

### 8.3 Run tests

```bash
cd tools
bun run test
```

---

## Critical Files to Modify

| Priority | File | Changes |
|----------|------|---------|
| 1 | `docs/` → `context/` | `git mv docs context` |
| 2 | `lib/` → `tools/lib/` | `git mv lib tools/lib` |
| 3 | `tests/` → `tools/tests/` | `git mv tests tools/tests` |
| 4 | `package.json` | Move to tools/, upgrade commander to 14.x, add extra-typings, zod, dotenv |
| 5 | `tsconfig.json` | Move to tools/, add path aliases (@context, @tools, @lib) |
| 6 | `context/knowledge/github/scripts/main.ts` | Export `runGitHubSearch`, add `import.meta.main` |
| 7 | `context/knowledge/github/scripts/command.ts` | NEW: Command factory with `.addCommand()` pattern |
| 8 | `context/knowledge/parallel-search/scripts/search.ts` | Export `runParallelSearch`, use `env.AAA_PARALLEL_API_KEY` |
| 9 | `context/knowledge/parallel-search/scripts/command.ts` | NEW: Command factory |
| 10 | `context/knowledge/gemini-cli/scripts/search.ts` | Export `runGeminiResearch` |
| 11 | `context/knowledge/gemini-cli/scripts/command.ts` | NEW: Command factory |
| 12 | `tools/src/cli.ts` | NEW: Main entry point using `.addCommand()` |
| 13 | `tools/src/env.ts` | NEW: Zod env parser with AAA_ prefix |
| 14 | `tools/src/utils/paths.ts` | NEW: Runtime path resolver using `env.AAA_ROOT_PATH` |
| 15 | `.env.example` | NEW: Environment variable template |
| 16 | `CLAUDE.md` | Update ~30 references (docs→context, pnpm→aaa) |
| 17 | `.claude/commands/*.md` | Update tool permissions |
| 18 | `.claude/agents/*.md` | Update tool permissions |

---

## Execution Order

1. **Phase 1.1**: `git mv docs context`
2. **Phase 1.2**: Move files into `tools/` structure with `git mv`
3. **Phase 6**: Configure tsconfig with path aliases
4. **Phase 6**: Update package.json with new dependencies
5. **Phase 2**: Create `env.ts` with Zod schema
6. **Phase 4**: Create path resolver (`tools/src/utils/paths.ts`)
7. **Phase 3**: Refactor scripts - export functions, create `command.ts` factories
8. **Phase 5**: Create unified CLI with `.addCommand()`
9. **Phase 1.3 + 7**: Update all documentation references
10. **Phase 8**: Test everything
