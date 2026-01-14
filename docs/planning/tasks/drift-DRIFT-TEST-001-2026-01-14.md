## Task: Correct intention drift in DRIFT-TEST-001

**Source:** Intention drift analysis
**Created:** 2026-01-14
**Commit:** drift-test-commit

### Problem

The implementation of "Add email validation to registration form" contains scope creep. The code implements phone number validation and password strength requirements, which are explicitly listed as "Out of Scope" in the parent Task document.

### Planning Chain Reference

- Subtask: DRIFT-TEST-001 - Add email validation to registration form
- Task: TASK-DRIFT-001 - Implement email validation
- Story: N/A (orphan task)

### Drift Type

Scope Creep

### Evidence

The implementation adds validation beyond what was requested:

```javascript
function validateRegistration(email, password, phone) {
  // Email validation (in scope)
  if (!email.includes('@')) return 'Invalid email';

  // Phone validation (OUT OF SCOPE - DRIFT!)
  if (!phone.match(/^\d{10}$/)) return 'Invalid phone number';

  // Password strength (OUT OF SCOPE - DRIFT!)
  if (password.length < 8) return 'Password must be at least 8 characters';
  if (!/[A-Z]/.test(password)) return 'Password must contain uppercase';

  return null;
}
```

**Subtask Acceptance Criteria (what was requested):**
- Email must be valid format (contains @)
- Show inline error message if email is invalid

**Task Out of Scope (explicitly excluded):**
- Phone number validation
- Password strength requirements
- CAPTCHA integration

### Corrective Action

Options:

1. **Modify code** - Remove phone validation and password strength validation from the implementation. Keep only email validation as specified.

2. **Update plan** - If phone and password validation are actually needed now, update TASK-DRIFT-001.md to:
   - Move phone validation and password strength from "Out of Scope" to "Scope"
   - Document why scope changed
   - Create corresponding subtasks if these features need their own acceptance criteria

3. **Create new subtasks** - If phone/password validation should remain separate work:
   - Revert changes to remove phone/password validation from this commit
   - Create new subtasks for phone validation and password strength
   - Implement them through proper planning flow

### Acceptance Criteria

- [ ] Implementation matches planning chain intention
- [ ] Only email validation remains in the code
- [ ] Phone validation code removed OR documented in updated Task scope
- [ ] Password validation code removed OR documented in updated Task scope
- [ ] Acceptance criteria from original subtask are met (email validation works)
- [ ] No unplanned scope remains
