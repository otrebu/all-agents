---
depends:
  - @docs/planning/milestones/004-MULTI-CLI/MILESTONE.md
  - @docs/planning/milestones/004-MULTI-CLI/stories/001-provider-foundation.md
  - @docs/planning/milestones/004-MULTI-CLI/stories/002-claude-refactor.md
  - @context/foundations/quality/gate-standards.md
---

## Story: OpenCode Provider Support

### Narrative
As a developer who prefers OpenCode, I want to use ralph with my preferred AI CLI so that I can benefit from ralph's workflow automation while using the tools I like.

### Persona
**The OpenCode Adopter** - A developer who has chosen OpenCode as their AI CLI. They care about:
- Flexibility to use their preferred AI tool
- Same ralph workflow benefits regardless of provider
- Access to multiple models through OpenCode's provider ecosystem
- Transparent cost tracking and session management

### Context
OpenCode is the first new provider to implement after the foundation. It has different characteristics from Claude:
- Uses JSONL streaming output format
- Requires hard timeout enforcement (Issue #8203 - hangs on API errors)
- Permission bypass via environment variable
- Model selection uses provider/model format (e.g., "anthropic/claude-sonnet-4-20250514")
- Cannot rely on stderr for stall detection

### Acceptance Criteria
- [x] `aaa ralph build --provider opencode` works end-to-end
- [x] Permission bypass via `OPENCODE_PERMISSION` environment variable works
- [x] Model selection with provider/model format works
- [x] JSONL parsing extracts correct result, cost, and token usage
- [x] Hard timeout triggers correctly when API errors occur (Issue #8203)
- [x] Process terminates correctly even without stderr output
- [x] No false positives in stall detection
- [x] Clear error when `opencode` binary not found in PATH

### Tasks
- [TASK-045-opencode-implementation](../tasks/TASK-045-opencode-implementation.md) - OpenCode provider implementation with JSONL parsing and hard timeout
- [TASK-046-opencode-registry](../tasks/TASK-046-opencode-registry.md) - Register OpenCode in provider registry and update types
- [TASK-047-opencode-parser-tests](../tasks/TASK-047-opencode-parser-tests.md) - Unit tests for JSONL parsing with fixtures
- [TASK-048-opencode-timeout-tests](../tasks/TASK-048-opencode-timeout-tests.md) - Integration tests for hard timeout enforcement (Issue #8203)

### Notes
**OpenCode JSONL Format:**
```json
{"type":"step_start","timestamp":...,"sessionID":"ses_XXX",...}
{"type":"text","timestamp":...,"part":{"text":"Hello!",...}}
{"type":"step_finish","timestamp":...,"part":{"reason":"stop","cost":0.001,"tokens":{"input":12748,"output":6,...}}}
```

**Normalization Strategy:**
- Parse JSONL stream line by line
- Extract from `step_finish` event with `reason: "stop"`
- Map to common `AgentResult` interface
- Extract: result, costUsd, durationMs, sessionId, tokenUsage

**OpenCode-Specific Behaviors:**
| Aspect | Behavior |
|--------|----------|
| **Headless Mode** | `opencode run` |
| **Permission Bypass** | `OPENCODE_PERMISSION='{"*":"allow"}'` environment variable |
| **Binary** | `opencode` |
| **SIGTERM** | ⚠️ Partial - children may persist |
| **SIGKILL** | ❌ Usually not needed |
| **Stall Detection** | ⚠️ Limited - stdout JSONL only |
| **Exit Codes** | Variable - Poor reliability |
| **Supported Modes** | supervised, headless-sync, headless-async |
| **Platform Issues** | Ghost port bindings on Windows |

**Permission Bypass Details:**
| Aspect | Implementation |
|--------|----------------|
| **Method** | `OPENCODE_PERMISSION='{"*":"allow"}'` environment variable |
| **Detection** | Check TUI for "ask" status |
| **Failure Handling** | Retry without bypass - explicit deny rules indicate intentional restrictions |

**Process Termination Strategy:**
- SIGTERM handling: ⚠️ Partial - children may persist after parent exits
- SIGKILL required: ❌ Usually not needed
- Ghost port bindings: Known issue on Windows platform
- Notes: Standard termination usually works but child processes may linger

**Stall Detection Requirements:**
- Activity Signal: stdout JSONL stream
- Stall Detection: ⚠️ Limited - only stdout activity, no stderr
- Hard Timeout: ✅ **REQUIRED** - hangs forever on API errors (Issue #8203)
- Critical: Cannot rely on stderr for stall detection - errors go to log files only

**Exit Code Reliability:**
- Exit Codes: Variable
- Reliability: ❌ **Poor** - hangs instead of exiting on errors
- Notes: Hard timeout is essential - do not rely on exit codes

**Invocation Modes Support:**
| Mode | Supported | Notes |
|------|-----------|-------|
| supervised | ✅ Yes | Interactive mode |
| headless-sync | ✅ Yes | `opencode run` with sync execution |
| headless-async | ✅ Yes | Background execution |
| haiku | ❌ No | Not supported by OpenCode |

**Critical Issues:**
- **Issue #8203**: On API errors (rate limits, auth failures), OpenCode logs to file but **never exits** and writes **nothing to stderr**
  - **Root Cause**: Error logging to file instead of stderr, process hangs indefinitely
  - **Mitigation**: Hard timeout is REQUIRED - detection must rely on hard timeout only
  - **Impact**: **HIGH** - process will hang forever without hard timeout enforcement
  - **Detection**: Monitor process duration, kill after hard timeout regardless of output

**Configuration:**
```json
{
  "ralph": {
    "provider": "opencode",
    "model": "anthropic/claude-sonnet-4-20250514",
    "timeouts": {
      "stallMinutes": 10,
      "hardMinutes": 60
    }
  }
}
```

**Environment Variable Override:**
```bash
# Force OpenCode provider
RALPH_PROVIDER=opencode aaa ralph build

# Permission bypass (required for automation)
export OPENCODE_PERMISSION='{"*":"allow"}'
```

**CLI Flag Override:**
```bash
# Highest priority - explicit provider selection with model
aaa ralph build --provider opencode --model openai/gpt-4o

# Using Anthropic model through OpenCode
aaa ralph build --provider opencode --model anthropic/claude-sonnet-4-20250514
```

**Model Format:**
OpenCode uses "provider/model" format for model selection:
- `openai/gpt-4o`
- `openai/o3-mini`
- `anthropic/claude-sonnet-4-20250514`
- `google/gemini-2.5-pro-preview-05-06`

**Testing Requirements:**

**Unit Tests (Deterministic, Fast):**
- Parser tests with static fixtures:
  - `fixtures/opencode-success.jsonl` - Normal JSONL stream
  - `fixtures/opencode-hang.jsonl` - Incomplete stream (simulates Issue #8203)
  - `fixtures/opencode-error.jsonl` - Error response format
- JSONL normalization to `AgentResult` interface
- Line-by-line parsing logic

**Integration Tests (Mock-Based):**
- Mock process that hangs silently (simulates Issue #8203)
- Hard timeout trigger verification
- SIGTERM/SIGKILL escalation paths
- Process termination without stderr output

**Manual Testing Checklist:**
- [x] `aaa ralph build --provider opencode` works
- [x] Permission bypass via env var works
- [x] Model selection with provider/model format works
- [x] JSONL parsing extracts correct result
- [x] **Hard timeout triggers when API errors occur (Issue #8203)**
- [x] **Process terminates correctly even without stderr output**
- [x] No false positives in stall detection
- [x] Clear error when `opencode` binary not found

**Files Created:**
- `tools/src/commands/ralph/providers/opencode.ts` - OpenCode provider implementation

**Files Modified:**
- `tools/src/commands/ralph/providers/registry.ts` - Add opencode to REGISTRY
- `tools/src/commands/ralph/providers/types.ts` - Add OpencodeConfig type (if not in foundation)

**Implementation Details:**

**Type Definition:**
```typescript
// providers/types.ts
interface OpencodeConfig extends BaseProviderConfig {
  provider: 'opencode';
  model?: string;  // provider/model format, e.g., "anthropic/claude-sonnet-4-20250514"
}
```

**Normalization Function:**
```typescript
// Parse OpenCode JSONL format and normalize to AgentResult
const normalizeOpencodeResult = (jsonlLines: string[]): AgentResult => {
  const finishEvent = jsonlLines
    .map(line => JSON.parse(line))
    .find(entry => entry.type === 'step_finish' && entry.part?.reason === 'stop');
  
  if (!finishEvent) {
    throw new Error('No step_finish event found in OpenCode output');
  }
  
  const textEvents = jsonlLines
    .map(line => JSON.parse(line))
    .filter(entry => entry.type === 'text')
    .map(entry => entry.part?.text)
    .join('');
  
  return {
    result: textEvents,
    costUsd: finishEvent.part.cost,
    durationMs: Date.now() - startTime, // Calculate from timestamps
    sessionId: finishEvent.sessionID,
    tokenUsage: {
      input: finishEvent.part.tokens.input,
      output: finishEvent.part.tokens.output,
      reasoning: finishEvent.part.tokens.reasoning,
      cacheRead: finishEvent.part.tokens.cacheRead,
      cacheWrite: finishEvent.part.tokens.cacheWrite
    }
  };
};
```

**Hard Timeout Enforcement:**
```typescript
// CRITICAL: Issue #8203 - OpenCode hangs forever on API errors
const invokeOpencode = async (options: InvocationOptions): Promise<AgentResult> => {
  const hardTimeout = options.config.timeoutMs || 3600000; // 60 minutes default
  
  const process = spawn('opencode', ['run', '--json', ...]);
  
  // Hard timeout is REQUIRED - cannot rely on stderr or exit codes
  const timeoutId = setTimeout(() => {
    console.error(`Hard timeout reached (${hardTimeout}ms) - killing OpenCode process (Issue #8203)`);
    process.kill('SIGKILL'); // Force kill - SIGTERM may not work
  }, hardTimeout);
  
  try {
    const result = await collectJsonlOutput(process);
    clearTimeout(timeoutId);
    return normalizeOpencodeResult(result);
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
};
```

**Registry Integration:**
```typescript
// providers/registry.ts
import { invokeOpencode } from './opencode';

const REGISTRY: Record<ProviderType, ProviderCapabilities> = {
  claude: { 
    available: true, 
    invoke: invokeClaude, 
    supportedModes: ['supervised', 'headless-sync', 'headless-async', 'haiku'] 
  },
  opencode: { 
    available: true, 
    invoke: invokeOpencode, 
    supportedModes: ['supervised', 'headless-sync', 'headless-async'] 
  },
  // ... other providers
};
```

**Environment Setup:**
```typescript
// Set required environment variables for OpenCode
const setupOpencodeEnv = (): NodeJS.ProcessEnv => {
  return {
    ...process.env,
    OPENCODE_PERMISSION: '{"*":"allow"}' // Required for automation
  };
};
```

**References:**
- [OpenCode Documentation](https://opencode.ai/docs/)
- [OpenCode JSON Event Cheatsheet](https://takopi.dev/reference/runners/opencode/stream-json-cheatsheet/)
- Issue #8203: OpenCode hangs forever on API errors
