# Multi-CLI Support Implementation Plan - Updated

**Status**: Draft  
**Last Updated**: 2026-01-28  
**Original Plan**: 7-9 days → **Revised Plan**: 4-5 weeks  

---

## Executive Summary

### Key Changes from Original Plan

| Aspect | Original | Revised |
|--------|----------|---------|
| **Total Duration** | 7-9 days | 4-5 weeks (20-25 days) |
| **Phase Structure** | 5 linear phases | 6 phases with blockers-first approach |
| **Provider Implementation** | 1 day each | 2-3 days each (with research time) |
| **Testing** | 2-3 days final phase | Distributed testing throughout |
| **Blocker Resolution** | Not addressed | Dedicated Phase 1 |

### Critical Decisions Made

1. **Session Format**: Ralph will maintain its own canonical session format (JSONL), with provider-specific adapters for import
2. **Configuration**: Flattened structure under `ralph.<provider>` with CLI precedence enforcement
3. **Provider Order**: Claude → Opencode → Gemini → Cursor → Codex (based on implementation complexity)
4. **Cursor Security**: `--force` flag is opt-in via `dangerouslyAllowForceWrites` config option
5. **No Automatic Fallback**: Users must explicitly specify provider; clear error messages if CLI unavailable

---

## Revised Phase Breakdown

### Phase 0: Pre-Implementation Research (3 days)

**Duration**: 3 days (parallel work)  
**Dependencies**: None  
**Output**: Research documents per provider

#### Tasks

1. **Cursor Research** (1 day)
   - [ ] Document session storage mechanism
   - [ ] Confirm `--model composer` flag behavior
   - [ ] Test `--force` flag functionality and security implications
   - [ ] Verify output format (JSON vs JSON Lines)
   - [ ] Test permission model and bypass options
   - **Deliverable**: `docs/research/cursor-cli-compatibility.md`

2. **Opencode Research** (1 day)
   - [ ] Document session storage location and format
   - [ ] Verify headless/supervised mode availability
   - [ ] Test output format options
   - [ ] Confirm model selection flags
   - [ ] Test permission bypass mechanisms
   - **Deliverable**: `docs/research/opencode-cli-compatibility.md`

3. **Gemini Research** (0.5 day)
   - [ ] Leverage existing `gemini-research` command implementation
   - [ ] Document any gaps between current implementation and full provider support
   - [ ] Verify session storage format
   - **Deliverable**: `docs/research/gemini-cli-compatibility.md`

4. **Codex Research** (0.5 day)
   - [ ] Document session storage location
   - [ ] Verify OpenAI API vs Codex CLI differences
   - [ ] Test output format options
   - **Deliverable**: `docs/research/codex-cli-compatibility.md`

---

### Phase 1: Foundation & Blocker Resolution (5 days)

**Duration**: 5 days  
**Dependencies**: Phase 0 research complete  
**Goal**: Resolve 🔴 BLOCKERS before provider implementation

#### 1.1 Session Format Abstraction Layer (2 days)

**Problem**: Each CLI stores sessions in incompatible formats

**Solution**: Ralph canonical format with provider-specific importers

```typescript
// src/lib/providers/session/types.ts
interface RalphSession {
  sessionId: string;
  provider: ProviderType;
  startedAt: string;
  completedAt: string;
  messages: RalphMessage[];
  toolCalls: RalphToolCall[];
  tokenUsage: TokenUsage;
  costUsd?: number;
  metadata: SessionMetadata;
}

interface RalphMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface RalphToolCall {
  toolName: string;
  input: Record<string, unknown>;
  output?: unknown;
  timestamp: string;
}
```

**Implementation**:
- [ ] Create `src/lib/providers/session/canonical.ts` - canonical format definitions
- [ ] Create `src/lib/providers/session/importer.ts` - import from provider formats
- [ ] Create `src/lib/providers/session/exporter.ts` - export to provider formats (if needed)
- [ ] Create `src/lib/providers/session/storage.ts` - unified storage layer
- [ ] Refactor existing `session.ts` to use canonical format internally

