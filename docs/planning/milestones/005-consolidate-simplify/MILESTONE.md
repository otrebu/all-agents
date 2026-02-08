# Milestone: 005 Consolidate Simplify

## Outcome

Consolidate Ralph queue selection, subtask assignment, and planning/build prompts so CLI runtime is the single source of truth across headless and supervised flows.

## Source Plan

- `docs/planning/consolidating.md`

## Scope

- queue operations become milestone-scoped and CLI-owned
- naming/numbering/placement normalized to milestone-local rules
- stale prompt/skill drift removed
- legacy create skills deleted

## Deliverables

- milestone-scoped `stories/`, `tasks/`, and `subtasks.json`
- CLI and prompt contract alignment
- regression coverage for assignment parity and numbering rules
