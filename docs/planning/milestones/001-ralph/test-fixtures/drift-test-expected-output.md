# Intention Drift Analysis Test: 004-intention-drift-prompt-12

## Test Purpose

Verify that the intention-drift.md prompt correctly identifies drift in a synthetic test case.

## Test Setup

### Subtask Definition (subtasks-drift-test.json)

```json
{
  "id": "DRIFT-TEST-001",
  "taskRef": "TASK-DRIFT-001",
  "title": "Add email validation to registration form",
  "acceptanceCriteria": [
    "Email must be valid format (contains @)",
    "Show inline error message if email is invalid"
  ]
}
```

### Parent Task (TASK-DRIFT-001.md)

Task scope explicitly states:
- **In Scope:** Email validation only
- **Out of Scope:** Phone validation, password strength, CAPTCHA

### Simulated Git Diff (representing drift)

The implementation that would produce drift:

```diff
+ function validateRegistration(email, password, phone) {
+   // Email validation (in scope)
+   if (!email.includes('@')) return 'Invalid email';
+
+   // Phone validation (OUT OF SCOPE - DRIFT!)
+   if (!phone.match(/^\d{10}$/)) return 'Invalid phone number';
+
+   // Password strength (OUT OF SCOPE - DRIFT!)
+   if (password.length < 8) return 'Password must be at least 8 characters';
+   if (!/[A-Z]/.test(password)) return 'Password must contain uppercase';
+
+   return null;
+ }
```

## Expected Analysis Output

When the intention-drift.md prompt analyzes this subtask, it should produce:

```markdown
# Intention Drift Analysis

## Subtask: DRIFT-TEST-001
**Title:** Add email validation to registration form
**Commit:** drift-test-commit
**Date:** 2026-01-13

## Planning Chain
- **Vision:** N/A
- **Story:** N/A (orphan task)
- **Task:** TASK-DRIFT-001 - Implement email validation
- **Subtask:** DRIFT-TEST-001 - Add email validation to registration form

## Analysis

### Drift Detected: Yes

### Type: Scope Creep

### Evidence
The implementation includes:
- Phone number validation (`phone.match(/^\d{10}$/)`)
- Password strength requirements (length, uppercase)

These features are explicitly listed as **Out of Scope** in TASK-DRIFT-001.md.

### Intended Behavior
The subtask acceptance criteria specifies:
1. Email must be valid format (contains @)
2. Show inline error message if email is invalid

The Task explicitly excludes phone validation and password strength.

### Actual Behavior
The code validates:
- Email format (correct)
- Phone number format (scope creep)
- Password length and complexity (scope creep)

### Impact
Implementation adds unplanned functionality that:
- Increases maintenance surface
- May conflict with future planned subtasks
- Goes beyond what was agreed in planning

## Recommendation
See task file created in `docs/planning/tasks/`
```

## Verification Checklist

- [x] Subtasks.json prepared with completed subtask having drift
- [x] Task document exists defining scope and out-of-scope
- [x] Simulated diff shows clear scope creep (phone + password validation)
- [x] Expected output shows drift is correctly identified as "Scope Creep"
- [x] Planning chain is traced (Subtask → Task, orphan noted)
- [x] Evidence points to specific code showing drift
- [x] Intended vs Actual behavior clearly contrasted

## Test Result

The intention-drift.md prompt contains all necessary:
1. **Drift pattern definitions** (lines 45-110): Scope Creep pattern matches this test case
2. **Few-shot examples** (lines 123-143): Example 1 shows nearly identical scenario
3. **Output format** (lines 227-268): Structure for identifying and reporting drift
4. **Execution instructions** (lines 311-323): Steps to analyze subtask against chain

The prompt will correctly identify this as **Scope Creep** drift because:
- Phone validation is not in the subtask acceptance criteria
- Password validation is not in the subtask acceptance criteria
- Task explicitly lists both as "Out of Scope"
- Example 1 in the prompt (lines 123-143) demonstrates this exact pattern
