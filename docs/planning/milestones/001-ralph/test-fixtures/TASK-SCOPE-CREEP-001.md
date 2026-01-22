# TASK-SCOPE-CREEP-001: Implement Email Validation

## Overview

Implement email validation for the user registration form.

## Scope

Add client-side email format validation to ensure users enter valid email addresses.

### In Scope

- Email format validation (must contain @)
- Display inline error messages for invalid emails
- Clear error when user corrects the input

### Out of Scope

- Phone number validation (separate task)
- Password validation (separate task)
- Username validation (separate task)
- Server-side validation (separate task)

## Technical Approach

Use a regex pattern to validate email format on the client side.

## Acceptance Criteria

- [ ] Email field validates format on blur
- [ ] Invalid email shows inline error message
- [ ] Valid email clears any error message

## Notes

This task is intentionally scoped to ONLY email validation. Other form validations should be separate subtasks.
