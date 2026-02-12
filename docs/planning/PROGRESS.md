# Progress

## Current Focus

**Story:** 004-model-registry
**Task:** TASK-050 dynamic-discovery
**Status:** SUB-309 complete

## Session Notes

## 2026-02-12

### SUB-041
- **Problem:** Queue create operations expose `atIndex` for positional insertion, but this subtask required explicit verification that create-at-index behavior (prepend and middle insert) is covered and that out-of-range index errors are actionable.
- **Changes:** Confirmed `applyQueueOperations()` already honors `atIndex` via `splice(atIndex, 0, createdSubtask)` in `queue-ops.ts`, then added focused unit coverage for middle-index insertion (`atIndex: 1`) and upper-bound out-of-range create errors to complement existing prepend and negative-index checks.
- **Files:** `tools/tests/lib/queue-ops.test.ts`, `docs/planning/milestones/006-cascade-mode-for-good/subtasks.json`, `docs/planning/PROGRESS.md`

### SUB-042
- **Problem:** `ralph subtasks append` still duplicated subtask ID allocation and build logic in `index.ts`, and wrote via `appendSubtasksToFile()` instead of the shared queue-ops pipeline used by `prepend`.
- **Changes:** Refactored `append` to build `create` operations with queue fingerprint metadata and run them through `applyQueueOperations()` at tail indices, reused the resulting queue for dry-run ID previews, and saved the mutated queue directly. Removed now-unused append-specific ID helper imports from `index.ts`.
- **Files:** `tools/src/commands/ralph/index.ts`, `docs/planning/milestones/006-cascade-mode-for-good/subtasks.json`, `docs/planning/PROGRESS.md`

## 2026-02-11

### SUB-031
- **Problem:** Calibration needed reusable pre-processing helpers for batch-loop context assembly (diff extraction, planning-chain resolution, files-to-read hydration, and result merging/deduplication).
- **Changes:** Added `extractDiffSummary()`, `resolvePlanningChain()`, `resolveFilesToRead()`, and `mergeCalibrationResults()` to `calibrate.ts` with new `DiffSummary` / `PlanningChainContext` / `ResolvedFile` contracts; added focused unit coverage in `calibrate-utils.test.ts` for diff behavior, section-based planning resolution (`WS-01-*`), `@context/` file resolution with token estimates, and title-similarity deduping. Also updated tools ESLint ignores to exclude one-off `tools/scripts/**` from project-service linting.
- **Files:** `tools/src/commands/ralph/calibrate.ts`, `tools/tests/lib/calibrate-utils.test.ts`, `tools/eslint.config.js`, `docs/planning/milestones/006-cascade-mode-for-good/subtasks.json`, `docs/planning/PROGRESS.md`

### SUB-032
- **Problem:** Calibration self-improvement needed a dedicated streaming analyzer to extract high-signal failure patterns from session JSONL logs without loading full logs into prompt context.
- **Changes:** Added `session-analysis.ts` with `OffTrackReport`, incremental line-by-line parsing, and stateful detectors for oversized-file errors, file-not-found errors, repeated 3-step tool loops, and Edit backtracking reversals (exact + partial). Reused shared session metrics from `session.ts` (`countToolCalls`, `getFilesFromSession`, `calculateDurationMs`, `getTokenUsageFromSession`) and added focused unit tests for all four detector behaviors.
- **Files:** `tools/src/commands/ralph/session-analysis.ts`, `tools/tests/lib/session-analysis.test.ts`, `tools/CLAUDE.md`, `docs/planning/milestones/006-cascade-mode-for-good/subtasks.json`, `docs/planning/PROGRESS.md`

### SUB-033
- **Problem:** Session analysis lacked detectors 5-8 plus composite scoring, so self-improvement calibration could not flag exploration-only runs, correction churn, token snowballing, or repeated test-fix loops.
- **Changes:** Completed `session-analysis.ts` with `ExplorationDetector`, `SelfCorrectionDetector`, `TokenAccelerationDetector`, and `TestFixLoopDetector`; added weighted composite `offTrackScore` normalized by session length; and expanded unit coverage to validate all 8 detectors, composite scoring normalization, and the full `extractSignals()` report contract.
- **Files:** `tools/src/commands/ralph/session-analysis.ts`, `tools/tests/lib/session-analysis.test.ts`, `docs/planning/milestones/006-cascade-mode-for-good/subtasks.json`, `docs/planning/PROGRESS.md`

### SUB-034
- **Problem:** Intention calibration still used one large provider invocation with global planning docs, causing context pressure and lacking per-batch planning-chain filtering.
- **Changes:** Refactored `runIntentionCheck()` in `calibrate.ts` to process completed subtasks in TypeScript-controlled batches of five, pre-resolve each subtask via `extractDiffSummary()` and `resolvePlanningChain()`, filter out entries with null planning context, build inline scoped prompts through `buildIntentionBatchPrompt()`, parse each batch with `parseCalibrationResult()`, merge all findings with `mergeCalibrationResults()`, and call `applyCalibrationProposal()` once with the merged result. Rewrote `intention-drift.md` as a single-batch analysis template with an explicit "DO NOT read additional files" instruction and removed parallel-analyzer orchestration guidance.
- **Files:** `tools/src/commands/ralph/calibrate.ts`, `context/workflows/ralph/calibration/intention-drift.md`, `tools/tests/lib/calibrate.test.ts`, `docs/planning/milestones/006-cascade-mode-for-good/subtasks.json`, `docs/planning/PROGRESS.md`

### SUB-035
- **Problem:** Technical calibration still used one monolithic provider invocation and prompt-side orchestration instructions, which caused context pressure and prevented deterministic batch preprocessing of diffs plus referenced files.
- **Changes:** Refactored `runTechnicalCheck()` in `calibrate.ts` to process completed subtasks in batches of five, pre-resolve each subtask's full diff via `extractDiffSummary()` and all `filesToRead` content via `resolveFilesToRead()`, build inline batch payloads with new `buildTechnicalBatchPrompt()`, parse per-batch responses with `parseCalibrationResult()`, merge findings through `mergeCalibrationResults()`, and apply once with `applyCalibrationProposal()`. Rewrote `technical-drift.md` as a single-batch prompt, removed Phase 2 parallel analyzer orchestration guidance, preserved technical drift checks (tests/patterns/error handling/docs/types/security/atomic docs), added consistency-checker framework references (Code vs Prose 6-13, Code-to-Code 14-19), and added explicit "DO NOT read additional files beyond what is provided." guidance.
- **Files:** `tools/src/commands/ralph/calibrate.ts`, `context/workflows/ralph/calibration/technical-drift.md`, `tools/tests/lib/calibrate.test.ts`, `docs/planning/milestones/006-cascade-mode-for-good/subtasks.json`, `docs/planning/PROGRESS.md`

### SUB-036
- **Problem:** Self-improvement calibration still ran one monolithic invocation across all session logs, causing context pressure and not using per-session signal triage.
- **Changes:** Refactored `runImproveCheck()` in `calibrate.ts` to dedupe `preflight.available` by `sessionId`, call `extractSignals()` per unique session, skip sessions with `offTrackScore < 0.1`, build session-scoped prompts with `buildSessionAnalysisPrompt()`, invoke the provider once per unique session with fresh context, merge findings via `mergeCalibrationResults()`, and apply once while preserving suggest/autofix/off behavior and missing-log fallback. Rewrote `self-improvement.md` for signal-based analysis with a `<session-signals>` template, added targeted Grep guidance for heavy backtracking cases (5+), removed raw `<session-log>` template usage, and removed chunking guidance.
- **Files:** `tools/src/commands/ralph/calibrate.ts`, `context/workflows/ralph/calibration/self-improvement.md`, `tools/tests/lib/calibrate.test.ts`, `docs/planning/milestones/006-cascade-mode-for-good/subtasks.json`, `docs/planning/PROGRESS.md`

### SUB-037
- **Problem:** `.claude/skills/ralph-calibrate/SKILL.md` duplicated calibration orchestration and prompt references that now belong exclusively in the CLI runtime.
- **Changes:** Rewrote the skill into a thin wrapper that parses the check argument, resolves `subtasks.json` context, delegates execution to `aaa ralph calibrate <check> [--review] [--force]` via Bash, and shows usage help when no check is provided.
- **Files:** `.claude/skills/ralph-calibrate/SKILL.md`, `docs/planning/milestones/006-cascade-mode-for-good/subtasks.json`, `docs/planning/PROGRESS.md`

## 2026-02-10

### SUB-001
- **Problem:** Queue mutation primitives for milestone 006 were undefined, so validation/calibration could not express deterministic create/update/remove/reorder/split proposals with replay protection.
- **Changes:** Added queue operation contracts (`QueueOperation`, `QueueProposal`, `QueueFingerprint`) and `computeFingerprint()` in Ralph shared types, then added focused unit tests covering all operation variants plus deterministic/delta fingerprint behavior.
- **Files:** `tools/src/commands/ralph/types.ts`, `tools/tests/lib/queue-operations.test.ts`, `docs/planning/milestones/006-cascade-mode-for-good/subtasks.json`, `docs/planning/PROGRESS.md`

### SUB-002
- **Problem:** Ralph had queue-operation type definitions but no deterministic apply engine to validate/apply create/update/remove/reorder/split proposals safely against pending-only queue state.
- **Changes:** Added `applyQueueOperations()` in a new `queue-ops.ts` module with fingerprint replay protection, canonical `SUB-###` allocation for create/split drafts, pending-target guards with actionable errors, and deterministic operation handling (create append, update, remove, reorder, split). Added focused unit coverage for all operation kinds, replay safety, missing-target failures, and immutable `done:true` subtask protection.
- **Files:** `tools/src/commands/ralph/queue-ops.ts`, `tools/tests/lib/queue-ops.test.ts`, `docs/planning/milestones/006-cascade-mode-for-good/subtasks.json`, `docs/planning/PROGRESS.md`

### SUB-003
- **Problem:** Queue operations were not wired into the canonical queue file read/write path, so proposals could not be applied and persisted through one deterministic helper while preserving save-time normalization.
- **Changes:** Added `applyAndSaveProposal()` in `queue-ops.ts` to load the queue, apply `applyQueueOperations()`, save through `saveSubtasksFile()`, and return an apply summary with before/after fingerprints and queue counts. Updated `loadSubtasksFile()` to return a computed fingerprint from current queue state and updated `saveSubtasksFile()` to strip transient fingerprint metadata while still removing legacy `status` fields. Added a round-trip unit test (`load -> propose -> apply -> save -> reload`) that verifies expected queue state and normalization behavior.
- **Files:** `tools/src/commands/ralph/config.ts`, `tools/src/commands/ralph/queue-ops.ts`, `tools/src/commands/ralph/types.ts`, `tools/tests/lib/queue-ops.test.ts`, `docs/planning/milestones/006-cascade-mode-for-good/subtasks.json`, `docs/planning/PROGRESS.md`

### SUB-004
- **Problem:** Ralph queue tooling lacked CLI commands to append/prepend subtasks from structured JSON input while preserving canonical ID allocation and safe dry-run previews.
- **Changes:** Added `aaa ralph subtasks append` and `aaa ralph subtasks prepend` with `--subtasks`, `--file`, and `--dry-run` support. Both commands accept JSON from stdin or file, allocate new `SUB-NNN` IDs, and emit machine-readable JSON for dry-runs. `append` writes through `appendSubtasksToFile()`, while `prepend` uses `applyQueueOperations()` create ops then reorders to queue front before save. Added a dedicated E2E suite covering help output and dry-run behavior for both commands.
- **Files:** `tools/src/commands/ralph/index.ts`, `tools/tests/e2e/ralph-subtasks-cli.test.ts`, `tools/README.md`, `docs/planning/milestones/006-cascade-mode-for-good/subtasks.json`, `docs/planning/PROGRESS.md`

### SUB-005
- **Problem:** Ralph could generate queue proposals but had no CLI surface to preview proposal deltas or apply them safely against a specific subtasks file.
- **Changes:** Added `aaa ralph subtasks diff` and `aaa ralph subtasks apply` with `--proposal` and `--subtasks` inputs. `diff` now renders a human-readable change summary plus machine-parseable JSON via `--json`, while `apply` persists changes through `applyAndSaveProposal()`. Both commands validate queue fingerprints first and emit actionable stale-proposal errors. Expanded `ralph-subtasks-cli` E2E coverage for readable diff output, JSON diff output, deterministic apply behavior, and fingerprint mismatch failures.
- **Files:** `tools/src/commands/ralph/index.ts`, `tools/tests/e2e/ralph-subtasks-cli.test.ts`, `tools/README.md`, `docs/planning/milestones/006-cascade-mode-for-good/subtasks.json`, `docs/planning/PROGRESS.md`

### SUB-006
- **Problem:** Shell completion scripts for `aaa ralph subtasks` did not include the new queue mutation subcommands and still used "next runnable" wording.
- **Changes:** Updated zsh and fish completion generators to add `append`, `prepend`, `diff`, and `apply` subcommands with their command-specific flags (`--subtasks`, `--file`, `--dry-run`, `--proposal`, `--json`) and switched next-subtask descriptions to queue-order wording. Added completion E2E assertions covering the new subcommands, flags, and wording regression checks.
- **Files:** `tools/src/commands/completion/zsh.ts`, `tools/src/commands/completion/fish.ts`, `tools/tests/e2e/completion.test.ts`, `docs/planning/milestones/006-cascade-mode-for-good/subtasks.json`, `docs/planning/PROGRESS.md`

### SUB-008
- **Problem:** Pre-build validation only emitted skipped-subtask records, so `--validate-first` could not produce deterministic queue mutations like create/update proposals.
- **Changes:** Refactored validation parsing and batch results to support queue operation proposals (`create/update/remove/reorder/split`), updated the pre-build validation prompt contract to request structured operations, mapped legacy skip decisions to `remove` operations for backward compatibility, and wired build-time `--validate-first` to apply proposals through `applyAndSaveProposal()` before iteration selection.
- **Files:** `tools/src/commands/ralph/validation.ts`, `tools/src/commands/ralph/build.ts`, `tools/tests/lib/validation.test.ts`, `tools/tests/lib/validation-batch.test.ts`, `context/workflows/ralph/building/pre-build-validation.md`, `docs/planning/milestones/006-cascade-mode-for-good/subtasks.json`, `docs/planning/PROGRESS.md`

### SUB-009
- **Problem:** `--validate-first` always auto-applied validation proposals, so build mode/flags could not control when proposals are staged, reviewed, or approved before queue mutation.
- **Changes:** Added validation-proposal approval policy wiring for build (`--force`, `--review`, and default mode behavior), staged proposal artifacts into milestone `feedback/` before apply decisions, and blocked headless `--review` runs until explicit approval. Updated validation flow to always write misalignment feedback artifacts to milestone `feedback/` (including supervised mode), and added E2E coverage for force/default/review validation-first proposal handling plus unit coverage for proposal mode resolution and artifact writing.
- **Files:** `tools/src/commands/ralph/build.ts`, `tools/src/commands/ralph/validation.ts`, `tools/src/commands/ralph/types.ts`, `tools/src/commands/ralph/index.ts`, `tools/src/commands/ralph/cascade.ts`, `tools/README.md`, `tools/tests/e2e/ralph.test.ts`, `tools/tests/lib/build.test.ts`, `tools/tests/lib/build-validation-integration.test.ts`, `tools/tests/lib/validation-batch.test.ts`, `tools/tests/lib/validation-headless.test.ts`, `docs/planning/milestones/006-cascade-mode-for-good/subtasks.json`, `docs/planning/PROGRESS.md`

### SUB-010
- **Problem:** Periodic calibration in `runPeriodicCalibration()` did not forward build-level provider/model/force/review flags, so `--calibrate-every` could drift from the active build invocation context.
- **Changes:** Extended `PeriodicCalibrationOptions` with `provider`, `model`, `force`, and `review`, threaded those values from `runBuild()` into `runPeriodicCalibration()`, and forwarded them to `runCalibrate("all", ...)`. Added regression coverage in `build-validation-integration.test.ts` to assert periodic calibration receives and passes through all four flags.
- **Files:** `tools/src/commands/ralph/build.ts`, `tools/tests/lib/build-validation-integration.test.ts`, `docs/planning/milestones/006-cascade-mode-for-good/subtasks.json`, `docs/planning/PROGRESS.md`

### SUB-011
- **Problem:** Calibration flows still relied on ad-hoc output/task-file contracts and local approval-mode logic, so corrective work was not emitted as deterministic queue proposals against the milestone queue.
- **Changes:** Refactored calibration to parse structured corrective-subtask JSON, convert it into `QueueProposal` create operations, and route proposal handling through shared `evaluateApproval("correctionTasks", ...)` behavior with milestone `feedback/` artifact staging. `--review` now stages proposals without queue mutation, `--force` applies proposals automatically, self-improvement mode still supports suggest/autofix behavior, and queue create operations now honor `atIndex` so prepend insertions are deterministic.
- **Files:** `tools/src/commands/ralph/calibrate.ts`, `tools/src/commands/ralph/queue-ops.ts`, `tools/src/commands/ralph/index.ts`, `tools/tests/lib/calibrate.test.ts`, `tools/tests/lib/queue-ops.test.ts`, `docs/planning/milestones/006-cascade-mode-for-good/subtasks.json`, `docs/planning/PROGRESS.md`

### SUB-012
- **Problem:** Calibration prompt templates still instructed drift/self-improvement analyzers to create standalone task files, which conflicted with milestone-scoped queue mutation flow.
- **Changes:** Updated intention drift, technical drift, and self-improvement calibration prompts to require JSON-only output with deterministic `QueueOperation[]` payloads, embedded the QueueOperation schema reference in each prompt, and added explicit guidance to target the current milestone `subtasks.json` queue with corrective subtask operations.
- **Files:** `context/workflows/ralph/calibration/intention-drift.md`, `context/workflows/ralph/calibration/technical-drift.md`, `context/workflows/ralph/calibration/self-improvement.md`, `docs/planning/milestones/006-cascade-mode-for-good/subtasks.json`, `docs/planning/PROGRESS.md`

