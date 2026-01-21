# Ralph TypeScript Migration - Implementation Plan

## Overview

Migrate all Ralph bash scripts (2262 lines) to TypeScript (~800 lines) to eliminate the hybrid architecture causing maintenance burden.

**Branch:** `feature/ralph-2` (current)
**Approach:** Complete migration, not incremental

---

## Revision Notes (Post-Review)

Plan reviewed by Opus agent. Critical changes incorporated:
1. ✅ Claude invocation extracted to `claude.ts` (mandatory, not optional)
2. ✅ SIGINT signal handling added
3. ✅ Headless stderr separation added
4. ✅ Haiku timeout (30s) added
5. ✅ Status normalization for backward compatibility
6. ✅ Markdown rendering (glow) added
7. ✅ Session ID handling for supervised mode clarified
8. ✅ Phase order adjusted (session.ts before hooks.ts)
9. ✅ Tasks consolidated where appropriate

---

## Critical: Process Spawning Strategy

### Historical Context
Past issues occurred with TypeScript CLI spawning processes. The codebase currently uses:
- `spawnSync` (node:child_process) - for Claude invocation with `stdio: "inherit"`
- `execSync` (node:child_process) - for bash script delegation
- `execa` - in tests and some production code (gemini, sync-context)

### Decision: Use `spawnSync` for Claude, Native APIs for Everything Else

**Why NOT switch to execa for Claude invocation:**
1. `spawnSync` with `stdio: "inherit"` works correctly for interactive sessions
2. The existing Claude invocation code (`invokeClaudeChat`, `invokeClaudeHeadless`) is battle-tested
3. Changing process spawning library risks introducing the exact issues we want to avoid

**Strategy:**
- **Claude invocation:** Keep using `spawnSync` with `stdio: "inherit"` (supervised) or capture stdout (headless)
- **File operations:** Use native `node:fs` (already used throughout)
- **Git operations:** Use `spawnSync` for simple git commands (diff, status)
- **HTTP (ntfy):** Use native `fetch()` (available in Bun)
- **No new dependencies:** Avoid adding execa to production ralph code

### Process Spawning Patterns to Use

```typescript
// Pattern 1: Interactive Claude session (supervised mode)
// User can see output AND type if needed
const result = spawnSync("claude", [
  "--permission-mode", "bypassPermissions",
  "--append-system-prompt", prompt,
  initialMessage,
], { stdio: "inherit" });

// CRITICAL: Handle signal interruption (Ctrl+C)
if (result.signal === "SIGINT" || result.signal === "SIGTERM") {
  console.log("Session interrupted by user");
  return; // Don't treat as error
}

// Pattern 2: Headless Claude (capture JSON output)
// CRITICAL: Separate stderr to avoid breaking JSON.parse
const result = spawnSync("claude", [
  "-p", prompt,
  "--dangerously-skip-permissions",
  "--output-format", "json",
], {
  encoding: "utf8",
  maxBuffer: 50 * 1024 * 1024,  // 50MB for large outputs
  stdio: ["inherit", "pipe", "inherit"],  // stderr flows through, stdout captured
});

if (result.signal) {
  console.log("Session interrupted");
  return;
}

const output = JSON.parse(result.stdout);

// Pattern 3: Simple command (git, etc.)
const result = spawnSync("git", ["diff", "--name-only"], {
  cwd: repoRoot,
  encoding: "utf8",
});
const files = result.stdout.trim().split("\n");

// Pattern 4: Haiku summary (with timeout)
const result = spawnSync("claude", [
  "--model", "haiku",
  "-p", prompt,
  "--output-format", "json",
], {
  encoding: "utf8",
  timeout: 30000,  // 30 second timeout
  stdio: ["inherit", "pipe", "inherit"],
});
```

---

## Module-by-Module Implementation

### Module 0: Claude Invocation (`claude.ts`) - MANDATORY

**Purpose:** Extract Claude invocation from index.ts to avoid circular imports

**Why mandatory:** `build.ts` needs to import Claude invocation helpers. If they stay in `index.ts`, and `index.ts` imports from `build.ts`, we get circular dependencies.

