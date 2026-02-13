## Story: Live Execution Progress During Builds and Cascades

### Narrative
As a developer running long autonomous builds, I want a live pipeline header showing which phase is active, how many subtasks are done, and per-phase metrics so that I can monitor progress without reading raw terminal output.

### Persona
A developer who runs `ralph build` in supervised or headless mode, often for 30-60+ minutes. They check in periodically to see how things are going. Currently they have to scroll through verbose Claude output or check `ralph status` manually. They want at-a-glance progress: where in the pipeline, which subtask, how many left, elapsed time.

### Context
Ralph builds can process dozens of subtasks across multiple cascade phases. Without live progress, developers either watch the terminal constantly (defeating the "humans on the loop" philosophy) or lose track entirely. A persistent pipeline header with phase symbols and a subtask progress bar gives the right level of awareness. Completed phases collapse to one-liners with metrics; the active phase expands to show individual subtask status.

### Acceptance Criteria
- [ ] A 2-line pipeline header shows current position: phase bar with status symbols (`checkmark`, `dot`, `pause`, `x`) and current subtask with progress bar
- [ ] In headless mode, the header updates in-place (ANSI cursor control) so the terminal shows a persistent status display
- [ ] In supervised mode, the header reprints before each iteration (since Claude TUI takes over between iterations)
- [ ] Completed phases collapse to one-liners with metrics (files created, time elapsed, cost)
- [ ] The active phase expands to show individual subtask statuses (done, in-progress, pending)
- [ ] When not a TTY (piped output or CI), the renderer degrades gracefully to log-style phase headers without cursor manipulation

### Tasks
- [ ] [TASK-011: Implement PipelineRenderer Class](../tasks/011-TASK-pipeline-renderer-class.md)
- [ ] [TASK-012: Wire Renderer into Build and Cascade](../tasks/012-TASK-wire-renderer-into-build-cascade.md)
- [ ] [TASK-013: Add PipelineRenderer Types](../tasks/013-TASK-add-types-for-renderer.md)
- [ ] [TASK-014: E2E Tests for PipelineRenderer](../tasks/014-TASK-e2e-tests-pipeline-renderer.md)

### Notes
- The `PipelineRenderer` class is stateful: tracks current phase, subtask progress, per-phase metrics
- Timer cleanup is critical to avoid resource leaks on error or early exit
- End-of-run summary shows all phases with totals (time, cost, files, lines changed)
- Maps to WS-03 (Live Execution Pipeline Header + Tree) from the milestone plan
