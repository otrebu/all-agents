## Task: Add Approval Gate Preview Rendering in Dry-Run Mode

**Story:** [004-STORY-approval-gate-visibility](../stories/004-STORY-approval-gate-visibility.md)

### Goal
The dry-run preview shows each approval gate with its resolved action (SKIP, PROMPT, NOTIFY-WAIT, EXIT-UNSTAGED) based on config, mode, and flags, making the approval flow predictable before execution starts.

### Context
Ralph's approval system has three modes (`auto`, `suggest`, `always`) that interact with execution mode (supervised/headless) and override flags (`--force`/`--review`). The resulting behavior matrix is non-obvious. Currently, `evaluateApproval()` in `approvals.ts` resolves the correct action for each gate, but this resolution happens during execution—users don't see it in the preview.

This task surfaces that approval resolution logic in the execution plan computation (Story 001's `computeExecutionPlan()`) and renders it visually in the preview output (Story 002's rendering functions). The key insight: we REUSE the existing `evaluateApproval()` logic, not reimplement it.

**Dependencies:**
- Story 001 (execution plan computation) must be complete—`computeExecutionPlan()` should already exist
- Story 002 (visual rendering) must be complete—`renderPipelinePlan()` and tree rendering functions should exist

### Plan
1. Extend `ExecutionPlan` type in `tools/src/commands/ralph/types.ts` to include per-level `approvalGate?: { gate: ApprovalGate, action: ApprovalAction }` field
2. Modify `computeExecutionPlan()` in `tools/src/commands/ralph/plan-preview.ts` to call `evaluateApproval()` for each cascade level that has a gate (use `levelToGate()` mapping from `cascade.ts`)
3. Build `ApprovalContext` from options: `{ forceFlag: options.force, isTTY: process.stdout.isTTY, reviewFlag: options.review }`
4. Store resolved `{ gate, action }` in each level's execution plan
5. Add `renderApprovalGatePreview()` in `tools/src/commands/ralph/display.ts` that takes gate name and action and returns a styled string (e.g., `"GATE createTasks → SKIP (--force)"` in dim yellow with annotation)
6. Integrate `renderApprovalGatePreview()` into `renderPipelineTree()` at the end of each level's expanded detail, showing gate status inline
7. Add flag annotations: `--force` shows `[force]` marker on all gates with SKIP action, `--review` shows `[review]` marker on gates with PROMPT action

### Acceptance Criteria
- [ ] `computeExecutionPlan()` includes approval gate resolution for all levels that have gates
- [ ] The dry-run preview shows gate status for each level: `GATE createStories → PROMPT` or `GATE createTasks → SKIP (--force)`
- [ ] `--force` flag visually annotated as skipping all approval gates
- [ ] `--review` flag visually annotated as requiring approval at every gate
- [ ] Gate resolution uses existing `evaluateApproval()` function—no logic duplication
- [ ] Works correctly for all mode combinations: supervised/headless × auto/suggest/always × force/review

### Test Plan
- [ ] Unit test: `computeExecutionPlan()` with `--force` resolves all gates to SKIP
- [ ] Unit test: `computeExecutionPlan()` with `--review` resolves all gates to PROMPT (supervised) or EXIT-UNSTAGED (headless)
- [ ] Unit test: `computeExecutionPlan()` with `suggest` mode resolves to WRITE (supervised) or NOTIFY-WAIT (headless)
- [ ] E2E test: `aaa ralph plan stories --milestone M1 --cascade build --dry-run` shows gate status for stories/tasks/subtasks levels
- [ ] E2E test: `aaa ralph plan stories --milestone M1 --cascade build --dry-run --force` shows all gates as SKIP with `[force]` annotation
- [ ] E2E test: `aaa ralph plan stories --milestone M1 --cascade build --dry-run --review` shows all gates as PROMPT with `[review]` annotation

### Scope
- **In:** Approval gate preview rendering in dry-run mode, gate resolution integration with execution plan, visual annotations for `--force` and `--review`
- **Out:** Live execution approval card (Task 017), pipeline header gate symbols (Task 018), gate user interaction logic (already exists in `approvals.ts`)

### Notes
- Gate-to-level mapping: `createRoadmap` (roadmap), `createStories` (stories), `createTasks` (tasks), `createSubtasks` (subtasks), `onDriftDetected` (validation/build)
- Use `levelToGate()` from `cascade.ts` if it exists, otherwise implement mapping inline
- ApprovalAction mapping: `"write"` → `"SKIP"` in preview (auto-proceed), `"prompt"` → `"PROMPT"`, `"notify-wait"` → `"NOTIFY-WAIT"`, `"exit-unstaged"` → `"EXIT-UNSTAGED"`
- Color scheme: SKIP (dim green), PROMPT (yellow), NOTIFY-WAIT (cyan), EXIT-UNSTAGED (yellow with warning symbol)

### Related Documentation
- @context/blocks/construct/chalk.md
- @context/blocks/construct/boxen.md
- @context/blocks/construct/ralph-patterns.md
- @context/stacks/cli/cli-bun.md
- @context/foundations/test/test-e2e-cli-bun.md