**Functions to extract from index.ts:**
```typescript
// Supervised mode - user watches and can type
function invokeClaudeChat(
  prompt: string,  // Changed: accept string directly, not just path
  sessionName: string,
  extraContext?: string
): ClaudeResult

// Headless mode - JSON output captured
function invokeClaudeHeadless(options: HeadlessOptions): HeadlessResult

// NEW: Build prompt content (can be from path or inline)
function buildPrompt(content: string, extraContext?: string): string
```

**Signal handling (CRITICAL):**
```typescript
interface ClaudeResult {
  success: boolean;
  interrupted: boolean;  // true if SIGINT/SIGTERM
  exitCode: number | null;
}

function invokeClaudeChat(...): ClaudeResult {
  const result = spawnSync("claude", [...], { stdio: "inherit" });

  // Handle user interruption gracefully
  if (result.signal === "SIGINT" || result.signal === "SIGTERM") {
    return { success: true, interrupted: true, exitCode: null };
  }

  return {
    success: result.status === 0,
    interrupted: false,
    exitCode: result.status,
  };
}
```

**Stderr handling for headless (CRITICAL):**
```typescript
function invokeClaudeHeadless(options: HeadlessOptions): HeadlessResult {
  const result = spawnSync("claude", [
    "-p", options.prompt,
    "--dangerously-skip-permissions",
    "--output-format", "json",
  ], {
    encoding: "utf8",
    maxBuffer: 50 * 1024 * 1024,
    stdio: ["inherit", "pipe", "inherit"],  // stderr to console, stdout captured
  });

  // ... parse result.stdout as JSON
}
```

**Haiku helper with timeout:**
```typescript
function invokeClaudeHaiku(prompt: string, timeoutMs = 30000): string | null {
  const result = spawnSync("claude", [
    "--model", "haiku",
    "-p", prompt,
    "--output-format", "json",
  ], {
    encoding: "utf8",
    timeout: timeoutMs,
    stdio: ["inherit", "pipe", "inherit"],
  });

  if (result.error?.code === "ETIMEDOUT") {
    console.log("Haiku summary generation timed out");
    return null;
  }

  try {
    const output = JSON.parse(result.stdout);
    return output.result ?? null;
  } catch {
    return null;
  }
}
```

**Estimated lines:** ~150
**Dependencies:** `node:child_process`, `./types`
**Risk:** Low (moving existing working code)

---

### Module 1: Shared Types (`types.ts`)

**Purpose:** Single source of truth for all Ralph data structures

**Contents:**
```typescript
// Subtasks
interface Subtask {
  id: string;
  title?: string;
  description?: string;
  done: boolean;
  completedAt?: string;
  commitHash?: string;
  sessionId?: string;
  taskRef?: string;
  milestone?: string;
}

interface SubtasksFile {
  subtasks: Subtask[];
}

// Config
interface RalphConfig {
  driftTasks?: "auto" | "always" | "force";
  selfImprovement?: { mode: "always" | "auto" | "never" };
  hooks?: {
    onMaxIterationsExceeded?: HookConfig;
    postIteration?: PostIterationHookConfig;
  };
  ntfy?: { topic: string; server?: string };
}

interface HookConfig {
  actions: HookAction[];
}

type HookAction = "log" | "notify" | "pause";

interface PostIterationHookConfig extends HookConfig {
  enabled?: boolean;
  model?: string;
  diaryPath?: string;
  pauseOnFailure?: boolean;
  pauseOnSuccess?: boolean;
  pauseAlways?: boolean;
}

// Iteration diary
interface IterationDiaryEntry {
  subtaskId: string;
  sessionId: string;
  status: IterationStatus;
  summary: string;
  timestamp: string;
  milestone?: string;
  taskRef?: string;
  iterationNum: number;
  keyFindings: string[];
  errors: string[];
  toolCalls: number;
  filesChanged: string[];
  duration: number;
}

type IterationStatus = "completed" | "failed" | "retrying";

// Status normalization for backward compatibility
// Legacy values: success -> completed, failure -> failed, partial -> retrying
function normalizeStatus(raw: string): IterationStatus {
  switch (raw) {
    case "completed":
    case "success":
      return "completed";
    case "failed":
    case "failure":
      return "failed";
    case "retrying":
    case "partial":
      return "retrying";
    default:
      return "failed";  // Safe default
  }
}

// Claude output (move from index.ts)
interface ClaudeOutput {
  result?: string;
  session_id?: string;
  duration_ms?: number;
  total_cost_usd?: number;
  num_turns?: number;
}

// Build state
interface BuildState {
  subtasksPath: string;
  maxIterations: number;
  mode: "supervised" | "headless";
  interactive: boolean;
  validateFirst: boolean;
}
```

