# TASK-003: Add cascade display functions

## Overview

Progress rendering and summary box for cascade output.

## Scope

### In Scope

- Add `renderCascadeProgress(current, completed, remaining)` - shows level progression
- Add `renderCascadeSummary(result: CascadeResult)` - boxen summary at end
- Follow existing display.ts patterns (chalk, boxen)

### Out of Scope

- Cascade logic (TASK-002)
- CLI integration (TASK-005, TASK-006)

## Technical Approach

1. Add `renderCascadeProgress` function that shows visual progression like `[stories] ✓ → [tasks] ◉ → subtasks → build`
2. Add `renderCascadeSummary` function that renders a boxen summary with completed levels
3. Use existing chalk and boxen patterns from display.ts

## Files

- `tools/src/commands/ralph/display.ts` (modify, ~40 lines)

## Acceptance Criteria

- [ ] `renderCascadeProgress("tasks", ["stories"], ["subtasks", "build"])` shows `[stories] ✓ → [tasks] ◉ → subtasks → build`
- [ ] `renderCascadeSummary` renders boxen with completed levels
- [ ] `bun run typecheck` passes

## Dependencies

- TASK-001 (cascade types for CascadeResult)

## Related Docs

- @context/blocks/construct/chalk.md
- @context/blocks/construct/boxen.md