**Storage Location**: `~/.ralph/sessions/<provider>/<project-encoded>/<sessionId>.jsonl`

#### 1.2 Output Format Normalization (2 days)

**Problem**: Claude outputs JSON array, others may use JSON Lines or different structures

**Solution**: Provider-specific parsers with unified result interface

```typescript
// src/lib/providers/output/types.ts
interface ProviderResult {
  result: string;              // The actual response content
  sessionId: string;           // Unique session identifier
  duration: number;            // Duration in milliseconds
  costUsd: number;             // Cost in USD (0 if unavailable)
  tokenUsage: TokenUsage;      // Input/output tokens
  toolCalls: number;           // Number of tool invocations
  rawOutput: unknown;          // Original provider output (for debugging)
}

// Provider-specific parsers implement:
interface OutputParser {
  parse(stdout: string): ProviderResult;
  supportsFormat(format: string): boolean;
}
```

**Implementation**:
- [ ] Create `src/lib/providers/output/types.ts`
- [ ] Create `src/lib/providers/output/claude-parser.ts` - handles JSON array format
- [ ] Create `src/lib/providers/output/jsonl-parser.ts` - handles JSON Lines format
- [ ] Create `src/lib/providers/output/auto-detect.ts` - auto-detect format
- [ ] Update `invokeClaudeHeadless` to use new parser interface

#### 1.3 Provider Interface Definition (1 day)

```typescript
// src/lib/providers/types.ts
export type ProviderType = 'claude' | 'codex' | 'cursor' | 'gemini' | 'opencode';

export interface Provider {
  readonly name: ProviderType;
  readonly displayName: string;
  
  // Capability detection
  isAvailable(): Promise<boolean>;
  getCapabilities(): ProviderCapabilities;
  
  // Core operations
  invokeChat(options: ChatOptions): Promise<ChatResult>;
  invokeHeadless(options: HeadlessOptions): Promise<HeadlessResult | null>;
  invokeSummary?(options: SummaryOptions): Promise<string | null>;
  
  // Session management
  discoverSession(afterTimestamp: number): Promise<DiscoveredSession | null>;
  parseSession(sessionPath: string): Promise<RalphSession>;
  
  // Output parsing
  parseOutput(stdout: string, stderr: string): ProviderResult;
}

export interface ProviderCapabilities {
  supportsHeadless: boolean;
  supportsChat: boolean;
  supportsCustomModel: boolean;
  supportsTokenMetrics: boolean;
  supportsCostTracking: boolean;
  supportsPermissionBypass: boolean;
  requiresForceFlag: boolean;
}
```

---

### Phase 2: Configuration Schema Design (3 days)

**Duration**: 3 days  
**Dependencies**: Phase 1 complete  
**Goal**: Define unified configuration structure

#### 2.1 Updated Configuration Types

