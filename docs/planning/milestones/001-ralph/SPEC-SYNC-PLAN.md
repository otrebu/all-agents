# Ralph Spec Sync Plan

**Purpose:** Track bidirectional sync between VISION.md and implementation
**Date:** 2026-01-21
**Status:** In review

---

## 1. CLI ↔ CONFIG MAPPING TABLE

| CLI Flag | Config Option | Names Match? | CLI Status | Config Status | Notes |
|----------|---------------|--------------|------------|---------------|-------|
| `--validate-first` | `approvals.preBuildDriftCheck` | NO | Stub only | Not implemented | Should rename to match |
| `--force` | (overrides all approvals) | N/A | Calibrate only | No approvals config | Only works for selfImprovement currently |
| `--review` | (requires all approvals) | N/A | Calibrate only | No approvals config | Only works for selfImprovement currently |
| `--calibrate-every <n>` | `calibration.everyNIterations` | NO | Not implemented | Not implemented | Should rename to match |
| `--max-iterations` | - | N/A | Implemented | No config equivalent | CLI-only is fine |
| `--interactive` | - | N/A | Implemented | No config equivalent | CLI-only is fine |
| `--supervised` | - | N/A | Implemented | No config equivalent | CLI-only is fine |
| `--headless` | - | N/A | Implemented | No config equivalent | CLI-only is fine |
| (cascade gate) | `approvals.storiesToTasks` | - | Not implemented | Not implemented | Cascade mode only |
| (cascade gate) | `approvals.tasksToSubtasks` | - | Not implemented | Not implemented | Cascade mode only |
| (cascade gate) | `approvals.driftTasks` | - | Not implemented | Not implemented | Cascade mode only |
| (cascade gate) | `approvals.atomicDocChanges` | - | Not implemented | Not implemented | Cascade mode only |
| (cascade gate) | `approvals.llmJudgeSubjective` | - | Not implemented | Not implemented | Cascade mode only |
| - | `calibration.afterMilestone` | - | No CLI equiv | Not implemented | Config-only is fine |
| - | `selfImprovement.mode` | - | Via calibrate cmd | Implemented | Works |
| - | `hooks.*` | - | No CLI equiv | Implemented | Config-only is fine |
| - | `ntfy.*` | - | No CLI equiv | Implemented | Config-only is fine |

**Naming issue:** `--validate-first` vs `preBuildDriftCheck` and `--calibrate-every` vs `everyNIterations` - these should align.

---

## 2. UPDATE VISION.md NOW (Code → Spec)

### Move Schemas to Context

**Current location:** `docs/planning/schemas/`
**New location:** `context/workflows/schemas/`

Files to move:
- `iteration-diary.schema.json`
- `subtasks.schema.json`
- `ralph-config.schema.json`

Update VISION.md references accordingly.

---

### `selfImprovement.mode` Rename

**Current (confusing):** `always` / `auto` / `never`

**New (clearer):** `suggest` / `autofix` / `off`

| Mode | Behavior |
|------|----------|
| `suggest` | Create task files for review, user applies manually |
| `autofix` | Apply changes directly to files (CLAUDE.md, prompts, skills) |
| `off` | Skip analysis entirely |

**Update in:**
- `docs/planning/VISION.md`
- `docs/planning/schemas/ralph-config.schema.json`
- `tools/src/commands/ralph/types.ts`
- `tools/src/commands/ralph/calibrate.ts`

---

### Execution Modes (Three Modalities)

**Architecture:** Ralph has three execution modes with fundamentally different invocation patterns.

| Mode | Invocation | Where Claude Runs | User Position |
|------|------------|-------------------|---------------|
| **Interactive** | Skill (`/ralph-plan vision`) | Claude IS the session | User talks TO Claude |
| **Supervised** | CLI (`aaa ralph ... --supervised`) | CLI spawns Claude subprocess | User WATCHES Claude |
| **Headless** | CLI (`aaa ralph ... --headless`) | CLI spawns Claude subprocess | User doesn't watch |

**Interactive mode:**
- Triggered by Claude Code skill (e.g., `/ralph-plan`, `/ralph-build`)
- Claude reads workflow prompt files (`*-interactive.md`)
- Claude executes the workflow itself
- Full Socratic dialogue, multi-turn conversation
- User is IN the Claude Code session

