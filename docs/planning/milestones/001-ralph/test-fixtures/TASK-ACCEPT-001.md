## Task: TASK-ACCEPT-001 - Implement email validation for user settings

**Status:** In Progress
**Created:** 2026-01-14

### Description

Add email validation to the user settings form so users cannot enter invalid email addresses.

### Acceptance Criteria

- Email field validates format (must contain @)
- Inline error message displays when validation fails
- Form submission blocked until email is valid

### In Scope

- Email format validation
- User-friendly error messaging
- Integration with existing form validation pattern

### Out of Scope

- Phone number validation
- Password validation
- CAPTCHA implementation
- Email verification (sending confirmation email)

### Technical Notes

- Follow existing validation patterns in the codebase
- Use TypeScript for type safety