**Estimated lines:** ~80
**Dependencies:** None
**Risk:** None (pure types)

---

### Module 2: Config & Data Loading (`config.ts`)

**Purpose:** Load and validate ralph.config.json and subtasks.json

**Functions:**
```typescript
// Load ralph.config.json with defaults
function loadRalphConfig(): RalphConfig

// Load subtasks.json, throw if missing
function loadSubtasksFile(path: string): SubtasksFile

// Save subtasks.json (for marking done)
function saveSubtasksFile(path: string, data: SubtasksFile): void

// Query helpers
function getCompletedSubtasks(file: SubtasksFile): Subtask[]
function getPendingSubtasks(file: SubtasksFile): Subtask[]
function getNextSubtask(file: SubtasksFile): Subtask | undefined
function countRemaining(file: SubtasksFile): number

// Extract milestone from taskRef path
function getMilestoneFromSubtasks(file: SubtasksFile): string | null
```

**Implementation notes:**
- Use `JSON.parse(readFileSync(...))` - simple, synchronous, works
- Provide sensible defaults when config missing
- No validation library needed (keep it simple)

**Estimated lines:** ~100
**Dependencies:** `node:fs`, `./types`
**Risk:** Low

---

### Module 3: Display Utilities (`display.ts`)

**Purpose:** Colored terminal output, progress bars, formatting

**Functions:**
```typescript
// Progress bar: [████████░░░░] 8/12 (67%)
function renderProgressBar(done: number, total: number, width?: number): string

// Status box with border
function renderStatusBox(title: string, lines: string[]): void

// Duration: "2m 15s" or "45s" or "120ms"
function formatDuration(ms: number): string

// Timestamp: "2024-01-15 14:30"
function formatTimestamp(iso: string): string

// Color by status
function colorStatus(status: IterationStatus): string

// Truncate with ellipsis
function truncate(text: string, maxLen: number): string

// Markdown rendering with glow fallback
function renderMarkdown(text: string): void
```

**Markdown rendering (matches bash behavior):**
```typescript
function renderMarkdown(text: string): void {
  // Check if glow is available
  const glowCheck = spawnSync("which", ["glow"], { encoding: "utf8" });
  const hasGlow = glowCheck.status === 0;

  if (hasGlow) {
    spawnSync("glow", ["-s", "dark", "-w", "80"], {
      input: text,
      stdio: ["pipe", "inherit", "inherit"],
    });
  } else {
    console.log(text);
  }
}
```

**Implementation notes:**
- Use `chalk` (already a dependency)
- Keep functions pure and simple

**Estimated lines:** ~100
**Dependencies:** `chalk`, `node:child_process` (for glow check)
**Risk:** None

---

### Module 4: Hooks (`hooks.ts`)

**Purpose:** Execute configured actions (log, notify, pause)

**Functions:**
```typescript
// Main hook executor
async function executeHook(
  hookName: string,
  context: string,
  config: RalphConfig
): Promise<void>

// Individual actions
function executeLogAction(hookName: string, context: string): void
async function executeNotifyAction(hookName: string, context: string, config: RalphConfig): Promise<void>
async function executePauseAction(hookName: string, context: string): Promise<void>
```

**Implementation notes:**
- Use native `fetch()` for ntfy notifications (Bun supports this)
- Use `readline` for interactive pause prompt
- Handle non-interactive mode gracefully (skip pause)