**Supervised mode:**
- CLI tool (`aaa`) spawns Claude Code as subprocess
- Creates a NEW Claude Code chat session
- User watches terminal output, can type if needed
- Uses supervised prompts (`*-supervised.md`)
- **UX friction:** If already in Claude Code, user must exit or use separate terminal

**Headless mode:**
- CLI spawns Claude with JSON output capture
- No user interaction expected
- Post-iteration hooks run automatically
- Best for CI/automation, background execution

**Action:** Update VISION.md Section 3 with this architectural distinction. Currently muddled.

---

### Review vs Calibrate: Terminology Distinction

**Current naming:**
- `ralph review *` → pre-build (plans)
- `ralph calibrate` → post-build (drift + self-improve)

**Why this works:**

| Term | Phase | Mental Model |
|------|-------|--------------|
| **Review** | Pre-implementation | Gatekeeper - "should we build this?" |
| **Calibrate** | Post-implementation | Course-correction - "did we build what we intended?" |

**Rationale:**
- "Review" in dev culture = forward-looking examination before action (code review, design review, PR review)
- "Calibrate" = measurement against standard + adjustment. Implies ongoing correction, which is exactly what drift detection does
- The words themselves signal they're different activities at different phases

**Action:** Update VISION.md to make this distinction explicit in Section 3 (workflow concepts).

---

### Review as a Formal Loop

**Discovery:** Review commands exist in code (`ralph review stories`, `ralph review roadmap`, etc.) but aren't formalized in VISION as a concept.

**Insight:** Review is emerging as another loop alongside:
- **Planning loop:** vision → roadmap → stories → tasks → subtasks (auto-generate)
- **Review loop:** validate artifacts before proceeding (human checkpoint)
- **Build loop:** execute subtasks autonomously
- **Calibrate loop:** check drift, self-improve

**Pattern:** Auto-generate → Review → Proceed

| Stage | Auto-generate | Review before next |
|-------|---------------|-------------------|
| Roadmap | `ralph plan roadmap --supervised` | `ralph review roadmap` |
| Stories | `ralph plan stories --supervised` | `ralph review stories` |
| Tasks | `ralph plan tasks --supervised` | `ralph review tasks` |
| Subtasks | `ralph plan subtasks` (always auto) | `ralph review subtasks` ← **MISSING** |
| Build | N/A | (interactive mode `-i`) |

**Action:**
1. Add `ralph review subtasks` command
2. Formalize "Review Loop" concept in VISION.md Section 3
3. Update subtasks documentation: "always auto-generated, use review before build"

---

### Discoverability Commands

**Existing:** `ralph milestones` (undocumented)

**Pattern:** Quick list commands to see what's available/done

**Expand to:**
```bash
ralph milestones [--json]     # List milestones from roadmap
ralph stories [milestone]     # List stories (optionally filtered by milestone)
ralph tasks [story-id]        # List tasks (optionally filtered by story)
ralph subtasks                # List current subtask queue
```

**Why:**
- Helps users understand current state without opening files
- Supports scripting with `--json` output
- Complements review commands (list → review → proceed)

**Action:** Add to VISION.md Section 8.2 (CLI Reference) as utility commands.

---

### Hooks, Notifications & Diary: Unified Config (Items 4+5)

**The problem:** Ralph needs to handle 3 different concerns at various lifecycle events:

| Concern | What it does | Examples |
|---------|--------------|----------|
| **Logging** | Record what happened | Write to diary, stdout |
| **Notifications** | Alert the user | ntfy push, future: slack |
| **Flow control** | Pause or continue | Stop for review, auto-continue |

**Lifecycle events where these matter:**
- `onIterationComplete` - after each subtask attempt
- `onMilestoneComplete` - after all subtasks in milestone done
- `onMaxIterationsExceeded` - subtask failed too many times
- `onValidationFail` - pre-build check failed

**Decision: Hybrid config (defaults + exceptions)**

```json
{
  "diary": {
    "enabled": true,
    "path": "logs/iterations.jsonl",
    "summaryModel": "haiku"
  },
  "notifications": {
    "ntfy": { "server": "https://ntfy.sh", "topic": "ralph-build" }
  },
  "defaults": {
    "actions": ["log", "diary"],
    "pause": "never"
  },
  "events": {
    "onMilestoneComplete": { "actions": ["notify"], "pause": "always" },
    "onMaxIterationsExceeded": { "actions": ["notify"], "pause": "always" }
  }
}
```