### SUB-013
- **Problem:** Daily milestone logs needed explicit type coverage for validation/calibration queue events without breaking iteration-only status metrics.
- **Changes:** Extended Ralph log typings with `validation`, `calibration`, `queue-proposal`, and `queue-apply` discriminator values, exported typed log-entry interfaces for each new type, updated status filtering to continue accepting only iteration records for metrics, expanded the mixed-log regression test to include the new entry kinds, and updated the iteration diary JSON schema enum.
- **Files:** `tools/src/commands/ralph/types.ts`, `tools/src/commands/ralph/status.ts`, `tools/tests/lib/status.test.ts`, `docs/planning/schemas/iteration-diary.schema.json`, `docs/planning/milestones/006-cascade-mode-for-good/subtasks.json`, `docs/planning/PROGRESS.md`

### SUB-014
- **Problem:** Validation and calibration flows generated queue proposals/applies and completion outcomes, but they were not persisted into milestone daily logs, leaving `ralph status` and log consumers without validation/calibration traceability.
- **Changes:** Added milestone daily log emission in `validation.ts` and `calibrate.ts` using `getMilestoneLogPath()` for `validation`, `calibration`, `queue-proposal`, and `queue-apply` entries. Updated build-time validation proposal handling to pass full proposal context and append `queue-apply` records after apply decisions. Extended validation and calibration unit coverage to assert new daily-log entries and preserved status metrics behavior by running status regression tests against mixed daily logs.
- **Files:** `tools/src/commands/ralph/validation.ts`, `tools/src/commands/ralph/calibrate.ts`, `tools/src/commands/ralph/build.ts`, `tools/src/commands/ralph/types.ts`, `tools/tests/lib/validation-batch.test.ts`, `tools/tests/lib/validation-headless.test.ts`, `tools/tests/lib/calibrate.test.ts`, `docs/planning/milestones/006-cascade-mode-for-good/subtasks.json`, `docs/planning/PROGRESS.md`

### SUB-015
- **Problem:** `blockedBy` was still encoded in Ralph subtask type/schema/docs, preventing cleanup of dependency metadata from the canonical subtask contract.
- **Changes:** Removed `blockedBy` from `Subtask` in `types.ts`, removed the `blockedBy` property from `subtasks.schema.json`, and removed the optional-field mention from `subtask-spec.md`. Updated blocked-subtask reporting call sites to read legacy `blockedBy` fields via safe runtime narrowing so TypeScript compiles while queue migration continues.
- **Files:** `tools/src/commands/ralph/types.ts`, `docs/planning/schemas/subtasks.schema.json`, `context/workflows/ralph/planning/subtask-spec.md`, `tools/src/commands/ralph/config.ts`, `tools/src/commands/ralph/build.ts`, `tools/src/commands/ralph/index.ts`, `tools/src/commands/ralph/status.ts`, `docs/planning/milestones/006-cascade-mode-for-good/subtasks.json`, `docs/planning/PROGRESS.md`

### SUB-016
- **Problem:** Queue selection and status/build messaging still included dependency-aware `blockedBy` behavior, which no longer matches the queue-order model.
- **Changes:** Simplified `getNextSubtask()` to return the first pending subtask in array order, updated build-time `getNextRunnableSubtask()` to select the first non-done non-skipped subtask directly, and removed blocked/dependency messaging from `handleNoRunnableSubtasks()` and status queue rendering. Updated build integration and Ralph E2E tests to assert queue-order-first selection behavior.
- **Files:** `tools/src/commands/ralph/config.ts`, `tools/src/commands/ralph/build.ts`, `tools/src/commands/ralph/status.ts`, `tools/tests/lib/build-validation-integration.test.ts`, `tools/tests/e2e/ralph.test.ts`, `docs/planning/PROGRESS.md`

### SUB-017
- **Problem:** Prompt/docs surfaces still referenced `blockedBy`, which conflicted with the queue-order-only execution model.
- **Changes:** Removed remaining `blockedBy` wording from the Ralph iteration workflow and subtask-reviewer agent prompt, and updated pre-build validation task-context wording to avoid dependency framing.
- **Files:** `context/workflows/ralph/building/ralph-iteration.md`, `.claude/agents/subtask-reviewer.md`, `context/workflows/ralph/building/pre-build-validation.md`, `docs/planning/milestones/006-cascade-mode-for-good/subtasks.json`, `docs/planning/PROGRESS.md`

### SUB-018
- **Problem:** Milestone queue files still carried legacy `blockedBy` dependency metadata that no longer matches queue-order execution and needed migration across active/historical milestone subtasks files.
- **Changes:** Removed `blockedBy` keys from all canonical milestone `subtasks.json` files under `docs/planning/milestones/` (including legacy milestone queues), confirmed no archived `archive/**/subtasks.json` files exist to migrate in this repo, and verified diff scope is limited to `blockedBy` removals.
- **Files:** `docs/planning/milestones/002-ralph-💪/subtasks.json`, `docs/planning/milestones/003-ralph-workflow/subtasks.json`, `docs/planning/milestones/004-MULTI-CLI/subtasks.json`, `docs/planning/milestones/005-consolidate-simplify/subtasks.json`, `docs/planning/milestones/006-cascade-mode-for-good/subtasks.json`, `docs/planning/PROGRESS.md`

### SUB-019
- **Problem:** Ralph E2E test fixtures still included legacy `blockedBy` fields, which no longer exist in the subtask contract and could mask regressions in queue-order-only behavior.
- **Changes:** Removed all `blockedBy` fields from inline subtasks fixtures in `ralph.test.ts`, then re-ran the targeted Ralph E2E suite to confirm fixtures and command behavior still pass without dependency metadata.
- **Files:** `tools/tests/e2e/ralph.test.ts`, `docs/planning/milestones/006-cascade-mode-for-good/subtasks.json`, `docs/planning/PROGRESS.md`

### SUB-020
- **Problem:** Build CLI help/completion and README text did not clearly state queue mutation behavior parity between `--validate-first` and periodic calibration, and did not describe build approval modes clearly.
- **Changes:** Updated `ralph build` help text so `--validate-first` explicitly lists create/update/remove/reorder/split queue mutations, `--calibrate-every` mentions corrective queue insertions, and `--force`/`--review` describe approval modes for validation/calibration proposals. Updated README build docs with queue-mutation behavior and approval-mode parity, and aligned zsh/fish completion descriptions to queue-order wording.
- **Files:** `tools/src/commands/ralph/index.ts`, `tools/README.md`, `tools/src/commands/completion/zsh.ts`, `tools/src/commands/completion/fish.ts`, `docs/planning/milestones/006-cascade-mode-for-good/subtasks.json`, `docs/planning/PROGRESS.md`

### SUB-021
- **Problem:** `resolveMilestoneFromOptions()` ignored `--output-dir`, so text/file source runs targeting a milestone path could not resolve milestone context and planning logs fell back to `_orphan`.
- **Changes:** Updated `resolveMilestoneFromOptions()` to accept `outputDirectory` and derive milestone context from `docs/planning/milestones/<slug>` paths when `--milestone`/`--story` are absent, then passed `options.outputDir` at the call site. Exported the resolver for tests and added regression coverage for output-dir inference, milestone/story precedence, and milestone log-path behavior.
- **Files:** `tools/src/commands/ralph/index.ts`, `tools/tests/lib/ralph-index.test.ts`, `docs/planning/milestones/006-cascade-mode-for-good/subtasks.json`, `docs/planning/PROGRESS.md`

### SUB-022
- **Problem:** Regression coverage for `resolveMilestoneFromOptions()` needed to explicitly lock the milestone-priority chain and verify log-path resolution keeps milestone context when only `--output-dir` is provided.
- **Changes:** Expanded `ralph-index` unit coverage with explicit assertions for milestone/story priority over output-dir, milestone extraction from output-dir, non-milestone and all-undefined fallback behavior, and a log-path assertion that confirms `getPlanningLogPath` receives the resolved milestone path (not `undefined`).
- **Files:** `tools/tests/lib/ralph-index.test.ts`, `docs/planning/milestones/006-cascade-mode-for-good/subtasks.json`, `docs/planning/PROGRESS.md`

### SUB-023
- **Problem:** Planning docs did not clearly state that milestone-shaped `--output-dir` values affect planning log placement in addition to the generated `subtasks.json` destination.
- **Changes:** Updated `subtasks-from-source.md` to clarify in both the parameters table and append phase that milestone-shaped output directories set both subtasks and planning log locations, and added matching shared-reference guidance in `subtask-spec.md`.
- **Files:** `context/workflows/ralph/planning/subtasks-from-source.md`, `context/workflows/ralph/planning/subtask-spec.md`, `docs/planning/milestones/006-cascade-mode-for-good/subtasks.json`, `docs/planning/PROGRESS.md`

### SUB-024
- **Problem:** The 14 cascade-mode code review fixes were already applied in code but needed formal verification against acceptance criteria and queue tracking completion for milestone 006.
- **Changes:** Verified the existing fixes commit (`d36edbf`) covers the review-fix categories across Ralph queue/build/validation/calibration modules, re-ran required typecheck and targeted regression suites (63/63 passing), and marked SUB-024 complete with commit/session metadata.
- **Files:** `tools/src/commands/ralph/index.ts`, `tools/src/commands/ralph/config.ts`, `tools/src/commands/ralph/queue-ops.ts`, `tools/src/commands/ralph/validation.ts`, `tools/src/commands/ralph/build.ts`, `tools/src/commands/ralph/approvals.ts`, `tools/src/commands/ralph/calibrate.ts`, `tools/src/commands/ralph/types.ts`, `docs/planning/milestones/006-cascade-mode-for-good/subtasks.json`, `docs/planning/PROGRESS.md`

### SUB-025
- **Problem:** Queue helper regression coverage was missing for `appendSubtasksToFile()` guard clauses, fingerprint mismatch detection, and invalid queue-operation parsing.
- **Changes:** Added targeted unit tests in `queue-ops.test.ts` for append behavior against new/existing files, duplicate ID skipping, and empty input. Added `queue-operations.test.ts` coverage for matching/mismatched/empty-queue fingerprint checks and invalid operation type handling. Exported `hasFingerprintMismatch` and `parseQueueOperation`, and hardened `parseQueueOperation` to throw for unsupported operation types while keeping `parseQueueOperations` fail-open behavior.
- **Files:** `tools/tests/lib/queue-ops.test.ts`, `tools/tests/lib/queue-operations.test.ts`, `tools/src/commands/ralph/index.ts`, `tools/src/commands/ralph/validation.ts`, `docs/planning/milestones/006-cascade-mode-for-good/subtasks.json`, `docs/planning/PROGRESS.md`

### SUB-026
- **Problem:** CLI subtask parsing helpers in `ralph/index.ts` lacked direct unit coverage for key validation/error branches and file-read guard clauses.
- **Changes:** Exported `parseCliSubtaskDraft`, `parseCliSubtaskDrafts`, and `readQueueProposalFromFile` for focused unit testing, then added regression tests for required validation branches (missing title/description, invalid `storyRef`, null input), draft payload JSON error paths (malformed JSON, empty array, single-object wrapping, `subtasks` unwrapping), and proposal-file guards (missing file, invalid JSON, missing `operations`, valid proposal parse).
- **Files:** `tools/src/commands/ralph/index.ts`, `tools/tests/lib/ralph-index.test.ts`, `docs/planning/milestones/006-cascade-mode-for-good/subtasks.json`, `docs/planning/PROGRESS.md`

### SUB-027
- **Problem:** Coverage gaps remained for validation proposal approval behavior and skip-to-queue-removal resolution in the build loop.
- **Changes:** Exported `resolveApprovalForValidationProposal()` and `resolveSkippedSubtaskIds()` from `build.ts`, added unit tests for approval resolution across force/review/default supervised/default headless modes, and added an integration test that stubs validation output and verifies skipped subtask IDs are converted into remove operations that mutate `subtasks.json`.
- **Files:** `tools/src/commands/ralph/build.ts`, `tools/tests/lib/build.test.ts`, `tools/tests/lib/build-skip-resolution.test.ts`, `docs/planning/milestones/006-cascade-mode-for-good/subtasks.json`, `docs/planning/PROGRESS.md`

### SUB-028
- **Problem:** Subtask queue parsing and diff helpers were embedded in `ralph/index.ts`, keeping the command entrypoint oversized and harder to maintain.
- **Changes:** Extracted subtask CLI helper types/functions into `subtask-helpers.ts` (`CliSubtaskDraft`, `QueueDiffSummary`, parsing, fingerprint mismatch, and queue diff helpers), rewired `index.ts` to import them, and added focused unit coverage for helper behavior/regression safety.
- **Files:** `tools/src/commands/ralph/subtask-helpers.ts`, `tools/src/commands/ralph/index.ts`, `tools/tests/lib/subtask-helpers.test.ts`, `tools/CLAUDE.md`, `docs/planning/milestones/006-cascade-mode-for-good/subtasks.json`, `docs/planning/PROGRESS.md`

### SUB-029
- **Problem:** Validation repeatedly resolved the same parent task file per subtask, causing redundant task directory scans and file reads when multiple subtasks shared a `taskRef`.
- **Changes:** Added parent-task caching in `validateAllSubtasks()` by precomputing `resolveParentTask()` once per unique `taskRef` and threading cached results into per-subtask validation/prompt assembly. Added regression coverage to ensure repeated subtasks keep parent-task context even after the task file is removed mid-run.
- **Files:** `tools/src/commands/ralph/validation.ts`, `tools/tests/lib/validation-batch.test.ts`, `docs/planning/milestones/006-cascade-mode-for-good/subtasks.json`, `docs/planning/PROGRESS.md`

### SUB-030
- **Problem:** Ralph build/status internals had minor structural coupling: build options lived in one broad interface, status re-sorted merged diary entries on every read, and validation-owned queue parsing logic was embedded in `validation.ts` instead of shared queue utilities.
- **Changes:** Split `BuildOptions` into `BuildExecutionOptions` and `BuildQueueOptions` then composed `BuildOptions` from both; updated status diary loading to sort filenames once and per-file entries in `readSingleDiaryFile()` while removing merged-array sorting from `readIterationDiary()`; moved queue operation parsing helpers into `queue-ops.ts` and imported `parseQueueOperations` directly in `validation.ts`. Updated queue-operations unit test imports accordingly.
- **Files:** `tools/src/commands/ralph/types.ts`, `tools/src/commands/ralph/status.ts`, `tools/src/commands/ralph/queue-ops.ts`, `tools/src/commands/ralph/validation.ts`, `tools/tests/lib/queue-operations.test.ts`, `docs/planning/milestones/006-cascade-mode-for-good/subtasks.json`, `docs/planning/PROGRESS.md`

## 2026-02-08

### SUB-001
- **Problem:** Legacy planning-create skills still existed under `.claude/skills/` and stale references remained in README/docs/eval surfaces, conflicting with consolidation decision 5.
- **Changes:** Deleted the two legacy skill directories, removed legacy skill-table/help-text references from README, removed related eval script coverage from `.claude/scripts/eval.sh`, and cleaned remaining docs references to the removed skills.
- **Files:** `.claude/skills/story-create/SKILL.md`, `.claude/skills/task-create/SKILL.md`, `.claude/scripts/eval.sh`, `README.md`, `docs/planning/consolidating.md`, `docs/planning/claude-setup-review.md`, `docs/planning/milestones/002-ralph-💪/subtasks.json`, `docs/planning/milestones/002-ralph-💪/PROGRESS.md`, `docs/planning/milestones/005-consolidate-simplify/subtasks.json`

### SUB-002
- **Problem:** Phase 1 consolidation needed a shared naming utility to enforce milestone-scoped numbering and file patterns for milestones, stories/tasks, and subtask IDs.
- **Changes:** Added `naming.ts` with milestone directory numbering from `docs/planning/milestones/` numeric dirs only, folder-local artifact number allocation, story/task filename formatting (`<NNN>-STORY-<slug>.md`, `<NNN>-TASK-<slug>.md`), and milestone-local `SUB-<NNN>` allocation from a single target `subtasks.json`. Added unit coverage for numeric milestone scanning (ignoring `_orphan`/non-matching entries), sparse folder numbering, formatter output, and file-local subtask ID scope.
- **Files:** `tools/src/commands/ralph/naming.ts`, `tools/tests/lib/naming.test.ts`, `docs/planning/milestones/005-consolidate-simplify/subtasks.json`, `docs/planning/PROGRESS.md`

### SUB-003
- **Problem:** `context/blocks/docs/naming-convention.md` still documented `NNN-slug` naming and explicitly disallowed type segments, conflicting with locked consolidation decision 6.
- **Changes:** Updated the canonical naming doc to require `<NNN>-<slug>/` milestone directories plus `<NNN>-STORY-<slug>.md` and `<NNN>-TASK-<slug>.md` artifact filenames, replaced the legacy no-prefix guidance with explicit type-segment requirements, and refreshed JSON-ref and migration examples to the new conventions.
- **Files:** `context/blocks/docs/naming-convention.md`, `docs/planning/milestones/005-consolidate-simplify/subtasks.json`, `docs/planning/PROGRESS.md`

