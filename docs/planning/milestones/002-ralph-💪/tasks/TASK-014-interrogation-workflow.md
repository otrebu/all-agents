## Task: Interrogation Workflow

**Story:** [STORY-001-parallel-code-review](../stories/STORY-001-parallel-code-review.md)

### Goal
Enable developers to ask AI "why" instead of reading code through the `/dev:interrogate` skill and workflow.

### Context
Based on article "I Stopped Reading Code. My Code Reviews Got Better." - interrogation is a quick win that surfaces assumptions and confidence levels in AI-generated or human-written code. This is Phase 1 of the Parallel Code Review story.

The workflow asks three critical questions:
1. What was the hardest decision?
2. What alternatives did you reject?
3. What are you least confident about?

### Plan
1. Create workflow doc at `context/workflows/interrogate.md`:
   - Define 3 core questions and their purpose
   - Add `--quick` mode (just 3 questions) and `--skeptical` mode (extra validation)
   - Define output format (structured table with confidence levels)
2. Create skill at `.claude/commands/dev/interrogate.md`:
   - Add SKILL.md frontmatter with name/description
   - Load the workflow and apply to [changes|commit|pr] context
   - Support both modes via args
3. Update `context/workflows/complete-feature.md`:
   - Add interrogation as a pre-merge checkpoint
4. Update `context/workflows/dev-lifecycle-simple.md`:
   - Add interrogation to pre-merge checklist (optional)

### Acceptance Criteria
- [ ] `/dev:interrogate` skill exists and can be invoked
- [ ] Workflow asks the 3 core questions
- [ ] `--quick` mode works (minimal output)
- [ ] `--skeptical` mode works (extra validation for AI code)
- [ ] Output includes structured table with confidence levels
- [ ] complete-feature.md references interrogation

### Test Plan
- [ ] Manual: Run `/dev:interrogate changes` and verify 3 questions asked
- [ ] Manual: Run `/dev:interrogate --quick` and verify minimal output
- [ ] Manual: Run `/dev:interrogate --skeptical` and verify extra validation

### Scope
- **In:** Workflow doc, skill command, workflow integration
- **Out:** CLI command (`aaa interrogate`), git hooks

### Notes
This is a "quick win" - minimal effort, high value. The interrogation can run against:
- `changes` - current staged/unstaged changes
- `commit` - specific commit hash
- `pr` - pull request number

### Related Documentation
- @context/workflows/code-review.md (existing code review workflow)
- @context/workflows/complete-feature.md (where to add checkpoint)
