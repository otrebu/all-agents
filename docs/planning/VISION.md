# Ralph Vision Specification

> Last validated against runtime: 2026-02-13
>
> This is the normative contract for Ralph in this repository. When docs, skills, and code disagree, runtime code in `tools/src/commands/` is the source of truth.

## 1) Product Intent

Ralph exists to let teams run autonomous software delivery with humans governing intent, approvals, and quality.

Core principle:

- Humans stay on the loop (direction, acceptance, governance), while agents execute within explicit contracts.

## 2) Hierarchy and Artifacts

The planning and execution hierarchy is:

```text
VISION -> ROADMAP -> MILESTONE -> STORY/TASK -> SUBTASK -> BUILD -> CALIBRATE
```

Artifact expectations:

- `VISION.md` defines long-lived product and operating contracts.
- `ROADMAP.md` defines milestone sequencing and active forward work.
- Milestone artifacts live under `docs/planning/milestones/<slug>/`.
- Executable work queue is milestone-scoped `subtasks.json`.

## 3) Source-of-Truth Precedence

Precedence order is:

1. Runtime CLI implementation (`tools/src/commands/**`)
2. Unified config types/defaults (`tools/src/lib/config/**`)
3. Skill wrappers (`.claude/skills/**`)
4. Docs (`docs/planning/**`, `context/**`)

This means:

- Skills MUST mirror runtime behavior, not redefine it.
- Docs SHOULD describe runtime behavior exactly, including known limitations.

## 4) Runtime Surface

Primary Ralph command groups under `aaa ralph`:

- `build`
- `plan` (`vision`, `roadmap`, `stories`, `tasks`, `subtasks`)
- `review` (`roadmap`, `stories`, `tasks`, `subtasks`, `gap ...`)
- `calibrate` (`all`, `intention`, `technical`, `improve`)
- `status`, `milestones`, `models`, `refresh-models`
- `subtasks` (`next`, `list`, `complete`, `append`, `prepend`, `diff`, `apply`)
- `archive` (`subtasks`, `progress`)

Adjacent commands that are part of Ralph operations:

- `aaa review` (parallel multi-agent code review; separate from `aaa ralph review`)
- `aaa session` (session path/cat/current/list; commit trailer lookup)
- `aaa notify` (notification delivery and routing)
- `aaa sync-context` (required workflow/context sync for target projects)

## 5) Execution Modes

Ralph supports three operational modes:

- Interactive: user-in-chat workflows (primarily skill-driven and interactive plan commands)
- Supervised: runtime invokes provider with user watching
- Headless: runtime invokes provider autonomously for automation/CI

Mode defaults today:

- `aaa ralph build` defaults to supervised.
- `aaa ralph plan vision` and `aaa ralph plan roadmap` run supervised planning sessions.
- `aaa ralph plan stories` defaults to interactive unless `--supervised` or `--headless` is passed.
- `aaa ralph plan tasks --milestone` requires `--supervised` or `--headless`.
- `aaa ralph plan tasks --story` runs interactive Claude when no mode flag is passed.
- `aaa ralph plan tasks --file/--text` can run interactive Claude; when a non-`claude` provider is selected it routes through supervised invocation.
- `aaa ralph plan subtasks` defaults to supervised unless `--headless` is passed.
- `aaa ralph review ...` supports supervised and headless.

## 6) Cascade Contract (`--cascade`, `--from`)

Canonical level order:

```text
roadmap -> stories -> tasks -> subtasks -> build -> calibrate
```

Runtime rules:

- Cascade MUST move forward only.
- `--from <level>` resumes from a specific level.
- Validation rejects paths that include non-executable levels.

Current executable levels in runtime adapters:

- `tasks`, `subtasks`, `build`, `calibrate`

Current limitation:

- `roadmap` and `stories` are valid level names but are not executable cascade adapters in `runLevel()`.
- Consequence: `aaa ralph plan roadmap --cascade ...` can validate to no supported targets today.

## 7) Approval and Gate Contract

Approval modes (config):

