## Task: Add PipelineRenderer Types to types.ts

**Story:** [003-STORY-live-execution-progress](../stories/003-STORY-live-execution-progress.md)

### Goal
Add type definitions for PipelineRenderer to tools/src/commands/ralph/types.ts, including phase status, metrics, and renderer options.

### Context
The PipelineRenderer class (Task 011) needs TypeScript interfaces for:
- Phase status (pending/active/completed/waiting/failed)
- Per-phase metrics (time, cost, files, lines changed)
- Renderer initialization options
- Phase state tracking

These types should be exported from types.ts (the central Ralph types module) so they're available to both the renderer implementation and the build/cascade commands that use it.

### Plan
1. Open `tools/src/commands/ralph/types.ts`
2. Add `PhaseStatus` type: `'pending' | 'active' | 'completed' | 'waiting' | 'failed'`
3. Add `PhaseMetrics` interface with fields: `timeElapsedMs`, `costUsd`, `filesChanged`, `linesAdded`, `linesRemoved`
4. Add `PhaseState` interface with fields: `name`, `status`, `startTimeMs?`, `metrics?`
5. Add `PipelineRendererOptions` interface with fields: `phases`, `headless`, `isTTY`
6. Add `SubtaskProgress` interface with fields: `id`, `description`, `current`, `total`
7. Add JSDoc comments for each type explaining purpose and usage
8. Export all new types at bottom of file
9. Verify no naming conflicts with existing types

### Acceptance Criteria
- [ ] `PhaseStatus` type defined with 5 valid states
- [ ] `PhaseMetrics` interface defined with time, cost, file, and line change fields
- [ ] `PhaseState` interface defined for internal renderer state tracking
- [ ] `PipelineRendererOptions` interface defined for renderer constructor
- [ ] `SubtaskProgress` interface defined for progress bar updates
- [ ] All types exported from types.ts
- [ ] JSDoc comments added for each type
- [ ] No TypeScript errors in types.ts

### Test Plan
- [ ] Run `bun run typecheck` in tools/ directory - no errors
- [ ] Import new types in pipeline-renderer.ts - no errors
- [ ] Import new types in build.ts and cascade.ts - no errors

### Scope
- **In:** Type definitions in types.ts, JSDoc comments, exports
- **Out:** Renderer implementation (Task 011), wiring logic (Task 012), tests

### Notes
- Follow existing types.ts patterns: JSDoc comments at interface level, group related types together
- `PhaseMetrics` should be optional fields - not all phases track all metrics (e.g., planning phases don't change code)
- `timeElapsedMs` should be number (milliseconds), not Duration or human-readable string
- `costUsd` should be number, not formatted string
- Keep types minimal - avoid adding fields that aren't used yet (YAGNI principle)
- The renderer uses these types but they're also useful for future features (calibration metrics, end-of-run reports)

### Related Documentation
- @context/blocks/construct/ralph-patterns.md (Ralph patterns)
- Task 011 (PipelineRenderer implementation needs these types)
