## Story: Self-Improvement Analysis

### Narrative
As a framework maintainer, I want to analyze agent session logs for inefficiencies so that I can continuously improve prompts, skills, and documentation.

### Persona
A developer maintaining the Ralph framework itself. They want to understand how agents behave - what works, what fails, what wastes tokens. They use insights to improve the system for future iterations.

### Context
This is meta-level calibration - improving the improvers. Analyzes session JSONL files for patterns like tool misuse, wasted reads, backtracking, excessive retries. Higher risk than other calibration types since it can modify prompts and skills.

### Acceptance Criteria
- [ ] User can run self-improvement: `aaa ralph calibrate improve`
- [ ] System reads session logs via `sessionId` from subtasks.json
- [ ] LLM-as-judge analyzes logs for inefficiency patterns:
  - Tool misuse (e.g., Bash for file ops instead of Read/Edit)
  - Wasted reads (files read but never used)
  - Backtracking (edits that cancel each other)
  - Excessive iterations on same error
- [ ] Output: summary in stdout + proposed changes to prompts/docs/CLAUDE.md
- [ ] Config controls propose-only vs auto-apply (default: propose)
- [ ] Requires approval by default (`selfImprovement: "always"` in config)
- [ ] Skill equivalent: /ralph calibrate improve

### Tasks
- [ ] [TASK-001: Create self-improvement.md prompt](../tasks/001-Create%20self-improvement.md%20prompt.md)
- [ ] [TASK-026: Implement calibrate improve CLI](../tasks/026-Implement%20calibrate%20improve%20CLI.md)
- [ ] [TASK-027: Add improve to ralph-calibrate skill](../tasks/027-Add%20improve%20to%20ralph-calibrate%20skill.md)

### Notes
- Session logs at: `~/.claude/projects/<encoded-path>/<sessionId>.jsonl`
- Prompt instructs Claude to chunk and process large logs incrementally
- High-risk operation - can affect everything (skills reference prompts)
- Reference: VISION.md sections 3.3 (Self-Improvement) and 8.4