### SUB-004
- **Problem:** `appendSubtasksToFile()` only de-duplicated against IDs already in the destination queue file, so a single incoming batch could still contain duplicate subtask IDs.
- **Changes:** Added runtime duplicate-ID detection for incoming append batches in `config.ts` and fail-fast erroring before any write occurs. Expanded config unit tests with a regression case for duplicate IDs in one batch and a milestone-scope case proving two different milestone queues can each use `SUB-001` without conflict, while preserving existing duplicate-against-existing-file behavior.
- **Files:** `tools/src/commands/ralph/config.ts`, `tools/tests/lib/config.test.ts`, `docs/planning/milestones/005-consolidate-simplify/subtasks.json`, `docs/planning/PROGRESS.md`

### SUB-005
- **Problem:** Ralph lacked milestone-scoped queue operations for selecting the next runnable subtask, listing pending items, and marking completion metadata from CLI.
- **Changes:** Added `aaa ralph subtasks next|list|complete` commands with required `--milestone` context, wired `next` to reuse `getNextSubtask()` selection logic, added completion metadata persistence (`done`, `completedAt`, `commitHash`, `sessionId`), and added E2E coverage for selection behavior, pending list filtering, completion updates, and missing-milestone failures. Updated `tools/README.md` with new subtask queue command docs/examples.
- **Files:** `tools/src/commands/ralph/index.ts`, `tools/tests/e2e/ralph.test.ts`, `tools/README.md`, `docs/planning/milestones/005-consolidate-simplify/subtasks.json`, `docs/planning/PROGRESS.md`

### SUB-006
- **Problem:** Milestone queue files still carried legacy subtask-level `status` fields, creating a confusing mixed queue model even though runtime completion logic is keyed on `done`.
- **Changes:** Added save-time queue normalization in `saveSubtasksFile()` to strip legacy `status` keys from each subtask entry while preserving other fields, kept `loadSubtasksFile()` backward-compatible for legacy files, and added regression tests for legacy-load tolerance, write normalization, and unchanged `aaa ralph status` progress output after normalization.
- **Files:** `tools/src/commands/ralph/config.ts`, `tools/tests/lib/config.test.ts`, `tools/tests/lib/status.test.ts`, `docs/planning/milestones/005-consolidate-simplify/subtasks.json`, `docs/planning/PROGRESS.md`

### SUB-007
- **Problem:** Headless and supervised build iteration flows assembled assignment context differently, creating drift risk in payload fields and completion guidance.
- **Changes:** Added a shared `buildIterationContext()` builder in `build.ts`, routed both `buildIterationPrompt()` and supervised provider invocation through that same builder, and added unit coverage that checks canonical payload fields plus shared-builder usage at both call sites.
- **Files:** `tools/src/commands/ralph/build.ts`, `tools/tests/lib/build.test.ts`, `docs/planning/milestones/005-consolidate-simplify/subtasks.json`, `docs/planning/PROGRESS.md`

### SUB-008
- **Problem:** `ralph-iteration.md` still used shell-era queue mutation guidance (`jq`, placeholder IDs/paths, and `build.sh` language) instead of the milestone-scoped `aaa ralph subtasks` runtime workflow.
- **Changes:** Rewrote iteration workflow guidance to make `aaa ralph subtasks next|list|complete --milestone` the primary queue path in Orient, Pre-flight, and Phase 7; removed `build.sh`/"outer loop" wording and placeholder mutation recipes from main workflow steps; retained `jq` only as break-glass troubleshooting guidance and updated Phase 7 to describe the TypeScript single-subtask completion invariant.
- **Files:** `context/workflows/ralph/building/ralph-iteration.md`, `docs/planning/milestones/005-consolidate-simplify/subtasks.json`, `docs/planning/PROGRESS.md`

### SUB-009
- **Problem:** `ralph build --print` dumped the full subtasks file and did not mirror runtime assignment selection/prompt assembly.
- **Changes:** Reworked `--print` to resolve the next runnable subtask via `getNextSubtask`, render the effective per-iteration prompt for only that assignment, and print explicit queue-empty or all-blocked messages when no runnable item exists. Exported `buildIterationPrompt()` for reuse and added E2E coverage for selection parity with `subtasks next`, bounded output on large queues, and empty/blocked messaging.
- **Files:** `tools/src/commands/ralph/index.ts`, `tools/src/commands/ralph/build.ts`, `tools/tests/e2e/ralph.test.ts`, `docs/planning/milestones/005-consolidate-simplify/subtasks.json`, `docs/planning/PROGRESS.md`

### SUB-010
- **Problem:** Ralph docs/skills still drifted from runtime defaults and implementation details: `/ralph-build` listed a stale max-iterations default and path-prompt behavior, `/ralph-status` referenced removed shell scripts, and `docs/ralph/README.md` implied build defaults that did not match CLI supervised mode.
- **Changes:** Updated `.claude/skills/ralph-build/SKILL.md` to align with runtime defaults (`--max-iterations` default `0`, supervised default mode), removed divergent path-prompt behavior, added milestone-scoped assignment guidance via `aaa ralph subtasks next`, and explicitly marked `aaa ralph build` as runtime source of truth. Updated `.claude/skills/ralph-status/SKILL.md` to describe TypeScript runtime behavior and removed shell script references. Updated `docs/ralph/README.md` build wording to supervised default and aligned execution-mode text.
- **Files:** `.claude/skills/ralph-build/SKILL.md`, `.claude/skills/ralph-status/SKILL.md`, `docs/ralph/README.md`

### SUB-011
- **Problem:** `iteration-summary.md` still used legacy status vocabulary (`success|failure|partial`) that drifted from the canonical iteration diary schema and TypeScript `IterationStatus` union.
- **Changes:** Updated the iteration summary hook prompt to use `completed|failed|retrying` in the `{{STATUS}}` example value, output JSON contract, and all status examples so prompt guidance matches runtime/schema vocabulary exactly.
- **Files:** `context/workflows/ralph/hooks/iteration-summary.md`, `docs/planning/milestones/005-consolidate-simplify/subtasks.json`, `docs/planning/PROGRESS.md`

### SUB-012
- **Problem:** Planning workflow docs still mixed global subtask-ID guidance and old story/task naming patterns, conflicting with milestone-scoped naming and placement decisions.
- **Changes:** Updated subtask ID guidance to milestone-scoped queue allocation in `subtask-spec.md`, removed ALL-locations ID scan guidance from `subtasks-from-hierarchy.md`, switched story/task filename conventions to `<NNN>-STORY-<slug>.md` and `<NNN>-TASK-<slug>.md` with milestone-first placement in `stories-auto.md` and `tasks-auto.md`, and removed remaining "globally unique" subtask wording from `subtasks-from-source.md`.
- **Files:** `context/workflows/ralph/planning/subtask-spec.md`, `context/workflows/ralph/planning/subtasks-from-hierarchy.md`, `context/workflows/ralph/planning/stories-auto.md`, `context/workflows/ralph/planning/tasks-auto.md`, `context/workflows/ralph/planning/subtasks-from-source.md`, `docs/planning/milestones/005-consolidate-simplify/subtasks.json`, `docs/planning/PROGRESS.md`

### SUB-013
- **Problem:** Planning docs and skill surfaces still duplicated naming/subtask-ID guidance, increasing drift risk instead of using canonical atomic references.
- **Changes:** Replaced repeated naming/numbering blocks in `stories-auto.md` and `tasks-auto.md` with references to `@context/blocks/docs/naming-convention.md`, added a canonical-rules section to `.claude/skills/ralph-plan/SKILL.md`, and removed stale global-ID guidance in favor of milestone-scoped subtask ID references to `subtask-spec.md`.
- **Files:** `context/workflows/ralph/planning/stories-auto.md`, `context/workflows/ralph/planning/tasks-auto.md`, `.claude/skills/ralph-plan/SKILL.md`, `docs/planning/milestones/005-consolidate-simplify/subtasks.json`, `docs/planning/PROGRESS.md`

### SUB-014
- **Problem:** Phase 6 validation still needed explicit regression coverage for runtime assignment parity, shared headless/supervised assignment payload wiring, naming/file-local numbering behavior, and large completed queue edge handling.
- **Changes:** Expanded Ralph parity tests by asserting `subtasks next` and `build --print` select the same subtask ID, added a large completed queue (`50+`, `pending=0`) `--print` fixture to verify graceful bounded output, strengthened build unit coverage for shared assignment payload call-site parity and size-guidance behavior for large complete queues, and extended naming tests with explicit cross-milestone file-local `SUB-001` allocation checks.
- **Files:** `tools/tests/e2e/ralph.test.ts`, `tools/tests/lib/build.test.ts`, `tools/tests/lib/naming.test.ts`, `docs/planning/milestones/005-consolidate-simplify/subtasks.json`, `docs/planning/PROGRESS.md`

### SUB-015
- **Problem:** Remaining planning workflow docs still contained legacy global task/subtask numbering guidance (`ALL locations` scans) and inconsistent naming language after the initial normalization pass.
- **Changes:** Updated `subtasks-from-source.md` Phase 5 to explicitly require milestone-queue-only subtask ID allocation (no repo-wide scan), rewrote `tasks-interactive.md` and `tasks-from-source.md` task ID guidance to folder-local `<NNN>-TASK-<slug>.md` allocation from the destination folder, and updated `tasks-milestone.md` to calculate starting task IDs from the milestone task folder only.
- **Files:** `context/workflows/ralph/planning/subtasks-from-source.md`, `context/workflows/ralph/planning/tasks-interactive.md`, `context/workflows/ralph/planning/tasks-from-source.md`, `context/workflows/ralph/planning/tasks-milestone.md`, `docs/planning/milestones/005-consolidate-simplify/subtasks.json`, `docs/planning/PROGRESS.md`

### SUB-016
- **Problem:** Standalone `aaa task create`/`aaa story create` still defaulted to legacy global planning folders and lacked milestone-scoped placement controls.
- **Changes:** Added `--milestone <name|path>` support to both commands, wiring milestone resolution to create files in milestone `tasks/` and `stories/` directories using typed filename formats (`<NNN>-TASK-<slug>.md`, `<NNN>-STORY-<slug>.md`). Added deprecation warnings when commands run without `--milestone` and without `--dir`, updated CLI help text to recommend milestone-scoped usage, and added E2E + unit coverage for milestone placement, help text, and deprecation warnings.
- **Files:** `tools/src/commands/task.ts`, `tools/src/commands/story.ts`, `tools/src/cli.ts`, `tools/tests/e2e/task.test.ts`, `tools/tests/e2e/story.test.ts`, `tools/tests/lib/task-story-milestone.test.ts`, `tools/README.md`, `docs/planning/milestones/005-consolidate-simplify/subtasks.json`, `docs/planning/PROGRESS.md`

### SUB-017
- **Problem:** `aaa ralph plan subtasks` still mixed legacy `--review` wording into source-selection help/error/comments even though the actual source selector flag is `--review-diary`.
- **Changes:** Updated source-oriented subtasks messaging in `ralph/index.ts` so help description, multiple-source validation, and source-routing comments consistently use `--review-diary`; added E2E regression coverage that checks `--help`, missing-source guidance, and multiple-source error output for the review diary selector.
- **Files:** `tools/src/commands/ralph/index.ts`, `tools/tests/e2e/ralph.test.ts`, `docs/planning/milestones/005-consolidate-simplify/subtasks.json`, `docs/planning/PROGRESS.md`

### SUB-018
- **Problem:** Headless `ralph plan subtasks` could return provider success without any deterministic queue artifact update, which left runs falsely "successful" and could continue into cascade without observable subtask results.
- **Changes:** Hardened `runSubtasksHeadless()` to require an observable queue outcome by snapshotting `subtasks.json` before invocation and failing fast (exit 1) with a clear diagnostic when the queue is missing, invalid, or unchanged after provider success; updated summary counts to always include created/total from queue state; added E2E regression tests for the new failure path and the successful headless summary path (created count + output path) while preserving existing skip-path behavior.
- **Files:** `tools/src/commands/ralph/index.ts`, `tools/tests/e2e/ralph.test.ts`, `docs/planning/milestones/005-consolidate-simplify/subtasks.json`, `docs/planning/PROGRESS.md`

### SUB-019
- **Problem:** `subtasks-from-source.md` still included non-deterministic branches (`--1-to-1`, draft output, and review/triage loops) that slowed or prolonged headless runs.
- **Changes:** Refactored the workflow into a deterministic sequence (`parse -> analyze -> generate -> validate -> append -> summarize -> stop`), removed all `--1-to-1` guidance and examples, removed draft/reviewer/triage phase requirements, and added an explicit stop-immediately instruction after append and summary while retaining references to `subtask-spec.md` for schema and validation rules.
- **Files:** `context/workflows/ralph/planning/subtasks-from-source.md`, `docs/planning/milestones/005-consolidate-simplify/subtasks.json`, `docs/planning/PROGRESS.md`

### SUB-020
- **Problem:** Skill and README docs still included stale subtasks source-contract guidance (`--1-to-1`, `--review`) that no longer matches current user-facing behavior.
- **Changes:** Updated `.claude/skills/ralph-plan/SKILL.md` to remove all `--1-to-1` guidance and stale `aaa ralph plan subtasks --review` examples, and aligned remaining review-source references to `--review-diary`; removed the `--review-diary` example from the `tools/README.md` subtasks options block while preserving valid `--milestone`, `--story`, `--task`, `--file`, and `--text` examples.
- **Files:** `.claude/skills/ralph-plan/SKILL.md`, `tools/README.md`, `docs/planning/milestones/005-consolidate-simplify/subtasks.json`, `docs/planning/PROGRESS.md`

### SUB-021
- **Problem:** E2E coverage needed stronger regression assertions for the subtasks source contract (`--review-diary`) and deterministic headless failure when provider success produces no observable queue result.
- **Changes:** Expanded `ralph.test.ts` source-contract assertions to check help/missing-source text for `--review-diary` naming and added a dedicated headless regression that fails when provider execution returns success but leaves an existing queue unchanged; re-ran the full Ralph E2E suite plus targeted pre-check coverage to confirm existing skip behavior still passes.
- **Files:** `tools/tests/e2e/ralph.test.ts`, `docs/planning/milestones/005-consolidate-simplify/subtasks.json`, `docs/planning/PROGRESS.md`

## 2026-02-07

### SUB-413 (tracking sync)
- **Problem:** `SUB-413` remained pending in `subtasks.json` even though `validation-batch.test.ts` already covered all required batch orchestrator scenarios and summary/milestone assertions.
- **Changes:** Re-verified the SUB-413 acceptance criteria in `validation-batch.test.ts` (all-aligned batch result, headless failure hook behavior, supervised skip/continue handling, summary output assertions, milestone basename extraction), ran `bun test tests/lib/validation-batch.test.ts`, then marked the subtask complete with completion metadata.
- **Files:** `tools/tests/lib/validation-batch.test.ts`, `docs/planning/milestones/003-ralph-workflow/subtasks.json`, `docs/planning/PROGRESS.md`

### SUB-412 (tracking sync)
- **Problem:** `SUB-412` remained pending in `subtasks.json` even though build-loop batch validation integration and skip tracking were already implemented in `build.ts` with dedicated integration coverage.
- **Changes:** Re-verified `build.ts` against all acceptance criteria (validation import wiring, pre-build pending-subtask batch validation call, skipped-ID mapping, and iteration skip gate), ran `bun test tests/lib/build-validation-integration.test.ts` and `bun run typecheck`, then marked `SUB-412` complete with implementation commit/session metadata.
- **Files:** `tools/src/commands/ralph/build.ts`, `tools/tests/lib/build-validation-integration.test.ts`, `docs/planning/milestones/003-ralph-workflow/subtasks.json`, `docs/planning/PROGRESS.md`

### SUB-411 (tracking sync)
- **Problem:** `SUB-411` remained pending in `subtasks.json` even though batch validation orchestration and summary reporting were already implemented in `validation.ts` with dedicated unit coverage.
- **Changes:** Re-verified `BatchValidationResult`, `validateAllSubtasks()`, `printValidationSummary()`, and `getMilestoneFromPath()` against all acceptance criteria, ran `bun test tests/lib/validation-batch.test.ts` and `bun run typecheck`, then marked `SUB-411` complete with completion metadata.
- **Files:** `tools/src/commands/ralph/validation.ts`, `tools/tests/lib/validation-batch.test.ts`, `docs/planning/milestones/003-ralph-workflow/subtasks.json`, `docs/planning/PROGRESS.md`

### SUB-409
- **Problem:** `handleHeadlessValidationFailure()` needed to guarantee an absolute feedback file path and strict date-based filename generation for headless validation output.
- **Changes:** Updated `validation.ts` to resolve `milestonePath` before file I/O and use `new Date().toISOString().split("T")[0]` for the filename prefix; extended `validation-headless.test.ts` to call the handler with a relative milestone path while asserting absolute return-path behavior, file naming, file content, and log output.
- **Files:** `tools/src/commands/ralph/validation.ts`, `tools/tests/lib/validation-headless.test.ts`, `docs/planning/milestones/003-ralph-workflow/subtasks.json`, `docs/planning/PROGRESS.md`

### SUB-408 (tracking sync)
- **Problem:** `SUB-408` was still pending in `subtasks.json` even though `SkippedSubtask` and `generateValidationFeedback()` were already implemented with dedicated headless validation tests.
- **Changes:** Re-verified `validation.ts` exports and markdown-generation behavior against all acceptance criteria, ran `bun test tests/lib/validation-headless.test.ts` and `bun run typecheck`, then marked `SUB-408` complete with implementation commit/session metadata.
- **Files:** `tools/src/commands/ralph/validation.ts`, `tools/tests/lib/validation-headless.test.ts`, `docs/planning/milestones/003-ralph-workflow/subtasks.json`, `docs/planning/PROGRESS.md`

