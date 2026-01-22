# Ralph Drift Analysis: Implementation Beyond Spec

**Source:** Features in code NOT documented in VISION.md or ROADMAP.md
**Date:** 2026-01-21

---

## Executive Summary

| Category | Additions | Deviations | Enhancements |
|----------|-----------|------------|--------------|
| Commands | 2 | 0 | 0 |
| CLI Flags | 4 | 1 | 0 |
| Config | 3 | 0 | 2 |
| Prompts | 8 | 0 | 0 |
| Features | 12 | 3 | 5 |
| **TOTAL** | **29** | **4** | **7** |

---

## UNDOCUMENTED COMMANDS

### 1. `ralph review` Command Tree (ENTIRE)

**Not in VISION.md Section 8.2.**

**Implemented commands:**
```bash
ralph review stories <milestone>    # Review stories quality
ralph review roadmap               # Review roadmap quality
ralph review gap roadmap           # Gap analysis of roadmap
ralph review gap stories <milestone>  # Gap analysis of stories
ralph review tasks <story-id>      # (stub - coming soon)
```

**Location:** `index.ts:505-615`

**Associated prompts (also undocumented):**
- `context/workflows/ralph/review/stories-review-auto.md`
- `context/workflows/ralph/review/roadmap-review-auto.md`
- `context/workflows/ralph/review/roadmap-gap-auto.md`
- `context/workflows/ralph/review/stories-gap-auto.md`
- `context/workflows/ralph/review/chunked-presentation.md`

**Assessment:** Valuable addition - enables artifact validation loops. Should be added to VISION.md.

---

### 2. `ralph milestones` Command

**Not mentioned anywhere in VISION.md or ROADMAP.md.**

**Implementation (`index.ts:639-659`):**
```bash
ralph milestones           # List available milestones
ralph milestones --json    # JSON output
```

**What it does:**
- Parses `docs/planning/roadmap.md` for milestone headers
- Uses `discoverMilestones()` from `tools/lib/milestones.ts`
- Supports JSON output for scripting

**Assessment:** Utility feature - improves discoverability. Document in VISION.md Section 8.2.

---

## UNDOCUMENTED CLI FLAGS

### 3. `-s/--supervised` Flag on Plan Commands

**VISION.md only shows:**
```bash
ralph plan stories --auto
```

**Implementation adds:**
```bash
ralph plan stories --supervised    # Watch chat, can intervene
ralph plan stories --headless      # JSON output + file logging
```

**Location:** `index.ts:325-373` (stories), similar for tasks/subtasks

**Assessment:** Enables three-mode execution for planning. Aligns with VISION's execution modes concept but not documented per-command.

---

### 4. `-H/--headless` Flag on Plan Commands

Same as above - enables headless execution for planning commands.

**Location:** Throughout plan subcommands in `index.ts`

---

### 5. `[subtasks-path]` Positional Arg on Status

**VISION.md status spec doesn't mention arguments.**

**Implementation (`index.ts:621`):**
```typescript
.argument("[subtasks-path]", "Path to subtasks.json", DEFAULT_SUBTASKS_PATH)
```

**Assessment:** Convenience feature - allows checking status of different queues.

---

### 6. `--json` Flag on Milestones

**Command itself is undocumented, plus has:**
```bash
ralph milestones --json
```

**Assessment:** Machine-readable output for scripting/automation.

---

## UNDOCUMENTED CONFIG OPTIONS

### 7. `selfImprovement.mode = "never"`

**Schema only allows:** `["always", "auto"]`

**Code supports (`calibrate.ts:221`):**
```typescript
if (selfImproveMode === "never") {
  console.log("Self-improvement analysis is disabled in ralph.config.json");
  return true;
}
```

**Assessment:** Useful escape hatch. Add to schema.

---

### 8. `ntfy` Config Block

**Not in VISION.md Section 5.**

**Implementation (`types.ts:107-112`, `hooks.ts:151-192`):**
```json
{
  "ntfy": {
    "server": "https://ntfy.sh",
    "topic": "ralph-build"
  }
}
```

**Features:**
- Custom server URL
- Per-project topic
- Graceful fallback if unconfigured (`topic === "your-ntfy-topic"`)

**Assessment:** Essential for notifications. Document in VISION.md Section 5.

---

### 9. `PostIterationHookConfig` Extended Fields

