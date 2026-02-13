## Task: Wire Approval Gate Status Into Pipeline Header

**Story:** [004-STORY-approval-gate-visibility](../stories/004-STORY-approval-gate-visibility.md)

### Goal
The pipeline header uses a distinct symbol (`‖`) for gates in waiting state, differentiating from running (`●`) and complete (`✓`), so users can see at a glance when execution is paused at an approval gate.

### Context
Story 003 introduced `PipelineRenderer` class with a live pipeline header that shows phase status using symbols: `✓` (completed), `●` (running), `○` (pending). When an approval gate is reached and execution pauses for user input, the header should show a distinct `‖` (pause bars) symbol to indicate waiting state.

This task adds the approval waiting state to `PipelineRenderer` and wires it into the existing `setApprovalWait()` method that was stubbed in Story 003. The key integration point: when `checkApprovalGate()` in `cascade.ts` reaches a gate, it should call `renderer.setApprovalWait(level)` to update the header, then show the approval card (Task 017), then update the header again when resuming.

**Dependencies:**
- Story 003 (PipelineRenderer) must be complete—`PipelineRenderer` class with `setApprovalWait()` method should exist
- Task 017 (approval card) should be complete for full integration—but header logic can be implemented independently

### Plan
1. Review `PipelineRenderer` class in `tools/src/commands/ralph/pipeline-renderer.ts` and locate `setApprovalWait()` method stub
2. Implement `setApprovalWait(level: string)` to update the internal phase status map with a new `"waiting"` state
3. Extend phase state type to include `"waiting"` in addition to `"completed"`, `"running"`, `"pending"`
4. Update `renderPipelineHeader()` (or equivalent header rendering function) to map `"waiting"` state to `‖` symbol with yellow color
5. Add symbol color mapping: `✓` green, `●` cyan, `‖` yellow, `~` yellow (timed wait), `✗` red, `○` dim
6. Integrate with `checkApprovalGate()` in `cascade.ts`: call `renderer.setApprovalWait(level)` before approval prompt, call `renderer.startPhase(nextLevel)` after approval granted
7. Add unit tests for symbol rendering with all phase states
8. Test live pipeline header in supervised mode with approval gates

### Acceptance Criteria
- [ ] Pipeline header shows `‖` symbol for phases in approval waiting state
- [ ] Symbol is visually distinct (yellow color, pause bars character)
- [ ] `PipelineRenderer.setApprovalWait(level)` updates phase status to waiting and re-renders header
- [ ] After approval is granted, header updates to show next phase as running
- [ ] Works in both supervised (visible header) and headless (header in logs) modes
- [ ] Consistent with other phase symbols in header (✓, ●, ○, ✗)

### Test Plan
- [ ] Unit test: `setApprovalWait()` updates phase status to `"waiting"`
- [ ] Unit test: `renderPipelineHeader()` with waiting state returns header containing `‖` symbol
- [ ] Unit test: Symbol color is yellow for waiting state
- [ ] E2E test: Run cascade with approval gate in supervised mode, verify header shows `‖` during approval prompt
- [ ] Manual test: Run `aaa ralph plan stories --milestone M1 --cascade tasks` in supervised mode, watch header change to `‖` at gate, then change to `●` after approval

### Scope
- **In:** Pipeline header gate symbol rendering, `setApprovalWait()` implementation, symbol color mapping, integration with cascade approval flow
- **Out:** Approval card rendering (Task 017), gate preview in dry-run (Task 016), approval decision logic (already in `approvals.ts`), full PipelineRenderer implementation (Story 003)

### Notes
- Symbol reference from MILESTONE.md:
  - `✓` Completed (green)
  - `●` Currently running (cyan)
  - `‖` Approval gate waiting (yellow)
  - `~` Timed wait notify-wait (yellow)
  - `✗` Stopped/failed (red)
  - `○` Not yet started (dim)
- The `‖` character is Unicode U+2016 (double vertical line)—distinct from `||` or `|`
- If `‖` doesn't render well in some terminals, consider fallback to `||` or `[WAIT]` text
- The waiting state should be ephemeral—it only appears during user interaction, then transitions to running or completed
- In headless mode, the waiting state may be very brief (for notify-wait) or result in exit-unstaged (process stops)

### Related Documentation
- @context/blocks/construct/chalk.md
- @context/blocks/construct/ralph-patterns.md
- @context/stacks/cli/cli-bun.md
- @context/foundations/test/test-e2e-cli-bun.md
