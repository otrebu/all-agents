# Milestone 006: Cascade Mode For Good

## Objective

Make Ralph validation and calibration deterministic, milestone-scoped, and easy to predict:

1. `--validate-first` can directly improve the pending queue before build starts.
2. calibration creates corrective follow-up work in the same milestone queue.
3. queue order is the only execution ordering rule (remove `blockedBy`).
4. logs for planning, build, validation, calibration, and queue mutations share one daily milestone log format.

## Locked Decisions

1. Milestone-first pathing: all write operations resolve from `subtasksPath` to `docs/planning/milestones/<slug>/...`.
2. Validation-first can: create, update, remove, reorder, and split pending subtasks.
3. Calibration should primarily add corrective subtasks, default insertion is prepend.
4. `--force` auto-applies queue changes; `--review` stages proposal artifacts and applies only after approval.
5. Remove `blockedBy` from schema, runtime, prompts, docs, tests, and milestone data.
6. Dedupe by canonical `subtask.id`; allocate new `SUB-###` IDs at apply-time.
7. Persist calibration/validation/queue mutation events in milestone daily log JSONL.

## User-Facing Behavior Contract

### Build + Validate

Command:

```bash
aaa ralph build --validate-first [--force|--review] [--provider ...] [--model ...]
```

Behavior:

1. Load pending subtasks in queue order.
2. Analyze alignment against milestone task/story chain.
3. Produce deterministic queue operations.
4. Apply operations:
   - `--force`: apply immediately.
   - `--review`: stage proposal and wait for approval.
5. Continue build with updated queue.

### Calibrate

Commands:

```bash
aaa ralph calibrate all [--force|--review] [--provider ...] [--model ...]
aaa ralph build --calibrate-every N
aaa ralph build --cascade calibrate
```

Behavior:

1. Analyze completed subtasks for intention drift, technical drift, and self-improvement.
2. Produce deterministic corrective queue operations (mostly inserts).
3. Apply using same approval rules as validation.
4. Ensure new corrective subtasks enter milestone queue (prepend by default).

## Architecture Plan

### WS-01 Queue Operation Engine (Deterministic Core)

Deliverables:

1. Define operation model:
   - `create`
   - `update`
   - `remove`
   - `reorder`
   - `split`
2. Implement validation and apply pipeline with deterministic results.
3. Add queue fingerprinting for replay protection.
4. Reuse canonical file write path for normalization.

Target files:

- `tools/src/commands/ralph/config.ts`
- `tools/src/commands/ralph/types.ts`

Acceptance criteria:

1. Applying the same proposal twice is no-op on second run.
2. Invalid operations fail with actionable errors.
3. Completed subtasks (`done: true`) cannot be mutated by validation paths.
4. New IDs are allocated as next canonical `SUB-###` within the milestone queue.

### WS-02 CLI Expansion for Deterministic Queue Mutations

Deliverables:

1. Extend `aaa ralph subtasks` with deterministic mutation commands:
   - `append`
   - `prepend`
   - `diff`
   - `apply`
   - optional direct wrappers: `update`, `remove`, `reorder`
2. Add `--dry-run` and JSON output contracts for automation.
3. Add completion support for new subcommands/options.

Target files:

- `tools/src/commands/ralph/index.ts`
- `tools/src/commands/completion/index.ts`
- `tools/src/commands/completion/zsh.ts`
- `tools/src/commands/completion/fish.ts`
- `tools/README.md`

Acceptance criteria:

1. All queue mutations can be executed without manual JSON editing.
2. `diff` provides readable and JSON-parseable output.
3. Completion scripts expose new commands/options.

### WS-03 Validation-First Refactor (Pre-Flight Queue Editing)

Deliverables:

1. Remove hardcoded provider/model in validation invocation.
2. Forward `provider` and `model` from build to validation.
3. Replace skip-only behavior with queue operation proposals.
4. Support create/update/remove/reorder/split in validation outputs.
5. Always persist deterministic feedback artifacts in milestone feedback folder.

Target files:

- `tools/src/commands/ralph/build.ts`
- `tools/src/commands/ralph/validation.ts`
- `tools/src/commands/ralph/providers/summary.ts`

Acceptance criteria:

1. `--validate-first --provider opencode --model ...` uses opencode path.
2. Missing AC coverage can create new subtasks pre-build.
3. `--review` writes proposal artifact and applies only on explicit approval.
4. `--force` applies proposal and build proceeds on updated queue.

### WS-04 Calibration Refactor (Post-Flight Corrective Queue Insertions)

Deliverables:

1. Fix periodic calibration forwarding for provider/model/force/review.
2. Replace calibrate-local approval resolution with shared approval evaluator.
3. Replace best-effort global task-file creation contract with deterministic queue operations.
4. Keep self-improvement mode behavior while ensuring milestone-scoped outputs.

