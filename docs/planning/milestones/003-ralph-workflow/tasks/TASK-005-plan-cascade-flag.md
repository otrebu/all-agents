# TASK-005: Add --cascade flag to plan commands

## Overview

Plan commands can cascade to subsequent levels.

## Scope

### In Scope

- Import `runCascadeFrom`, `validateCascadeTarget` from cascade.ts
- Add `.option("--cascade <target>")` to roadmap, stories, tasks, subtasks commands
- Add `.option("--calibrate-every <n>", parseInt)` to commands that can cascade to build
- After existing command logic, check `options.cascade` and call `runCascadeFrom`
- Use `resolveMilestonePath` for milestone option

### Out of Scope

- Build command cascade (TASK-006)
- Cascade logic implementation (TASK-002)

## Technical Approach

1. Import cascade functions from cascade.ts
2. Add `--cascade <target>` option to plan subcommands (roadmap, stories, tasks, subtasks)
3. Add `--calibrate-every <n>` option for periodic calibration during build
4. After each plan command completes, check if cascade was requested
5. Validate cascade target and call runCascadeFrom if valid

## Files

- `tools/src/commands/ralph/index.ts` (modify plan subcommands)

## Acceptance Criteria

- [ ] `aaa ralph plan subtasks --help` shows `--cascade <target>` option
- [ ] `aaa ralph plan tasks --cascade stories` exits with error (backward cascade)
- [ ] `aaa ralph plan subtasks --cascade invalid` exits with error listing valid targets
- [ ] `bun run typecheck` passes

## Dependencies

- TASK-002 (cascade.ts module)
- TASK-003 (display functions)
- TASK-004 (milestone resolution)

## Related Docs

- @context/blocks/construct/commander.md
