# Ralph CLI Visual Output Style Guide

## Scope

This guide defines the look and runtime voice for all `aaa ralph` terminal output:

- `plan`
- `build`
- `status`
- `calibrate`
- `review`
- `subtasks`
- `models`
- `archive`

The goal is not only correctness. The goal is confidence while the command runs.

## UX Goals

1. Show exactly where the command is in the pipeline.
2. Make long waits feel alive, not stuck.
3. Keep visual language consistent across commands.
4. Make errors actionable in one read.
5. Keep wording stable for humans and tests.

## Visual Language

Ralph output has six visual primitives:

1. Command banner (boxed, high-level context)
2. Phase card (boxed, transition-level context)
3. Event line (single-line runtime events)
4. Heartbeat line (liveness during long operations)
5. Final summary (boxed, outcome and next action)
6. Pipeline renderer (live phase bar/tree for long-running execution)

Use the same primitives in every command family.

## Color and Emphasis Tokens

Use semantic colors and keep meaning consistent.

| Token     | Chalk style       | Meaning                              |
| --------- | ----------------- | ------------------------------------ |
| `info`    | `chalk.cyan`      | active step, identifiers, references |
| `success` | `chalk.green`     | completed state                      |
| `warn`    | `chalk.yellow`    | recoverable issue or caution         |
| `error`   | `chalk.red`       | failure requiring action             |
| `meta`    | `chalk.dim`       | secondary details                    |
| `strong`  | `chalk.bold`      | key labels                           |
| `id`      | `chalk.cyan.bold` | subtask/task/story IDs               |
| `money`   | `chalk.magenta`   | cost values                          |

Rules:

- Never use color as the only signal. Include state words (`START`, `DONE`, `FAIL`).
- Prefer short, predictable labels over decorative text.

## Prefix Grammar

All runtime lines use this grammar:

`[DOMAIN] [STATE] message`

Domains:

- `PLAN`
- `REVIEW`
- `CASCADE`
- `BUILD`
- `VALIDATE`
- `CALIBRATE`
- `STATUS`

States:

- `START`
- `WAIT`
- `DONE`
- `SKIP`
- `INFO`
- `FAIL`

Examples:

- `[PLAN] [START] Phase 1/4: starting generation`
- `[BUILD] [WAIT] claude still running (10m)`
- `[VALIDATE] [DONE] 12 aligned, 2 skipped`

## Layout Rules

- One blank line between major blocks.
- One event per line.
- No embedded visual spacing tricks (`"\n...\n"`) for layout.
- Keep output width aligned to shared display width (current baseline: 68 columns).
- Live build visuals (phase bar, subtask line, execution tree rows, invocation separator) must render at exact baseline width; right-pad short lines as needed.
- Non-TTY transition logs (`[PIPELINE] phase=...`) are exempt from exact-width padding.
- Keep left alignment; avoid center alignment except in banner titles.

## Component Specs

### 1) Command Banner

Use a top-level box at command start for context.

- Border: `double`
- Purpose: who/what/where
- Includes command, target scope, provider, major options

### 2) Phase Card

Use before each major transition.

- Border: `round`
- Includes phase index and short description
- Includes critical path/config lines (queue path, mode, timeouts)

### 3) Event Stream

Use for high-frequency events.

- Plain prefixed lines
- No box for per-item loops
- Include IDs and counts

### 4) Heartbeat

Use for long provider waits.

- Keep dot pulse for low noise
- Add periodic verbose line with elapsed time
- Always print phase/domain with verbose heartbeat

### 5) Summary

Use at end of phase and end of command.

- Border: `double`
- Include outcome, counts, duration, cost, artifacts, and next command

## Error Message Contract

Every actionable error follows this order:

1. What failed and where
2. What was expected
3. What was found
4. Contract/schema reference
5. Exact fix

Example:

```text
Invalid subtasks file format at docs/planning/milestones/x/subtasks.json
Expected: JSON object with top-level "subtasks" array (canonical schema)
Found: top-level array (legacy format)
Schema: docs/planning/schemas/subtasks.schema.json
Fix: Wrap entries as { "subtasks": [ ... ] } (optionally include "$schema" and "metadata")
```

## Required Phase Contract (Plan Subtasks -> Cascade Build)

For:

`aaa ralph plan subtasks --headless --cascade build --validate-first`

minimum sequence:

