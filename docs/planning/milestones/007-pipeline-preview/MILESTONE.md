# Milestone 007: Pipeline Preview & Dry-Run

## Objective

Give users full visibility into what a Ralph command will do — before, during, and after execution. Build a visual pipeline diagram (reads/process/produces per phase, approval gates, cascade expansion) that shows in every mode, plus `--dry-run` to preview without executing. Users should never be surprised by what happens.

## Locked Decisions

1. **Terraform plan model**: static one-shot preview, not an interactive TUI. Printable, pipeable, CI-friendly.
2. **Zero new dependencies**: uses existing chalk + boxen + string-width from display.ts.
3. **Shared computation**: the preview calls the same functions the executor uses (`getLevelsInRange`, `evaluateApproval`, `getSubtaskQueueStats`) — it cannot drift from reality.
4. **`--dry-run` flag on existing commands**, not a separate `aaa ralph preview` command.
5. **Visual pipeline diagram** is the core deliverable — a collapsible tree with per-phase detail (reads/steps/writes/gate), annotation markers, and approval gate visibility.
6. **Preview shows in every mode** — supervised prompts, headless logs it, force prints and proceeds. Only `--dry-run` differs: it exits after showing the plan.
7. **Two-tier detail**: compact auto-preview for single-level commands, full per-phase diagram for cascades and `--dry-run`.

## User-Facing Behavior Contract

### Example 1: Full Cascade Dry-Run with Multiple Flags

`aaa ralph plan stories --milestone M1 --cascade build --headless --force --dry-run`

```
╔══════════════════════════════════════════════════════════════════════╗
║                      Ralph Pipeline Plan                            ║
╠══════════════════════════════════════════════════════════════════════╣
║  Command:   plan stories --cascade build                            ║
║  Milestone: M1                        Provider: claude (opus-4)     ║
║  Mode:      headless                  Approvals: skipped (--force)  ║
╚══════════════════════════════════════════════════════════════════════╝

┌─ PLAN ──────────────────────────────────────────────────────────────┐
│                                                                      │
│  [stories] ──→ [tasks] ──→ [subtasks] ──→ [build]                   │
│                                                                      │
│  ▾ stories    Generate story files from MILESTONE.md     ~3 min      │
│  │  READS   milestones/M1/MILESTONE.md, ROADMAP.md                   │
│  │  STEPS   1. Read milestone description                            │
│  │       ~  2. Single-pass autonomous generation        [headless]   │
│  │       ~  3. Generate without iteration               [headless]   │
│  │          4. Number stories (S-001, S-002...)                       │
│  │          5. Write each as separate file                            │
│  │       +  6. Auto-approve all changes                    [force]   │
│  │  WRITES  stories/S-NNN-*.md                                       │
│  │  GATE    createStories → SKIP (--force)                           │
│  │                                                                   │
│  ├─ tasks     Break stories into task files              ~5 min      │
│  │  READS   stories/S-*.md                                           │
│  │  WRITES  tasks/T-NNN-*.md                                         │
│  │  GATE    createTasks → SKIP (--force)                             │
│  │                                                                   │
│  ├─ subtasks  Slice tasks into atomic subtask queue      ~8 min      │
│  │  READS   tasks/T-*.md                                             │
│  │  WRITES  subtasks.json                                            │
│  │  GATE    createSubtasks → SKIP (--force)                          │
│  │                                                                   │
│  └─ build     Execute subtask queue                      ~45 min     │
│     READS   subtasks.json, codebase                                  │
│     WRITES  code changes, git commits, iteration diary               │
│     GATE    none                                                     │
│                                                                      │
│  Summary                                                             │
│  ───────                                                             │
│  Phases: 4       Gates: 3 skipped (--force)                          │
│  Est. time: ~61 min    Est. cost: ~$0.20 - $0.60 (planning only)    │
│                                                                      │
│  ⚠  --force skips all approval gates                                 │
│  ⚠  --headless disables interactive prompts                          │
│                                                                      │
│  To execute: remove --dry-run flag                                   │
└──────────────────────────────────────────────────────────────────────┘
```

