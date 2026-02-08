# Taste-Testing Ralph: Milestones 003 & 004

A hands-on guide to try every feature delivered in the last two milestones. Focus: **happy path** with the `aaa` CLI and `/ralph-*` skills.

---

## Prerequisites

```bash
# Verify aaa is installed and accessible
aaa --version

# You need at least one milestone with stories/tasks/subtasks to work with
# If starting fresh, you can use ralph plan to create them (see Section 1)
```

You should have `claude` installed. For multi-provider testing (Milestone 004), also have `opencode` installed.

---

## Part 1: Cascade Mode (Milestone 003)

Cascade chains planning levels together automatically: stories -> tasks -> subtasks -> build -> calibrate. Instead of running each step manually, you set a target and Ralph pipelines through.

### 1a. Cascade from stories all the way to build

```bash
# Plan stories for a milestone, then automatically cascade through
# tasks -> subtasks -> build
aaa ralph plan stories --milestone 003-ralph-workflow --cascade build
```

**What to expect:** Ralph creates stories, then automatically proceeds to generate tasks from those stories, then subtasks from those tasks, then kicks off the build loop. Between each level, you'll see a transition message. If approval gates are set to `"always"`, you'll be prompted at each boundary.

### 1b. Cascade from subtasks to build

```bash
# Generate subtasks then immediately start building
aaa ralph plan subtasks --milestone 003-ralph-workflow --cascade build
```

**What to expect:** Subtasks are generated, then the build loop starts processing them one by one.

### 1c. Cascade from build to calibrate

```bash
# Build all pending subtasks, then run calibration automatically
aaa ralph build --cascade calibrate
```

**What to expect:** Build loop runs until all subtasks are done (or max iterations hit), then automatically runs `ralph calibrate all` to check for drift.

### 1d. Full pipeline: stories to calibrate

```bash
aaa ralph plan stories --milestone 003-ralph-workflow --cascade calibrate
```

**What to expect:** The complete pipeline: stories -> tasks -> subtasks -> build -> calibrate. This is the "set it and forget it" mode.

### 1e. Resume a cascade from a specific level

```bash
# If a cascade stopped at the tasks level, resume from there
aaa ralph plan stories --milestone 003-ralph-workflow --cascade build --from tasks
```

**What to expect:** Skips stories (already done), picks up at task generation, continues through subtasks and build.

---

## Part 2: Approval System (Milestone 003)

Approval gates trigger when Ralph is about to create artifacts (roadmap, stories, tasks, subtasks). Three modes control the behavior.

### 2a. Default behavior (auto mode)

With no config changes, approvals default to `"auto"` -- Ralph writes artifacts immediately with no pause.

```bash
# This just works, no prompts
aaa ralph plan tasks --milestone 003-ralph-workflow --auto
```

**What to expect:** Tasks are generated and written without any approval prompt.

### 2b. Force mode (skip all approvals)

```bash
# Override any approval config -- write everything immediately
aaa ralph plan stories --milestone 003-ralph-workflow --force
```

**What to expect:** Even if your config has `"always"` approval gates, `--force` bypasses them all.

### 2c. Review mode (pause at every gate)

```bash
# Force approval prompts at every artifact creation
aaa ralph plan tasks --milestone 003-ralph-workflow --review
```

**What to expect:** Before writing each set of artifacts, Ralph shows a summary and asks `Approve? [Y/n]`. You press Enter or type `y` to continue.

### 2d. Configure approval gates in aaa.config.json

Add this to your `aaa.config.json`:

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

Then run a cascade and observe different behavior at each boundary:
- `"always"` = prompts Y/n
- `"suggest"` = shows summary, brief pause, continues
- `"auto"` = writes immediately

---

## Part 3: Pre-Build Validation (Milestone 003)

Validates that subtasks align with their parent story/task chain before building.

### 3a. Validate before building

```bash
# Check alignment of all pending subtasks, then build
aaa ralph build --validate-first
```

**What to expect:** Before the build loop starts, Ralph checks each pending subtask against its parent chain. Aligned subtasks proceed; misaligned ones are flagged with a reason. In supervised mode, you're prompted "Skip this subtask?" for each flagged one.

### 3b. Combine with cascade

```bash
aaa ralph plan subtasks --milestone 003-ralph-workflow --cascade build --validate-first
```

**What to expect:** Subtasks are generated, then validated, then the build loop starts with only the validated ones.

---

## Part 4: Auto-Calibration During Build (Milestone 003)

Automatically run drift checks every N completed subtasks.

### 4a. Calibrate every 3 subtasks

```bash
aaa ralph build --calibrate-every 3
```

**What to expect:** After every 3 successfully completed subtasks, Ralph pauses the build loop and runs `ralph calibrate all` (intention + technical + self-improvement). Then resumes building.

