# Milestone 004-MULTI-CLI: Multi-CLI Provider Abstraction

## Overview

Abstract ralph's CLI provider layer to support multiple AI coding agents beyond Claude Code. Enable support for opencode, codex, gemini-cli, and pi-mono while maintaining a unified interface.

## Background

Ralph currently has a tight coupling to Claude Code CLI (`claude`). As the AI coding agent ecosystem grows, users want flexibility to choose their preferred CLI while maintaining ralph's workflow benefits.

### Supported CLI Providers

| Provider | Status | Headless Mode | Permission Bypass | Binary |
|----------|--------|---------------|-------------------|--------|
| **Claude Code** | ✅ Current | `claude -p` | `--dangerously-skip-permissions` | `claude` |
| **OpenCode** | 🎯 Target | `opencode run` | `OPENCODE_PERMISSION='{"*":"allow"}'` | `opencode` |
| **Codex** | 📋 Planned | `codex exec` | `--dangerously-bypass-approvals-and-sandbox` | `codex` |
| **Gemini CLI** | 📋 Planned | `gemini -p` | `--yolo` | `gemini` |
| **Pi Mono** | 📋 Planned | `pi -p` | YOLO by default | `pi` |
| **Cursor CLI** | 📋 Planned | `cursor-agent -p` | Auto-Run mode | `agent` |

## Status

- Milestone status: **Complete** (2026-02-07)
- Source of truth: `docs/planning/milestones/004-MULTI-CLI/subtasks.json` (`20/20` subtasks done)
- Story/task acceptance and test-plan checklists have been backfilled as complete.
- Closeout commits: `d2f6a52` and `d5792df` on `feature/multi-cli-abstraction`
- Note: Deep-dive and exploratory checklists in this document are retained as historical planning artifacts.

## Goals

1. **Provider Abstraction**: Unify invocation patterns across different CLI providers
2. **Feature Parity**: Support supervised, headless-sync, headless-async, and haiku modes for all providers
3. **Model Registry**: Static baseline with refreshable dynamic discovery
4. **Zero Breaking Changes**: Existing ralph configs continue working (defaults to claude)
5. **Extensibility**: Easy to add new providers in the future

## Non-Goals

- Support all features of every CLI (focus on core ralph workflow needs)
- Real-time model discovery (use refresh command instead)
- MCP server abstraction (out of scope)

## Architecture

### Directory Structure

```
tools/src/commands/ralph/
├── providers/
│   ├── types.ts              # Discriminated union types
│   ├── registry.ts           # Provider selection & registry
│   ├── utils.ts              # Shared utilities (stall detection)
│   ├── models-static.ts      # Static baseline models
│   ├── models-dynamic.ts     # Discovered models (generated)
│   ├── models.ts             # Model registry merger
│   ├── claude.ts             # Claude Code implementation
│   ├── opencode.ts           # OpenCode implementation
│   ├── codex.ts              # (future)
│   ├── gemini.ts             # (future)
│   └── pi.ts                 # (future)
├── build.ts                  # Updated to use abstraction
├── review/
│   └── index.ts              # Updated to use abstraction
└── [DELETE claude.ts]        # Remove after migration
```

### Type Design (No Classes)

Following coding standards: discriminated unions, decisions at edges, functions over classes.

```typescript
// providers/types.ts
type ProviderType = 'claude' | 'opencode' | 'codex' | 'gemini' | 'pi' | 'cursor';

type InvocationMode = 'supervised' | 'headless-sync' | 'headless-async' | 'haiku';

interface AgentResult {
  result: string;
  costUsd: number;
  durationMs: number;
  sessionId: string;
  tokenUsage?: {
    input: number;
    output: number;
    reasoning?: number;
    cacheRead?: number;
    cacheWrite?: number;
  };
}

// Discriminated unions for provider-specific configs
interface BaseProviderConfig {
  timeoutMs?: number;
  workingDirectory?: string;
}

interface ClaudeConfig extends BaseProviderConfig {
  provider: 'claude';
  // Claude uses native model names
}

interface OpencodeConfig extends BaseProviderConfig {
  provider: 'opencode';
  model?: string;  // provider/model format, e.g., "anthropic/claude-sonnet-4-20250514"
}

type ProviderConfig = ClaudeConfig | OpencodeConfig;

interface InvocationOptions {
  mode: InvocationMode;
  prompt: string;
  config: ProviderConfig;
}
```