- `auto`: write/apply directly
- `suggest`: soft gating (TTY and headless differ)
- `always`: explicit approval

Flag overrides:

- `--force` forces write/apply behavior.
- `--review` forces explicit review behavior.

Action resolution logic:

- `always` + TTY -> prompt
- `always` + non-TTY -> exit with unstaged changes (`exit-unstaged`)
- `suggest` + TTY -> proceed without prompt
- `suggest` + non-TTY -> notify and wait (`notify-wait`)
- `auto` -> write

Runtime-wired gates today:

- Cascade artifact gates: `createRoadmap`, `createStories`, `createTasks`, `createSubtasks`
- Calibration correction gate: `correctionTasks`

Config-declared but not fully runtime-wired gates (currently partial):

- `onDriftDetected`, `createAtomicDocs`, `promptChanges`

## 8) Planning Contract

Planning entrypoints:

- `aaa ralph plan vision`
- `aaa ralph plan roadmap`
- `aaa ralph plan stories --milestone <path>`
- `aaa ralph plan tasks` with exactly one source: `--story` | `--milestone` | `--file` | `--text`
- `aaa ralph plan subtasks` with exactly one source: `--milestone` | `--story` | `--task` | `--file` | `--text` | `--review-diary`

Subtasks planning controls:

- `--size <small|medium|large>`
- `--output-dir` for source-driven generation (mutually exclusive with `--milestone` source)
- Optional cascade controls when chaining into `build`/`calibrate`

## 9) Build and Validation Contract

Build command:

- `aaa ralph build`

Key guarantees:

- One subtask is selected and processed per iteration.
- Queue and status updates are persisted after successful completion.
- `--max-iterations` limits retries per subtask (`0` means unlimited).
- `--validate-first` runs pre-build validation and can stage/apply queue proposals before build iterations.

Validation proposal behavior:

- `--force` auto-applies.
- `--review` requires explicit approval.
- In headless without review, proposal mode defaults to auto-apply.

## 10) Calibration Contract

Calibration commands:

- `aaa ralph calibrate intention`
- `aaa ralph calibrate technical`
- `aaa ralph calibrate improve`
- `aaa ralph calibrate all`

Current behavior:

- Intention and technical checks can run as standalone or through `all`.
- Self-improvement (`improve`) reads session evidence and uses `selfImprovement.mode` (`off|suggest|autofix`).
- Correction proposals are written as queue proposals and staged/applied based on approval resolution.

Current limitation:

- `calibrate improve` does not currently expose `--dry-run` while other calibrate commands do.

## 11) Dry-Run and Workflow Visualization

Pipeline dry-run support currently covers eight pipeline commands:

- `build`
- `plan roadmap`
- `plan stories`
- `plan tasks`
- `plan subtasks`
- `calibrate all`
- `calibrate intention`
- `calibrate technical`

Dry-run behavior:

- Computes an execution plan with phase list, gate actions, reads/writes/steps, and summary.
- Renders pretty output by default or JSON when `ralph.dryRun.format = json` in `aaa.config.json`.
- Exits without executing pipeline actions.

Live visualization behavior:

- Runtime uses a stateful pipeline renderer for phase progress, gate wait states, and subtask progress in build/cascade execution.

Known limitation:

- Preview content is data-driven but still relies on template maps for human-readable flow text, so wording drift remains possible without shared-spec hardening.

## 12) Multi-Provider Contract

Declared provider types:

- `claude`, `opencode`, `codex`, `cursor`, `gemini`, `pi`

Runtime availability today:

- Enabled: `claude`, `opencode`
- Present but not enabled: `codex`, `cursor`, `gemini`, `pi`

Provider abstraction scope today:

- Shared provider primitives are used by both `aaa ralph ...` and top-level `aaa review` flows.

Provider selection priority (for commands that use provider resolver flow):

1. CLI flag (`--provider`)
2. Environment variable (`RALPH_PROVIDER`)
3. Config (`aaa.config.json` -> `ralph.provider`)
4. Auto-detect

Current caveat:

- Some planning wrappers choose `claude` by default unless `--provider` is explicitly passed.

