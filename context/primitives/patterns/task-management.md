---
depends: []
---

# Task Management

Create structured task/story files for planning and execution.

## When to Create

- **Tasks:** Concrete work items (features, bugs, refactors)
- **Stories:** User-facing value → spawns related tasks

## Creating a Task

1. Draft content per @context/meta/task-template.md
2. Run: `aaa task create <name>`
3. Write content to returned filepath

## Creating a Story with Tasks

1. Draft story per @context/meta/story-template.md
2. `aaa story create <name>` → e.g., `001-my-story.md`
3. For each task:
   - `aaa task create <name>` → e.g., `001-my-task.md`
   - Add task link to story's Tasks section
   - Add story link to task header
4. Write all files

## Linking Convention

```markdown
# In story (Tasks section):
- [ ] [001-auth-api](../tasks/001-auth-api.md)

# In task (header):
**Story:** [001-user-auth](../stories/001-user-auth.md)
```

## File Naming

- Format: `NNN-kebab-name.md` (auto-numbered)
- Stories: `docs/planning/stories/`
- Tasks: `docs/planning/tasks/`

## Progress Tracking

Maintain `docs/planning/PROGRESS.md` for session continuity:

### Format

```markdown
# Progress

## Current Focus
**Story:** [NNN-story-name](stories/NNN-story-name.md)
**Task:** [NNN-task-name](tasks/NNN-task-name.md)
**Status:** in-progress | blocked | review

## Session Notes

### 2025-12-03T14:30:00: Implementing auth API
**Refs:** [001-user-auth](stories/001-user-auth.md) → [002-jwt-validation](tasks/002-jwt-validation.md)
- Completed JWT validation
- Blocked on Redis config
- **Next:** Fix Redis connection, then token refresh

### 2025-12-02T09:15:00: Started auth story
**Refs:** [001-user-auth](stories/001-user-auth.md)
...
```

### Guidelines

- Update when switching story/task focus
- ISO timestamp + brief title: `### 2025-12-03T14:30:00: Title`
- Add `**Refs:**` line linking relevant story/tasks
- Keep notes brief, actionable
- Always include **Next:** for handover
- Retain ~5 sessions, archive older to `docs/planning/archive/`

## Principles

- **Goal is mandatory** - One sentence, clear outcome
- **AC drives testing** - Each criterion maps to a test
- **Test Plan is explicit** - Include runnable commands
- **Scope boundaries** - "Out of Scope" prevents creep
