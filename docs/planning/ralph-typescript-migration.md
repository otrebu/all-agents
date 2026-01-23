# Ralph TypeScript Migration Plan

## Executive Summary

Migrate all Ralph bash scripts to TypeScript to eliminate:
- 129 occurrences of duplicated JSON parsing (jq/node fallback)
- Duplicated color definitions across 4 scripts
- Mixed Claude invocation patterns
- Untestable bash logic

**Total Effort:** 3-4 days
**Risk:** Low (incremental, rollback-friendly)
**Code Reduction:** ~2262 lines bash → ~800 lines TypeScript

---

## Current State Inventory

### TypeScript Layer (793 lines)
**File:** `tools/src/commands/ralph/index.ts`

Already implements:
- CLI parsing (Commander.js)
- `invokeClaudeChat()` - supervised mode
- `invokeClaudeHeadless()` - JSON output + logging
- `invokeClaude()` - interactive planning
- `HeadlessResult`, `ClaudeOutput` interfaces
- Path resolution via `getContextRoot()`

### Bash Scripts (2262 lines total)

| Script | Lines | Purpose | Complexity |
|--------|-------|---------|------------|
| `build.sh` | 502 | Build loop, retries, hooks | High |
| `status.sh` | 446 | Progress display, diary stats | Medium |
| `calibrate.sh` | 402 | Drift checks, Claude invocation | Medium |
| `post-iteration-hook.sh` | 915 | Summary generation, diary, notifications | High |

---

## Shared Infrastructure to Create First

### 1. Types (`tools/src/commands/ralph/types.ts`)

```typescript
// ~80 lines

// Subtasks file schema
export interface Subtask {
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

export interface SubtasksFile {
  subtasks: Subtask[];
}

// Ralph config schema
export interface RalphConfig {
  driftTasks?: "auto" | "always" | "force";
  selfImprovement?: {
    mode: "always" | "auto" | "never";
  };
  hooks?: {
    onMaxIterationsExceeded?: HookConfig;
    postIteration?: PostIterationHookConfig;
  };
  ntfy?: {
    topic: string;
    server?: string;
  };
}

export interface HookConfig {
  actions: ("log" | "notify" | "pause")[];
}

export interface PostIterationHookConfig extends HookConfig {
  enabled?: boolean;
  model?: string;
  diaryPath?: string;
  pauseOnFailure?: boolean;
  pauseOnSuccess?: boolean;
  pauseAlways?: boolean;
}

// Iteration diary entry
export interface IterationDiaryEntry {
  subtaskId: string;
  sessionId: string;
  status: "completed" | "failed" | "retrying";
  summary: string;
  timestamp: string;
  milestone?: string;
  taskRef?: string;
  iterationNum: number;
  keyFindings: string[];
  errors: string[];
  toolCalls: number;
  filesChanged: string[];
  duration: number; // milliseconds
}

// Build state
export interface BuildState {
  subtasksPath: string;
  maxIterations: number;
  mode: "supervised" | "headless";
  interactive: boolean;
  validateFirst: boolean;
  attempts: Map<string, number>;
}

// Claude output (already exists, move here)
export interface ClaudeOutput {
  result?: string;
  session_id?: string;
  duration_ms?: number;
  total_cost_usd?: number;
  num_turns?: number;
}
```

### 2. Config Loader (`tools/src/commands/ralph/config.ts`)

```typescript
// ~60 lines

import { existsSync, readFileSync } from "node:fs";
import { getContextRoot } from "@tools/utils/paths";
import type { RalphConfig, SubtasksFile } from "./types";

const DEFAULT_CONFIG: RalphConfig = {
  driftTasks: "auto",
  selfImprovement: { mode: "always" },
  hooks: {
    postIteration: {
      enabled: true,
      model: "haiku",
      actions: ["log"],
    },
  },
};

export function loadRalphConfig(): RalphConfig {
  const configPath = `${getContextRoot()}/ralph.config.json`;
  if (!existsSync(configPath)) {
    return DEFAULT_CONFIG;
  }
  try {
    const raw = JSON.parse(readFileSync(configPath, "utf8"));
    return { ...DEFAULT_CONFIG, ...raw };
  } catch {
    return DEFAULT_CONFIG;
  }
}

export function loadSubtasksFile(path: string): SubtasksFile {
  if (!existsSync(path)) {
    throw new Error(`Subtasks file not found: ${path}`);
  }
  const raw = JSON.parse(readFileSync(path, "utf8"));
  return raw as SubtasksFile;
}

export function getCompletedSubtasks(subtasks: SubtasksFile): Subtask[] {
  return subtasks.subtasks.filter(s => s.done === true);
}

export function getPendingSubtasks(subtasks: SubtasksFile): Subtask[] {
  return subtasks.subtasks.filter(s => !s.done);
}

export function getNextSubtask(subtasks: SubtasksFile): Subtask | undefined {
  return subtasks.subtasks.find(s => !s.done);
}
```