Provider preflight MUST validate:

- provider is enabled in runtime
- mode support (supervised/headless)
- required binary exists in `PATH`

## 13) Model Registry Contract

Model resolution is table-based:

- Static baseline models from `models-static.ts`
- Dynamic discovered models from `models-dynamic.ts`
- Static entries take precedence on collisions

Commands:

- `aaa ralph models`
- `aaa ralph refresh-models`

Current limitation:

- Dynamic discovery is implemented for `opencode` only.

## 14) Session and Traceability Contract

Ralph uses session tracing as first-class metadata:

- completed subtasks include session linkage fields
- commits can carry `cc-session-id` trailers
- `aaa session` resolves sessions by ID or commit

This enables interrogation and post-run diagnostics from commit history.

## 15) Skills Contract (`/ralph-*`)

Core Ralph skills in this repo:

- `ralph-plan`
- `ralph-build`
- `ralph-calibrate`
- `ralph-review`
- `ralph-status`

Additional Ralph maintenance skill:

- `ralph-prompt-audit`

Skill contract rules:

- Skills SHOULD orchestrate and delegate; they MUST NOT drift from CLI contracts.
- Runtime wrapper skills (for example `ralph-calibrate`, `ralph-status`) MUST treat `aaa ralph ...` as authoritative behavior.
- Workflow-driven skills (for example `ralph-plan`, `ralph-review`) MUST reference canonical workflow docs under `context/workflows/ralph/`.

## 16) Atomic Docs Contract

Atomic docs are a core part of Ralph context engineering.

Layer model:

- `context/blocks/`
- `context/foundations/`
- `context/stacks/`
- `context/workflows/`

Operational requirements:

- The `context:atomic-doc` skill is the standard creation/update path.
- Updates SHOULD preserve index and structure conventions in `context/README.md`.
- Planning/build workflows that reference `@context/...` assume these files exist in the target project.

## 17) Setup Requirements

For use in a target project:

1. Sync context/workflows into target project:

```bash
aaa sync-context -t /path/to/project
```

2. (Optional) Enable global Claude skill/agent config via `CLAUDE_CONFIG_DIR` after `aaa setup --user`.

Without context sync, planning commands that depend on workflow prompts will fail.

## 18) Hooks, Notifications, and Logs

Unified config file:

- `aaa.config.json` (legacy `ralph.config.json` is compatibility fallback)

Ralph hooks:

- `onIterationComplete`
- `onSubtaskComplete`
- `onValidationFail`
- `onMaxIterationsExceeded`
- `onMilestoneComplete`

Hook actions:

- `log`, `notify`, `pause`

Notification routing:

- per-event overrides via `notify.events.<event>.{enabled,topic,priority,tags}`

Logging model:

- milestone daily JSONL logs under `docs/planning/milestones/<slug>/logs/`
- build/review summaries and queue mutation records

## 19) Code Review System Contract (`aaa review`)

Ralph-adjacent code review is implemented as a separate runtime command:

- `aaa review`

Current contract:

- Supports supervised and headless modes.
- Supports provider/model selection via the shared provider stack.
- Writes review diary records (default `logs/reviews.jsonl`).
- Reviewer orchestration behavior is primarily defined by review prompts/skills, while runtime enforces mode, diff-target, and approval constraints.

Safety controls:

- `--dry-run` requires `--headless`.
- `--require-approval` requires `--headless`.
- Diff targets are mutually exclusive (`--base`, `--range`, `--staged-only`, `--unstaged-only`).

Skill integration:

- Interactive orchestration is exposed through `/dev:code-review` and `/dev:interrogate` workflows.

## 20) Explicit Non-Goals and Deferred Work

Deferred or partial by design today:

- Full executable cascade adapters for `roadmap` and `stories`
- Enabling non-`claude`/`opencode` providers in Ralph runtime
- Dynamic model discovery beyond `opencode`
- Full runtime wiring of all schema-declared approval gates (`createAtomicDocs`, `promptChanges`, `onDriftDetected`)
- Guaranteeing preview text cannot drift without shared-spec convergence work