**Not in any schema or VISION.md.**

**Implementation (`types.ts:117-130`):**
```typescript
interface PostIterationHookConfig {
  pauseAlways?: boolean;
  pauseOnFailure?: boolean;
  pauseOnSuccess?: boolean;
  diaryPath?: string;
  model?: string;  // For summary generation
  enabled?: boolean;
}
```

**Assessment:** Fine-grained pause control. Document in VISION.md Section 8.11.

---

## UNDOCUMENTED PROMPTS

### 10. `tasks-milestone.md`

**Not in VISION.md Section 8.1 prompt list.**

**Location:** `context/workflows/ralph/planning/tasks-milestone.md`

**Usage (`index.ts:430`):**
- Special prompt for `ralph plan tasks --milestone <name>`
- Generates tasks for ALL stories in a milestone

**Assessment:** Key workflow prompt. Add to VISION.md Section 8.1.

---

### 11. `milestone-review.md`

**Location:** `context/workflows/ralph/planning/milestone-review.md`

**Assessment:** Review workflow. Document.

---

### 12. `story-gap-analysis.md`

**Location:** `context/workflows/ralph/planning/story-gap-analysis.md`

**Assessment:** Gap analysis workflow. Document.

---

### 13. `task-doc-lookup.md`

**Location:** `context/workflows/ralph/planning/task-doc-lookup.md`

**Assessment:** Documentation discovery. Document.

---

### 14-18. Review Prompt Suite

All in `context/workflows/ralph/review/`:
- `stories-review-auto.md`
- `roadmap-review-auto.md`
- `roadmap-gap-auto.md`
- `stories-gap-auto.md`
- `chunked-presentation.md`

**Assessment:** Entire review category not in VISION.md Section 8.1.

---

## UNDOCUMENTED FEATURES

### 19. Session Discovery Fallback Chain

**Not documented anywhere.**

**Implementation (`session.ts:207-255`):**
```typescript
// Four fallback search paths:
// 1. Base64-encoded repo path
// 2. Dash-encoded repo path
// 3. Direct project path
// 4. Sessions directory
```

**With DEBUG support:**
```typescript
if (process.env.DEBUG === "true" || process.env.DEBUG === "1") {
  console.log(`Tried paths: ${triedPaths.join(", ")}`);
}
```

**Assessment:** Robust session finding. Document for debugging.

---

### 20. Session Analysis Utilities

**Not in VISION.md.**

**Functions (`session.ts`):**
- `countToolCalls()` - Count tool_use entries
- `calculateDurationMs()` - Extract timestamps
- `getFilesFromSession()` - Extract Write/Edit paths

**Assessment:** Power iteration diary. Document as internal utilities.

---

### 21. Iteration Diary Extra Fields

**VISION.md schema doesn't include:**

**Implementation (`types.ts:67-94`):**
```typescript
interface IterationDiaryEntry {
  iterationNum?: number;     // Which attempt
  keyFindings?: Array<string>;  // Key findings
  taskRef?: string;          // Parent task
  milestone?: string;        // Milestone context
  // ... plus standard fields
}
```

**Assessment:** Richer tracking. Update schema.

---

### 22. Legacy Status Normalization

**Not documented.**

**Implementation (`types.ts:224-243`):**
```typescript
export function normalizeStatus(status: string): IterationStatus {
  if (status === "success") return "completed";
  if (status === "failure") return "failed";
  if (status === "partial") return "retrying";
  return status as IterationStatus;
}
```

**Assessment:** Backwards compatibility. Document migration path.

---

### 23. Haiku Summary Generation

**VISION.md mentions hooks/haiku but not details.**

**Implementation (`post-iteration.ts:94-174`):**
- Model: `claude-3-5-haiku-latest`
- 30-second timeout
- JSON extraction from code blocks
- Fallback to raw text (200 char truncate)

**Assessment:** Document model choice and timeout behavior.

---

### 24. Hook Pause Timeout

**Not in VISION.md.**

**Implementation (`hooks.ts:217`):**
- 5-minute timeout on interactive pause
- Prevents CI hangs
- TTY check for non-interactive environments

**Assessment:** Important safety feature. Document.

---

### 25. Display Utilities

**Entire module undocumented.**

