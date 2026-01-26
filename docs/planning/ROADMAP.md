# Product Roadmap

> Generated from [VISION.md](VISION.md) on 2026-01-14

## Overview

This roadmap transforms Ralph from a complete framework design into a fully operational autonomous development system. The journey progresses from core building capabilities to full planning automation, and culminates with self-improving calibration features.

## Milestones

### 1. [ralph](milestones/ralph/): Core Building Loop

**Outcome:** Users can run autonomous code iterations against a manually-created subtasks.json queue

**Why this first:** The build loop is the heart of Ralph. Without it, planning artifacts have no consumer. This validates the memoryless iteration pattern and establishes the foundation for all other features.

**Key deliverables:**
- `ralph-iteration.md` prompt for autonomous building
- `build.sh` script for iteration orchestration
- Progress file writing and subtasks.json status updates
- Session ID capture for debugging
- Three-mode execution system (Interactive, Supervised, Headless) - see VISION.md Section 3.1
- `--supervised` and `--headless` CLI flags with consistent invocation patterns

**Success criteria:**
- Agent completes subtask, commits with ID reference, marks `done: true`
- Progress file contains date, subtask ID, problem, changes, files
- Session ID is captured and stored in subtasks.json

**Dependencies:** none

---

### 2. [planning-automation](milestones/planning-automation/): Automated Planning Pipeline

**Outcome:** Users can generate subtasks automatically from stories/tasks, enabling full planning-to-building pipeline

**Why this second:** Manual subtasks.json creation is tedious. Automating the planning pipeline means humans design at higher levels (stories, tasks) while agents handle decomposition.

**Key deliverables:**
- `tasks-auto.md` and `subtasks-auto.md` prompts
- `stories-auto.md` and `roadmap-auto.md` prompts
- `vision-interactive.md` for guided vision creation
- `plan.sh` script for planning mode entry
- Pre-build validation prompt for alignment checks

**Success criteria:**
- `ralph plan subtasks --auto` generates valid subtasks.json from tasks
- `ralph plan stories --auto` generates story files from vision
- Pre-build validation catches scope creep before building

**Dependencies:** ralph (milestone 1)

---

### 3. [calibration](milestones/calibration/): Self-Improving Governance

**Outcome:** Users can detect intention drift, technical violations, and inefficiencies in agent behavior

**Why third:** Calibration is governance. It only makes sense once there's substantial agent output to analyze. Building on milestones 1 and 2 provides the data (commits, session logs) needed for meaningful calibration.

**Key deliverables:**
- `intention-drift.md` prompt (Vision → code alignment)
- `technical-drift.md` prompt (docs → code compliance)
- `self-improvement.md` prompt (session log analysis)
- `calibrate.sh` script for LLM-as-judge execution
- Iteration diary (`<project>/logs/iterations.jsonl`) stored in target project

**Success criteria:**
- `ralph calibrate intention` detects when code diverges from story intent
- `ralph calibrate improve` identifies tool misuse patterns in session logs
- Calibration outputs task files for human review

**Dependencies:** planning-automation (milestone 2)

---

### 4. [004-full-integration](milestones/004-full-integration/): End-to-End Autonomous Workflow

**Outcome:** Users can run complete Vision → ROADMAP → Stories → Tasks → Subtasks → Build → Calibrate cycles with minimal intervention

**Why last:** This is the "polish" milestone. It integrates hooks, notifications, and the status dashboard. Requires all previous milestones to be functional.

**Key deliverables:**
- Skills for Claude Code integration (`/ralph-plan`, `/ralph-build`, `/ralph-calibrate`, `/ralph-status`, `/ralph-review`)
- `/ralph-plan subtasks` subcommand (currently CLI-only via `aaa ralph plan subtasks`)
- Hooks system (onIterationComplete, onMilestoneComplete, etc.)
- ntfy notifications for human-on-the-loop awareness
- `status.sh` for progress visibility
- Interactive mode (`-i`) for human checkpoints
- Review commands completion:
  - `ralph review subtasks` - review subtask queue before build
  - `ralph review tasks` - review tasks for a story (currently stub)
  - Milestone review prompt (detailed walkthrough after roadmap draft)
  - Gap analyzer subagent for cold analysis of artifacts
  - Chunked presentation in review prompts (one finding at a time)
- Skills documentation in VISION.md (what skills exist, what they do)

**Success criteria:**
- `/ralph build` in Claude Code triggers full iteration loop
- Hooks fire and diary entries are created automatically
- `ralph status` shows accurate counts and recent activity
- `ralph review subtasks` validates queue before building
- `ralph review gap roadmap` provides cold analysis with fresh eyes

**Dependencies:** 003-calibration (milestone 3)

---

### 5. [code-review](milestones/002-ralph-💪/stories/STORY-001-parallel-code-review.md): Parallel Multi-Agent Review System

**Outcome:** Users can run comprehensive code review with 12 specialized agents in parallel, with trust gradient modes matching Ralph's execution patterns

**Why fifth:** Code review complements Ralph's build-time quality with pre-merge verification. Reuses patterns established in earlier milestones (trust gradient, diary logging, CLI structure) and applies them to a new domain.

**Key deliverables:**
- 12 reviewer agents (`security`, `data-integrity`, `error-handling`, `test-coverage`, `over-engineering`, `performance`, `accessibility`, `documentation`, `maintainability`, `dependency`, `intent-alignment`) + `synthesizer`
- `aaa review` CLI with `--supervised` and `--headless` modes
- `/dev:code-review` skill for interactive mode in Claude Code
- `/dev:interrogate` workflow for surfacing assumptions and confidence levels
- Diary logging to `logs/reviews.jsonl`

**Success criteria:**
- `/dev:code-review` spawns parallel reviewers, synthesizes findings, presents for triage
- `aaa review --headless` auto-triages and fixes based on severity × confidence
- `/dev:interrogate changes` outputs structured table with hardest decisions, rejected alternatives, lowest confidence areas
- Review diary captures all triage decisions for analysis

**Dependencies:** full-integration (milestone 4) for hooks and notification patterns; ralph (milestone 1) for trust gradient and display utilities

---

## Future Considerations

Features from VISION.md that are explicitly deferred beyond these milestones:

- **Multiple agent orchestration**: Current design is single-agent per iteration
- **Parallel subtask execution**: Sequential execution only for now
- **Custom validation hooks**: Build/lint/test are hardcoded, not pluggable
- **Alternative LLM providers**: Claude Code only (no OpenAI, etc.)
- **Web dashboard**: CLI and skills only, no GUI

## Notes

- This roadmap is a living document that evolves as milestones complete
- Milestone ordering is based on dependency and value delivery, not calendar dates
- Stories and tasks within each milestone are planned separately
- Milestone headings link to their respective folders in `docs/planning/milestones/`