### SUB-403 (tracking sync)
- **Problem:** `SUB-403` was pending in `subtasks.json` even though validation invocation and timeout handling were already implemented and covered by unit tests.
- **Changes:** Re-verified `validateSubtask()` behavior in `validation.ts` against all acceptance criteria (start log, provider invocation with `VALIDATION_TIMEOUT_MS`, timeout/failure fail-open warnings, and parser handoff), ran `bun test tests/lib/validation-invoke.test.ts`, then marked `SUB-403` complete with implementation commit/session metadata.
- **Files:** `tools/src/commands/ralph/validation.ts`, `tools/tests/lib/validation-invoke.test.ts`, `docs/planning/milestones/003-ralph-workflow/subtasks.json`, `docs/planning/PROGRESS.md`

### SUB-406 (tracking sync)
- **Problem:** `SUB-406` was marked pending in `subtasks.json` even though supervised validation failure display and prompt handling were already implemented and covered by unit tests.
- **Changes:** Re-verified supervised-mode acceptance criteria in `validation.ts` and `validation.test.ts`, ran `bun test tests/lib/validation.test.ts` and `bun run typecheck`, then marked `SUB-406` complete with completion metadata referencing the implementation commit.
- **Files:** `tools/src/commands/ralph/validation.ts`, `tools/tests/lib/validation.test.ts`, `docs/planning/milestones/003-ralph-workflow/subtasks.json`, `docs/planning/PROGRESS.md`

### SUB-405 (tracking sync)
- **Problem:** `SUB-405` was still marked pending in `subtasks.json` even though `validation.ts` already exported `SupervisedValidationAction`, `formatIssueType()`, and `wrapText()` with unit coverage.
- **Changes:** Re-verified all `SUB-405` acceptance criteria against `validation.ts` and `validation.test.ts`, ran `bun test tests/lib/validation.test.ts` plus `bun run typecheck`, and marked the subtask complete with implementation commit/session metadata.
- **Files:** `tools/src/commands/ralph/validation.ts`, `tools/tests/lib/validation.test.ts`, `docs/planning/milestones/003-ralph-workflow/subtasks.json`, `docs/planning/PROGRESS.md`

### SUB-402 (tracking sync)
- **Problem:** `SUB-402` remained pending in the queue even though parent-chain resolution and validation prompt assembly were already implemented and tested.
- **Changes:** Re-verified `resolveParentTask()`, `resolveParentStory()`, and `buildValidationPrompt()` in `validation.ts`, ran `bun test ./tests/lib/validation-prompt.test.ts`, confirmed acceptance-criteria coverage (full chain, missing task/story, missing storyRef, missing prompt template, storyRef regex), and marked `SUB-402` complete with implementation commit/session metadata.
- **Files:** `tools/src/commands/ralph/validation.ts`, `tools/tests/lib/validation-prompt.test.ts`, `docs/planning/milestones/003-ralph-workflow/subtasks.json`, `docs/planning/PROGRESS.md`

### SUB-400
- **Problem:** Validation parser scenario coverage needed to explicitly assert warning behavior for missing `aligned` field handling while completing the TASK-016 parser test matrix.
- **Changes:** Tightened `validation.test.ts` by asserting `console.warn` output for the missing-`aligned` response path, then re-ran targeted validation parser tests to confirm all parsing scenarios pass.
- **Files:** `tools/tests/lib/validation.test.ts`, `docs/planning/milestones/003-ralph-workflow/subtasks.json`, `docs/planning/PROGRESS.md`

### SUB-399 (tracking sync)
- **Problem:** `SUB-399` was still marked pending in `subtasks.json` even though the validation parser/types implementation and tests had already landed.
- **Changes:** Re-validated `validation.ts` and `validation.test.ts` against the TASK-016 acceptance criteria (including parser behavior and type exports), ran targeted validation tests plus `bun run typecheck`, then marked `SUB-399` done with completion metadata pointing to the original implementation commit.
- **Files:** `tools/src/commands/ralph/validation.ts`, `tools/tests/lib/validation.test.ts`, `docs/planning/milestones/003-ralph-workflow/subtasks.json`, `docs/planning/PROGRESS.md`

### SUB-388
- **Problem:** SUB-388 remained pending in `subtasks.json` even though `generateSummary()` had already been refactored to use centralized template substitution.
- **Changes:** Re-verified `post-iteration.ts` uses `substituteTemplate()` with typed template variables and deferred session-content replacement, re-ran targeted unit and E2E post-iteration tests, then marked SUB-388 done with completion metadata.
- **Files:** `tools/src/commands/ralph/post-iteration.ts`, `tools/tests/lib/post-iteration.test.ts`, `tools/tests/e2e/ralph.test.ts`, `docs/planning/milestones/003-ralph-workflow/subtasks.json`, `docs/planning/PROGRESS.md`

### SUB-393
- **Problem:** `generateSummary()` needed complete substitution support for `SESSION_JSONL_PATH`, `SUBTASK_DESCRIPTION`, and `SESSION_JSONL_CONTENT`, including null-safe handling for missing session paths.
- **Changes:** Updated post-iteration summary generation to always populate the three variables (`SESSION_JSONL_PATH` now defaults to an empty string when `sessionPath` is null) and added regression coverage that validates null-path behavior plus content aliasing in prompt substitution.
- **Files:** `tools/src/commands/ralph/post-iteration.ts`, `tools/tests/lib/post-iteration.test.ts`, `docs/planning/milestones/003-ralph-workflow/subtasks.json`, `docs/planning/PROGRESS.md`

### SUB-383
- **Problem:** SUB-383 was still pending in the queue and needed completion evidence for the new template variable typing contract.
- **Changes:** Verified `TemplateVariables` already exports all 10 required keys with per-property purpose/source/format JSDoc, confirmed `substituteTemplate()` accepts `Partial<TemplateVariables>`, and validated targeted unit tests plus typecheck before marking the subtask complete in tracking.
- **Files:** `tools/src/commands/ralph/template.ts`, `tools/tests/lib/template.test.ts`, `docs/planning/milestones/003-ralph-workflow/subtasks.json`, `docs/planning/PROGRESS.md`

### SUB-378
- **Problem:** The queue still listed SUB-378 as pending even though the template substitution utility and its unit coverage were already implemented, so Ralph could not treat the task as complete.
- **Changes:** Re-validated the existing `substituteTemplate()` implementation and template unit suite, then reconciled queue metadata by marking SUB-378 done with completion timestamp, implementation commit hash, and current session ID.
- **Files:** `tools/src/commands/ralph/template.ts`, `tools/tests/lib/template.test.ts`, `docs/planning/milestones/003-ralph-workflow/subtasks.json`, `docs/planning/PROGRESS.md`

### SUB-413
- **Problem:** Batch validation orchestrator coverage was missing required scenarios for all-aligned results, supervised skip behavior, and summary label assertions tied to task acceptance criteria.
- **Changes:** Expanded `validation-batch.test.ts` with new unit coverage for all-aligned `validateAllSubtasks()` success output, supervised mode skip-path accumulation, and updated skipped-summary assertions using explicit subtask IDs and formatted issue labels; retained and validated headless hook and milestone extraction tests.
- **Files:** `tools/tests/lib/validation-batch.test.ts`, `docs/planning/milestones/003-ralph-workflow/subtasks.json`, `docs/planning/PROGRESS.md`

### SUB-412
- **Problem:** `ralph build --validate-first` still used a stub log, so batch validation results were not wired into iteration selection and misaligned subtasks were not excluded.
- **Changes:** Integrated `validateAllSubtasks()` into `runBuild()` preflight, added typed `skippedSubtaskIds` tracking initialized to `null`, and added iteration-level skip gating for validated failures with `Skipping <id> (failed validation)` logging. Added static integration coverage in `build-validation-integration.test.ts` for import wiring, pending subtask flow, skipped-ID mapping, and loop skip behavior.
- **Files:** `tools/src/commands/ralph/build.ts`, `tools/tests/lib/build-validation-integration.test.ts`, `docs/planning/milestones/003-ralph-workflow/subtasks.json`, `docs/planning/PROGRESS.md`

### SUB-411
- **Problem:** Pre-build validation had single-subtask pieces but no batch orchestrator to validate all pending subtasks, report results, and trigger failure hooks before build iterations.
- **Changes:** Added and exported `BatchValidationResult`, `validateAllSubtasks()`, `printValidationSummary()`, and `getMilestoneFromPath()` in `validation.ts`. The batch flow now validates pending subtasks sequentially, logs aligned/misaligned status with chalk colors, handles supervised continue/skip decisions, writes headless feedback via `handleHeadlessValidationFailure()`, and executes `executeHook("onValidationFail", { subtaskId, milestone, message })` per headless failure. Added `validation-batch.test.ts` for supervised continue accounting, headless skip + hook behavior, summary output, and milestone basename extraction.
- **Files:** `tools/src/commands/ralph/validation.ts`, `tools/tests/lib/validation-batch.test.ts`

### SUB-409
- **Problem:** Headless pre-build validation needed a concrete file writer to persist misalignment feedback for skipped subtasks.
- **Changes:** Added and exported `handleHeadlessValidationFailure(subtask, result, milestonePath)` in `validation.ts`; it now creates `<milestone>/feedback`, writes `YYYY-MM-DD_validation_<subtask.id>.md` from `generateValidationFeedback()`, logs the output path, and returns the created file path. Expanded `validation-headless.test.ts` with temp-dir lifecycle coverage for feedback directory creation, filename pattern, content checks (including reason), returned path equality, and console log assertions.
- **Files:** `tools/src/commands/ralph/validation.ts`, `tools/tests/lib/validation-headless.test.ts`

### SUB-408
- **Problem:** Headless validation flow needed a reusable markdown generator and typed skip-tracking record for misaligned subtasks before build iterations continue.
- **Changes:** Added and exported `SkippedSubtask` plus pure `generateValidationFeedback(subtask, result)` in `validation.ts` to emit self-contained markdown with header metadata, failure reason defaults, optional suggestion section, subtask JSON block, and three resolution options. Added `validation-headless.test.ts` covering required sections, suggestion include/omit behavior, storyRef include/omit behavior, subtask JSON presence, issue-type label formatting, and unknown/default fallbacks.
- **Files:** `tools/src/commands/ralph/validation.ts`, `tools/tests/lib/validation-headless.test.ts`

### SUB-403
- **Problem:** Pre-build validation still lacked the provider invocation layer to run a single-subtask check with timeout-aware fail-open behavior.
- **Changes:** Added `validateSubtask()` and exported `VALIDATION_TIMEOUT_MS` in `validation.ts`; the function now logs the start line, builds the validation prompt, invokes `invokeProviderSummary()` with a 60-second timeout, distinguishes timeout-vs-invocation-failure null outcomes for warning text, and parses successful string responses via `parseValidationResponse()`. Added `validation-invoke.test.ts` with mocked provider invocation coverage for timeout path, invocation-failure path, aligned parse path, and misaligned parse path.
- **Files:** `tools/src/commands/ralph/validation.ts`, `tools/tests/lib/validation-invoke.test.ts`

### SUB-406
- **Problem:** Supervised pre-build validation still needed a user-facing failure display and deterministic skip/continue prompt handling for TTY and non-TTY execution paths.
- **Changes:** Added and exported `handleSupervisedValidationFailure()` in `validation.ts` to render a fixed-width (64-char) Unicode box with yellow borders, formatted issue labels, and wrapped reason/suggestion content at 56 characters. Added and exported `promptSkipOrContinue()` using `node:readline` with `Skip SUB-XXX? [Y/n]` semantics (`Enter/y/yes => "skip"`, `n/no => "continue"`), non-TTY default skip behavior, and SIGINT propagation via `process.emit("SIGINT")`. Expanded `validation.test.ts` with unit coverage for prompt decision paths, non-TTY fallback, SIGINT propagation, and supervised failure box logging assertions.
- **Files:** `tools/src/commands/ralph/validation.ts`, `tools/tests/lib/validation.test.ts`

### SUB-405
- **Problem:** Supervised pre-build validation lacked local helpers to format issue labels and wrap long reason/suggestion text for fixed-width Unicode box rendering.
- **Changes:** Added and exported `SupervisedValidationAction` (`"continue" | "skip"`), `formatIssueType()` with friendly labels for all four known issue types plus raw-string fallback, and `wrapText()` with word-boundary wrapping, long-word truncation, and guaranteed non-empty output for empty strings. Expanded unit tests to cover all required format and wrapping edge cases plus export availability.
- **Files:** `tools/src/commands/ralph/validation.ts`, `tools/tests/lib/validation.test.ts`

### SUB-402
- **Problem:** Pre-build validation still lacked parent chain resolution and prompt assembly, so build-time validation could not include parent task/story context or graceful placeholders.
- **Changes:** Added `resolveParentTask()`, `resolveParentStory()`, and `buildValidationPrompt()` in `validation.ts` to load parent files by ref-prefix matching, extract story refs from `**Story:**` markdown links, throw when the base prompt template is missing, and include `*Not found: <ref>*` placeholders when parent files are absent. Added comprehensive temp-directory unit coverage for full chain assembly, missing task/story handling, no-story-link behavior, missing prompt template errors, and storyRef extraction.
- **Files:** `tools/src/commands/ralph/validation.ts`, `tools/tests/lib/validation-prompt.test.ts`

### SUB-400
- **Problem:** Validation parsing behavior needed explicit, scenario-driven unit coverage to lock parser behavior for aligned/misaligned responses and fail-open warning cases.
- **Changes:** Updated `validation.test.ts` to cover the TASK-016 matrix: aligned parsing, full misaligned parsing, fenced markdown JSON extraction, empty/invalid input warnings, missing `aligned` handling, explicit `parseIssueType` valid/invalid checks, and partial misaligned defaults for reason/suggestion.
- **Files:** `tools/tests/lib/validation.test.ts`

### SUB-399
- **Problem:** Ralph pre-build validation needed a typed response contract and safe parser for Claude JSON output, including fenced markdown extraction and fail-open behavior.
- **Changes:** Added `validation.ts` with exported `ValidationIssueType`, `ValidationResult`, and `ValidationContext` plus `parseIssueType()` and `parseValidationResponse()` to validate `aligned`, extract misalignment details, and warn/return `{ aligned: true }` on malformed responses. Added focused unit tests covering aligned/misaligned parsing, markdown code block extraction, invalid/missing JSON warnings, invalid `aligned` type, and default values.
- **Files:** `tools/src/commands/ralph/validation.ts`, `tools/tests/lib/validation.test.ts`

### SUB-398
- **Problem:** `iteration-summary.md` still documented template inputs as ad-hoc required/optional lists instead of a complete, structured variable contract.
- **Changes:** Replaced "Required Inputs" and "Optional Context Fields" with an "Available Template Variables" markdown table covering all 10 supported substitutions (`SUBTASK_ID`, `SUBTASK_TITLE`, `SUBTASK_DESCRIPTION`, `STATUS`, `MILESTONE`, `TASK_REF`, `ITERATION_NUM`, `SESSION_CONTENT`, `SESSION_JSONL_PATH`, `SESSION_JSONL_CONTENT`) including description, example, and required/optional status. Added notes that missing variables remain literal `{{VAR}}` text and that `SESSION_CONTENT` is substituted last.
- **Files:** `context/workflows/ralph/hooks/iteration-summary.md`

### SUB-398 (tracking sync)
- **Problem:** Queue state was stale: SUB-398 remained pending in `subtasks.json` even though `iteration-summary.md` already matched the required variable-documentation contract.
- **Changes:** Re-verified all four acceptance criteria directly in the prompt template (table structure, all 10 variables, literal `{{VAR}}` fallback note, and `SESSION_CONTENT` substitution ordering note), then marked SUB-398 complete in queue metadata with timestamp/commit/session fields.
- **Files:** `context/workflows/ralph/hooks/iteration-summary.md`, `docs/planning/milestones/003-ralph-workflow/subtasks.json`, `docs/planning/PROGRESS.md`

### SUB-393
- **Problem:** `generateSummary()` did not populate `SESSION_JSONL_PATH`, `SUBTASK_DESCRIPTION`, or `SESSION_JSONL_CONTENT`, so story-defined prompt placeholders were not fully available.
- **Changes:** Added template variable mapping for `SESSION_JSONL_PATH` and `SUBTASK_DESCRIPTION`, mapped `SESSION_JSONL_CONTENT` to the same deferred token flow used for `SESSION_CONTENT`, and expanded post-iteration unit tests to verify all three placeholders populate correctly plus nullish-input handling.
- **Files:** `tools/src/commands/ralph/post-iteration.ts`, `tools/tests/lib/post-iteration.test.ts`

### SUB-388
- **Problem:** `generateSummary()` in `post-iteration.ts` still used an inline `replaceAll()` chain, duplicating template logic and bypassing centralized missing-variable warning behavior.
- **Changes:** Switched prompt substitution to `substituteTemplate()` with a typed `Partial<TemplateVariables>` for core variables (`SUBTASK_ID`, `STATUS`, `SUBTASK_TITLE`, `MILESTONE`, `TASK_REF`, `ITERATION_NUM`) and kept `SESSION_CONTENT` applied last via a deferred token replacement. Added regression tests validating all seven variables still substitute correctly, `SESSION_CONTENT` remains last and preserves `{{...}}` content from session logs, and missing variables warn without breaking summary generation.
- **Files:** `tools/src/commands/ralph/post-iteration.ts`, `tools/tests/lib/post-iteration.test.ts`

### SUB-383
- **Problem:** Template variable support lacked a formal, documented contract for all story-required placeholders and backward-compatible aliases.
- **Changes:** Added an exported `TemplateVariables` interface in `template.ts` with all 10 supported variables and per-property JSDoc covering purpose/source/format; kept `substituteTemplate()` explicitly typed to accept `Partial<TemplateVariables>`; added unit coverage that verifies partial substitution usage and asserts the full key set.
- **Files:** `tools/src/commands/ralph/template.ts`, `tools/tests/lib/template.test.ts`

