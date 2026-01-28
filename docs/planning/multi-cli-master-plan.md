# THE MASTER PLAN: Multi-CLI Integration for Ralph

**Document Version**: 1.0  
**Last Updated**: 2026-01-28  
**Status**: Master Implementation Plan  
**Estimated Duration**: 4-5 weeks (20-25 days)

---

## Executive Summary

Ralph currently has tight coupling with Claude Code CLI, making it impossible to use alternative AI providers without significant refactoring. This master plan provides a comprehensive roadmap for integrating multiple CLI providers (Claude, Opencode, Gemini, Cursor, Codex) through a unified provider abstraction layer.

### Key Challenges Addressed

1. **Session Format Divergence**: Each CLI stores sessions differently (JSONL, binary, single JSON)
2. **Metric Availability**: Cost tracking varies significantly across providers
3. **Context File Conventions**: CLAUDE.md vs AGENTS.md vs provider-specific formats
4. **Output Format Differences**: Array vs JSONL vs single object outputs

### Critical Success Factors

- **Canonical Ralph Format**: Single source of truth for sessions
- **Graceful Degradation**: Handle missing metrics (cost, tokens) without crashing
- **Security First**: Opt-in for dangerous flags (Cursor --force)
- **Backward Compatibility**: Existing Claude behavior unchanged

---

## 1. Research Findings Analysis

### 1.1 Provider Comparison Matrix

| Feature | Claude | Opencode | Gemini | Cursor | Codex |
|---------|--------|----------|--------|--------|-------|
| **Session Storage** | `~/.claude/projects/` | `~/.local/share/opencode/` | `~/.gemini/` (internal) | UNKNOWN | `~/.codex/sessions/` |
| **Session Format** | JSONL | JSON Lines | Binary/internal | UNKNOWN | JSON Lines |
| **Output Format** | JSON array | JSON Lines | Single JSON object | UNKNOWN | JSON Lines |
| **Cost Tracking** | ✅ Built-in | ❌ No | ❌ No | ❌ No | ❌ No |
| **Token Metrics** | ✅ Detailed | ✅ Yes | ✅ Detailed | UNKNOWN | ✅ Basic |
| **Context File** | CLAUDE.md | AGENTS.md | None (manual) | .cursor/rules | AGENTS.md |
| **Headless Mode** | `claude -p` | `opencode -p` | `gemini -p` | `cursor -p --force` | `codex exec` |
| **Rate Limits** | Variable | Unknown | 60 req/min free | Unknown | Unknown |
| **Security Flags** | `--dangerously-skip-permissions` | TBD | `--yolo` | `--force` (requires opt-in) | `--dangerously-bypass-approvals` |

### 1.2 Common Patterns Identified

**Session Discovery Algorithm**:
1. Provider-specific config dir (e.g., `~/.claude/`, `~/.codex/`)
2. Path encoding (dash-separated, base64, or flat)
3. UUID-based session filenames
4. Environment variable overrides (e.g., `CLAUDE_CONFIG_DIR`)

**Output Parsing Strategy**:
1. Claude: Parse JSON array, extract `result` type entry
2. Codex: Parse JSON Lines, aggregate events
3. Gemini: Parse single JSON object
4. All: Handle malformed/incomplete JSON gracefully

**Metric Extraction**:
1. Claude: Direct `total_cost_usd` field
2. Others: Calculate from token counts using pricing tables
3. Fallback to zeros if unavailable

### 1.3 Provider-Specific Gaps

#### Cursor (Critical Gap)
- **Session Format**: UNKNOWN
- **Output Schema**: UNKNOWN  
- **Metrics**: UNKNOWN
- **Security**: `--force` flag requires careful handling
- **Action Required**: Research phase must document these before implementation

#### Opencode (Assumed Similarities)
- Based on research plan, assumed similar to Claude
- 75+ providers support through unified interface
- Server mode available for advanced use cases

#### Gemini (Well-Documented)
- Binary session storage - cannot read directly
- NO cost tracking in output
- Detailed token metrics available
- Rate limiting (60 req/min free tier)

#### Codex (Well-Documented)
- JSON Lines output format (streaming)
- NO cost tracking (must calculate manually)
- Structured output via `--output-schema`
- OAuth + API key authentication

---

## 2. Core Architectural Challenges

### 2.1 Challenge: Session Storage Divergence

**Problem**: Each provider stores sessions in incompatible formats:
- **Claude**: JSONL with rich metadata, dash-encoded paths
- **Codex**: JSONL with different event types, date-organized
- **Gemini**: Binary/internal storage (not human-readable)
- **Cursor**: UNKNOWN

**Impact**: 
- Cannot uniformly extract tool calls, duration, token usage
- Session discovery logic is provider-specific
- Cross-provider session analysis impossible

