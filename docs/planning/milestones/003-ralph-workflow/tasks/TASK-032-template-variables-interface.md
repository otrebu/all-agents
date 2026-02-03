## Task: Define Supported Template Variables Interface

**Story:** [STORY-006-template-substitution](../stories/STORY-006-template-substitution.md)

### Goal

A TypeScript interface defines all supported template variables with clear documentation for each variable's purpose and source.

### Context

The story specifies seven template variables that hook prompts can use:

- `SESSION_JSONL_CONTENT` - full session log content
- `SESSION_JSONL_PATH` - path to session log file
- `SUBTASK_ID` - current subtask ID (e.g., SUB-001)
- `SUBTASK_TITLE` - current subtask title
- `SUBTASK_DESCRIPTION` - current subtask description
- `MILESTONE` - current milestone name
- `ITERATION_NUM` - current iteration number

The existing `iteration-summary.md` prompt already uses some of these (SUBTASK_ID, STATUS, SUBTASK_TITLE, etc.) but they need to be formalized in a type definition.

This task depends on TASK-031 (template utility function) and extends it with the formal variable interface.

### Plan

1. Add `TemplateVariables` interface to `template.ts`
2. Document each variable with JSDoc comments explaining source and format
3. Include `STATUS` variable (already used in iteration-summary.md)
4. Include `TASK_REF` variable (already used in iteration-summary.md)
5. Include `SESSION_CONTENT` as alias for `SESSION_JSONL_CONTENT` (backward compat)
6. Export the interface from the module

### Acceptance Criteria

- [ ] `TemplateVariables` interface exists with all seven story-specified variables
- [ ] Each variable has JSDoc documentation
- [ ] Interface includes `STATUS` and `TASK_REF` (already in use)
- [ ] Interface includes `SESSION_CONTENT` for backward compatibility
- [ ] Variables are all optional (Partial usage pattern)
- [ ] Interface is exported from `template.ts`

### Test Plan

- [ ] TypeScript compilation succeeds with interface
- [ ] Unit test: `substituteTemplate()` accepts `Partial<TemplateVariables>` argument
- [ ] Type check: verify all expected properties are in interface

### Scope

- **In:** Interface definition, JSDoc documentation, export
- **Out:** Integration with hooks, actual variable value population

### Notes

**Interface design:**

```typescript
/**
 * Supported template variables for hook prompts
 * All variables are optional - missing variables log warning
 */
interface TemplateVariables {
  /** Current iteration number (1-based) */
  ITERATION_NUM: string;
  /** Current milestone name (e.g., "003-ralph-workflow") */
  MILESTONE: string;
  /** Full session log content (last ~50 lines or 10KB) */
  SESSION_CONTENT: string;
  /** Alias for SESSION_CONTENT */
  SESSION_JSONL_CONTENT: string;
  /** Absolute path to session JSONL file */
  SESSION_JSONL_PATH: string;
  /** Iteration status: "completed", "failed", "retrying" */
  STATUS: string;
  /** Subtask description text */
  SUBTASK_DESCRIPTION: string;
  /** Subtask ID (e.g., "SUB-001") */
  SUBTASK_ID: string;
  /** Subtask title */
  SUBTASK_TITLE: string;
  /** Reference to parent task (e.g., "TASK-001") */
  TASK_REF: string;
}
```

### Related Documentation

- @context/blocks/quality/coding-style.md (naming conventions)
- @context/stacks/cli/cli-bun.md
