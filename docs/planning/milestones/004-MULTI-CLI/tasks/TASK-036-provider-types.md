## Task: Create Provider Types with Discriminated Unions

**Story:** [001-provider-foundation](./001-provider-foundation.md)

### Goal
Create type definitions for the provider abstraction layer using discriminated unions, establishing contracts for all supported AI coding agents.

### Context
Ralph currently has tight coupling to Claude Code CLI. This task creates the foundational types that enable multi-provider support. The types must support 6 providers (claude, opencode, codex, gemini, pi, cursor), normalized result interfaces, and discriminated union configs for type-safe provider selection.

Key design decisions:
- All 6 providers included in initial types for complete type safety
- Normalized `AgentResult` uses explicit units (costUsd, durationMs)
- Haiku is NOT a separate invocation mode - it's a config option in aaa.config.json for lightweight model selection
- Required `provider` discriminator for compile-time type narrowing

### Plan
1. Create `tools/src/commands/ralph/providers/types.ts` with:
   - `ProviderType` union: 'claude' | 'opencode' | 'codex' | 'gemini' | 'pi' | 'cursor'
   - `InvocationMode` union: 'supervised' | 'headless-sync' | 'headless-async'
   - `AgentResult` interface with costUsd, durationMs, sessionId, tokenUsage
   - `BaseProviderConfig` with timeoutMs, workingDirectory
   - Discriminated union configs: ClaudeConfig, OpencodeConfig, CodexConfig, GeminiConfig, PiConfig, CursorConfig
   - `ProviderConfig` union type
   - `InvocationOptions` interface
   - `InvokerFn` type alias
   - `ProviderCapabilities` interface
   - `PROVIDER_BINARIES` constant mapping


2. Create `tools/src/commands/ralph/providers/index.ts` as barrel export

3. Add provider config section to RalphConfig in `tools/src/commands/ralph/types.ts`:
   - `provider?: ProviderType` - default provider selection
   - `model?: string` - default model override
   - `lightweightModel?: string` - for haiku-style summary tasks

4. Run TypeScript compiler to verify no type errors

### Acceptance Criteria
- [x] `tools/src/commands/ralph/providers/types.ts` exists with all type definitions
- [x] `tools/src/commands/ralph/providers/index.ts` exports all public types
- [x] All 6 providers have discriminated union config types with required `provider` field
- [x] `AgentResult` uses normalized naming (costUsd, durationMs, sessionId)
- [x] `InvocationMode` has exactly 3 values (no haiku mode)
- [x] `PROVIDER_BINARIES` maps all providers to their CLI binary names

- [x] RalphConfig in types.ts includes provider, model, and lightweightModel options
- [x] TypeScript compiles without errors

### Test Plan
- [x] Create unit tests in `tools/tests/providers/types.test.ts`:
  - Type narrowing works with discriminated unions
  - ProviderError can be instantiated with all fields
  - PROVIDER_BINARIES has all 6 providers
- [x] Manual verification: Import types in a test file and verify IntelliSense/type checking works

### Scope
- **In:** Type definitions, discriminated unions, error class, barrel export, config type extensions
- **Out:** Registry implementation, utility functions, provider selection logic, binary availability checking, actual provider implementations

### Notes
**Type Design Patterns:**
- Use `interface` for object types (allows extension)
- Use `type` for unions and function signatures
- Required discriminator field enables type guards like `if (config.provider === 'claude')`

**Future Considerations:**
- Token usage fields are optional (?.) since not all providers expose this
- Provider configs can be extended with provider-specific options later
- The lightweightModel config enables haiku-style functionality without a separate mode

**Migration Path:**
- Existing `HeadlessResult` in claude.ts will be replaced by `AgentResult`
- Current `invokeClaudeHeadless` return type changes from `HeadlessResult | null` to `Promise<AgentResult>`

### Related Documentation
- @docs/planning/milestones/004-MULTI-CLI/stories/001-provider-foundation.md
- @tools/src/commands/ralph/claude.ts (existing patterns to abstract)
- @tools/src/commands/ralph/types.ts (RalphConfig extension point)
- @context/stacks/cli/cli-bun.md (Bun CLI stack patterns)
- @context/foundations/quality/gate-standards.md (type safety requirements)