### 3. Hooks (`tools/src/commands/ralph/hooks.ts`)

```typescript
// ~80 lines

import type { RalphConfig, IterationDiaryEntry } from "./types";

export async function executeHook(
  hookName: string,
  context: string,
  config: RalphConfig,
): Promise<void> {
  const actions = config.hooks?.[hookName]?.actions ?? ["log"];

  for (const action of actions) {
    switch (action) {
      case "log":
        console.log(`[Hook:${hookName}] ${context}`);
        break;
      case "notify":
        await sendNtfyNotification(hookName, context, config);
        break;
      case "pause":
        await pauseForUser(hookName, context);
        break;
    }
  }
}

async function sendNtfyNotification(
  hookName: string,
  context: string,
  config: RalphConfig,
): Promise<void> {
  const topic = config.ntfy?.topic;
  if (!topic) {
    console.log(`[Hook:${hookName}] notify: ntfy topic not configured`);
    return;
  }

  const server = config.ntfy?.server ?? "https://ntfy.sh";
  const url = `${server}/${topic}`;

  try {
    await fetch(url, {
      method: "POST",
      headers: { "Title": `Ralph: ${hookName}` },
      body: context,
    });
    console.log(`[Hook:${hookName}] Notification sent`);
  } catch (error) {
    console.error(`[Hook:${hookName}] Notification failed:`, error);
  }
}

async function pauseForUser(hookName: string, context: string): Promise<void> {
  console.log(`\n[Hook:${hookName}] ${context}`);
  console.log("Press Enter to continue or Ctrl+C to abort...");

  // Use readline for interactive prompt
  const readline = await import("node:readline");
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  await new Promise<void>(resolve => {
    rl.question("", () => {
      rl.close();
      resolve();
    });
  });
}
```

### 4. Display Utilities (`tools/src/commands/ralph/display.ts`)

```typescript
// ~100 lines

import chalk from "chalk";

// Progress bar rendering
export function renderProgressBar(done: number, total: number, width = 20): string {
  const pct = total > 0 ? Math.floor((done * 100) / total) : 0;
  const filled = Math.floor(pct / (100 / width));
  const empty = width - filled;
  const bar = chalk.green("█".repeat(filled)) + "░".repeat(empty);
  return `[${bar}] ${done}/${total} (${pct}%)`;
}

// Status box
export function renderStatusBox(title: string, lines: string[]): void {
  console.log();
  console.log(chalk.bold("╔" + "═".repeat(62) + "╗"));
  console.log(chalk.bold(`║${title.padStart(31 + title.length / 2).padEnd(62)}║`));
  console.log(chalk.bold("╚" + "═".repeat(62) + "╝"));
  console.log();
  for (const line of lines) {
    console.log(line);
  }
}

// Duration formatting
export function formatDuration(ms: number): string {
  if (ms > 60000) {
    return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
  } else if (ms > 1000) {
    return `${Math.floor(ms / 1000)}s`;
  }
  return `${ms}ms`;
}

// Timestamp formatting
export function formatTimestamp(iso: string): string {
  try {
    const date = new Date(iso);
    return date.toISOString().slice(0, 16).replace("T", " ");
  } catch {
    return iso;
  }
}

// Color-coded status
export function colorStatus(status: string): string {
  switch (status) {
    case "completed":
    case "success":
      return chalk.green(status);
    case "failed":
    case "failure":
      return chalk.red(status);
    case "retrying":
    case "partial":
      return chalk.yellow(status);
    default:
      return status;
  }
}
```

