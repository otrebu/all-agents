## Task: Move and Refactor Claude Provider

**Story:** [002-claude-refactor](./002-claude-refactor.md)

### Goal
Move `claude.ts` to `providers/claude.ts` and refactor it to use the new provider types and shared utilities from Story 001.

### Context
The existing Claude Code integration in `tools/src/commands/ralph/claude.ts` needs to be refactored to use the new provider abstraction layer. This is a critical step in the multi-CLI migration that ensures backward compatibility while validating the abstraction works. The current implementation has tight coupling to Claude-specific types and inline utility functions that need to be decoupled.

Key constraints:
- Must maintain 100% backward compatibility with existing `aaa ralph build` workflows
- Must use new discriminated union types from `providers/types.ts`
- Must leverage shared utilities from `providers/utils.ts`
- Must support all 3 invocation modes: supervised, headless-async, haiku (headless-sync was removed in the timeout protection migration — all headless callers now use `invokeClaudeHeadlessAsync`)
- Must normalize Claude's JSON output format to the standard `AgentResult` interface

### Plan

1. **Move and update file structure:**
   - Move `tools/src/commands/ralph/claude.ts` to `tools/src/commands/ralph/providers/claude.ts`
   - Update imports to use types from `./types.ts`:
     - `AgentResult`, `ProviderConfig`, `InvocationOptions`, `InvokerFn`, `ClaudeConfig`
   - Update imports to use utilities from `./utils.ts`:
     - `executeWithTimeout`, `killProcessGracefully`, `createStallDetector`, `createTimeoutPromise`, `readStderrWithActivityTracking`, `safeJsonParse`

2. **Refactor type definitions:**
   - Remove local `ClaudeResult`, `HeadlessResult`, `HeadlessOptions`, `HeadlessAsyncOptions`, `HaikuOptions` interfaces
   - Use `AgentResult` from `./types.ts` as the canonical return type
   - Define `ClaudeConfig` extending `BaseProviderConfig` with `provider: 'claude'` discriminator

3. **Implement normalization function:**
   - Create `normalizeClaudeResult(jsonArray: unknown[]): AgentResult` function
   - Parse Claude's JSON array format: `[{type:"system",...}, {type:"assistant",...}, {type:"result",...}]`
   - Extract fields: `result`, `total_cost_usd` → `costUsd`, `duration_ms` → `durationMs`, `session_id` → `sessionId`, `token_usage` → `tokenUsage`
   - Handle missing result entry with clear error message

4. **Refactor invocation functions:**
   - `invokeClaudeChat`: Keep synchronous, return `ClaudeResult` (not `AgentResult` - this is UI-facing)
   - ~~`invokeClaudeHeadless`: Keep synchronous for backward compat~~ **REMOVED** — the sync headless function was deleted in the timeout protection migration. All headless callers now use `invokeClaudeHeadlessAsync`.
   - `invokeClaudeHeadlessAsync`: Refactor to return `Promise<AgentResult>` instead of `HeadlessResult | null`
     - Use `executeWithTimeout()` from utils.ts for process execution
     - Handle stall detection via `createStallDetector()`
     - Handle timeouts via `createTimeoutPromise()`
     - Use `killProcessGracefully()` for termination
   - `invokeClaudeHaiku`: Refactor to return `Promise<AgentResult | null>`
     - Use shared utilities for timeout and process management

5. **Address async/sync mismatch:**
   - `invokeClaudeChat` is synchronous; `invokeClaudeHeadless` was removed (all headless callers now use async `invokeClaudeHeadlessAsync`)
   - `InvokerFn` type expects async function
   - Solution: Create async wrapper functions that call sync internals, or refactor callers to handle async
   - Decision: Keep chat as sync (user-facing), create `invokeClaude` async function for registry that delegates to appropriate mode

6. **Update exports:**
   - Export `invokeClaude` (main registry function)
   - Export `invokeClaudeChat`, `invokeClaudeHeadlessAsync`, `invokeClaudeHaiku` for direct use (sync `invokeClaudeHeadless` was removed)
   - Export `normalizeClaudeResult` for testing
   - Export `ClaudeConfig` type

7. **Update dependent files:**
   - Update `tools/src/commands/ralph/build.ts` to import from `./providers/claude` instead of `./claude`
   - Update `tools/src/commands/ralph/review/index.ts` imports similarly
   - Update any other files importing from `./claude`

8. **Verify TypeScript compilation:**
   - Run `bun run typecheck` in tools/ directory
   - Fix any type errors

### Acceptance Criteria

- [ ] `tools/src/commands/ralph/providers/claude.ts` exists with all functionality migrated
- [ ] All imports updated to use `./types.ts` and `./utils.ts`
- [ ] `normalizeClaudeResult()` function implemented and extracts all required fields
- [ ] `invokeClaudeHeadlessAsync()` returns `Promise<AgentResult>` with normalized data
- [ ] `invokeClaudeHaiku()` refactored to use shared utilities
- [ ] All 3 invocation modes work: supervised, headless-async, haiku
- [ ] Backward compatibility maintained - existing `aaa ralph build` works unchanged
- [ ] Original `tools/src/commands/ralph/claude.ts` deleted after migration verified
- [ ] TypeScript compiles without errors
- [ ] No functionality lost (stall detection, timeouts, signal handling all work)

