## Task: Wire PipelineRenderer into Build and Cascade Commands

**Story:** [003-STORY-live-execution-progress](../stories/003-STORY-live-execution-progress.md)

### Goal
Integrate PipelineRenderer into runBuild() and runCascadeFrom() so that live pipeline progress displays during autonomous execution.

### Context
Task 011 created the PipelineRenderer class. Now we need to instantiate it in the build and cascade loops and call its methods at the right lifecycle points. The renderer should:
- Start when the command begins (after initial banner)
- Update on each subtask/iteration transition
- Show approval gates when waiting
- Complete phases as cascade progresses
- Stop cleanly on error, early exit, or completion

Existing code in build.ts has iteration start/end hooks (`renderIterationStart`, `renderIterationEnd`). We'll extend these to also update the renderer. Cascade.ts has phase transitions where we'll call `startPhase()` and `completePhase()`.

### Plan
1. Add PipelineRenderer import to `tools/src/commands/ralph/build.ts`
2. In `runBuild()`, instantiate PipelineRenderer after loading subtasks, before loop starts
3. Detect TTY: `const isTTY = Boolean(process.stdin.isTTY && process.stdout.isTTY)`
4. Pass phases array to renderer: `['build']` for single build, cascade phases for cascade mode
5. Call `renderer.startPhase('build')` before iteration loop
6. In iteration loop, after picking next subtask, call `renderer.updateSubtask(subtask.id, subtask.description, currentIndex, totalCount)`
7. On loop completion, call `renderer.completePhase({ filesCreated: N, timeElapsed: durationMs, cost: totalCost })`
8. Add try/finally block to ensure `renderer.stop()` is called on error or early exit
9. Add PipelineRenderer import to `tools/src/commands/ralph/cascade.ts`
10. In `runCascadeFrom()`, instantiate PipelineRenderer with full cascade phases before level loop
11. Call `renderer.startPhase(currentLevel.name)` at start of each cascade level
12. On approval gate wait, call `renderer.setApprovalWait(gateName)`
13. After level completes, call `renderer.completePhase({ ... })` with level metrics
14. Add try/finally to ensure `renderer.stop()` on cascade error/abort

### Acceptance Criteria
- [ ] PipelineRenderer instantiated in `runBuild()` with correct phases and mode flags
- [ ] Renderer updates on each subtask transition in build loop
- [ ] Renderer starts/completes phase correctly in build command
- [ ] PipelineRenderer instantiated in `runCascadeFrom()` with full cascade phases
- [ ] Renderer updates on each cascade level transition
- [ ] Approval gate wait triggers `setApprovalWait()` call
- [ ] `renderer.stop()` called in finally blocks to prevent timer leaks
- [ ] Existing terminal output (iteration boxes, summaries) still works correctly
- [ ] No duplicate/conflicting progress indicators

### Test Plan
- [ ] Manual test: `aaa ralph build --headless` shows live 2-line header updating in-place
- [ ] Manual test: `aaa ralph build --supervised` reprints header before each iteration
- [ ] Manual test: `aaa ralph plan stories --cascade build` shows phase transitions in header
- [ ] Manual test: Ctrl+C during build/cascade stops cleanly (renderer.stop() called)
- [ ] Manual test: Pipe output to file (`aaa ralph build | tee log.txt`) degrades gracefully (no ANSI codes)
- [ ] E2E test: verify build completes without errors (existing tests should pass)

### Scope
- **In:** Wiring renderer into build.ts and cascade.ts, lifecycle calls, error cleanup
- **Out:** Renderer implementation (already done in Task 011), E2E tests for rendering output (separate task), end-of-run summary logic

### Notes
- The renderer is fire-and-forget: it prints to stdout but doesn't block execution
- Supervised mode complexity: Claude TUI takes over terminal between iterations, so header must reprint before each iteration (not persist in-place)
- Headless mode complexity: ANSI cursor control for persistent header requires TTY detection
- Timer cleanup is critical: use try/finally blocks to ensure `renderer.stop()` is always called
- Metrics to pass to `completePhase()`: extract from existing summary data structures (BuildPracticalSummary, CascadeResult)
- The renderer should coexist with existing output (iteration boxes, summaries) - it's additive, not a replacement

### Related Documentation
- @context/blocks/construct/ralph-patterns.md (Ralph CLI patterns, supervised vs headless)
- @context/stacks/cli/cli-bun.md (CLI stack)
- Task 011 (PipelineRenderer class implementation)
