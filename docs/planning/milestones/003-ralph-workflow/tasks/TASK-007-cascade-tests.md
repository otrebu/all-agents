# TASK-007: Add cascade e2e tests

## Overview

Test cascade validation and CLI behavior.

## Scope

### In Scope

- Add test: `ralph plan subtasks --cascade --help` shows option
- Add test: invalid target rejected with error
- Add test: backward cascade rejected
- Add test: build --cascade only allows calibrate

### Out of Scope

- Full integration tests with actual planning execution
- Cascade execution tests (would require mocking)

## Technical Approach

1. Add describe block for cascade tests in ralph.test.ts
2. Test help output shows cascade option
3. Test invalid target validation
4. Test backward cascade rejection
5. Test build cascade target validation

## Files

- `tools/tests/e2e/ralph.test.ts` (modify, ~50 lines)

## Acceptance Criteria

- [ ] All new tests pass: `bun test tools/tests/e2e/ralph.test.ts`
- [ ] Existing tests still pass
- [ ] Tests cover validation edge cases

## Dependencies

- TASK-005 (plan --cascade)
- TASK-006 (build --cascade)

## Related Docs

- @context/blocks/construct/bun.md
