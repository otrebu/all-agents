---
depends:
  - @docs/planning/milestones/004-MULTI-CLI/stories/003-opencode-support.md
  - @context/blocks/docs/task-template.md
  - @context/blocks/construct/ralph-patterns.md
---

## Task: OpenCode Provider Implementation

**Story:** [003-opencode-support](../stories/003-opencode-support.md)

### Goal
Implement the OpenCode provider with JSONL parsing, hard timeout enforcement, and permission bypass to enable `aaa ralph build --provider opencode`.

### Context
OpenCode is the first new provider after Claude Code. It has unique characteristics requiring special handling:
- Uses JSONL streaming output format (different from Claude's format)
- **Critical Issue #8203**: Hangs forever on API errors without writing to stderr
- Requires hard timeout enforcement as the only reliable termination mechanism
- Permission bypass via `OPENCODE_PERMISSION` environment variable
- Model selection uses "provider/model" format (e.g., "anthropic/claude-sonnet-4-20250514")
- Cannot rely on stderr for stall detection (errors go to log files only)

The provider must handle these quirks while presenting a clean interface through the common `AgentResult` type.

### Plan
1. Create `tools/src/commands/ralph/providers/opencode.ts` with:
   - `invokeOpencode()` function implementing the provider interface
   - JSONL stream parsing with line-by-line collection
   - `normalizeOpencodeResult()` to map JSONL events to `AgentResult`
   - Hard timeout enforcement (Issue #8203 mitigation)
   - Process spawn with `OPENCODE_PERMISSION` environment variable
   - Binary detection with clear error when `opencode` not in PATH
   - SIGTERM/SIGKILL escalation for hung processes
2. Parse JSONL events: `step_start`, `text`, `step_finish` with `reason: "stop"`
3. Extract: result text, costUsd, durationMs, sessionId, tokenUsage
4. Handle partial/incomplete JSONL streams (simulating hang scenarios)
5. Add comprehensive error handling for API errors, parse errors, timeouts

### Acceptance Criteria
- [x] `invokeOpencode()` function exists and implements provider interface
- [x] JSONL parsing correctly extracts result from `step_finish` events
- [x] Hard timeout kills process after configured duration (Issue #8203)
- [x] Permission bypass works via `OPENCODE_PERMISSION` env var
- [x] Model selection accepts "provider/model" format
- [x] Clear error message when `opencode` binary not found in PATH
- [x] Process terminates correctly even without stderr output
- [x] All OpenCode-specific quirks documented in code comments

### Test Plan
- [x] Unit tests with static JSONL fixtures (see TASK-046)
- [x] Integration tests for hard timeout behavior (see TASK-047)
- [x] Manual testing: `aaa ralph build --provider opencode` works end-to-end
- [x] Verify permission bypass via environment variable
- [x] Verify model selection with provider/model format
- [x] Test error handling when binary not found

### Scope
- **In:** OpenCode provider implementation, JSONL parsing, hard timeout, permission bypass
- **Out:** Registry integration (TASK-046), test fixtures, model registry updates

### Notes
**Critical Implementation Detail - Issue #8203:**
OpenCode hangs forever on API errors (rate limits, auth failures) and writes nothing to stderr. The ONLY reliable termination is hard timeout. Do NOT rely on:
- Exit codes (unreliable, process hangs instead of exiting)
- Stderr output (errors go to log files, not stderr)
- SIGTERM alone (may not work during hangs)

**JSONL Format Example:**
```json
{"type":"step_start","timestamp":...,"sessionID":"ses_XXX"}
{"type":"text","timestamp":...,"part":{"text":"Hello!"}}
{"type":"step_finish","timestamp":...,"part":{"reason":"stop","cost":0.001,"tokens":{"input":12748,"output":6}}}
```

**Process Termination Strategy:**
1. Start hard timeout timer immediately on process spawn
2. On timeout: log error referencing Issue #8203, then SIGKILL
3. SIGKILL is required - SIGTERM may not work during API error hangs
4. Clear timeout if process exits normally before timeout

**Environment Setup:**
```typescript
const env = {
  ...process.env,
  OPENCODE_PERMISSION: '{"*":"allow"}'  // Required for automation
};
```

**Model Format:**
OpenCode uses "provider/model" format:
- `openai/gpt-4o`
- `anthropic/claude-sonnet-4-20250514`
- `google/gemini-2.5-pro-preview-05-06`

### Related Documentation
- @context/blocks/construct/ralph-patterns.md
- @docs/planning/milestones/004-MULTI-CLI/stories/003-opencode-support.md
- **Gap:** JSONL parsing patterns - see if existing patterns apply or document new ones
