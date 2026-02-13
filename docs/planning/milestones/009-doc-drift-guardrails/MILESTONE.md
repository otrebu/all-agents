# Milestone 009: Workflow Contract Hardening

## Objective

Unify and harden workflow contracts so docs/prompts, execution planning, and dry-run rendering cannot silently drift apart.

## Outcome

Ralph workflow behavior is governed by one contract layer with CI guardrails for both docs and pipeline semantics.

## Scope

- Validate `aaa ralph` examples against live command metadata.
- Enforce required flags and mutually exclusive source constraints in examples.
- Introduce a shared `pipeline-spec` source for levels, steps, labels, and flag effects.
- Define a typed state contract for pipeline runtime (FSM, XState-compatible) and make engine choice explicit in milestone tasks.
- Refactor plan computation and dry-run rendering to consume shared spec definitions.
- Replace brittle enrichment heuristics with explicit metadata tags.
- Integrate drift and parity checks into CI.

## Deliverables

- Command-table-backed drift checker for docs/prompts/skills.
- Shared `pipeline-spec` module with exhaustive command coverage.
- State contract decision record (typed FSM contract + chosen implementation engine).
- Refactored preview/execution mapping call sites.
- Audit report + safe auto-fix workflow for stale/invalid command examples.
- CI job and local command suite for drift and parity checks.

## Success Criteria

- PRs fail when examples reference invalid commands/flags.
- Prompt and skill docs remain aligned with `aaa completion table --format json`.
- Pipeline command additions fail fast when spec mappings are incomplete.
- Dry-run narrative and execution paths stay synchronized over time.
- Parity/contract test matrix is owned and enforced in this milestone.

## Dependencies

- Completion of active carry-over milestone `005-consolidate-simplify`.