### Provider Selection Priority

1. **CLI flag**: `--provider opencode` (highest priority)
2. **Environment variable**: `RALPH_PROVIDER=opencode`
3. **Config file**: `aaa.config.json` → `ralph.provider`
4. **Auto-detect**: Check available CLIs in priority order (claude, opencode, codex, gemini, pi)

### Provider Registry Pattern

```typescript
// providers/registry.ts
type InvokerFn = (options: InvocationOptions) => Promise<AgentResult>;

interface ProviderCapabilities {
  available: boolean;
  invoke: InvokerFn;
  supportedModes: InvocationMode[];
}

const REGISTRY: Record<ProviderType, ProviderCapabilities> = {
  claude: { available: true, invoke: invokeClaude, supportedModes: ['supervised', 'headless-sync', 'headless-async', 'haiku'] },
  opencode: { available: true, invoke: invokeOpencode, supportedModes: ['supervised', 'headless-sync', 'headless-async'] },
  codex: { available: false, invoke: null, supportedModes: [] },
  gemini: { available: false, invoke: null, supportedModes: [] },
  pi: { available: false, invoke: null, supportedModes: [] },
  cursor: { available: false, invoke: null, supportedModes: [] }, // Blocked: Issue #3588 - headless mode hangs
};

// Lazy availability check with helpful error
const invokeWithProvider = async (provider: ProviderType, options: InvocationOptions): Promise<AgentResult> => {
  const binary = PROVIDER_BINARIES[provider];
  if (!(await isBinaryAvailable(binary))) {
    throw new ProviderError(
      `Provider '${provider}' is not available. Binary '${binary}' not found in PATH.\n` +
      `Install: ${getInstallInstructions(provider)}`
    );
  }
  return REGISTRY[provider].invoke(options);
};
```

## JSON Output Normalization

Each provider has different JSON output formats. Normalize to common `AgentResult` interface.

### Claude Code Format

```json
[
  {"type": "system", "content": "..."},
  {"type": "assistant", "content": "..."},
  {"type": "result", "result": "...", "duration_ms": 1234, "total_cost_usd": 0.05, "session_id": "..."}
]
```

### OpenCode Format (JSONL)

```json
{"type":"step_start","timestamp":...,"sessionID":"ses_XXX",...}
{"type":"text","timestamp":...,"part":{"text":"Hello!",...}}
{"type":"step_finish","timestamp":...,"part":{"reason":"stop","cost":0.001,"tokens":{"input":12748,"output":6,...}}}
```

### Codex Format (JSONL)

```json
{"type":"system", "content":"..."}
{"type":"assistant", "content":"..."}
{"type":"result", "result":"...", "duration_ms":1234, "total_cost_usd":0.05, "session_id":"..."}
```

### Gemini CLI Format (JSON)

```json
{
  "response": "...",
  "stats": {
    "models": [{"name": "gemini-2.5-pro", "inputTokens": 100, "outputTokens": 50}],
    "tools": [...],
    "files": [...]
  }
}
```

### Pi Mono Format (JSONL)

```json
{"type": "message_update", "content": "..."}
{"type": "tool_call_start", "tool": "bash", "args": "..."}
{"type": "tool_result", "result": "..."}
{"type": "turn_end", "usage": {"input": 100, "output": 50}}
```

### Cursor CLI Format (JSON/JSONL)

```json
// Single JSON (--output-format json)
{
  "result": "...",
  "duration_ms": 1234,
  "session_id": "...",
  "tool_calls": [...]
}

// Streaming JSONL (--output-format stream-json)
{"type": "system", "apiKeySource": "...", "session_id": "..."}
{"type": "assistant", "content": "..."}
{"type": "tool_call", "tool": "read", "started": true}
{"type": "tool_call", "tool": "read", "completed": true, "result": "..."}
{"type": "result", "result": "...", "duration_ms": 1234}
```

### Normalization Strategy

