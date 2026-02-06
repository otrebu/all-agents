---
depends:
  - @docs/planning/milestones/004-MULTI-CLI/MILESTONE.md
  - @docs/planning/milestones/004-MULTI-CLI/FEEDBACK.md
  - @docs/planning/milestones/004-MULTI-CLI/stories/001-provider-foundation.md
  - @docs/planning/milestones/004-MULTI-CLI/stories/003-opencode-support.md
  - @context/foundations/quality/gate-standards.md
---

## Story: OpenCode Parity for Multiprovider Runtime

### Narrative
As a Ralph operator using multiple AI CLIs, I want OpenCode to reach true runtime parity with Claude so that multiprovider mode is reliable, transparent, and safe to scale to additional providers.

### Persona
**The Multiprovider Operator** - A developer running Ralph across different provider CLIs who cares about:
- Consistent mode semantics across providers
- Accurate session and telemetry data for every iteration
- Predictable retry and failure behavior
- Confidence that "supervised" means real interactive supervision

### Context
Milestone 004 delivered provider abstraction for core invocation, but runtime behavior is still uneven. OpenCode is the best next parity target because it is already integrated, available locally, and exposes the major contract gaps that block true multiprovider support:

- Capability metadata exists but is not strictly enforced at runtime
- Supervised behavior differs by provider and is not always truly interactive
- Session discovery and post-iteration telemetry remain Claude-shaped
- Exit code behavior varies by provider, so generic retry logic is fragile
- Post-iteration summary/timing naming still assumes Claude as the runtime baseline

This story closes those gaps with provider-neutral contracts implemented first, then OpenCode parity on top of those contracts.

### Acceptance Criteria
- [ ] Provider capability checks are enforced before invocation with clear mode/provider errors
- [ ] OpenCode supervised mode is truly interactive and PTY-gated
- [ ] Session discovery/metrics use provider adapters instead of direct `.claude` assumptions
- [ ] Build retry behavior uses normalized provider outcomes (`success`, `retryable`, `fatal`)
- [ ] Post-iteration summary and timing fields are provider-neutral
- [ ] Claude and OpenCode both pass parity tests for headless and supervised runtime paths

### Tasks
- [TASK-053-provider-capability-gating](../tasks/TASK-053-provider-capability-gating.md) - Enforce runtime capability gating and truthful mode messaging
- [TASK-054-opencode-supervised-lifecycle](../tasks/TASK-054-opencode-supervised-lifecycle.md) - Implement true OpenCode supervised lifecycle with PTY constraints
- [TASK-055-provider-session-abstraction](../tasks/TASK-055-provider-session-abstraction.md) - Add provider-agnostic session adapters and integrate build/post-iteration
- [TASK-056-provider-outcome-classification](../tasks/TASK-056-provider-outcome-classification.md) - Normalize provider outcomes for retry/fatal decisions
- [TASK-057-provider-neutral-post-iteration](../tasks/TASK-057-provider-neutral-post-iteration.md) - Remove Claude-specific assumptions from post-iteration summaries and telemetry

### Notes
Recommended execution order:
1. TASK-053 (contracts + gating)
2. TASK-054 (OpenCode supervised runtime)
3. TASK-055 (session abstraction)
4. TASK-056 (outcome classification)
5. TASK-057 (provider-neutral post-iteration)

Validation target for this story is parity between `claude` and `opencode` first, then reuse the contracts for `codex` and `gemini` onboarding.
