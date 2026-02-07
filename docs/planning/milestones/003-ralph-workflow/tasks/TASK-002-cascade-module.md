# TASK-002: Create cascade.ts orchestration module

## Overview

Core cascade logic that chains levels and handles confirmations.

## Scope

### In Scope

- Define LEVELS constant with order, names, requirements
- Implement `validateCascadeTarget(from, to)` - returns error if invalid
- Implement `getLevelsInRange(from, to)` - returns levels to run
- Implement `promptContinue(completed, next)` - TTY-aware Y/n prompt
- Implement `runLevel(level, options)` - dispatch to existing functions
- Implement `runCascadeFrom(start, target, options, contextRoot)` - main loop

### Out of Scope

- Display rendering (TASK-003)
- CLI flag integration (TASK-005, TASK-006)

## Technical Approach

1. Define LEVELS constant array with level definitions (name, order, requiresMilestone)
2. Implement validation functions for cascade targets
3. Implement TTY-aware prompt for user confirmation between levels
4. Implement level dispatcher that calls existing plan/build functions
5. Implement main cascade loop that executes levels in sequence

## Files

- `tools/src/commands/ralph/cascade.ts` (create ~300 lines)
- `tools/src/commands/ralph/build.ts` (import runBuild)
- `tools/src/commands/ralph/calibrate.ts` (import runCalibrate)

## Acceptance Criteria

- [ ] `validateCascadeTarget("tasks", "stories")` returns error (backward)
- [ ] `validateCascadeTarget("subtasks", "build")` returns null (valid)
- [ ] `getLevelsInRange("stories", "build")` returns ["tasks", "subtasks", "build"]
- [ ] `promptContinue` returns true on "y", "Y", "", false on "n"
- [ ] `bun run typecheck` passes

## Dependencies

- TASK-001 (cascade types)

## Related Docs

- @context/blocks/construct/commander.md
- @context/blocks/construct/bun.md
