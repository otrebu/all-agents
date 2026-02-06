---
depends:
  - @docs/planning/milestones/004-MULTI-CLI/stories/005-opencode-parity-multiprovider-runtime.md
  - @docs/planning/milestones/004-MULTI-CLI/tasks/TASK-054-opencode-supervised-lifecycle.md
  - @context/blocks/docs/task-template.md
  - @context/blocks/construct/ralph-patterns.md
---

## Task: Provider-agnostic session abstraction

**Story:** [005-opencode-parity-multiprovider-runtime](../stories/005-opencode-parity-multiprovider-runtime.md)

### Goal
Ralph session discovery and metrics extraction work through provider adapters rather than Claude-specific filesystem assumptions.

### Context
Current session utilities in `tools/src/commands/ralph/session.ts` and post-iteration logic are tightly coupled to `.claude` storage conventions. This blocks reliable multiprovider telemetry and forces non-Claude providers into Claude-shaped flows.

### Plan
1. Introduce a provider session adapter contract under `tools/src/commands/ralph/providers/` with methods for recent-session discovery, session resolution/export, token/tool extraction, and file-change extraction.
2. Move Claude-specific path heuristics from `tools/src/commands/ralph/session.ts` into a Claude adapter implementation.
3. Add an OpenCode adapter that resolves sessions via OpenCode CLI session/export commands and normalizes artifacts into Ralph session metrics.
4. Refactor `tools/src/commands/ralph/build.ts` supervised session discovery (`discoverRecentSession`) to call provider session adapters.
5. Refactor `tools/src/commands/ralph/post-iteration.ts` metric extraction to use the provider session adapter instead of direct `.claude` path logic.
6. Add adapter tests (unit + integration) for both Claude and OpenCode session extraction flows.

### Acceptance Criteria
- [x] Session discovery in build path is provider-aware and no longer hardcoded to `.claude`.
- [x] Post-iteration metrics (tool calls, tokens, files, duration) are extracted via provider adapters.
- [x] Claude and OpenCode session flows both produce valid diary entries.
- [x] Session lookup failures degrade gracefully without crashing iteration flow.

### Test Plan
- [x] `cd tools && bun test tests/providers/registry.test.ts tests/providers/opencode.integration.test.ts`
- [x] Add provider session adapter unit tests for Claude and OpenCode fixture data.
- [ ] Manual: run one Claude and one OpenCode iteration and compare diary/session metrics output.

### Scope
- **In:** Session adapter interfaces, Claude/OpenCode implementations, build/post-iteration integration.
- **Out:** Session adapters for Codex, Gemini, Cursor, and Pi.

### Notes
This is the core decoupling task that removes the largest remaining runtime dependency on Claude-only session conventions.

### Related Documentation
- @context/stacks/cli/cli-bun.md
- @context/blocks/construct/ralph-patterns.md
- @context/foundations/test/test-e2e-cli-bun.md
- **Gap:** provider-session-adapter reference doc - **[REVIEW]**
