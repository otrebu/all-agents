## Task: Create ralph-calibrate SKILL.md

**Story:** [intention-drift-detection](../stories/002-intention-drift-detection.md)

### Goal
A working skill file exists at `.claude/skills/ralph-calibrate/SKILL.md` that enables `/ralph calibrate` in interactive Claude Code sessions.

### Context
Per VISION.md section 8.3, prompts are the single source of truth. CLI and skills are peer entry points to the same prompts. The skill provides an interactive interface for running calibration checks directly within Claude Code sessions, while the CLI (`aaa ralph calibrate`) provides the same functionality from the command line.

The skill equivalent for intention drift detection is: `/ralph-calibrate intention` (hyphenated skill name with subcommand argument)

### Plan
1. Create `.claude/skills/ralph-calibrate/SKILL.md`
2. Structure the skill to dispatch based on calibration type:
   - `intention` → Read and follow `@context/workflows/ralph/calibration/intention-drift.md`
   - `technical` → Read and follow `@context/workflows/ralph/calibration/technical-drift.md`
   - `improve` → Read and follow `@context/workflows/ralph/calibration/self-improvement.md`
   - `all` → Run all calibration checks sequentially
3. Include instructions for reading `subtasks.json` and finding completed subtasks
4. Define expected output format and task file creation

### Acceptance Criteria
- [ ] Skill file exists at `.claude/skills/ralph-calibrate/SKILL.md`
- [ ] Skill can be invoked via `/ralph-calibrate` in Claude Code (hyphenated skill name)
- [ ] Skill accepts subcommand argument: `/ralph-calibrate intention`, `/ralph-calibrate technical`, `/ralph-calibrate improve`, `/ralph-calibrate all`
- [ ] `intention` subcommand reads and follows `intention-drift.md` prompt
- [ ] Skill references prompts via `@path` syntax
- [ ] Skill outputs summary + creates task files for divergence (same as CLI)

### Test Plan
- [ ] Invoke `/ralph-calibrate intention` in Claude Code session - runs without error
- [ ] Invoke `/ralph-calibrate technical` - dispatches to technical-drift.md prompt
- [ ] Invoke `/ralph-calibrate improve` - dispatches to self-improvement.md prompt
- [ ] Invoke `/ralph-calibrate all` - runs all calibration checks sequentially
- [ ] Invoke `/ralph-calibrate` with no argument - shows usage or defaults to `all`
- [ ] Verify skill correctly references calibration prompts
- [ ] Verify output matches CLI behavior (summary + task files)

### Scope
- **In:** The SKILL.md file at `.claude/skills/ralph-calibrate/SKILL.md`, dispatch logic for calibration types
- **Out:** The calibration prompts themselves (separate tasks), the CLI calibrate.sh script (separate task)

### Notes
- Location: `.claude/skills/ralph-calibrate/SKILL.md`
- Skill structure follows VISION.md 8.3 pattern:
  ```markdown
  # Ralph Calibration

  Based on calibration type requested, read and follow the appropriate prompt:

  - Intention drift: @context/workflows/ralph/calibration/intention-drift.md
  - Technical drift: @context/workflows/ralph/calibration/technical-drift.md
  - Self-improvement: @context/workflows/ralph/calibration/self-improvement.md
  ```
- Depends on: `intention-drift.md` prompt (TASK-004)
- Skills are interactive entry points - user can ask follow-up questions, clarify findings
- Reference: VISION.md sections 8.3 (Prompts, Skills, and CLI) and 3.3 (Calibration Mode)