```typescript
// src/lib/config/types.ts additions

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
}

// Update RalphSection
export interface RalphSection {
  // Provider selection (required)
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

#### 2.2 Configuration Precedence

```
Priority (highest to lowest):
1. CLI flags: --provider, --model
2. Environment variables: RALPH_PROVIDER, RALPH_CLAUDE_MODEL
3. Config file: ralph.provider, ralph.claude.model
4. Default values (provider-specific)
```

#### 2.3 Runtime Validation

```typescript
// src/lib/providers/validation.ts
export async function validateProvider(provider: ProviderType): Promise<ValidationResult> {
  // Check CLI availability
  // Verify version compatibility
  // Test basic functionality
  // Return detailed error if unavailable
}
```

**Implementation Tasks**:
- [ ] Update `src/lib/config/types.ts` with new schemas
- [ ] Update Zod validation schemas
- [ ] Create `src/lib/config/provider-resolution.ts` - precedence logic
- [ ] Create `src/lib/providers/validation.ts` - runtime validation
- [ ] Add environment variable support to `src/lib/config/env.ts`
- [ ] Update config loader to resolve provider settings

---

### Phase 3: Provider Implementation - Wave 1 (8 days)

**Duration**: 8 days  
**Dependencies**: Phases 1-2 complete  
**Goal**: Implement Claude and Opencode providers

#### 3.1 Claude Provider Refactor (3 days)

**Approach**: Extract existing implementation into provider interface

**Tasks**:
- [ ] Create `src/lib/providers/claude/` directory
- [ ] Move `src/commands/ralph/claude.ts` → `src/lib/providers/claude/index.ts`
- [ ] Adapt to `Provider` interface
- [ ] Implement capability detection
- [ ] Add comprehensive tests
- [ ] Verify backward compatibility (existing tests pass)

**Key Changes**:
- Refactor to implement `Provider` interface
- Use canonical session format internally
- Maintain existing behavior for backward compatibility
- Add feature detection for CLI version

#### 3.2 Opencode Provider (3 days)

**Tasks**:
- [ ] Create `src/lib/providers/opencode/` directory
- [ ] Implement `Provider` interface
- [ ] Implement session discovery (research needed)
- [ ] Implement output parsing
- [ ] Add headless mode support
- [ ] Add supervised mode support
- [ ] Create tests
- [ ] Document limitations

**Assumptions** (to be validated in Phase 0):
- Supports `--output-format json`
- Sessions stored in `~/.opencode/sessions/`
- Supports permission bypass flag

#### 3.3 Provider Registry (2 days)

```typescript
// src/lib/providers/registry.ts
export class ProviderRegistry {
  private providers = new Map<ProviderType, Provider>();
  
  register(provider: Provider): void;
  get(type: ProviderType): Provider;
  getAvailable(): Promise<ProviderType[]>;
  resolve(config: RalphSection): Promise<Provider>;
}
```

**Tasks**:
- [ ] Create provider registry
- [ ] Implement auto-discovery of available providers
- [ ] Add provider selection logic
- [ ] Create factory for provider instantiation
- [ ] Add error handling for unavailable providers

---

### Phase 4: Provider Implementation - Wave 2 (8 days)

**Duration**: 8 days  
**Dependencies**: Phase 3 complete  
**Goal**: Implement Gemini and Cursor providers

#### 4.1 Gemini Provider (3 days)

**Approach**: Leverage existing `gemini-research` command

**Tasks**:
- [ ] Create `src/lib/providers/gemini/` directory
- [ ] Review existing `src/commands/gemini/` implementation
- [ ] Implement `Provider` interface
- [ ] Handle Google's session format
- [ ] Implement output parsing
- [ ] Add tests
- [ ] Document differences from Claude behavior

#### 4.2 Cursor Provider (5 days)

**⚠️ HIGH COMPLEXITY - Requires research**

**Critical Considerations**:
- Session storage location TBD (research in Phase 0)
- `--force` flag security implications
- Output format differences
- Permission model differences

**Tasks**:
- [ ] Create `src/lib/providers/cursor/` directory
- [ ] Implement `Provider` interface
- [ ] Implement session discovery
- [ ] Implement `--force` flag handling (opt-in via config)
- [ ] Add comprehensive security warnings
- [ ] Implement output parsing
- [ ] Add extensive tests
- [ ] Document security considerations

**Security Implementation**:
```typescript
// Cursor provider
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

---

### Phase 5: CLI Integration & Error Handling (5 days)

**Duration**: 5 days  
**Dependencies**: Phases 3-4 complete  
**Goal**: Integrate providers into CLI with error handling

#### 5.1 CLI Flags Implementation

**Update `aaa ralph build` command**:
```bash
# Provider selection
aaa ralph build --provider claude
aaa ralph build --provider cursor --model composer

# Shorthand
aaa ralph build -p gemini

# Model override
aaa ralph build --provider claude --model claude-3-opus-20240229
```