**Solution Strategy**:
```typescript
// Canonical Ralph Session Format
interface RalphSession {
  sessionId: string;
  provider: ProviderType;
  startedAt: ISO8601Timestamp;
  completedAt: ISO8601Timestamp;
  messages: RalphMessage[];
  toolCalls: RalphToolCall[];
  tokenUsage: TokenUsage;
  costUsd?: number;  // Undefined if unavailable
  metadata: SessionMetadata;
}

// Provider-specific importers convert to canonical format
interface SessionImporter {
  import(sessionPath: string): Promise<RalphSession>;
  canImport(path: string): boolean;
}
```

**Storage Location**: `~/.ralph/sessions/<provider>/<project-encoded>/<sessionId>.jsonl`

### 2.2 Challenge: Metric Availability

**Problem**: Cost and token tracking varies:
- **Claude**: Full cost tracking (`total_cost_usd`)
- **Gemini**: Token counts only (no cost)
- **Codex**: Token counts only (no cost)
- **Cursor**: UNKNOWN

**Impact**:
- Budget tracking inconsistent across providers
- Cannot compare provider costs directly
- Ralph iteration diary needs cost field

**Solution Strategy**:
```typescript
interface ProviderResult {
  result: string;
  sessionId: string;
  duration: number;
  costUsd: number;  // 0 if unavailable
  tokenUsage: {
    inputTokens: number;   // 0 if unavailable
    outputTokens: number;  // 0 if unavailable
    cachedTokens?: number; // Optional
  };
  toolCalls: number;  // 0 if unavailable
}

// Pricing configuration for cost calculation
const PROVIDER_PRICING: Record<ProviderType, PricingModel> = {
  claude: { inputPer1K: 0.003, outputPer1K: 0.015, cacheReadPer1K: 0.0003 },
  gemini: { inputPer1K: 0.000075, outputPer1K: 0.0003 },
  codex: { inputPer1K: 0.003, outputPer1K: 0.012 },
  // ... others
};
```

**Graceful Degradation**:
- Display "N/A" or "$0.00 (unavailable)" for missing cost data
- Still track token usage if available
- Log warning when cost calculation fails

### 2.3 Challenge: Context File Conventions

