# Validation: 008-status-sh-11

**Feature**: Test with populated subtasks.json
**Date**: 2026-01-14
**Status**: PASSED

## Test Setup

Used existing test fixture: `docs/planning/milestones/ralph/test-fixtures/subtasks.json`

The test fixture contains 4 subtasks:
- 2 completed (test-001, test-002)
- 2 pending (test-003, test-004)
- All have taskRef pointing to `docs/planning/milestones/ralph/tasks/...`

## Command Executed

```bash
bash tools/src/commands/ralph/scripts/status.sh docs/planning/milestones/ralph/test-fixtures/subtasks.json
```

## Output Verification

### Milestone Display
- **Expected**: Milestone extracted from taskRef path
- **Actual**: `Milestone: ralph` - Correctly extracted

### Subtask Counts
- **Expected**: 2 done, 4 total
- **Actual**: `Progress: [██████████░░░░░░░░░░] 2/4 (50%)` - Correct

### Last Completed Subtask
- **Expected**: test-002 with timestamp 2026-01-14T09:15:00Z
- **Actual**: `Last done: test-002 (2026-01-14 09:15)` - Correct

### Next Subtask
- **Expected**: test-003 with title
- **Actual**:
  ```
  Next up:   test-003
             Next subtask to implement
  ```
  - Correct ID and title displayed

## Conclusion

All verification steps passed:
1. Subtasks.json with multiple entries was used
2. status.sh ran successfully
3. All counts (2/4) and data displayed correctly:
   - Milestone name
   - Progress bar with done/total ratio
   - Last completed subtask with timestamp
   - Next pending subtask with ID and title
