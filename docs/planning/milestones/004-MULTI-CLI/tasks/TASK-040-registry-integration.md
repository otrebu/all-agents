---
depends:
  - @docs/planning/milestones/004-MULTI-CLI/MILESTONE.md
  - @docs/planning/milestones/004-MULTI-CLI/stories/002-claude-refactor.md
  - @docs/planning/milestones/004-MULTI-CLI/tasks/TASK-037-provider-registry.md
  - @docs/planning/milestones/004-MULTI-CLI/tasks/TASK-039-claude-refactor.md
  - @context/blocks/quality/coding-style.md
---

## Task: Integrate Provider Registry with Build and Review Commands

**Story:** [002-claude-refactor](./002-claude-refactor.md)

### Goal
Update `build.ts` and `review/index.ts` to use the provider registry for provider selection and invocation, enabling multi-provider support while maintaining backward compatibility with existing Claude workflows.

### Context
The provider registry (TASK-037) provides a centralized way to select and invoke AI providers. The Claude provider has been refactored (TASK-039) to use the new abstraction. Now we need to integrate the registry into the two main ralph commands that invoke Claude: `build` and `review`.

**Current State:**
- `build.ts` directly imports and calls `invokeClaudeHeadlessAsync` and `invokeClaudeChat` from `./claude`
- `review/index.ts` imports `invokeClaudeChat` and `invokeClaudeHeadlessAsync` from `../ralph/claude` (updated in timeout protection migration — the sync `invokeClaudeHeadless` was removed)
- Both files have hardcoded Claude-specific invocation logic

**Target State:**
- Both files import `selectProvider` and `invokeWithProvider` from the provider registry
- Provider selection happens at command start (CLI flag > env var > config > auto-detect)
- All invocations go through the provider-agnostic `invokeWithProvider()` function
- Backward compatibility: default provider remains 'claude' when none specified

**Dependencies:**
- TASK-037 (provider registry) must be complete with `selectProvider()` and `invokeWithProvider()` functions
- TASK-039 (Claude refactor) must be complete with refactored Claude provider in `providers/claude.ts`

### Plan

1. **Update `tools/src/commands/ralph/build.ts`:**
   - Replace imports: remove `invokeClaudeHeadlessAsync`, `invokeClaudeChat` from `./claude`
   - Add imports: `selectProvider`, `invokeWithProvider` from `./providers/registry`
   - Add import: `ProviderType` from `./providers/types`
   - Update `runBuild()` function signature to accept optional `provider` in `BuildOptions`
   - At start of `runBuild()`, call `const provider = selectProvider(options.provider)` to determine provider
   - Log selected provider: `console.log(chalk.dim(`Using provider: ${provider}`))`
   - Replace `invokeClaudeHeadlessAsync()` call in `processHeadlessIteration()` with `invokeWithProvider()`:
     ```typescript
     const result = await invokeWithProvider(provider, {
       mode: 'headless-async',
       prompt,
       timeout: hardTimeoutMs,
       stallTimeoutMs,
       gracePeriodMs,
       onStderrActivity: () => { /* ... */ },
     });
     ```
   - Replace `invokeClaudeChat()` call in `processSupervisedIteration()` with `invokeWithProvider()`:
     ```typescript
     const result = invokeWithProvider(provider, {
       mode: 'supervised',
       promptPath,
       context: extraContext,
     });
     ```
   - Update result handling to use normalized `AgentResult` interface (result.result, result.costUsd, result.durationMs, result.sessionId)

2. **Update `tools/src/commands/review/index.ts`:**
   - Replace import: remove `invokeClaudeChat`, `invokeClaudeHeadlessAsync` from `../ralph/claude`
   - Add imports: `selectProvider`, `invokeWithProvider` from `../ralph/providers/registry`
   - Add import: `ProviderType` from `../ralph/providers/types`
   - Update `runHeadlessReview()` to call `const provider = selectProvider()` at start
   - Replace `invokeClaudeHeadlessAsync()` call with `invokeWithProvider(provider, { mode: 'headless', prompt })`
   - Update `runSupervisedReview()` to call `const provider = selectProvider()` at start
   - Replace `invokeClaudeChat()` call with `invokeWithProvider(provider, { mode: 'supervised', promptPath, context })`
   - Update result handling to use normalized `AgentResult` interface

3. **Update CLI argument parsing in `tools/src/commands/ralph/index.ts`:**
   - Add `--provider <name>` flag to build command options
   - Pass provider option through to `runBuild()`
   - Add `--provider <name>` flag to review command options (in `tools/src/commands/review/index.ts`)

4. **Update `BuildOptions` type in `tools/src/commands/ralph/types.ts`:**
   - Add optional `provider?: ProviderType` field

5. **Run TypeScript compiler to verify type safety:**
   ```bash
   cd tools && bun run typecheck
   ```