---

## Migration Plan by Script

### Phase 1: status.sh → TypeScript (2-3 hours)

**Current:** 446 lines bash
**Target:** ~120 lines TypeScript
**Risk:** Low (read-only, no Claude invocation)

**What it does:**
1. Load subtasks.json
2. Count done/total
3. Get milestone from taskRef path
4. Get last completed subtask
5. Get next pending subtask
6. Load iteration diary stats (success rate, avg tools)
7. Render colored output with progress bar

**Migration steps:**
1. Create `tools/src/commands/ralph/status.ts`
2. Import shared types, config, display utilities
3. Implement `getSubtaskStats()`, `getDiaryStats()`, `getMilestone()`
4. Use chalk for colors (already a dependency)
5. Update `index.ts` to call TypeScript directly instead of `execSync(bash)`
6. Delete `scripts/status.sh`

**TypeScript implementation sketch:**

```typescript
// tools/src/commands/ralph/status.ts (~120 lines)

import { existsSync, readFileSync } from "node:fs";
import chalk from "chalk";
import { getContextRoot } from "@tools/utils/paths";
import { loadSubtasksFile, loadRalphConfig } from "./config";
import { renderProgressBar, formatTimestamp, colorStatus } from "./display";
import type { SubtasksFile, IterationDiaryEntry } from "./types";

export function runStatus(subtasksPath: string): void {
  const contextRoot = getContextRoot();
  const config = loadRalphConfig();

  console.log();
  console.log(chalk.bold("╔══════════════════════════════════════════════════════════════╗"));
  console.log(chalk.bold("║                      Ralph Build Status                      ║"));
  console.log(chalk.bold("╚══════════════════════════════════════════════════════════════╝"));
  console.log();

  // Config status
  console.log(chalk.bold("Configuration"));
  console.log("─────────────");
  const configPath = `${contextRoot}/ralph.config.json`;
  if (existsSync(configPath)) {
    console.log(`  Config: ${chalk.green("Found")} (ralph.config.json)`);
  } else {
    console.log(`  Config: ${chalk.dim("Not found")}`);
  }
  console.log();

  // Subtasks status
  console.log(chalk.bold("Subtasks Queue"));
  console.log("──────────────");

  if (!existsSync(subtasksPath)) {
    console.log(chalk.dim(`  No subtasks file found at: ${subtasksPath}`));
    return;
  }

  const subtasks = loadSubtasksFile(subtasksPath);
  const total = subtasks.subtasks.length;
  const done = subtasks.subtasks.filter(s => s.done).length;
  const remaining = total - done;

  // Milestone
  const milestone = getMilestone(subtasks);
  if (milestone) {
    console.log(`  Milestone: ${chalk.cyan(milestone)}`);
  }

  // Progress
  if (total === 0) {
    console.log(chalk.dim("  No subtasks defined (empty queue)"));
  } else {
    console.log(`  Progress: ${renderProgressBar(done, total)}`);

    // Last completed
    const lastCompleted = getLastCompleted(subtasks);
    if (lastCompleted) {
      console.log(`  Last done: ${chalk.green(lastCompleted.id)} (${chalk.dim(formatTimestamp(lastCompleted.completedAt!))})`);
    }

    // Next up
    const next = subtasks.subtasks.find(s => !s.done);
    if (next) {
      console.log(`  Next up:   ${chalk.yellow(next.id)}`);
      if (next.title) {
        const title = next.title.length > 50 ? next.title.slice(0, 47) + "..." : next.title;
        console.log(`             ${chalk.dim(title)}`);
      }
    } else if (done === total) {
      console.log(`  Next up:   ${chalk.green("All complete!")}`);
    }
  }
  console.log();

  // Iteration stats
  console.log(chalk.bold("Iteration Stats"));
  console.log("───────────────");
  const diaryPath = `${contextRoot}/logs/iterations.jsonl`;
  if (!existsSync(diaryPath)) {
    console.log(chalk.dim("  No iteration diary found"));
  } else {
    const stats = getDiaryStats(diaryPath);
    console.log(`  Iterations: ${chalk.blue(stats.total)}`);
    if (stats.successRate !== null) {
      const rateColor = stats.successRate >= 80 ? chalk.green : stats.successRate >= 50 ? chalk.yellow : chalk.red;
      console.log(`  Success rate: ${rateColor(stats.successRate + "%")}`);
    }
    if (stats.avgToolCalls !== null) {
      console.log(`  Avg tool calls: ${chalk.blue(stats.avgToolCalls.toFixed(1))}`);
    }
  }
  console.log();
}

function getMilestone(subtasks: SubtasksFile): string | null {
  const first = subtasks.subtasks[0];
  if (!first) return null;

  // Try taskRef path: docs/planning/milestones/ralph/tasks/001.md
  if (first.taskRef) {
    const parts = first.taskRef.split("/");
    const msIdx = parts.indexOf("milestones");
    if (msIdx >= 0 && parts.length > msIdx + 1) {
      return parts[msIdx + 1];
    }
  }

  return first.milestone ?? null;
}

function getLastCompleted(subtasks: SubtasksFile): Subtask | null {
  const completed = subtasks.subtasks
    .filter(s => s.done && s.completedAt)
    .sort((a, b) => new Date(a.completedAt!).getTime() - new Date(b.completedAt!).getTime());
  return completed[completed.length - 1] ?? null;
}

function getDiaryStats(diaryPath: string): { total: number; successRate: number | null; avgToolCalls: number | null } {
  const lines = readFileSync(diaryPath, "utf8").trim().split("\n").filter(Boolean);
  if (lines.length === 0) {
    return { total: 0, successRate: null, avgToolCalls: null };
  }

  let successCount = 0;
  let totalTools = 0;

  for (const line of lines) {
    try {
      const entry: IterationDiaryEntry = JSON.parse(line);
      if (entry.status === "completed") successCount++;
      if (typeof entry.toolCalls === "number") totalTools += entry.toolCalls;
    } catch {}
  }

  return {
    total: lines.length,
    successRate: Math.round((successCount * 100) / lines.length),
    avgToolCalls: totalTools / lines.length,
  };
}
```

