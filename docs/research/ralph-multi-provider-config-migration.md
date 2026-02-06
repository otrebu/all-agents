# Configuration Migration Strategy for Multi-Provider CLI Tools

**Research Date:** 2026-02-05  
**Context:** Ralph CLI expanding from single-provider (Claude) to multi-provider (Claude, OpenCode, Codex, Gemini, Pi)  
**Constraint:** Zero breaking changes for existing configs

---

## Executive Summary

This report analyzes configuration migration patterns from enterprise-grade CLI tools (AWS CLI, Docker, GitHub CLI, golangci-lint, Buf) and provides specific recommendations for ralph's multi-provider expansion. The key insight: **additive-only changes with graceful degradation** is the industry standard for zero-downtime configuration evolution.

---

## 1. Research Findings: Industry Patterns

### 1.1 Priority Hierarchy (Universal Standard)

All major CLI tools follow this precedence order:

```
CLI Flag > Environment Variable > Config File > Auto-Detect > Default
```

**Evidence:**
- **AWS CLI**: "If you specify an option by using a parameter on the AWS CLI command line, it overrides any value from either the corresponding environment variable or a profile in the configuration file."
- **GitHub CLI**: `GH_TOKEN` > config file > interactive prompt
- **Docker**: `--context` flag > `DOCKER_CONTEXT` env > current context from config

### 1.2 Migration Patterns from Popular Tools

#### Pattern A: Explicit Migration Command (golangci-lint)
```bash
golangci-lint migrate  # Converts v1 → v2 config automatically
```
- Backs up original config before migration
- Validates against schema before converting
- Comments are NOT preserved (documented limitation)

#### Pattern B: Versioned Config with Backward Compatibility (Buf CLI)
```yaml
# v2 config - but v1 still works
version: v2
modules:
  - path: proto
```
- **Key principle**: "Your v1 configuration files still work. Buf is enterprise-grade software, and we want you to be minimally impacted."
- Auto-detection of config version
- Graceful fallback to legacy parsers

#### Pattern C: Isolated Config Directories (Fortify CLI)
```
~/.fortify/fcli/v2/config   # v2 uses separate directory
~/.fortify/fcli/v3/config   # v3 uses separate directory
```
- Allows side-by-side installation
- No migration needed - fresh start
- Configuration re-entry required

#### Pattern D: Context-Based Provider Selection (Docker)
```bash
docker context use production  # Sets default context
docker --context=staging ps    # Override via flag
DOCKER_CONTEXT=dev docker ps   # Override via env
```
- Context = Provider configuration bundle
- Easy switching between environments
- Default context stored in config

---

## 2. Analysis: Ralph's Specific Challenges

### Current State Analysis

From reviewing the codebase:

1. **No explicit provider field** in current `aaa.config.json` - ralph defaults to `claude` binary
2. **Legacy config support exists** (`ralph.config.json` → `aaa.config.json` migration)
3. **Strong precedence handling** already implemented via Zod schemas
4. **Provider invocation is hardcoded** in `src/commands/ralph/claude.ts`

### Key Migration Challenges

| Challenge | Risk Level | Description |
|-----------|------------|-------------|
| Implicit default | High | Existing configs don't specify provider - must default to claude |
| Binary name collision | Medium | `claude` command might conflict with provider naming |
| Config schema evolution | Low | Zod already supports optional fields |
| User communication | Medium | Users need to know provider selection is now configurable |

---

## 3. Recommendations

### 3.1 Config Schema Evolution (Additive Only)

**Recommended approach**: Add optional `provider` field to existing sections without breaking changes.

```typescript
// In types.ts - add to RalphSection
interface RalphSection {
  // ... existing fields
  
  /**
   * AI provider selection
   * If omitted, defaults to "claude" for backward compatibility
   * Can be overridden via --provider flag or RALPH_PROVIDER env var
   */
  provider?: Provider;
}

type Provider = "claude" | "codex" | "gemini" | "opencodex" | "pi";

const providerSchema = z.enum([
  "claude",
  "codex", 
  "gemini",
  "opencodex",
  "pi"
]).optional();
```

