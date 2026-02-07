## Task: Connect calibration to approval system for drift detection

**Story:** [STORY-003-auto-calibration](../stories/STORY-003-auto-calibration.md)

### Goal

When calibration detects drift, the behavior follows the `approvals.onDriftDetected` config setting from STORY-001.

### Context

The story specifies:
- "If drift detected, behavior follows `approvals.onDriftDetected` config"
- "If drift detected mid-build, current iteration completes before calibration pauses/acts"

The approvals system (STORY-001) defines `onDriftDetected` as an ApprovalGate:
```typescript
type ApprovalGate = "correctionTasks" | "createAtomicDocs" | ... | "onDriftDetected" | ...
```

With modes:
- `"always"`: Explicit approval required
- `"auto"`: Immediate action without prompting
- `"suggest"`: Show findings and pause

The calibrate module (`tools/src/commands/ralph/calibrate.ts`) currently just logs results. This task integrates it with the approval system.

### Plan

1. Modify `runCalibrate()` to return drift detection status:
   - Return `{ success: boolean, driftDetected: boolean, findings: DriftFinding[] }`
   - Parse calibration output to detect drift (look for specific markers)
2. In `runPeriodicCalibration()` (build.ts), handle drift detection:
   - Load `approvals.onDriftDetected` from config
   - Call approval evaluation function from STORY-001 tasks
   - Handle each mode appropriately
3. For "suggest" mode during headless builds:
   - Use notify-wait pattern (TASK-014 from STORY-001)
   - Log drift findings to diary
   - Pause build until approval received
4. For "always" mode:
   - TTY: Prompt for approval before continuing
   - Headless: Exit with unstaged changes (TASK-015 pattern)
5. For "auto" mode:
   - Continue build without pausing
   - Log drift findings to diary

### Acceptance Criteria

- [ ] `runCalibrate()` returns drift detection status
- [ ] `approvals.onDriftDetected: "always"` pauses build for approval
- [ ] `approvals.onDriftDetected: "suggest"` shows findings and waits
- [ ] `approvals.onDriftDetected: "auto"` continues without pausing
- [ ] Drift findings are logged to iteration diary
- [ ] Mid-build drift: current iteration completes before calibration acts

### Test Plan

- [ ] Unit test: `runCalibrate()` returns correct drift status
- [ ] E2E test: drift with `onDriftDetected: "always"` pauses build
- [ ] E2E test: drift with `onDriftDetected: "auto"` continues build
- [ ] E2E test: drift findings appear in diary
- [ ] Verify integration with approval evaluation from STORY-001

### Scope

- **In:** Drift detection return value, approval system integration, diary logging
- **Out:** Approval system implementation (STORY-001), calibration prompts themselves

### Notes

- This task depends on STORY-001 approval system being implemented (TASK-010 specifically)
- Consider making drift detection configurable (what constitutes "drift")
- The calibration prompts produce markdown output; parsing this for drift status needs careful implementation
- May need to coordinate with calibration prompts to emit structured markers

### Related Documentation

- @context/blocks/construct/ralph-patterns.md
- @context/workflows/ralph/calibration/intention-drift.md
- STORY-001-artifact-approvals.md (for approval system reference)