**Pause implementation:**
```typescript
async function executePauseAction(hookName: string, context: string): Promise<void> {
  // Check if stdin is a TTY
  if (!process.stdin.isTTY) {
    console.log(`[Hook:${hookName}] Non-interactive mode, skipping pause`);
    return;
  }

  console.log(`\n[Hook:${hookName}] ${context}`);
  console.log("Press Enter to continue or Ctrl+C to abort...");

  const readline = await import("node:readline");
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  await new Promise<void>((resolve) => {
    rl.question("", () => {
      rl.close();
      resolve();
    });
  });
}
```

**Estimated lines:** ~100
**Dependencies:** `node:readline`, native `fetch`
**Risk:** Low (pause needs TTY check)

---

### Module 5: Session Utilities (`session.ts`)

**Purpose:** Find and analyze Claude session JSONL files

**Functions:**
```typescript
// Find session file path (multiple fallback locations)
function getSessionJsonlPath(sessionId: string, repoRoot: string): string | null

// Count tool_use entries in session
function countToolCalls(sessionPath: string): number

// Calculate duration from first/last timestamps
function calculateDurationMs(sessionPath: string): number

// Get files changed from session log (Write/Edit tool calls)
function getFilesFromSession(sessionPath: string): string[]
```

**Implementation notes:**
- Session files live in `~/.claude/projects/<encoded-path>/<sessionId>.jsonl`
- Path encoding can be base64 OR dash-separated
- Need to check multiple locations with fallback

**Session path discovery:**
```typescript
function getSessionJsonlPath(sessionId: string, repoRoot: string): string | null {
  const home = process.env.HOME ?? "";

  // Try base64-encoded path
  const base64Path = Buffer.from(repoRoot).toString("base64");
  const path1 = `${home}/.claude/projects/${base64Path}/${sessionId}.jsonl`;
  if (existsSync(path1)) return path1;

  // Try dash-encoded path
  const dashPath = repoRoot.replace(/\//g, "-");
  const path2 = `${home}/.claude/projects/${dashPath}/${sessionId}.jsonl`;
  if (existsSync(path2)) return path2;

  // Try direct locations
  const directPaths = [
    `${home}/.claude/projects/${sessionId}.jsonl`,
    `${home}/.claude/sessions/${sessionId}.jsonl`,
  ];
  for (const p of directPaths) {
    if (existsSync(p)) return p;
  }

  // Last resort: search (expensive, avoid if possible)
  // Only if really needed - prefer explicit paths
  return null;
}
```

**Estimated lines:** ~120
**Dependencies:** `node:fs`, `node:path`
**Risk:** Medium (path discovery complexity)

---

### Module 6: Status Command (`status.ts`)

**Purpose:** Display build progress and statistics

**Replaces:** `scripts/status.sh` (446 lines)

**Main function:**
```typescript
function runStatus(subtasksPath: string): void
```

**What it displays:**
1. Config status (found/not found)
2. Milestone name (from taskRef)
3. Progress bar with counts
4. Last completed subtask + timestamp
5. Next pending subtask
6. Iteration stats (success rate, avg tools)

**Implementation:**
- Load subtasks.json via `loadSubtasksFile()`
- Load iteration diary (logs/iterations.jsonl)
- Use display utilities for formatting
- All synchronous, simple data transforms

**Estimated lines:** ~120
**Dependencies:** `./config`, `./display`, `./types`
**Risk:** Low (read-only)

---

### Module 7: Calibrate Command (`calibrate.ts`)

**Purpose:** Run drift and self-improvement checks

**Replaces:** `scripts/calibrate.sh` (402 lines)

**Functions:**
```typescript
function runCalibrate(subcommand: string, options: CalibrateOptions): void
function runIntentionCheck(config: RalphConfig): void
function runTechnicalCheck(config: RalphConfig): void
function runImproveCheck(config: RalphConfig): void
```

**Implementation notes:**
- Reuse `invokeClaudeHeadless()` pattern from index.ts
- Build prompts with context file references
- Check for completed subtasks before running

