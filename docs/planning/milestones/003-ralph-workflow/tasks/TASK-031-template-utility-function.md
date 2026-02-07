## Task: Create Template Substitution Utility Function

**Story:** [STORY-006-template-substitution](../stories/STORY-006-template-substitution.md)

### Goal

A reusable template substitution function exists that replaces `{{VAR}}` placeholders in strings with provided values.

### Context

VISION.md Section 8.1 specifies `{{VAR}}` substitution for hook prompts, but this is not implemented. Currently, `post-iteration.ts` has inline `replaceAll()` calls scattered in `generateSummary()` (lines 207-214). This approach:

- Duplicates substitution logic across potential callsites
- Makes it hard to add new variables consistently
- Has no warning for missing variables (current code just leaves `{{VAR}}` literal)

We need a centralized utility that handles substitution with proper logging for missing variables.

### Plan

1. Create `tools/src/commands/ralph/template.ts`
2. Define `TemplateVariables` interface for supported variables
3. Implement `substituteTemplate(template: string, variables: Partial<TemplateVariables>): string`
4. Log warning (not error) for any `{{VAR}}` that has no value in variables
5. Export the function and type from the module
6. Add unit tests in `tools/tests/lib/template.test.ts`

### Acceptance Criteria

- [ ] `substituteTemplate()` function exists in `template.ts`
- [ ] Function replaces all `{{VAR}}` patterns with corresponding values
- [ ] Missing variables log a warning but do not throw
- [ ] Missing variables are left as `{{VAR}}` literal in output
- [ ] Function handles edge cases: empty template, no placeholders, undefined values
- [ ] Unit tests cover: basic substitution, missing variable warning, edge cases

### Test Plan

- [ ] Unit test: basic substitution `{{FOO}}` -> "bar"
- [ ] Unit test: multiple variables in single template
- [ ] Unit test: missing variable leaves `{{VAR}}` literal
- [ ] Unit test: missing variable triggers console warning (mock console.warn)
- [ ] Unit test: empty template returns empty string
- [ ] Unit test: template with no placeholders returns unchanged

### Scope

- **In:** Template substitution utility function, type definition, unit tests
- **Out:** Integration with hooks, prompt updates, documentation of variables

### Notes

**Implementation pattern:**

```typescript
function substituteTemplate(
  template: string,
  variables: Record<string, string | undefined>,
): string {
  return template.replaceAll(/\{\{(\w+)\}\}/g, (match, varName) => {
    const value = variables[varName];
    if (value === undefined) {
      console.warn(`Template variable {{${varName}}} not provided`);
      return match; // Leave as literal
    }
    return value;
  });
}
```

**Order matters:** Variables containing `{{` themselves could corrupt templates. Consider substituting user content (SESSION_CONTENT) last, or escaping `{{` in values.

### Related Documentation

- @context/stacks/cli/cli-bun.md
- @context/foundations/test/test-unit-vitest.md