---

### Phase 2: calibrate.sh → TypeScript (3-4 hours)

**Current:** 402 lines bash
**Target:** ~150 lines TypeScript
**Risk:** Low (similar to existing plan commands)

**What it does:**
1. Parse subcommand (intention/technical/improve/all)
2. Load config for approval mode
3. Get completed subtasks with commitHash/sessionId
4. Build prompt with context files
5. Invoke Claude with `-p` flag
6. Display output

**Migration steps:**
1. Create `tools/src/commands/ralph/calibrate.ts`
2. Reuse `invokeClaudeHeadless()` pattern from index.ts
3. Implement three check functions: `runIntentionCheck()`, `runTechnicalCheck()`, `runImproveCheck()`
4. Update `index.ts` calibrate command to call TypeScript
5. Delete `scripts/calibrate.sh`

---

### Phase 3: build.sh → TypeScript (6-8 hours)

**Current:** 502 lines bash
**Target:** ~250 lines TypeScript
**Risk:** Medium (core functionality, needs careful testing)

**What it does:**
1. Load subtasks.json
2. Main loop: while remaining > 0
3. Get next incomplete subtask
4. Track retry attempts per subtask (Map)
5. Check max iterations exceeded → trigger hook
6. Build prompt with context files
7. Invoke Claude (supervised or headless)
8. Parse output, log stats
9. Check if subtask completed
10. Call post-iteration hook
11. Interactive pause if requested

**Key logic to preserve:**
- Retry tracking with Map<subtaskId, attempts>
- Max iterations enforcement
- Hook triggering on failure
- Supervised vs headless mode
- Interactive pause between iterations

**Migration steps:**
1. Create `tools/src/commands/ralph/build.ts`
2. Move loop logic from bash to TypeScript
3. Use existing `invokeClaudeChat()` / `invokeClaudeHeadless()`
4. Implement `BuildState` management
5. Call `postIterationHook()` (Phase 4) after each iteration
6. Update `index.ts` build command
7. Delete `scripts/build.sh`

---

### Phase 4: post-iteration-hook.sh → TypeScript (4-5 hours)

**Current:** 915 lines bash (largest script)
**Target:** ~200 lines TypeScript
**Risk:** Medium (external integrations: ntfy, session files)

