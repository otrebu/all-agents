---
depends:
  - @docs/planning/milestones/004-MULTI-CLI/stories/003-opencode-support.md
  - @docs/planning/milestones/004-MULTI-CLI/tasks/TASK-045-opencode-implementation.md
  - @context/blocks/docs/task-template.md
  - @context/foundations/test/test-unit-vitest.md
---

## Task: OpenCode JSONL Parser Tests

**Story:** [003-opencode-support](../stories/003-opencode-support.md)

### Goal
Create comprehensive unit tests for OpenCode JSONL parsing with static fixtures to verify correct extraction of results, costs, and token usage.

### Context
OpenCode uses a JSONL streaming format that's different from Claude's output. The parser must handle:
- Normal successful completion with `step_finish` event
- Multiple `text` events that need concatenation
- Partial/incomplete streams (simulating Issue #8203 hang scenario)
- Error response formats
- Edge cases: missing fields, malformed JSON, empty streams

Unit tests must be deterministic and fast - no actual process spawning, just parsing logic tested in isolation.

### Plan
1. Create test fixtures in `tools/src/commands/ralph/providers/__fixtures__/`:
   - `opencode-success.jsonl` - Normal successful JSONL stream
   - `opencode-partial.jsonl` - Incomplete stream (simulates hang/Issue #8203)
   - `opencode-error.jsonl` - Error response format
   - `opencode-empty.jsonl` - Empty stream edge case
   - `opencode-multiline.jsonl` - Multiple text events
2. Create `tools/src/commands/ralph/providers/opencode.test.ts`:
   - Test `normalizeOpencodeResult()` with each fixture
   - Test line-by-line JSONL parsing
   - Test extraction of: result text, costUsd, durationMs, sessionId, tokenUsage
   - Test error handling for malformed JSON
   - Test edge cases: missing `step_finish`, missing `reason: "stop"`
3. Verify all tests are deterministic (no timing dependencies)
4. Ensure tests run fast (< 100ms each)

### Acceptance Criteria
- [ ] Test fixtures created for success, partial, error, empty, and multiline cases
- [ ] `normalizeOpencodeResult()` tested with all fixtures
- [ ] Correct extraction of result text from concatenated `text` events
- [ ] Correct extraction of costUsd, sessionId, tokenUsage from `step_finish`
- [ ] Error handling tested for malformed JSON and missing events
- [ ] All tests deterministic and fast (< 100ms each)
- [ ] Tests document expected JSONL format for future maintainers

### Test Plan
- [ ] Run `vitest run opencode.test.ts` - all tests pass
- [ ] Verify test coverage for JSONL parsing logic
- [ ] Verify fixtures are valid JSONL format
- [ ] Test edge cases: null values, undefined fields, extra whitespace

### Scope
- **In:** Unit tests for JSONL parsing, test fixtures, parser edge cases
- **Out:** Integration tests (TASK-047), provider implementation, registry integration

### Notes
**Fixture Examples:**

`opencode-success.jsonl`:
```json
{"type":"step_start","timestamp":1704067200000,"sessionID":"ses_abc123"}
{"type":"text","timestamp":1704067200100,"part":{"text":"Task completed successfully."}}
{"type":"step_finish","timestamp":1704067201000,"part":{"reason":"stop","cost":0.0025,"tokens":{"input":1500,"output":250,"reasoning":100,"cacheRead":0,"cacheWrite":0}}}
```

`opencode-partial.jsonl` (simulates Issue #8203):
```json
{"type":"step_start","timestamp":1704067200000,"sessionID":"ses_def456"}
{"type":"text","timestamp":1704067200100,"part":{"text":"Processing..."}}
```
(No `step_finish` - simulates hang)

**Testing Approach:**
- Import fixtures as raw strings
- Parse with the same logic used in production
- Assert on exact expected `AgentResult` structure
- Test both success and failure paths

**Determinism Requirements:**
- No `Date.now()` in tests - use fixed timestamps from fixtures
- No async timing - parse synchronously
- No file system operations in test execution (fixtures imported at build time)

### Related Documentation
- @context/foundations/test/test-unit-vitest.md
- @docs/planning/milestones/004-MULTI-CLI/stories/003-opencode-support.md
