## Task: Add Unit Tests for Claude Provider with Fixtures

**Story:** [002-claude-refactor](./002-claude-refactor.md)

### Goal
Create comprehensive unit tests for the refactored Claude provider's JSON parsing and normalization logic using static fixtures.

### Context
The Claude provider needs unit tests to verify that JSON parsing from Claude CLI output correctly normalizes to the `AgentResult` interface. These tests use static fixtures to ensure deterministic, fast testing without requiring the actual Claude CLI.

### Plan
1. Create test fixtures in `tools/tests/fixtures/claude/`:
   - `claude-success.json` - Normal successful response with all fields
   - `claude-success-minimal.json` - Success with only required fields
   - `claude-error.json` - Error response format
   - `claude-malformed.json` - Invalid JSON handling
   - `claude-empty-array.json` - Empty response array
   - `claude-no-result-entry.json` - Missing result entry type
   - `claude-partial-result.json` - Result entry missing some fields

2. Create `tools/tests/providers/claude.parser.test.ts`:
   - Test `normalizeClaudeResult()` with all fixtures
   - Test error handling for malformed JSON
   - Test partial result handling (missing optional fields)
   - Test type guards and validation
   - Use Bun's built-in test runner (`bun:test`)

3. Create `tools/tests/providers/claude.config.test.ts`:
   - Test ClaudeConfig validation
   - Test provider type discrimination
   - Test default timeout configuration

4. Run tests to verify they pass

### Acceptance Criteria
- [x] `tools/tests/fixtures/claude/` directory exists with 7 fixture files
- [x] `tools/tests/providers/claude.parser.test.ts` exists with tests for:
  - [x] Parsing complete result entry correctly
  - [x] Extracting all fields: result, costUsd, durationMs, sessionId, tokenUsage
  - [x] Throwing on missing result entry
  - [x] Throwing on malformed JSON
  - [x] Handling partial result (missing optional fields)
  - [x] Handling numeric string conversion for cost/duration
- [x] `tools/tests/providers/claude.config.test.ts` exists with config validation tests
- [x] All tests pass with `bun test`
- [x] Tests use Bun's built-in test runner (not Vitest)

### Test Plan
- [x] Unit tests run in isolation without Claude CLI
- [x] Tests cover all JSON parsing edge cases
- [x] Tests verify type safety through TypeScript

### Scope
- **In:** JSON parsing tests, fixture files, config validation tests
- **Out:** Integration tests with subprocess mocking (TASK-044), MCP cleanup tests (deferred), E2E tests with real CLI

### Notes
**Fixture Format:**
All fixtures should match Claude's actual JSON output format:
```json
[
  {"type": "system", "content": "..."},
  {"type": "assistant", "content": "..."},
  {"type": "result", "result": "...", "duration_ms": 1234, "total_cost_usd": 0.05, "session_id": "..."}
]
```

**Test Runner:**
Using Bun's built-in test runner (`bun:test`) to match existing test suite:
```typescript
import { describe, test, expect } from "bun:test";
```

**Deferred Testing:**
- MCP cleanup tests are deferred along with the MCP cleanup feature
- Integration tests with subprocess mocking are in separate task (TASK-044)

### Related Documentation
- @docs/planning/milestones/004-MULTI-CLI/stories/002-claude-refactor.md
- @docs/planning/milestones/004-MULTI-CLI/tasks/TASK-039-claude-refactor.md
- @context/blocks/test/unit-testing.md
- @context/foundations/test/test-unit-vitest.md (for patterns, though using Bun test)
