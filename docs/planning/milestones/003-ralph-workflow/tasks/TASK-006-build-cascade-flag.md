# TASK-006: Add --cascade flag to build command

## Overview

Build command can cascade to calibrate.

## Scope

### In Scope

- Add `.option("--cascade <target>")` to build command
- Validate target is only "calibrate" (build can only cascade forward to calibrate)
- After `runBuild()` completes, call `runCascadeFrom("build", "calibrate", options)`

### Out of Scope

- Plan command cascade (TASK-005)
- Full cascade logic (TASK-002)

## Technical Approach

1. Add `--cascade <target>` option to build command
2. Validate that target can only be "calibrate" for build command
3. After runBuild completes successfully, call runCascadeFrom if cascade was requested

## Files

- `tools/src/commands/ralph/index.ts` (modify build command)

## Acceptance Criteria

- [ ] `aaa ralph build --help` shows `--cascade <target>` option
- [ ] `aaa ralph build --cascade subtasks` exits with error (can only cascade to calibrate)
- [ ] `aaa ralph build --cascade calibrate` is valid
- [ ] `bun run typecheck` passes

## Dependencies

- TASK-002 (cascade.ts module)

## Related Docs

- @context/blocks/construct/commander.md