**Estimated lines:** ~180
**Dependencies:** `./config`, Claude invocation from index.ts
**Risk:** Low (similar to existing plan commands)

---

### Module 8: Build Loop (`build.ts`)

**Purpose:** Main subtask iteration loop

**Replaces:** `scripts/build.sh` (502 lines)

**Core logic:**
```typescript
interface BuildOptions {
  subtasksPath: string;
  maxIterations: number;
  mode: "supervised" | "headless";
  interactive: boolean;
  validateFirst: boolean;
}

async function runBuild(options: BuildOptions): Promise<void> {
  const config = loadRalphConfig();
  const attempts = new Map<string, number>();

  if (options.validateFirst) {
    await runPreBuildValidation(options.subtasksPath);
  }

  let iteration = 1;
  while (true) {
    const subtasks = loadSubtasksFile(options.subtasksPath);
    const remaining = countRemaining(subtasks);

    if (remaining === 0) {
      console.log("All subtasks complete!");
      return;
    }

    const current = getNextSubtask(subtasks);
    if (!current) throw new Error("No next subtask found");

    // Track attempts
    const attempt = (attempts.get(current.id) ?? 0) + 1;
    attempts.set(current.id, attempt);

    // Check max iterations
    if (attempt > options.maxIterations) {
      await executeHook(
        "onMaxIterationsExceeded",
        `Subtask '${current.id}' failed after ${options.maxIterations} attempts`,
        config
      );
      throw new Error(`Max iterations exceeded for ${current.id}`);
    }

    console.log(`=== Iteration ${iteration} (${current.id}, attempt ${attempt}/${options.maxIterations}) ===`);

    // Build prompt
    const prompt = buildIterationPrompt(options.subtasksPath, current);

    // Invoke Claude
    let sessionId: string | undefined;
    if (options.mode === "headless") {
      const result = invokeClaudeHeadless(prompt);
      sessionId = result.sessionId;
      logHeadlessStats(result);
    } else {
      invokeClaudeChat(prompt);
      // Session ID not captured in supervised mode
    }

    // Check completion
    const newSubtasks = loadSubtasksFile(options.subtasksPath);
    const newRemaining = countRemaining(newSubtasks);

    if (newRemaining < remaining) {
      console.log(`Subtask ${current.id} completed`);
      if (sessionId) {
        await runPostIterationHook(current, "completed", sessionId, iteration, config);
      }
    }

    // Interactive pause
    if (options.interactive) {
      const shouldContinue = await promptContinue();
      if (!shouldContinue) {
        console.log("Stopped by user");
        return;
      }
    }

    iteration++;
  }
}
```

**Key concerns:**
1. **Process spawning:** Use existing `invokeClaudeChat`/`invokeClaudeHeadless` from index.ts
2. **State management:** Simple `Map<string, number>` for retry tracking
3. **File reloading:** Reload subtasks.json after each iteration to check completion
4. **Error handling:** Catch and report, trigger hooks on failure

**Estimated lines:** ~250
**Dependencies:** `./config`, `./hooks`, `./post-iteration`, Claude invocation
**Risk:** Medium (core loop, needs careful testing)

---

### Module 9: Post-Iteration Hook (`post-iteration.ts`)

**Purpose:** Generate summaries, write diary, send notifications

**Replaces:** `scripts/post-iteration-hook.sh` (915 lines → largest reduction)

**Session ID handling for supervised mode:**
- Supervised mode does NOT capture session ID (Claude outputs to terminal, not captured)
- Options:
  1. **Skip diary for supervised mode** (current bash behavior) ✅ Chosen
  2. Attempt to discover most recent session from `~/.claude/projects/`
  3. Accept that supervised diary entries have no session metrics

**Decision:** Skip post-iteration hook for supervised mode. User watches session directly, doesn't need diary. Hook only runs in headless mode where session ID is captured.

**Functions:**
```typescript
// Only called when sessionId is available (headless mode)
async function runPostIterationHook(
  subtask: Subtask,
  status: IterationStatus,
  sessionId: string,
  iterationNum: number,
  config: RalphConfig
): Promise<void>

function generateSummary(sessionId: string, subtask: Subtask, config: RalphConfig): string | null
function writeDiaryEntry(entry: IterationDiaryEntry, config: RalphConfig): void
function getFilesChanged(repoRoot: string, sessionPath: string | null): string[]
```

