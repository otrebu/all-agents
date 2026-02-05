---
depends:
  - @docs/planning/milestones/004-MULTI-CLI/MILESTONE.md
  - @docs/planning/milestones/004-MULTI-CLI/stories/001-provider-foundation.md
  - @context/foundations/quality/gate-standards.md
---

## Story: Claude Provider Refactor

### Narrative
As a ralph user, I want my existing Claude Code workflows to continue working seamlessly so that the multi-CLI migration doesn't break my current setup.

### Persona
**The Existing Ralph User** - Someone already using ralph with Claude Code. They care about:
- Zero breaking changes to their workflow
- Same performance and reliability
- No need to update configs or learn new commands
- Confidence that existing features still work

### Context
Before adding new providers, we must refactor the existing Claude Code integration to use the new provider abstraction. This ensures backward compatibility and validates that the abstraction actually works. The existing `claude.ts` will be moved to `providers/claude.ts` and updated to use the new types and registry.

### Acceptance Criteria
- [ ] `aaa ralph build` works without any changes to existing configs
- [ ] `aaa ralph build --provider claude` explicit selection works
- [ ] JSON parsing returns correct cost/duration/sessionId from Claude output
- [ ] Stall detection continues to work as before
- [ ] Interrupt (Ctrl+C) exits cleanly
- [ ] No orphaned MCP processes after exit
- [ ] All existing tests pass

### Tasks
- [TASK-039-claude-refactor](./tasks/TASK-039-claude-refactor.md) - Move and refactor Claude provider to use new abstraction
- [TASK-040-registry-integration](./tasks/TASK-040-registry-integration.md) - Integrate provider registry with build and review commands
- [TASK-041-calibrate-integration](./tasks/TASK-041-calibrate-integration.md) - Update calibrate.ts to use provider registry
- [TASK-042-cleanup-verify](./tasks/TASK-042-cleanup-verify.md) - Delete legacy claude.ts and verify migration
- [TASK-043-claude-unit-tests](./tasks/TASK-043-claude-unit-tests.md) - Add unit tests with fixtures
- [TASK-044-claude-integration-tests](./tasks/TASK-044-claude-integration-tests.md) - Add mock-based integration tests

### Notes
**Migration Steps:**
1. Move `claude.ts` → `providers/claude.ts`
2. Refactor to use new discriminated union types
3. Implement `AgentResult` normalization for Claude JSON format
4. Update `build.ts` to use provider registry
5. Update `review/index.ts` to use provider registry
6. Delete root `claude.ts` after migration

**Claude JSON Format:**
```json
[
  {"type": "system", "content": "..."},
  {"type": "assistant", "content": "..."},
  {"type": "result", "result": "...", "duration_ms": 1234, "total_cost_usd": 0.05, "session_id": "..."}
]
```

**Normalization Strategy:**
- Parse array, find `type: "result"` entry
- Map to common `AgentResult` interface
- Extract: result, costUsd, durationMs, sessionId, tokenUsage

**Claude-Specific Behaviors:**
| Aspect | Behavior |
|--------|----------|
| **Headless Mode** | `claude -p` |
| **Permission Bypass** | `--dangerously-skip-permissions` |
| **Binary** | `claude` |
| **SIGTERM** | ✅ Graceful handling |
| **SIGKILL** | ❌ Only if SIGTERM fails |
| **Stall Detection** | ✅ Via stderr writes |
| **Exit Codes** | 0, 1, 2, 127 - Good reliability |
| **Supported Modes** | supervised, headless-sync, headless-async, haiku |

**Permission Bypass Details:**
| Aspect | Implementation |
|--------|----------------|
| **Method** | `--dangerously-skip-permissions` CLI flag |
| **Detection** | Check for trust prompts in stderr |
| **Failure Handling** | Retry without bypass is safe - tool works with permission prompts |

