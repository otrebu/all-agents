---
depends:
  - "@context/blocks/docs/atomic-documentation.md"
  - "@context/blocks/docs/maintenance.md"
  - "@context/blocks/docs/prompting.md"
---

# Atomic Documentation Review

Review atomic documentation files against standards defined in dependencies.

Prompting standards are centralized in @context/blocks/docs/prompting.md (single canonical source).

## Review Checklist

Verify against @context/blocks/docs/atomic-documentation.md:

### 1. Naming

- [ ] Follows layer pattern (blocks/foundations/stacks)
- [ ] Domain-appropriate capability verb (if foundation)
- [ ] Tool suffix only when alternatives exist

### 2. Layer Compliance

- [ ] **Blocks**: Single concern, tool-centric, context-agnostic
- [ ] **Foundations**: Capability-centric, shows composition
- [ ] **Stacks**: Complete setup, artifact-type organized

### 3. Size Guidelines

- [ ] Blocks: 40-120 lines
- [ ] Foundations: 120-280 lines
- [ ] Stacks: 150-300 lines

### 4. Duplication

- [ ] No >30 line overlaps
- [ ] References with `@context/...` instead of duplicating
- [ ] Foundations show only deltas, not full base configs

### 5. Dependencies

- [ ] Frontmatter `depends` lists all referenced files
- [ ] No circular dependencies
- [ ] References resolve correctly

### 6. Tags

- [ ] Minimal tags (core, auth, database, async, monorepo, ...)
- [ ] No redundant tags (context in filename/domain)

### 7. Domain Alignment

- [ ] Correct SWEBOK domain folder
- [ ] Uses domain capability verbs (see atomic-documentation.md)

### 8. Composition

- [ ] Blocks are reusable, standalone
- [ ] Foundations reference blocks
- [ ] Stacks compose foundations
- [ ] Platform foundations execution-agnostic

### 9. Prompting Policy Alignment

- [ ] Writing aligns with shared prompting.md MUST/SHOULD/MAY policy
- [ ] No local/duplicated prompting rule system introduced

## Output Format

```markdown
## Review: [filename]

### Summary

[PASS/NEEDS_REVISION] - Brief overall assessment

### Issues

#### [SEVERITY] [Category]: [Issue]

**Current:** [What exists]
**Expected:** [What should be]
**Action:** [Specific fix]

### Recommendations

- [Optional improvement 1]
- [Optional improvement 2]
```

## Severity Levels

- **CRITICAL**: Violates core standards, breaks composition
- **HIGH**: Significant duplication or misplacement
- **MEDIUM**: Suboptimal patterns, minor violations
- **LOW**: Style improvements, suggestions

## Constraints

- Reference standards, don't restate them
- Be specific with line numbers/examples
- Suggest concrete fixes, not abstract advice
- If PASS, explain why briefly
