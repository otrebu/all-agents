# TASK-001: Add cascade types to types.ts

## Overview

Define TypeScript interfaces for cascade options and results.

## Scope

### In Scope

- Add `CascadeOptions` interface with milestone, force, headless, calibrateEvery fields
- Add `CascadeResult` interface with success, completedLevels, stoppedAt, error fields
- Add `CascadeLevel` type for level definitions

### Out of Scope

- Implementation of cascade logic (TASK-002)
- Display functions (TASK-003)

## Technical Approach

1. Add `CascadeOptions` interface with optional fields for cascade configuration
2. Add `CascadeResult` interface to track cascade execution results
3. Add `CascadeLevel` type for level definitions with name and order
4. Export all new types from types.ts

## Files

- `tools/src/commands/ralph/types.ts` (modify)

## Acceptance Criteria

- [ ] `CascadeOptions` interface exported from types.ts
- [ ] `CascadeResult` interface exported from types.ts
- [ ] `CascadeLevel` type exported from types.ts
- [ ] `bun run typecheck` passes with no errors

## Dependencies

- None

## Related Docs

- @context/blocks/construct/bun.md