**Tasks**:
- [ ] Add `--provider` flag to build command
- [ ] Add `--model` flag to build command
- [ ] Update CLI argument parsing
- [ ] Add validation for provider/model combinations
- [ ] Update help text

#### 5.2 Error Handling & Retry Logic (3 days)

**Retry Strategy**:
```typescript
interface RetryConfig {
  maxRetries: number;
  backoffMs: number;
  retryableErrors: string[];
}

class ProviderInvoker {
  async invokeWithRetry(
    provider: Provider,
    options: InvokeOptions,
    retryConfig: RetryConfig
  ): Promise<InvokeResult> {
    // Implement exponential backoff
    // Handle provider-specific errors
    // Log retry attempts
  }
}
```

**Error Categories**:
1. **Transient**: Rate limits, network errors → Retry with backoff
2. **Configuration**: Missing CLI, invalid model → Fail fast with clear message
3. **Permission**: Access denied, auth errors → Fail with remediation steps
4. **Runtime**: OOM, timeout → Retry once, then fail

**Tasks**:
- [ ] Create error classification system
- [ ] Implement retry logic with exponential backoff
- [ ] Add provider-specific error messages
- [ ] Create error recovery suggestions
- [ ] Add telemetry for error tracking

#### 5.3 Provider Capability Detection (1 day)

**Tasks**:
- [ ] Implement `getCapabilities()` for each provider
- [ ] Add capability validation before operations
- [ ] Warn when using unsupported features
- [ ] Graceful degradation (e.g., skip cost tracking if unavailable)

---

### Phase 6: Testing & Documentation (5 days)

**Duration**: 5 days  
**Dependencies**: All previous phases  
**Goal**: Comprehensive testing and documentation

#### 6.1 Testing Strategy

**Unit Tests** (per provider):
- Provider interface compliance
- Output parsing
- Session discovery
- Error handling
- Configuration resolution

**Integration Tests**:
- End-to-end build with each provider
- Provider switching
- Error recovery
- Session import/export

**Compatibility Tests**:
- Multiple CLI versions
- Different operating systems
- Edge cases (empty sessions, malformed output)

#### 6.2 Documentation

**User Documentation**:
- [ ] Update README with multi-CLI support
- [ ] Create provider setup guides (per provider)
- [ ] Document configuration options
- [ ] Add troubleshooting guide
- [ ] Create migration guide (Claude → other providers)

**Developer Documentation**:
- [ ] Provider implementation guide
- [ ] Architecture decision records (ADRs)
- [ ] Session format specification
- [ ] Output format specification

#### 6.3 Context File Strategy

**Problem**: CLAUDE.md vs GEMINI.md vs .cursor/rules fragmentation

**Solution**:
1. **Primary**: Keep `CLAUDE.md` as canonical project context
2. **Provider-specific**: Allow `.ralph/context/<provider>.md` overrides
3. **Merge strategy**: Provider-specific content appended to canonical

```typescript
function loadContext(provider: ProviderType, projectRoot: string): string {
  const canonicalPath = path.join(projectRoot, 'CLAUDE.md');
  const providerPath = path.join(projectRoot, '.ralph/context', `${provider}.md`);
  
  let context = readFileSync(canonicalPath, 'utf8');
  
  if (existsSync(providerPath)) {
    const providerContext = readFileSync(providerPath, 'utf8');
    context += `\n\n---\n\n${providerContext}`;
  }
  
  return context;
}
```

---

## Critical Design Decisions

### Decision 1: Session Format Strategy

**Problem**: Each CLI stores sessions differently (Claude JSONL, others unknown)

**Options Considered**:
1. ❌ Use provider-native formats directly
2. ❌ Store multiple formats (redundant, error-prone)
3. ✅ **Canonical Ralph format with adapters**