**Problem**: Different providers expect different context file formats:
- **Claude**: CLAUDE.md (automatic loading)
- **Codex**: AGENTS.md (automatic loading)
- **Gemini**: No native support (manual via -p flag)
- **Cursor**: .cursor/rules/*.mdc files

**Impact**:
- Context fragmentation across providers
- Users must maintain multiple context files
- Inconsistent agent behavior per provider

**Solution Strategy**:
```typescript
// Primary context file: CLAUDE.md (canonical)
// Provider overrides: .ralph/context/<provider>.md

function loadContext(provider: ProviderType, projectRoot: string): string {
  const canonicalPath = path.join(projectRoot, 'CLAUDE.md');
  const providerPath = path.join(projectRoot, '.ralph/context', `${provider}.md`);
  
  let context = '';
  if (existsSync(canonicalPath)) {
    context = readFileSync(canonicalPath, 'utf8');
  }
  
  if (existsSync(providerPath)) {
    const providerContext = readFileSync(providerPath, 'utf8');
    context += `\n\n---\n\n## ${provider} Specific Context\n\n${providerContext}`;
  }
  
  return context;
}
```

**Migration Path**:
1. Keep existing CLAUDE.md as primary
2. Create .ralph/context/ directory for provider-specific overrides
3. Document that provider-specific files are optional
4. Provide migration script to extract provider-specific sections

### 2.4 Challenge: Output Format Differences

**Problem**: Each provider returns different output structures:
- **Claude**: JSON array with typed messages
- **Codex**: JSON Lines (NDJSON) with streaming events
- **Gemini**: Single JSON object with nested stats
- **Cursor**: UNKNOWN

**Impact**:
- Provider-specific parsing logic required
- Difficult to extract common fields (result, sessionId, metrics)
- Error handling varies by format

**Solution Strategy**:
```typescript
// Unified output parser interface
interface OutputParser {
  parse(stdout: string, stderr: string): ProviderResult;
  supportsFormat(format: string): boolean;
}

// Provider-specific parsers
class ClaudeOutputParser implements OutputParser {
  parse(stdout: string): ProviderResult {
    const parsed = JSON.parse(stdout);
    const resultEntry = parsed.find(e => e.type === 'result');
    return {
      result: resultEntry?.result ?? '',
      sessionId: resultEntry?.session_id ?? '',
      duration: resultEntry?.duration_ms ?? 0,
      costUsd: resultEntry?.total_cost_usd ?? 0,
      // ... extract other fields
    };
  }
}

class JsonlOutputParser implements OutputParser {
  parse(stdout: string): ProviderResult {
    const lines = stdout.split('\n').filter(l => l.trim());
    const events = lines.map(l => JSON.parse(l));
    // Aggregate events into ProviderResult
    return aggregateEvents(events);
  }
}
```

---

## 3. Provider Abstraction Layer

### 3.1 Core Interface Design

```typescript
// src/lib/providers/types.ts

export type ProviderType = 'claude' | 'codex' | 'cursor' | 'gemini' | 'opencode';

export interface Provider {
  readonly name: ProviderType;
  readonly displayName: string;
  readonly version: string;
  
  // Capability detection
  isAvailable(): Promise<boolean>;
  getVersion(): Promise<string | null>;
  getCapabilities(): ProviderCapabilities;
  
  // Core operations
  invokeChat(options: ChatOptions): Promise<ChatResult>;
  invokeHeadless(options: HeadlessOptions): Promise<HeadlessResult | null>;
  invokeSummary?(options: SummaryOptions): Promise<string | null>;
  
  // Session management
  discoverSession(afterTimestamp: number): Promise<DiscoveredSession | null>;
  getSessionPath(sessionId: string, repoRoot: string): string | null;
  parseSession(sessionPath: string): Promise<RalphSession>;
  
  // Output parsing
  parseOutput(stdout: string, stderr: string): ProviderResult;
  
  // Context loading
  buildContextPrompt(basePrompt: string, projectRoot: string): string;
}

export interface ProviderCapabilities {
  supportsHeadless: boolean;
  supportsChat: boolean;
  supportsCustomModel: boolean;
  supportsTokenMetrics: boolean;
  supportsCostTracking: boolean;
  supportsPermissionBypass: boolean;
  requiresForceFlag: boolean;  // Cursor-specific
  maxContextLength: number;
}
```

### 3.2 Configuration Schema

```typescript
// src/lib/config/types.ts

export interface ProviderConfig {
  // Core settings
  enabled?: boolean;
  model?: string;
  
  // API/CLI behavior
  maxTokens?: number;
  temperature?: number;
  baseUrl?: string;
  
  // Security settings
  dangerouslySkipPermissions?: boolean;
  dangerouslyAllowForceWrites?: boolean;  // Cursor-specific
  
  // Provider-specific overrides
  extraArgs?: string[];
  
  // Cost calculation (for providers without built-in cost tracking)
  pricing?: {
    inputPer1K?: number;
    outputPer1K?: number;
    cacheReadPer1K?: number;
  };
}

export interface RalphConfig {
  // Provider selection (required when multiple configured)
  provider?: ProviderType;
  
  // Provider configurations (flattened structure)
  claude?: ProviderConfig;
  codex?: ProviderConfig;
  cursor?: ProviderConfig;
  gemini?: ProviderConfig;
  opencode?: ProviderConfig;
  
  // Existing settings
  build?: BuildConfig;
  hooks?: HooksConfig;
  selfImprovement?: SelfImprovementConfig;
}
```

### 3.3 Configuration Precedence

```
Priority (highest to lowest):
1. CLI flags: --provider, --model
2. Environment variables: RALPH_PROVIDER, RALPH_CLAUDE_MODEL
3. Config file: ralph.provider, ralph.claude.model
4. Default values (provider-specific)
```

**Example Configuration**:
```json
{
  "ralph": {
    "provider": "claude",
    "claude": {
      "model": "claude-3-opus-20240229",
      "dangerouslySkipPermissions": true
    },
    "cursor": {
      "enabled": false,
      "dangerouslyAllowForceWrites": false
    },
    "gemini": {
      "model": "gemini-2.5-pro",
      "pricing": {
        "inputPer1K": 0.000075,
        "outputPer1K": 0.0003
      }
    }
  }
}
```

### 3.4 Provider Registry

```typescript
// src/lib/providers/registry.ts

export class ProviderRegistry {
  private providers = new Map<ProviderType, Provider>();
  
  register(provider: Provider): void {
    this.providers.set(provider.name, provider);
  }
  
  get(type: ProviderType): Provider {
    const provider = this.providers.get(type);
    if (!provider) {
      throw new ProviderError(`Provider '${type}' not registered`);
    }
    return provider;
  }
  
  async getAvailable(): Promise<ProviderType[]> {
    const available: ProviderType[] = [];
    for (const [type, provider] of this.providers) {
      if (await provider.isAvailable()) {
        available.push(type);
      }
    }
    return available;
  }
  
  async resolve(config: RalphConfig): Promise<Provider> {
    const providerType = this.resolveProviderType(config);
    const provider = this.get(providerType);
    
    if (!(await provider.isAvailable())) {
      const available = await this.getAvailable();
      throw new ProviderError(
        `Provider '${providerType}' is not available.\n` +
        `Available providers: ${available.join(', ')}`
      );
    }
    
    return provider;
  }
  
  private resolveProviderType(config: RalphConfig): ProviderType {
    // Check CLI flag (from process.argv)
    const cliProvider = this.getCliFlag('--provider');
    if (cliProvider) return cliProvider as ProviderType;
    
    // Check environment variable
    if (process.env.RALPH_PROVIDER) {
      return process.env.RALPH_PROVIDER as ProviderType;
    }
    
    // Check config file
    if (config.provider) {
      return config.provider;
    }
    
    // Default to claude for backward compatibility
    return 'claude';
  }
}

// Singleton instance
export const providerRegistry = new ProviderRegistry();
```

### 3.5 Adapter Pattern Implementation

Each provider gets its own adapter implementing the `Provider` interface:

```
src/lib/providers/
├── types.ts              # Core interfaces
├── registry.ts           # Provider registry
├── validation.ts         # Runtime validation
├── session/
│   ├── types.ts          # Canonical session format
│   ├── canonical.ts      # Session normalization
│   ├── importer.ts       # Import from provider formats
│   └── storage.ts        # Unified storage layer
├── output/
│   ├── types.ts          # ProviderResult interface
│   ├── claude-parser.ts  # JSON array parser
│   ├── jsonl-parser.ts   # JSON Lines parser
│   └── json-parser.ts    # Single JSON object parser
├── claude/
│   └── index.ts          # Claude provider adapter
├── opencode/
│   └── index.ts          # Opencode provider adapter
├── gemini/
│   └── index.ts          # Gemini provider adapter
├── cursor/
│   └── index.ts          # Cursor provider adapter (with research notes)
└── codex/
    └── index.ts          # Codex provider adapter
```

---

## 4. Detailed Implementation Roadmap

### Phase 0: Research Completion (3 days) ⏳ BLOCKED

**Status**: Partially Complete - Need Cursor Documentation

#### Task 0.1: Cursor Research (Critical - Blocking)
**Duration**: 1 day  
**Owner**: TBD  
**Dependencies**: None

**Research Questions**:
1. **Session Storage**: Where does Cursor store sessions? Format?
2. **Output Format**: What does `cursor -p --output-format json` return?
3. **Metrics**: Are token counts or cost available in output?
4. **Security**: Full behavior of `--force` flag
5. **Model Selection**: How to specify Composer model?

**Deliverable**: `docs/research/cursor-cli-compatibility.md`

**Risk**: HIGH - Cannot implement Cursor provider without this

#### Task 0.2: Opencode Research
**Duration**: 1 day  
**Owner**: TBD  
**Dependencies**: None

**Research Questions**:
1. Verify `--output-format json` behavior
2. Document session storage location
3. Test permission bypass mechanisms
4. Confirm model selection flags

**Deliverable**: `docs/research/opencode-cli-compatibility.md`

#### Task 0.3: Gemini Research
**Duration**: 0.5 day  
**Owner**: TBD  
**Dependencies**: None

**Status**: Mostly complete from existing `gemini-research` command

**Tasks**:
- Document gaps between research command and full provider support
- Verify session format limitations (binary storage)

**Deliverable**: `docs/research/gemini-cli-compatibility.md` (Update existing)

#### Task 0.4: Codex Research
**Duration**: 0.5 day  
**Owner**: TBD  
**Dependencies**: None

**Status**: Well-documented from technical spec

**Tasks**:
- Verify JSON Lines parsing with real CLI
- Test cost calculation accuracy
- Document session resumption capabilities

**Deliverable**: `docs/research/codex-cli-compatibility.md` (Update existing)

### Phase 1: Foundation & Blocker Resolution (5 days) 🔴 CRITICAL

**Dependencies**: Phase 0 complete  
**Goal**: Resolve blockers before provider implementation

#### Task 1.1: Session Format Abstraction Layer (2 days)
**Files to Create**:
- `src/lib/providers/session/types.ts` (100 lines)
- `src/lib/providers/session/canonical.ts` (200 lines)
- `src/lib/providers/session/importer.ts` (150 lines)
- `src/lib/providers/session/storage.ts` (150 lines)

**Files to Modify**:
- `tools/src/commands/ralph/session.ts` - Refactor to use canonical format internally

**Key Design Decisions**:
1. Use JSONL for storage (consistent with Claude, easy to append)
2. Store at `~/.ralph/sessions/<provider>/<project-encoded>/<sessionId>.jsonl`
3. Import from provider formats on-demand (lazy conversion)
4. Keep original provider session files (don't delete)

**Test Requirements**:
- Unit tests for each importer
- Integration test: Import Claude session, verify canonical format
- Error handling: Malformed provider sessions

#### Task 1.2: Output Format Normalization (2 days)
**Files to Create**:
- `src/lib/providers/output/types.ts` (50 lines)
- `src/lib/providers/output/claude-parser.ts` (150 lines)
- `src/lib/providers/output/jsonl-parser.ts` (150 lines)
- `src/lib/providers/output/json-parser.ts` (100 lines)
- `src/lib/providers/output/auto-detect.ts` (100 lines)

**Files to Modify**:
- `tools/src/commands/ralph/claude.ts` - Use new parser interface

**Key Design Decisions**:
1. Each parser returns unified `ProviderResult`
2. Auto-detection based on content (try JSON array, then JSONL, then single JSON)
3. Defensive parsing - never throw, return defaults for missing fields

**Test Requirements**:
- Unit tests with sample outputs from each provider
- Edge cases: Empty output, malformed JSON, partial output

#### Task 1.3: Provider Interface Definition (1 day)
**Files to Create**:
- `src/lib/providers/types.ts` (200 lines)
- `src/lib/providers/base-provider.ts` (150 lines)

**Key Design Decisions**:
1. Abstract base class with common implementations
2. Template method pattern for invoke operations
3. Async methods for all I/O operations

**Deliverable**: Provider interface stable and documented

### Phase 2: Configuration System (3 days)

**Dependencies**: Phase 1 complete  
**Goal**: Define unified configuration structure

#### Task 2.1: Configuration Types (1 day)
**Files to Create**:
- `src/lib/config/types.ts` (additions - 150 lines)
- `src/lib/config/provider-resolution.ts` (200 lines)
- `src/lib/config/env.ts` (100 lines)

**Files to Modify**:
- `src/lib/config/types.ts` - Add provider config interfaces

**Key Design Decisions**:
1. Flattened structure: `ralph.claude` instead of `ralph.providers.claude`
2. CLI flags override env vars override config file
3. Type-safe configuration with Zod validation

#### Task 2.2: Configuration Validation (1 day)
**Files to Create**:
- `src/lib/providers/validation.ts` (200 lines)

**Features**:
- Runtime provider availability check
- Version compatibility verification
- Configuration validation with helpful error messages

#### Task 2.3: Provider Selection Logic (1 day)
**Files to Create**:
- `src/lib/providers/selector.ts` (150 lines)

**Features**:
- CLI flag parsing (--provider, --model)
- Environment variable support
- Error messages for unavailable providers

### Phase 3: Provider Implementation - Wave 1 (8 days)

**Dependencies**: Phases 1-2 complete  
**Goal**: Implement Claude and Opencode providers

#### Task 3.1: Claude Provider Refactor (3 days)
**Files to Create**:
- `src/lib/providers/claude/index.ts` (300 lines)

**Files to Modify**:
- `tools/src/commands/ralph/claude.ts` - Mark as deprecated, delegate to new provider

**Approach**:
1. Extract existing implementation
2. Adapt to Provider interface
3. Add capability detection
4. Maintain backward compatibility layer

**Key Changes**:
- Move session discovery logic to provider
- Use canonical session format internally
- Keep existing behavior for all edge cases

**Test Requirements**:
- All existing tests pass
- New unit tests for provider interface
- Integration test with real Claude CLI

#### Task 3.2: Opencode Provider (3 days)
**Files to Create**:
- `src/lib/providers/opencode/index.ts` (250 lines)

**Implementation Notes**:
- Similar architecture to Claude
- Handle JSON Lines output
- Implement session discovery (research-dependent)

**Test Requirements**:
- Unit tests for all methods
- Integration test with real Opencode CLI

#### Task 3.3: Provider Registry Setup (2 days)
**Files to Create**:
- `src/lib/providers/registry.ts` (150 lines)
- `src/lib/providers/index.ts` (50 lines)

**Features**:
- Auto-registration of providers
- Runtime provider discovery
- Factory for provider instantiation

### Phase 4: Provider Implementation - Wave 2 (8 days)

**Dependencies**: Phase 3 complete  
**Goal**: Implement Gemini and Cursor providers

#### Task 4.1: Gemini Provider (3 days)
**Files to Create**:
- `src/lib/providers/gemini/index.ts` (250 lines)

**Implementation Notes**:
- Leverage existing `gemini-research` command code
- Handle single JSON object output
- No session import (binary storage) - generate synthetic session

**Challenges**:
- Cannot import sessions from binary format
- Must rely on JSON output for metrics
- Cost calculation from token counts

**Test Requirements**:
- Unit tests for output parsing
- Integration test with real Gemini CLI
- Test rate limit handling

#### Task 4.2: Cursor Provider (5 days) 🔴 HIGH COMPLEXITY
**Files to Create**:
- `src/lib/providers/cursor/index.ts` (350 lines)

**⚠️ CRITICAL**: Cannot start until Phase 0.1 (Cursor Research) complete

**Implementation Notes**:
- **Security First**: `--force` flag requires opt-in config
- Session discovery: TBD from research
- Output parsing: TBD from research

**Security Implementation**:
```typescript
async invokeHeadless(options: HeadlessOptions): Promise<HeadlessResult | null> {
  const config = await this.loadConfig();
  
  if (!config.dangerouslyAllowForceWrites) {
    console.warn(chalk.yellow(
      '⚠️  Cursor requires --force flag for file modifications.\n' +
      '   Set ralph.cursor.dangerouslyAllowForceWrites=true to enable.\n' +
      '   Warning: This bypasses safety checks. Use with caution.'
    ));
    return null;
  }
  
  // Add --force to args
  const args = ['cursor', '-p', options.prompt, '--force'];
  // ...
}
```

**Test Requirements**:
- Security test: Verify --force blocked by default
- Unit tests (research-dependent)
- Integration test with real Cursor CLI

### Phase 5: CLI Integration (5 days)

**Dependencies**: Phases 3-4 complete  
**Goal**: Integrate providers into CLI

#### Task 5.1: CLI Flags (2 days)
**Files to Modify**:
- `tools/src/commands/ralph/index.ts` - Add --provider and --model flags
- `tools/src/commands/ralph/build.ts` - Use provider for invocations

**New Flags**:
```bash
# Provider selection
aaa ralph build --provider claude
aaa ralph build --provider cursor --model composer

# Shorthand
aaa ralph build -p gemini

# Model override
aaa ralph build --provider claude --model claude-3-opus-20240229
```

#### Task 5.2: Error Handling & Retry (2 days)
**Files to Create**:
- `src/lib/providers/error-handler.ts` (200 lines)
- `src/lib/providers/retry.ts` (150 lines)

**Features**:
- Error classification (transient, config, permission, runtime)
- Exponential backoff for transient errors
- Provider-specific error messages
- Recovery suggestions

**Error Categories**:
1. **Transient**: Rate limits, network errors → Retry with backoff
2. **Configuration**: Missing CLI, invalid model → Fail fast
3. **Permission**: Access denied, auth errors → Fail with remediation
4. **Runtime**: OOM, timeout → Retry once, then fail

#### Task 5.3: Capability Detection (1 day)
**Files to Modify**:
- Each provider adapter - Implement `getCapabilities()`

**Features**:
- Detect CLI version
- Check available models
- Validate feature support
- Warn on capability mismatch

### Phase 6: Testing & Documentation (5 days)

**Dependencies**: All previous phases  
**Goal**: Production-ready release

#### Task 6.1: Testing (2 days)
**Test Coverage Requirements**:

**Unit Tests** (per provider):
- Provider interface compliance
- Output parsing (sample outputs)
- Session discovery (mocked filesystem)
- Error handling
- Configuration resolution

**Integration Tests**:
- End-to-end build with each provider
- Provider switching mid-session
- Error recovery scenarios
- Session import/export

**Compatibility Tests**:
- Multiple CLI versions
- Different operating systems
- Edge cases (empty sessions, malformed output)

**Test Files**:
```
tests/
├── providers/
│   ├── claude.test.ts
│   ├── opencode.test.ts
│   ├── gemini.test.ts
│   ├── cursor.test.ts
│   └── codex.test.ts
├── integration/
│   ├── build.test.ts
│   └── provider-switching.test.ts
└── fixtures/
    ├── claude-output.json
    ├── codex-output.jsonl
    └── gemini-output.json
```

#### Task 6.2: Documentation (2 days)

**User Documentation**:
1. **README Update**: Multi-provider quick start
2. **Provider Setup Guides**: Per-provider installation and config
3. **Configuration Reference**: All options explained
4. **Troubleshooting**: Common issues and solutions
5. **Migration Guide**: Claude → other providers

**Developer Documentation**:
1. **Architecture Decision Records** (ADRs):
   - ADR-001: Canonical session format
   - ADR-002: Provider interface design
   - ADR-003: Configuration precedence
   - ADR-004: Cursor security model

2. **Implementation Guide**: Adding new providers

3. **API Documentation**: Provider interface reference

#### Task 6.3: Context File Strategy (1 day)

**Implementation**:
1. Create `.ralph/context/` directory structure
2. Implement context merging logic
3. Document best practices

**Migration Script**:
```bash
# Extract provider-specific sections from existing CLAUDE.md
# Create .ralph/context/<provider>.md files
# Update CLAUDE.md to remove provider-specific content
```

---

## 5. Cursor Gap Analysis

### 5.1 What We Don't Know

| Area | Status | Impact | Mitigation |
|------|--------|--------|------------|
| **Session Storage** | UNKNOWN | HIGH | Cannot track sessions; skip session import |
| **Output Format** | UNKNOWN | HIGH | Cannot parse results; implement auto-detection |
| **Metrics (tokens/cost)** | UNKNOWN | MEDIUM | Skip cost tracking if unavailable |
| **--force flag behavior** | PARTIAL | CRITICAL | Require opt-in; warn users |
| **Model selection** | PARTIAL | MEDIUM | Default to standard model |
| **Permission bypass** | UNKNOWN | MEDIUM | Conservative defaults |

### 5.2 Handling During Implementation

**Strategy: Defensive Implementation**

1. **Assume JSON Lines output** (most common among CLI tools)
2. **Implement auto-detection** - try multiple parsers
3. **Skip session import** - generate synthetic session metadata
4. **Require explicit opt-in** for --force flag
5. **Extensive logging** - capture actual behavior for refinement

**Fallback Behavior**:
```typescript
class CursorProvider extends BaseProvider {
  async parseOutput(stdout: string, stderr: string): ProviderResult {
    // Try multiple parsers
    const parsers = [
      new JsonlParser(),
      new ClaudeParser(), // In case similar to Claude
      new JsonParser(),
    ];
    
    for (const parser of parsers) {
      try {
        return parser.parse(stdout, stderr);
      } catch {
        continue;
      }
    }
    
    // Fallback: return raw output as result
    return {
      result: stdout,
      sessionId: '',
      duration: 0,
      costUsd: 0,
      tokenUsage: { inputTokens: 0, outputTokens: 0 },
      toolCalls: 0,
    };
  }
}
```

### 5.3 Testing Strategy for Cursor

1. **Manual Testing First**: Run Cursor CLI with various commands
2. **Capture Real Output**: Record stdout/stderr for test fixtures
3. **Iterative Refinement**: Update parser based on real behavior
4. **Community Testing**: Beta release for Cursor users

---

## 6. Risk Mitigation

| Risk | Severity | Likelihood | Mitigation | Owner |
|------|----------|------------|------------|-------|
| **Session format incompatibility** | 🔴 Critical | High | Canonical format with adapters (Phase 1) | Architecture |
| **Output format divergence** | 🔴 Critical | High | Provider-specific parsers (Phase 1) | Architecture |
| **Token/cost metrics unavailable** | ⚠️ High | Medium | Graceful degradation (zeros/undefined) | Implementation |
| **Context file fragmentation** | ⚠️ High | Medium | Canonical CLAUDE.md + provider overrides | Documentation |
| **Cursor security (--force flag)** | ⚠️ High | High | Opt-in config, clear warnings | Security |
| **CLI installation variability** | ⚠️ Medium | Medium | Runtime validation, clear errors | UX |
| **Regression in existing Claude code** | ⚠️ Medium | Medium | Comprehensive tests, backward compat layer | QA |
| **Research findings invalidate assumptions** | ⚠️ Medium | Medium | Phase 0 research, validate before impl | Research |
| **Time estimates too optimistic** | ⚠️ Medium | High | Revised estimates, buffer days, parallel work | PM |
| **Provider API changes** | ⚠️ Low | Low | Version detection, deprecation warnings | Maintenance |

---

## 7. Implementation Order with Dependencies

```
Phase 0: Research
├── Cursor research ─────────────┐
├── Opencode research ───────────┼──→ Research docs
├── Gemini research ─────────────┤
└── Codex research ──────────────┘
         │
         ▼
Phase 1: Foundation (BLOCKERS)
├── Session format abstraction ──┐
├── Output normalization ────────┼──→ Canonical formats
└── Provider interface ──────────┘
         │
         ▼
Phase 2: Configuration
├── Schema design ───────────────┐
├── Precedence logic ────────────┼──→ Config system
└── Runtime validation ──────────┘
         │
         ▼
Phase 3: Providers Wave 1
├── Claude refactor ─────────────┐
├── Opencode implementation ─────┼──→ 2 providers ready
└── Provider registry ───────────┘
         │
         ▼
Phase 4: Providers Wave 2
├── Gemini implementation ───────┐
└── Cursor implementation ───────┘──→ 4 providers ready
         │
         ▼
Phase 5: CLI Integration
├── CLI flags ───────────────────┐
├── Error handling/retry ────────┼──→ Production ready
└── Capability detection ────────┘
         │
         ▼
Phase 6: Testing & Docs
├── Testing ─────────────────────┐
├── Documentation ───────────────┼──→ Release ready
└── Context file strategy ───────┘
```

---

## 8. Success Criteria

### Phase Gates

**Phase 1 Gate**:
- [ ] Canonical session format defined and tested
- [ ] Output parsers implemented for all known formats
- [ ] Provider interface stable and documented

**Phase 3 Gate**:
- [ ] Claude provider refactored and passing all existing tests
- [ ] Opencode provider functional
- [ ] Provider registry working

**Phase 5 Gate**:
- [ ] All 4 providers (Claude, Opencode, Gemini, Cursor) functional
- [ ] CLI flags working
- [ ] Error handling tested

**Release Gate**:
- [ ] All tests passing
- [ ] Documentation complete
- [ ] Migration guide published
- [ ] Security review complete (Cursor --force)

### Metrics

- **Provider Coverage**: 4/5 providers (Claude, Opencode, Gemini, Cursor)
- **Test Coverage**: >90% for provider code
- **Backward Compatibility**: 100% (existing Ralph behavior unchanged)
- **Error Recovery**: All error categories handled gracefully

---

## 9. Rollback Strategy

### 9.1 Code Rollback

**Git Branches**:
- `main` - Production code
- `feature/multi-cli` - Integration branch
- `feature/provider-*` - Individual provider branches

**Rollback Procedure**:
1. All changes isolated to `src/lib/providers/` directory
2. Existing code in `tools/src/commands/ralph/` untouched except for delegation
3. If critical bug: revert to `main`, disable new providers via feature flag

### 9.2 Configuration Rollback

**Backward Compatibility**:
- Existing `ralph.config.json` without provider settings works unchanged
- Defaults to Claude if no provider specified
- No breaking changes to existing config structure

### 9.3 Feature Flags

```typescript
// Emergency disable of new providers
const ENABLE_MULTI_CLI = process.env.RALPH_ENABLE_MULTI_CLI !== 'false';

if (!ENABLE_MULTI_CLI) {
  // Use legacy Claude-only implementation
  return legacyClaudeInvoke(options);
}
```

---

## 10. Appendix

### A. File Structure

```
tools/src/
├── lib/
│   ├── config/
│   │   ├── types.ts              # Updated with provider configs
│   │   ├── provider-resolution.ts # NEW
│   │   └── env.ts                # Updated with provider env vars
│   └── providers/
│       ├── types.ts              # NEW - Provider interface
│       ├── registry.ts           # NEW - Provider registry
│       ├── validation.ts         # NEW - Runtime validation
│       ├── base-provider.ts      # NEW - Abstract base class
│       ├── session/
│       │   ├── types.ts          # NEW - Canonical format
│       │   ├── canonical.ts      # NEW
│       │   ├── importer.ts       # NEW
│       │   └── storage.ts        # NEW
│       ├── output/
│       │   ├── types.ts          # NEW
│       │   ├── claude-parser.ts  # NEW
│       │   ├── jsonl-parser.ts   # NEW
│       │   └── json-parser.ts    # NEW
│       ├── claude/
│       │   └── index.ts          # REFACTORED from claude.ts
│       ├── opencode/
│       │   └── index.ts          # NEW
│       ├── gemini/
│       │   └── index.ts          # NEW
│       ├── cursor/
│       │   └── index.ts          # NEW (with research notes)
│       └── codex/
│           └── index.ts          # NEW
└── commands/
    └── ralph/
        ├── index.ts              # UPDATED - Provider selection
        ├── build.ts              # UPDATED - Provider usage
        ├── claude.ts             # DEPRECATED - Delegate to provider
        └── session.ts            # REFACTORED - Use canonical format
```

### B. Environment Variables

```bash
# Provider selection
export RALPH_PROVIDER=claude  # claude | codex | cursor | gemini | opencode

# Claude-specific
export RALPH_CLAUDE_MODEL=claude-3-opus-20240229
export RALPH_CLAUDE_DANGEROUSLY_SKIP_PERMISSIONS=true

# Cursor-specific (security)
export RALPH_CURSOR_DANGEROUSLY_ALLOW_FORCE_WRITES=true

# Gemini-specific
export RALPH_GEMINI_MODEL=gemini-2.5-pro

# Debug
export RALPH_DEBUG=true
export RALPH_ENABLE_MULTI_CLI=true  # Emergency feature flag
```

### C. Troubleshooting Guide (Preview)

**Problem**: `Error: Provider 'cursor' is not available`

**Solution**:
```bash
# Check if Cursor CLI is installed
which cursor

# Check if provider is enabled in config
cat ralph.config.json | jq '.ralph.cursor'

# Use available provider
aaa ralph build --provider claude
```

**Problem**: Cost showing as $0.00 for Gemini/Codex

**Solution**:
```bash
# This is expected - these providers don't expose cost in CLI
# Ralph will calculate from token counts if pricing configured
# Update ralph.config.json with pricing for your model
```

**Problem**: Cursor --force flag not working

**Solution**:
```bash
# Enable via config
echo '{"ralph": {"cursor": {"dangerouslyAllowForceWrites": true}}}' > ralph.config.json

# Or environment variable
export RALPH_CURSOR_DANGEROUSLY_ALLOW_FORCE_WRITES=true
```

---

## 11. Next Steps

### Immediate Actions (This Week)

1. **Review and Approve Plan** (Owner: Lead Architect)
   - Technical review of all design decisions
   - Resource allocation confirmation
   - Timeline approval

2. **Create Phase 0 Tickets** (Owner: PM)
   - Cursor research (CRITICAL - blocks Phase 4)
   - Opencode research
   - Update existing Gemini/Codex docs

3. **Assign Phase 1 Owner** (Owner: Engineering Lead)
   - Foundation layer is critical path
   - Requires senior engineer
   - Blocks all other phases

### Week 2-3: Foundation

4. **Implement Session Abstraction** (Owner: TBD)
   - Canonical format
   - Importers for known formats
   - Storage layer

5. **Implement Output Normalization** (Owner: TBD)
   - Parsers for all formats
   - Auto-detection

### Week 4-5: Providers

6. **Refactor Claude Provider** (Owner: TBD)
7. **Implement Opencode** (Owner: TBD)
8. **Implement Gemini** (Owner: TBD)
9. **Implement Cursor** (Owner: TBD - blocked by research)

### Week 6: Integration

10. **CLI Integration** (Owner: TBD)
11. **Error Handling** (Owner: TBD)

### Week 7: Testing & Release

12. **Testing** (Owner: QA)
13. **Documentation** (Owner: Tech Writer)
14. **Release** (Owner: Release Engineer)

---

**END OF MASTER PLAN**

*This document is a living specification. Update as implementation reveals new constraints or opportunities.*