### SUB-378
- **Problem:** Template placeholder substitution logic was duplicated inline, with no shared utility or explicit warning behavior for missing variables.
- **Changes:** Added a new `substituteTemplate()` utility and `TemplateVariables` type in `tools/src/commands/ralph/template.ts` that replace `{{VAR}}` placeholders, preserve missing placeholders as literals, and emit `console.warn` for missing/undefined values. Added unit tests covering basic and multi-variable substitution, missing-variable warning + literal preservation, undefined handling, empty template, and no-placeholder passthrough.
- **Files:** `tools/src/commands/ralph/template.ts`, `tools/tests/lib/template.test.ts`

### SUB-240
- **Problem:** Cascade target validation allowed planning-level paths that were not executable, causing late failures with generic "planning level not yet implemented" errors.
- **Changes:** Added runnable-level aware cascade validation that rejects non-executable paths early with explicit unsupported-level and supported-target guidance. Added early `--cascade` validation for roadmap/stories/tasks/subtasks entry commands, and updated unit/E2E regression coverage to assert the new early-failure messaging and supported-target lists.
- **Files:** `tools/src/commands/ralph/cascade.ts`, `tools/src/commands/ralph/index.ts`, `tools/tests/lib/cascade.test.ts`, `tools/tests/e2e/ralph.test.ts`

### SUB-239
- **Problem:** Cascade provider/model forwarding behavior needed explicit regression coverage to prove context survives handoff from `runCascadeFrom()` into `runLevel()` and downstream build/calibrate dispatch.
- **Changes:** Added a dedicated unit test suite that mocks `build` and `calibrate` modules to verify `runLevel("build")` forwards `provider`/`model` to `runBuild`, `runLevel("calibrate")` forwards them to `runCalibrate`, cascade handoff preserves both values, and omission remains backward-compatible.
- **Files:** `tools/tests/lib/cascade-provider-forwarding.test.ts`

### SUB-224
- **Problem:** `handleNotifyWait()` needed explicit unit coverage for notify config edge cases and wait-duration defaults to keep headless suggest-mode behavior deterministic.
- **Changes:** Extended `approvals.test.ts` with cases that verify notify skip + wait when server/topic is missing, and default 180-second fallback when `suggestWaitSeconds` is undefined; kept `sendNotification` and timer interactions mocked to avoid real side effects.
- **Files:** `tools/tests/lib/approvals.test.ts`

### SUB-223
- **Problem:** `checkApprovalGate()` needed to use the real notify-wait handler path so headless suggest approvals notify, wait, and continue deterministically instead of relying on placeholder behavior.
- **Changes:** Updated `checkApprovalGate()` to pass `approvalConfig` into `handleNotifyWait()` with summary text `Proceeding with {level} level` and continue after completion; aligned cascade approval regression coverage by mocking `handleNotifyWait()` and asserting the exact call contract in `cascade-approval.test.ts`.
- **Files:** `tools/src/commands/ralph/cascade.ts`, `tools/tests/lib/cascade-approval.test.ts`

### SUB-238
- **Problem:** Notify-wait approval output depends on exported gate-name formatting and regression checks, but explicit coverage for `createRoadmap` was missing from current unit tests.
- **Changes:** Added a `formatGateName("createRoadmap") === "Create Roadmap"` unit test in the approvals suite to lock the formatter behavior used in notification titles and console output; verified existing exports already include `ApprovalAction`, `ApprovalContext`, `DEFAULT_SUGGEST_WAIT_SECONDS`, `evaluateApproval`, `formatGateName`, and `handleNotifyWait`.
- **Files:** `tools/tests/lib/approvals.test.ts`

### SUB-237
- **Problem:** Headless suggest-mode approvals still used a placeholder notify-wait path, so cascade execution could not notify users, pause for a configured window, and then continue safely.
- **Changes:** Added `DEFAULT_SUGGEST_WAIT_SECONDS`, `sleep()`, and `handleNotifyWait()` in `approvals.ts` with config-aware notification delivery, skip behavior when notifications are disabled/misconfigured, warning-only error handling, and wait/complete logging. Updated `checkApprovalGate()` in `cascade.ts` to call `handleNotifyWait()` for `"notify-wait"` actions. Added unit tests for wait timing, default fallback, notification payload/skip/error behavior, and cascade dispatch integration.
- **Files:** `tools/src/commands/ralph/approvals.ts`, `tools/src/commands/ralph/cascade.ts`, `tools/tests/lib/approvals.test.ts`, `tools/tests/lib/cascade.test.ts`

### SUB-233
- **Problem:** Cascade approval integration needed dedicated unit coverage in a focused test file for gate mapping, approval context construction, and action-dispatch behavior.
- **Changes:** Added `cascade-approval.test.ts` with tests for `levelToGate` mappings (including null gates for build/calibrate), `buildApprovalContext` flag/isTTY behavior, and `checkApprovalGate` dispatch outcomes (`continue`, `aborted`, `exit-unstaged`) using mocked `evaluateApproval` and `promptApproval`.
- **Files:** `tools/tests/lib/cascade-approval.test.ts`

### SUB-232
- **Problem:** Cascade execution needed complete approval integration so each level evaluates approval gates consistently, supports abort/exit flows, and preserves provider/model context for downstream execution.
- **Changes:** Updated `checkApprovalGate()` to run per-level gate evaluation with explicit action dispatch (`write`, `prompt`, `notify-wait`, `exit-unstaged`) and placeholder logging for notify/exit paths, while keeping exit-unstaged artifact checkpoint handling when cascade metadata is present. Updated `runCascadeFrom()` to pass approval metadata through context and continue forwarding provider/model into `runLevel()` options. Expanded `cascade.test.ts` with approval-action unit coverage for no-gate continue, write continue, prompt abort path, notify-wait logging, and exit-unstaged behavior.
- **Files:** `tools/src/commands/ralph/cascade.ts`, `tools/tests/lib/cascade.test.ts`

### SUB-218
- **Problem:** Approval control flags lacked E2E coverage for invalid `--from` handling and explicit provider-aware validation paths, leaving gaps in regression protection for `TASK-011`.
- **Changes:** Added E2E tests in `ralph.test.ts` to verify `ralph plan subtasks --from invalid-level` fails with exit code 1 and prints valid levels, and to confirm `--force --review` mutual-exclusion behavior is unchanged when `--provider opencode` is explicitly supplied. Existing help/mutual-exclusion approval-flag tests for `ralph build` and `ralph plan subtasks` continue to run in the same suite.
- **Files:** `tools/tests/e2e/ralph.test.ts`

### SUB-217
- **Problem:** `ralph plan subtasks` lacked approval control flags and had no way to forward those approval overrides (and provider/model consistency) into cascade execution; additionally, its existing `--review` source flag conflicted with the new approval-review flag name.
- **Changes:** Added `--force`, `--review`, and `--from <level>` to subtasks planning, called `validateApprovalFlags()` at the top of the action, and forwarded `forceFlag`, `reviewFlag`, `fromLevel` (`options.from ?? "subtasks"`), `provider`, and `model` into `handleCascadeExecution()` for `--cascade` runs. Renamed the review diary source selector to `--review-diary` to avoid the flag collision and updated help/docs/completion entries plus E2E coverage for subtasks approval flag help and early mutual-exclusion validation.
- **Files:** `tools/src/commands/ralph/index.ts`, `tools/tests/e2e/ralph.test.ts`, `tools/README.md`, `tools/src/commands/completion/bash.ts`, `tools/src/commands/completion/zsh.ts`, `tools/src/commands/completion/fish.ts`

### SUB-216
- **Problem:** `ralph plan tasks` did not expose approval override flags or cascade resume-from control, and tasks cascades were not forwarding approval context through the shared cascade helper.
- **Changes:** Added `--force`, `--review`, and `--from <level>` options to tasks planning; called `validateApprovalFlags()` at the start of the tasks action; and forwarded `forceFlag`, `reviewFlag`, `fromLevel` (`options.from ?? "tasks"`), `provider`, and `model` into `handleCascadeExecution()` when `--cascade` is used. Added E2E coverage for tasks help flag visibility and early mutual-exclusion validation.
- **Files:** `tools/src/commands/ralph/index.ts`, `tools/tests/e2e/ralph.test.ts`

### SUB-222
- **Problem:** `ralph plan stories` lacked approval override flags and direct cascade handoff through the shared helper, so stories cascades could miss approval/provider/model context and had no resume-from control.
- **Changes:** Added `--force`, `--review`, and `--from <level>` options to stories planning; called `validateApprovalFlags()` at the top of the stories action; and switched stories cascade handling to `handleCascadeExecution()` with forwarded `forceFlag`, `reviewFlag`, `fromLevel` (`options.from ?? "stories"`), `provider`, and `model`. Added E2E coverage for stories help flag visibility and early mutual-exclusion validation.
- **Files:** `tools/src/commands/ralph/index.ts`, `tools/tests/e2e/ralph.test.ts`, `tools/README.md`

### SUB-221
- **Problem:** `ralph plan roadmap` did not expose approval override flags or cascade resume-from support, and its cascade path bypassed the shared helper used by other planning levels.
- **Changes:** Added `--force`, `--review`, and `--from <level>` options to roadmap planning; called `validateApprovalFlags()` at the start of the roadmap action; and switched roadmap cascade handling to `handleCascadeExecution()` while forwarding `forceFlag`, `reviewFlag`, and `fromLevel` (`options.from ?? "roadmap"`). Added E2E coverage for roadmap help output and early mutually-exclusive approval flag validation.
- **Files:** `tools/src/commands/ralph/index.ts`, `tools/tests/e2e/ralph.test.ts`

### SUB-220
- **Problem:** `ralph build` did not expose approval override and cascade-resume flags, and cascade handoff from build could drop approval/provider/model context.
- **Changes:** Added `--force`, `--review`, and `--from <level>` options to `ralph build`; called `validateApprovalFlags()` at the start of the build action; forwarded force/review/from plus provider/model into `runCascadeFrom()` when `--cascade` is used. Added E2E coverage for build help flag visibility and early mutual-exclusion validation.
- **Files:** `tools/src/commands/ralph/index.ts`, `tools/tests/e2e/ralph.test.ts`

### SUB-211
- **Problem:** `HandleCascadeOptions` in `ralph/index.ts` did not carry approval/provider context through the cascade helper, so downstream cascade execution could lose originating CLI context.
- **Changes:** Added `forceFlag`, `reviewFlag`, `fromLevel`, `provider`, and `model` to `HandleCascadeOptions`; updated `handleCascadeExecution()` to pass those fields through to `runCascadeFrom()`; and threaded `provider`/`model` from tasks/subtasks command options into the helper calls.
- **Files:** `tools/src/commands/ralph/index.ts`

### SUB-219
- **Problem:** Cascade option types did not carry approval override flags or provider/model overrides end-to-end, so cascaded `runLevel()` calls could lose approval semantics and provider continuity.
- **Changes:** Extended `CascadeFromOptions` and `RunLevelOptions` with `forceFlag`, `reviewFlag`, `provider`, and `model` plus JSDoc semantics, wired `buildApprovalContext()` to consume approval flags, threaded the fields through `runCascadeFrom()` into `runLevel()`, and forwarded provider/model to `runBuild()` plus force/review + provider/model to `runCalibrate()`. Added unit assertions for approval context propagation and run-level options acceptance.
- **Files:** `tools/src/commands/ralph/cascade.ts`, `tools/tests/lib/cascade.test.ts`

### SUB-210
- **Problem:** `runCascadeFrom()` could not override the cascade entry point when resuming a flow, and it lacked explicit `fromLevel` validation/error handling.
- **Changes:** Added optional `fromLevel?: string` to `CascadeFromOptions`, introduced `effectiveStart` in `runCascadeFrom()`, validated `fromLevel` with `isValidLevelName()` before target validation, and routed validation/range/stopped-at logic through the effective start level. Added unit tests for invalid `fromLevel` errors (with valid-level list) and for override behavior changing the first executed level.
- **Files:** `tools/src/commands/ralph/cascade.ts`, `tools/tests/lib/cascade.test.ts`

### SUB-226
- **Problem:** Cascade approval flow still used a placeholder for `exit-unstaged`, so headless `always` approvals could not checkpoint before generation, finalize feedback artifacts after generation, or return a clean manual-review stop state.
- **Changes:** Integrated approval-gate wiring in `cascade.ts` with `prepareExitUnstaged()` in `checkApprovalGate()`, added `milestonePath?: string` to `CascadeFromOptions`, and added post-level `finalizeExitUnstaged()` handling in `runCascadeFrom()` that returns `success: false`, `error: null`, and `stoppedAt` at the current level for manual review handoff. Added unit coverage for gate mapping, approval context building, and the exit-unstaged gate path.
- **Files:** `tools/src/commands/ralph/cascade.ts`, `tools/tests/lib/cascade.test.ts`

### SUB-231
- **Problem:** Exit-unstaged workflow lacked E2E coverage for checkpoint behavior, feedback artifact content, and end-to-end prepare/finalize integration.
- **Changes:** Added `tools/tests/e2e/approvals.test.ts` with E2E cases for `gitCheckpoint()` clean-tree false return, dirty-tree checkpoint commit creation, `writeFeedbackFile()` output in `feedback/` with approve/reject/modify content and resume command, plus a full headless always-mode flow that verifies `evaluateApproval()` returns `exit-unstaged`, checkpoint preparation runs, a simulated level execution occurs, feedback is written, and instructions are printed.
- **Files:** `tools/tests/e2e/approvals.test.ts`

### SUB-225
- **Problem:** The exit-unstaged approval path needed concrete helper functions for checkpointing git state, writing reviewer feedback artifacts, and printing deterministic resume instructions for headless approval pauses.
- **Changes:** Expanded `approvals.ts` with artifact-centric `ApprovalGate`, `FeedbackContext`/`ExitUnstagedContext`, `gitCheckpoint()`, `getNextLevel()`, `writeFeedbackFile()`, `printExitInstructions()`, and two-phase `prepareExitUnstaged()` + `finalizeExitUnstaged()` handlers; added focused unit coverage for checkpoint behavior, next-level mapping, feedback content, exit instructions, and phase handler behavior.
- **Files:** `tools/src/commands/ralph/approvals.ts`, `tools/tests/lib/approvals.test.ts`

### SUB-212
- **Problem:** Calibrate CLI accepted both `--force` and `--review` together, which creates conflicting approval override semantics.
- **Changes:** Added `validateApprovalFlags()` in `ralph/index.ts`, wired it into `runCalibrateSubcommand()`, and added unit tests for valid flag combinations and the mutual-exclusion error/exit path.
- **Files:** `tools/src/commands/ralph/index.ts`, `tools/tests/lib/ralph-index.test.ts`

### SUB-215
- **Problem:** Approval prompt coverage still missed explicit unit checks for some gate-name display mappings and module export verification expected by TASK-012.
- **Changes:** Extended `approvals.test.ts` with explicit `formatGateName()` tests for `createRoadmap` and `createAtomicDocs`, a full all-gates mapping assertion, export checks for `evaluateApproval`, `formatGateName`, and `promptApproval`, compile-time type usage for `ApprovalAction` and `ApprovalContext`, and a documented manual promptApproval TTY/headless test plan comment block.
- **Files:** `tools/tests/lib/approvals.test.ts`

### SUB-214
- **Problem:** Ralph approval flow needed an interactive TTY prompt helper to show artifact context and collect explicit approval decisions for `"prompt"` gates.
- **Changes:** Added and exported `promptApproval(gate, summary)` in `approvals.ts` using `readline.createInterface` with `process.stdin/stdout`, formatted gate display via `formatGateName()`, prompt text `Approve? [Y/n]: `, default-yes behavior, and explicit reject on `n/no`. Added unit tests covering display order, prompt text, input handling, interface creation, and close lifecycle.
- **Files:** `tools/src/commands/ralph/approvals.ts`, `tools/tests/lib/approvals.test.ts`

### SUB-213
- **Problem:** Approval gates needed a reusable helper to convert internal camelCase gate IDs into user-facing labels for TTY approval prompts.
- **Changes:** Added and exported `formatGateName(gate: ApprovalGate): string` in `approvals.ts`, with create/on prefix handling plus camelCase spacing; added unit tests covering all required gate display mappings.
- **Files:** `tools/src/commands/ralph/approvals.ts`, `tools/tests/lib/approvals.test.ts`

### 2026-02-07

#### SUB-208
- **Problem:** Needed targeted regression coverage for `evaluateApproval()` CLI override behavior so `--force` and `--review` semantics stay deterministic across TTY/headless execution.
- **Changes:** Updated `approvals.test.ts` with explicit override-focused unit tests for `--force` (`auto`+TTY and `always`+headless) and gate-wide `--review` behavior (`prompt` in TTY, `exit-unstaged` headless) while preserving existing mode-mapping coverage.
- **Files:**
  - `tools/tests/lib/approvals.test.ts` - Added explicit override tests and gate-wide review assertions

#### SUB-209
- **Problem:** Needed explicit per-combination regression tests for `evaluateApproval()` mode x TTY mapping and null-config fallback behavior.
- **Changes:** Split grouped mode-mapping assertions into six dedicated unit tests (`auto/suggest/always` x `TTY true/false`) and added a null-config fallback test to verify default `suggest` behavior in both TTY and headless contexts.
- **Files:**
  - `tools/tests/lib/approvals.test.ts` - Added explicit mode x TTY tests and null-config fallback coverage

