# Taste-Testing Ralph: Milestones 003 & 004

A hands-on guide to try every feature delivered in the last two milestones. Audited against the actual source code -- only commands that are fully wired and runnable are included. Known limitations are called out explicitly.

---

## Prerequisites

```bash
# Verify aaa is installed and accessible
aaa --version

# You need at least one milestone with stories/tasks/subtasks to work with
# If starting fresh, use ralph plan to create them (see Section 2)
```

Required: `claude` CLI installed. For multi-provider testing (Milestone 004): also `opencode`.

---

## Part 1: Status & Discovery (no API calls, safe to run anytime)

These commands are pure TypeScript -- no provider invocation, no cost. Good starting point.

### 1a. List milestones

```bash
aaa ralph milestones
```

**Expect:** List of milestones discovered from `docs/planning/roadmap.md` with completion status.

```bash
aaa ralph milestones --json
```

**Expect:** Same data as JSON (pipe-friendly).

### 1b. Check build status

```bash
aaa ralph status
```

**Expect:** Config section, subtask queue summary (progress bar, last completed, next pending), iteration diary stats. Shows the default `subtasks.json`.

```bash
aaa ralph status --subtasks docs/planning/milestones/003-ralph-workflow/subtasks.json
```

**Expect:** Status for a specific milestone's subtask queue.

### 1c. List available models

```bash
aaa ralph models
```

**Expect:** Merged list of static baseline + dynamically discovered models, grouped by provider.

```bash
aaa ralph models --provider opencode
aaa ralph models --json
```

**Expect:** Filtered to one provider / JSON output.

### 1d. Subtask queue operations

```bash
aaa ralph subtasks list --milestone 003-ralph-workflow
aaa ralph subtasks list --milestone 003-ralph-workflow --pending
aaa ralph subtasks next --milestone 003-ralph-workflow
```

**Expect:** `list` shows all subtasks with status. `--pending` filters to pending only. `next` shows the next runnable subtask.

### 1e. Session management

```bash
aaa session list
aaa session list --verbose
aaa session path
aaa session current
```

**Expect:** `list` shows recent Claude Code sessions with timestamps. `path` prints the session JSONL file path. `current` shows the active session content.

---

## Part 2: Planning Commands (interactive Claude sessions)

These launch an interactive Claude chat. They cost API tokens.

### 2a. Vision planning (Socratic dialogue)

```bash
aaa ralph plan vision
```

**Expect:** Opens an interactive Claude session using the vision-interactive prompt. Claude asks you questions to help define your product vision.

### 2b. Roadmap planning

```bash
aaa ralph plan roadmap
```

**Expect:** Interactive session for defining milestones and priorities.

### 2c. Story planning for a milestone

```bash
# Interactive mode (default) -- opens Claude chat
aaa ralph plan stories --milestone 003-ralph-workflow

# Supervised mode -- watches output
aaa ralph plan stories --milestone 003-ralph-workflow --supervised

# Headless -- JSON output, no interaction
aaa ralph plan stories --milestone 003-ralph-workflow --headless
```

**Expect:** Generates user stories for the milestone. Three modes give different levels of interaction.

### 2d. Task planning

```bash
# From a single story
aaa ralph plan tasks --story docs/planning/milestones/003-ralph-workflow/stories/STORY-001-artifact-approvals.md

# Auto-generate for all stories in a milestone (requires --supervised or --headless)
aaa ralph plan tasks --milestone 003-ralph-workflow --supervised

# From a file or inline text
aaa ralph plan tasks --file my-spec.md
aaa ralph plan tasks --text "implement user authentication with JWT"
```

**Expect:** Creates technical task files from the source material.

### 2e. Subtask planning

```bash
# From the full hierarchy (story -> task -> subtask)
aaa ralph plan subtasks --milestone 003-ralph-workflow

# From a specific task
aaa ralph plan subtasks --task docs/planning/milestones/003-ralph-workflow/tasks/TASK-001-cascade-types.md

# From a story
aaa ralph plan subtasks --story docs/planning/milestones/003-ralph-workflow/stories/STORY-004-cascade-mode.md

# Control decomposition granularity
aaa ralph plan subtasks --milestone 003-ralph-workflow --size small   # fine-grained
aaa ralph plan subtasks --milestone 003-ralph-workflow --size medium  # default
aaa ralph plan subtasks --milestone 003-ralph-workflow --size large   # coarse

# 1-to-1 mapping (no decomposition)
aaa ralph plan subtasks --milestone 003-ralph-workflow --1-to-1

# From a file or text
aaa ralph plan subtasks --file my-spec.md
aaa ralph plan subtasks --text "build the login form component"
```

**Expect:** Generates subtask entries in `subtasks.json`. Includes duplicate pre-check -- skips already-existing task references.

---