First node expanded (`▾`) shows full detail. Downstream cascade nodes collapsed (`├─`/`└─`) show one-line summaries with reads/writes/gate.

### Annotation Markers

Flag effects are visually annotated so users understand what each flag changes:

- `+` = step/output added by a flag (green)
- `~` = step replaced by a flag (orange)
- `×` = step skipped by a flag (dim, struck-through)
- `[flag-name]` = which flag caused the change (right-aligned)
- `── CASCADE: <command> ──` = cascade separator (blue, centered)

### Example 2: Build with Validate + Calibrate

`aaa ralph build --validate-first --calibrate-every 5 --review --dry-run`

```
╔══════════════════════════════════════════════════════════════════════╗
║                      Ralph Build Preview                            ║
╠══════════════════════════════════════════════════════════════════════╣
║  Milestone:  006-cascade-mode-for-good                              ║
║  Provider:   claude (sonnet)          Mode: supervised              ║
╚══════════════════════════════════════════════════════════════════════╝

 PIPELINE  vision → roadmap → stories → tasks → subtasks → [build] → calibrate
                                                               ^^^

 FLAGS     --validate-first  --calibrate-every 5  --review

 ╭─── ralph build ─────────────────────────────────────────────────╮
 │                                                                  │
 │  READS     subtasks.json (12 pending, 4 blocked)                 │
 │            Codebase per subtask                                  │
 │         +  Validation rules                     [validate-first] │
 │                                                                  │
 │  STEPS  +  0. Pre-build validation              [validate-first] │
 │         +  1. Require explicit approval               [review]   │
 │            2. Load subtask queue                                  │
 │            3. Pick next runnable subtask                          │
 │            4. Generate prompt with full context                   │
 │            5. AI implements: writes code + tests                  │
 │            6. Commit changes with conventional message            │
 │            7. Mark subtask complete in queue                      │
 │            8. Loop until queue empty or max iterations            │
 │         +  9. Run calibration every 5 iterations [calibrate-every]│
 │                                                                  │
 │  WRITES    Code changes                                          │
 │            Git commits                                           │
 │            Updated subtasks.json                                 │
 │                                                                  │
 │  MODE      supervised     TIME  ~60 min (12 subtasks)            │
 │                                                                  │
 │  APPROVALS                                                       │
 │    review: required at each step                      [--review] │
 │                                                                  │
 ╰──────────────────────────────────────────────────────────────────╯

 To execute: remove --dry-run flag
```

### Example 3: Compact Auto-Preview (Single-Level Build)

For simple `aaa ralph build`, show a compact banner — no full diagram:

```
╔══════════════════════════════════════════════════════════════════════╗
║                         Ralph Build                                 ║
╠══════════════════════════════════════════════════════════════════════╣
║  Milestone   006-cascade-mode-for-good                              ║
║  Provider    Claude           Model   sonnet                        ║
║  Queue       12 pending / 34 total    (22 completed, 64%)           ║
║  Next        SUB-045  Wire cascade --from flag to CLI               ║
║  Mode        supervised       Validate  off                         ║
╠────────────────────────────────────────────────────────────────────╣
║  Pipeline    build                                                  ║
║  Gates       none (--force not set, will prompt on validation fail) ║
╚══════════════════════════════════════════════════════════════════════╝
Proceed? [Y/n]:
```

### Example 4: Cascade Preview (Non-Dry-Run, Supervised)

`aaa ralph plan stories --milestone 006 --cascade build`