- **Claude**: Parse array, find `type: "result"` entry
- **OpenCode**: Parse JSONL stream, extract from `step_finish` event with `reason: "stop"`
- **Codex**: Parse JSONL stream, look for `type: "result"` or final assistant message
- **Gemini**: Parse single JSON, extract `response` and `stats.models[0]` for usage
- **Pi**: Parse JSONL stream, collect `message_update` events, extract from `turn_end`
- **Cursor**: Parse based on format - single JSON object or JSONL stream with `type: "result"`

All map to common interface: `{ result, costUsd, durationMs, sessionId, tokenUsage }`

## Model Registry

### Static Baseline (Committed)

```typescript
// providers/models-static.ts
export const STATIC_MODELS: ModelInfo[] = [
  // Claude models (native to claude CLI)
  { id: 'claude-sonnet-4', provider: 'claude', cliFormat: 'claude-sonnet-4-20250514', costHint: 'standard' },
  { id: 'claude-haiku', provider: 'claude', cliFormat: 'claude-3-5-haiku-latest', costHint: 'cheap' },
  
  // OpenCode models (provider/model format)
  { id: 'gpt-4o', provider: 'opencode', cliFormat: 'openai/gpt-4o', costHint: 'standard' },
  { id: 'claude-sonnet-opencode', provider: 'opencode', cliFormat: 'anthropic/claude-sonnet-4-20250514', costHint: 'standard' },
];
```

### Dynamic Discovery (Refreshable)

```typescript
// providers/models-dynamic.ts (auto-generated, committed)
export const DISCOVERED_MODELS: ModelInfo[] = [
  // Discovered 2026-02-05 via `aaa ralph refresh-models`
  { id: 'gemini-2.5-pro', provider: 'opencode', cliFormat: 'google/gemini-2.5-pro-preview-05-06' },
  { id: 'o3-mini', provider: 'opencode', cliFormat: 'openai/o3-mini' },
];
```

### Refresh Command

```bash
# Refresh model registry from available CLI providers
aaa ralph refresh-models

# Show what would be discovered without updating
aaa ralph refresh-models --dry-run

# Refresh specific provider only
aaa ralph refresh-models --provider opencode
```

### Tab Completion

```typescript
// Merged registry for tab completion
export const getModelCompletions = (): string[] => {
  const allModels = [...STATIC_MODELS, ...DISCOVERED_MODELS];
  return [...new Set(allModels.map(m => m.id))].sort();
};
```

## Provider-Specific Behaviors & Quirks

### Process Termination Strategy

