# Ralph Build Consolidation Plan

Date: 2026-02-08
Status: Proposed plan (aligned with current findings)

## Goal

Consolidate subtask selection and iteration prompting so `aaa ralph build`, skills, and prompts all follow one runtime truth.

## Decisions Locked

1. CLI becomes the source of truth for queue selection and assignment.
2. Prompt-level `jq` workflow should be removed from the normal path.
3. `/ralph-build` should not be a thin wrapper, but it must reuse CLI-supervised semantics as much as possible.
4. A CLI-exposed “pick next subtask” capability is needed so skills can fetch assignment with the same logic as build.
5. Legacy story creation and task creation skills are deleted (no deprecation window, no aliasing).
6. Naming, numbering, and placement are normalized to milestone-first, folder-local rules:
   - Milestone directories: `<NNN>-<milestone-slug>/` (example: `005-consolidate-simplify/`).
   - Milestone number allocation scans only `docs/planning/milestones/` directories matching `^[0-9]{3}-`, then uses `max + 1` (ignores `_orphan` and non-milestone files).
   - Task files: `<NNN>-TASK-<task-title>.md` (example: `001-TASK-auth-api.md`).
   - Story files: `<NNN>-STORY-<story-title>.md`.
   - Subtask IDs: `SUB-<NNN>`, scoped to the target milestone queue file (`docs/planning/milestones/<milestone>/subtasks.json`).
   - Subtask ID uniqueness is required within that milestone queue file (no duplicate `id` entries in one queue).
   - New subtask IDs are allocated from that milestone queue only (max `SUB-<NNN>` in that file + 1).
   - No repo-wide/global subtask ID scan.
   - Numbering is local to where artifacts are created (folder/file scope), not global across all milestones.
   - Default placement is milestone-scoped: `docs/planning/milestones/<milestone>/stories/`, `docs/planning/milestones/<milestone>/tasks/`, `docs/planning/milestones/<milestone>/subtasks.json`.
7. Queue command operations require milestone context (no implicit/global queue target).
8. Prompts/docs must stay DRY: keep canonical rules in atomic docs under `context/` and reference them from skills/workflows instead of duplicating rule blocks.

## Clarifications (Current Behavior)

1. Assignment is currently done by the build loop, not by the model.
   - `runBuild()` selects `currentSubtask` via `getNextSubtask(...)` and passes it into iteration invocation.
   - Reference: `tools/src/commands/ralph/build.ts:1215`, `tools/src/commands/ralph/build.ts:1216`, `tools/src/commands/ralph/config.ts:206`.
2. In headless mode, assignment appears once in injected context.
   - Reference: `tools/src/commands/ralph/build.ts:248`, `tools/src/commands/ralph/build.ts:272`.
3. `done` and `status` are different concerns, but current data still mixes them.
   - Canonical queue state is `done` in `subtasks.json`.
   - Canonical iteration outcome is `status` in diary logs.
   - Some existing queue entries still include legacy `status` fields; runtime queue logic ignores them.
   - References: `docs/planning/schemas/subtasks.schema.json:76`, `docs/planning/schemas/iteration-diary.schema.json:17`, `docs/planning/milestones/003-ralph-workflow/subtasks.json:32`, `tools/src/commands/ralph/config.ts:206`.

## What Is Inconsistent Today

1. CLI and skill drift on defaults and workflow details.
   - `/ralph-build` says default max iterations is 3; CLI default is 0 (unlimited).
   - Skill describes prompting for path; CLI defaults to `subtasks.json` and resolves from flags.
   - References: `.claude/skills/ralph-build/SKILL.md:24`, `tools/src/commands/ralph/index.ts:599`, `tools/src/commands/ralph/index.ts:583`.
2. Prompt text is still shell-era and `jq`-heavy.
   - It includes placeholder commands (`SUB-XXX`, `path/to/subtasks.json`) and references `build.sh`.
   - References: `context/workflows/ralph/building/ralph-iteration.md:53`, `context/workflows/ralph/building/ralph-iteration.md:363`, `context/workflows/ralph/building/ralph-iteration.md:488`.
