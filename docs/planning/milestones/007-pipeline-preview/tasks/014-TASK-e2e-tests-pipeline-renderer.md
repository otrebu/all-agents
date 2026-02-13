## Task: E2E Tests for PipelineRenderer in Build and Cascade

**Story:** [003-STORY-live-execution-progress](../stories/003-STORY-live-execution-progress.md)

### Goal
Add E2E tests verifying that PipelineRenderer displays correct output in headless, supervised, and non-TTY modes during build and cascade execution.

### Context
Unit tests (Task 011) verify the renderer class works in isolation. This task adds E2E tests that run actual `aaa ralph build` and `aaa ralph cascade` commands and verify:
- Headless mode shows persistent 2-line header with ANSI cursor codes (when TTY)
- Supervised mode output includes reprinted headers
- Piped/CI output degrades gracefully (no ANSI cursor codes)
- Renderer stops cleanly on Ctrl+C or error

Existing E2E test files: `tools/tests/e2e/ralph.test.ts` and `tools/tests/e2e/cascade.test.ts`. We'll extend these.

### Plan
1. Add test case to `tools/tests/e2e/ralph.test.ts`: "build shows live progress header in headless mode"
2. Use `execa()` with `{ reject: false }` to run `bun run src/cli.ts ralph build --headless`
3. Verify stdout contains pipeline header symbols (`✓`, `●`) and progress bar (`[###...]`)
4. Verify header appears multiple times (reprinted on each iteration)
5. Add test case: "build degrades gracefully when piped (non-TTY)"
6. Run command piped through `cat` to simulate non-TTY environment
7. Verify output contains phase names but NOT ANSI cursor codes (`\x1b[H`, `\x1b[2K`)
8. Add test case to `tools/tests/e2e/cascade.test.ts`: "cascade shows phase transitions in header"
9. Run `aaa ralph plan stories --cascade build --headless --dry-run` (dry-run for speed)
10. Verify header shows multiple phases: `[stories] → [tasks] → [subtasks] → [build]`
11. Verify completed phases show checkmark: `[stories] ✓`
12. Add cleanup in afterEach to kill any hanging processes (timer leak safety)

### Acceptance Criteria
- [ ] E2E test verifies headless mode shows pipeline header with symbols and progress bar
- [ ] E2E test verifies header reprints multiple times during build execution
- [ ] E2E test verifies non-TTY mode output lacks ANSI cursor codes
- [ ] E2E test verifies cascade mode shows multi-phase header with transitions
- [ ] E2E test verifies completed phases show checkmark symbol
- [ ] Tests run in CI without hanging (no timer leaks)
- [ ] All new tests pass locally and in CI

### Test Plan
- [ ] Run `bun test tools/tests/e2e/ralph.test.ts` - new tests pass
- [ ] Run `bun test tools/tests/e2e/cascade.test.ts` - new tests pass
- [ ] Verify tests complete in <60s (build E2E may be slow, but should finish)
- [ ] Mock subtasks.json fixture to minimize test execution time
- [ ] Verify tests don't leave hanging processes (`ps aux | grep claude`)

### Scope
- **In:** E2E tests for build and cascade commands, TTY/non-TTY output verification, process cleanup
- **Out:** Unit tests for renderer class (Task 011), renderer implementation (Task 011), wiring logic (Task 012)

### Notes
- Use test fixtures with minimal subtasks (1-2 items) to keep E2E tests fast
- For non-TTY test, use `process.env.TERM='dumb'` or pipe through `cat` to disable TTY detection
- ANSI cursor codes to check for: `\x1b[H` (home), `\x1b[2K` (clear line), `\x1b[<N>A` (move up)
- Phase symbols to check for: `✓` (completed), `●` (active), `‖` (approval), `✗` (failed)
- Progress bar format: `3/12  [######..........] 25%`
- The E2E tests are smoke tests - detailed rendering logic is covered by unit tests in Task 011
- Set COMMAND_TIMEOUT_MS to 60000 (60s) for build tests - they may invoke Claude
- For dry-run tests, timeout can be lower (10s) since no AI invocation

### Related Documentation
- @context/foundations/test/test-e2e-cli-bun.md (E2E testing patterns)
- @context/stacks/cli/cli-bun.md (CLI stack)
- Task 011 (PipelineRenderer unit tests)
- Task 012 (Renderer wiring into build/cascade)