| Provider | SIGTERM Handling | SIGKILL Required | Notes |
|----------|------------------|------------------|-------|
| **Claude** | ✅ Graceful | ❌ Only if SIGTERM fails | May leave orphaned MCP servers |
| **OpenCode** | ⚠️ Partial (children persist) | ❌ Usually not needed | Ghost port bindings on Windows |
| **Codex** | ✅ Graceful | ❌ Only if SIGTERM fails | May hang on rate limits |
| **Gemini** | ❌ **Ignores SIGTERM** | ✅ **Always use SIGKILL** | Becomes unkillable in frozen state (Issue #15873) |
| **Pi** | ✅ Graceful (Bun runtime) | ❌ Only if SIGTERM fails | Standard Node.js signal handling |
| **Cursor** | ⚠️ Unreliable | ✅ Recommended | `-p` mode hangs frequently (Issue #3588) |

### Stall Detection Requirements

| Provider | Activity Signal | Stall Detection | Hard Timeout Required |
|----------|-----------------|-----------------|----------------------|
| **Claude** | stderr writes | ✅ Yes | ✅ Recommended |
| **OpenCode** | stdout JSONL | ⚠️ Limited | ✅ **Required** - hangs forever on API errors (Issue #8203) |
| **Codex** | stderr + stdout JSONL | ✅ Yes | ✅ Recommended |
| **Gemini** | stdout JSON | ⚠️ Unreliable | ✅ **Required** - ignores SIGTERM |
| **Pi** | stdout JSONL | ✅ Yes | ✅ Recommended |
| **Cursor** | stdout JSON | ❌ **Unreliable** | ✅ **Required** - `-p` hangs indefinitely |

### Critical Issues Summary

1. **OpenCode (Issue #8203)**: On API errors (rate limits, auth failures), OpenCode logs to file but **never exits** and writes **nothing to stderr**. Detection must rely on hard timeout only.

2. **Gemini CLI (Issue #15873)**: When terminal closes, enters infinite spin loop polling revoked FDs at 100% CPU. **SIGTERM is ignored** - must use SIGKILL immediately.

3. **Cursor CLI (Issue #3588)**: `-p` (print/headless) mode hangs indefinitely due to shell integration detection failures. **Not suitable for automation** until fixed.

4. **Claude Code (Issue #1935)**: MCP servers not properly terminated on exit, causing zombie processes. Requires explicit cleanup of child processes.

### Exit Code Reliability

| Provider | Exit Codes | Reliability | Notes |
|----------|------------|-------------|-------|
| **Claude** | 0, 1, 2, 127 | ✅ Good | Standard Unix codes |
| **OpenCode** | Variable | ❌ **Poor** | Hangs instead of exiting on errors |
| **Codex** | Partial | ⚠️ Fair | Abrupt exits on rate limits |
| **Gemini** | 41-53 | ✅ **Excellent** | Specific codes for each error type |
| **Pi** | Undocumented | ⚠️ Unknown | Limited documentation |
| **Cursor** | Undocumented | ❌ **Poor** | `-p` mode hangs, no exit code |

## Permission Bypass by Provider

| Provider | Method | Implementation | Bypass Failure Detection |
|----------|--------|----------------|-------------------------|
| **Claude** | `--dangerously-skip-permissions` | CLI flag | Check for trust prompts in stderr |
| **OpenCode** | `OPENCODE_PERMISSION='{"*":"allow"}'` | Environment variable | Check TUI for "ask" status |
| **Codex** | `--dangerously-bypass-approvals-and-sandbox` | CLI flag | Use `/status` command to verify |
| **Gemini** | `--yolo` | CLI flag | Check UI for YOLO indicator |
| **Pi** | N/A (YOLO by default) | No action needed | N/A |
| **Cursor** | Auto-Run mode + allowlist | Config file | Check allowlist in UI |

### Permission Bypass Failure Handling

**Claude**: Retry without bypass is safe - tool works with permission prompts
**OpenCode**: Retry without bypass - explicit deny rules indicate intentional restrictions  
**Codex**: **Fail fast** - sandbox can silently re-enter, creating false sense of security
**Gemini**: Prompt user - YOLO may be disabled by enterprise policy
**Pi**: No bypass mechanism - permissions are agent-configurable
**Cursor**: Enable Workspace Trust - multiple CVEs patched, allowlist bypasses fixed

## Configuration

### aaa.config.json Schema Addition

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

### Environment Variable Override

```bash
# Override config file setting
RALPH_PROVIDER=opencode aaa ralph build
```

### CLI Flag Override

```bash
# Highest priority override
aaa ralph build --provider opencode --model gpt-4o
```

## Implementation Phases

### Phase 1: Foundation

1. **Create `providers/types.ts`**
   - Define discriminated union types
   - Define `AgentResult` interface
   - Define `ProviderConfig` types

2. **Create `providers/utils.ts`**
   - Extract stall detection from existing `claude.ts`
   - Create shared timeout utilities

3. **Create `providers/registry.ts`**
   - Provider selection logic
   - Lazy availability checking
   - Registry pattern implementation

### Phase 2: Claude Refactor

1. **Move `claude.ts` → `providers/claude.ts`**
   - Refactor to use new types
   - Implement `AgentResult` normalization
   - Update imports

2. **Update `build.ts`**
   - Import from `providers/registry`
   - Call `selectProvider()` at `runBuild()` start
   - Use provider-agnostic invocation

3. **Update `review/index.ts`**
   - Same import updates as build.ts

4. **Delete root `claude.ts`**
   - Remove legacy file

### Phase 3: OpenCode Implementation

1. **Create `providers/opencode.ts`**
   - Implement `invokeOpencode` function
   - Handle JSONL parsing
   - Normalize to `AgentResult`
   - Support all 3 invocation modes (supervised, headless-async, haiku; headless-sync removed)
   - **CRITICAL**: Implement hard timeout enforcement (Issue #8203 - OpenCode hangs forever on API errors)
   - **NOTE**: Cannot rely on stderr for stall detection - errors go to log files only

2. **Test OpenCode integration**
   - Verify JSON output parsing
   - Test permission bypass via env var
   - Test model selection with provider/model format
   - **Test hard timeout triggers correctly when API errors occur**
   - Verify no false positives in stall detection

### Phase 4: Model Registry

1. **Create `providers/models-static.ts`**
   - Baseline model definitions

2. **Create `providers/models-dynamic.ts`**
   - Placeholder for discovered models

3. **Create `providers/models.ts`**
   - Merge static + dynamic
   - Tab completion helpers

4. **Implement refresh command**
   - Add to ralph CLI
   - Discover from opencode `models` command
   - Update dynamic models file

### Phase 5: Testing & Polish

1. **Unit tests**
   - Provider selection logic
   - JSON parsing for each provider
   - Model registry merging

2. **Integration tests**
   - Test with both claude and opencode
   - Verify timeout/stall detection
   - Test config override hierarchy

3. **Documentation**
   - Update ralph docs
   - Add provider migration guide

## Testing Strategy

### MVP Testing Approach

Focus on **deterministic, fast tests** that don't require real CLIs or API keys.

#### Phase 1: Parser Unit Tests (MVP)

Test JSON parsing with static fixtures - no CLI subprocesses:

```typescript
// providers/__tests__/parsers.test.ts
describe('Claude JSON parser', () => {
  test('extracts result from array format', () => {
    const fixture = readFileSync('./fixtures/claude-success.json', 'utf8');
    const result = parseClaudeJson(fixture);
    expect(result.result).toBe('Task completed successfully');
    expect(result.costUsd).toBe(0.05);
    expect(result.durationMs).toBe(1234);
  });

  test('handles malformed JSON gracefully', () => {
    const result = parseClaudeJson('invalid json');
    expect(result.error).toBeDefined();
    expect(result.error.type).toBe('ParseError');
  });
});

describe('OpenCode JSONL parser', () => {
  test('extracts from step_finish event', () => {
    const fixture = readFileSync('./fixtures/opencode-success.jsonl', 'utf8');
    const result = parseOpencodeJson(fixture);
    expect(result.result).toBe('Hello!');
    expect(result.tokenUsage.input).toBe(12748);
  });
});
```

**Fixtures needed:**
- `fixtures/claude-success.json` - Normal successful response
- `fixtures/claude-error.json` - Error response format
- `fixtures/opencode-success.jsonl` - Normal JSONL stream
- `fixtures/opencode-hang.jsonl` - Incomplete stream (simulates Issue #8203)
- `fixtures/gemini-success.json` - Gemini JSON format
- `fixtures/pi-success.jsonl` - Pi JSONL format

#### Phase 2: Provider Selection Tests (MVP)

Test selection logic with pure functions:

```typescript
// providers/__tests__/registry.test.ts
describe('selectProvider', () => {
  test('CLI flag takes highest priority', () => {
    const result = selectProvider({
      cliFlag: 'opencode',
      envVar: 'claude',
      configFile: 'gemini'
    });
    expect(result).toBe('opencode');
  });

  test('defaults to claude when nothing specified', () => {
    const result = selectProvider({});
    expect(result).toBe('claude');
  });

  test('throws for unsupported provider', () => {
    expect(() => selectProvider({ cliFlag: 'unknown' }))
      .toThrow('Unknown provider: unknown');
  });
});
```

#### Phase 3: Mock-Based Integration Tests (Post-MVP)

Use mock subprocess to test timeout logic without real CLIs:

```typescript
// providers/__tests__/timeout-mock.test.ts
describe('timeout handling', () => {
  test('hard timeout triggers when no output', async () => {
    // Mock process that hangs silently (simulates OpenCode Issue #8203)
    const mockProcess = createMockProcess({
      stdout: [], // No output
      stderr: [], // No stderr
      hangDuration: 10000 // Hangs for 10s
    });

    const result = await invokeWithTimeout(mockProcess, {
      hardTimeoutMs: 5000,
      stallTimeoutMs: 2000
    });

    expect(result.timedOut).toBe(true);
    expect(result.termination.signal).toBe('SIGKILL');
  });
});
```

### E2E Testing (Manual Only)

**No automated E2E tests in CI** - too flaky, requires API keys, rate limits.

Instead:
1. **Manual testing checklist** (see below)
2. **Dogfooding** - use ralph build with different providers during development
3. **Recording/Replay** (Future) - capture real interactions, replay in tests

### Manual Testing Checklist

```markdown
## Claude Provider
- [ ] `aaa ralph build` uses claude by default
- [ ] `aaa ralph build --provider claude` explicit selection
- [ ] JSON parsing returns correct cost/duration/sessionId
- [ ] Stall detection triggers after timeout
- [ ] Interrupt (Ctrl+C) exits cleanly
- [ ] No orphaned MCP processes after exit

## OpenCode Provider
- [ ] `aaa ralph build --provider opencode` works
- [ ] Permission bypass via env var works
- [ ] Model selection with provider/model format works
- [ ] JSONL parsing extracts correct result
- [ ] **Hard timeout triggers when API errors occur (Issue #8203)**
- [ ] **Process terminates correctly even without stderr output**

## Gemini Provider
- [ ] `aaa ralph build --provider gemini` works
- [ ] YOLO mode bypasses permissions
- [ ] **SIGKILL used immediately for termination (Issue #15873)**
- [ ] No zombie processes after force kill

## Cursor Provider (Future - Blocked)
- [ ] `aaa ralph build --provider cursor` works (if implemented)
- [ ] **Known Issue**: -p mode hangs frequently (Issue #3588)
- [ ] **Recommendation**: Wait for CLI stability before production use

## Model Registry
- [ ] Tab completion shows merged static + dynamic models
- [ ] `aaa ralph refresh-models` updates dynamic models
- [ ] Unknown model ID shows helpful error
```

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| JSON format changes in CLI tools | High | Normalize in provider, isolate parsing logic |
| Provider-specific features missing | Medium | Document limitations, graceful degradation |
| Performance regression from abstraction | Low | Benchmark before/after, optimize hot paths |
| Team confusion about provider selection | Low | Clear logging of selected provider |
| Model registry out of date | Low | Refresh command, static baseline always works |
| **OpenCode hangs on API errors** | **High** | **Hard timeout enforcement (Issue #8203)** |
| **Gemini ignores SIGTERM** | **Medium** | **Immediate SIGKILL escalation (Issue #15873)** |
| **Cursor -p mode unreliable** | **High** | **Defer implementation until fixed (Issue #3588)** |
| **Orphaned MCP processes** | **Medium** | **Explicit child process cleanup for Claude/Cursor** |

## Success Criteria

- [x] `aaa ralph build --provider opencode` completes successfully
- [x] Existing `aaa ralph build` (claude) continues working unchanged
- [x] Tab completion shows available models
- [x] Refresh command discovers new models
- [x] All existing tests pass
- [x] New provider integrations are isolated behind provider adapters and registry contracts.

## Future Providers

After this milestone, adding new providers requires:

1. Create `providers/{name}.ts`
2. Implement `invoke{name}` function
3. Add to `REGISTRY` with capabilities
4. Update `PROVIDER_BINARIES`
5. Add to `ProviderType` union
6. Document in `MILESTONE.md`

Target: Each new provider takes ~2 hours to implement and test.

## References

- [OpenCode Documentation](https://opencode.ai/docs/)
- [OpenCode JSON Event Cheatsheet](https://takopi.dev/reference/runners/opencode/stream-json-cheatsheet/)
- [Claude Code Documentation](https://docs.anthropic.com/en/docs/agents/claude-code/overview)
- [Coding Standards](/context/blocks/quality/coding-style.md)

## Changelog

- **2026-02-05**: Initial milestone document created
- **2026-02-05**: Approved for implementation (Build Mode)
- **2026-02-05**: Added Cursor CLI support, documented critical issues (OpenCode #8203, Gemini #15873, Cursor #3588), added provider-specific termination strategies and stall detection requirements
- **2026-02-07**: Milestone closeout completed; subtasks reached 20/20 done and success criteria verified.