**Why hybrid works for Ralph:**
- Most iterations: just log, keep going (default behavior)
- Key checkpoints: pause for review (milestone complete, failures)
- Set "keep going" as default, mark checkpoints as exceptions
- Sparse config, clear intent

**Current implementation gaps:**
- `ntfy` at root instead of nested under `notifications`
- `PostIterationHookConfig` fields not in schema
- No `defaults` + `events` pattern yet

**Action:** Update VISION.md with this explanation + config structure. Then align implementation.

---

### Haiku Summary Generation Details

**Current implementation:**
- Model: `claude-3-5-haiku-latest`
- Timeout: 30 seconds ← **TOO SHORT**
- JSON extraction from code blocks
- Fallback to raw text (200 char truncate)

**Action:**
- Update VISION.md with summary generation details
- Increase timeout (60s? 90s?)
- Document model choice and fallback behavior

---

### Hook Pause Timeout (Safety)

**Implementation:**
- 5-minute timeout on interactive pause
- Prevents CI hangs
- TTY check skips pause in non-interactive environments

**Action:** Document in VISION - important safety behavior for automation.

---

### Display/UX Guidelines

**UX-relevant utilities to document:**
- Progress bar format (20-char visual)
- Status color coding (green=completed, red=failed, yellow=retrying)
- Duration formatting ("1h 2m 3s" not raw ms)
- Timestamp formatting (readable, not ISO)
- Markdown rendering (glow if available, plain fallback)

**Action:** Add UX guidelines section to VISION - consistent terminal output matters for user experience.

---

### Unified AI Iteration Log

**Current state:** Two separate logs
- `logs/iterations.jsonl` - build diary (heavyweight, Haiku summaries)
- `logs/ralph-plan-*.jsonl` - planning receipts (lightweight, raw output)

**Problem:** Both are "AI doing work in a loop" - artificial distinction.

**Decision: Unify into one log**

```typescript
interface AIIterationEntry {
  // CORE (all phases)
  timestamp: string;
  sessionId: string;
  sessionPath: string;      // Reference to Claude Code session file
  phase: "plan" | "build";
  durationMs: number;
  costUsd: number;

  // PLAN-PHASE (lightweight)
  planType?: "stories" | "tasks" | "subtasks";
  targetRef?: string;       // "milestone:mvp", "story:007"

  // BUILD-PHASE (Haiku summary worth it here)
  subtaskId?: string;
  status?: "completed" | "failed" | "retrying";
  iterationNum?: number;
  summary?: string;         // Haiku-generated (build only)
  toolCalls?: number;
  filesChanged?: string[];
}
```

**Key principles:**
- Raw session data already stored by Claude Code - just reference `sessionPath`
- Haiku summary for **build** iterations only (valuable for status/calibration)
- Planning iterations lighter - no Haiku needed
- One file: `logs/iterations.jsonl`

**Action:** Update VISION + implementation to unified schema.

---

### Prompt Naming Consistency

> **SUPERSEDED:** Decided to keep `*-auto.md` naming. The `-auto.md` suffix is mode-agnostic (works for both supervised and headless). See VISION.md Section 3.3 for current spec.

---

## 3. IMPLEMENT LATER (Spec → Code Deferred)

### `approvals` Config Block

**What:** Per-action approval gates (storiesToTasks, tasksToSubtasks, preBuildDriftCheck, etc.)

**Blocked by:** `--cascade` mode

**Why:** Without cascade, Ralph runs isolated segments:
- `ralph plan stories` → just creates stories
- `ralph plan tasks` → just creates tasks
- `ralph build` → just executes subtask queue

Each segment works independently. User manually triggers next step.

With `--cascade`, Ralph chains the full workflow: vision → roadmap → stories → tasks → subtasks → build → calibrate

**That's when approvals matter:** Gates between workflow stages to pause/confirm before proceeding.

**VISION.md clarity needed:** Make explicit that cascade = unified autonomous workflow, otherwise = manual segment execution.

**Naming decision:** Use `--cascade` (not `--full-auto`) - clearer, implies "flows down" through levels.

---

## 4. NOT NEEDED / DESIGN CHANGED

### `-p/--print` for Plan Commands

**VISION says:** Print prompt without executing (listed under Plan options)

**Decision:** Remove from VISION. Not useful - can just read prompt file directly. Keep only for `ralph build -p` where it shows assembled context.
