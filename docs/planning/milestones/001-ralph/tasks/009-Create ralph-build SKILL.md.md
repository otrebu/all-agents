## Task: Create ralph-build SKILL.md

**Story:** [autonomous-code-implementation](../stories/001-autonomous-code-implementation.md)

### Goal
A skill file exists at `.claude/skills/ralph-build/SKILL.md` that enables users to run the autonomous build loop via the `/ralph build` skill command in Claude Code.

### Context
Skills provide an interactive Claude Code entry point to Ralph functionality, parallel to the CLI. The ralph-build skill allows users to invoke the build loop from within a Claude Code session using `/ralph build`. Both CLI and skills are peer entry points to the same underlying prompts. The skill references the ralph-iteration.md prompt and provides guidance for build mode options.

### Plan
1. Create directory `.claude/skills/ralph-build/` if not exists
2. Create `SKILL.md` with:
   - Skill name and description
   - Reference to `@context/workflows/ralph/building/ralph-iteration.md`
   - Instructions for how to handle build options (interactive, print, validate-first, max-iterations)
   - Guidance on reading subtasks.json path from user or defaulting
3. Ensure skill matches the CLI behavior for `/ralph build`

### Acceptance Criteria
- [ ] Skill file exists at `.claude/skills/ralph-build/SKILL.md`
- [ ] User can invoke build mode via `/ralph build` in Claude Code
- [ ] Skill references `@context/workflows/ralph/building/ralph-iteration.md`
- [ ] Skill handles `--subtasks <path>` option or prompts for path
- [ ] Skill supports interactive mode behavior
- [ ] Skill supports print mode behavior (output prompt without execution)
- [ ] Skill references `--validate-first` option for pre-build validation
- [ ] Skill documents `--max-iterations` option

### Test Plan
- [ ] Verify `/ralph build` is recognized as a skill in Claude Code
- [ ] Test skill with manual subtasks.json file
- [ ] Verify skill outputs match CLI `aaa ralph build` behavior

### Scope
- **In:** ralph-build/SKILL.md file, skill configuration, prompt references
- **Out:** The ralph-iteration.md prompt content (separate task), build.sh script, other ralph skills (plan, calibrate, status)

### Notes
- Reference: VISION.md section 8.3 (Prompts, Skills, and CLI)
- Skills and CLI are peer entry points - same prompts, different invocation
- Skill structure references prompts via `@path` syntax
- Skills live in `.claude/skills/<skill-name>/SKILL.md`
- Related skills: ralph-plan, ralph-calibrate, ralph-status (separate tasks)