**Functions (`display.ts`):**
- `checkGlowAvailable()` - Check for glow CLI
- `renderMarkdown()` - Render with glow or plain
- `getColoredStatus()` - Color-code status
- `renderProgressBar()` - 20-char progress bar
- `renderStatusBox()` - Box with borders
- `truncate()` - Text truncation
- `formatDuration()` - ms to "1h 2m 3s"
- `formatTimestamp()` - ISO to readable

**Assessment:** Internal utilities. Low priority to document.

---

### 26. Approval Mode System

**Not in VISION.md Section 5.**

**Implementation (`calibrate.ts:54-77`):**
```typescript
function getApprovalMode(config, cliFlags): "force" | "review" | "auto" {
  if (cliFlags.force) return "force";
  if (cliFlags.review) return "review";
  return config.selfImprovement?.mode || "auto";
}
```

**Assessment:** Documents how `--force`/`--review` interact with config.

---

### 27. Subtask Metadata

**Not in VISION.md subtask schema.**

**Implementation (`types.ts:190-197`):**
```typescript
interface SubtaskMetadata {
  milestoneRef?: string;  // Parent milestone
  scope?: "milestone" | "story";
  storyRef?: string;      // Parent story (when scope="story")
}
```

**Assessment:** Queue context. Add to subtasks.json schema.

---

### 28. Non-TTY Behavior

**Not documented.**

**Multiple locations:**
- `build.ts:97` - `promptContinue()` skips prompt
- `hooks.ts:209` - `executePauseAction()` continues

**Behavior:** Silently continues instead of prompting in non-TTY.

**Assessment:** Important for CI. Document.

---

### 29. Headless Invocation Logging

**Not in VISION.md.**

**Implementation (`index.ts:105-114`):**
```typescript
// Writes to logs/ralph-*.jsonl
const logEntry = {
  timestamp: new Date().toISOString(),
  cost: result.cost,
  duration: result.duration,
  extraContext,
  sessionId: result.sessionId,
};
```

**Assessment:** Second logging layer beyond iteration diary. Document.

---

## BEHAVIORAL DEVIATIONS

### 30. `--auto` Aliases to `--supervised`

**VISION implies distinct modes:**
- `--auto` = single-shot generation
- `--supervised` = chat with participation

**Implementation:**
```typescript
.option("-a, --auto", "Use auto mode (alias for --supervised)")
```

**Both trigger `invokeClaudeChat()`.**

**Assessment:** Functional but terminology confusing. Clarify in docs.

---

### 31. Prompt Path Suffix Logic

**Not documented.**

**Implementation (`index.ts:225-236`):**
```typescript
const suffix = isAutoMode ? "auto" : "interactive";
return `${sessionName}-${suffix}.md`;
```

**Assessment:** Convention for prompt naming. Document pattern.

---

### 32. Subtasks Path Resolution Fallback

**Not documented.**

**Implementation (`index.ts:625-631`):**
```typescript
// Falls back from CWD to context-root relative path
if (!existsSync(subtasksPath)) {
  const rootRelativePath = path.join(contextRoot, subtasksPath);
  if (existsSync(rootRelativePath)) {
    resolvedSubtasksPath = rootRelativePath;
  }
}
```

**Assessment:** Convenience feature. Document search order.

---

### 33. Stdio Separation in Headless

**Critical but undocumented.**

**Implementation (`claude.ts:211-212`):**
```typescript
// CRITICAL: separate stderr from stdout for JSON parsing
stdio: ["inherit", "pipe", "inherit"]
```

**Assessment:** Essential for JSON output. Document why this matters.

---

## RECOMMENDATIONS

### Add to VISION.md Section 8.2 (CLI)
1. `ralph review` command tree
2. `ralph milestones` command
3. `-s/--supervised` and `-H/--headless` on plan commands
4. Positional args on status

### Add to VISION.md Section 5 (Config)
5. `ntfy` config block
6. `selfImprovement.mode = "never"`
7. `PostIterationHookConfig` extended fields

### Add to VISION.md Section 8.1 (Prompts)
8. `tasks-milestone.md`
9. Entire `review/` prompt directory
10. Gap analysis prompts

### Add to VISION.md Section 8.11 (Hooks/Diary)
11. Haiku model and timeout
12. Pause timeout (5 min)
13. Non-TTY behavior
14. Diary extra fields

### Create New Documentation
15. Session discovery algorithm
16. Display utilities (internal)
17. Approval mode interaction