### 4b. Via config

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

**What to expect:** Calibration triggers every 5 subtasks automatically, plus once more when all subtasks complete.

---

## Part 5: Template Substitution in Hooks (Milestone 003)

Hook prompts now support `{{VAR}}` placeholders that get replaced at runtime.

### 5a. See it in action

The iteration summary hook (`context/workflows/ralph/hooks/iteration-summary.md`) uses templates like:

- `{{SUBTASK_ID}}` -- current subtask ID
- `{{SUBTASK_TITLE}}` -- subtask title
- `{{MILESTONE}}` -- milestone name
- `{{ITERATION_NUM}}` -- current iteration number
- `{{SESSION_JSONL_PATH}}` -- path to session log

```bash
# Just run a build and watch the post-iteration summaries
aaa ralph build
```

**What to expect:** Post-iteration hooks produce summaries with real subtask/milestone data filled in, not generic placeholders.

---

## Part 6: Session Commands (Milestone 003)

New CLI commands for inspecting Ralph session data.

### 6a. Show current session path

```bash
aaa session path
```

**What to expect:** Prints the path to the current session's JSONL file.

### 6b. List recent sessions

```bash
aaa session list
```

**What to expect:** Lists recent Ralph sessions with timestamps and IDs.

### 6c. View current session content

```bash
aaa session current
```

**What to expect:** Displays the current session's content.

### 6d. Cat a session file

```bash
aaa session cat <session-id>
```

**What to expect:** Outputs the raw JSONL content for a specific session.

---

## Part 7: Multi-Provider Support (Milestone 004)

The headline feature of Milestone 004: run Ralph with different AI coding CLIs.

### 7a. Default behavior (Claude, unchanged)

```bash
# This still works exactly as before -- zero breaking changes
aaa ralph build
```

**What to expect:** Uses `claude` CLI, same as always. No config changes needed.

### 7b. Explicit Claude selection

```bash
aaa ralph build --provider claude
```

**What to expect:** Same as default, but explicitly stated. Useful for overriding config.

### 7c. Build with OpenCode

```bash
aaa ralph build --provider opencode
```

**What to expect:** Ralph spawns `opencode run` instead of `claude -p`. JSONL output is parsed and normalized to the same `AgentResult` format. Costs, duration, and session IDs are tracked.

### 7d. Build with OpenCode + specific model

```bash
aaa ralph build --provider opencode --model gpt-4o
```

**What to expect:** Uses OpenCode with GPT-4o. The model is passed in `provider/model` format automatically.

### 7e. Code review with a different provider

```bash
aaa review --provider opencode
```

**What to expect:** The parallel multi-agent code review runs using OpenCode instead of Claude.

### 7f. Provider selection via environment variable

```bash
RALPH_PROVIDER=opencode aaa ralph build
```

**What to expect:** Same as `--provider opencode`, but set via env var. Useful for CI/automation.

### 7g. Provider selection via config

In `aaa.config.json`:

```json
{
  "ralph": {
    "provider": "opencode",
    "model": "gpt-4o"
  }
}
```

```bash
# Now uses opencode by default
aaa ralph build
```

**What to expect:** Config-based provider selection. CLI flags still override this.

### 7h. Provider priority demonstration

```bash
# Config says opencode, env says gemini, CLI flag says claude
# CLI flag wins
RALPH_PROVIDER=gemini aaa ralph build --provider claude
```

**What to expect:** Uses Claude. Priority: CLI flag > env var > config > auto-detect.

---

## Part 8: Model Registry (Milestone 004)

### 8a. Refresh available models

```bash
aaa ralph refresh-models
```

**What to expect:** Queries installed CLI providers for their available models. Updates `providers/models-dynamic.ts` with discovered models.

### 8b. Dry-run refresh

```bash
aaa ralph refresh-models --dry-run
```

**What to expect:** Shows what models would be discovered without writing anything.

### 8c. Refresh specific provider

```bash
aaa ralph refresh-models --provider opencode
```

**What to expect:** Only queries OpenCode for its model list.

---

## Part 9: Calibration Commands (Both Milestones)

Calibration checks for drift between what you intended and what got built.

### 9a. Intention drift

```bash
aaa ralph calibrate intention
```

**What to expect:** Spawns parallel sub-agents (one per completed subtask) to analyze whether the implementation matches the original vision/stories. Produces a synthesized report ranked by severity.

### 9b. Technical quality

```bash
aaa ralph calibrate technical
```

**What to expect:** Parallel analysis of code quality, patterns, and technical debt across completed subtasks.

### 9c. Self-improvement

```bash
aaa ralph calibrate improve
```

**What to expect:** Analyzes session logs to find patterns where Ralph could improve (retries, wrong approaches, etc.).

### 9d. Run all calibration

```bash
aaa ralph calibrate all
```

