## Task: Extract Shared Utilities from claude.ts

**Story:** [001-provider-foundation](./001-provider-foundation.md)

### Goal
Extract reusable process execution utilities from `claude.ts` into a shared `providers/utils.ts` module for use by all provider implementations.

### Context
The current `claude.ts` contains 707 lines of code with sophisticated process management including stall detection, timeout handling, graceful termination, and stderr activity tracking. These utilities need to be extracted and generalized so all providers (OpenCode, Codex, etc.) can use them without duplicating code.

Key utilities to extract:
- `executeWithTimeout()` - Process execution with stall detection and hard timeout
- `createStallDetector()` - Activity-based stall detection
- `createTimeoutPromise()` - Promise-based timeout wrapper
- `killProcessGracefully()` - Two-phase termination (SIGTERM → grace period → SIGKILL)
- `readStderrWithActivityTracking()` - Stderr forwarding with activity callbacks
- `safeJsonParse()` - Safe JSON parsing with fallback
- `parseJsonl()` - JSONL (newline-delimited JSON) parsing

### Plan
1. Create `tools/src/commands/ralph/providers/utils.ts` with:
   - `StallDetectionConfig` interface (stallTimeoutMs, hardTimeoutMs, checkIntervalMs)
   - `ProcessExecutionOptions` interface (command, args, cwd, env, stallDetection, callbacks)
   - `ProcessExecutionResult` interface (stdout, stderr, exitCode, durationMs, timedOut, terminationSignal)
   - `executeWithTimeout(options)` - Main execution function using Bun.spawn
   - `createStallDetector(getLastActivityAt, stallTimeoutMs)` - Returns {promise, cleanup}
   - `createTimeoutPromise(timeoutMs, outcome)` - Promise that resolves after timeout
   - `killProcessGracefully(proc, gracePeriodMs)` - SIGTERM → wait → SIGKILL
   - `readStderrWithActivityTracking(stderr, onActivity)` - Forward stderr to console with activity tracking
   - `safeJsonParse<T>(json, defaultValue)` - Safe JSON.parse with fallback
   - `parseJsonl<T>(jsonl)` - Parse newline-delimited JSON

2. Refactor `claude.ts` to use the new utilities:
   - Replace inline `createStallDetector` with import from utils
   - Replace inline `createTimeoutPromise` with import from utils
   - Replace inline `killProcessGracefully` with import from utils
   - Replace inline `readStderrWithActivityTracking` with import from utils
   - Update `invokeClaudeHeadlessAsync` to use `executeWithTimeout`

3. Create `tools/tests/providers/utils.test.ts` with unit tests:
   - `safeJsonParse()` returns parsed object for valid JSON
   - `safeJsonParse()` returns defaultValue for invalid JSON
   - `safeJsonParse()` returns undefined when no default provided
   - `parseJsonl()` parses multiple JSON lines
   - `parseJsonl()` filters out empty lines
   - `parseJsonl()` handles invalid lines gracefully
   - `createTimeoutPromise()` resolves after specified duration
   - `killProcessGracefully()` sends SIGTERM first
   - `killProcessGracefully()` sends SIGKILL after grace period if process still running

4. Run TypeScript compiler and tests to verify

### Acceptance Criteria
- [x] `tools/src/commands/ralph/providers/utils.ts` exists with all utility functions
- [x] `StallDetectionConfig`, `ProcessExecutionOptions`, `ProcessExecutionResult` interfaces defined
- [x] `executeWithTimeout()` executes command with stall detection and hard timeout
- [x] `createStallDetector()` returns promise that resolves on stall and cleanup function
- [x] `createTimeoutPromise()` resolves with specified outcome after timeout
- [x] `killProcessGracefully()` implements two-phase termination
- [x] `readStderrWithActivityTracking()` forwards stderr and calls onActivity callback
- [x] `safeJsonParse()` parses valid JSON and returns default for invalid
- [x] `parseJsonl()` parses newline-delimited JSON array
- [x] `claude.ts` refactored to import utilities from utils.ts
- [x] No functionality lost in claude.ts after refactoring
- [x] Unit tests cover all utility functions
- [x] TypeScript compiles without errors

### Test Plan
- [x] Unit tests in `tools/tests/providers/utils.test.ts`:
  - JSON parsing utilities (safeJsonParse, parseJsonl)
  - Timeout and promise utilities (createTimeoutPromise)
  - Process management utilities (killProcessGracefully - mocked)
- [x] Integration verification:
  - Run existing ralph build with refactored claude.ts
  - Verify headless mode still works
  - Verify stall detection still works
  - Verify timeout handling still works

### Scope
- **In:** Utility functions, interfaces, claude.ts refactoring, unit tests
- **Out:** Changes to provider behavior, new provider implementations, registry changes

### Notes
**Extraction Strategy:**
- Keep function signatures similar to existing implementations for minimal refactoring
- Generalize where possible (e.g., `executeWithTimeout` takes command/args instead of hardcoding 'claude')
- Maintain Bun.spawn usage for consistency with existing code

**Bun-Specific Considerations:**
- `Bun.spawn()` and `Bun.spawnSync()` are Bun-specific APIs
- `proc.exited` is a Bun-specific promise property
- These utilities are intentionally Bun-specific since the whole tools/ directory uses Bun

**Refactoring Safety:**
- The existing claude.ts has extensive timeout/stall logic (lines 100-160, 450-600)
- Extract carefully to preserve exact behavior
- Test thoroughly after refactoring

**Future Providers:**
- OpenCode provider will use `executeWithTimeout()` for headless mode
- All providers will use `safeJsonParse()` for CLI JSON output parsing
- JSONL parsing may be used for streaming output in future providers

### Related Documentation
- @docs/planning/milestones/004-MULTI-CLI/stories/001-provider-foundation.md
- @docs/planning/milestones/004-MULTI-CLI/tasks/TASK-036-provider-types.md
- @docs/planning/milestones/004-MULTI-CLI/tasks/TASK-037-provider-registry.md
- @tools/src/commands/ralph/claude.ts (source of utilities to extract)
- @context/stacks/cli/cli-bun.md (Bun-specific patterns)
- @context/foundations/quality/gate-standards.md (refactoring standards)