```
╔══════════════════════════════════════════════════════════════════════╗
║                      Ralph Plan Stories                             ║
╠══════════════════════════════════════════════════════════════════════╣
║  Milestone: 006-cascade-mode          Provider: claude (sonnet)     ║
║  Mode:      supervised                                              ║
╚══════════════════════════════════════════════════════════════════════╝

┌─ PLAN ──────────────────────────────────────────────────────────────┐
│                                                                      │
│  [stories] ──→ [tasks] ──→ [subtasks] ──→ [build]                   │
│                                                                      │
│  ├─ stories    Generate story files              ~3 min   [APPROVAL] │
│  ├─ tasks      Break stories into tasks          ~5 min   [APPROVAL] │
│  ├─ subtasks   Generate subtask queue            ~8 min   [APPROVAL] │
│  └─ build      Execute subtask queue             ~45 min  auto       │
│                                                                      │
│  Gates: 3 approval points    Est. time: ~61 min                      │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
Proceed? [Y/n]:
```

### Example 5: Source Override + Sizing + Dry-Run

`aaa ralph plan subtasks --review-diary --size small --dry-run`

```
 ╭─── ralph plan subtasks [DRY RUN] ───────────────────────────────╮
 │                                                                  │
 │  READS  ~  logs/reviews.jsonl (review diary)    [review-diary]   │
 │                                                                  │
 │  STEPS  ~  1. Parse review findings diary       [review-diary]   │
 │         ~  2. Slice into thinnest viable subtasks   [size=small] │
 │            3. Assign IDs (SUB-001, SUB-002...)                   │
 │            4. Write queue as JSON                                │
 │         +  5. Preview only -- no changes applied    [dry-run]    │
 │                                                                  │
 │  WRITES ~  Preview: subtasks.json (not applied)     [dry-run]    │
 │                                                                  │
 │  MODE      preview        TIME  2-5 min                          │
 │                                                                  │
 │  No changes will be made. Remove --dry-run to execute.           │
 ╰──────────────────────────────────────────────────────────────────╯
```

### Example 6: Cascade with --from

`aaa ralph plan subtasks --milestone M1 --cascade calibrate --from build --headless`

```
 PIPELINE  vision → roadmap → stories → tasks → [subtasks] → [build] → [calibrate]
                                                    ^^^           ^^^        ^^^
                                                 entry point     from      cascade

 FLAGS     --headless  --cascade calibrate  --from build

 ╭─── ralph plan subtasks ─────────────────────────────────────────╮
 │                                                                  │
 │  READS     tasks/*.md (M1/tasks/, 8 files)                      │
 │                                                                  │
 │  STEPS     1. Read tasks as input                                │
 │            2. Slice into atomic subtasks (~1 commit each)        │
 │            3. Assign IDs (SUB-001, SUB-002...)                   │
 │            4. Write queue as JSON                                │
 │                                                                  │
 │         ── CASCADE: ralph build ──  (--from build)               │
 │         +  5. Load subtask queue                                 │
 │         +  6. Pick next runnable subtask                         │
 │         +  7. Generate prompt with full context                  │
 │         +  8. AI implements: writes code + tests                 │
 │         +  9. Commit changes with conventional message           │
 │         + 10. Mark subtask complete in queue                     │
 │         + 11. Loop until queue empty or max iterations           │
 │                                                                  │
 │         ── CASCADE: ralph calibrate ──                           │
 │         + 12. Read original plan (stories/tasks)                 │
 │         + 13. Read what was actually built                       │
 │         + 14. Compare intent vs implementation                   │
 │         + 15. Report drift with severity                         │
 │         + 16. Analyze code quality of recent changes             │
 │         + 17. Analyze session logs for patterns                  │
 │                                                                  │
 │  WRITES    subtasks.json                                         │
 │         +  Code changes + Git commits                            │
 │         +  Combined calibration report                           │
 │         +  JSON log file                            [headless]   │
 │                                                                  │
 │  MODE      headless       TIME  ~45 min - hours                  │
 │                                                                  │
 │  NOTE      --from build skips cascade into tasks                 │
 │            (subtasks -> build directly, then calibrate)           │
 ╰──────────────────────────────────────────────────────────────────╯
```

