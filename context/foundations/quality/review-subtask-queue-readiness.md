---
depends:
  - "@context/blocks/quality/subtask-queue-readiness.md"
  - "@context/blocks/quality/planning-consistency.md"
  - "@context/blocks/docs/task-management.md"
tags: [planning, readiness, repair]
---

# Review Subtask Queue Readiness

Method for reviewing and repairing a milestone `subtasks.json` queue before autonomous build.

## Purpose

Use this to turn a milestone queue from "plausible planning artifact" into "safe build input."

## References

- @context/blocks/quality/subtask-queue-readiness.md
- @context/blocks/quality/planning-consistency.md
- @context/blocks/docs/task-management.md

## Review Flow

### 1. Inspect queue shape

- Count subtasks.
- Group by `taskRef`.
- Count subtasks with empty `dependsOn`.
- Identify candidate root subtasks.

### 2. Validate concrete targets

- Check whether `filesToRead` paths exist in the current repo state.
- Flag references to future outputs, wrong packages, or ambiguous bare paths.
- Confirm package ownership for every UI, API, schema, and service change.

### 3. Check task-family sequencing

- Within each `taskRef`, identify the minimal safe order.
- Add `dependsOn` links for that order.
- Keep true roots independent when parallel execution is safe.

### 4. Check cross-task prerequisites

- Add dependencies when later task families require earlier schema, service, auth, or API foundations.
- Do not rely on milestone file order.

### 5. Repair contract drift

- Align endpoint names, model names, and ownership references with the parent task files.
- Remove obviously stale subtasks or rewrite them to match current repo reality.
- Replace manual-only acceptance criteria with command-verifiable checks.

### 6. Log the decision

- Record readiness verdict.
- Record blockers.
- Record the queue edits that changed readiness status.
- Record next actions if the queue is still not green.

## Repair Priorities

Fix in this order:

1. Missing `dependsOn`
2. Broken or ambiguous file references
3. Duplicate ownership
4. Parent-task contract drift
5. Oversized subtasks

## Output Standard

A readiness review should state:

- Overall assessment
- Ready for build: Yes or No
- Subtasks ready count
- Blocking issues
- Queue edits required or applied

## When Not To Build

Do not start autonomous build when:

- all subtasks are roots by accident
- `filesToRead` points mostly at files that do not exist
- API or UI ownership is unclear
- one task family duplicates another
- endpoint or schema contracts disagree across artifacts

Repair the queue first, then rerun readiness review.
