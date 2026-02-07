## Task: Add Integration Tests for Claude Provider

**Story:** [002-claude-refactor](./002-claude-refactor.md)

### Goal
Create mock-based integration tests for the Claude provider's subprocess handling, timeout logic, and signal management.

### Context
Integration tests verify that the Claude provider correctly handles subprocess lifecycle without requiring the actual Claude CLI. These tests mock `Bun.spawn` and process events to test timeout handling, signal escalation, and stall detection in a controlled environment.

### Plan
1. Create `tools/tests/providers/claude.integration.test.ts`:
   - Mock `Bun.spawn` to return mock process objects
   - Mock stdout/stderr streams with event emitters
   - Mock process exit events

2. Implement test cases for:
   - **Subprocess spawning**: Verify correct arguments passed to `Bun.spawn`
   - **Stall detection flow**: 
     - Emit stderr data at intervals
     - Verify stall timer resets on activity
     - Stop emitting data
     - Verify SIGTERM sent after stall timeout
   - **Termination escalation**:
     - Spawn mock process
     - Send SIGTERM
     - Process doesn't exit
     - Verify SIGKILL sent after grace period
   - **Exit code handling**:
     - Test exit codes 0 (success), 1 (error), 2 (usage error), 127 (not found)
     - Verify correct error handling for each
   - **JSON output parsing**:
     - Mock stdout with fixture data
     - Verify `AgentResult` returned correctly

3. Create mock utilities:
   - `createMockProcess()` - Returns mock process with controllable events
   - `createMockStream()` - Returns mock readable stream

4. Run tests to verify they pass

### Acceptance Criteria
- [x] `tools/tests/providers/claude.integration.test.ts` exists
- [x] Mock utilities for process and stream creation
- [x] Test cases for:
  - [x] Subprocess spawning with correct arguments
  - [x] Stall detection triggers after timeout without activity
  - [x] Stall detection resets on stderr activity
  - [x] SIGTERM sent on stall timeout
  - [x] SIGKILL sent after grace period if SIGTERM fails
  - [x] Exit code 0 returns success
  - [x] Exit codes 1, 2, 127 return errors
  - [x] JSON output parsed and normalized correctly
- [x] All tests pass with `bun test`
- [x] Tests use Bun's built-in test runner with mocking

### Test Plan
- [x] Integration tests run without real Claude CLI
- [x] Tests verify subprocess lifecycle management
- [x] Tests verify timeout and signal handling
- [x] Tests are deterministic (no timing-dependent failures)

### Scope
- **In:** Mock-based integration tests for subprocess handling, timeout logic, signal escalation
- **Out:** Unit tests for JSON parsing (TASK-043), MCP cleanup tests (deferred), E2E tests with real CLI

### Notes
**Mocking Strategy:**
Use Bun's mock capabilities or manual mocking:
```typescript
// Mock Bun.spawn
const mockSpawn = (args: string[], options: SpawnOptions) => {
  return {
    stdout: createMockStream(),
    stderr: createMockStream(),
    kill: mock((signal: string) => {}),
    exited: Promise.resolve({ exitCode: 0 }),
  };
};
```

**Timing in Tests:**
Use fake timers or very short timeouts to keep tests fast:
```typescript
// Use 100ms timeouts in tests instead of 10 minutes
const testStallConfig = {
  stallTimeoutMs: 100,
  hardTimeoutMs: 500,
  gracePeriodMs: 50,
};
```

**Deferred Testing:**
- MCP cleanup verification is deferred along with the MCP cleanup feature
- Process cleanup tests in this task focus on general subprocess cleanup, not MCP-specific logic

**Test Isolation:**
Each test should:
- Create fresh mocks
- Not depend on test order
- Clean up event listeners
- Reset any global state

### Related Documentation
- @docs/planning/milestones/004-MULTI-CLI/stories/002-claude-refactor.md
- @docs/planning/milestones/004-MULTI-CLI/tasks/TASK-039-claude-refactor.md
- @docs/planning/milestones/004-MULTI-CLI/tasks/TASK-043-claude-unit-tests.md
- @context/blocks/test/unit-testing.md
- @context/foundations/test/test-integration-api.md (for integration test patterns)
