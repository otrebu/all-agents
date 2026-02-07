---
depends:
  - @docs/planning/milestones/004-MULTI-CLI/MILESTONE.md
  - @docs/planning/milestones/004-MULTI-CLI/stories/002-claude-refactor.md
  - @docs/planning/milestones/004-MULTI-CLI/tasks/TASK-037-provider-registry.md
  - @docs/planning/milestones/004-MULTI-CLI/tasks/TASK-039-claude-refactor.md
  - @context/blocks/quality/coding-style.md
  - @context/blocks/quality/error-handling.md
  - @context/stacks/cli/cli-bun.md
---

## Task: Update calibrate.ts to Use Provider Registry

**Story:** [002-claude-refactor](./002-claude-refactor.md)

### Goal
Update `calibrate.ts` to use the provider registry's `invokeWithProvider` instead of direct `invokeClaudeHeadlessAsync` calls, making calibration provider-agnostic while maintaining backward compatibility.

### Context
The calibrate command currently has hardcoded dependencies on Claude Code through direct imports from `./claude`. After the timeout protection migration, it calls `invokeClaudeHeadlessAsync` (previously `invokeClaudeHeadless`) at three locations for intention drift, technical drift, and self-improvement analysis respectively. As part of the multi-CLI migration, we need to decouple calibration from Claude-specific implementations.

**Current State (after timeout protection migration):**
- `calibrate.ts` imports `invokeClaudeHeadlessAsync` from `./claude` (the sync `invokeClaudeHeadless` was removed)
- All four functions (`runCalibrate`, `runImproveCheck`, `runIntentionCheck`, `runTechnicalCheck`) are already async, returning `Promise<boolean>`
- All callers in `index.ts` already use `await` (async conversion completed in timeout protection migration)
- Three `invokeClaudeHeadlessAsync` calls with timeout config in `runImproveCheck()`, `runIntentionCheck()`, and `runTechnicalCheck()`
- No provider selection logic - always uses Claude

**Remaining Work:**
The async conversion is complete. The remaining task is purely a provider abstraction swap: replace `invokeClaudeHeadlessAsync` calls with `invokeWithProvider` from the registry, and add provider selection logic.

**Dependencies:**
- TASK-037: Provider registry must be implemented with `invokeWithProvider` and `selectProvider`
- TASK-039: Claude provider refactor must be complete so registry can invoke Claude

### Plan
1. **Update imports in calibrate.ts**
   - Remove import of `invokeClaudeHeadlessAsync` from `./claude`
   - Remove import of `loadTimeoutConfig` from `./config` (timeout handling moves to provider registry)
   - Add imports for `invokeWithProvider`, `selectProvider`, and `ProviderType` from `./providers/registry`

2. **Add provider selection at calibration start**
   - In `runCalibrate()`, call `selectProvider()` at the beginning
   - Store selected provider in `CalibrateOptions` or pass as parameter
   - Handle provider validation errors with helpful messages

3. ~~**Convert calibration functions to async**~~ **ALREADY DONE** (timeout protection migration)
   - All 4 functions are already async returning `Promise<boolean>`
   - All callers in index.ts already use `await`

4. **Replace invokeClaudeHeadlessAsync calls with invokeWithProvider**
   - `runImproveCheck`: Replace `invokeClaudeHeadlessAsync(...)` with `await invokeWithProvider(provider, { prompt, mode: 'headless-async' })`
   - `runIntentionCheck`: Same replacement
   - `runTechnicalCheck`: Same replacement

5. ~~**Update runCalibrate to handle async checks**~~ **ALREADY DONE** (timeout protection migration)

6. ~~**Update caller in index.ts**~~ **ALREADY DONE** (timeout protection migration)

7. **Add error handling for provider failures**
   - Wrap `invokeWithProvider` calls in try-catch blocks
   - Log helpful error messages when provider invocation fails
   - Return `false` from check functions on failure (maintains existing behavior)

8. **Run TypeScript compiler and tests**
   - Verify no type errors after async conversion
   - Run existing calibration tests to ensure no regressions
   - Test with `--provider claude` flag to verify explicit selection works

