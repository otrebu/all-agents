---
depends: []
---

# Story Template

Stories capture user value and link to child tasks. A story answers "why" while tasks answer "what/how".

---

```markdown
## Story: [Short name]

### Narrative
As a [persona], I want [capability] so that [benefit].

### Persona
[Who is this user? What do they care about? What's their context?]

### Context
[Why now? Business driver, user feedback, strategic goal]

### Acceptance Criteria
- [ ] [User-visible outcome]
- [ ] [Another outcome]

### Tasks
- [ ] [TASK-001-api](../tasks/TASK-001-api.md)
- [ ] [TASK-002-ui](../tasks/TASK-002-ui.md)

### Notes
[Optional: mockups, user research, edge cases, risks]
```

---

## Section Guide

| Section | Required | Purpose |
|---------|----------|---------|
| Narrative | Yes | Classic user story format - who, what, why |
| Persona | Yes | Who benefits, their context and motivations |
| Context | Yes | Business driver, why this matters now |
| Acceptance Criteria | Yes | User-visible outcomes (not technical) |
| Tasks | Yes | Links to child tasks that implement this story |
| Notes | No | Supporting material - mockups, research, risks |

---

## Linking

**Story to Tasks:** Use relative links in the Tasks section:
```markdown
- [ ] [TASK-001-auth-api](../tasks/TASK-001-auth-api.md)
```

**Task to Story:** Tasks reference their parent story at the top:
```markdown
**Story:** [STORY-001-user-auth](../stories/STORY-001-user-auth.md)
```

---

## Principles

1. **User value first** - Stories describe outcomes users care about
2. **Persona is real** - Describe an actual user type, not generic "user"
3. **AC are user-visible** - Not technical implementation details
4. **Tasks are linked** - Every story should spawn at least one task
5. **Keep it lean** - Just enough to align on intent
