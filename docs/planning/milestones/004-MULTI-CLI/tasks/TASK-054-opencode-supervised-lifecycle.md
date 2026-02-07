---
depends:
  - @docs/planning/milestones/004-MULTI-CLI/stories/005-opencode-parity-multiprovider-runtime.md
  - @docs/planning/milestones/004-MULTI-CLI/tasks/TASK-053-provider-capability-gating.md
  - @docs/planning/milestones/004-MULTI-CLI/providers/opencode.md
  - @context/blocks/docs/task-template.md
---

## Task: OpenCode supervised interactive lifecycle

**Story:** [005-opencode-parity-multiprovider-runtime](../stories/005-opencode-parity-multiprovider-runtime.md)

### Goal
OpenCode supervised mode provides true interactive supervision with reliable PTY lifecycle handling and session capture.

### Context
OpenCode currently reuses a non-interactive invocation path for supervised mode in Ralph, so the user-facing meaning of "supervised" is inconsistent versus Claude. We need a real interactive runtime path with explicit PTY requirements and robust start/stop behavior.

### Plan
1. Split OpenCode mode handling in `tools/src/commands/ralph/providers/opencode.ts` into dedicated headless and supervised execution branches.
2. Implement supervised branch as an interactive flow that requires PTY (and fails fast when no TTY is available) while preserving existing headless `run --format json` behavior.
3. Add lifecycle controls for startup, interrupt, and shutdown (including child process cleanup and deterministic termination paths).
4. Capture and return OpenCode session identifiers from supervised runs for downstream post-iteration hooks.
5. Update supervised invocation wiring in `tools/src/commands/ralph/build.ts` so OpenCode supervised mode displays truthful messaging and metrics.
6. Add integration coverage in `tools/tests/providers/opencode.integration.test.ts` for PTY-gated behavior, interrupt handling, and session ID capture.

### Acceptance Criteria
- [x] OpenCode supervised mode is interactive when PTY is available.
- [x] Non-TTY supervised runs fail with clear remediation guidance.
- [x] Supervised OpenCode runs return/persist session ID for hook integration.
- [x] Interrupt and shutdown paths do not leave orphaned provider processes.
- [x] Integration tests cover success and interruption lifecycle branches.

### Test Plan
- [x] `cd tools && bun test tests/providers/opencode.integration.test.ts`
- [x] Add supervised lifecycle tests for PTY and non-PTY execution branches.
- [x] Manual: run `aaa ralph build --provider opencode --mode supervised` and verify live intervention behavior.

### Scope
- **In:** OpenCode supervised runtime implementation and lifecycle reliability.
- **Out:** Provider-agnostic session abstraction internals.

### Notes
Keep headless OpenCode behavior unchanged for automation reliability while introducing the supervised-specific runtime path.

### Related Documentation
- @context/stacks/cli/cli-bun.md
- @context/blocks/construct/bun.md
- @context/blocks/construct/ralph-patterns.md
- **Gap:** PTY lifecycle patterns for provider CLIs - **[REVIEW]**
