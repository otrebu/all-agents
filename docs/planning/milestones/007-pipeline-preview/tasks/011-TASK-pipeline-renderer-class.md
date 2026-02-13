## Task: Implement PipelineRenderer Class for Live Progress Tracking

**Story:** [003-STORY-live-execution-progress](../stories/003-STORY-live-execution-progress.md)

### Goal
Create a stateful PipelineRenderer class that tracks pipeline phases, subtask progress, and per-phase metrics, rendering a minimal 2-line header with collapsible execution tree.

### Context
The existing `renderCascadeProgress()` in display.ts is a pure function that renders a single-line phase bar. For live execution, we need a stateful class that:
- Tracks current phase, elapsed time, and metrics across multiple updates
- Maintains a 2-line header: phase bar + current subtask progress bar
- Manages ANSI cursor control for in-place updates (headless mode)
- Handles graceful degradation when not a TTY (piped/CI output)
- Cleans up timers on stop/error to prevent resource leaks

This task creates the core renderer class without wiring it into build/cascade commands (that's a separate task).

### Plan
1. Create `tools/src/commands/ralph/pipeline-renderer.ts` with `PipelineRenderer` class
2. Add `PhaseMetrics` interface to track time, cost, files changed per phase
3. Implement constructor accepting phases array, headless flag, isTTY flag
4. Add `startPhase(name: string)` method - marks phase active, starts timer
5. Add `updateSubtask(id: string, description: string, current: number, total: number)` - updates progress bar
6. Add `completePhase(metrics: PhaseMetrics)` - marks phase done, stops timer, stores metrics
7. Add `setApprovalWait(gateName: string)` - sets approval gate symbol on current phase
8. Add `stop()` - cleans up timers, prints final state
9. Implement `render()` private method that outputs 2-line header + collapsible tree
10. Use `process.stdout.isTTY` to control ANSI cursor manipulation (`\x1b[H`, `\x1b[2K` for headless in-place updates)
11. Add phase symbols from MILESTONE.md: `✓` (green), `●` (cyan), `‖` (yellow), `~` (yellow), `✗` (red)
12. Add unit tests in `tools/tests/lib/pipeline-renderer.test.ts` covering TTY/non-TTY modes

### Acceptance Criteria
- [ ] `PipelineRenderer` class exists in `pipeline-renderer.ts`
- [ ] Constructor accepts phases, headless mode, isTTY flag
- [ ] `startPhase()`, `updateSubtask()`, `completePhase()`, `setApprovalWait()`, `stop()` methods work
- [ ] Headless mode uses ANSI cursor control for in-place updates when isTTY=true
- [ ] Supervised mode reprints header on each render call
- [ ] Non-TTY mode degrades to log-style phase headers (no cursor manipulation)
- [ ] Timer cleanup verified - no leaks on stop/error
- [ ] Unit tests pass for all rendering modes

### Test Plan
- [ ] Unit test: instantiate renderer with mock phases, verify initial state
- [ ] Unit test: call `startPhase('build')`, verify phase marked active and timer started
- [ ] Unit test: call `updateSubtask('SUB-001', 'Add auth', 3, 12)`, verify progress tracked
- [ ] Unit test: call `completePhase()`, verify metrics stored and timer stopped
- [ ] Unit test: headless + TTY renders with ANSI cursor codes
- [ ] Unit test: headless + non-TTY renders without cursor codes
- [ ] Unit test: supervised mode reprints full header each render
- [ ] Unit test: `stop()` cleans up timers (mock setTimeout/clearTimeout)

### Scope
- **In:** PipelineRenderer class, rendering logic, TTY detection, timer management, unit tests
- **Out:** Wiring into build.ts/cascade.ts (separate task), E2E tests (separate task), end-of-run summary rendering

### Notes
- ANSI cursor control codes: `\x1b[H` (cursor home), `\x1b[2K` (clear line), `\x1b[<N>A` (move up N lines)
- Use existing BOX_WIDTH constant from display.ts for layout consistency
- Phase symbols mapping (from MILESTONE.md WS-03):
  - `✓` completed (green)
  - `●` running (cyan)
  - `‖` approval gate waiting (yellow)
  - `~` timed wait (yellow)
  - `✗` stopped/failed (red)
- Collapsible tree: completed phases show one-liner with metrics, active phase expands to show subtasks
- Headless in-place update pattern: clear screen, reprint header, move cursor back to top
- Timer leak is the #1 risk - ensure `stop()` is called in error paths

### Related Documentation
- @context/blocks/construct/chalk.md (terminal colors)
- @context/blocks/construct/ralph-patterns.md (Ralph CLI patterns)
- @context/stacks/cli/cli-bun.md (CLI stack)
- @context/foundations/test/test-e2e-cli-bun.md (testing patterns, TTY detection)