#### SUB-207
- **Problem:** Ralph approval gates had type definitions but no pure evaluator to translate gate config + runtime flags into actionable approval behavior.
- **Changes:** Implemented `evaluateApproval(gate, config, context)` in `approvals.ts` with force override (`write`), per-gate mode fallback via `config?.[gate] ?? "suggest"`, review override to `always`, and deterministic TTY-aware mapping (`auto` -> `write`, `suggest` -> `write/notify-wait`, `always` -> `prompt/exit-unstaged`). Added focused unit tests covering force/review overrides, all mode + TTY mappings, undefined config fallback, and missing-gate fallback.
- **Files:**
  - `tools/src/commands/ralph/approvals.ts` - Added exported pure evaluateApproval function
  - `tools/tests/lib/approvals.test.ts` - Added 8 unit tests for approval evaluation behavior

### 2026-02-06

#### SUB-201
- **Problem:** TASK-009 required sparse approvals defaults in config (`DEFAULT_APPROVALS` with only `suggestWaitSeconds: 180`) and wiring `DEFAULT_RALPH.approvals` to that constant.
- **Changes:** Validation-only iteration. Verified `DEFAULT_APPROVALS` exists in `defaults.ts` with sparse shape, verified `DEFAULT_RALPH.approvals` references `DEFAULT_APPROVALS`, and ran `bun run typecheck` successfully. No code changes were required.
- **Files:**
  - `tools/src/lib/config/defaults.ts` - Verified existing implementation satisfies acceptance criteria

#### SUB-309
- **Problem:** No dynamic model discovery existed. Users couldn't discover newly released models from CLI providers without code changes.
- **Changes:** Created the full refresh-models pipeline: `models-dynamic.ts` placeholder exporting empty `DISCOVERED_MODELS` array; `refresh-models.ts` implementing `discoverOpencodeModels()` via `Bun.spawnSync`, `parseOpencodeModelsOutput()` for JSON parsing, `filterDuplicates()` against static registry, `generateDynamicFileContent()` for TypeScript file generation with sorted models and timestamp. Registered `ralph refresh-models` command with `--dry-run` and `--provider` flags. Updated `models.ts` to import `DISCOVERED_MODELS` from the new dynamic file. 22 unit tests covering parsing, filtering, generation, and error cases.
- **Files:**
  - `tools/src/commands/ralph/providers/models-dynamic.ts` - Created: placeholder with empty DISCOVERED_MODELS
  - `tools/src/commands/ralph/refresh-models.ts` - Created: full discovery command implementation
  - `tools/src/commands/ralph/providers/models.ts` - Updated: import from models-dynamic.ts
  - `tools/src/commands/ralph/index.ts` - Updated: registered refresh-models command
  - `tools/tests/providers/refresh-models.test.ts` - Created: 22 unit tests

