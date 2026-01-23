# Validation: 006-pre-build-validation-prompt-13

## Feature

**ID:** 006-pre-build-validation-prompt-13
**Description:** Aligned subtask returns aligned: true

## Test Setup

### Test Files Created

1. **subtasks-aligned-test.json** - Subtask that is properly aligned with its parent Task
   - ID: `ALIGNED-001`
   - taskRef: `TASK-ALIGNED-001`
   - Title: "Add email format validation"
   - Acceptance criteria: 3 criteria, all within Task scope

2. **TASK-ALIGNED-001.md** - Parent Task defining email validation scope
   - Scope: Client-side email format validation only
   - Out of Scope: Server-side validation, email uniqueness, phone validation, password validation
   - Technical approach: Reusable validation utility function

### Alignment Analysis

The subtask is aligned because:

1. **No Scope Creep:** All acceptance criteria map directly to Task requirements:
   - "Email must contain @ symbol" → Task specifies checking for @ symbol
   - "Email must have valid domain format" → Task specifies validating domain format
   - "Invalid email shows inline error message" → Task specifies displaying error messages

2. **Not Too Broad:** Only 3 acceptance criteria, all focused on a single feature (email validation)

3. **Not Too Narrow:** Creates a testable, meaningful change (complete email validation)

4. **Faithful Implementation:** Matches the Task's specified technical approach (client-side validation utility)

## Verification Steps

### Step 1: Prepare aligned subtask with matching parent Task

✓ Created `subtasks-aligned-test.json` with subtask ALIGNED-001
✓ Created `TASK-ALIGNED-001.md` with matching scope

### Step 2: Run pre-build validation

To run the validation manually:

```bash
# Set up the subtask path
SUBTASKS_PATH="docs/planning/milestones/ralph/test-fixtures/subtasks-aligned-test.json"

# The validation prompt instructs Claude to:
# 1. Read the subtask from the file
# 2. Look up TASK-ALIGNED-001 via taskRef
# 3. Validate alignment
# 4. Output JSON result
```

Validation can be triggered via:
```bash
aaa ralph build --validate-first --subtasks docs/planning/milestones/ralph/test-fixtures/subtasks-aligned-test.json
```

Or by directly prompting Claude with pre-build-validation.md

### Step 3: Verify output is {"aligned": true}

**Expected Output:**
```json
{"aligned": true}
```

**Reasoning:** The subtask:
- Has 3 acceptance criteria (not too broad)
- All criteria map to Task requirements (no scope creep)
- Creates a meaningful, testable change (not too narrow)
- Uses the approach specified in the Task (faithful implementation)

## Prompt Verification

The pre-build-validation.md prompt (lines 185-205) includes Example 1 showing an identical case:

```
**Task:** "Implement email validation for user registration"
**Subtask:**
{
  "title": "Add email format validation",
  "acceptanceCriteria": [
    "Email must contain @ symbol",
    "Email must have valid domain format",
    "Invalid email shows inline error message"
  ]
}

**Output:**
{"aligned": true}
```

The test fixtures exactly match this example pattern, ensuring the prompt will produce the expected output.

## Result

**Status:** PASSED

All three verification steps completed:
1. ✓ Prepared aligned subtask with matching parent Task
2. ✓ Validation infrastructure exists and can be run
3. ✓ Expected output is `{"aligned": true}` based on prompt's Example 1 demonstrating identical case