## Part 3: Approval System (Milestone 003)

Approval gates trigger when Ralph creates artifacts. Three modes:

### 3a. Force mode (skip all approvals)

```bash
aaa ralph plan stories --milestone 003-ralph-workflow --force
```

**Expect:** Writes artifacts immediately regardless of config. Useful for automation.

### 3b. Review mode (prompt at every gate)

```bash
aaa ralph plan tasks --milestone 003-ralph-workflow --supervised --review
```

**Expect:** Before writing each artifact set, shows a summary and asks `Approve? [Y/n]`. Press Enter to continue.

### 3c. Configure per-artifact gates

In `aaa.config.json`:

```json
{
  "ralph": {
    "approvals": {
      "createStories": "always",
      "createTasks": "suggest",
      "createSubtasks": "auto",
      "onDriftDetected": "always"
    }
  }
}
```

- `"always"` = interactive Y/n prompt (TTY) or exit-unstaged pattern (headless)
- `"suggest"` = shows summary, brief pause, continues
- `"auto"` = writes immediately (default)

**Expect:** Different approval behavior at each planning level based on config.

---

## Part 4: Build Loop (the core execution engine)

### 4a. Supervised build (default)

```bash
aaa ralph build
```

**Expect:** Picks up the next pending subtask from `subtasks.json`, spawns a Claude session to implement it, writes results. Repeats until queue empty or max iterations. You can watch and Ctrl+C to stop.

### 4b. Headless build

```bash
aaa ralph build --headless
```

**Expect:** JSON output mode. No interactive prompts. Suitable for CI/automation. Permission bypass enabled automatically.

### 4c. Interactive build (pause between iterations)

```bash
aaa ralph build -i
```

**Expect:** After each subtask completes, pauses and waits for you before continuing to the next one.

### 4d. Quiet build

```bash
aaa ralph build --quiet
```

**Expect:** Suppresses the terminal summary box between iterations. Still writes summary files.

### 4e. Max iterations

```bash
aaa ralph build --max-iterations 5
```

**Expect:** Stops after 5 iterations regardless of remaining subtasks.

### 4f. Custom subtasks path

```bash
aaa ralph build --subtasks docs/planning/milestones/003-ralph-workflow/subtasks.json
```

**Expect:** Uses a specific subtask file instead of the default `subtasks.json`.

---

## Part 5: Pre-Build Validation (Milestone 003)

### 5a. Validate before building

```bash
aaa ralph build --validate-first
```

**Expect:** Before the build loop starts, invokes the provider to check each pending subtask against its parent story/task chain. Aligned subtasks proceed. Misaligned ones: in supervised mode you're prompted "Skip this subtask?"; in headless mode they're auto-skipped with feedback written.

### 5b. Combine with other flags

```bash
aaa ralph build --validate-first --max-iterations 3
```

**Expect:** Validates first, then builds at most 3 subtasks from the validated set.

---

## Part 6: Cascade Mode (Milestone 003)

Cascade chains levels together: after one level completes, the next starts automatically.

**Important limitation:** Currently only `build` and `calibrate` are executable cascade levels. Planning levels (stories, tasks, subtasks) are NOT yet wired as cascade targets. This means:

### 6a. What works: subtasks -> build (from plan subtasks)

```bash
aaa ralph plan subtasks --milestone 003-ralph-workflow --cascade build
```

**Expect:** Subtasks are generated interactively, then the build loop starts automatically in headless mode. This works because the plan command runs the planning step itself, then hands off to cascade for the `build` level.

### 6b. What works: subtasks -> calibrate

```bash
aaa ralph plan subtasks --milestone 003-ralph-workflow --cascade calibrate
```

**Expect:** Subtasks generated, then build runs, then calibration runs automatically.

### 6c. What works: build -> calibrate

```bash
aaa ralph build --cascade calibrate
```

**Expect:** Build loop runs, then when complete, `ralph calibrate all` runs automatically.

### 6d. What does NOT work yet: stories -> build

```bash
# This will FAIL at cascade time:
aaa ralph plan stories --milestone 003-ralph-workflow --cascade build
```

**Expect:** Stories are generated successfully, but cascade fails with: `"Level 'tasks' is a planning level and is not yet implemented for cascade execution"`. The path stories->tasks->subtasks->build requires going through planning levels that don't have runLevel adapters yet.

### 6e. Resume with --from

```bash
aaa ralph plan subtasks --milestone 003-ralph-workflow --cascade calibrate --from build
```

**Expect:** Skips to build level, then cascades to calibrate.

**Gotcha:** `--from` must be *before* `--cascade` in the level order. `--from build --cascade build` errors with "Cannot cascade backward" because same-level is treated as backward. If you only need to run build (planning already done), skip cascade entirely and call build directly:

```bash
# Planning done? Just build directly.
aaa ralph build --subtasks docs/planning/milestones/003-ralph-workflow/subtasks.json
```

---

## Part 7: Auto-Calibration During Build (Milestone 003)

### 7a. Calibrate every N subtasks

```bash
aaa ralph build --calibrate-every 3
```

**Expect:** After every 3 completed subtasks, the build pauses and runs `ralph calibrate all` (intention + technical + self-improvement). Then resumes.

### 7b. Via config

In `aaa.config.json`:

```json
{
  "ralph": {
    "build": {
      "calibrateEvery": 5
    },
    "calibration": {
      "afterMilestone": true
    }
  }
}
```

```bash
aaa ralph build
```

**Expect:** Calibration triggers every 5 subtasks and once more when all subtasks complete.

---

## Part 8: Calibration Commands (Milestone 003)

Each spawns parallel sub-agents (one per completed subtask) for analysis.

### 8a. Intention drift

```bash
aaa ralph calibrate intention
```

**Expect:** Checks whether implementations match the original vision/stories. Produces a synthesized, severity-ranked report.

### 8b. Technical quality

```bash
aaa ralph calibrate technical
```

**Expect:** Analyzes code quality and technical debt. Uses `technical-drift.md` prompt (present in codebase).

### 8c. Self-improvement

```bash
aaa ralph calibrate improve
```

**Expect:** Analyzes session logs for patterns where Ralph struggled (retries, wrong approaches). Respects `selfImprovement.mode` config -- set to `"off"` to skip.

### 8d. Run all

```bash
aaa ralph calibrate all
```

**Expect:** Runs intention, technical, and improve sequentially.

### 8e. With provider/model override

```bash
aaa ralph calibrate all --provider opencode --model gpt-4o
```

**Expect:** Runs calibration using OpenCode instead of Claude.

---

## Part 9: Multi-Provider Support (Milestone 004)

Only **claude** and **opencode** are implemented providers. Codex, gemini, pi, cursor are typed but will error at runtime with "Provider 'X' is not enabled in this Ralph runtime."

### 9a. Default (Claude, unchanged)

```bash
aaa ralph build
```

**Expect:** Uses `claude` CLI. Zero breaking changes from before milestone 004.

### 9b. Explicit Claude

```bash
aaa ralph build --provider claude
```

**Expect:** Same as default, explicit. Useful for overriding config that points elsewhere.

### 9c. Build with OpenCode

```bash
aaa ralph build --provider opencode
```

**Expect:** Spawns `opencode run` instead of `claude -p`. JSONL output parsed and normalized to the same `AgentResult` format. Costs, duration, session IDs tracked. Hard timeout enforced (OpenCode hangs forever on API errors).

### 9d. OpenCode + specific model

```bash
aaa ralph build --provider opencode --model gpt-4o
```

**Expect:** Uses OpenCode with GPT-4o. Model passed in `provider/model` format automatically.

### 9e. Plan with a different provider

```bash
aaa ralph plan stories --milestone 003-ralph-workflow --supervised --provider opencode
aaa ralph plan tasks --milestone 003-ralph-workflow --supervised --provider opencode
aaa ralph plan subtasks --milestone 003-ralph-workflow --supervised --provider opencode
```

**Expect:** Planning commands use OpenCode for headless/supervised modes. Interactive mode (default for `plan vision` and `plan roadmap`) is still Claude-only.

### 9f. Code review with a different provider

```bash
aaa review --provider opencode
aaa review --provider opencode --model gpt-4o
```

**Expect:** Parallel multi-agent code review runs using OpenCode. `--provider` and `--model` flags are fully wired.

### 9g. Provider priority (3 ways to set it)

```bash
# 1. CLI flag (highest priority)
aaa ralph build --provider opencode

# 2. Environment variable
RALPH_PROVIDER=opencode aaa ralph build

# 3. Config file (lowest priority)
# In aaa.config.json: { "ralph": { "provider": "opencode", "model": "gpt-4o" } }
aaa ralph build
```

**Expect:** CLI flag > env var > config > auto-detect (defaults to claude).

---

## Part 10: Model Registry (Milestone 004)

### 10a. Refresh models from installed providers

```bash
aaa ralph refresh-models
```

**Expect:** Queries `opencode models --verbose`, parses output, writes discovered models to `providers/models-dynamic.ts`. Currently only opencode discovery is implemented.

### 10b. Dry run

```bash
aaa ralph refresh-models --dry-run
```

**Expect:** Shows what would be discovered without writing.

### 10c. Specific provider

```bash
aaa ralph refresh-models --provider opencode
```

**Expect:** Only queries OpenCode.

---

## Part 11: Review & Gap Analysis

All review commands launch a Claude session. Add `--headless` for non-interactive mode.

### 11a. Story review

