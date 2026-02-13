# Product Roadmap

> Synced with current runtime reality on 2026-02-13.
>
> This roadmap now separates delivered baseline from forward deltas.

## Overview

Ralph has moved from foundational build/planning experiments into an operational autonomous workflow platform.

Roadmap policy from this point forward:

- Keep completed baseline concise in this file.
- Keep implementation depth in each milestone `MILESTONE.md`.
- Treat this roadmap as the delta plan for what changes next.

## Delivered Baseline

Current subtask completion snapshot:

| Milestone | Status | Evidence |
|-----------|--------|----------|
| `001-ralph` | ✅ Historical foundation | Pre-consolidation milestone artifacts (no canonical subtask count) |
| `002-ralph-💪` | ✅ Complete | `70/70` subtasks done |
| `003-ralph-workflow` | ✅ Complete | `95/95` subtasks done |
| `004-MULTI-CLI` | ✅ Complete | `20/20` subtasks done |
| `005-consolidate-simplify` | 🟨 In progress | `21/22` subtasks done |
| `006-cascade-mode-for-good` | ✅ Complete | `47/47` subtasks done |
| `007-pipeline-preview` | ✅ Complete on branch | `33/33` subtasks done |

Baseline capabilities now in place:

- Planning pipeline from `vision/roadmap` into milestone-scoped `stories -> tasks -> subtasks` artifacts.
- Autonomous build loop with validation, queue operations, and hooks.
- Calibration loop (`intention`, `technical`, `improve`, `all`) with corrective queue proposals.
- Multi-provider abstraction with active `claude` and `opencode` runtime support.
- Session traceability (`cc-session-id`, `aaa session`) and review workflows.
- Pipeline dry-run preview and live workflow phase rendering.

---

## Line In The Sand

Everything above is considered baseline (plus one explicit carry-over subtask in milestone 005).

Everything below is forward work and should be planned as net-new deltas, not re-litigation of shipped behavior.

---

## Active Carry-Over

### 005. [005-consolidate-simplify](milestones/005-consolidate-simplify/): Final Closure

**Status:** 🟨 In progress (`21/22`)

**Outcome:** Close remaining consolidation debt so all core planning/build contracts are fully normalized.

**Success criteria:**

- Milestone reaches `22/22` complete.
- No regressions in queue operations or review workflows.

**Dependencies:** none

---

## Forward Milestones

### 009. [009-doc-drift-guardrails](milestones/009-doc-drift-guardrails/): Workflow Contract Hardening

**Status:** 🔲 Not started

**Outcome:** Docs/prompts and pipeline preview/execution mappings stay synchronized as one contract.

**Key deliverables:**

- Command-table-backed drift checks for `aaa ralph` examples in prompts and skills.
- Shared `pipeline-spec` module for levels, steps, labels, and flag effects.
- State-model decision gate: define typed FSM contract (XState-compatible) and choose implementation engine in milestone tasks.
- Refactor plan computation + dry-run rendering to consume shared spec.
- Replacement of brittle enrichment heuristics with explicit metadata tags.
- CI parity tests for command/flag/spec coverage and drift.

**Success criteria:**

- Drift checks run in CI and block merges on contract mismatch.
- Prompt/skill examples stay in lockstep with current Commander metadata.
- Adding/changing pipeline commands fails fast when spec mappings are incomplete.
- Dry-run narrative and execution paths remain synchronized over time.

**Dependencies:** 005 completion

---

### 010. [010-pipeline-spec-convergence](milestones/010-pipeline-spec-convergence/): Operator Confidence Hardening

**Status:** 🔲 Not started

**Outcome:** Workflow visualization becomes reliable and high-signal for operators across all runtime contexts.

**Key deliverables:**

- Renderer hardening for phase/gate/timed-wait states across terminal contexts.
- Explicit boundary: consume the state contract from 009 and do not redesign orchestration engine in this milestone.
- Stable output contract for machine-readable and human-readable views.
- Visualization regression fixtures/snapshots for critical pipeline flows.
- Operator runbook for interpreting gate states and resume paths.

**Success criteria:**

- Pipeline state is unambiguous during long cascades and CI runs.
- Visual output regressions are detected automatically in tests.
- Resume/review actions are consistently discoverable from rendered output.
- Test ownership is clear: parity/contract tests in 009, renderer snapshots + runbook checks in 010.

**Dependencies:** 009

---

## Deferred / Watchlist

- Enabling runtime support for declared-but-disabled providers (`codex`, `cursor`, `gemini`, `pi`).
- Full executable cascade support for `roadmap` and `stories` runtime adapters.
- Dynamic model discovery beyond `opencode`.
- Full runtime wiring for schema-declared approval gates not currently active.

## Notes

- This roadmap is now delta-first: active and future milestones only.
- Historical detail remains in milestone folders and git history.
- Milestone headings link to `docs/planning/milestones/<slug>/`.
- Draft split milestone `011-workflow-visualization-hardening` is consolidated into milestone 010.