### Dry-Run Behavior

```bash
aaa ralph plan stories --milestone M1 --cascade build --headless --dry-run
aaa ralph build --validate-first --calibrate-every 5 --dry-run
aaa ralph calibrate all --dry-run
```

1. Parse all flags and resolve options (milestone path, provider, model, approval config).
2. Compute the full execution plan (cascade levels, approval gates, queue stats, file lists).
3. Render the full visual pipeline diagram (examples above).
4. Print summary footer: total phases, approval stops, estimated time, "remove --dry-run to execute."
5. Exit with code 0 without executing anything.

### Mode Matrix

Preview shows in **every** mode — only the confirmation behavior differs:

| Mode | `--dry-run` | No `--dry-run` |
|------|------------|----------------|
| **Supervised** | Full visual diagram, exit | Full visual diagram, prompt `Proceed? [Y/n]`, execute |
| **Headless** | Full visual diagram as JSON, exit | Compact preview (logged), then execute |
| **`--force`** | Full visual diagram, exit | Compact preview (logged), then execute (no prompts) |

Headless and force modes **still show the preview** — they just don't block. The preview appears in output/logs so you can always see what happened.

### Preview Verbosity Scales with Risk

| Scenario | Risk | Preview Detail |
|----------|------|---------------|
| `aaa ralph build` (single level, queue exists) | Low | Compact banner (Example 3) |
| `aaa ralph plan subtasks --cascade build` (multi-level) | Medium | Pipeline table (Example 4) |
| `aaa ralph plan stories --cascade calibrate` (full pipeline) | High | Full per-phase diagram (Example 1) |

Automatic — driven by cascade level count, not a flag.

### Live Execution: Pipeline Header + Collapsible Tree

During execution, a minimal 2-line header shows position at a glance, followed by a collapsible tree showing phase-level detail.

**Header** (persistent in headless, reprinted in supervised):

```
── [stories] ✓ → [tasks] ✓ → [subtasks] ✓ → [build] ● → calibrate ──

   SUB-015  Add login endpoint    3/12  [######..........] 25%
```

The header is just orientation — elapsed time, cost, and per-subtask detail live in the tree below.

**Full live view** (header + tree, mid-build):

```
── [stories] ✓ → [tasks] ✓ → [subtasks] ✓ → [build] ● → calibrate ──

   SUB-015  Add login endpoint    3/12  [######..........] 25%

┌─ EXECUTE ───────────────────────────────────────────────────────┐
│                                                                  │
│  ▸ stories    5 files created                 3m 12s   $0.15  ✓ │
│  ▸ tasks      12 files created                5m 44s   $0.22  ✓ │
│  ▸ subtasks   34 subtasks generated           7m 58s   $0.41  ✓ │
│  ▾ build      Subtask 3/12                   running          ● │
│  │                                                               │
│  │  ✓ SUB-013  Add auth middleware       3m 45s  $0.12  +142/-8 │
│  │  ✓ SUB-014  Create JWT token service  4m 12s  $0.18  +89/-3  │
│  │  ● SUB-015  Add login endpoint        2m 03s  ...            │
│  │    ──────── Invoking Claude (headless) ────────               │
│  │  ○ SUB-016  Add registration endpoint                         │
│  │  ○ SUB-017  Add password reset flow                           │
│  │    ... 7 more pending                                         │
│  │                                                               │
│  ○ calibrate                                                     │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

Completed phases collapse to one-liners (`▸`). The active phase expands (`▾`) to show individual subtasks with metrics.

**At an approval gate:**

```
── [stories] ✓ → [tasks] ‖ → subtasks → build ──

   APPROVAL REQUIRED: createTasks

