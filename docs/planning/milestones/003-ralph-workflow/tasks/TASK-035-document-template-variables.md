## Task: Document Template Variables in Prompt Header Comments

**Story:** [STORY-006-template-substitution](../stories/STORY-006-template-substitution.md)

### Goal

Hook prompt templates include header comments documenting all available template variables for developers customizing prompts.

### Context

The `iteration-summary.md` prompt already uses some template variables but the "Required Inputs" section is outdated. It lists variables without clear documentation of:

- Which variables are required vs optional
- What format each variable is in
- Example values for each variable

This task updates the prompt to serve as both documentation and working template.

This task depends on TASK-034 (all variables available) and documents the completed system.

### Plan

1. Update `context/workflows/ralph/hooks/iteration-summary.md` header section
2. Add "Available Variables" section listing all supported variables
3. Document each variable with: name, description, example value, optional/required status
4. Update the "Required Inputs" section to reflect actual requirements
5. Add note about variable ordering (SESSION_CONTENT substituted last)

### Acceptance Criteria

- [ ] `iteration-summary.md` has "Available Variables" documentation section
- [ ] All seven story-specified variables are documented
- [ ] Each variable has description and example value
- [ ] Variables marked as required vs optional
- [ ] Documentation notes that missing variables become literal `{{VAR}}`

### Test Plan

- [ ] Manual review: prompt header is clear and complete
- [ ] Manual test: run ralph build, verify no unexpected `{{VAR}}` literals in output
- [ ] Documentation review: variables section matches TemplateVariables interface

### Scope

- **In:** Prompt header documentation, iteration-summary.md updates
- **Out:** New prompt templates, code changes

### Notes

**Documentation format:**

```markdown
## Available Template Variables

The following variables are substituted before the prompt is sent:

| Variable | Description | Example | Required |
|----------|-------------|---------|----------|
| `{{SUBTASK_ID}}` | Subtask identifier | `SUB-001` | Yes |
| `{{SUBTASK_TITLE}}` | Short subtask title | `Implement auth middleware` | Yes |
| `{{SUBTASK_DESCRIPTION}}` | Detailed description | `Add JWT validation to...` | No |
| `{{STATUS}}` | Iteration outcome | `completed`, `failed`, `retrying` | Yes |
| `{{MILESTONE}}` | Parent milestone name | `003-ralph-workflow` | No |
| `{{TASK_REF}}` | Parent task reference | `TASK-001` | No |
| `{{ITERATION_NUM}}` | Iteration attempt (1-based) | `1` | No |
| `{{SESSION_CONTENT}}` | Session log (truncated) | *(jsonl content)* | No |
| `{{SESSION_JSONL_PATH}}` | Path to full session file | `/path/to/session.jsonl` | No |
| `{{SESSION_JSONL_CONTENT}}` | Alias for SESSION_CONTENT | *(jsonl content)* | No |

**Note:** Missing variables are left as `{{VAR}}` literal (not replaced).
```

**Future extensibility:**

This documentation pattern can be reused for other hook prompts added in the future. Consider creating a prompt template that includes this variables section.

### Related Documentation

- @context/blocks/docs/prompting.md (prompt structure)
- @context/blocks/docs/atomic-documentation.md (documentation patterns)
