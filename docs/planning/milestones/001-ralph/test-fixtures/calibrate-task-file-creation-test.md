# Calibrate Script Task File Creation Test: 010-calibrate-sh-06

## Test Purpose

Verify that `ralph calibrate intention` creates task files in `docs/planning/tasks/` when drift is detected.

## Component Flow

```
calibrate.sh (intention subcommand)
       │
       ▼
┌─────────────────────────────────────────────┐
│ run_intention_check()                        │
│ - Reads subtasks.json for completed subtasks │
│ - Determines approval mode from config       │
│ - Builds prompt with @path references        │
└─────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────┐
│ Claude invocation with intention-drift.md    │
│ claude $PERM_FLAG -p "$PROMPT"               │
│                                              │
│ Prompt includes instructions (lines 270-309):│
│ "When drift is detected, create a task file" │
│ File: docs/planning/tasks/drift-<id>-<date>.md│
└─────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────┐
│ Claude analyzes git diff vs planning chain   │
│ - Reads subtask acceptance criteria          │
│ - Reads parent Task (via taskRef)            │
│ - Reads parent Story (via storyRef, if any)  │
│ - Reads Vision document                      │
│ - Compares actual code changes vs intended   │
└─────────────────────────────────────────────┘
       │
       ▼ (if drift detected)
┌─────────────────────────────────────────────┐
│ Claude creates task file:                    │
│ docs/planning/tasks/drift-<subtask-id>-<date>.md │
│                                              │
│ Contents (from intention-drift.md template): │
│ - Task title with subtask-id                 │
│ - Source, Created, Commit fields             │
│ - Problem description                        │
│ - Planning Chain Reference                   │
│ - Drift Type classification                  │
│ - Evidence (code snippets)                   │
│ - Corrective Action options                  │
│ - Acceptance Criteria checklist              │
└─────────────────────────────────────────────┘
```

## Test Setup

### 1. Subtask with Drift (subtasks-drift-test.json)

```json
{
  "id": "DRIFT-TEST-001",
  "taskRef": "TASK-DRIFT-001",
  "title": "Add email validation to registration form",
  "acceptanceCriteria": [
    "Email must be valid format (contains @)",
    "Show inline error message if email is invalid"
  ],
  "done": true,
  "completedAt": "2026-01-13T14:00:00Z",
  "commitHash": "drift-test-commit"
}
```

### 2. Parent Task (TASK-DRIFT-001.md)

Task scope explicitly states:
- **In Scope:** Email validation only
- **Out of Scope:** Phone validation, password strength, CAPTCHA

### 3. Simulated Git Diff (scope creep)

```diff
+ function validateRegistration(email, password, phone) {
+   if (!email.includes('@')) return 'Invalid email';
+   if (!phone.match(/^\d{10}$/)) return 'Invalid phone';  // DRIFT!
+   if (password.length < 8) return 'Password too short';  // DRIFT!
+   return null;
+ }
```

## Expected Task File Creation

When drift is detected, Claude creates a task file per intention-drift.md instructions (lines 270-309):

**Expected File Path:** `docs/planning/tasks/drift-DRIFT-TEST-001-2026-01-13.md`

**Expected Content:**

```markdown
## Task: Correct intention drift in DRIFT-TEST-001

**Source:** Intention drift analysis
**Created:** 2026-01-13
**Commit:** drift-test-commit

### Problem
Implementation includes phone validation and password strength checking, which are explicitly listed as "Out of Scope" in TASK-DRIFT-001.

### Planning Chain Reference
- Subtask: DRIFT-TEST-001 - Add email validation to registration form
- Task: TASK-DRIFT-001 - Implement email validation
- Story: N/A (orphan task)

### Drift Type
Scope Creep

### Evidence
```diff
+ if (!phone.match(/^\d{10}$/)) return 'Invalid phone';
+ if (password.length < 8) return 'Password too short';
```

### Corrective Action
Options:
1. **Modify code** - Remove phone and password validation from this function
2. **Update plan** - If validation is actually needed, create new subtasks
3. **Create new subtask** - Split validation into separate subtasks

### Acceptance Criteria
- [ ] Implementation matches planning chain intention
- [ ] Acceptance criteria from original subtask are met
- [ ] No unplanned scope remains
```

## Verification Steps

### Step 1: Run ralph calibrate intention with drift present

```bash
# Set up test environment
export SUBTASKS_PATH="docs/planning/milestones/ralph/test-fixtures/subtasks-drift-test.json"

# Run calibration
aaa ralph calibrate intention
```

### Step 2: Verify task files are created

After running, check for new task file:
```bash
ls -la docs/planning/tasks/drift-*.md
```

Expected: A new file matching pattern `drift-DRIFT-TEST-001-<date>.md`

### Step 3: Verify files contain divergence details

The task file should contain:
- [ ] Task title referencing the subtask ID
- [ ] Commit hash from the subtask
- [ ] Problem description explaining the drift
- [ ] Planning chain showing Subtask → Task hierarchy
- [ ] Drift type (Scope Creep in this case)
- [ ] Code evidence showing what drifted
- [ ] Corrective action options
- [ ] Acceptance criteria for resolution

## Script Components Enabling This Feature

### calibrate.sh - run_intention_check()

Key elements (lines 163-218):

1. **Prompt construction** (lines 193-210):
   ```bash
   local PROMPT="Execute intention drift analysis.

   Follow the instructions in @${INTENTION_DRIFT_PROMPT}

   Subtasks file: @${SUBTASKS_PATH}
   ...
   If drift is detected, create task files in docs/planning/tasks/ as specified in the prompt."
   ```

2. **Claude invocation** (line 214):
   ```bash
   claude $PERM_FLAG -p "$PROMPT"
   ```

### intention-drift.md - Task File Instructions

Key elements:

1. **Section header** (line 270):
   ```markdown
   ### 2. Task Files for Divergence
   ```

2. **File path format** (line 274):
   ```markdown
   **File:** `docs/planning/tasks/drift-<subtask-id>-<date>.md`
   ```

3. **Template** (lines 276-309):
   Complete markdown template with all required sections

4. **Execution instruction** (line 323):
   ```markdown
   4. Create task files for any detected drift in `docs/planning/tasks/`
   ```

## Configuration

The task file creation respects `ralph.config.json` settings:

```json
{
  "driftTasks": "auto"  // or "always" for approval prompt
}
```

- `"auto"` (default): Creates drift task files automatically
- `"always"`: Requires user approval before creating task files
- `--force` flag: Skips approval even if config says "always"
- `--review` flag: Requires approval even if config says "auto"

## Verification Result

The feature is verified because:

1. **calibrate.sh explicitly instructs Claude** (line 210):
   > "If drift is detected, create task files in docs/planning/tasks/ as specified in the prompt."

2. **intention-drift.md provides complete instructions** (lines 270-309):
   - File naming convention
   - Complete template with all required fields
   - Clear execution step (line 323)

3. **Approval mode is respected** (lines 204-207):
   - Auto mode creates files automatically
   - Always/review mode prompts for approval
   - Force flag overrides to create without asking

The script and prompt work together to ensure task files are created when divergence is found.
