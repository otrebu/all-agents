---
depends:
  - @docs/planning/milestones/004-MULTI-CLI/stories/005-opencode-parity-multiprovider-runtime.md
  - @docs/planning/milestones/004-MULTI-CLI/FEEDBACK.md
  - @context/blocks/docs/task-template.md
  - @context/blocks/construct/ralph-patterns.md
---

## Task: Provider capability gating and truthful mode semantics

**Story:** [005-opencode-parity-multiprovider-runtime](../stories/005-opencode-parity-multiprovider-runtime.md)

### Goal
Provider invocation enforces declared capabilities before execution so mode behavior is truthful and consistent across providers.

### Context
`providers/registry.ts` declares `supportedModes` per provider but does not currently enforce those capabilities before invocation. Users can request combinations that appear supported in UI messaging but do not have real runtime parity, which creates hidden behavior drift.

### Plan
1. Extend provider capability contracts in `tools/src/commands/ralph/providers/types.ts` to include explicit runtime booleans (`supportsInteractiveSupervised`, `supportsHeadless`, `supportsSessionExport`, `supportsModelDiscovery`) alongside `supportedModes`.
2. Add a centralized preflight check function in `tools/src/commands/ralph/providers/registry.ts` that validates provider availability and requested mode before invocation.
3. Update invocation entry points in `tools/src/commands/ralph/build.ts` and `tools/src/commands/review/index.ts` to call the preflight check and return clear provider-neutral errors.
4. Replace Claude-specific generic failure text in provider-agnostic paths (for example retry messages in `tools/src/commands/ralph/build.ts`) with provider-neutral wording.
5. Add tests in `tools/tests/providers/registry.test.ts` and `tools/tests/e2e/provider-flag.test.ts` that verify unsupported mode/provider combinations fail fast with actionable messages.

### Acceptance Criteria
- [x] Capability metadata is enforced at runtime before process spawn.
- [x] Unsupported mode/provider combinations fail with explicit guidance.
- [x] Provider-agnostic paths do not use Claude-branded generic error text.
- [x] Tests cover both valid and invalid provider capability combinations.

### Test Plan
- [x] `cd tools && bun test tests/providers/registry.test.ts`
- [x] `cd tools && bun test tests/e2e/provider-flag.test.ts`
- [x] Manual: run unsupported combinations and verify fast-fail behavior and wording.

### Scope
- **In:** Capability type contract, preflight enforcement, messaging cleanup, regression tests.
- **Out:** OpenCode supervised lifecycle implementation.

### Notes
This task is intentionally provider-neutral and should land before OpenCode parity changes to avoid introducing new provider-specific branching.

### Related Documentation
- @context/stacks/cli/cli-bun.md
- @context/blocks/construct/ralph-patterns.md
- @context/blocks/quality/error-handling.md
- @context/foundations/test/test-e2e-cli-bun.md