┌─ EXECUTE ───────────────────────────────────────────────────────┐
│                                                                  │
│  ▸ stories    5 files created                 3m 12s   $0.15  ✓ │
│  ‖ tasks      Awaiting approval                                  │
│  ○ subtasks                                                      │
│  ○ build                                                         │
│                                                                  │
├─ APPROVE: createTasks ──────────────────────────────────────────┤
│                                                                  │
│  5 story files have been created:                                │
│    stories/001-STORY-dry-run-preview.md                          │
│    stories/002-STORY-visual-pipeline-diagram.md                  │
│    stories/003-STORY-live-execution-header.md                    │
│    stories/004-STORY-approval-gate-visibility.md                 │
│    stories/005-STORY-cli-integration.md                          │
│                                                                  │
│  Config: suggest    Mode: supervised    Action: prompt            │
│                                                                  │
│  [Y] Approve and continue to tasks                               │
│  [n] Abort cascade                                               │
│  [e] Edit files first, then re-prompt                            │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

**Pipeline header symbols:**

| Symbol | Meaning | Color |
|--------|---------|-------|
| `✓` | Completed | green |
| `●` | Currently running | cyan |
| `‖` | Approval gate (waiting) | yellow |
| `~` | Timed wait (notify-wait) | yellow |
| `✗` | Stopped/failed | red |
| (no brackets) | Not yet started | dim |

In headless mode: header updated in-place via ANSI cursor control.
In supervised mode: header reprinted before each iteration.

### End-of-Run Summary

