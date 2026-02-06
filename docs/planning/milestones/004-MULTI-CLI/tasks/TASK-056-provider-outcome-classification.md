---
depends:
  - @docs/planning/milestones/004-MULTI-CLI/stories/005-opencode-parity-multiprovider-runtime.md
  - @docs/planning/milestones/004-MULTI-CLI/tasks/TASK-053-provider-capability-gating.md
  - @context/blocks/docs/task-template.md
  - @context/blocks/quality/error-handling.md
---

## Task: Provider outcome classification for retry semantics

**Story:** [005-opencode-parity-multiprovider-runtime](../stories/005-opencode-parity-multiprovider-runtime.md)

### Goal
Build and review loops make retry/fatal decisions from normalized provider outcomes rather than raw process exit behavior.

### Context
Provider CLIs do not share a single failure contract. Some errors are retryable, some are fatal, and exit code alone is not consistently authoritative across providers. Ralph needs a normalized outcome model to avoid false retries and silent failures.

### Plan
1. Add normalized outcome types in `tools/src/commands/ralph/providers/types.ts` (for example `success`, `retryable`, `fatal` with machine-readable reason categories).
2. Update provider wrappers in `tools/src/commands/ralph/providers/claude.ts` and `tools/src/commands/ralph/providers/opencode.ts` to map raw failures into normalized outcomes.
3. Update provider orchestration in `tools/src/commands/ralph/providers/registry.ts` so callers receive normalized outcome metadata.
4. Refactor iteration control in `tools/src/commands/ralph/build.ts` to retry only retryable outcomes and fail fast on fatal outcomes.
5. Update `tools/src/commands/review/index.ts` to report normalized outcome details in a provider-neutral format.
6. Add fixture-driven tests for timeout, auth, model validation, malformed output, and transport failures.

### Acceptance Criteria
- [x] Retry logic in build loop uses normalized outcome classification.
- [x] Auth/model/configuration errors are classified fatal and are not retried.
- [x] Timeout/transient/provider-transport failures are classified retryable.
- [x] Review and build commands display provider-neutral failure reasons.

### Test Plan
- [x] `cd tools && bun test tests/providers/opencode.test.ts tests/providers/claude.integration.test.ts`
- [x] Add outcome classification unit tests for fatal and retryable branches.
- [ ] Manual: simulate invalid model, invalid auth, and timeout to verify behavior.

### Scope
- **In:** Outcome model, provider mapping, retry control updates, regression tests.
- **Out:** New provider implementations beyond Claude/OpenCode.

### Notes
This task should not change provider command syntax; it standardizes decisioning and error interpretation around existing invocations.

### Related Documentation
- @context/blocks/quality/error-handling.md
- @context/stacks/cli/cli-bun.md
- @context/foundations/test/test-e2e-cli-bun.md
- **Gap:** provider error taxonomy and retry guidance - **[REVIEW]**
