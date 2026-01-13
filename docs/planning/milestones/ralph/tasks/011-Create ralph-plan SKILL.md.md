## Task: Create ralph-plan SKILL.md (Vision Level)

**Story:** [interactive-vision-planning](../stories/003-interactive-vision-planning.md)

### Goal
Create the Claude Code skill file that enables `/ralph plan vision` command for interactive vision planning sessions.

### Context
Skills provide an interactive entry point to Ralph's planning prompts alongside the CLI. This task focuses on vision-level planning only, which is the foundation of the planning hierarchy. Skills and CLI are peer interfaces to the same underlying prompts.

Reference: VISION.md sections 8.3 (Prompts, Skills, and CLI) and 8.5 (Directory Structure)

### Plan
1. Create directory: `.claude/skills/ralph-plan/`
2. Create `SKILL.md` with:
   - YAML frontmatter (name, description)
   - Vision-level routing to `@context/workflows/ralph/planning/vision-interactive.md`
   - Clear instructions for invoking vision planning
3. Document that vision is always interactive (never auto)

### Acceptance Criteria
- [ ] `.claude/skills/ralph-plan/SKILL.md` exists
- [ ] Skill has proper YAML frontmatter with name and description
- [ ] Skill routes `/ralph plan vision` to `@context/workflows/ralph/planning/vision-interactive.md`
- [ ] Skill is invocable via `/ralph-plan vision` or `/ralph plan vision` in Claude Code
- [ ] Skill appears in Claude Code's available skills list

### Test Plan
- [ ] Manual test: `/ralph plan vision` invokes skill and starts vision planning session
- [ ] Manual test: Skill loads and references vision-interactive.md prompt
- [ ] Manual test: Verify skill appears in Claude Code's available skills list

### Scope
- **In:** The skill file for vision-level planning, YAML frontmatter, routing to vision prompt
- **Out:** The prompts themselves (TASK-002), CLI implementation (separate task), other planning levels

### Notes
- Skills and CLI are peer entry points - both reference the same prompts
- Skills use `@path` references that Claude Code resolves directly
- Vision is always interactive (never auto) because establishing intent requires human judgment
- **Future:** Other planning levels (roadmap, stories, tasks, subtasks) will be added in subsequent stories
- Consider matching the pattern from existing skills like `task-create/SKILL.md`