**Process Termination Strategy:**
- SIGTERM handling: ✅ Graceful - Claude responds well to SIGTERM
- SIGKILL required: ❌ Only if SIGTERM fails - prefer graceful shutdown
- Orphaned MCP servers: May leave zombie processes (Issue #1935)

**Stall Detection Requirements:**
- Activity Signal: stderr writes
- Stall Detection: ✅ Yes - reliable via stderr monitoring
- Hard Timeout: ✅ Recommended but not required - SIGTERM works reliably

**Exit Code Reliability:**
- Exit Codes: 0 (success), 1 (error), 2 (usage error), 127 (command not found)
- Reliability: ✅ Good - standard Unix codes
- Notes: Predictable exit behavior

**Invocation Modes Support:**
| Mode | Supported | Notes |
|------|-----------|-------|
| supervised | ✅ Yes | Interactive mode |
| headless-sync | ✅ Yes | `claude -p` with sync execution |
| headless-async | ✅ Yes | Background execution |
| haiku | ✅ Yes | Quick mode for simple tasks |

**Known Issues:**
- **Issue #1935**: MCP servers not properly terminated on exit, causing zombie processes
  - **Root Cause**: Child processes spawned by MCP servers not reaped
  - **Mitigation**: ~~Explicit cleanup of child processes on exit~~ **DEFERRED** - Will be addressed in future iteration
  - **Impact**: Medium - may accumulate zombies over time, but acceptable for initial refactor
  - **Detection**: Check for lingering `claude-mcp-*` processes after session ends
  - **Decision**: MCP cleanup deferred to keep Story 002 scope manageable. Existing behavior (potential zombie processes) is preserved.

**Configuration:**
```json
{
  "ralph": {
    "provider": "claude",
    "model": "claude-sonnet-4",
    "timeouts": {
      "stallMinutes": 10,
      "hardMinutes": 60
    }
  }
}
```

**Environment Variable Override:**
```bash
# Force Claude provider
RALPH_PROVIDER=claude aaa ralph build
```

**CLI Flag Override:**
```bash
# Highest priority - explicit provider selection
aaa ralph build --provider claude --model claude-sonnet-4
```

**Backward Compatibility:**
- Default provider remains 'claude' when none specified
- Existing `aaa.config.json` continues working
- Environment variable `RALPH_PROVIDER` can override
- CLI flag `--provider claude` takes highest priority

**Testing Requirements:**

**Unit Tests (Deterministic, Fast):**
- Parser tests with static fixtures:
  - `fixtures/claude-success.json` - Normal successful response
  - `fixtures/claude-error.json` - Error response format
  - `fixtures/claude-malformed.json` - Invalid JSON handling
- Provider selection logic tests
- JSON normalization to `AgentResult` interface

**Integration Tests (Mock-Based):**
- Mock subprocess timeout logic without real CLI
- SIGTERM/SIGKILL escalation paths
- Stall detection trigger verification
- ~~Process cleanup verification~~ **DEFERRED** - MCP cleanup deferred

**Manual Testing Checklist:**
- [ ] `aaa ralph build` uses claude by default
- [ ] `aaa ralph build --provider claude` explicit selection
- [ ] JSON parsing returns correct cost/duration/sessionId
- [ ] Stall detection triggers after timeout
- [ ] Interrupt (Ctrl+C) exits cleanly
- [ ] ~~No orphaned MCP processes after exit~~ **DEFERRED** - MCP cleanup deferred, existing behavior preserved
- [ ] Permission bypass flag works correctly
- [ ] All 3 invocation modes work (supervised, headless-async, haiku) — headless-sync removed in timeout protection migration

**Files Modified:**
- `tools/src/commands/ralph/claude.ts` → `tools/src/commands/ralph/providers/claude.ts` (moved and refactored)
  - Update imports to use new types from `providers/types.ts`
  - Implement `AgentResult` normalization
  - ~~Add explicit MCP cleanup logic~~ **DEFERRED**
- `tools/src/commands/ralph/build.ts` (updated imports)
  - Import from `providers/registry` instead of `./claude`
  - Call `selectProvider()` at `runBuild()` start
  - Use provider-agnostic invocation
- `tools/src/commands/ralph/review/index.ts` (updated imports)
  - Same import updates as build.ts
  - Use provider registry for review command

**Files Deleted:**
- `tools/src/commands/ralph/claude.ts` (root level, after migration verified)

**Files Created:**
- `tools/src/commands/ralph/providers/claude.ts` (refactored from root claude.ts)

**Implementation Details:**

**Type Refactoring:**
```typescript
// Old (in root claude.ts)
interface ClaudeResult {
  result: string;
  durationMs: number;
  costUsd: number;
}

// New (using providers/types.ts)
import { AgentResult, ProviderConfig } from './types';

// Claude-specific config extends base
interface ClaudeConfig extends BaseProviderConfig {
  provider: 'claude';
  // Uses native model names
}
```

**Normalization Function:**
```typescript
// Parse Claude JSON array format and normalize to AgentResult
const normalizeClaudeResult = (jsonArray: unknown[]): AgentResult => {
  const resultEntry = jsonArray.find(entry => entry.type === 'result');
  if (!resultEntry) {
    throw new Error('No result entry found in Claude output');
  }
  return {
    result: resultEntry.result,
    costUsd: resultEntry.total_cost_usd,
    durationMs: resultEntry.duration_ms,
    sessionId: resultEntry.session_id,
    tokenUsage: resultEntry.token_usage
  };
};
```

**MCP Cleanup Logic:**
```typescript
// Explicit cleanup of MCP child processes
const cleanupMcpProcesses = async (parentPid: number): Promise<void> => {
  // Find all child processes spawned by MCP servers
  // Send SIGTERM, wait, then SIGKILL if needed
  // Prevents zombie processes (Issue #1935)
};
```

**Registry Integration:**
```typescript
// providers/registry.ts
import { invokeClaude } from './claude';

const REGISTRY: Record<ProviderType, ProviderCapabilities> = {
  claude: { 
    available: true, 
    invoke: invokeClaude, 
    supportedModes: ['supervised', 'headless-sync', 'headless-async', 'haiku'] 
  },
  // ... other providers
};
```
