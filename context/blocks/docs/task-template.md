---
depends: []
---

# Task Template

A single template for all dev tasks. Context speaks for itself - no type taxonomy needed.

---

```markdown
## Task: [Short descriptive name]

**Story:** [story-name](../stories/001-story-name.md) *(optional)*

### Goal
[One sentence: what should be true when this is done?]

### Context
[Why this matters. Link to ticket/spec if exists. Include:
- Current state / problem description
- What triggered this work
- Any constraints or dependencies]

### Plan
1. [First concrete action]
2. [Second action]
3. [Continue as needed]

### Acceptance Criteria
- [ ] [Specific, testable outcome]
- [ ] [Another outcome]

### Test Plan
- [ ] [What tests to add/run]
- [ ] [Manual verification if needed]

### Scope
- **In:** [What this includes]
- **Out:** [What this explicitly excludes]

### Notes
[Optional: Technical considerations, risks, edge cases, investigation findings, rollback plan - whatever's relevant to THIS task]
```

---

## Section Guide

| Section | Required | Purpose |
|---------|----------|---------|
| Story | No | Link to parent story (if this task implements a story) |
| Goal | Yes | One sentence outcome - "what's true when done?" |
| Context | Yes | The why: problem, trigger, constraints, links |
| Plan | Yes | Numbered steps - concrete actions |
| Acceptance Criteria | Yes | Checkboxes - how we verify success |
| Test Plan | Yes | What tests to add/update/run |
| Scope | Yes | Explicit boundaries - prevents creep |
| Notes | No | Catch-all for extras (risks, edge cases, rollback, etc.) |

---

## Principles

1. **Goal is mandatory** - one sentence, clear outcome
2. **AC drives testing** - each criterion should map to a test
3. **Scope prevents creep** - "Out" is as important as "In"
4. **Works for human or AI** - same format, AI just executes more literally
5. **Context over taxonomy** - the content tells you what kind of task it is
