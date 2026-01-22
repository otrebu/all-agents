# Intention Drift Analysis Test: 004-intention-drift-prompt-13

## Test Purpose

Verify that the intention-drift.md prompt does NOT flag acceptable variation as drift. This tests the prompt's ability to distinguish between scope creep (flag) and reasonable engineering decisions (don't flag).

## Test Setup

### Subtask Definition (subtasks-acceptable-variation.json)

```json
{
  "id": "ACCEPT-VAR-001",
  "taskRef": "TASK-ACCEPT-001",
  "title": "Add email validation to user settings form",
  "acceptanceCriteria": [
    "Email must be valid format (contains @)",
    "Show inline error message if email is invalid"
  ]
}
```

### Parent Task (TASK-ACCEPT-001.md)

Task scope specifies:
- **In Scope:** Email format validation, inline error messaging
- **Out of Scope:** Phone validation, password validation, CAPTCHA

### Simulated Git Diff (acceptable variation - NOT drift)

The implementation that should NOT be flagged as drift:

```diff
+ function validateEmail(email: string): ValidationResult {
+   // Empty check - implied by "valid format" requirement
+   if (!email) {
+     return { valid: false, error: 'Email is required' };
+   }
+
+   // Format check - explicitly required
+   if (!email.includes('@')) {
+     return { valid: false, error: 'Please enter a valid email address' };
+   }
+
+   // Length check - defensive coding, prevents database issues
+   if (email.length > 255) {
+     return { valid: false, error: 'Email address is too long' };
+   }
+
+   // Whitespace check - edge case handling
+   if (email.trim() !== email) {
+     return { valid: false, error: 'Email cannot have leading or trailing spaces' };
+   }
+
+   return { valid: true };
+ }
```

## Expected Analysis Output

When the intention-drift.md prompt analyzes this subtask, it should produce:

```markdown
# Intention Drift Analysis

## Subtask: ACCEPT-VAR-001
**Title:** Add email validation to user settings form
**Commit:** acceptable-var-commit
**Date:** 2026-01-14

## Planning Chain
- **Vision:** N/A
- **Story:** N/A (orphan task)
- **Task:** TASK-ACCEPT-001 - Implement email validation for user settings
- **Subtask:** ACCEPT-VAR-001 - Add email validation to user settings form

## Analysis

### Drift Detected: No

Implementation aligns with planning chain. No corrective action needed.

**Rationale:**
The implementation includes additional checks beyond the literal acceptance criteria, but these are all acceptable variations:

1. **Empty check** - Implied by "valid format" requirement. An empty string is not a valid email.
2. **Length check (255 chars)** - Defensive coding to prevent database issues. RFC 5321 limits email addresses.
3. **Whitespace trimming** - Edge case handling that improves user experience.

These additions:
- Do NOT add new features (like phone or password validation)
- Follow established patterns for input validation
- Are reasonable engineering decisions for production code
- Stay within the scope of "email validation"

## Recommendation
No action required.
```

## Why This Is NOT Drift

The intention-drift.md prompt explicitly defines acceptable variations (lines 55-58):

> **Acceptable Variation:**
> - Minor refactoring while touching the same code
> - Adding error handling for edge cases implied by the acceptance criteria
> - Following established patterns found in the codebase

This test case matches Example 2 in the prompt (lines 145-166):

| Test Case | Example 2 |
|-----------|-----------|
| Empty check ("Email is required") | Empty check ("Email is required") |
| Length check (>255) | Length check (>255) |
| Core @ check implemented | Core @ check implemented |
| Edge case handling | Labeled as "edge cases, not scope creep" |

The judgment from Example 2 (lines 162-166):
> **Judgment:** NO DRIFT
> - Empty check is reasonable (implied by "valid format")
> - Length check prevents database issues (defensive coding)
> - Core requirement (@ check) is implemented
> - These are edge cases, not scope creep

## Verification Checklist

- [x] Subtasks.json prepared with completed subtask having acceptable variation
- [x] Task document exists defining scope and out-of-scope
- [x] Simulated diff shows ONLY acceptable variations (empty, length, whitespace)
- [x] NO out-of-scope features added (phone, password, CAPTCHA)
- [x] Expected output shows NO DRIFT
- [x] Prompt's acceptable variation criteria match test case
- [x] Prompt's Example 2 demonstrates identical scenario

## Test Result

The intention-drift.md prompt will correctly identify this as **NO DRIFT** because:

1. **Example 2 precedent** (lines 145-166): Shows nearly identical code pattern judged as "NO DRIFT"

2. **Acceptable variation criteria** (lines 55-58):
   - Empty check = "edge cases implied by acceptance criteria"
   - Length check = "defensive coding" / "following established patterns"
   - Whitespace handling = "edge cases implied by acceptance criteria"

3. **Key discriminator** (line 166): "These are edge cases, not scope creep"
   - Test adds edge case handling for the same field (email)
   - Test does NOT add validation for different fields (phone, password)

4. **False positive guidance** (line 339): "When in doubt, don't flag. Some variations are acceptable engineering decisions"

The prompt distinguishes between:
- **Scope Creep** (flag): Adding phone/password validation to an email validation subtask
- **Acceptable Variation** (don't flag): Adding robust edge case handling to the requested email validation

## Contrast with Drift Test (004-intention-drift-prompt-12)

| Drift Test (012) | Acceptable Variation Test (013) |
|------------------|--------------------------------|
| Adds phone validation | Only validates email |
| Adds password strength | No password logic |
| Multiple unrelated fields | Single field with edge cases |
| DRIFT: Scope Creep | NO DRIFT: Acceptable variation |