3. Headless and supervised provider contexts are not symmetric.
   - Headless gets full generated prompt context with concrete command snippet.
   - Supervised gets a short inline context string.
   - References: `tools/src/commands/ralph/build.ts:266`, `tools/src/commands/ralph/build.ts:839`.
4. `ralph build --print` does not reflect runtime prompt assembly.
   - It prints full prompt + full subtasks file, but runtime is per-assigned-subtask.
   - References: `tools/src/commands/ralph/index.ts:645`, `tools/src/commands/ralph/index.ts:656`, `tools/src/commands/ralph/build.ts:1279`.
5. Additional drift in adjacent docs/skills.
   - `docs/ralph/README.md` states build loop headless by default (CLI default is supervised).
   - `ralph-status` skill points to deleted shell script path.
   - Iteration summary prompt uses `success|failure|partial`, while runtime status is `completed|failed|retrying`.
   - References: `docs/ralph/README.md:60`, `tools/src/commands/ralph/index.ts:668`, `.claude/skills/ralph-status/SKILL.md:55`, `context/workflows/ralph/hooks/iteration-summary.md:44`, `tools/src/commands/ralph/types.ts:192`.
6. Naming and numbering rules conflict across planning surfaces.
   - Ralph planning prompts currently describe `STORY-<NNN>-...` and `TASK-<NNN>-...` while schema fields still encode numeric-slug references and old global-numbering guidance remains in places.
   - Legacy `aaa story create` / `aaa task create` defaults are global dirs (`docs/planning/stories`, `docs/planning/tasks`) instead of milestone-first placement.
   - References: `context/workflows/ralph/planning/stories-auto.md:128`, `context/workflows/ralph/planning/tasks-auto.md:149`, `docs/planning/schemas/subtasks.schema.json:59`, `tools/src/cli.ts:154`, `tools/src/cli.ts:179`.
7. Subtask numbering/uniqueness is currently prompt-defined rather than runtime-enforced.
   - Prompt docs currently instruct global `SUB-<NNN>` scanning across all subtasks files, not file-local allocation.
   - Runtime append logic only filters against IDs already in the existing file and does not enforce uniqueness inside a newly generated batch.
   - Build completion/invariant checks are ID-based and assume unique IDs in queue operations.
   - References: `context/workflows/ralph/planning/subtask-spec.md:125`, `context/workflows/ralph/planning/subtasks-from-hierarchy.md:49`, `tools/src/commands/ralph/config.ts:510`, `tools/src/commands/ralph/config.ts:513`, `tools/src/commands/ralph/build-invariant.ts:30`.
8. Prompt/skill guidance is not DRY enough and duplicates rule text instead of referencing atomic docs.
   - Numbering/naming/sizing rules are repeated across planning workflows and skills, which invites drift.
   - References: `context/workflows/ralph/planning/subtask-spec.md:120`, `context/workflows/ralph/planning/tasks-auto.md:149`, `context/workflows/ralph/planning/stories-auto.md:128`, `.claude/skills/ralph-plan/SKILL.md:1`.
9. Queue data model drift: legacy `status` fields exist in `subtasks.json` entries.
   - Runtime selection, progress, and completion use `done` only.
   - Mixed `done` + `status` in queue files is confusing and can diverge semantically.
   - References: `docs/planning/milestones/003-ralph-workflow/subtasks.json:32`, `tools/src/commands/ralph/config.ts:206`, `tools/src/commands/ralph/status.ts:325`.

## Detailed Remediation (What To Do)

This section is the execution playbook for the inconsistency audit above.

### Inconsistency 1: CLI vs Skill Drift

What to change:

1. Update `.claude/skills/ralph-build/SKILL.md` to match actual CLI defaults and flags:
   - `--max-iterations` default is `0` (unlimited).
   - supervised is default mode unless `--headless`.
   - no ad-hoc “prompt for subtasks path” behavior that diverges from CLI.