**Rationale:**
- Optional field = zero breaking changes
- Existing configs continue working unchanged
- New configs can explicitly specify provider

### 3.2 Provider Resolution Priority

Implement the standard precedence hierarchy:

```typescript
function resolveProvider(config: AaaConfig): Provider {
  // Priority 1: CLI flag (--provider)
  const cliFlag = getCliFlag("provider");
  if (cliFlag) return cliFlag as Provider;
  
  // Priority 2: Environment variable
  const envVar = process.env.RALPH_PROVIDER;
  if (envVar) return envVar as Provider;
  
  // Priority 3: Config file
  if (config.ralph?.provider) {
    return config.ralph.provider;
  }
  
  // Priority 4: Auto-detect (future enhancement)
  const detected = autoDetectProvider();
  if (detected) return detected;
  
  // Priority 5: Default (claude for backward compatibility)
  return "claude";
}
```

**Key decisions:**
- Environment variable: `RALPH_PROVIDER` (follows existing `NTFY_*` pattern)
- CLI flag: `--provider` (added to all ralph subcommands)
- Default: `"claude"` (preserves existing behavior)

### 3.3 Graceful Degradation Strategy

When a provider is specified but not available:

```typescript
function validateProvider(provider: Provider): Provider {
  const available = detectAvailableProviders();
  
  if (!available.includes(provider)) {
    console.warn(
      `Warning: Provider "${provider}" is not available. ` +
      `Available: ${available.join(", ")}. ` +
      `Falling back to "claude".`
    );
    return "claude";
  }
  
  return provider;
}
```

**Detection logic:**
```typescript
function detectAvailableProviders(): Provider[] {
  const available: Provider[] = [];
  
  // Check for each provider binary in PATH
  if (isBinaryInPath("claude")) available.push("claude");
  if (isBinaryInPath("codex")) available.push("codex");
  if (isBinaryInPath("gemini")) available.push("gemini");
  if (isBinaryInPath("opencode")) available.push("opencodex");
  if (isBinaryInPath("pi")) available.push("pi");
  
  return available;
}
```

### 3.4 User Communication Strategy

**Logging approach** (non-breaking, informative):

```typescript
function logProviderSelection(
  provider: Provider,
  source: "cli" | "env" | "config" | "default"
): void {
  // Only log in debug mode or when provider is non-default
  const isDebug = process.env.DEBUG === "true";
  const isDefault = source === "default" && provider === "claude";
  
  if (isDebug || !isDefault) {
    const sourceLabel = {
      cli: "--provider flag",
      env: "RALPH_PROVIDER environment variable",
      config: "aaa.config.json",
      default: "default (backward compatibility)"
    }[source];
    
    console.log(`Using AI provider: ${provider} (from ${sourceLabel})`);
  }
}
```

**Deprecation warnings** (for future breaking changes):
- Only show when explicitly opted in via `debug: true`
- Never block execution
- Always provide migration path

### 3.5 Migration Command (Optional Enhancement)

Future enhancement: `aaa ralph migrate-config`

```typescript
// Pseudo-code for migration command
function migrateConfig(): void {
  const current = loadAaaConfig();
  
  // Check if already has provider field
  if (current.ralph?.provider) {
    console.log("Config already has provider field. No migration needed.");
    return;
  }
  
  // Create backup
  backupConfig("aaa.config.json");
  
  // Add explicit provider (claude) for clarity
  const migrated = {
    ...current,
    ralph: {
      ...current.ralph,
      provider: "claude"  // Explicit default for clarity
    }
  };
  
  writeConfig("aaa.config.json", migrated);
  console.log("Migration complete. Added explicit provider: claude");
}
```