**What it does:**
1. Normalize status (completed/failed/retrying)
2. Find session JSONL path (multiple locations)
3. Count tool calls from session log
4. Get files changed (git diff + session log)
5. Calculate duration from timestamps
6. Generate summary using Haiku model
7. Write diary entry to iterations.jsonl
8. Execute actions: log, notify, pause

**Migration steps:**
1. Create `tools/src/commands/ralph/post-iteration.ts`
2. Implement `getSessionJsonlPath()` with fallback locations
3. Implement `countToolCalls()`, `getFilesChanged()`, `calculateDuration()`
4. Implement `generateSummary()` using Claude Haiku
5. Implement `writeDiaryEntry()`
6. Use hooks.ts for action execution
7. Export as function callable from build.ts
8. Delete `scripts/post-iteration-hook.sh`

---

## Final File Structure

```
tools/src/commands/ralph/
├── index.ts              # CLI commands (Commander.js) - existing, simplified
├── types.ts              # NEW: All type definitions
├── config.ts             # NEW: Config + subtasks loading
├── hooks.ts              # NEW: Hook execution (log, notify, pause)
├── display.ts            # NEW: Colored output, progress bars
├── status.ts             # NEW: Status command implementation
├── calibrate.ts          # NEW: Calibrate command implementation
├── build.ts              # NEW: Build loop implementation
├── post-iteration.ts     # NEW: Post-iteration hook implementation
└── scripts/              # DELETE entire directory after migration
    ├── build.sh          # DELETE
    ├── status.sh         # DELETE
    ├── calibrate.sh      # DELETE
    └── post-iteration-hook.sh  # DELETE
```

---

## Migration Checklist

### Phase 1: Shared Infrastructure
- [ ] Create `types.ts` with all interfaces
- [ ] Create `config.ts` with loaders
- [ ] Create `hooks.ts` with hook execution
- [ ] Create `display.ts` with UI utilities

### Phase 2: status.sh
- [ ] Create `status.ts`
- [ ] Update `index.ts` to use TypeScript
- [ ] Test: `aaa ralph status`
- [ ] Delete `scripts/status.sh`

### Phase 3: calibrate.sh
- [ ] Create `calibrate.ts`
- [ ] Update `index.ts`
- [ ] Test: `aaa ralph calibrate intention`
- [ ] Test: `aaa ralph calibrate all`
- [ ] Delete `scripts/calibrate.sh`

### Phase 4: build.sh
- [ ] Create `build.ts`
- [ ] Update `index.ts`
- [ ] Test: `aaa ralph build --supervised`
- [ ] Test: `aaa ralph build --headless`
- [ ] Test: retry logic with failing subtask
- [ ] Delete `scripts/build.sh`

### Phase 5: post-iteration-hook.sh
- [ ] Create `post-iteration.ts`
- [ ] Integrate with `build.ts`
- [ ] Test: diary entry creation
- [ ] Test: ntfy notification
- [ ] Test: pause action
- [ ] Delete `scripts/post-iteration-hook.sh`

### Phase 6: Cleanup
- [ ] Delete `scripts/` directory
- [ ] Update CLAUDE.md if needed
- [ ] Run full test suite
- [ ] Commit: `refactor(ralph): migrate bash scripts to TypeScript`

---

## Risk Mitigation

1. **Incremental migration** - Each script migrated independently, can rollback individually
2. **Keep bash scripts until TypeScript verified** - Don't delete until tests pass
3. **Feature parity testing** - Compare output before/after for each command
4. **Session file discovery** - Test on multiple machines (different Claude project paths)

---

## Dependencies

Already in project:
- `chalk` - colors
- `commander` - CLI
- `node:fs`, `node:path` - file operations
- `node:readline` - interactive prompts

No new dependencies required.

---

## Timeline

| Day | Phase | Deliverable |
|-----|-------|-------------|
| 1 | Shared infra + status | types.ts, config.ts, hooks.ts, display.ts, status.ts |
| 2 | calibrate + build start | calibrate.ts, build.ts (partial) |
| 3 | build complete + post-iteration | build.ts, post-iteration.ts |
| 4 | Testing + cleanup | Full test pass, delete bash scripts |

**Total: 3-4 days** (can be spread across 1-2 weeks)
