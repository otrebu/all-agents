# Chunked Presentation Protocol

When reviewing interactively, present findings **one at a time** instead of dumping everything at once.

## Flow

1. **Announce:** "I'll show you one review point at a time. Ready for the first?"
2. **Present** single finding with enough context to understand it
3. **Wait** for user response:
   - `next` / `n` / `ok` → continue to next point
   - `discuss` / `d` → dig deeper on this point
   - `skip` / `s` → skip remaining points in this category
   - `edit` / `e` → make a change based on this finding
4. **Repeat** until all findings presented
5. **Summarize:** "That's all [N] points. Ready to move on?"

## Why Chunked?

- **Easier to digest** - one thing at a time
- **Focused discussion** - can push back on individual points
- **Less cognitive load** - no wall of text
- **Better retention** - user processes each point

## Example

```
I'll show you one review point at a time. Ready?

---

**Finding 1/4:** AC #2 "database updated correctly" is technical, not user-visible.

The user can't observe a database update - what do they SEE that confirms success?

Suggestion: Change to "User sees confirmation message and item appears in their list"

[next / discuss / edit]
```

## Applies To

- Story reviews (per-story quality checks)
- Roadmap reviews (per-milestone findings)
- Gap analysis (critical issues, then warnings)
- Any interactive review with multiple findings