```
── [stories] ✓ → [tasks] ✓ → [subtasks] ✓ → [build] ✓ ──

   Complete    61m 30s    $2.32

┌─ COMPLETE ──────────────────────────────────────────────────────┐
│                                                                  │
│  ✓ stories    5 created       3m 12s   $0.15                    │
│  ✓ tasks      12 created      5m 44s   $0.22                    │
│  ✓ subtasks   34 generated    7m 58s   $0.41                    │
│  ✓ build      12/12 done     45m 03s   $1.54                    │
│                                                                  │
│  Total       61m 30s   $2.32   65 files   +1,842/-203 lines     │
│                                                                  │
│  Git: git diff abc123^..def456                                   │
│  Next: aaa ralph calibrate --milestone 006                       │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

## Architecture Plan

### WS-01 Execution Plan Computation

Deliverables:

1. `computeExecutionPlan()` function that takes resolved command options and returns a typed `ExecutionPlan`.
2. Calls existing functions: `getLevelsInRange()`, `evaluateApproval()`, `loadSubtasksFile()`, `loadAaaConfig()`.
3. Returns per-level data: name, reads, writes, process steps, approval gate action, estimated time.
4. `RuntimeContext` interface for filesystem enrichment: actual file counts, queue depth, provider/model, milestone path.
5. Static base flow data per pipeline level (reads/process/produces templates).
6. Flag composition: apply flag effects (replace/add/strike steps) using declarative `FLOW_MODS` rules, same algorithm as HTML manpage.

Target files:

- `tools/src/commands/ralph/plan-preview.ts` (new)
- `tools/src/commands/ralph/types.ts`

Acceptance criteria:

1. `computeExecutionPlan()` returns valid plan for every cascade level combination.
2. Approval gates resolve correctly for all modes (force/review/headless/supervised).
3. Flag composition produces correct annotations (`added`, `replaced`, `struck`) for all flag combos.
4. Runtime enrichment populates real file counts and queue stats from filesystem.
5. No AI invocations or network calls — preview is instant.

### WS-02 Visual Pipeline Rendering

Deliverables:

1. `renderPipelinePlan()` — full visual diagram as a collapsible tree: entry phase expanded (reads/steps/writes/gate), downstream phases collapsed to one-liners. Used for `--dry-run` and cascade previews.
2. `renderCompactPreview()` — compact banner for single-level commands (queue stats, next subtask, mode, provider).
3. `renderPipelineTree()` — tree layout with `├─`/`└─` connectors. Expanded nodes (`▾`) show reads/steps/writes/gate. Collapsed nodes (`▸`/`├─`) show one-line summary with description, time estimate, and gate status.
4. `renderApprovalGatePreview()` — shows gate name, config value, and resolved action per level. Used both inline in tree and as a standalone phase boundary (APPROVE card).
5. `renderPipelineHeader()` — minimal 2-line header: pipeline bar with status symbols (`✓`, `●`, `‖`, `~`, `✗`) + current subtask/progress bar.
6. Annotation rendering: flag-effect markers (`+`, `~`, `×`) with `[flag-name]` right-aligned tags within expanded tree nodes.
7. Summary footer: total phases, approval stops, estimated time, actionable next step.

Target files:

- `tools/src/commands/ralph/display.ts`

Acceptance criteria:

1. Tree diagram shows expanded entry phase with reads/steps/writes/gate and collapsed downstream phases.
2. Compact preview fits in 6-8 lines for single-level commands.
3. Flag annotations are visually distinct (color + symbol).
4. Approval gates show resolved action per mode (auto-proceed / prompt / notify-wait / exit-unstaged).
5. Works in TTY (colors), non-TTY (plain text), and CI (NO_COLOR). chalk handles this automatically.
6. Consistent with existing display.ts visual language (BOX_WIDTH, chalk colors, boxen borders).

### WS-03 Live Execution Pipeline Header + Tree

Deliverables:

1. `PipelineRenderer` class — stateful renderer that tracks current phase, subtask progress, and per-phase metrics.
2. Minimal 2-line header: pipeline bar with symbols + current subtask with progress bar. Spacing between lines for readability.
3. Collapsible execution tree below header: completed phases collapse to one-liners with metrics (`▸ stories  5 files  3m 12s  $0.15  ✓`), active phase expands to show individual subtasks (`▾ build  Subtask 3/12`).
4. Headless mode: header + tree updated in-place using ANSI cursor control (`\x1b[H`, `\x1b[2K`).
5. Supervised mode: header reprinted before each iteration (Claude TUI takes over terminal between).
6. Methods: `startPhase()`, `updateSubtask()`, `completePhase()`, `setApprovalWait()`, `stop()`.
7. Graceful degradation: when not TTY (piped/CI), skip cursor manipulation, print header once per phase change.

Target files:

- `tools/src/commands/ralph/pipeline-renderer.ts` (new)
- `tools/src/commands/ralph/types.ts`

Acceptance criteria:

1. Headless mode shows persistent updated header with phase progress and elapsed time.
2. Supervised mode reprints pipeline line between iterations.
3. Non-TTY output degrades to log-style phase headers (no cursor control).
4. Timer does not leak (cleaned up on stop/error).

### WS-04 CLI Integration

Deliverables:

1. Add `--dry-run` flag to: `ralph build`, `ralph plan stories`, `ralph plan tasks`, `ralph plan subtasks`, `ralph plan roadmap`, `ralph calibrate all`, `ralph calibrate intention`, `ralph calibrate technical`.
2. Early-exit pattern in each command's action handler: resolve options -> compute plan -> render full diagram -> exit.
3. Auto-preview in all modes: call `renderPipelinePlan()` (cascade) or `renderCompactPreview()` (single-level) before execution. Supervised prompts `Proceed? [Y/n]`. Headless/force log and proceed.
4. `--headless --dry-run` outputs JSON execution plan for CI consumption.
5. Wire `PipelineRenderer` into `runCascadeFrom()` and `runBuild()` for live progress updates.

Target files:

- `tools/src/commands/ralph/index.ts`
- `tools/src/commands/ralph/build.ts`
- `tools/src/commands/ralph/cascade.ts`

Acceptance criteria:

1. `--dry-run` on any pipeline command shows visual plan and exits without executing.
2. All modes show preview before execution (supervised prompts, headless/force log and proceed).
3. `--headless --dry-run` outputs valid JSON.
4. Live pipeline header updates during cascade and build execution.
5. No existing behavior is broken.

### WS-05 Documentation & Completions

Deliverables:

1. Update CLI help text for `--dry-run` flag on all affected commands.
2. Update shell completions (zsh, fish) with `--dry-run`.
3. Update README with `--dry-run` examples and visual preview screenshots.
4. Update manpage data (FLOWS, OPT_DETAILS) if applicable.

Target files:

- `tools/src/commands/ralph/index.ts` (help text)
- `tools/src/commands/completion/zsh.ts`
- `tools/src/commands/completion/fish.ts`
- `tools/README.md`

Acceptance criteria:

1. `aaa ralph build --help` shows `--dry-run` with clear description.
2. Tab completion offers `--dry-run`.
3. README shows example output of visual pipeline preview.

## Test Plan

### Unit Tests

1. `computeExecutionPlan()` returns correct levels for single command, cascade, cascade+from.
2. Approval gate resolution matches for all flag combos (force, review, headless, supervised).
3. Flag composition: `--headless` replaces interactive steps, `--force` strikes approval steps, `--validate-first` prepends validation step, `--calibrate-every` adds periodic step, `--cascade` expands downstream phases.
4. Multiple flags compose correctly (e.g., `--headless` + `--force` + `--cascade build`).
5. Queue stats populated correctly from subtasks.json.
6. Runtime enrichment: file counts match actual filesystem.
7. `renderPhaseColumns()` produces correct 3-column alignment with ANSI strings.
8. Time estimates are reasonable heuristics.

### Integration/E2E Tests

1. `aaa ralph build --dry-run` exits 0 without executing anything.
2. `aaa ralph plan stories --milestone M1 --cascade build --dry-run` shows all 4 cascade levels with per-phase diagrams.
3. `aaa ralph build --dry-run --headless` outputs valid JSON plan.
4. Supervised mode without `--dry-run` shows visual preview then prompts.
5. Headless mode without `--dry-run` logs compact preview then executes.
6. `--force` without `--dry-run` logs compact preview then executes (no prompt).
7. Annotation markers render correctly for `--headless --force --validate-first` combo.

## Risks and Mitigations

1. **Risk**: Preview output is too verbose for simple commands.
   - Mitigation: Auto-scaling — compact preview for single-level, full diagram for cascade. Driven by level count, not a flag.
2. **Risk**: Time/cost estimates are wildly inaccurate.
   - Mitigation: Mark as approximate (`~`), calibrate from diary logs in future milestone.
3. **Risk**: `index.ts` grows even larger with dry-run wiring.
   - Mitigation: Keep the pattern minimal (5-line early-exit per command), all logic lives in `plan-preview.ts`.
4. **Risk**: Persistent ANSI header breaks in some terminals.
   - Mitigation: Detect TTY capability, degrade gracefully to reprinted lines. Test in iTerm, Terminal.app, VS Code terminal, and piped output.
5. **Risk**: 3-column layout breaks with very long file paths.
   - Mitigation: Truncate paths with `...` when exceeding column width. Use `string-width` for ANSI-safe measurement.

## Out of Scope

1. Interactive TUI with flag toggling (the HTML manpage handles that).
2. Cost estimation from historical diary data (future enhancement).
3. Watch mode (`aaa ralph status --watch`).
4. Shared JSON data file between CLI and HTML manpage (different lifecycles — not worth the coupling).

## Definition of Done

1. `--dry-run` works on all 8 pipeline commands and shows visual pipeline diagram.
2. Preview shows in every mode: supervised prompts, headless logs, force logs and proceeds.
3. Visual diagram uses collapsible tree with expanded entry phase and collapsed downstream phases.
4. Approval gates are visible in advance — users never surprised by a prompt or wait.
5. Live pipeline progress header updates during execution (persistent in headless, reprinted in supervised).
6. Preview calls the same functions as execution — cannot drift.
7. Zero new dependencies added.
8. Tests cover all flag combinations, cascade scenarios, and rendering edge cases.
9. Docs, help text, and completions updated.