6. **Run tests to ensure no regressions:**
   ```bash
   cd tools && bun test
   ```

### Acceptance Criteria

- [x] `tools/src/commands/ralph/build.ts` imports from `./providers/registry` instead of `./claude`
- [x] `tools/src/commands/review/index.ts` imports from `../ralph/providers/registry` instead of `../ralph/claude`
- [x] `runBuild()` calls `selectProvider()` at start and logs selected provider
- [x] `processHeadlessIteration()` uses `invokeWithProvider()` instead of `invokeClaudeHeadlessAsync()`
- [x] `processSupervisedIteration()` uses `invokeWithProvider()` instead of `invokeClaudeChat()`
- [x] `runHeadlessReview()` uses `invokeWithProvider()` instead of `invokeClaudeHeadlessAsync()`
- [x] `runSupervisedReview()` uses `invokeWithProvider()` instead of `invokeClaudeChat()`
- [x] `--provider` CLI flag works for both `aaa ralph build` and `aaa review` commands
- [x] `aaa ralph build` without `--provider` defaults to 'claude' (backward compatibility)
- [x] `aaa review` without `--provider` defaults to 'claude' (backward compatibility)
- [x] All result handling updated to use normalized `AgentResult` interface
- [x] TypeScript compiles without errors
- [x] All existing tests pass

### Test Plan

- [x] Unit tests for provider selection in registry (already in TASK-037)
- [x] Manual test: `aaa ralph build` uses claude by default
- [x] Manual test: `aaa ralph build --provider claude` explicit selection works
- [x] Manual test: `RALPH_PROVIDER=claude aaa ralph build` env var override works
- [x] Manual test: `aaa review --headless` uses claude by default
- [x] Manual test: `aaa review --headless --provider claude` explicit selection works
- [x] Verify result parsing returns correct cost/duration/sessionId from provider
- [x] Verify interrupt (Ctrl+C) exits cleanly with provider registry
- [x] Run full test suite: `cd tools && bun test`

### Scope

**In:**
- Updating `build.ts` to use provider registry
- Updating `review/index.ts` to use provider registry
- Adding `--provider` CLI flag to both commands
- Updating type definitions (`BuildOptions`)
- Result handling migration to `AgentResult` interface

**Out:**
- Implementing new providers (opencode, codex, etc.) - covered in other tasks
- Provider registry implementation - covered in TASK-037
- Claude provider refactoring - covered in TASK-039
- Config file parsing logic - assume existing config loader
- Changes to calibrate command - covered in TASK-041

### Notes

**Migration Strategy:**
The integration should be transparent to users. Existing workflows continue working without changes. The `--provider` flag is optional and defaults to 'claude' for backward compatibility.

**Result Normalization:**
The `invokeWithProvider()` function returns a normalized `AgentResult` interface:
```typescript
interface AgentResult {
  result: string;
  costUsd: number;
  durationMs: number;
  sessionId: string;
  tokenUsage?: TokenUsage;
}
```
Both `build.ts` and `review/index.ts` need to update their result destructuring from Claude-specific fields to this normalized interface.

**Error Handling:**
- If selected provider binary is not installed, `invokeWithProvider()` throws `ProviderError` with installation instructions
- If provider is not yet implemented (available: false), throws helpful error
- Both commands should catch and display these errors appropriately

**CLI Flag Priority:**
Per the story, provider selection follows priority: CLI flag > env var (`RALPH_PROVIDER`) > config file > auto-detect. The `selectProvider()` function handles this logic.

**Testing Considerations:**
- Mock `selectProvider()` and `invokeWithProvider()` in unit tests
- Test that the correct provider is passed through the call chain
- Verify backward compatibility: no provider specified = claude

**Risks:**
- **Risk:** Result format changes could break downstream processing
  - **Mitigation:** Thorough testing of result parsing with actual Claude output
- **Risk:** Signal handling (Ctrl+C) may behave differently with provider abstraction
  - **Mitigation:** Manual testing of interrupt behavior
- **Risk:** Performance regression from additional abstraction layer
  - **Mitigation:** The abstraction is thin; no expected impact

**Edge Cases:**
- Provider binary not in PATH: Should show helpful install instructions
- Invalid provider name: Should validate and show available providers
- Provider implemented but binary missing: Should distinguish between "not implemented" and "not installed"

### Related Documentation

- @context/stacks/cli/cli-bun.md - Bun CLI patterns and testing
- @context/blocks/construct/commander.md - CLI argument parsing with Commander.js
- @context/blocks/quality/coding-style.md - Code standards and patterns
- @docs/planning/milestones/004-MULTI-CLI/stories/002-claude-refactor.md - Parent story with full context
- @docs/planning/milestones/004-MULTI-CLI/tasks/TASK-037-provider-registry.md - Provider registry implementation
- @tools/src/commands/ralph/build.ts - Build command to update
- @tools/src/commands/review/index.ts - Review command to update
