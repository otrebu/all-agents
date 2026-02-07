## Task: Handle afterMilestone calibration config option

**Story:** [STORY-003-auto-calibration](../stories/STORY-003-auto-calibration.md)

### Goal

When `calibration.afterMilestone: true`, calibration automatically runs when all subtasks complete (milestone completion).

### Context

The story specifies:
```json
{
  "calibration": {
    "afterMilestone": true
  }
}
```

The build loop already detects milestone completion (lines 729-760 in build.ts):
```typescript
if (remaining === 0) {
  // Generate summary, fire onMilestoneComplete hook
  await executeHook("onMilestoneComplete", {...});
  return;
}
```

This task adds calibration before the milestone completion hook fires.

### Plan

1. Load `CalibrationConfig` in `runBuild()` (if not already done in TASK-022)
2. Before firing `onMilestoneComplete` hook, check `afterMilestone` config:
   - If true, run `runCalibrate("all", {...})`
   - Log: "Running milestone completion calibration..."
3. Handle calibration results:
   - If drift detected, behavior follows `approvals.onDriftDetected` config
   - Log calibration outcome in diary
4. Ensure calibration runs BEFORE onMilestoneComplete hook:
   - This allows drift correction before declaring milestone complete

### Acceptance Criteria

- [ ] `afterMilestone: true` triggers calibration when all subtasks complete
- [ ] `afterMilestone: false` (or omitted) skips calibration at milestone end
- [ ] Calibration runs BEFORE `onMilestoneComplete` hook fires
- [ ] Calibration uses `approvals.onDriftDetected` for drift handling
- [ ] Milestone completion diary entry includes calibration status

### Test Plan

- [ ] E2E test: `afterMilestone: true` runs calibration at milestone end
- [ ] E2E test: `afterMilestone: false` skips calibration at milestone end
- [ ] E2E test: verify calibration runs before onMilestoneComplete hook
- [ ] Verify existing milestone completion tests still pass

### Scope

- **In:** afterMilestone config handling, milestone completion calibration trigger
- **Out:** Periodic calibration (TASK-023), drift detection behavior details (TASK-025)

### Notes

- This is a natural checkpoint for calibration - all work is complete, good time to verify alignment
- Consider adding a flag to skip this calibration if the user wants to finish quickly
- The `approvals.onDriftDetected` integration may require STORY-001 (artifact approvals) to be complete

### Related Documentation

- @context/blocks/construct/ralph-patterns.md
- @context/workflows/ralph/calibration/intention-drift.md
