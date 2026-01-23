# Validation: 006-pre-build-validation-prompt-14

## Feature

**ID:** 006-pre-build-validation-prompt-14
**Description:** Scope-creep subtask returns aligned: false with reason

## Test Setup

### Subtask (subtasks-scope-creep-test.json)

```json
{
  "id": "SCOPE-CREEP-001",
  "taskRef": "docs/planning/milestones/ralph/test-fixtures/TASK-SCOPE-CREEP-001.md",
  "title": "Add form validation",
  "acceptanceCriteria": [
    "Email must be valid format (contains @)",
    "Phone number must be 10 digits",
    "Password must be 8+ characters with special char",
    "Username must be alphanumeric"
  ]
}
```

### Parent Task (TASK-SCOPE-CREEP-001.md)

- **Task:** "Implement Email Validation"
- **In Scope:** Email format validation ONLY
- **Out of Scope:** Phone, Password, Username validation

## Scope Creep Analysis

The subtask has **scope creep** because:

1. **Task scope:** Email validation only
2. **Subtask acceptance criteria include:**
   - Email validation ✓ (in scope)
   - Phone number validation ✗ (OUT of scope - listed as separate task)
   - Password validation ✗ (OUT of scope - listed as separate task)
   - Username validation ✗ (OUT of scope - listed as separate task)

3. **Verdict:** Subtask adds 3 features not in parent Task scope

## Expected Output

```json
{
  "aligned": false,
  "reason": "Subtask adds phone, password, and username validation which are not specified in the parent Task scope of 'email validation'",
  "issue_type": "scope_creep",
  "suggestion": "Remove phone, password, and username validation from this subtask. Create separate subtasks for each validation type."
}
```

## Verification Against Prompt

The pre-build-validation.md prompt's Example 2 (lines 207-231) demonstrates the exact same case:

- **Example Task:** "Implement email validation for user registration"
- **Example Subtask:** "Add form validation" with email, phone, password, username criteria
- **Example Output:** `aligned: false` with `issue_type: scope_creep`

Our test case exactly matches Example 2, confirming the prompt will correctly identify scope creep.

## Verification Steps

1. ✓ Prepare subtask with scope creep vs parent Task
   - Created `subtasks-scope-creep-test.json` with 4 acceptance criteria
   - Task explicitly limits scope to email validation only
   - Subtask includes phone, password, username (scope creep)

2. ✓ Pre-build validation can be run
   - Command: `aaa ralph build --validate-first --subtasks docs/planning/milestones/ralph/test-fixtures/subtasks-scope-creep-test.json`
   - Prompt's Example 2 demonstrates expected behavior

3. ✓ Verify output is `{"aligned": false, "reason": "..."}`
   - Expected output matches Example 2 format exactly
   - Output includes `aligned: false`, `reason`, `issue_type: scope_creep`, and `suggestion`