**Rationale**:
- Single source of truth for session analysis
- Enables cross-provider session inspection
- Simplifies metrics aggregation
- Future-proof for new providers

**Trade-offs**:
- Extra conversion step during session import
- Storage overhead (but minimal, JSONL is compact)
- Must maintain adapters for each provider

### Decision 2: Configuration Structure

**Problem**: Where to store provider-specific config

**Options Considered**:
1. ❌ Top-level: `{ "provider": "claude", "claude": {...} }`
2. ❌ Nested: `{ "ralph": { "providers": { "claude": {...} } } }`
3. ✅ **Flattened: `{ "ralph": { "claude": {...} } }`**

**Rationale**:
- Clear ownership (all Ralph config under `ralph` key)
- Easy access pattern (`config.ralph.claude`)
- Extensible for new providers
- Matches existing config pattern (hooks, build)

### Decision 3: Provider Implementation Order

**Order**: Claude → Opencode → Gemini → Cursor → Codex

**Rationale**:
1. **Claude first**: Existing implementation, serves as reference
2. **Opencode second**: Similar architecture to Claude (spawn CLI), lower complexity
3. **Gemini third**: Partial implementation exists, well-documented API
4. **Cursor fourth**: High complexity due to research needs and security concerns
5. **Codex last**: Least priority, may have API vs CLI differences

### Decision 4: No Automatic Fallback Chain

**Decision**: Users must explicitly specify provider; clear error if unavailable

**Rationale**:
- Predictable behavior
- No surprise provider switches
- Forces explicit configuration
- Simplifies debugging

**Error Message Example**:
```
Error: Provider 'cursor' is not available.
  - Cursor CLI not found in PATH
  - Install: https://cursor.sh/download
  
Available providers:
  ✓ claude
  ✓ opencode
  ✗ cursor (not installed)
  ✗ gemini (not configured)

Run with --provider claude to use an available provider.
```

### Decision 5: Cursor --force Flag Handling

**Decision**: Opt-in via `dangerouslyAllowForceWrites` config option

**Rationale**:
- Security-first approach
- Forces user acknowledgment of risk
- Consistent with Claude's `dangerouslySkipPermissions`
- Prevents accidental data loss

**Implementation**:
```typescript
// Blocked by default
if (!config.dangerouslyAllowForceWrites) {
  throw new ProviderError(
    'Cursor requires --force flag for file modifications.\n' +
    'This bypasses safety checks and may result in data loss.\n\n' +
    'To enable, set in config:\n' +
    '{ "ralph": { "cursor": { "dangerouslyAllowForceWrites": true } } }\n\n' +
    'Or use environment variable:\n' +
    'RALPH_CURSOR_DANGEROUSLY_ALLOW_FORCE_WRITES=true'
  );
}
```

---

## Risk Mitigation Table

| Risk | Severity | Likelihood | Mitigation Strategy | Owner |
|------|----------|------------|---------------------|-------|
| **Session format incompatibility** | 🔴 Critical | High | Canonical format with adapters (Phase 1) | Architecture |
| **Output format divergence** | 🔴 Critical | High | Provider-specific parsers with unified interface (Phase 1) | Architecture |
| **Token/cost metrics unavailable** | ⚠️ High | Medium | Graceful degradation (zeros/undefined), document limitations | Implementation |
| **Context file fragmentation** | ⚠️ High | Medium | Canonical CLAUDE.md + provider-specific overrides | Documentation |
| **Cursor security (--force flag)** | ⚠️ High | High | Opt-in config, clear warnings, documentation | Security |
| **CLI installation variability** | ⚠️ Medium | Medium | Runtime validation, clear error messages, setup guides | UX |
| **Regression in existing Claude code** | ⚠️ Medium | Medium | Comprehensive tests, backward compatibility layer, phased rollout | QA |
| **Time estimates too optimistic** | ⚠️ Medium | High | Revised estimates (4-5 weeks), buffer days, parallel work | PM |
| **Research findings invalidate assumptions** | ⚠️ Medium | Medium | Phase 0 dedicated research, validate before implementation | Research |
| **Provider API changes** | ⚠️ Low | Low | Version detection, deprecation warnings, adapter pattern | Maintenance |

