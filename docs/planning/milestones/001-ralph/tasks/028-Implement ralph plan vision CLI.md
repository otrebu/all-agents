## Task: Implement ralph plan vision CLI

**Story:** [interactive-vision-planning](../stories/003-interactive-vision-planning.md)

### Goal
Implement the `aaa ralph plan vision` CLI command that invokes the vision-interactive.md prompt for collaborative vision planning.

### Context
The CLI provides an alternative entry point to Ralph's planning prompts alongside the skill interface. This command enables users to start vision planning sessions from the terminal using `aaa ralph plan vision`. The CLI and skill are peer interfaces to the same underlying prompt.

Reference: VISION.md sections 8.3 (Prompts, Skills, and CLI) and story 003 acceptance criteria.

### Plan
1. Create `ralph` command group in the `aaa` CLI if not exists
2. Add `plan` subcommand group under `ralph`
3. Implement `vision` subcommand that:
   - Invokes `context/workflows/ralph/planning/vision-interactive.md` prompt
   - Starts an interactive multi-turn session
   - Outputs to `docs/planning/VISION.md`
4. Add appropriate help text and documentation

### Acceptance Criteria
- [ ] `aaa ralph plan vision` command exists and is executable
- [ ] Command invokes the vision-interactive.md prompt
- [ ] Command starts a multi-turn interactive session (not single-shot)
- [ ] Help text explains the command purpose (`aaa ralph plan vision --help`)
- [ ] Session creates/updates `docs/planning/VISION.md`
- [ ] User can exit session manually when satisfied

### Test Plan
- [ ] Unit test: Command is registered and responds to `--help`
- [ ] Manual test: `aaa ralph plan vision` starts interactive vision planning session
- [ ] Manual test: Verify VISION.md is created/updated after session

### Scope
- **In:** CLI command implementation, command registration, help text
- **Out:** The prompt itself (TASK-002), skill implementation (TASK-011), other planning levels

### Notes
- CLI and skill are peer entry points - both invoke the same vision-interactive.md prompt
- Vision is always interactive (never auto) - no `--auto` flag for this command
- Follow existing `aaa` CLI patterns from `tools/CLAUDE.md`
- **Future:** Other planning levels (roadmap, stories, tasks, subtasks) will have separate CLI commands added in subsequent stories