2. Remove behavior definitions from skill that duplicate CLI control flow. Keep skill as supervised guidance and operator flow only.
3. Add a single source section in skill: “Runtime behavior is defined by `aaa ralph build`.”

Tests and checks:

1. Add/update snapshot tests (or string asserts) for skill docs in lint/docs validation pipeline if available.
2. Manual check:
   - `aaa ralph build --help`
   - compare to `.claude/skills/ralph-build/SKILL.md` options block.

Done criteria:

1. Skill text and CLI help are consistent for defaults, mode behavior, and flags.

### Inconsistency 2: Shell-Era Prompt (`jq` and `build.sh` language)

What to change:

1. Rewrite `context/workflows/ralph/building/ralph-iteration.md`:
   - remove `build.sh` references.
   - remove generic `SUB-XXX`/`path/to/...` mutation recipes as the primary path.
   - instruct queue operations via milestone-scoped CLI subcommands (`aaa ralph subtasks next/list/complete --milestone <name | filepath>`).
2. Keep `jq` only as break-glass troubleshooting guidance, not normal execution.
3. Ensure Phase 7 tracking language reflects runtime invariants enforced by TypeScript.

Tests and checks:

1. Add prompt smoke test fixture for required tokens:
   - must include `aaa ralph subtasks`.
   - must not include `outer loop (build.sh)` text.
2. Manual dry run:
   - `aaa ralph build --print` should show updated instructions.

Done criteria:

1. Build prompt no longer directs normal operation through `jq`.
2. Shell-era references removed.

### Inconsistency 3: Headless vs Supervised Context Mismatch

What to change:

1. Create one shared iteration-context builder function used by both:
   - headless invocation path.
   - supervised invocation path.
2. Remove supervised inline context string duplication in `tools/src/commands/ralph/build.ts`.
3. Guarantee same assignment payload fields in both modes:
   - subtask object.
   - subtasks path.
   - progress path.
   - completion expectations.

Tests and checks:

1. Unit test: shared builder output used by both mode call sites.
2. Integration test: `--headless` vs default supervised prompt context parity for same assigned subtask.

Done criteria:

1. One canonical context builder; both modes consume identical payload structure.

### Inconsistency 4: `--print` Mismatch

What to change:

1. Replace current `--print` behavior in `tools/src/commands/ralph/index.ts`:
   - stop dumping full subtasks file.
   - resolve next runnable subtask using same selection logic as build.
   - print effective iteration prompt for that assignment.
2. Add explicit note if queue is empty or blocked, matching runtime handling.

Tests and checks:

1. Unit/integration test that `--print` selected subtask ID equals runtime `getNextSubtask`.
2. Fixture test for large queue ensures `--print` output stays bounded and assignment-focused.

Done criteria:

1. `--print` output mirrors real provider input for one iteration.

### Inconsistency 5: Adjacent Docs/Skills Drift

What to change:

1. Update `docs/ralph/README.md` build mode wording to supervised default.
2. Update `.claude/skills/ralph-status/SKILL.md`:
   - remove deleted shell script execution instruction.
   - describe TypeScript status behavior.
3. Update `context/workflows/ralph/hooks/iteration-summary.md`:
   - use canonical status names (`completed|failed|retrying`) or explicitly document normalization boundary.

Tests and checks:

1. Search-based assertions in tests/scripts:
   - no `status.sh` script references.
   - no stale “build defaults to headless” claim.
2. Manual run:
   - `aaa ralph status --subtasks <path>`
   - verify skill docs match observed output categories.

Done criteria:

1. Status vocabulary and mode defaults are consistent across runtime, prompts, and docs.

### Inconsistency 6: Naming/Numbering/Placement Drift

What to change:

1. Implement naming utilities in TypeScript and route all planning writes through them.
2. Enforce:
   - milestones: `<NNN>-<slug>/` under `docs/planning/milestones/`.
   - stories: `<NNN>-STORY-<slug>.md`.
   - tasks: `<NNN>-TASK-<slug>.md`.
   - `<NNN>` allocated from target folder only.
