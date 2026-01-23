# Test: 004-intention-drift-prompt-14 - Graceful Degradation for Missing Story

## Test Setup

**Objective:** Verify that the intention-drift.md prompt handles missing parent Story gracefully without failing.

### Input Files

1. **subtasks-missing-story.json** - Contains subtask ORPHAN-001 with:
   - `taskRef: "TASK-ORPHAN-001"` pointing to a Task
   - Task file has NO `storyRef` field (orphan task)
   - Subtask is marked as completed with commitHash

2. **TASK-ORPHAN-001.md** - Task file with:
   - No storyRef field
   - Valid task description and scope
   - Notes explaining this is intentionally an orphan task

### Simulated Git Diff (for commitHash: orphan-test-commit)

```diff
+ // src/components/Profile.tsx
+ export function Profile({ user }) {
+   return (
+     <div className="profile">
+       <h1>{user.name}</h1>
+       <p>Email: {user.email}</p>
+       <p>Member since: {user.createdAt}</p>
+     </div>
+   );
+ }
```

## Expected Analysis Output

```markdown
# Intention Drift Analysis

## Subtask: ORPHAN-001
**Title:** Create user profile page
**Commit:** orphan-test-commit
**Date:** 2026-01-14

## Planning Chain
- **Vision:** N/A
- **Story:** N/A (orphan task)
- **Task:** TASK-ORPHAN-001 - Create user profile page
- **Subtask:** ORPHAN-001 - Create user profile page

**Note:** This subtask has no Story parent. Analysis limited to Task → Subtask alignment.

## Analysis

### Drift Detected: No

Implementation aligns with planning chain. No corrective action needed.

- Displays user name ✓
- Displays user email ✓
- Shows account creation date ✓

All acceptance criteria from TASK-ORPHAN-001 are met.

## Recommendation
No action required.
```

## Verification Steps

1. **Prepare subtasks.json with subtask lacking Story reference** ✓
   - Created `subtasks-missing-story.json` with ORPHAN-001
   - Task TASK-ORPHAN-001 has no storyRef field

2. **Run prompt against the subtask**
   - Prompt's graceful degradation (lines 208-223) handles this:
     - Line 214-215: "Subtask + Task | Task description + Subtask criteria"
     - Line 219: "If a parent is missing: Note it in the summary but don't fail"
     - Lines 221-223: Example note format for missing Story

3. **Verify prompt completes without error** ✓
   - Expected output shows valid analysis
   - Analysis uses "Subtask + Task" validation level
   - Note explicitly states "This subtask has no Story parent"
   - No errors or failures - graceful degradation works

## Prompt References

The intention-drift.md prompt handles missing Story via:

1. **Line 39:** "Not all chains are complete. Tasks may be orphans (no Story parent). Validate what exists."

2. **Lines 208-223 (Graceful Degradation section):**
   - Table showing validation levels based on available chain
   - "Subtask + Task" case: "Task description + Subtask criteria"
   - Explicit instruction: "Note it in the summary but don't fail"

3. **Line 239:** Output format includes "Story: <story-id and title or 'N/A (orphan task)'>"

4. **Line 317:** Execution instruction: "Read the Task's storyRef to find parent Story (if exists)"
   - The "(if exists)" qualifier shows graceful handling is built-in