**Rationale:**
- Not required for zero-downtime migration
- Provides path for users who want explicit configuration
- Documents intent clearly in config file

---

## 4. Implementation Checklist

### Phase 1: Core Provider Support (Zero Breaking Changes)

- [ ] Add `provider` field to `RalphSection` interface (optional)
- [ ] Add provider resolution logic with priority hierarchy
- [ ] Implement `--provider` CLI flag for all ralph commands
- [ ] Add `RALPH_PROVIDER` environment variable support
- [ ] Add provider detection/validation logic
- [ ] Add provider-specific invocation modules ( refactor `claude.ts` → `providers/`)
- [ ] Add debug logging for provider selection
- [ ] Update JSON Schema for IDE support

### Phase 2: Enhanced Experience

- [ ] Add `aaa ralph config` command to view effective configuration
- [ ] Add provider availability check to `aaa ralph status`
- [ ] Create `aaa ralph migrate-config` command (optional)
- [ ] Document provider selection in help text
- [ ] Add provider-specific configuration sections (if needed)

### Phase 3: Future Providers

- [ ] Codex provider implementation
- [ ] Gemini provider implementation
- [ ] OpenCode provider implementation
- [ ] Pi provider implementation

---

## 5. Example Configurations

### Scenario A: Existing User (No Changes Needed)

```json
{
  "ralph": {
    "build": { "maxIterations": 3 }
  }
}
```
**Behavior**: Uses `claude` (implicit default) - identical to current behavior

### Scenario B: New User with Explicit Provider

```json
{
  "ralph": {
    "provider": "codex",
    "build": { "maxIterations": 3 }
  }
}
```
**Behavior**: Uses `codex` binary

### Scenario C: Environment Override

```bash
RALPH_PROVIDER=gemini aaa ralph build
```
**Behavior**: Uses `gemini` regardless of config file

### Scenario D: CLI Override

```bash
aaa ralph build --provider=opencodex
```
**Behavior**: Uses `opencodex` regardless of env or config

---

## 6. Edge Cases & Mitigations

| Edge Case | Mitigation |
|-----------|------------|
| Invalid provider in config | Warn + fall back to `claude` + continue execution |
| Provider binary not found | Warn + fall back to available provider + continue |
| Multiple providers available | Use priority order, don't auto-switch without user input |
| Legacy `ralph.config.json` | Continue supporting via existing loader (already implemented) |
| Config has typos in provider | Zod validation catches it, uses default + warning |
| Provider-specific options | Add nested config per provider: `ralph.providers.codex.apiKey` |

---

## 7. Success Metrics

**Zero Breaking Changes verification:**
1. Existing configs without `provider` field work identically
2. Existing `ralph.config.json` legacy files continue working
3. No new required fields in config schema
4. All existing tests pass without modification

**Adoption metrics:**
- Provider selection works via all three methods (flag, env, config)
- Debug logging shows provider selection source
- Warnings are helpful but non-blocking

---

## 8. References

1. **AWS CLI Precedence**: https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-envvars.html
2. **Docker Context Priority**: https://docs.docker.com/reference/cli/docker/context/use/
3. **Buf CLI Migration**: https://buf.build/docs/migration-guides/migrate-v2-config-files/
4. **golangci-lint Migration**: https://golangci-lint.run/product/migration-guide/
5. **GitHub CLI Environment**: https://cli.github.com/manual/gh_help_environment

---

## Conclusion

The recommended approach follows the **additive-only** pattern proven by Buf CLI and golangci-lint:

1. **Optional provider field** with implicit "claude" default
2. **Standard priority hierarchy** (CLI > env > config > auto > default)  
3. **Graceful degradation** with warnings, not errors
4. **No migration command required** for zero breaking changes
5. **Debug logging** to help users understand provider selection

This approach ensures existing users experience **zero disruption** while enabling new multi-provider capabilities for those who want them.
