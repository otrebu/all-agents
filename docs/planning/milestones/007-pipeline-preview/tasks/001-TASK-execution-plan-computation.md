## Task: Execution Plan Computation Layer

**Story:** [001-STORY-dry-run-preview](../stories/001-STORY-dry-run-preview.md)

### Goal
Create a `computeExecutionPlan()` function that computes the full execution plan for any Ralph pipeline command without executing anything, returning structured data that includes cascade levels, approval gates, reads/writes, and flag effects.

### Context
This is the foundational computation layer for the dry-run preview feature. The execution plan must be computed using the same functions that the real executor uses (`getLevelsInRange()`, `evaluateApproval()`, `loadSubtasksFile()`, etc.) to ensure the preview cannot drift from reality. The plan computation must be instant (no AI invocations) and produce structured data that can be consumed by rendering functions or output as JSON for CI.

This task maps to WS-01 from the milestone plan. It provides the data layer that both the visual rendering (Story 002) and CLI integration depend on.

### Plan
1. Create `tools/src/commands/ralph/plan-preview.ts` with core types: `ExecutionPlan`, `ExecutionPhase`, `RuntimeContext`, `FlagEffect`
2. Define static base flow data per pipeline level (reads/process/produces templates) as a constant `LEVEL_FLOWS` map
3. Implement `computeExecutionPlan()` function that:
   - Calls `getLevelsInRange()` to get cascade levels
   - For each level, loads runtime context (file counts, queue stats, milestone path)
   - Calls `evaluateApproval()` for each level's approval gate
   - Populates reads/writes/steps from `LEVEL_FLOWS` and enriches with runtime data
   - Returns typed `ExecutionPlan` object
4. Implement flag composition logic using declarative `FLOW_MODS` rules to annotate which steps are added/replaced/struck by flags
5. Add `RuntimeContext` interface for filesystem enrichment (actual file counts, queue depth, provider/model config)
6. Add time estimation heuristics (simple per-level constants for now, can be calibrated later)
7. Export types and functions from `plan-preview.ts` module

### Acceptance Criteria
- [ ] `computeExecutionPlan()` returns valid plan for single-level commands (e.g., `ralph build`)
- [ ] `computeExecutionPlan()` returns valid plan for cascade commands with 2+ levels
- [ ] Approval gate resolution works for all flag combinations: `--force` returns "write", `--review` returns "prompt", `--headless` with suggest mode returns appropriate action
- [ ] Flag composition produces correct `FlagEffect` annotations (added/replaced/struck) for `--headless`, `--force`, `--validate-first`, `--calibrate-every` flags
- [ ] Runtime enrichment populates real file counts from `docs/planning/milestones/<milestone>/{stories,tasks}/` and queue stats from `subtasks.json`
- [ ] Function completes instantly (no AI calls, no network, pure computation)
- [ ] Types exported from module can be imported by display and CLI integration modules

### Test Plan
- [ ] Unit test: `computeExecutionPlan()` for single-level `ralph build` returns 1 phase with correct reads/writes/steps
- [ ] Unit test: `computeExecutionPlan()` with `--cascade build` returns all levels from entry point to build
- [ ] Unit test: `--from` flag correctly adjusts cascade start point
- [ ] Unit test: Approval gates resolve to "write" when `--force` is set
- [ ] Unit test: Approval gates resolve to "prompt" when `--review` is set in supervised mode
- [ ] Unit test: Multiple flags compose correctly (e.g., `--headless --force --validate-first` applies all effects)
- [ ] Unit test: Runtime enrichment correctly reads file counts and queue stats from test fixtures
- [ ] Integration test: Create test milestone with 3 stories, 5 tasks, 12 subtasks; verify plan reflects actual counts

### Scope
- **In:**
  - Execution plan computation for all 8 pipeline commands
  - Cascade level expansion with `getLevelsInRange()`
  - Approval gate resolution using existing `evaluateApproval()` function
  - Flag composition with annotation markers
  - Runtime filesystem enrichment (file counts, queue stats)
  - Time estimation heuristics (simple constants)
  - All types and interfaces needed by rendering and CLI layers
- **Out:**
  - Visual rendering (Story 002's responsibility)
  - CLI flag wiring (next task)
  - Cost estimation from historical data (future enhancement)
  - Interactive flag toggling or TUI (not in scope for milestone)

### Notes
- The `LEVEL_FLOWS` constant should include template strings for reads/writes that get populated with runtime data (e.g., `"stories/*.md"` becomes `"stories/*.md (5 files)"`)
- Flag effects should be represented as a discriminated union: `{ type: "added", flag: "--force" }`, `{ type: "replaced", flag: "--headless" }`, `{ type: "struck", flag: "--force" }`
- Approval gate actions should match the existing types from `approvals.ts`: `"write" | "prompt" | "notify-wait" | "exit-unstaged"`
- Time estimates are approximate and marked with `~` prefix; calibration from diary logs is a future enhancement
- The plan must be serializable to JSON for `--headless --dry-run` output
- Use `loadAaaConfig()` to get approvals config and pass to `evaluateApproval()`

### Related Documentation
- @context/blocks/construct/commander.md (CLI option types)
- @context/blocks/construct/ralph-patterns.md (Ralph execution modes and patterns)
- @context/stacks/cli/cli-bun.md (CLI stack overview)
- @context/foundations/test/test-e2e-cli-bun.md (E2E testing with Bun)