Target files:

- `tools/src/commands/ralph/build.ts`
- `tools/src/commands/ralph/cascade.ts`
- `tools/src/commands/ralph/calibrate.ts`
- `context/workflows/ralph/calibration/intention-drift.md`
- `context/workflows/ralph/calibration/technical-drift.md`
- `context/workflows/ralph/calibration/self-improvement.md`

Acceptance criteria:

1. `--calibrate-every` uses explicit provider/model flags.
2. Corrective subtasks are enqueued in milestone queue by default.
3. `--review` stages proposal artifacts without mutating queue.
4. `--force` applies corrective insertions automatically.

### WS-05 Unified Logging in Milestone Daily JSONL

Deliverables:

1. Extend daily log entry types to include:
   - `validation`
   - `calibration`
   - `queue-proposal`
   - `queue-apply`
2. Append new entries to existing milestone log file path:
   - `docs/planning/milestones/<slug>/logs/YYYY-MM-DD.jsonl`
3. Preserve status metrics behavior (iteration-only counters).

Target files:

- `tools/src/commands/ralph/types.ts`
- `tools/src/commands/ralph/calibrate.ts`
- `tools/src/commands/ralph/validation.ts`
- `tools/src/commands/ralph/status.ts`
- `docs/planning/schemas/iteration-diary.schema.json`

Acceptance criteria:

1. Calibration and validation runs produce daily log entries.
2. `aaa ralph status` still computes iteration metrics correctly.
3. No separate calibration log file is required.

### WS-06 Remove `blockedBy` End-to-End

Deliverables:

1. Remove `blockedBy` from subtask type and schema.
2. Simplify next-subtask selection to first pending in queue order.
3. Remove blocked/dependency messaging from build/print/status.
4. Remove dependency-field references from relevant prompts/docs.
5. Migrate milestone queue data to strip `blockedBy` keys.

Target files:

- `tools/src/commands/ralph/types.ts`
- `tools/src/commands/ralph/config.ts`
- `tools/src/commands/ralph/build.ts`
- `tools/src/commands/ralph/index.ts`
- `tools/src/commands/ralph/status.ts`
- `docs/planning/schemas/subtasks.schema.json`
- `context/workflows/ralph/building/ralph-iteration.md`
- `context/workflows/ralph/planning/subtask-spec.md`
- milestone `subtasks.json` files (active + archived)

Acceptance criteria:

1. Queue order alone determines execution priority.
2. No `blockedBy` references remain in runtime code paths.
3. Existing milestone subtasks files validate after migration.

### WS-07 Documentation and Help Contract Updates

Deliverables:

1. Update CLI help text for `--validate-first` to explicitly state queue mutations.
2. Update README behavior docs for validation/calibration parity.
3. Update completion descriptions from "next runnable" to queue-order wording.

Target files:

- `tools/src/commands/ralph/index.ts`
- `tools/src/commands/completion/zsh.ts`
- `tools/src/commands/completion/fish.ts`
- `tools/README.md`

Acceptance criteria:

1. Behavior is obvious from `--help` and README.
2. Human expectation matches runtime behavior across force/review modes.

## Test Plan

### Unit Tests

1. Queue operation application, id allocation, dedupe, replay safety.
2. Validation provider/model forwarding and proposal generation.
3. Periodic calibration forwarding and approval resolution.
4. Log parsing compatibility with mixed entry types.

### Integration/E2E Tests

1. `ralph build --validate-first --force` mutates queue and starts build.
2. `ralph build --validate-first --review` stages proposal and blocks without approval.
3. `ralph build --calibrate-every 5 --provider opencode --model ...` forwards flags.
4. `ralph subtasks diff/apply` deterministic behavior and JSON output contracts.
5. Completion scripts include new queue mutation commands.

## Risks and Mitigations

1. Risk: LLM outputs malformed queue edits.
   - Mitigation: strict operation schema + fail-safe no-write behavior.
2. Risk: race conditions on queue writes.
   - Mitigation: apply with queue fingerprint checks.
3. Risk: migration breaks legacy data.
   - Mitigation: normalize on save and add migration tests for milestone fixtures.

## Out of Scope

1. Reintroducing dependency graph execution semantics.
2. Supporting global non-milestone write targets for validation/calibration queue mutations.
3. Auto-committing queue changes.

## Definition of Done

1. Validation-first and calibration behave coherently with the same approval lifecycle.
2. All queue mutations are deterministic and milestone-scoped.
3. `blockedBy` is fully removed from active behavior and data contracts.
4. Daily milestone logs capture planning/build/validation/calibration/queue mutation events.
5. Docs/help/completions describe runtime behavior accurately.