**Implementation notes:**
- Use `getSessionJsonlPath()` from session.ts
- Use `spawnSync` for Haiku summary generation (same pattern as headless)
- Write JSONL to logs/iterations.jsonl
- Execute configured actions via hooks.ts

**Files changed detection:**
```typescript
function getFilesChanged(repoRoot: string, sessionPath: string | null): string[] {
  const files = new Set<string>();

  // Try git diff first
  const gitResult = spawnSync("git", ["diff", "--name-only"], {
    cwd: repoRoot,
    encoding: "utf8",
  });
  if (gitResult.status === 0) {
    gitResult.stdout.trim().split("\n").filter(Boolean).forEach(f => files.add(f));
  }

  // Also check staged
  const stagedResult = spawnSync("git", ["diff", "--cached", "--name-only"], {
    cwd: repoRoot,
    encoding: "utf8",
  });
  if (stagedResult.status === 0) {
    stagedResult.stdout.trim().split("\n").filter(Boolean).forEach(f => files.add(f));
  }

  // Fallback: extract from session log
  if (files.size === 0 && sessionPath) {
    const sessionFiles = getFilesFromSession(sessionPath);
    sessionFiles.forEach(f => files.add(f));
  }

  return Array.from(files).slice(0, 50);  // Limit to 50 files
}
```

**Estimated lines:** ~200
**Dependencies:** `./session`, `./hooks`, `./config`, `./types`
**Risk:** Medium (external integrations)

---

## Integration with index.ts

### Changes to index.ts

1. **Remove bash script delegation:**
```typescript
// BEFORE
execSync(`bash "${scriptPath}" ...`, { stdio: "inherit" });

// AFTER
import { runStatus } from "./status";
runStatus(subtasksPath);
```

2. **Move Claude invocation helpers to shared location:**
   - Keep `invokeClaudeChat`, `invokeClaudeHeadless` in index.ts OR move to `claude.ts`
   - These are working and battle-tested - don't change the implementation

3. **Update command handlers:**
```typescript
// status command
.action((subtasksPath) => {
  runStatus(subtasksPath);
});

// calibrate command
.action((subcommand, options) => {
  runCalibrate(subcommand, options);
});

// build command
.action(async (options) => {
  await runBuild({
    subtasksPath: options.subtasks,
    maxIterations: parseInt(options.maxIterations),
    mode: options.headless ? "headless" : "supervised",
    interactive: options.interactive,
    validateFirst: options.validateFirst,
  });
});
```

---

## Testing Strategy

### Unit Tests (new)
- `config.ts` - loading, defaults, queries
- `display.ts` - formatting functions
- `session.ts` - path discovery (mock filesystem)

### Integration Tests (existing + new)
- `ralph.test.ts` already has extensive tests
- After migration: tests should pass unchanged (same CLI interface)
- Add tests for edge cases:
  - Missing config file
  - Empty subtasks
  - Non-existent session files
  - Non-TTY pause handling

### Manual Testing Checklist
- [ ] `aaa ralph status` - displays correctly
- [ ] `aaa ralph status` with no subtasks.json - graceful error
- [ ] `aaa ralph build --supervised` - interactive mode works
- [ ] `aaa ralph build --headless` - JSON output captured
- [ ] `aaa ralph build` with max iterations exceeded - hook triggered
- [ ] `aaa ralph calibrate intention` - runs analysis
- [ ] Post-iteration diary entry written
- [ ] ntfy notification sent (if configured)

---

## File Structure After Migration

```
tools/src/commands/ralph/
├── index.ts           # CLI commands (simplified, delegates to modules)
├── claude.ts          # Claude invocation helpers (extracted from index.ts)
├── types.ts           # All type definitions
├── config.ts          # Config + subtasks loading
├── session.ts         # Session file utilities
├── display.ts         # Terminal output utilities
├── hooks.ts           # Hook execution (log, notify, pause)
├── status.ts          # Status command
├── calibrate.ts       # Calibrate command
├── build.ts           # Build loop
├── post-iteration.ts  # Post-iteration hook
└── scripts/           # DELETE after migration complete
```

