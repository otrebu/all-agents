# TASK-004: Add milestone name resolution

## Overview

`--milestone` accepts both name ("001-mvp") and full path.

## Scope

### In Scope

- Add `resolveMilestonePath(nameOrPath)` function
- If path exists, return as-is
- If name, search `docs/planning/milestones/<name>/` and return if found
- Throw descriptive error if not found

### Out of Scope

- CLI integration (handled when cascade flags are added)
- Cascade logic

## Technical Approach

1. Add `resolveMilestonePath(nameOrPath: string)` function to config.ts
2. Check if input is an existing path - return as-is if so
3. If not a path, search for `docs/planning/milestones/<name>/` directory
4. If found, return the resolved path
5. If not found, throw error listing available milestones

## Files

- `tools/src/commands/ralph/config.ts` (modify)

## Acceptance Criteria

- [ ] `resolveMilestonePath("001-mvp")` returns full path if milestone exists
- [ ] `resolveMilestonePath("/full/path/to/milestone")` returns path as-is
- [ ] `resolveMilestonePath("nonexistent")` throws with helpful error listing available milestones
- [ ] `bun run typecheck` passes

## Dependencies

- None (can run in parallel with TASK-001)

## Related Docs

- @context/blocks/construct/bun.md