1. `[PLAN] [START] Phase 1/4: starting generation`
2. queue path line
3. provider invocation header
4. heartbeat while provider runs
5. `[PLAN] [DONE] Phase 2/4: provider run complete, verifying queue`
6. `[PLAN] [DONE] Phase 3/4: queue verified at <path>`
7. `[PLAN] [DONE] Phase 4/4: summary complete`
8. `[CASCADE] [START] handoff subtasks -> build`
9. `[BUILD] [START] build loop`
10. `[VALIDATE] [START] pre-build validation` (if enabled)
11. `[VALIDATE] [DONE] ...` or `[VALIDATE] [SKIP] ...`
12. `[BUILD] [START] iteration phase`

## ASCII Mockups

### Command Banner

```text
+------------------------------------------------------------------+
| RALPH PLAN SUBTASKS (HEADLESS)                                   |
| milestone: report-scheduling-email                               |
| provider: claude  size: medium  cascade: build  validate: on     |
+------------------------------------------------------------------+
```

### Plan Phase + Wait

```text
+-- [PLAN] [START] Phase 1/4: Generate subtasks -------------------+
| queue: docs/planning/milestones/report-scheduling-email/subtasks |
| source: context/workflows/ralph/planning/subtasks-from-hierarchy |
+------------------------------------------------------------------+

[PLAN] [WAIT] provider=claude elapsed=10m00s pulse=........

+-- [PLAN] [DONE] Phase 2/4: Provider run complete ----------------+
| verifying queue outcome                                           |
+------------------------------------------------------------------+
```

### Cascade Handoff

```text
+-- [CASCADE] [START] Handoff -------------------------------------+
| from: subtasks    to: build                                       |
| validate-first: enabled    calibrate-every: 5                     |
| queue: docs/planning/milestones/report-scheduling-email/subtasks  |
+------------------------------------------------------------------+
```

### Build + Validation Start

```text
+-- [BUILD] [START] Build loop ------------------------------------+
| queue: 17 pending / 67 total (50 completed)                       |
| max-iterations-per-subtask: unlimited (0)                         |
| provider: claude                                                  |
+------------------------------------------------------------------+

[VALIDATE] [START] 17 pending subtasks
[VALIDATE] [DONE] 15 aligned, 2 skipped
[BUILD] [START] iteration phase
```

### Validation Failure Card

```text
+-- [VALIDATE] [FAIL] SUB-014 -------------------------------------+
| issue: Too Broad                                                  |
| reason: includes implementation outside parent task scope         |
| action: skipped, feedback written                                 |
| file: docs/planning/milestones/.../feedback/2026-02-09_...md      |
+------------------------------------------------------------------+
```

### Status Snapshot

```text
+------------------------- RALPH STATUS ---------------------------+
| Queue    [#######.............] 21/45 (46%)                       |
| Next     SUB-022  Add schedule timezone handling                  |
| Last     SUB-021  2026-02-09 14:41                                |
| Runs     12 iterations  success 83.3%  avg tool calls 6.2         |
+------------------------------------------------------------------+
```

## Do and Do Not

Do:

- Use one style system across all Ralph commands.
- Reuse display helpers for boxes, progress, and summaries.
- Keep phase words stable (`START`, `WAIT`, `DONE`, `FAIL`).

Do not:

- Mix `=== section ===` with prefixed phase lines in the same flow.
- Alternate between manual ASCII boxes and unrelated styles by command.
- Print vague failures without fix guidance.

## Quiet Mode Rules

- Quiet mode may hide rich summaries.
- Quiet mode must still show:
  - command-level failures
  - phase transitions
  - warnings requiring user action

## Test Requirements

At minimum, tests should assert:

- phase transition lines exist for headless plan -> cascade -> build
- heartbeat liveness appears during long operations
- canonical subtasks format errors are explicit and actionable
- validation start/done/skip states are visible

Suggested files:

- `tools/tests/e2e/ralph.test.ts`
- `tools/tests/lib/status.test.ts`
- `tools/tests/lib/config.test.ts`

## Implementation Notes

Centralize style helpers in `tools/src/commands/ralph/display.ts`:

- `renderCommandBanner(...)`
- `renderPhaseCard(...)`
- `renderEventLine(domain, state, message)`
- `renderErrorBlock(...)`
- `renderSummaryCard(...)`

Then migrate callsites in:

- `tools/src/commands/ralph/index.ts`
- `tools/src/commands/ralph/build.ts`
- `tools/src/commands/ralph/cascade.ts`
- `tools/src/commands/ralph/status.ts`
- `tools/src/commands/ralph/calibrate.ts`
- `tools/src/commands/ralph/validation.ts`