**What to expect:** Runs all three calibrations in sequence: intention, technical, improve.

---

## Part 10: Review & Gap Analysis

### 10a. Review stories for a milestone

```bash
aaa ralph review stories --milestone 003-ralph-workflow
```

**What to expect:** Quality review of stories -- checks completeness, acceptance criteria, clarity.

### 10b. Review subtask queue

```bash
aaa ralph review subtasks
```

**What to expect:** Reviews the current subtask queue for issues, duplicates, or misalignment.

### 10c. Gap analysis for tasks

```bash
aaa ralph review gap tasks --story docs/planning/milestones/003-ralph-workflow/stories/STORY-001-artifact-approvals.md
```

**What to expect:** Identifies missing tasks that should exist based on the story's requirements.

### 10d. Gap analysis for subtasks

```bash
aaa ralph review gap subtasks
```

**What to expect:** Finds gaps in the subtask queue relative to the task definitions.

### 10e. Roadmap review

```bash
aaa ralph review roadmap
```

**What to expect:** Reviews the overall roadmap for coherence, prioritization issues, or missing milestones.

---

## Part 11: Status & Milestones

### 11a. Check build status

```bash
aaa ralph status
```

**What to expect:** Shows progress summary: total/done/pending subtasks, current iteration, elapsed time.

### 11b. Status with subtask details

```bash
aaa ralph status --subtasks docs/planning/milestones/003-ralph-workflow/subtasks.json
```

**What to expect:** Detailed subtask-level progress for a specific milestone.

### 11c. List milestones

```bash
aaa ralph milestones
```

**What to expect:** Lists all milestones with their completion status.

---

## Part 12: Skills (Inside Claude Code)

All of the above is also available as interactive skills inside Claude Code sessions:

| Skill | What it does |
|-------|-------------|
| `/ralph-plan` | Interactive planning at any level (vision, roadmap, stories, tasks, subtasks) |
| `/ralph-build` | Run the build loop with options |
| `/ralph-review` | Review artifacts and run gap analysis |
| `/ralph-calibrate` | Run drift and quality checks |
| `/ralph-status` | Show progress |

Example inside a Claude Code session:
```
/ralph-build
/ralph-plan vision
/ralph-review stories --milestone 003-ralph-workflow
/ralph-calibrate intention
/ralph-status
```

---

## Build Modes Summary

| Mode | Command | Trust Level | Use When |
|------|---------|-------------|----------|
| Interactive (skill) | `/ralph-plan`, `/ralph-build` | Lowest | You want dialogue and control |
| Supervised | `aaa ralph build` | Medium | Watching terminal, can intervene |
| Headless | `aaa ralph build --headless` | Highest | CI/automation, JSON output |
| Interactive CLI | `aaa ralph build -i` | Medium | Want to pause between iterations |
| Quiet | `aaa ralph build --quiet` | Medium | Suppress terminal noise |

---

## Combining Flags (Power Combos)

These are the most useful flag combinations:

```bash
# Full pipeline with validation and auto-calibration
aaa ralph plan stories --milestone my-milestone --cascade calibrate --validate-first --calibrate-every 5

# Headless build with OpenCode, cascading into calibration
aaa ralph build --headless --provider opencode --model gpt-4o --cascade calibrate

# Force through all approvals, validate first, then build
aaa ralph plan subtasks --milestone my-milestone --cascade build --force --validate-first

# Interactive build with a different provider
aaa ralph build -i --provider opencode

# Review mode cascade (prompted at every level)
aaa ralph plan stories --milestone my-milestone --cascade build --review
```

---

## What's Next?

Based on the work done in Milestones 003 and 004, here are the natural next steps:

1. **More providers**: Codex, Gemini CLI, and Pi Mono have type definitions and profiles ready but no runtime implementation yet. Adding each provider is estimated at ~2 hours following the established pattern in `providers/`.

2. **Planning commands multi-provider**: Currently `ralph plan` and `ralph review` still have some Claude-specific code paths. Wiring these through `invokeWithProvider()` would give full provider neutrality across all commands.

3. **Post-iteration summary provider neutrality**: The iteration summary step still calls Claude Haiku directly regardless of the main provider. This should route through the provider abstraction.

4. **Config-based approval presets**: Named approval profiles (e.g., `"strict"`, `"autonomous"`, `"ci"`) that set all gates at once instead of configuring each individually.

5. **Cascade resume from failure**: If a cascade fails mid-pipeline (e.g., build hits max iterations), automatic recovery or a `--resume` flag that detects where it left off.

6. **Model cost tracking**: Aggregate cost reporting across providers -- "this milestone cost $X with Claude, $Y with OpenCode".

7. **Provider benchmarking**: Run the same subtasks with different providers and compare quality/cost/speed to help pick the right provider for different work types.