3. Make milestone path the default output location for stories/tasks/subtasks planning.
4. Delete legacy planning-create skills:
   - `.claude/skills/<legacy-story-skill>/SKILL.md`
   - `.claude/skills/<legacy-task-skill>/SKILL.md`
5. Remove references from README/eval/docs tables.

Tests and checks:

1. Unit tests for naming utility:
   - next milestone number from existing milestone directories (ignoring `_orphan` and non-matching files).
   - next number from sparse folder contents.
   - formatting normalization.
2. Integration tests for plan commands:
   - writes into milestone directories by default.
   - emits required filename pattern.

Done criteria:

1. New artifacts always use the normalized naming format and milestone placement.

### Inconsistency 7: Subtask Numbering/Uniqueness Enforcement

What to change:

1. Implement milestone-scoped subtask ID allocator:
   - reads only target `docs/planning/milestones/<milestone>/subtasks.json`.
   - next ID = max `SUB-<NNN>` in that file + 1.
2. Strengthen append/write path in `tools/src/commands/ralph/config.ts`:
   - detect duplicate IDs within incoming batch.
   - reject write on duplicates with clear error.
3. Update planning prompts:
   - remove repo-wide subtask scan instructions.
   - document milestone-scoped allocation only.

Tests and checks:

1. Unit tests:
   - allocator reads only target milestone queue.
   - duplicate IDs in incoming batch fail fast.
2. Integration tests:
   - two milestones can both have `SUB-001`.
   - build works correctly with milestone-local IDs.

Done criteria:

1. Subtask ID generation and uniqueness are enforced in code, milestone-scoped, and aligned with docs.

### Inconsistency 8: Prompt/Skill DRY Violations

What to change:

1. Move canonical naming/numbering/placement rules into atomic docs in `context/blocks/docs/` and keep one source of truth.
2. Update planning workflows and skills to reference those docs instead of restating full rule tables.
3. Keep only workflow-specific instructions in each prompt; remove generic repeated rule blocks.

Tests and checks:

1. Search-based check for duplicated rule headers/tables (for example, repeated `ID Generation` blocks) across planning prompts.
2. Doc sanity review confirms:
   - one canonical location for naming rules,
   - one canonical location for subtask ID rules,
   - workflow prompts mostly reference canonical docs.

Done criteria:

1. Numbering/naming rules are maintained in one atomic doc path and referenced elsewhere.

### Inconsistency 9: Queue `done` vs Legacy `status` Drift

What to change:

1. Declare `done` as the only queue completion field and treat queue-level `status` as legacy.
2. Add a queue-normalization step in load/write path:
   - when writing `subtasks.json`, remove legacy `status` keys from subtask entries.
   - optionally log a one-line migration notice when legacy fields are detected.
3. Update prompts/skills/examples so queue updates mention `done` only.
4. Keep `status` vocabulary only in iteration diary docs/schemas.

Tests and checks:

1. Unit tests:
   - loading a queue with legacy `status` still works.
   - saving that queue drops `status` while preserving required fields.
2. Integration checks:
   - `aaa ralph status` progress is unchanged after normalization.
   - build invariant checks are unchanged (still keyed by `done`).

Done criteria:

1. New queue artifacts never contain `status`.
2. Existing queue files are either normalized in-place on write or migrated via explicit command.

### Cross-Cutting Execution Order

Recommended order to minimize churn:

1. Land naming/placement + subtask allocator utilities first (infrastructure).
2. Implement milestone-required queue command surface.
3. Update build prompt/runtime and `--print` behavior.
4. Do docs/prompt DRY pass with atomic-doc references.
5. Delete legacy create skills and sync docs in same branch.
6. Finish with regression tests and fixtures before merge.

## Why Points 3 and 4 Matter (Expanded)

### 3) Headless vs Supervised Context Mismatch

Current:

