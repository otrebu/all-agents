## Task: Create self-improvement.md prompt

**Story:** [self-improvement-analysis](../stories/005-self-improvement-analysis.md)

### Goal
A working LLM-as-judge prompt exists at `context/workflows/ralph/calibration/self-improvement.md` that analyzes session logs for inefficiencies and proposes improvements to prompts, skills, and documentation.

### Context
Self-improvement is a meta-level calibration type that analyzes how Ralph agents behave during build iterations. It identifies inefficiencies like tool misuse, wasted reads, and excessive retries, then proposes changes to improve future iterations. This is the highest-risk calibration type since it can modify the prompts and skills that govern all agent behavior.

Session logs are stored at `~/.claude/projects/<encoded-path>/<sessionId>.jsonl` and contain the full conversation including tool calls and responses.

Per VISION.md section 8.4, this is pure prompt-based analysis (LLM-as-judge) - no coded heuristics. The prompt instructs Claude to chunk and process large logs incrementally if needed.

### Plan
1. Create directory structure: `context/workflows/ralph/calibration/` (if not exists)
2. Draft `self-improvement.md` prompt with:
   - Required reading: session JSONL location, subtasks.json for sessionId lookup
   - Analysis patterns to detect:
     - Tool misuse (Bash for file ops instead of Read/Edit/Write)
     - Wasted reads (files read but never used)
     - Backtracking (edits that cancel each other out)
     - Excessive iterations on same error
     - Missing documentation patterns
   - Few-shot examples of inefficiencies vs acceptable patterns
   - Output format: summary to stdout + proposed task files for improvements
   - Instruction for chunking large logs
3. Add escape hatch documentation (how to mark approved exceptions)
4. Test prompt manually with a sample session log

### Acceptance Criteria
- [ ] Prompt file exists at `context/workflows/ralph/calibration/self-improvement.md`
- [ ] Prompt reads session logs via `sessionId` from subtasks.json
- [ ] Prompt instructs Claude to detect these inefficiency patterns:
  - Tool misuse (e.g., Bash for file ops instead of Read/Edit)
  - Wasted reads (files read but never used)
  - Backtracking (edits that cancel each other)
  - Excessive iterations on same error
- [ ] Prompt specifies output format: summary in stdout + proposed changes to prompts/docs/CLAUDE.md
- [ ] Prompt includes chunking instructions for large session logs
- [ ] Prompt includes few-shot examples distinguishing inefficiencies from acceptable patterns
- [ ] Prompt integration with config (`selfImprovement: "always"` setting respected)

### Test Plan
- [ ] Manual test: run prompt against a sample session log
- [ ] Verify prompt produces valid summary output
- [ ] Verify prompt can identify at least one type of inefficiency when present
- [ ] Verify prompt handles large logs without failure (chunking works)

### Scope
- **In:**
  - The `self-improvement.md` prompt file
  - Analysis of session JSONL files for inefficiencies
  - Output as summary + proposed task files
  - Chunking strategy for large logs
- **Out:**
  - CLI integration (`ralph calibrate improve` command - separate task)
  - Auto-apply functionality (prompt proposes only)
  - Notification/hook integration
  - Other calibration prompts (intention-drift, technical-drift)

### Notes
- **High risk:** This prompt can propose changes to prompts, skills, CLAUDE.md, AGENTS.md - affecting all future agent behavior
- **Approval default:** `selfImprovement: "always"` in ralph.config.json (requires approval by default)
- **Session log format:** JSONL with one message per line, includes tool calls and responses
- Session log location: `~/.claude/projects/<encoded-path>/<sessionId>.jsonl`
- Reference: VISION.md sections 3.3 (Self-Improvement) and 8.4
