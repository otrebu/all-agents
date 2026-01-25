## Task: Update Code Review Skill with Parallel Agents

**Story:** [STORY-001-parallel-code-review](../stories/STORY-001-parallel-code-review.md)

### Goal
Update the existing `/dev:code-review` skill to orchestrate parallel reviewer agents and present synthesized findings interactively.

### Context
Phase 3 of the Parallel Code Review story. The existing `/dev:code-review` skill is simple - it just loads the code-review.md workflow. We need to enhance it to:
1. Spawn multiple reviewer agents in parallel
2. Synthesize their findings
3. Present findings one at a time (chunked presentation)
4. Support triage actions (FIX / SKIP / FALSE POSITIVE)

### Plan
1. Create new skill at `.claude/skills/parallel-code-review/SKILL.md`:
   - Replaces the simple command at `.claude/commands/dev/code-review.md`
   - Orchestrates parallel agent invocation using Task tool
   - Receives synthesized findings
   - Presents findings with chunked presentation pattern
2. Update workflow at `context/workflows/code-review.md`:
   - Add parallel agent orchestration section
   - Define Finding schema reference
   - Add triage action handling (FIX / SKIP / FALSE POSITIVE)
3. Move/rename `coding-style-reviewer.md`:
   - Rename to `.claude/agents/code-review/maintainability-reviewer.md`
   - Update description to focus on coupling, naming, SRP
4. Update `.claude/commands/dev/code-review.md`:
   - Change to load the new skill instead of workflow

### Acceptance Criteria
- [ ] `/dev:code-review` invokes parallel reviewer agents
- [ ] Findings are synthesized and presented one at a time
- [ ] User can respond with FIX / SKIP / FALSE POSITIVE to each finding
- [ ] FIX action applies the suggested fix
- [ ] SKIP action moves to next finding
- [ ] FALSE POSITIVE action logs and moves to next
- [ ] `coding-style-reviewer` renamed to `maintainability-reviewer` in code-review folder

### Test Plan
- [ ] Manual: Run `/dev:code-review` on a file with known issues
- [ ] Verify multiple agents are invoked (check Task tool calls)
- [ ] Verify findings are presented one at a time
- [ ] Verify triage actions work correctly

### Scope
- **In:** Skill enhancement, workflow update, agent rename
- **Out:** CLI command (`aaa review`), headless mode

### Notes
The skill remains interactive (Chat mode per VISION.md). Headless and supervised modes will be added in the CLI task.

Chunked presentation pattern (from TASK-013):
- "I'll show you one review point at a time. Ready for the first one?"
- Wait for acknowledgment before next finding
- Track triage decisions for logging

### Related Documentation
- @.claude/commands/dev/code-review.md (current simple command)
- @context/workflows/code-review.md (current workflow)
- @context/workflows/ralph/review/chunked-presentation.md (presentation pattern)
