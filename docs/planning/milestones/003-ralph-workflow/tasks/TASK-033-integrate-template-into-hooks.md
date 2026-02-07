## Task: Integrate Template Substitution into Hook Prompt Loading

**Story:** [STORY-006-template-substitution](../stories/STORY-006-template-substitution.md)

### Goal

Hook prompt loading uses the centralized `substituteTemplate()` function instead of inline `replaceAll()` calls.

### Context

Currently, `post-iteration.ts` `generateSummary()` function (lines 206-214) has inline substitution:

```typescript
promptContent = promptContent
  .replaceAll("{{SUBTASK_ID}}", subtask.id)
  .replaceAll("{{STATUS}}", status)
  .replaceAll("{{SUBTASK_TITLE}}", subtask.title)
  // ... etc
  .replaceAll("{{SESSION_CONTENT}}", sessionContent);
```

This should be replaced with a call to `substituteTemplate()` from TASK-031/032.

This task depends on TASK-031 (utility function) and TASK-032 (variables interface).

### Plan

1. Import `substituteTemplate` and `TemplateVariables` into `post-iteration.ts`
2. Build a `TemplateVariables` object from the available context in `generateSummary()`
3. Replace the chain of `replaceAll()` calls with single `substituteTemplate()` call
4. Ensure `SESSION_CONTENT` is still substituted last (or escape `{{` in session content)
5. Verify existing behavior is preserved (no functional change)
6. Update or add E2E tests to verify substitution works in practice

### Acceptance Criteria

- [ ] `post-iteration.ts` imports from `template.ts`
- [ ] `generateSummary()` uses `substituteTemplate()` instead of inline replaceAll
- [ ] All existing variables (SUBTASK_ID, STATUS, SUBTASK_TITLE, MILESTONE, TASK_REF, ITERATION_NUM, SESSION_CONTENT) work
- [ ] Missing variables log warning but don't break summary generation
- [ ] E2E tests still pass (ralph build generates summaries correctly)

### Test Plan

- [ ] E2E test: `aaa ralph build` still generates iteration diary entries
- [ ] E2E test: diary entries contain substituted values (not `{{VAR}}` literals)
- [ ] Unit test: `generateSummary()` calls `substituteTemplate()` (mock the function)
- [ ] Manual test: run ralph build on a test subtask, verify summary quality

### Scope

- **In:** Integration in post-iteration.ts, refactoring existing code
- **Out:** New variable additions, prompt template updates, documentation

### Notes

**SESSION_CONTENT ordering:**

The current code comments note that `SESSION_CONTENT` is substituted last to prevent template corruption if session contains `{{`. Two approaches:

1. **Keep substitution order:** Build variables object without SESSION_CONTENT, call substituteTemplate, then do one final replaceAll for SESSION_CONTENT
2. **Escape approach:** Escape `{{` in session content before substitution (e.g., replace `{{` with `\{\{` then unescape after)

Recommend approach 1 for simplicity - just substitute SESSION_CONTENT after the main substitution call.

**Error handling:**

The current code has fallback behavior if Haiku fails. Ensure template substitution errors don't cascade into Haiku failures.

### Related Documentation

- @context/blocks/quality/error-handling.md
- @context/stacks/cli/cli-bun.md
