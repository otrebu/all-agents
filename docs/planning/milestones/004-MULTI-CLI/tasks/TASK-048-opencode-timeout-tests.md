---
depends:
  - @docs/planning/milestones/004-MULTI-CLI/stories/003-opencode-support.md
  - @docs/planning/milestones/004-MULTI-CLI/tasks/TASK-045-opencode-implementation.md
  - @context/blocks/docs/task-template.md
  - @context/foundations/test/test-integration-api.md
---

## Task: OpenCode Hard Timeout Integration Tests

**Story:** [003-opencode-support](../stories/003-opencode-support.md)

### Goal
Create integration tests to verify hard timeout enforcement for Issue #8203, ensuring OpenCode processes terminate correctly even when they hang silently without stderr output.

### Context
**Issue #8203** is a critical bug where OpenCode hangs forever on API errors (rate limits, auth failures) and writes nothing to stderr. This is different from normal stall detection:
- Normal stalls: Process is making progress but slowly (detected via activity monitoring)
- Issue #8203: Process is completely hung, no output at all, never exits

The hard timeout is the ONLY reliable way to handle Issue #8203. These integration tests must verify:
1. Hard timeout triggers after configured duration
2. SIGTERM/SIGKILL escalation works for hung processes
3. Process terminates even without any stdout/stderr output
4. No false positives (normal completion shouldn't trigger timeout)

Tests use mock processes (not real OpenCode) to simulate the hang behavior deterministically.

### Plan
1. Create `tools/src/commands/ralph/providers/opencode.integration.test.ts`:
   - Mock process that hangs silently (no output, never exits)
   - Mock process that exits normally before timeout
   - Mock process that exits with error before timeout
2. Test hard timeout scenarios:
   - Process hangs for duration > hard timeout → SIGKILL triggered
   - Verify timeout error references Issue #8203
   - Verify SIGKILL is used (not just SIGTERM)
3. Test normal completion scenarios:
   - Process completes successfully before timeout → no timeout triggered
   - Process errors before timeout → no timeout triggered, error propagated
4. Test edge cases:
   - Very short timeout (1ms) triggers immediately
   - Process that outputs then hangs → timeout still triggers
5. Verify cleanup: timers cleared, processes killed, no resource leaks

### Acceptance Criteria
- [ ] Mock process that hangs silently simulates Issue #8203
- [ ] Hard timeout triggers SIGKILL after configured duration
- [ ] Timeout error message references Issue #8203
- [ ] Normal completion before timeout does not trigger false positive
- [ ] Process termination works without stderr output
- [ ] Cleanup verified: no lingering timers or zombie processes
- [ ] Tests run deterministically (no timing flakes)

### Test Plan
- [ ] Run `vitest run opencode.integration.test.ts` - all tests pass
- [ ] Verify hard timeout triggers at correct duration
- [ ] Verify SIGKILL escalation (not just SIGTERM)
- [ ] Verify no false positives on normal completion
- [ ] Verify proper cleanup of resources

### Scope
- **In:** Integration tests for hard timeout, mock hung processes, SIGKILL verification
- **Out:** Unit tests (TASK-047), actual OpenCode binary testing, performance tests

### Notes
**Critical Testing Requirement - Issue #8203:**
The mock must simulate the exact failure mode:
1. Process starts normally
2. Something goes wrong (API error)
3. Process hangs indefinitely
4. No output to stdout or stderr
5. Process never exits on its own
6. Only external SIGKILL can terminate it

**Mock Process Implementation:**
```typescript
// Mock that simulates Issue #8203
const createHungProcess = () => {
  const proc = spawn('node', ['-e', 'setTimeout(() => {}, 999999)']);
  // Process will hang until killed
  return proc;
};
```

**Test Scenarios:**
1. **Hang scenario**: Process hangs for 500ms, timeout at 100ms → SIGKILL at 100ms
2. **Normal completion**: Process exits at 50ms, timeout at 100ms → no SIGKILL
3. **Error exit**: Process errors at 50ms, timeout at 100ms → error propagated, no SIGKILL
4. **Output then hang**: Process outputs at 25ms, hangs, timeout at 100ms → SIGKILL at 100ms

**Determinism Strategy:**
- Use short timeouts (10-100ms) for fast tests
- Use `setImmediate`/`setTimeout(..., 0)` for async coordination
- Mock Date.now() or use monotonic timers
- Avoid real process spawning when possible (use mock streams)

**Resource Cleanup:**
- Always kill mock processes after tests
- Clear all timers
- Verify no event listeners remain attached
- Use `afterEach` hooks for cleanup

**Issue Reference:**
All timeout errors should reference Issue #8203 in the error message to help future debuggers understand why hard timeout exists.

### Related Documentation
- @context/foundations/test/test-integration-api.md
- @docs/planning/milestones/004-MULTI-CLI/stories/003-opencode-support.md