### Acceptance Criteria
- [x] `calibrate.ts` imports provider functions from `./providers/registry` instead of `invokeClaudeHeadlessAsync` from `./claude`
- [x] `runCalibrate` is async and calls `selectProvider()` at start
- [x] All three check functions (`runImproveCheck`, `runIntentionCheck`, `runTechnicalCheck`) are async *(completed in timeout protection migration)*
- [x] All three `invokeClaudeHeadlessAsync` calls replaced with `await invokeWithProvider`
- [x] Provider selection respects CLI flag `--provider` > env var `RALPH_PROVIDER` > config > auto-detect
- [x] Calibration works with `--provider claude` explicit selection
- [x] Calibration falls back to auto-detected provider when none specified
- [x] Error messages are helpful when provider binary is missing
- [x] No TypeScript compilation errors
- [x] Existing tests pass
- [x] No orphaned processes after calibration (SIGTERM/SIGKILL handling preserved)

### Test Plan
- [x] Unit tests: Verify `selectProvider` is called with correct priority in calibration context
- [x] Unit tests: Mock `invokeWithProvider` and verify it's called with correct prompt and mode
- [x] Integration test: Run `aaa ralph calibrate intention --provider claude` and verify it works
- [x] Integration test: Run `aaa ralph calibrate all` without `--provider` and verify auto-detection
- [x] Integration test: Verify error handling when provider binary is missing
- [x] Manual test: Run full calibration workflow and verify output matches pre-migration behavior
- [x] Regression test: Ensure Ctrl+C interrupt still exits cleanly

### Scope
- **In:**
  - Updating `tools/src/commands/ralph/calibrate.ts` to use provider registry
  - ~~Converting calibration functions from sync to async~~ *(already done in timeout protection migration)*
  - Adding provider selection at calibration entry point
  - ~~Updating caller in `index.ts` to handle async~~ *(already done in timeout protection migration)*
  - Error handling for provider invocation failures

- **Out:**
  - Implementing new providers (opencode, codex, etc.) - only Claude needs to work
  - Changing calibration logic or prompts
  - Adding new calibration features
  - Modifying the provider registry itself (assumed done in TASK-037)
  - Refactoring Claude provider (assumed done in TASK-039)
  - MCP process cleanup (deferred per story notes)

### Notes
**Async Migration Status:**
The async conversion is already complete (done in the timeout protection migration). All calibration functions are async, all callers use `await`, and `invokeClaudeHeadlessAsync` is used with timeout config. The remaining work is purely the provider abstraction swap.

**Provider Mode Selection:**
Calibration uses headless mode with async execution. Use `mode: 'headless-async'` when calling `invokeWithProvider`. This maps to:
- Claude: `invokeClaudeHeadlessAsync` (async spawn with stall/timeout detection)
- Future providers: their async headless implementation

**Error Handling Pattern:**
Follow the existing pattern in calibrate.ts - log error and return `false`:
```typescript
try {
  const result = await invokeWithProvider(provider, { prompt, mode: 'headless-sync' });
  if (result === null) {
    console.error("Analysis failed or was interrupted");
    return false;
  }
  return true;
} catch (error) {
  console.error(`Provider invocation failed: ${error instanceof Error ? error.message : String(error)}`);
  return false;
}
```

**Backward Compatibility:**
- Default provider remains 'claude' when none specified
- Existing `aaa.config.json` continues working
- Environment variable `RALPH_PROVIDER` can override
- CLI flag `--provider claude` takes highest priority

**~~Risk: Sync-to-Async Conversion:~~** *(Resolved — async conversion already complete in timeout protection migration.)*

**Risk: Provider Not Available:**
If the selected provider's binary is not installed, `invokeWithProvider` will throw a helpful error. This is better than current behavior which would fail silently or with cryptic errors.

**Testing Considerations:**
- Mock `selectProvider` and `invokeWithProvider` in unit tests
- Use actual provider in integration tests (requires Claude CLI installed)
- Test error paths by mocking provider to throw

### Related Documentation
- @context/stacks/cli/cli-bun.md - Bun CLI patterns and async handling
- @context/blocks/quality/coding-style.md - Function design and naming conventions
- @context/blocks/quality/error-handling.md - Error handling philosophy
- @docs/planning/milestones/004-MULTI-CLI/tasks/TASK-037-provider-registry.md - Provider registry implementation
- @docs/planning/milestones/004-MULTI-CLI/tasks/TASK-039-claude-refactor.md - Claude provider refactor
- @tools/src/commands/ralph/providers/registry.ts - Provider registry (source of truth)
- @tools/src/commands/ralph/providers/types.ts - Provider types and interfaces