---

## Rollback Plan

If issues arise during migration:

1. **Per-module rollback:** Each module can be reverted independently
2. **Keep bash scripts until verified:** Don't delete until all tests pass
3. **Git history:** All changes on feature branch, easy to revert

---

## Execution Order

### Phase 1: Foundation (Day 1 morning)
1. Create `claude.ts` - Extract from index.ts (MANDATORY FIRST)
2. Create `types.ts` + `config.ts` (combined task)
3. Create `session.ts` - Path discovery (before hooks, catches issues early)
4. Create `display.ts`
5. Create `hooks.ts`
6. **Verify:** Existing tests still pass

### Phase 2: Status (Day 1 afternoon)
1. Create `status.ts`
2. Update `index.ts` to use TypeScript
3. Test: `aaa ralph status`
4. **Verify:** Existing tests still pass
5. Keep `scripts/status.sh` until Phase 5

### Phase 3: Calibrate (Day 2 morning)
1. Create `calibrate.ts`
2. Update `index.ts`
3. Test all calibrate subcommands
4. **Verify:** Existing tests still pass
5. Keep `scripts/calibrate.sh` until Phase 5

### Phase 4: Build + Post-Iteration (Day 2 afternoon - Day 3)
1. Create `post-iteration.ts` (session analysis + diary)
2. Create `build.ts` (main loop)
3. Update `index.ts`
4. Extensive testing of build loop
5. **Verify:** Existing tests still pass
6. Keep bash scripts until Phase 5

### Phase 5: Cleanup (Day 3-4)
1. Run full test suite (all must pass)
2. Manual testing checklist
3. **Delete `scripts/` directory** (explicit task)
4. Update documentation

---

## Success Criteria

1. All existing `ralph.test.ts` tests pass
2. `aaa ralph status` output matches current behavior
3. `aaa ralph build --supervised` allows user interaction
4. `aaa ralph build --headless` captures JSON output
5. Post-iteration diary entries written correctly
6. Hooks (log, notify, pause) work as configured
7. No regressions in Claude invocation (no process spawning issues)

---

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Process spawning issues | Low | High | Keep existing spawnSync patterns unchanged |
| Session path discovery fails | Medium | Medium | Multiple fallback locations, graceful degradation |
| Interactive pause breaks | Low | Medium | TTY check, skip in non-interactive mode |
| Diary format incompatible | Low | Low | Same JSON structure as bash version |
| Performance regression | Low | Low | All operations already synchronous |

---

## Notes for Ralph Task Generation

When breaking this into tasks for Ralph:

**Recommended task structure:**
1. **Task 1:** Extract `claude.ts` from index.ts (foundation, blocks everything)
2. **Task 2:** Create `types.ts` + `config.ts` (combined, tightly coupled)
3. **Task 3:** Create `session.ts` (path discovery, validate early)
4. **Task 4:** Create `display.ts` (simple, no deps)
5. **Task 5:** Create `hooks.ts` (depends on config)
6. **Task 6:** Create `status.ts` + integrate (first command migration)
7. **Task 7:** Create `calibrate.ts` + integrate (second command)
8. **Task 8:** Create `post-iteration.ts` (session analysis)
9. **Task 9:** Create `build.ts` + integrate (most complex, depends on all)
10. **Task 10:** Delete bash scripts + documentation update

**Dependency flow:**
```
claude.ts ─┬─> types.ts + config.ts ─┬─> session.ts ─┬─> display.ts
           │                          │               │
           │                          └─> hooks.ts ───┤
           │                                          │
           └──────────────────────────────────────────┴─> status.ts
                                                          calibrate.ts
                                                          post-iteration.ts
                                                          build.ts
```

**Each task should include:**
- Implementation
- Unit tests (where applicable)
- Integration verification (existing tests pass)
- Keep bash scripts until Task 10
