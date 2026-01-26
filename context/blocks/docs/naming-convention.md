---
depends: []
tags: [planning, naming]
---

# File Naming Convention

Single source of truth for planning file naming in the `docs/planning/` hierarchy.

## Pattern: NNN-slug.md

All planning files (stories, tasks) follow this pattern:

```
{NNN}-{slug}.md
```

**Components:**
- `NNN`: Zero-padded 3-digit number (001, 002, ..., 999)
- `-`: Hyphen separator
- `slug`: Kebab-case descriptive name
- `.md`: Markdown extension

**Examples:**
```
001-user-authentication.md
002-parallel-code-review.md
015-cli-ergonomics-fixes.md
```

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

## Folder-Based Type Inference

The **folder** determines the artifact type, not a prefix in the filename:

| Path | Type |
|------|------|
| `stories/001-feature.md` | Story |
| `tasks/001-feature.md` | Task |

**Do NOT include type prefixes:**

| Correct | Incorrect |
|---------|-----------|
| `stories/001-user-auth.md` | `stories/STORY-001-user-auth.md` |
| `tasks/015-fix-bug.md` | `tasks/TASK-015-fix-bug.md` |

The folder already conveys the type. Prefixes are redundant.

---

## JSON Refs

In JSON files (like `subtasks.json`), references use the **filename without extension**:

```json
{
  "taskRef": "015-cli-ergonomics-fixes",
  "storyRef": "001-parallel-code-review"
}
```

**Not:**
```json
{
  "taskRef": "TASK-015",
  "taskRef": "015-cli-ergonomics-fixes.md"
}
```

Benefits:
- Refs match filenames directly (easy to find)
- No redundant `.md` extension
- Human-readable (the slug describes the content)

---

## Migration Note

Legacy files may use `TASK-NNN` or `STORY-NNN` prefixes. These are being migrated to the NNN-slug pattern. When updating old refs:

| Old Format | New Format |
|------------|------------|
| `TASK-015` | `015-cli-ergonomics-fixes` |
| `STORY-001` | `001-parallel-code-review` |

The numeric portion maps directly; the slug is derived from the original file's title.