#### SUB-299
- **Problem:** No integration tests existed for OpenCode's hard timeout enforcement and SIGKILL escalation (Issue #8203). The critical failure mode where OpenCode hangs forever on API errors needed deterministic test coverage.
- **Changes:** Created 16 integration tests in `tools/tests/providers/opencode.integration.test.ts` using mocked Bun.spawn processes. Tests cover 5 describe blocks: hung process (Issue #8203), normal completion, error exit, output-then-hang, and cleanup verification. All tests use short timeouts (50-80ms) for fast deterministic execution. Mock infrastructure routes `which opencode` calls to availability mocks and `opencode` invocations to controllable mock processes with signal tracking.
- **Files:**
  - `tools/tests/providers/opencode.integration.test.ts` - Created: 16 integration tests across 5 describe blocks

#### SUB-319
- **Problem:** No model validation existed before provider invocation. Users could specify invalid or wrong-provider model IDs with no helpful feedback.
- **Changes:** Created `validateModelSelection(modelId, provider)` in models.ts that returns `{ valid: true, cliFormat }` or `{ valid: false, error, suggestions }` result objects. Added `handleModelValidation()` helper in build.ts to encapsulate validation + error display + exit. Integrated into review/index.ts for both headless and supervised modes. Added `--model` flag to both `ralph build` and `review` commands. Error messages include same-provider suggestions (max 5, sorted alphabetically) and `refresh-models` hint. Added `model?: string` to `BuildOptions` type.
- **Files:**
  - `tools/src/commands/ralph/providers/models.ts` - Added: ModelValidationResult types, REFRESH_HINT constant, validateModelSelection function
  - `tools/src/commands/ralph/providers/index.ts` - Updated: barrel export with validateModelSelection, ModelValidationResult, REFRESH_HINT
  - `tools/src/commands/ralph/types.ts` - Added: model field to BuildOptions
  - `tools/src/commands/ralph/build.ts` - Added: handleModelValidation helper, integrated after selectProvider
  - `tools/src/commands/ralph/index.ts` - Added: --model flag to build command
  - `tools/src/commands/review/index.ts` - Added: --model flag, validation in headless and supervised modes
  - `tools/tests/providers/model-validation.test.ts` - Created: 17 unit tests

#### SUB-284
- **Problem:** OpenCode provider lacked OPENCODE_PERMISSION env var for automation permission bypass, binary detection with install instructions, hard timeout enforcement with SIGKILL for Issue #8203, and comprehensive code comments documenting OpenCode-specific quirks. Tests were only co-located, not in the standard tools/tests/ location.
- **Changes:** Rewrote opencode.ts with full provider implementation: buildOpencodeEnv() sets OPENCODE_PERMISSION='{"*":"allow"}' for permission bypass; checkOpencodeAvailable() detects binary presence; invokeOpencode() spawns via Bun.spawn with hard timeout that races process exit against a timer, logging Issue #8203 reference and using killProcessGracefully(proc, 0) for immediate SIGKILL escalation; comprehensive JSDoc comments documenting JSONL format, Issue #8203, permission bypass, and model format. Created 29 unit tests in tools/tests/providers/opencode.test.ts covering valid JSONL parsing, missing step_finish, empty input, malformed JSON, permission env setup, model format validation, and exported constants.
- **Files:**
  - `tools/src/commands/ralph/providers/opencode.ts` - Rewritten: added buildOpencodeArguments, buildOpencodeEnv, checkOpencodeAvailable, hard timeout with SIGKILL, Issue #8203 comments
  - `tools/tests/providers/opencode.test.ts` - Created: 29 unit tests

<!-- Format: ### YYYY-MM-DDTHH:MM:SS: Brief title -->
<!-- **Refs:** link to story/tasks -->
<!-- Keep ~5 sessions, archive older to docs/planning/archive/ -->

### 2026-02-05

#### SUB-314
- **Problem:** CLI tab completion had no support for model/provider selection. Users couldn't tab-complete `--model` or `--provider` flags on `ralph build` or `review` commands.
- **Changes:** Added "model" and "provider" dynamic completion types to the `__complete` handler in completion/index.ts. Model completions are filtered by `--provider` when present (reads from process.argv), fall back to all models when no provider specified, and return empty for unknown providers. Cost hints are included as tab-separated descriptions. Updated all three shell generators (bash, zsh, fish) with `--provider` and `--model` flag completions for `ralph build` and `review` commands. Zsh uses `_aaa_provider` and `_aaa_model` helper functions with description parsing. Fish uses inline command substitution with `string split` for tab-separated descriptions. Added 10 unit tests.
- **Files:**
  - `tools/src/commands/completion/index.ts` - Added: model/provider cases, getFilteredModelCompletions helper, model registry imports
  - `tools/src/commands/completion/bash.ts` - Added: --provider and --model flag value completion with dynamic lookups
  - `tools/src/commands/completion/zsh.ts` - Added: --provider and --model flags for build/review, _aaa_provider and _aaa_model helpers
  - `tools/src/commands/completion/fish.ts` - Added: --provider and --model completions for ralph build and review
  - `tools/tests/completion/model-completion.test.ts` - Created: 10 tests for model/provider completion

#### SUB-274
- **Problem:** Claude provider lacked dedicated fixture files and comprehensive unit tests for JSON parsing (normalizeClaudeResult) and ClaudeConfig type validation.
- **Changes:** Created 7 fixture JSON files in tools/tests/fixtures/claude/ covering success, minimal, error, malformed, empty array, no-result-entry, and partial-result cases. Added claude.parser.test.ts with 18 tests covering complete result parsing, field extraction, malformed JSON handling, partial results, and numeric string conversion. Added claude.config.test.ts with 10 tests for ClaudeConfig validation, provider type discrimination, and default timeout configuration. Note: malformed fixture uses .txt extension to avoid Prettier parse errors (matching existing project convention).
- **Files:**
  - `tools/tests/fixtures/claude/claude-success.json` - Full response with all fields
  - `tools/tests/fixtures/claude/claude-success-minimal.json` - Only required fields
  - `tools/tests/fixtures/claude/claude-error.json` - Error response
  - `tools/tests/fixtures/claude/claude-malformed.txt` - Invalid JSON (.txt to avoid Prettier)
  - `tools/tests/fixtures/claude/claude-empty-array.json` - Empty array
  - `tools/tests/fixtures/claude/claude-no-result-entry.json` - Missing result type entry
  - `tools/tests/fixtures/claude/claude-partial-result.json` - Result entry missing optional fields
  - `tools/tests/providers/claude.parser.test.ts` - 18 parser unit tests
  - `tools/tests/providers/claude.config.test.ts` - 10 config unit tests

#### SUB-304
- **Problem:** No static model registry existed for multi-CLI model management. Users had no way to look up model IDs, validate them for a provider, or get tab completions.
- **Changes:** Created models-static.ts with ModelInfo interface and 7 baseline models (3 Claude + 4 OpenCode). Created models.ts with registry functions: getAllModels (static precedence over dynamic), getModelsForProvider, getModelById, getModelCompletions, getModelCompletionsForProvider, validateModelForProvider (with "Did you mean:" suggestions and "refresh-models" hint). Updated providers/index.ts barrel export. Added 26 unit tests covering all functions.
- **Files:**
  - `tools/src/commands/ralph/providers/models-static.ts` - Created: ModelInfo interface and STATIC_MODELS array
  - `tools/src/commands/ralph/providers/models.ts` - Created: registry functions and DISCOVERED_MODELS placeholder
  - `tools/src/commands/ralph/providers/index.ts` - Updated: added models.ts exports to barrel
  - `tools/tests/providers/models.test.ts` - Created: 26 unit tests

#### SUB-289
- **Problem:** OpenCode provider was registered in the REGISTRY with `available: false` and a stub invoker. The `invokeOpencode` function didn't exist, so `--provider opencode` couldn't route to a real implementation.
- **Changes:** Added `invokeOpencode()` to opencode.ts as a registry-compatible `InvokerFunction` that spawns the opencode CLI with `--output jsonl`, handles timeouts and exit codes, and normalizes output via `normalizeOpencodeResult()`. Updated REGISTRY in registry.ts to set opencode entry to `available: true` with `invokeOpencode`. Added 14 unit tests in registry-opencode.test.ts covering registry lookup, supportedModes (no haiku), OpencodeConfig type narrowing, and provider availability. Updated existing registry.test.ts to reflect opencode being available.
- **Files:**
  - `tools/src/commands/ralph/providers/opencode.ts` - Added: invokeOpencode function, import of executeWithTimeout and InvocationOptions/OpencodeConfig types
  - `tools/src/commands/ralph/providers/registry.ts` - Updated: imported invokeOpencode, changed REGISTRY opencode entry to available: true
  - `tools/tests/providers/registry-opencode.test.ts` - Created: 14 unit tests for opencode registry integration
  - `tools/tests/providers/registry.test.ts` - Updated: fixed tests for opencode now being available

#### SUB-294
- **Problem:** No unit tests or fixtures existed for OpenCode JSONL parsing. The normalizeOpencodeResult() function needed to be created along with static fixtures documenting the expected JSONL format.
- **Changes:** Created normalizeOpencodeResult() in opencode.ts to parse OpenCode JSONL stream format (step_start, text, step_finish events) into AgentResult. Created 5 JSONL fixture files (success, partial/hang, error, empty, multiline) in __fixtures__/. Added 27 comprehensive unit tests covering text concatenation, field extraction (costUsd, sessionId, tokenUsage), error handling (malformed JSON, missing step_finish, missing reason:stop, empty stream), and edge cases (null fields, missing parts, extra whitespace). Updated eslint.config.js to recognize bun:test imports in co-located test files.
- **Files:**
  - `tools/src/commands/ralph/providers/opencode.ts` - Created: normalizeOpencodeResult function and OpencodeEvent type
  - `tools/src/commands/ralph/providers/opencode.test.ts` - Created: 27 unit tests
  - `tools/src/commands/ralph/providers/__fixtures__/opencode-success.jsonl` - Normal success fixture
  - `tools/src/commands/ralph/providers/__fixtures__/opencode-partial.jsonl` - Issue #8203 hang simulation
  - `tools/src/commands/ralph/providers/__fixtures__/opencode-error.jsonl` - Error response fixture
  - `tools/src/commands/ralph/providers/__fixtures__/opencode-empty.jsonl` - Empty stream fixture
  - `tools/src/commands/ralph/providers/__fixtures__/opencode-multiline.jsonl` - Multiple text events fixture
  - `tools/eslint.config.js` - Added src/**/*.test.ts to bun:test recognition

#### SUB-279
- **Problem:** Claude provider lacked mock-based integration tests for subprocess lifecycle (spawning, stall detection, termination escalation, exit codes, JSON parsing) — all tests required the real Claude CLI installed.
- **Changes:** Created `tools/tests/providers/claude.integration.test.ts` with 13 tests and mock utilities (createMockProcess, createMockStream). Tests cover: Bun.spawn arg verification for headless mode, stall detection with 100ms timeouts, stall timer reset on stderr activity, SIGTERM→SIGKILL escalation after grace period, exit codes 0/1/2/127 handling, JSON array parsing to AgentResult with costUsd/durationMs/sessionId/tokenUsage. All tests deterministic, run without real Claude CLI.
- **Files:**
  - `tools/tests/providers/claude.integration.test.ts` - Created: 13 integration tests with mock utilities

#### SUB-255
- **Problem:** SUB-255 required updating all files importing from `./claude` to import from `./providers/claude` and deleting the original `claude.ts`. This work was already completed by prior subtasks (SUB-269 moved files/imports, SUB-264 refactored calibrate.ts to use registry, SUB-259 refactored build.ts and review/index.ts to use registry).
- **Changes:** Validation-only iteration. Verified all 8 acceptance criteria: build.ts, index.ts, post-iteration.ts import from `./providers/claude`; calibrate.ts and review/index.ts import from `./providers/registry`; original claude.ts deleted; typecheck passes; all 684 tests pass.
- **Files:** No changes needed (all work done by SUB-269, SUB-264, SUB-259)

#### SUB-254
- **Problem:** providers/claude.ts used local type definitions (HeadlessResult, HeadlessOptions, HeadlessAsyncOptions, HaikuOptions, ClaudeJsonOutput) instead of provider types from types.ts, and lacked a normalizeClaudeResult() function for testable JSON parsing. invokeClaudeHeadlessAsync returned HeadlessResult with non-standard field names (cost, duration) instead of AgentResult.
- **Changes:** Added normalizeClaudeResult() to parse Claude JSON array format into AgentResult with proper field extraction (costUsd, durationMs, sessionId, tokenUsage). Changed invokeClaudeHeadlessAsync() to return AgentResult directly. Added invokeClaude() async wrapper for registry compatibility. Removed 5 local interfaces replaced by provider types/inline options. Updated index.ts callers to use AgentResult field names. Simplified registry.ts invokeClaudeHeadless() since no field mapping needed. Added 11 unit tests with 4 fixture files. All 684 tests pass, lint/typecheck clean.
- **Files:**
  - `tools/src/commands/ralph/providers/claude.ts` - Refactored: added normalizeClaudeResult, invokeClaude, removed local types, returns AgentResult
  - `tools/src/commands/ralph/providers/registry.ts` - Simplified invokeClaudeHeadless (no field mapping)
  - `tools/src/commands/ralph/index.ts` - Updated HeadlessResult field names to AgentResult names
  - `tools/tests/providers/claude.test.ts` - Created: 11 unit tests for normalizeClaudeResult and buildPrompt
  - `tools/tests/fixtures/claude-success.json` - Full response fixture with token usage
  - `tools/tests/fixtures/claude-minimal.json` - Minimal response fixture
  - `tools/tests/fixtures/claude-error.json` - Error response fixture
  - `tools/tests/fixtures/claude-malformed.txt` - Malformed JSON fixture

#### SUB-264
- **Problem:** calibrate.ts used direct `invokeClaudeHeadlessAsync` calls instead of the provider registry, tightly coupling calibration checks to the Claude provider.
- **Changes:** Replaced the import of `invokeClaudeHeadlessAsync` from `./providers/claude` with `invokeWithProvider` and `selectProviderFromEnv` from `./providers/registry`. Added provider selection via `selectProviderFromEnv()` at the start of `runCalibrate()`, threading the selected provider through to all three check functions. Each `invokeWithProvider` call wrapped in try-catch for error handling. All 673 tests pass, typecheck and lint clean.
- **Files:**
  - `tools/src/commands/ralph/calibrate.ts` - Replaced claude imports with registry, added provider selection, wrapped calls in try-catch

#### SUB-269
- **Problem:** Legacy `tools/src/commands/ralph/claude.ts` still existed after all Claude invocation logic was refactored into the provider abstraction layer. Five files still imported from the legacy location.
- **Changes:** Moved Claude invocation functions (invokeClaudeChat, invokeClaudeHeadlessAsync, invokeClaudeHaiku, buildPrompt) to `tools/src/commands/ralph/providers/claude.ts`. Updated all imports in build.ts, calibrate.ts, index.ts, post-iteration.ts, and providers/registry.ts to reference the new location. Deleted the legacy file. All 673 tests pass, typecheck and lint clean.
- **Files:**
  - `tools/src/commands/ralph/providers/claude.ts` - Created (moved from root claude.ts)
  - `tools/src/commands/ralph/claude.ts` - Deleted
  - `tools/src/commands/ralph/build.ts` - Updated import path
  - `tools/src/commands/ralph/calibrate.ts` - Updated import path
  - `tools/src/commands/ralph/index.ts` - Updated import path
  - `tools/src/commands/ralph/post-iteration.ts` - Updated import path
  - `tools/src/commands/ralph/providers/registry.ts` - Updated import path

#### SUB-245
- **Problem:** Provider registry tests lacked mocked tests for autoDetectProvider priority order, isBinaryAvailable binary detection, and invokeWithProvider error messages with install instructions.
- **Changes:** Enhanced registry.test.ts from 53 to 71 tests. Added mocked Bun.spawn tests for: isBinaryAvailable (4 tests: exit code 0/1, spawn throw, arg verification), autoDetectProvider (11 tests: each provider alone, priority ordering between pairs, no-binaries default), invokeWithProvider (5 tests: binary missing with install instructions, not-yet-implemented when binary exists, multiple provider errors).
- **Files:**
  - `tools/tests/providers/registry.test.ts` - Enhanced with mocked Bun.spawn test groups

#### SUB-244
- **Problem:** The provider registry (registry.ts) created in SUB-259 was missing several functions specified in TASK-037: REGISTRY constant, isBinaryAvailable(), getInstallInstructions(), ProviderSelectionContext, selectProviderFromEnv(), autoDetectProvider(), and ProviderError optional cause.
- **Changes:** Expanded registry.ts with all 9 required functions/types. Added REGISTRY constant with all 6 providers (available: false, stub invokers). Added isBinaryAvailable() using Bun.spawn with `which`, getInstallInstructions() for each provider, ProviderError with optional cause field. Changed selectProvider() from simple string override to ProviderSelectionContext object (cliFlag > envVariable > configFile > auto-detect). Added selectProviderFromEnv() reading process.argv and env, autoDetectProvider() with Promise.all for parallel binary checking. Updated invokeWithProvider() to check REGISTRY and binary availability with install instructions in errors. Updated callers in build.ts and review/index.ts. 53 unit tests.
- **Files:**
  - `tools/src/commands/ralph/providers/registry.ts` - Expanded with REGISTRY, isBinaryAvailable, getInstallInstructions, ProviderSelectionContext, selectProviderFromEnv, autoDetectProvider
  - `tools/src/commands/ralph/providers/index.ts` - Added new exports
  - `tools/src/commands/ralph/build.ts` - Updated selectProvider call to use ProviderSelectionContext
  - `tools/src/commands/review/index.ts` - Updated selectProvider calls to use ProviderSelectionContext
  - `tools/tests/providers/registry.test.ts` - Expanded from 20 to 53 unit tests

#### SUB-259
- **Problem:** build.ts and review/index.ts directly imported Claude invocation functions (invokeClaudeHeadlessAsync, invokeClaudeChat), tightly coupling them to Claude as the only provider. No provider registry existed despite being a prerequisite.
- **Changes:** Created providers/registry.ts with selectProvider() (CLI flag > env var > default "claude"), validateProvider(), invokeWithProvider() (discriminated union for headless/supervised modes), and ProviderError class. Updated build.ts to import from registry, pass provider through iteration contexts, and use AgentResult fields (costUsd, durationMs, sessionId). Updated review/index.ts similarly, converting runHeadlessReview to options-object pattern (max-params fix). Added --provider CLI flag to both ralph build and review commands. Added provider?: ProviderType to BuildOptions. Created 20 unit tests (registry.test.ts) and 4 E2E tests (provider-flag.test.ts). All 631 tests pass, typecheck clean.
- **Files:**
  - `tools/src/commands/ralph/providers/registry.ts` - Created: provider selection, validation, invocation routing
  - `tools/src/commands/ralph/providers/index.ts` - Added registry re-exports
  - `tools/src/commands/ralph/build.ts` - Replaced Claude imports with registry calls
  - `tools/src/commands/ralph/index.ts` - Added --provider CLI flag to build command
  - `tools/src/commands/ralph/types.ts` - Added provider?: ProviderType to BuildOptions
  - `tools/src/commands/review/index.ts` - Replaced Claude imports with registry calls, added --provider flag
  - `tools/tests/providers/registry.test.ts` - 20 unit tests for registry
  - `tools/tests/e2e/provider-flag.test.ts` - 4 E2E tests for CLI flag

#### SUB-250
- **Problem:** claude.ts contained local implementations of 5 utility functions that were duplicated in providers/utils.ts after SUB-249 extraction.
- **Changes:** Replaced local implementations of createStallDetector, createTimeoutPromise, killProcessGracefully, readStderrWithActivityTracking, and markTimerAsNonBlocking with imports from providers/utils.ts. Also imported DEFAULT_GRACE_PERIOD_MS constant. Replaced inline unref pattern in invokeClaudeHaiku with markTimerAsNonBlocking call. Reduced claude.ts by 146 lines (622→476) with zero behavior change.
- **Files:**
  - `tools/src/commands/ralph/claude.ts` - Removed 5 local function definitions, added imports from providers/utils

#### SUB-249
- **Problem:** Process execution utilities (stall detection, timeout handling, graceful termination, JSON parsing) were tightly coupled to claude.ts, preventing reuse by other providers.
- **Changes:** Created providers/utils.ts with 3 interfaces (StallDetectionConfig, ProcessExecutionOptions, ProcessExecutionResult) and 8 exported functions generalized to accept command/args rather than hardcoding Claude. Renamed safeJsonParse to tryParseJson to satisfy function-name/starts-with-verb lint rule. Added 21 unit tests covering JSON parsing, JSONL parsing, timeout promises, stall detection (including activity tracking and cleanup), graceful process termination (SIGTERM/SIGKILL two-phase), and timer utilities.
- **Files:**
  - `tools/src/commands/ralph/providers/utils.ts` - Shared process execution utilities
  - `tools/tests/providers/utils.test.ts` - 21 unit tests

#### SUB-239
- **Problem:** Ralph had tight coupling to Claude Code CLI with no abstraction for multi-provider support.
- **Changes:** Created provider type system with discriminated unions for 6 AI coding agent providers (claude, opencode, codex, gemini, pi, cursor). Added AgentResult with normalized naming, InvocationMode union, PROVIDER_BINARIES constant, barrel export, and RalphConfig extension with provider/model/lightweightModel fields. Added 10 unit tests covering type narrowing, PROVIDER_BINARIES completeness, and AgentResult shape.
- **Files:**
  - `tools/src/commands/ralph/providers/types.ts` - All provider abstraction types
  - `tools/src/commands/ralph/providers/index.ts` - Barrel export
  - `tools/src/commands/ralph/types.ts` - Extended RalphConfig with provider fields
  - `tools/tests/providers/types.test.ts` - 10 unit tests

### 2026-02-02

#### SUB-190
- **Problem:** No unit tests existed for the new formatNotificationMessage function or the EventConfig enabled field added in SUB-184 and SUB-188.
- **Changes:** Added 11 unit tests for formatNotificationMessage covering: base message only (no metrics), full metrics (all fields), partial metrics combinations, session ID truncation, empty session handling, cost formatting. Added 4 unit tests for EventConfig enabled field covering: true value, false value, full config with enabled, undefined when omitted.
- **Files:**
  - `tools/tests/lib/ralph-hooks.test.ts` - Added formatNotificationMessage describe block with 11 tests
  - `tools/tests/lib/config-types.test.ts` - Added 4 tests for enabled field in eventConfigSchema describe block

#### SUB-189
- **Problem:** Build metrics from iteration results weren't being passed to Ralph hook calls (onSubtaskComplete, onMaxIterationsExceeded, onMilestoneComplete), preventing rich notification messages with build context.
- **Changes:** Updated build.ts to pass metrics from hookResult.entry to all three hook calls. Extracted fireSubtaskCompleteHook helper function to maintain lint compliance (complexity limit). Added formatDuration helper for human-readable duration strings. Refactored handleMaxIterationsExceeded to use options object pattern.
- **Files:**
  - `tools/src/commands/ralph/build.ts` - Added helper functions, updated hook calls with metrics
  - `tools/tests/lib/build-hooks.test.ts` - Updated tests for new helper function usage

#### SUB-188
- **Problem:** Notification messages from Ralph hooks were plain text without build metrics context. Users needed richer notifications showing files changed, lines added/removed, cost, and session info.
- **Changes:** Added formatNotificationMessage(hookName, context) function that builds rich notification messages from HookContext. Appends metrics line when available: 'Files: N | Lines: +X/-Y | Cost: $N.NN | Session: abbrev'. Updated executeNotifyAction and executeNotifyFallback to use this function for message content.
- **Files:**
  - `tools/src/commands/ralph/hooks.ts` - Added formatNotificationMessage function, updated executeNotifyAction and executeNotifyFallback to use it

#### SUB-187
- **Problem:** HookContext interface lacked fields for build metrics, preventing rich notification messages with details like lines changed, cost, and iteration context.
- **Changes:** Extended HookContext interface with 8 optional fields: linesAdded, linesRemoved, filesChanged, costUsd, duration, milestone, iterationNumber, maxIterations. All fields have JSDoc comments following existing patterns.
- **Files:**
  - `tools/src/commands/ralph/hooks.ts` - Added 8 optional metrics fields to HookContext interface

#### SUB-186
- **Problem:** No event-specific routing configuration existed in aaa.config.json. Events like claude:stop needed to be disabled, and ralph hooks needed appropriate priority levels.
- **Changes:** Added events section to aaa.config.json notify configuration with four event configs: claude:stop (disabled), ralph:maxIterationsExceeded (priority max with alert/failure tags), ralph:milestoneComplete (priority high with tada tag), ralph:subtaskComplete (priority low).
- **Files:**
  - `aaa.config.json` - Added notify.events section with event routing configuration

#### SUB-185
- **Problem:** Notify command lacked event-level disable capability. The enabled field was added to EventConfig in SUB-184, but the notify command didn't check it.
- **Changes:** Added check in notify command's main action: after getEventConfig() is called, check if eventConfig?.enabled === false and exit silently with code 0. Also enhanced dry-run mode to show "(disabled)" indicator for disabled events to help with debugging.
- **Files:**
  - `tools/src/commands/notify/index.ts` - Added enabled check after getEventConfig(), enhanced dry-run output

#### SUB-184
- **Problem:** Notification system lacked event-level disable capability. Events could only be enabled/disabled globally via NotifySection.enabled.
- **Changes:** Added optional `enabled?: boolean` field to EventConfig interface with JSDoc comment. Added corresponding `enabled: z.boolean().optional()` to eventConfigSchema. This allows individual events like `claude:stop` to be disabled in aaa.config.json.
- **Files:**
  - `tools/src/lib/config/types.ts` - Added enabled field to EventConfig interface and eventConfigSchema

#### SUB-183
- **Problem:** Inconsistent BOX_WIDTH values between display.ts (68) and status.ts (64) caused visual inconsistency in Ralph CLI output boxes.
- **Changes:** Exported BOX_WIDTH from display.ts and imported it in status.ts, removing the duplicate local constant. Updated header padding from padStart(41) to padStart(43) to properly center "Ralph Build Status" in the wider 68-character box.
- **Files:**
  - `tools/src/commands/ralph/display.ts` - Added BOX_WIDTH to exports
  - `tools/src/commands/ralph/status.ts` - Replaced local BOX_WIDTH with import, updated padding

#### SUB-182
- **Problem:** The pre-execution display in invokeClaudeHeadless() used plain console.log output without styling, inconsistent with the styled post-execution summary boxes.
- **Changes:** Replaced plain output with styled header using renderInvocationHeader('headless'). Display Source (cyan path), Size (yellow mode - when passed), and Log (plain path) with chalk.dim labels. Added optional sizeMode parameter to HeadlessWithLoggingOptions interface and updated subtasks command to pass it.
- **Files:**
  - `tools/src/commands/ralph/index.ts` - Added chalk import, renderInvocationHeader import, sizeMode to interface, styled pre-execution output

#### SUB-181
- **Problem:** Paths displayed in renderPlanSubtasksSummary() could wrap awkwardly mid-word inside the box since they weren't using truncation.
- **Changes:** Applied makeClickablePath() with calculated max lengths to source.path and storyRef in renderPlanSubtasksSummary(). Source paths use innerWidth - 16 (label width), story paths use innerWidth - 7. Paths now truncate from the middle with "..." when they exceed box width.
- **Files:**
  - `tools/src/commands/ralph/display.ts` - Applied makeClickablePath() truncation to source.path and storyRef displays

#### SUB-180
- **Problem:** renderPlanSubtasksSummary() displayed redundant path information when using --story flag. Both "Source (file):" and "Story:" lines showed the same path, cluttering the output.
- **Changes:** Added isStorySource check before rendering source info section. When source.type is 'file' and source.path equals storyRef, the Source line is skipped, showing only the Story line. Added 5 unit tests for renderPlanSubtasksSummary to verify the fix.
- **Files:**
  - `tools/src/commands/ralph/display.ts` - Added isStorySource conditional to skip duplicate source line
  - `tools/tests/lib/display.test.ts` - Added 5 tests for renderPlanSubtasksSummary path redundancy handling

#### SUB-179
- **Problem:** invokeClaudeHeadless() printed "Duration: Xs | Cost: $X.XX" which duplicated the same info shown in styled summary boxes (like renderPlanSubtasksSummary). When running `aaa ralph plan subtasks --headless`, users saw duration/cost twice.
- **Changes:** Removed the duplicate duration/cost console.log from invokeClaudeHeadless(). Kept the session ID line ("Session: ...") as it's useful for debugging. Duration/cost data remains logged to JSONL files and available in return values for callers that need to display it in summary boxes.
- **Files:**
  - `tools/src/commands/ralph/index.ts` - Modified invokeClaudeHeadless to only print session ID

#### SUB-178
- **Problem:** Output path shown in renderPlanSubtasksSummary() didn't match actual file location when using --story flag. resolvedMilestonePath was only set when --milestone was explicitly provided, but Claude correctly inferred milestone from story path for file creation.
- **Changes:** Added milestone inference from resolved story path in subtasks command. Call resolveStoryPath() early to get the resolved path (handles slugs and full paths), then extract milestone using regex /milestones\/([^/]+)\//. This ensures the displayed output path matches where Claude creates the subtasks.json file.
- **Files:**
  - `tools/src/commands/ralph/index.ts` - Added milestone inference from story path using IIFE pattern for lint compliance

#### SUB-177
- **Problem:** No E2E tests existed to verify cascade validation in ralph CLI commands
- **Changes:** Added 'cascade validation' describe block to ralph.test.ts with four tests: (1) plan subtasks --help shows --cascade option, (2) invalid cascade target produces error listing valid levels, (3) backward cascade (subtasks → stories) is rejected with helpful error, (4) build --cascade subtasks is rejected as invalid target. Note: Used plan subtasks instead of plan tasks for backward cascade test because subtasks has early cascade validation.
- **Files:**
  - `tools/tests/e2e/ralph.test.ts` - Added cascade validation describe block with 4 E2E tests

#### SUB-174
- **Problem:** Ralph build command lacked cascade capability to chain to calibration after build completes
- **Changes:** Added --cascade <target> option to the build command. Target is validated early (before running build) - only 'calibrate' is valid since build can only cascade forward. After runBuild() succeeds, runCascadeFrom() is called to continue the cascade when --cascade flag is provided.
- **Files:**
  - `tools/src/commands/ralph/index.ts` - Added --cascade option with early validation and post-build cascade execution

#### SUB-171
- **Problem:** Ralph plan subtasks command lacked cascade capability to chain to subsequent levels (build, calibrate)
- **Changes:** Added --cascade <target> and --calibrate-every <n> options to the subtasks command. Added early validation of cascade targets before running Claude session, so backward cascades and invalid targets fail immediately with helpful error messages. Extended handleCascadeExecution with calibrateEvery and subtasksPath support.
- **Files:**
  - `tools/src/commands/ralph/index.ts` - Added cascade options, early validation, and updated HandleCascadeOptions interface

#### SUB-170
- **Problem:** Ralph plan tasks command lacked cascade capability to chain to subsequent planning levels (subtasks, build, calibrate)
- **Changes:** Added --cascade <target> option to `ralph plan tasks` command. Refactored tasks action to use helper functions (runTasksMilestoneMode, runTasksStoryMode, runTasksSourceMode) to reduce complexity and enable shared cascade handling. Cascade validation rejects backward cascades (tasks → stories) and invalid targets with helpful error messages. The cascade logic applies to all source types (--story, --milestone, --file, --text).
- **Files:**
  - `tools/src/commands/ralph/index.ts` - Added --cascade option, helper functions, and interfaces for tasks command
  - `tools/src/commands/ralph/config.ts` - Fixed pre-existing lint errors (variable initialization, error types)

#### SUB-169
- **Problem:** Ralph plan commands (roadmap, stories) lacked cascade capability to chain to subsequent planning levels
- **Changes:** Added imports for runCascadeFrom and validateCascadeTarget from cascade.ts. Added --cascade <target> option to both ralph plan roadmap and ralph plan stories commands. After existing command logic completes, if --cascade is specified, validates target direction and calls runCascadeFrom to chain planning levels. Also fixed pre-existing lint errors in config.ts and config.test.ts (alphabetical function ordering, variable initialization, naming).
- **Files:**
  - `tools/src/commands/ralph/index.ts` - Added cascade imports and --cascade option to roadmap and stories commands
  - `tools/src/commands/ralph/config.ts` - Fixed lint errors (reordered appendSubtasksToFile/saveSubtasksFile)
  - `tools/tests/lib/config.test.ts` - Fixed lint errors (variable initialization, naming, inline comments)

#### SUB-166
- **Problem:** Cascade mode needs a function to resolve milestone identifiers (either full paths or short names) to full paths
- **Changes:** Implemented resolveMilestonePath() that handles absolute paths, relative paths, and milestone names (e.g., '003-ralph-workflow'). Lists available milestones in error messages. Also added listAvailableMilestones() and getMilestonesBasePath() helpers.
- **Files:**
  - `tools/src/commands/ralph/config.ts` - Added resolveMilestonePath, listAvailableMilestones, getMilestonesBasePath functions
  - `tools/tests/lib/ralph-config.test.ts` - Added 11 unit tests for milestone resolution functions

#### SUB-163
- **Problem:** Cascade mode needed display functions to visualize cascade progression and results
- **Changes:** Implemented renderCascadeProgress() for showing level progression with completed (✓), current (◉), and remaining levels. Implemented renderCascadeSummary() for boxen-formatted results with success status, completed levels list, stopped-at location, and error messages. Also fixed pre-existing lint errors in index.ts (outputDir → outputDirectory abbreviation).
- **Files:**
  - `tools/src/commands/ralph/display.ts` - Added renderCascadeProgress and renderCascadeSummary functions
  - `tools/tests/lib/display.test.ts` - Added 9 unit tests for cascade display functions
  - `tools/src/commands/ralph/index.ts` - Fixed lint errors (variable abbreviation)

#### SUB-161
- **Problem:** Cascade module needed E2E tests to validate exports and verify validation functions work correctly
- **Changes:** Created E2E test file with 11 tests covering validateCascadeTarget (backward cascade returns error, forward cascade returns null, invalid levels handled) and getLevelsInRange (correct level sequences, edge cases). All cascade functions were already exported from previous subtasks.
- **Files:**
  - `tools/tests/e2e/cascade.test.ts` - New E2E test file with 11 tests for cascade validation functions

#### SUB-160
- **Problem:** Cascade module needs main loop function to orchestrate execution of multiple Ralph levels in sequence
- **Changes:** Implemented runCascadeFrom(start, target, options) function in cascade.ts that validates cascade direction using validateCascadeTarget(), gets levels to execute using getLevelsInRange(), loops through levels calling runLevel() for each, and prompts user between levels with promptContinue() (unless headless mode). Returns CascadeFromResult with completedLevels, success status, error message, and stoppedAt level.
- **Files:**
  - `tools/src/commands/ralph/cascade.ts` - Added runCascadeFrom function, CascadeFromOptions and CascadeFromResult interfaces
  - `tools/tests/lib/cascade.test.ts` - Added 10 unit tests for runCascadeFrom function

#### SUB-159
- **Problem:** Cascade module needs a level dispatcher function to route execution to existing Ralph functions
- **Changes:** Implemented runLevel(level, options) function in cascade.ts that dispatches to runBuild() for 'build' level and runCalibrate('all') for 'calibrate' level. Planning levels (roadmap, stories, tasks, subtasks) return "not yet implemented" error. Added RunLevelOptions interface with contextRoot and subtasksPath fields.
- **Files:**
  - `tools/src/commands/ralph/cascade.ts` - Added runLevel function with level dispatch logic, RunLevelOptions interface
  - `tools/tests/lib/cascade.test.ts` - Added 3 unit tests for runLevel function

#### SUB-158
- **Problem:** Cascade mode needs TTY-aware prompt for user continuation between cascade levels
- **Changes:** Implemented promptContinue(completed, next) function in cascade.ts. Returns true on 'y', 'Y', or empty input (default yes). Returns false on 'n' or 'no'. Detects non-TTY mode via process.stdin.isTTY and returns true automatically without blocking. Uses readline.createInterface following build.ts pattern.
- **Files:**
  - `tools/src/commands/ralph/cascade.ts` - Added promptContinue function with TTY detection
  - `tools/tests/lib/cascade.test.ts` - Added 21 unit tests for cascade module including promptContinue

#### SUB-157
- **Problem:** Cascade mode needs core module with level ordering and validation logic
- **Changes:** Created cascade.ts with LEVELS constant defining the cascade order (roadmap → stories → tasks → subtasks → build → calibrate), each with name, order, and requiresMilestone properties. Implemented validateCascadeTarget() to validate forward-only cascade direction and getLevelsInRange() to return intermediate levels between start and target.
- **Files:**
  - `tools/src/commands/ralph/cascade.ts` - New cascade orchestration module with LEVELS constant and validation functions

#### SUB-155
- **Problem:** Cascade mode needs a type definition for cascade levels (name + order)
- **Changes:** Added CascadeLevel interface with name (string) and order (number) fields. JSDoc describes it as a level in the Ralph cascade hierarchy. Added export to types.ts alongside CascadeOptions and CascadeResult.
- **Files:**
  - `tools/src/commands/ralph/types.ts` - Added CascadeLevel interface with JSDoc and export

#### SUB-154
- **Problem:** Ralph cascade mode needs TypeScript interfaces to define cascade execution options and results
- **Changes:** Added CascadeOptions interface (milestone, force, headless, calibrateEvery fields) and CascadeResult interface (success, completedLevels, stoppedAt, error fields) with JSDoc comments following existing patterns. Both types exported from types.ts.
- **Files:**
  - `tools/src/commands/ralph/types.ts` - Added CascadeOptions and CascadeResult interfaces with exports

#### SUB-153
- **Problem:** Interrogate skill and workflow lacked distinction between live mode (current session introspection) and forensic mode (past commit session loading)
- **Changes:** Added "Session Modes: Live vs Forensic" section to SKILL.md documenting three modes: Live (direct introspection for current changes), Forensic (load session via aaa session cat), Fallback (diff-only). Updated interrogate workflow with modes table, target mapping, and forensic mode details. Added session context indicators to output format.
- **Files:**
  - `.claude/skills/interrogate-on-changes/SKILL.md` - Added session modes section, updated allowed-tools, enhanced gather context with mode annotations
  - `context/workflows/interrogate.md` - Added Session Modes section with table, forensic mode details, target/mode mapping table

#### SUB-152
- **Problem:** Session CLI lacked commands to output session content and list recent sessions
- **Changes:** Extended `aaa session` with `cat` and `list` subcommands. Cat outputs session JSONL content to stdout (supports direct session ID or --commit flag). List outputs recent sessions - one per line (machine-parseable) by default, or table format with --verbose. Includes --limit flag for both modes.
- **Files:**
  - `tools/src/commands/session/index.ts` - Add cat and list subcommands with helper functions
  - `tools/tests/e2e/session.test.ts` - E2E tests for cat and list subcommands (11 new tests)
  - `tools/README.md` - Document new subcommands and use cases

#### SUB-151
- **Problem:** No CLI command to retrieve Claude session files for interrogation workflows
- **Changes:** Created `aaa session` command with `path` and `current` subcommands. Path subcommand accepts session ID directly or extracts from commit's cc-session-id trailer. Current subcommand reads from .claude/current-session. Includes E2E tests and documentation.
- **Files:**
  - `tools/src/commands/session/index.ts` - New CLI command with Commander.js
  - `tools/tests/e2e/session.test.ts` - E2E tests for all subcommands
  - `tools/src/cli.ts` - Import and register session command
  - `tools/README.md` - Document session commands and usage
  - `tools/CLAUDE.md` - Update directory structure

#### SUB-150
- **Problem:** Commit workflow documentation didn't document the cc-session-id trailer that is automatically added by the prepare-commit-msg hook
- **Changes:** Updated all four commit workflow docs to document the automatic cc-session-id trailer: commit.md (added Session Tracking section with interrogate reference), complete-feature.md, multiple-commits.md (both added notes about automatic trailer), ralph-iteration.md (updated example to show both Subtask and cc-session-id trailers)
- **Files:** `context/workflows/commit.md`, `context/workflows/complete-feature.md`, `context/workflows/multiple-commits.md`, `context/workflows/ralph/building/ralph-iteration.md`

#### SUB-149
- **Problem:** No automatic mechanism to include session IDs in commit messages for later interrogation
- **Changes:** Added prepare-commit-msg git hook that appends cc-session-id trailer to commit messages. Hook reads session ID from .claude/current-session (written by SessionStart hook), is idempotent, handles missing files gracefully, and skips merge/squash commits.
- **Files:** `tools/.husky/prepare-commit-msg` - New git hook for automatic session ID trailers

#### SUB-148
- **Problem:** No mechanism to capture Claude session IDs for later interrogation of commit decisions
- **Changes:** Added SessionStart hook that writes session_id to .claude/current-session using jq; set cleanupPeriodDays to 90 for longer session retention
- **Files:** `.claude/settings.json` - Added SessionStart hook and cleanupPeriodDays at root level

### 2026-01-26

#### SUB-067
- **Problem:** No module for build summary functionality - types and functions for aggregating Ralph build results were needed
- **Changes:** Created summary.ts with BuildPracticalSummary module containing types and aggregation functions
- **Files:**
  - `tools/src/commands/ralph/summary.ts` - New module with BuildPracticalSummary, CompletedSubtaskInfo, BuildStats, CommitRange types; generateBuildSummary(), getCommitRange(), writeBuildSummaryFile() functions
  - `tools/tests/lib/summary.test.ts` - 14 unit tests covering all summary functions

### 2026-01-22

#### SUB-024
- **Problem:** stories-review-auto.md lacked Interactive Mode (Supervised) section for chunked presentation
- **Changes:** Added Interactive Mode section referencing chunked-presentation.md protocol; now presents per-story reviews one at a time in supervised mode
- **Files:**
  - `context/workflows/ralph/review/stories-review-auto.md` - Added Interactive Mode (Supervised) section

#### SUB-022
- **Problem:** VISION.md Section 8.2 was outdated after CLI ergonomics changes
- **Changes:** Updated Section 8.2 CLI Command Structure with: plan subtasks scope flags, review flag syntax with --milestone/--subtasks, calibrate as real subcommands, max-iterations=0 default, calibrate-every flag, review subtasks command
- **Files:**
  - `docs/planning/VISION.md` - Rewrote Section 8.2 to match current implementation

#### SUB-023
- **Problem:** Need to verify TASK-012 CLI changes compile and work correctly
- **Changes:** Ran typecheck (passed), verified all CLI commands with --help show correct flags. Confirmed: plan subtasks scope flags, calibrate as real subcommands, review commands use --milestone/--subtasks flags, build shows max-iterations default 0 and calibrate-every option
- **Files:** No code changes - verification only

### 2026-01-21

#### SUB-021
- **Problem:** `ralph review tasks` was a placeholder showing "coming soon" message
- **Changes:** Replaced placeholder with real `ralph review subtasks --subtasks <path>` command that invokes subtasks-review-auto.md prompt in supervised mode
- **Files:**
  - `tools/src/commands/ralph/index.ts` - Replaced review tasks with review subtasks command using --subtasks flag
  - `context/workflows/ralph/review/subtasks-review-auto.md` - Created new prompt file for subtask queue review
  - `tools/tests/e2e/ralph.test.ts` - Updated test to verify new command behavior

#### SUB-020
- **Problem:** No way to automatically run calibration checks during long build loops
- **Changes:** Added `--calibrate-every <n>` flag to ralph build command; when set, runCalibrate('all', ...) is called every N iterations; extracted runPeriodicCalibration helper for lint compliance
- **Files:**
  - `tools/src/commands/ralph/index.ts` - Added --calibrate-every option, passed to BuildOptions
  - `tools/src/commands/ralph/build.ts` - Import runCalibrate, add runPeriodicCalibration helper, call every N iterations
  - `tools/src/commands/ralph/types.ts` - Added calibrateEvery field to BuildOptions

#### SUB-019
- **Problem:** `ralph build` defaulted to `--max-iterations 3` which was too restrictive; `--auto` flag on plan stories/tasks was redundant alias for `--supervised`
- **Changes:** Changed --max-iterations default to 0 (unlimited); updated build.ts to skip iteration limit check when value is 0; removed --auto flag from plan stories and plan tasks commands; updated tests
- **Files:**
  - `tools/src/commands/ralph/index.ts` - Changed default, removed --auto option and logic
  - `tools/src/commands/ralph/build.ts` - Handle maxIterations=0 as unlimited
  - `tools/src/commands/ralph/types.ts` - Updated comment
  - `tools/tests/e2e/ralph.test.ts` - Removed --auto expectations

#### SUB-018
- **Problem:** `ralph calibrate` used `.argument('[subcommand]')` pattern instead of real Commander subcommands, making `--help` less useful for individual subcommands
- **Changes:** Converted to real subcommands using `calibrateCommand.addCommand(new Command('intention')...)` pattern; each subcommand now has proper `--help` with its own options
- **Files:**
  - `tools/src/commands/ralph/index.ts` - Replaced argument pattern with addCommand pattern, added helper functions
  - `tools/tests/e2e/ralph.test.ts` - Updated test to expect Commander help output instead of custom error

#### SUB-017
- **Problem:** `ralph review stories` and `ralph review gap stories` used positional arguments inconsistent with other ralph commands
- **Changes:** Changed from `.argument("<milestone>")` to `.requiredOption("--milestone <path>")` for both commands; updated tests to expect new error message format
- **Files:**
  - `tools/src/commands/ralph/index.ts` - Changed review stories and gap stories to use --milestone option
  - `tools/tests/e2e/ralph.test.ts` - Updated test assertions for new error message

#### SUB-016
- **Problem:** `ralph plan subtasks` only accepted `--task` flag, missing `--story` and `--milestone` scope options
- **Changes:** Added `--story <path>` and `--milestone <path>` options; made all three mutually exclusive (require exactly one); added error messages guiding correct usage
- **Files:**
  - `tools/src/commands/ralph/index.ts` - Extended subtasks command with scope flags and validation

#### SUB-015
- **Problem:** Tests and CLI option descriptions still referenced old selfImprovement mode names (always/auto/never)
- **Changes:** Updated ralph.test.ts to use 'suggest' instead of 'always' and 'off' instead of 'never'; updated index.ts --force and --review option help text to use new mode names
- **Files:**
  - `tools/tests/e2e/ralph.test.ts` - Updated config fixture and assertions
  - `tools/src/commands/ralph/index.ts` - Updated option descriptions

#### SUB-014
- **Problem:** VISION.md lacked documentation of the new selfImprovement mode values (suggest/autofix/off)
- **Changes:** Added mode table to Self-Improvement section under Calibration Mode; updated example config to use 'suggest' instead of 'always'
- **Files:**
  - `docs/planning/VISION.md` - Added mode table with descriptions and use cases

#### SUB-013
- **Problem:** calibrate.ts still used old mode names (always/auto/never) after schema/types were updated
- **Changes:** Updated all mode references in calibrate.ts to use new names (suggest/autofix/off)
- **Files:**
  - `tools/src/commands/ralph/calibrate.ts` - Updated doc comments, default value, mode checks, and prompt text

#### SUB-012
- **Problem:** selfImprovement.mode used confusing names (always/auto) that didn't clearly convey their meaning
- **Changes:** Renamed mode values to suggest/autofix/off across schema, types, and config default
- **Files:**
  - `docs/planning/schemas/ralph-config.schema.json` - Updated enum and description
  - `tools/src/commands/ralph/types.ts` - Updated SelfImprovementConfig mode union type
  - `tools/src/commands/ralph/config.ts` - Changed default from 'always' to 'suggest'
  - `tools/src/commands/completion/zsh.ts` - Fixed pre-existing lint error (eslint disable for shell template)

## 2026-02-10

### SUB-007
- **Problem:** `--validate-first` always invoked validation with the hardcoded `claude` provider, so `--provider opencode --model ...` did not affect pre-build validation.
- **Changes:** Updated validation APIs to accept provider/model inputs, threaded provider/model through `resolveSkippedSubtaskIds()` and `validateAllSubtasks()`, and removed the hardcoded provider from `validateSubtask()`. Added regression coverage that asserts validation invocation forwards a non-claude provider and configured model.
- **Files:** `tools/src/commands/ralph/validation.ts`, `tools/src/commands/ralph/build.ts`, `tools/tests/lib/validation-invoke.test.ts`, `tools/tests/lib/validation-batch.test.ts`, `tools/tests/lib/build-validation-integration.test.ts`, `docs/planning/milestones/006-cascade-mode-for-good/subtasks.json`, `docs/planning/PROGRESS.md`

## 2026-02-11

### SUB-038
- **Problem:** Needed end-to-end verification that the refactored calibration flow runs in bounded batches/signals without context-window crashes across intention, technical, self-improvement, and full-suite modes.
- **Changes:** Ran dry-run calibration checks with `--review` for milestone 006 (`intention`, `technical`, `improve`, and `all`) and captured logs showing per-batch progress plus signal-based self-improvement filtering (`offTrackScore` gating). Ran cross-milestone intention check on milestone 003: full queue surfaced an existing invalid commit-evidence blocker (`SUB-155`), then verified file-based `TASK-* -> STORY-*` resolution path using a focused temp queue (`subtasks.sub-038-temp.json`). Verified periodic build calibration wiring via targeted integration test plus build-loop gating checks (`calibrateEvery > 0 && iteration % calibrateEvery === 0` triggers `runCalibrate("all", ...)`).
- **Files:** `docs/planning/milestones/006-cascade-mode-for-good/feedback/sub-038-intention-review.log`, `docs/planning/milestones/006-cascade-mode-for-good/feedback/sub-038-technical-review.log`, `docs/planning/milestones/006-cascade-mode-for-good/feedback/sub-038-improve-review.log`, `docs/planning/milestones/006-cascade-mode-for-good/feedback/sub-038-all-review.log`, `docs/planning/milestones/003-ralph-workflow/feedback/sub-038-intention-review.log`, `docs/planning/milestones/003-ralph-workflow/feedback/sub-038-intention-review-temp.log`, `tools/tests/lib/build-validation-integration.test.ts`, `tools/src/commands/ralph/build.ts`, `docs/planning/milestones/006-cascade-mode-for-good/subtasks.json`, `docs/planning/PROGRESS.md`
