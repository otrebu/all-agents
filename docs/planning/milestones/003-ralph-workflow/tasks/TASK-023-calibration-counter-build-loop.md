## Task: Integrate calibration counter into build loop

**Story:** [STORY-003-auto-calibration](../stories/STORY-003-auto-calibration.md)

### Goal

The build loop tracks iterations since last calibration and triggers `ralph calibrate all` at the configured interval.

### Context

The build loop in `tools/src/commands/ralph/build.ts` already has a `runPeriodicCalibration()` function (lines 902-910):
```typescript
function runPeriodicCalibration(options: PeriodicCalibrationOptions): void {
  const { calibrateEvery, contextRoot, iteration, subtasksPath } = options;
  if (calibrateEvery > 0 && iteration % calibrateEvery === 0) {
    console.log(`\n=== Running calibration (every ${calibrateEvery} iterations) ===\n`);
    runCalibrate("all", { contextRoot, subtasksPath });
  }
}
```

This uses the global iteration counter, but the story requires tracking iterations "since last calibration" - which is subtly different. The counter should reset after ANY calibration (automatic or manual).

Key requirements from story:
- Counter tracks iterations since last calibration
- Counter resets to zero after ANY calibration
- Calibration runs BETWEEN iterations (after commit, before next subtask)
- Uses completed subtasks since last calibration (not all completed)

### Plan

1. Add `lastCalibrationIteration` variable to track when calibration last ran
2. Modify `runPeriodicCalibration()` to:
   - Calculate iterations since last calibration: `iteration - lastCalibrationIteration`
   - Trigger calibration when this count reaches `calibrateEvery`
   - Update `lastCalibrationIteration` after calibration runs
3. Add status output showing calibration schedule:
   - "Calibration: every 10 iterations (next at iteration 7)"
4. Log calibration events to iteration diary:
   - Add `type: 'calibration'` entry to diary when calibration runs
5. Handle calibration running BETWEEN iterations:
   - Move calibration call to after `didComplete` check
   - Ensure calibration runs after commit but before next subtask pickup

### Acceptance Criteria

- [ ] Counter tracks iterations since last calibration (not global iteration count)
- [ ] Counter resets to zero after calibration runs
- [ ] `ralph calibrate all` is invoked when counter reaches `calibrateEvery`
- [ ] Calibration runs BETWEEN iterations (after commit, before next subtask)
- [ ] Status output shows: "Calibration: every 10 iterations (next at iteration 7)"
- [ ] Iteration diary logs calibration events
- [ ] Build loop resumes after calibration completes

### Test Plan

- [ ] Unit test: counter resets after calibration
- [ ] Unit test: calibration triggers at correct interval
- [ ] E2E test: build with `--calibrate-every 2` runs calibration after every 2 subtasks
- [ ] E2E test: verify diary contains calibration entries
- [ ] Run existing ralph E2E tests to ensure no regressions

### Scope

- **In:** Calibration counter, trigger logic, status output, diary logging
- **Out:** afterMilestone handling (TASK-024), drift detection behavior (TASK-025)

### Notes

- The existing implementation uses `iteration % calibrateEvery` which triggers based on global count, not since-last-calibration count
- Need to track `lastCalibrationIteration` separately from `iteration` variable
- Consider adding a module-level variable or passing through options
- The calibration should use "completed subtasks since last calibration" for its analysis - this may require passing a range to `runCalibrate()`

### Related Documentation

- @context/blocks/construct/ralph-patterns.md
- @context/workflows/ralph/calibration/intention-drift.md
