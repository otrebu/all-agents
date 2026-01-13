## Task: Implement calibrate improve CLI

**Story:** [self-improvement-analysis](../stories/005-self-improvement-analysis.md)

### Goal
The `aaa ralph calibrate improve` CLI command exists and invokes the self-improvement.md prompt to analyze session logs for inefficiencies.

### Context
Story 005 requires a CLI command that triggers self-improvement analysis. This command invokes the `self-improvement.md` prompt (created in TASK-001) against session logs. The command must respect the `selfImprovement` config setting to determine whether to propose changes only or auto-apply them.

Session logs are stored at `~/.claude/projects/<encoded-path>/<sessionId>.jsonl`. The sessionId is retrieved from subtasks.json.

### Plan
1. Add `calibrate improve` subcommand to the `ralph` command group
2. Implement session log lookup via subtasks.json sessionId
3. Load and invoke `self-improvement.md` prompt with session log context
4. Read `ralph.config.json` for `selfImprovement` setting
5. If `selfImprovement: "always"` (default), propose changes only and require approval
6. If `selfImprovement: "auto"`, auto-apply proposed changes
7. Output summary to stdout and proposed task files for improvements

### Acceptance Criteria
- [ ] `aaa ralph calibrate improve` command is available
- [ ] Command invokes `context/workflows/ralph/calibration/self-improvement.md` prompt
- [ ] Command reads sessionId from subtasks.json to locate session logs
- [ ] Command respects `selfImprovement` config setting:
  - `"always"` (default): propose only, require approval
  - `"auto"`: auto-apply proposed changes
- [ ] Command outputs summary to stdout
- [ ] Command generates proposed task files for improvements when applicable

### Test Plan
- [ ] Unit test: command parses arguments correctly
- [ ] Unit test: command reads config for selfImprovement setting
- [ ] Integration test: command locates session logs via sessionId
- [ ] E2E test: run command against sample session log and verify output

### Scope
- **In:**
  - `aaa ralph calibrate improve` CLI command
  - Config integration for propose-only vs auto-apply
  - Session log lookup via subtasks.json
  - Prompt invocation
- **Out:**
  - The self-improvement.md prompt itself (TASK-001)
  - Skill integration (`/ralph-calibrate improve` - TASK-027)
  - Other calibration commands (intention-drift, technical-drift)

### Notes
- Depends on TASK-001 (self-improvement.md prompt must exist)
- High-risk operation - default to propose-only mode
- Reference: VISION.md sections 3.3 (Self-Improvement) and 8.4
