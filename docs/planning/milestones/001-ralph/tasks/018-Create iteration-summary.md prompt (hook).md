## Task: Create iteration-summary.md prompt (hook)

**Story:** [hooks-and-notifications](../stories/006-hooks-and-notifications.md)

### Goal
A reusable prompt template exists that Haiku can use to generate concise summaries from iteration session JSONL logs.

### Context
Long-running Ralph builds need summaries at key checkpoints. The iteration-summary.md prompt will be invoked by the post-iteration hook to generate human-readable summaries of what happened during each iteration. The summary is stored in the iteration diary for later analysis and notification purposes.

### Plan
1. Create `context/workflows/ralph/hooks/iteration-summary.md` prompt template
2. Define `{{VAR}}` placeholders for bash substitution (session JSONL content, subtask info)
3. Include instructions for Haiku to extract: status, key changes, errors, file modifications
4. Keep output concise (1-3 sentences) suitable for notifications

### Acceptance Criteria
- [ ] Prompt template created at `context/workflows/ralph/hooks/iteration-summary.md`
- [ ] Uses `{{VAR}}` placeholders (not @path) for bash substitution
- [ ] Produces summary with: subtaskId, status, key findings
- [ ] Summary suitable for ntfy push notifications (short, informative)
- [ ] Template validates against expected input format (prompt includes clear instructions for required input: session JSONL path, subtaskId, and optional context fields)

### Test Plan
- [ ] Run prompt with sample session JSONL and verify Haiku produces valid summary
- [ ] Test placeholder substitution in bash context
- [ ] Verify summary length appropriate for notifications

### Scope
- **In:** Prompt template, placeholder design, summary format
- **Out:** Hook implementation (task 019), schema definition (task 020), ntfy integration

### Notes
- Haiku is the model for summary generation (fast, cheap)
- Summary feeds into iteration diary `logs/iterations.jsonl`
- Reference: VISION.md sections 5 and 8.11
