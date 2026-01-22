# TASK-ALIGNED-001: Implement Email Validation for User Registration

## Overview

Add email validation to the user registration form to ensure users provide a valid email address before submitting the form.

## Scope

### In Scope

- Client-side email format validation
- Checking for @ symbol presence
- Validating domain format (contains . after @)
- Displaying inline error messages for invalid emails

### Out of Scope

- Server-side email validation (separate task)
- Email uniqueness checking (separate task)
- Email verification/confirmation flow (separate task)
- Phone number validation
- Password strength validation

## Technical Approach

1. Create a reusable email validation utility function in `src/utils/validation.ts`
2. Integrate validation with the RegistrationForm component
3. Display inline error messages below the email input field
4. Use standard HTML5 email input pattern as a baseline

## Acceptance Criteria

- [ ] Email format validation detects missing @ symbol
- [ ] Email format validation detects missing/invalid domain
- [ ] Invalid email shows clear error message to user
- [ ] Validation runs on blur and on form submit

## Dependencies

- None

## Related Subtasks

- ALIGNED-001: Add email format validation (this subtask)
