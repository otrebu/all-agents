---
depends: []
---

# Task Management

Create structured task/story files for planning and execution.

## When to Create

- **Tasks:** Concrete work items (features, bugs, refactors)
- **Stories:** User-facing value → spawns related tasks

## CLI Commands

### Create Task

```bash
aaa task create <name>
```

**Options:**
- `-d, --dir <path>` — Custom directory (default: `docs/planning/tasks`)
- `-s, --story <number>` — Link to story (e.g., `001` or `1`)

**Examples:**
```bash
aaa task create implement-auth
# → docs/planning/tasks/001-implement-auth.md

aaa task create auth-api --story 001
# → docs/planning/tasks/002-auth-api.md (with Story: link)

aaa task create setup-ci -d backend/tasks
# → backend/tasks/001-setup-ci.md
```

### Create Story

```bash
aaa story create <name>
```

**Options:**
- `-d, --dir <path>` — Custom directory (default: `docs/planning/stories`)

**Examples:**
```bash
aaa story create user-authentication
# → docs/planning/stories/001-user-authentication.md
```

## Story-First Workflow

1. **Create story:** `aaa story create user-authentication` → `001-user-authentication.md`
2. **Create linked tasks:**
   ```bash
   aaa task create auth-api --story 001
   aaa task create auth-frontend --story 001
   aaa task create auth-tests --story 001
   ```
3. **Update story's Tasks section** with links to created tasks

## Templates

- **Task:** @context/blocks/docs/task-template.md
- **Story:** @context/blocks/docs/story-template.md

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
