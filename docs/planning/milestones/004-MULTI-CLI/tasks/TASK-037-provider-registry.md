## Task: Create Provider Registry with Selection and Lazy Availability

**Story:** [001-provider-foundation](./001-provider-foundation.md)

### Goal
Create the provider registry module with selection logic, lazy availability checking, and helpful error messages for missing providers.

### Context
The provider registry is the central hub for provider management. It maintains the registry of all providers, handles provider selection priority (CLI flag > env var > config > auto-detect), and performs lazy availability checking when providers are invoked. The `available` field in `ProviderCapabilities` indicates whether a provider is implemented (not whether its binary is installed).

### Plan
1. Create `tools/src/commands/ralph/providers/registry.ts` with:
   - `REGISTRY` constant mapping all 6 providers to their capabilities (invoke functions initially null/placeholder)
   - `isBinaryAvailable(binary)` - async check using `which` command
   - `getInstallInstructions(provider)` - returns installation instructions string
   - `ProviderError` class with provider and cause fields
   - `invokeWithProvider(provider, options)` - validates binary exists, checks provider is implemented, then invokes
   - `selectProvider(context)` - pure function for provider selection with priority: CLI flag > env var > config > auto-detect
   - `selectProviderFromEnv()` - reads CLI args, env vars (`RALPH_PROVIDER`), config file, then auto-detects
   - `validateProvider(provider)` - validates string is a valid ProviderType
   - `autoDetectProvider()` - checks binaries in priority order (claude, opencode, codex, gemini, pi)

2. Create `tools/tests/providers/registry.test.ts` with unit tests:
   - Provider selection priority order
   - Provider validation (valid/invalid)
   - Auto-detection priority order
   - Error message generation
   - Binary availability checking (mocked)

3. Run TypeScript compiler and tests to verify

### Acceptance Criteria
- [x] `tools/src/commands/ralph/providers/registry.ts` exists with all functions
- [x] `REGISTRY` constant has all 6 providers with `available: false` (not yet implemented)
- [x] `isBinaryAvailable()` checks PATH using `which` command
- [x] `getInstallInstructions()` returns installation instructions for each provider
- [x] `ProviderError` includes provider name, message, and optional cause
- [x] `invokeWithProvider()` validates binary exists before invoking
- [x] `invokeWithProvider()` throws helpful error with install instructions when binary missing
- [x] `selectProvider()` follows priority: CLI flag > env var > config > auto-detect
- [x] `selectProviderFromEnv()` reads `process.argv`, `process.env.RALPH_PROVIDER`, and config
- [x] `validateProvider()` throws `ProviderError` for invalid providers
- [x] `autoDetectProvider()` checks binaries in priority order
- [x] Unit tests cover selection logic, validation, and error cases
- [x] TypeScript compiles without errors

### Test Plan
- [x] Unit tests in `tools/tests/providers/registry.test.ts`:
  - `selectProvider()` returns CLI flag when provided
  - `selectProvider()` falls back through priority chain correctly
  - `validateProvider()` accepts valid providers
  - `validateProvider()` throws for invalid providers with helpful message
  - `autoDetectProvider()` returns first available binary in priority order
  - `autoDetectProvider()` defaults to 'claude' when none available
  - `isBinaryAvailable()` returns true when binary in PATH (mocked)
  - `isBinaryAvailable()` returns false when binary not found (mocked)
  - `getInstallInstructions()` returns correct install command for each provider
  - `invokeWithProvider()` throws ProviderError with install help when binary missing

### Scope
- **In:** Registry constant, selection functions, validation, binary checking, error handling, install instructions
- **Out:** Actual provider implementations (claude.ts, opencode.ts), config file parsing logic (assume config loader exists), CLI flag parsing (assume args parser exists)

### Notes
**Design Decisions:**
- `available` field means "provider implementation exists" not "binary is installed"
- Binary availability is checked lazily at invocation time
- Selection logic is pure (no side effects) except `selectProviderFromEnv()` which reads env
- Install instructions are separate from error messages for flexibility

**ProviderError Location:**
`ProviderError` is defined in this module (registry.ts), not in types.ts. This is the canonical location for provider-related errors.

**Integration Points:**
- `selectProviderFromEnv()` will need to read config file (integrate with existing config loader)
- `invokeWithProvider()` will call provider invoke functions once implemented
- Registry will be imported by build.ts and review/index.ts

**Error Messages:**
- Missing binary: "Provider 'opencode' is not available. Binary 'opencode' not found in PATH.\nInstall: npm install -g opencode"
- Not implemented: "Provider 'codex' is not yet implemented."
- Invalid provider: "Unknown provider: invalid. Valid providers: claude, opencode, codex, gemini, pi, cursor"

### Related Documentation
- @docs/planning/milestones/004-MULTI-CLI/stories/001-provider-foundation.md
- @docs/planning/milestones/004-MULTI-CLI/tasks/TASK-036-provider-types.md (prerequisite types)
- @tools/src/commands/ralph/config.ts (config loading patterns)
- @context/stacks/cli/cli-bun.md (Bun CLI patterns)
- @context/foundations/quality/gate-standards.md (error handling standards)