---

## Implementation Order with Dependencies

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

## Success Criteria

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

## Appendix A: Configuration Examples

### Minimal Configuration

```json
{
  "ralph": {
    "provider": "claude"
  }
}
```

### Multi-Provider Configuration

```json
{
  "ralph": {
    "provider": "claude",
    "claude": {
      "model": "claude-3-opus-20240229",
      "maxTokens": 4096
    },
    "cursor": {
      "enabled": false,
      "dangerouslyAllowForceWrites": false
    },
    "gemini": {
      "model": "gemini-pro",
      "temperature": 0.7
    }
  }
}
```

### Environment Variables

```bash
# Provider selection
export RALPH_PROVIDER=cursor

# Claude-specific
export RALPH_CLAUDE_MODEL=claude-3-opus-20240229
export RALPH_CLAUDE_MAX_TOKENS=4096

# Cursor-specific (security)
export RALPH_CURSOR_DANGEROUSLY_ALLOW_FORCE_WRITES=true
```

---

## Appendix B: Provider Comparison Matrix

| Feature | Claude | Opencode | Gemini | Cursor | Codex |
|---------|--------|----------|--------|--------|-------|
| **Headless mode** | ✅ | ✅ (assumed) | ✅ | ✅ | ✅ |
| **Chat/supervised** | ✅ | ✅ (assumed) | ❓ | ❓ | ❓ |
| **Custom models** | ✅ | ✅ (assumed) | ✅ | ✅ (composer) | ✅ |
| **Token metrics** | ✅ | ❓ | ✅ | ❓ | ❓ |
| **Cost tracking** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Permission bypass** | ✅ | ❓ | ❓ | ❓ | ❓ |
| **Session storage** | Known | Research | Research | Research | Research |
| **Output format** | JSON array | Research | JSON | Research | Research |
| **Security flags** | `--dangerously-skip-permissions` | TBD | TBD | `--force` | TBD |

*Research needed in Phase 0*

---

## Appendix C: File Structure

```
src/
├── lib/
│   ├── config/
│   │   ├── types.ts              # Updated with provider configs
│   │   ├── provider-resolution.ts # NEW
│   │   └── env.ts                # Updated with provider env vars
│   └── providers/
│       ├── types.ts              # NEW - Provider interface
│       ├── registry.ts           # NEW - Provider registry
│       ├── validation.ts         # NEW - Runtime validation
│       ├── session/
│       │   ├── types.ts          # NEW - Canonical format
│       │   ├── canonical.ts      # NEW
│       │   ├── importer.ts       # NEW
│       │   └── storage.ts        # NEW
│       ├── output/
│       │   ├── types.ts          # NEW
│       │   ├── claude-parser.ts  # NEW
│       │   └── jsonl-parser.ts   # NEW
│       ├── claude/
│       │   └── index.ts          # REFACTORED from claude.ts
│       ├── opencode/
│       │   └── index.ts          # NEW
│       ├── gemini/
│       │   └── index.ts          # NEW
│       └── cursor/
│           └── index.ts          # NEW
└── commands/
    └── ralph/
        ├── build.ts              # UPDATED - Provider selection
        ├── claude.ts             # DEPRECATED - Remove after refactor
        └── session.ts            # REFACTORED - Use canonical format
```

---

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-01-28 | Technical Architect | Initial updated plan incorporating all peer review feedback |

---

**Next Steps**:
1. Review and approve this plan
2. Create Phase 0 research tickets
3. Assign owners to each phase
4. Schedule Phase 1 kickoff
5. Set up tracking for blockers
