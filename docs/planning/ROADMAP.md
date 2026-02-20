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

### 008. [008-prelude-aaa-ralph-load-screen](milestones/008-prelude-aaa-ralph-load-screen/): Cute ASCII Logos & Mascots

**Status:** 🔲 Not started

**Outcome:** Define and select a tiny, terminal-safe startup logo/mascot intro for first-run command execution.

**Key deliverables:**

- Two alternate logo-and-mascot variants (AAA-led and Ralph-led), both readable in plain-terminal environments.
- Shared rendering constraints (size, fallback behavior, optional color strategy).
- Explicit default choice and rationale documented in milestone artifact.

**Success criteria:**

- Both variants are documented with concise concept notes.
- The selected variant has no blocking terminal-compatibility risks (size, wrapping, non-ASCII dependency).
- Scope stays limited to intro-screen exploration and selection.

**Dependencies:** none

---

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

### 011. 011-atomic-docs-coverage: Context Library Gap Fill

**Status:** 🔲 Not started

**Outcome:** Fill gaps in the atomic documentation library (`context/`) identified during BillingManager milestone analysis. Generic concept blocks and tool-specific foundations covering data modeling, API design, reporting, and import patterns.

**Key deliverables:**

New blocks (generic, tool-agnostic):

- `blocks/construct/hierarchical-data.md` — Tree patterns in relational DBs (adjacency list, materialized path, recursive CTEs, depth constraints)
- `blocks/construct/sql-aggregation.md` — GROUP BY, CTEs, ROLLUP, dynamic WHERE composition
- `blocks/construct/drilldown-api.md` — Hierarchical drill-down API contract (hasChildren, breadcrumbs, groupBy dispatch)
- `blocks/construct/report-table-ui.md` — Server-driven table wiring (sort/filter/page state drives API)
- `blocks/construct/entity-ownership.md` — Multi-dimensional ownership, CASCADE vs SET NULL, tenant scoping, FK vs join table
- `blocks/construct/rest-resources.md` — REST URL conventions (plural nouns, nesting, path vs query params)
- `blocks/construct/api-responses.md` — Response envelopes, error shapes, HTTP status codes
- `blocks/construct/pagination.md` — Cursor vs offset patterns, metadata shapes, limits
- `blocks/construct/papaparse.md` — PapaParse library reference (CSV parsing)
- `blocks/construct/preview-apply.md` — Dry-run + commit pattern (generic, reusable beyond imports)
- `blocks/security/authorization.md` — Authz concepts (authn vs authz, RBAC/ABAC/ReBAC overview, decision matrix)
- `blocks/security/rbac.md` — RBAC concepts and DB schema patterns (roles, permissions, assignments)
- `blocks/security/zanzibar.md` — Google Zanzibar model (relationship tuples, namespaces, check/expand operations)
- `blocks/security/openfga.md` — OpenFGA tool reference (setup, model DSL, TypeScript SDK, CLI)
- `blocks/security/better-auth-oauth.md` — BetterAuth OAuth/OIDC plugin (provider + consumer, dedicated DB)

New foundations (tool-specific compositions):

- `foundations/construct/data-hierarchy-prisma.md` — Hierarchical data + Prisma + PostgreSQL
- `foundations/construct/aggregate-prisma.md` — SQL aggregation via Prisma groupBy() and $queryRaw
- `foundations/construct/drilldown-orpc.md` — Drilldown endpoint with oRPC + Prisma
- `foundations/construct/report-table-tanstack.md` — TanStack Table + Query + Router wiring
- `foundations/construct/parse-csv-zod.md` — CSV parse + validate pipeline (mirrors parse-xml-zod.md)
- `foundations/construct/import-pipeline.md` — Format-agnostic import orchestration (diff → preview → apply)
- `foundations/security/auth-oauth-server-better-auth.md` — BetterAuth as OAuth server with own DB, social provider consumption
- `foundations/security/auth-authz-openfga.md` — Fine-grained authz with OpenFGA, combining with BetterAuth for authn

Edits to existing docs:

- `blocks/quality/coding-style.md` — Add "Enum & Union Type Conventions" section
- `blocks/quality/error-handling.md` — Add error accumulation pattern
- `foundations/construct/data-persist-prisma.md` — Cross-reference entity-ownership block

**Success criteria:**

- All 15 new blocks are reviewed and merged.
- All 8 new foundations compose their dependent blocks correctly.
- Existing docs updated without breaking current references.
- Each doc follows atomic documentation naming and structure conventions.

**Progress checklist:**

New blocks:
- [x] `blocks/construct/hierarchical-data.md`
- [x] `blocks/construct/sql-aggregation.md` — SKIPPED (too broad; valuable parts absorbed into `aggregate-prisma.md` and `drilldown-api.md`)
- [x] `blocks/construct/drilldown-api.md` — SKIPPED (project-specific design, not generic pattern; content absorbed into `drilldown-orpc.md` foundation + BillingManager project docs)
- [x] `blocks/construct/data-table-ui.md` (renamed from `report-table-ui.md`)
- [x] `blocks/construct/entity-ownership.md`
- [x] `blocks/construct/rest-resources.md`
- [x] `blocks/construct/rest-rpc-responses.md` (renamed from `api-responses.md`)
- [x] `blocks/construct/pagination.md`
- [x] `blocks/construct/papaparse.md`
- [x] `blocks/construct/preview-apply.md`
- [x] `blocks/security/authorization.md`
- [x] `blocks/security/rbac.md`
- [x] `blocks/security/zanzibar.md`
- [x] `blocks/security/openfga.md`
- [x] `blocks/security/better-auth-oauth.md`

New foundations:
- [x] `foundations/construct/data-hierarchy-prisma.md`
- [x] `foundations/construct/aggregate-prisma.md` — SKIPPED (no meaningful glue; Prisma groupBy() is well-documented, advanced SQL is just $queryRaw)
- [x] `foundations/construct/drilldown-orpc.md` — SKIPPED (project-specific to BillingManager; belongs in project docs)
- [x] `foundations/construct/data-table-tanstack.md` (renamed from `report-table-tanstack.md`)
- [x] `foundations/construct/parse-csv-zod.md`
- [x] `foundations/construct/import-pipeline.md` — SKIPPED (orchestration is project-specific; individual pieces already documented)
- [x] `foundations/security/auth-oauth-server-better-auth.md` — SKIPPED (superseded by existing `auth-oidc-system-better-auth.md` which needs generalizing instead)
- [x] `foundations/security/auth-authz-openfga.md`

Edits to existing docs:
- [x] `blocks/quality/coding-style.md` — Add "Enum & Union Type Conventions" section
- [x] `blocks/quality/error-handling.md` — Add error accumulation pattern
- [x] `foundations/construct/data-persist-prisma.md` — Cross-reference entity-ownership block

**Dependencies:** none (can run in parallel with other milestones)

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
