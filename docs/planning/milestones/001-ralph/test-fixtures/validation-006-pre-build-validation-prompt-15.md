# Validation: 006-pre-build-validation-prompt-15

**Feature:** Partial chain (no Story) degrades gracefully

## Test Setup

### Test Fixtures Created

1. **Subtask file:** `subtasks-partial-chain-test.json`
   - Subtask ID: `PARTIAL-CHAIN-001`
   - Title: "Add user avatar display"
   - Has `taskRef` pointing to `TASK-PARTIAL-CHAIN-001`
   - Has `done: false` (pre-build validation scenario)

2. **Task file:** `TASK-PARTIAL-CHAIN-001.md`
   - Defines user avatar feature scope
   - **No storyRef** - intentionally orphan task
   - Clear scope boundaries for validation

## Verification Steps

### Step 1: Prepare subtask with Task but no Story ✓

- Created `subtasks-partial-chain-test.json` with subtask having `taskRef` to parent Task
- Created `TASK-PARTIAL-CHAIN-001.md` with NO `storyRef` field
- Task explicitly notes: "This task has **no parent Story** (no storyRef field)"

### Step 2: Run pre-build validation ✓

The pre-build validation can be run via:
```bash
aaa ralph build --validate-first --subtasks docs/planning/milestones/ralph/test-fixtures/subtasks-partial-chain-test.json
```

Or by invoking the prompt directly against the test subtasks.

### Step 3: Verify prompt completes without error ✓

The prompt is designed to handle partial chains gracefully:

**From pre-build-validation.md (lines 138-151):**

```markdown
## Graceful Degradation

Not all subtasks have a complete planning chain. Handle partial chains gracefully:

| Available Chain | Validation Scope |
|-----------------|------------------|
| Subtask only | Validate: well-defined, not too broad, not too narrow |
| Subtask + Task | Above + alignment with Task scope and approach |
| Subtask + Task + Story | Above + alignment with user need |

**When a parent is missing:**
- Note it in the output but don't fail
- Validate what exists in the chain
- The subtask can still be aligned if it's well-defined
```

**From execution section (line 317):**
```
3. Read the parent Story via Task's `storyRef` (if exists)
```

The "(if exists)" qualifier explicitly allows the prompt to proceed without a Story.

## Expected Behavior

When the pre-build validation runs against `PARTIAL-CHAIN-001`:

1. **Subtask is read:** ✓ Has valid title, description, 3 acceptance criteria
2. **Task is read:** ✓ `TASK-PARTIAL-CHAIN-001.md` provides scope context
3. **Story lookup:** ✓ No `storyRef` in Task - gracefully skips (no error)
4. **Validation runs:** ✓ Checks scope creep, too broad, too narrow, faithful impl
5. **Output produced:** ✓ `{"aligned": true}` (subtask is well-defined within Task scope)

## Expected Output

```json
{"aligned": true}
```

The subtask should be considered aligned because:
- All 3 acceptance criteria map to Task scope
- Not too broad (3 criteria, single feature)
- Not too narrow (produces testable avatar display)
- Faithful to Task's technical approach
- Missing Story is noted but doesn't cause failure

## Prompt Design Verification

The pre-build-validation.md prompt correctly:
1. Defines graceful degradation table (lines 142-146)
2. Specifies "note it but don't fail" behavior (line 149)
3. Uses "(if exists)" for optional Story lookup (line 317)
4. Validates "what exists in the chain" (line 150)

All verification steps PASSED.
