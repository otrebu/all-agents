## Task: Add improve to ralph-calibrate skill

**Story:** [self-improvement-analysis](../stories/005-self-improvement-analysis.md)

### Goal
The `/ralph-calibrate improve` skill is available and invokes the self-improvement analysis through the prompt reference.

### Context
Story 005 requires skill support (`/ralph calibrate improve` or `/ralph-calibrate improve`) as an alternative to the CLI command. Skills allow users to invoke functionality directly within Claude Code conversations. The skill should reference the `self-improvement.md` prompt via @path syntax.

### Plan
1. Locate or create the `ralph-calibrate` skill file (e.g., `context/skills/ralph-calibrate.md`)
2. Add `improve` subcommand to the skill
3. Reference the self-improvement prompt via `@context/workflows/ralph/calibration/self-improvement.md`
4. Document config integration (propose-only vs auto-apply)
5. Add usage examples to skill documentation

### Acceptance Criteria
- [ ] `/ralph-calibrate improve` skill is available in Claude Code
- [ ] Skill references `self-improvement.md` prompt via @path syntax
- [ ] Skill documentation explains the improve subcommand
- [ ] Skill respects `selfImprovement` config setting (propose-only vs auto-apply)
- [ ] Usage examples are provided

### Test Plan
- [ ] Manual test: invoke `/ralph-calibrate improve` in Claude Code
- [ ] Verify prompt is correctly referenced and loaded
- [ ] Verify output matches CLI command behavior

### Scope
- **In:**
  - `/ralph-calibrate improve` skill support
  - @path reference to self-improvement.md prompt
  - Skill documentation
- **Out:**
  - CLI command implementation (TASK-026)
  - The self-improvement.md prompt itself (TASK-001)
  - Other ralph-calibrate subcommands

### Notes
- Depends on TASK-001 (self-improvement.md prompt must exist)
- Skills use @path syntax to reference prompts: `@context/workflows/ralph/calibration/self-improvement.md`
- Reference: VISION.md sections 3.3 (Self-Improvement) and 8.4
