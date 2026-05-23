---
depends:
  - "@context/blocks/quality/planning-consistency.md"
  - "@context/blocks/docs/naming-convention.md"
tags: [planning, readiness, subtasks]
---

# Subtask Queue Readiness

Minimum contract for a `subtasks.json` queue to be safe for autonomous build execution.

## Purpose

Use this when deciding whether a milestone queue is ready for `aaa ralph build` or needs repair first.

## Readiness Rules

- Every subtask beyond a true root must declare `dependsOn`.
- `dependsOn` must encode execution order in data, not just in file order or prose.
- A subtask must not reference outputs from an earlier subtask unless that earlier subtask is in `dependsOn`.
- `taskRef` and `storyRef` must match the canonical planning naming convention.
- `filesToRead` should point to stable existing inputs, not speculative future outputs.
- If a subtask is meant to create a new file, that file can appear in the description or acceptance criteria, but it should not be the only thing in `filesToRead`.
- Subtasks in the same task should usually form a small linear chain unless there is a clear parallel branch.
- Cross-task dependencies should be explicit when later task families require earlier schema, service, or API foundations.
- Acceptance criteria must be executable and testable without screenshots or manual interpretation.
- Package ownership must be concrete. Avoid ambiguous targets like bare `src/...` when multiple apps or packages exist.

## Root Subtasks

A root subtask is allowed to have no `dependsOn` only when all of these are true:

- It does not require outputs from another queued subtask.
- Its target package and file ownership are already clear.
- Its acceptance criteria can be verified using existing project structure.
- Starting it in parallel would not create ownership conflicts with another root.

If any of those are false, it is not a root subtask.

## Common Failure Patterns

### Missing dependency graph

All `dependsOn` values are empty, so the build loop can pick invalid orderings.

### Future-output reads

`filesToRead` includes files that do not exist yet because the queue expects an earlier subtask to create them.

### Package ownership drift

The queue mixes targets across `packages/api`, `packages/web`, `packages/admin`, `packages/feeds`, or bare `src/...` paths without naming the owning surface clearly.

### Contract drift

Acceptance criteria, descriptions, and referenced task files disagree on endpoint shape, model names, or auth behavior.

### Duplicate ownership

Two subtasks or task families both claim the same schema field, service, or UI component.

## Review Checklist

- [ ] Does every non-root subtask have `dependsOn`?
- [ ] Do all declared dependencies correspond to real prerequisite outputs?
- [ ] Are `filesToRead` paths valid today?
- [ ] Are ambiguous package paths removed or clarified?
- [ ] Do sibling subtasks in one task form a coherent sequence?
- [ ] Are cross-task prerequisites encoded where needed?
- [ ] Are acceptance criteria automation-friendly?
- [ ] Are duplicate ownership and contract drift resolved?

## Build Gate

A queue is build-ready only if:

- execution order is machine-readable
- file targets are concrete
- acceptance criteria are verifiable
- no major contract drift remains
- no major ownership conflicts remain

If any of those fail, repair the queue before starting autonomous build.