### Test Plan

- [ ] Unit tests in `tools/tests/providers/claude.test.ts`:
  - `normalizeClaudeResult()` parses valid Claude JSON array correctly
  - `normalizeClaudeResult()` throws on missing result entry
  - `normalizeClaudeResult()` handles partial data (missing optional fields)
  - JSON parsing with fixtures:
    - `fixtures/claude-success.json` - Normal successful response
    - `fixtures/claude-error.json` - Error response format
    - `fixtures/claude-malformed.json` - Invalid JSON handling
- [ ] Integration verification:
  - Run `aaa ralph build` with refactored provider
  - Verify headless mode returns correct cost/duration/sessionId
  - Verify stall detection triggers after timeout
  - Verify interrupt (Ctrl+C) exits cleanly
  - Verify all 3 invocation modes work correctly (supervised, headless-async, haiku)
- [ ] Regression tests:
  - All existing tests in `tools/tests/` pass
  - No changes needed to test assertions

### Scope

- **In:**
  - Moving and refactoring `claude.ts` to `providers/claude.ts`
  - Implementing `normalizeClaudeResult()` for JSON normalization
  - Refactoring all invocation functions to use shared utilities
  - Updating imports in dependent files (build.ts, review/index.ts)
  - Type definitions for Claude-specific config
  - Unit tests for normalization and parsing

- **Out:**
  - Provider registry implementation (TASK-040)
  - Other provider implementations (opencode, codex, etc.)
  - Changes to provider types in `./types.ts`
  - Changes to shared utilities in `./utils.ts`
  - MCP process cleanup (deferred per Story 002)
  - Integration tests with real Claude CLI (mock-based only)

### Notes

**Async/Sync Architecture Decision:**
After the timeout protection migration, only `invokeClaudeChat` remains synchronous (user-facing interactive mode). The sync `invokeClaudeHeadless` was removed — all headless callers now use `invokeClaudeHeadlessAsync`. The provider abstraction expects async `InvokerFn`. The solution is to:
1. Keep `invokeClaudeChat` sync for direct use in interactive scenarios
2. Create an async `invokeClaude()` function for the registry that internally delegates to sync chat or async headless based on mode
3. This maintains backward compatibility while satisfying the registry interface

**Claude JSON Format Handling:**
Claude outputs a JSON array where the result entry has `type: "result"`. Example:
```json
[
  {"type": "system", "content": "..."},
  {"type": "assistant", "content": "..."},
  {"type": "result", "result": "...", "duration_ms": 1234, "total_cost_usd": 0.05, "session_id": "..."}
]
```
The `normalizeClaudeResult()` function must find the entry with `type: "result"` and map fields to `AgentResult`.

**Error Handling Strategy:**
- JSON parse errors: Return null (existing behavior preserved)
- Missing result entry: Throw clear error (new, helps debugging)
- Process timeouts: Return null with console warning (existing behavior)
- Signal interruption: Exit process with appropriate code (existing behavior)

**Stall Detection Migration:**
The existing stall detection uses stderr activity tracking. When migrating to shared utilities:
- `createStallDetector()` from utils.ts provides the core mechanism
- `readStderrWithActivityTracking()` handles stderr forwarding with callbacks
- Ensure the activity callback updates the timestamp used by stall detector

**MCP Cleanup Deferred:**
Per Story 002, explicit MCP process cleanup is deferred. The existing behavior (potential zombie processes) is preserved. This keeps the refactor scope manageable.

**Testing Fixtures:**
Create test fixtures in `tools/tests/fixtures/`:
- `claude-success.json` - Full successful response with all fields
- `claude-minimal.json` - Response with only required fields
- `claude-error.json` - Error response format
- `claude-malformed.json` - Invalid JSON for error handling tests

**Migration Verification Checklist:**
Before deleting original `claude.ts`:
- [ ] All imports updated in build.ts
- [ ] All imports updated in review/index.ts
- [ ] `aaa ralph build` works with no config changes
- [ ] `aaa ralph build --provider claude` works
- [ ] JSON parsing returns correct cost/duration/sessionId
- [ ] Stall detection works
- [ ] Interrupt exits cleanly
- [ ] All tests pass

### Related Documentation

- @docs/planning/milestones/004-MULTI-CLI/stories/002-claude-refactor.md
- @docs/planning/milestones/004-MULTI-CLI/tasks/TASK-036-provider-types.md
- @docs/planning/milestones/004-MULTI-CLI/tasks/TASK-038-shared-utilities.md
- @tools/src/commands/ralph/claude.ts (original file to migrate)
- @context/stacks/cli/cli-bun.md (Bun CLI patterns)
- @context/blocks/quality/coding-style.md (FP patterns, naming conventions)
- @context/blocks/quality/error-handling.md (error handling philosophy)
- @context/blocks/test/unit-testing.md (testing patterns)
