# Calibrate Script No Task Files Test: 010-calibrate-sh-15

## Test Purpose

Verify that `ralph calibrate intention` does NOT create any task files when no drift is detected. This is the inverse verification of 010-calibrate-sh-06 (which verifies task files ARE created when drift exists).

## Requirements

From intention-drift.md output format (lines 247-248, 267):

> `<If no drift:>`
> `Implementation aligns with planning chain. No corrective action needed.`
> ...
> `<If no drift:> No action required.`

And (lines 270-272):

> `### 2. Task Files for Divergence`
> `When drift is detected, create a task file:`

**Key Point:** Task files are only created "when drift is detected" - if no drift, no task file should be created.

## Test Setup

### Reuse Existing "No Drift" Test Fixtures

This test uses the existing acceptable-variation test fixtures:

1. **Subtasks file:** `subtasks-acceptable-variation.json`
   - Subtask ID: ACCEPT-VAR-001
   - Implements only email validation (matches acceptance criteria)
   - No phone, password, or CAPTCHA validation added

2. **Parent Task:** `TASK-ACCEPT-001.md`
   - Scope: Email validation only
   - Out of Scope: Phone, password, CAPTCHA

3. **Expected Analysis:** "NO DRIFT" - Acceptable variation
   - Empty/length/whitespace checks are acceptable edge case handling
   - Core @ check is implemented
   - No scope creep

## Verification Steps

### Step 1: Record existing drift task files

Before running the test, record which drift files already exist:

```bash
# List existing drift task files
ls -la docs/planning/tasks/drift-*.md 2>/dev/null | wc -l
```

Save this count for comparison.

### Step 2: Run ralph calibrate intention with no-drift subtask

```bash
# Set up test environment with acceptable-variation subtasks
export SUBTASKS_PATH="docs/planning/milestones/ralph/test-fixtures/subtasks-acceptable-variation.json"

# Run calibration
aaa ralph calibrate intention
```

### Step 3: Verify no NEW task files are generated

```bash
# Count drift task files after test
ls -la docs/planning/tasks/drift-*.md 2>/dev/null | wc -l
```

**Expected Result:** Count should be the same as Step 1 (no new files created).

Specifically, there should be NO file matching:
- `docs/planning/tasks/drift-ACCEPT-VAR-001-*.md`

### Step 4: Verify stdout shows "No action required"

The Claude output should contain:

```markdown
### Drift Detected: No

Implementation aligns with planning chain. No corrective action needed.

...

## Recommendation
No action required.
```

## Verification Logic

The verification passes when ALL conditions are met:

1. **No new drift files created** - File count before and after is the same
2. **No ACCEPT-VAR-001 drift file** - No file matching `drift-ACCEPT-VAR-001-*.md` exists
3. **Stdout shows "No action required"** - Analysis output confirms no drift

## Why This Works

### intention-drift.md Prompt Design

The prompt explicitly conditions task file creation on drift detection:

**Lines 270-272:**
```markdown
### 2. Task Files for Divergence

When drift is detected, create a task file:
```

**Line 323:**
```markdown
4. Create task files for any detected drift in `docs/planning/tasks/`
```

The phrasing "when drift is detected" and "for any detected drift" means:
- **Drift detected** → Create task file
- **No drift detected** → No task file created

### Acceptable Variation Criteria (lines 55-58)

The test subtask meets acceptable variation criteria:
- Empty check = edge case implied by acceptance criteria
- Length check = defensive coding / following patterns
- Whitespace handling = edge case handling

These are NOT flagged as drift per Example 2 (lines 145-166).

## Contrast with Task Creation Test (010-calibrate-sh-06)

| Feature | 010-calibrate-sh-06 | 010-calibrate-sh-15 (this test) |
|---------|---------------------|--------------------------------|
| Subtask | DRIFT-TEST-001 | ACCEPT-VAR-001 |
| Code changes | Adds phone + password validation | Only email validation with edge cases |
| Drift detected | YES (Scope Creep) | NO (Acceptable Variation) |
| Task file created | YES | NO |
| Task file path | `drift-DRIFT-TEST-001-*.md` | (none) |

## Test Result

The feature is verified when:

1. Running calibration with no-drift subtask produces no new task files
2. Stdout shows "No action required" or equivalent
3. No drift-ACCEPT-VAR-001-*.md file exists in docs/planning/tasks/

This confirms the intention-drift.md prompt correctly distinguishes between:
- **Scope Creep** → Create corrective task file
- **Acceptable Variation** → No task file, just analysis report
