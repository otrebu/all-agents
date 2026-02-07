## Task: Add Missing Template Variables to Post-Iteration Context

**Story:** [STORY-006-template-substitution](../stories/STORY-006-template-substitution.md)

### Goal

All story-specified template variables are populated and available for substitution in hook prompts.

### Context

The story specifies these variables that are NOT currently populated in `generateSummary()`:

- `SESSION_JSONL_CONTENT` - same as SESSION_CONTENT (alias)
- `SESSION_JSONL_PATH` - path to session log file (available as `sessionPath` parameter)
- `SUBTASK_DESCRIPTION` - subtask description (available as `subtask.description`)

The following are already populated:
- SUBTASK_ID, SUBTASK_TITLE, STATUS, MILESTONE, TASK_REF, ITERATION_NUM, SESSION_CONTENT

This task depends on TASK-033 (integration) and adds the remaining variables.

### Plan

1. Add `SESSION_JSONL_PATH` variable from `sessionPath` parameter
2. Add `SUBTASK_DESCRIPTION` variable from `subtask.description`
3. Add `SESSION_JSONL_CONTENT` as alias (same value as SESSION_CONTENT)
4. Update the variables object passed to `substituteTemplate()`
5. Add unit tests for new variable population

### Acceptance Criteria

- [ ] `SESSION_JSONL_PATH` is populated with absolute path to session file
- [ ] `SUBTASK_DESCRIPTION` is populated from subtask object
- [ ] `SESSION_JSONL_CONTENT` is an alias for `SESSION_CONTENT`
- [ ] All seven story-specified variables are available
- [ ] Variables handle null/undefined gracefully (path can be null if no session)

### Test Plan

- [ ] Unit test: variables object includes SESSION_JSONL_PATH when sessionPath is provided
- [ ] Unit test: variables object includes SUBTASK_DESCRIPTION
- [ ] Unit test: SESSION_JSONL_CONTENT equals SESSION_CONTENT
- [ ] Unit test: SESSION_JSONL_PATH is empty string (not undefined) when sessionPath is null

### Scope

- **In:** Adding new variables to the substitution context
- **Out:** Prompt template updates, documentation of variables

### Notes

**Null handling:**

When `sessionPath` is null (no session found), the variable should be set to empty string rather than undefined. This allows prompts to gracefully handle the case:

```typescript
const variables: Partial<TemplateVariables> = {
  SESSION_JSONL_PATH: sessionPath ?? "",
  SESSION_JSONL_CONTENT: sessionContent,
  SESSION_CONTENT: sessionContent,
  SUBTASK_DESCRIPTION: subtask.description,
  // ... other variables
};
```

**Session content truncation:**

The current code truncates session content to last 50 lines or 10KB. This is intentional to keep prompts small. The `SESSION_JSONL_PATH` variable allows prompts to reference the full file if needed (though Haiku can't read files in -p mode).

### Related Documentation

- @context/blocks/quality/coding-style.md (null handling)
- @context/stacks/cli/cli-bun.md