- Headless flow builds one canonical context payload (`buildIterationPrompt`) with assignment and command guidance.
- Supervised flow builds a different inline context string.

Risk:

- Fixes made in one mode can silently miss the other mode.
- Behavioral drift appears as “works in headless, fails in supervised.”

Added value after consolidation:

- One shared context builder for both modes.
- Easier testing: one fixture/expectation for both execution modes.
- Fewer prompt regressions and less maintenance.

### 4) `--print` Mismatch

Current:

- `--print` dumps full subtasks file content.
- Runtime does not send full queue per iteration; it sends assigned-subtask context.

Risk:

- Debug output misleads users about real provider input and token pressure.
- Large subtasks files make print mode noisy and less useful.

Added value after consolidation:

- `--print` can show “effective iteration prompt” for the next selected subtask.
- Better reproducibility: printed prompt matches what build will actually execute.

## Consolidated Target Design

### 1) Canonical Queue API in TypeScript

Add queue-oriented CLI subcommands that reuse `getNextSubtask` logic:

1. `aaa ralph subtasks next --milestone <name | filepath> [--json]`
2. `aaa ralph subtasks list --milestone <name | filepath> --pending --limit 10 [--json]`
3. `aaa ralph subtasks complete --milestone <name | filepath> --id <SUB-...> --commit <hash> --session <id> [--at <iso>]`

Notes:

1. `next` and build must call the same function path for assignment resolution.
2. Subtask operations must resolve a milestone-scoped queue target; no implicit global queue.
3. This removes mutation responsibility from model-authored `jq`.

### 2) Prompt Contract

1. Build prompt should describe process, not shell mutation recipes.
2. Queue interactions should reference CLI commands (`aaa ralph subtasks ...`) instead of raw `jq`.
3. Remove stale shell references (`build.sh`) from prompt docs.
4. Keep prompt rules DRY by referencing atomic docs in `context/` instead of copying full rule sections.

### 3) Skill Contract (`/ralph-build`)

1. Keep skill-level guidance for supervised interactive flow.
2. First step in skill: call `aaa ralph subtasks next --milestone <name | filepath>` (or `list --milestone <name | filepath> --limit 10`) to fetch assignment.
3. Use the same assignment object shape and completion path as CLI build.
4. Require milestone context for queue operations in skill flows.

### 4) Naming, Numbering, Placement Contract

1. Stories and tasks are milestone-scoped by default.
2. Milestone directory format: `<NNN>-<milestone-slug>/` under `docs/planning/milestones/`.
3. Milestone numbering is local to `docs/planning/milestones/` numeric directories only.
4. Story filename format: `<NNN>-STORY-<story-title>.md` (folder-local numbering).
5. Task filename format: `<NNN>-TASK-<task-title>.md` (folder-local numbering).
6. Subtask IDs remain `SUB-<NNN>` but are local to the target milestone `subtasks.json`.
7. Queue invariant: each `subtasks.json` must have unique subtask IDs.
8. Subtask ID allocator computes next ID from target milestone queue only.
9. Never scan all project subtasks files for next subtask ID.
10. Global `docs/planning/stories` and `docs/planning/tasks` become legacy/orphan-only paths, not default output targets.

## Delivery Plan

### Phase 1: Surface Cleanup + Naming Baseline

1. Delete the legacy planning-create skill files under `.claude/skills/`.
2. Remove references to those skills from docs/tables/eval scripts.
3. Introduce one naming utility for planning artifacts:
   - emit milestone directory names as `<NNN>-<slug>` from `docs/planning/milestones/` numbering
   - emit `<NNN>-STORY-...` and `<NNN>-TASK-...`
   - allocate NNN based on target folder only
   - allocate `SUB-<NNN>` from target milestone queue only (no repo/global scan)
4. Align placement defaults to milestone paths for all Ralph planning flows.

### Phase 2: Queue Command Surface

