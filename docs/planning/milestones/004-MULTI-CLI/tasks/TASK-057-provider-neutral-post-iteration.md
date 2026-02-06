---
depends:
  - @docs/planning/milestones/004-MULTI-CLI/stories/005-opencode-parity-multiprovider-runtime.md
  - @docs/planning/milestones/004-MULTI-CLI/tasks/TASK-055-provider-session-abstraction.md
  - @docs/planning/milestones/004-MULTI-CLI/tasks/TASK-056-provider-outcome-classification.md
  - @context/blocks/docs/task-template.md
---

## Task: Provider-neutral post-iteration summary and telemetry

**Story:** [005-opencode-parity-multiprovider-runtime](../stories/005-opencode-parity-multiprovider-runtime.md)

### Goal
Post-iteration summary, timing, and diary telemetry are provider-neutral and work consistently for Claude and OpenCode.

### Context
`tools/src/commands/ralph/post-iteration.ts` still assumes Claude-specific summary invocation and naming (`invokeClaudeHaiku`, `claudeMs`, Claude-oriented labels). This breaks semantic parity when running non-Claude providers and leaks Claude coupling into telemetry.

### Plan
1. Refactor summary generation in `tools/src/commands/ralph/post-iteration.ts` to call a provider-neutral summary interface (with provider-specific lightweight model configuration).
2. Rename provider-specific timing fields in `tools/src/commands/ralph/types.ts` and consumers from Claude-specific naming to neutral naming (for example `providerMs`), keeping backward compatibility for existing logs.
3. Update build flow wiring in `tools/src/commands/ralph/build.ts` to pass provider-neutral timing/session metadata into post-iteration hooks.
4. Update user-facing labels in `tools/src/commands/ralph/display.ts` and related output helpers to avoid Claude-only wording in provider-agnostic code paths.
5. Add tests for diary entry generation and summary fallback behavior across Claude and OpenCode paths.
6. Ensure existing diary readers and status commands can parse both old and new telemetry field names.

### Acceptance Criteria
- [ ] Post-iteration summary invocation path is provider-neutral.
- [ ] Telemetry/timing naming is provider-neutral in output and diary entries.
- [ ] Existing historical logs remain readable after the field migration.
- [ ] Claude and OpenCode both generate valid post-iteration summaries and metrics.

### Test Plan
- [ ] `cd tools && bun test tests/providers/registry.test.ts`
- [ ] Add post-iteration tests covering old and new timing field compatibility.
- [ ] Manual: run one Claude headless iteration and one OpenCode headless iteration; verify parity in diary entries.

### Scope
- **In:** Post-iteration summary abstraction, telemetry naming migration, display text cleanup, compatibility tests.
- **Out:** Rewriting historical diary files on disk.

### Notes
Prioritize compatibility at read time so migration does not break existing milestone logs or status command output.

### Related Documentation
- @context/blocks/construct/ralph-patterns.md
- @context/stacks/cli/cli-bun.md
- @context/foundations/observe/log-structured-cli.md
- **Gap:** provider-neutral summary hook conventions - **[REVIEW]**
