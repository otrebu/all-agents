---
depends: []
tags: [planning, naming]
---

# File Naming Convention

Single source of truth for planning file naming in the `docs/planning/` hierarchy.

## Canonical Patterns

Planning artifacts use milestone-first placement with explicit artifact-type filenames.

| Artifact | Pattern | Example |
|----------|---------|---------|
| Milestone directory | `<NNN>-<slug>/` | `005-consolidate-simplify/` |
| Story file | `<NNN>-STORY-<slug>.md` | `001-STORY-build-loop-consolidation.md` |
| Task file | `<NNN>-TASK-<slug>.md` | `001-TASK-queue-api-surface.md` |

**Components:**
- `NNN`: Zero-padded 3-digit number (001, 002, ..., 999)
- `STORY` / `TASK`: Required uppercase type segment for artifact files
- `slug`: Kebab-case descriptive name
- `.md`: Markdown extension (files only)

Default placement is milestone-scoped:
- `docs/planning/milestones/<NNN>-<slug>/stories/`
- `docs/planning/milestones/<NNN>-<slug>/tasks/`

---

## Zero-Padded Numbers

Numbers are always **3 digits minimum**, zero-padded:

| Correct | Incorrect |
|---------|-----------|
| `001` | `1` |
| `012` | `12` |
| `099` | `99` |

This ensures correct alphabetical sorting: `001` < `010` < `100`.

---

## Kebab-Case Slugs

Slugs use **kebab-case**:

| Rule | Example |
|------|---------|
| All lowercase | `user-auth` not `User-Auth` |
| Hyphens for spaces | `code-review` not `code_review` or `codeReview` |
| No special characters | `api-v2` not `api-v2.0` |
| Descriptive, concise | `parallel-review` not `pr` |

**Good slugs:**
- `user-authentication`
- `milestone-scoped-logs`
- `timing-instrumentation`

**Bad slugs:**
- `User_Authentication` (wrong case, underscore)
- `logs` (too vague)
- `feature-1` (non-descriptive)

---

## Type Segment Requirement

The folder still indicates purpose, but filenames must also include the explicit type segment.

| Correct | Incorrect |
|---------|-----------|
| `stories/001-STORY-user-auth.md` | `stories/001-user-auth.md` |
| `tasks/015-TASK-fix-bug.md` | `tasks/015-fix-bug.md` |

Use `STORY` only for story files and `TASK` only for task files.

---

## JSON Refs

In JSON files (like `subtasks.json`), references use the **filename without extension**:

```json
{
  "taskRef": "001-TASK-queue-api-surface",
  "storyRef": "001-STORY-build-loop-consolidation"
}
```

**Not:**
```json
{
  "taskRef": "TASK-001",
  "taskRef": "001-queue-api-surface.md"
}
```

Benefits:
- Refs match filenames directly (easy to find)
- No redundant `.md` extension
- Human-readable (the slug describes the content)

---

## Migration Note

Legacy files may use one of these older formats:
- `NNN-<slug>.md` (no type segment)
- `TASK-NNN` / `STORY-NNN` shorthand refs

When migrating, normalize to the canonical patterns above:

| Old Format | New Format |
|------------|------------|
| `stories/001-user-auth.md` | `stories/001-STORY-user-auth.md` |
| `tasks/015-fix-bug.md` | `tasks/015-TASK-fix-bug.md` |
| `TASK-015` | `015-TASK-fix-bug` |
| `STORY-001` | `001-STORY-user-auth` |

Migration rule of thumb:
- Keep the numeric portion.
- Add the required `STORY` or `TASK` segment.
- Keep or derive a kebab-case slug from the artifact title.