1. Implement `ralph subtasks next/list/complete` with required `--milestone <name | filepath>` context.
2. Refactor shared queue logic into one internal module if needed.
3. Add unit tests for:
   - dependency-aware `next` selection
   - `list --pending --limit`
   - completion field updates (`done`, `completedAt`, `commitHash`, `sessionId`)
   - duplicate-ID rejection/normalization for `subtasks.json` writes
   - command failure when milestone context is missing

### Phase 3: Build Runtime Consolidation

1. Replace prompt-level mutation guidance with CLI queue command guidance.
2. Use one shared assignment/context builder for headless and supervised.
3. Keep single-subtask invariant checks in runtime (`enforceSingleSubtaskInvariant`).

### Phase 4: Print Parity

1. Rework `ralph build --print` to render effective per-iteration prompt:
   - selected subtask
   - resolved paths
   - exact context actually sent
2. Avoid dumping full subtasks file by default.

### Phase 5: Skills + Docs Sync

1. Update `.claude/skills/ralph-build/SKILL.md` to match CLI defaults and new queue commands.
2. Update `.claude/skills/ralph-status/SKILL.md` to TypeScript status command behavior.
3. Update `docs/ralph/README.md` build mode defaults and examples.
4. Update `context/workflows/ralph/building/ralph-iteration.md` to remove stale shell-era steps.
5. Update `context/workflows/ralph/hooks/iteration-summary.md` status vocabulary to canonical values (or document normalization explicitly).
6. Update planning workflow docs to enforce the new filename convention:
   - `<NNN>-STORY-<story-title>.md`
   - `<NNN>-TASK-<task-title>.md`
   - folder-local numbering + milestone-first placement
7. Update subtask planning docs (`subtask-spec.md`, `subtasks-from-hierarchy.md`, `subtasks-from-source.md`) to use milestone-scoped `SUB-<NNN>` allocation + in-file uniqueness, replacing global-subtask numbering guidance.
8. Extract shared naming/numbering guidance into atomic docs under `context/blocks/docs/` and convert workflows/skills to references.

### Phase 6: Validation and Regression Guard

1. Add integration tests covering:
   - `build` + `subtasks next` parity
   - headless/supervised shared assignment payload parity
   - `--print` parity with effective runtime context
   - story/task naming output in milestone-scoped dirs
   - folder-local numbering behavior
   - subtask file-local numbering + uniqueness enforcement
2. Add fixture-based tests for large subtasks files and pending=0 edge cases.

## Learning References

1. Assignment and queue selection:
   - `tools/src/commands/ralph/build.ts:1215`
   - `tools/src/commands/ralph/build.ts:1279`
   - `tools/src/commands/ralph/config.ts:206`
2. Headless vs supervised context construction:
   - `tools/src/commands/ralph/build.ts:248`
   - `tools/src/commands/ralph/build.ts:839`
3. Print behavior vs runtime behavior:
   - `tools/src/commands/ralph/index.ts:645`
   - `tools/src/commands/ralph/index.ts:656`
4. Skill drift and stale script references:
   - `.claude/skills/ralph-build/SKILL.md:24`
   - `.claude/skills/ralph-status/SKILL.md:55`
5. Prompt/documentation drift:
   - `context/workflows/ralph/building/ralph-iteration.md:363`
   - `context/workflows/ralph/building/ralph-iteration.md:488`
   - `docs/ralph/README.md:60`
6. Status vocabulary mismatch and normalization:
   - `context/workflows/ralph/hooks/iteration-summary.md:44`
   - `tools/src/commands/ralph/types.ts:192`
   - `tools/src/commands/ralph/types.ts:402`
7. `done` vs `status` schema split:
   - `docs/planning/schemas/subtasks.schema.json:76`
   - `docs/planning/schemas/iteration-diary.schema.json:17`
8. Legacy create surfaces and current defaults:
   - `.claude/skills/<legacy-story-skill>/SKILL.md:2`
   - `.claude/skills/<legacy-task-skill>/SKILL.md:2`
   - `tools/src/cli.ts:145`
   - `tools/src/cli.ts:171`