```bash
aaa ralph review stories --milestone 003-ralph-workflow
aaa ralph review stories --milestone 003-ralph-workflow --headless
```

**Expect:** Quality review of stories -- completeness, acceptance criteria, clarity.

### 11b. Task review

```bash
aaa ralph review tasks --story docs/planning/milestones/003-ralph-workflow/stories/STORY-001-artifact-approvals.md
```

**Expect:** Reviews tasks for completeness against their parent story.

### 11c. Subtask review

```bash
aaa ralph review subtasks --subtasks docs/planning/milestones/003-ralph-workflow/subtasks.json
```

**Expect:** Reviews the subtask queue for issues, duplicates, misalignment.

### 11d. Roadmap review

```bash
aaa ralph review roadmap
```

**Expect:** Reviews the overall roadmap for coherence and prioritization.

### 11e. Gap analysis

```bash
aaa ralph review gap roadmap
aaa ralph review gap stories --milestone 003-ralph-workflow
aaa ralph review gap tasks --story docs/planning/milestones/003-ralph-workflow/stories/STORY-001-artifact-approvals.md
aaa ralph review gap subtasks --subtasks docs/planning/milestones/003-ralph-workflow/subtasks.json
```

**Expect:** Each identifies missing items at its level. "What stories are missing from this milestone?" etc.

---

## Part 12: Skills (Inside Claude Code sessions)

| Skill              | What it does                                                     |
| ------------------ | ---------------------------------------------------------------- |
| `/ralph-plan`      | Interactive planning (vision, roadmap, stories, tasks, subtasks) |
| `/ralph-build`     | Run the build loop                                               |
| `/ralph-review`    | Review artifacts + gap analysis                                  |
| `/ralph-calibrate` | Drift detection and quality checks                               |
| `/ralph-status`    | Progress display                                                 |

```
/ralph-build
/ralph-plan vision
/ralph-review stories --milestone 003-ralph-workflow
/ralph-calibrate intention
/ralph-status
```

---

## Part 13: Subtask Archiving

```bash
aaa ralph archive subtasks --subtasks docs/planning/milestones/003-ralph-workflow/subtasks.json
aaa ralph archive progress --progress path/to/progress.json
```

**Expect:** Archives completed subtasks/progress data for record-keeping.

---

## Power Combos (tested flag combinations)

```bash
# Build with validation, auto-calibration, and OpenCode
aaa ralph build --validate-first --calibrate-every 3 --provider opencode --model gpt-4o

# Build then auto-calibrate
aaa ralph build --cascade calibrate

# Generate subtasks then build them (the working cascade path)
aaa ralph plan subtasks --milestone my-milestone --cascade build

# Headless build with max iterations and cascade to calibration
aaa ralph build --headless --max-iterations 10 --cascade calibrate

# Force through approvals during subtask generation, then build
aaa ralph plan subtasks --milestone my-milestone --cascade build --force

# Review-gated subtask generation then build
aaa ralph plan subtasks --milestone my-milestone --cascade build --review

# Interactive build with a different provider
aaa ralph build -i --provider opencode

```

---

## Known Limitations

| Area                         | Limitation                                                                                                                                                                                                                                             |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Cascade planning levels**  | `stories`, `tasks`, `subtasks`, `roadmap` are NOT executable as cascade targets. Only `build` and `calibrate` have `runLevel` adapters. Cascade from `plan stories --cascade build` fails because the intermediate planning levels can't auto-execute. |
| **Providers**                | Only `claude` and `opencode` work. `codex`, `gemini`, `pi`, `cursor` are typed but error at runtime.                                                                                                                                                   |
| **Plan vision/roadmap**      | Always use Claude -- no `--provider` flag.                                                                                                                                                                                                              |
| **Post-iteration summaries** | Always use Claude Haiku regardless of `--provider` setting.                                                                                                                                                                                            |
| **Review commands**          | No `--provider` flag (use Claude's interactive mode).                                                                                                                                                                                                  |

---

## What's Next?

1. **Cascade planning adapters**: Wire `stories`, `tasks`, `subtasks` as executable cascade levels so `plan stories --cascade build` works end-to-end.

2. **More providers**: Codex, Gemini CLI, Pi Mono have type definitions ready. Each is ~2 hours following the pattern in `providers/`.

3. **Provider-neutral summaries**: Route post-iteration summary through the provider abstraction instead of hardcoded Claude Haiku.

4. **Review command provider support**: Add `--provider` flag to `ralph review` commands.

5. **Approval presets**: Named profiles (`"strict"`, `"autonomous"`, `"ci"`) that set all gates at once.

6. **Model cost tracking**: Aggregate cost reporting across providers per milestone.

7. **Provider benchmarking**: Run same subtasks with different providers, compare quality/cost/speed.
