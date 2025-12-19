---
depends:
  - "@context/blocks/docs/atomic-documentation.md"
  - "@context/blocks/docs/maintenance.md"
  - "@context/blocks/docs/prompting.md"
---

# Manage Atomic Documentation

Create or update atomic documentation following DRY composition patterns.

## Rules

See @context/blocks/docs/atomic-documentation.md for:

- Domain definitions & SWEBOK alignment
- Layer purposes (blocks/foundations/stacks)
- Naming patterns & capability verbs
- File size guidelines (40-120 blocks, 120-280 foundations, 150-300 stacks)
- Frontmatter structure (`depends`, `tags`)

See @context/blocks/docs/maintenance.md for composition patterns & when to split.

## Workflow

### 1. Discovery

**Determine content type:**

- Single tool/config? → Block
- Capability (combines blocks)? → Foundation
- Complete setup? → Stack

**Check existing:**

```bash
ls -la all-agents/context/{layer}/{domain}/
grep -r "pattern" all-agents/context/{layer}/
```

**Find similar docs for patterns:**

- Read 2-3 similar files in target layer
- Note structure, naming, reference style

### 2. Placement

**Naming (per atomic-documentation.md):**

- Block: `{domain}/{tool}.md` or `{domain}/{tool}-{variant}.md`
- Foundation: `{domain}/{capability}-{qualifier}-{tool}.md`
- Stack: `{artifact}/{artifact}-{pm}-{characteristic}.md`

**Path:**

- `all-agents/context/{layer}/{domain}/{filename}.md`

### 3. Content Structure

**All layers:**

```markdown
---
depends:
  - "@context/{layer}/{domain}/{filename}.md"
tags: [core] # Optional, minimal
---

# Title

[1-2 sentence purpose]

## [Sections per layer type]
```

**Block structure:**

- Purpose (1 line)
- Installation ( without mentioning the package manager )
- Configuration
- Usage
- When to use

**Foundation structure:**

- Purpose (1 line)
- References (list @context dependencies)
- Tool-specific config (deltas only, not full duplication)
- When to use / When NOT to use

**Stack structure:**

- Purpose (1 line)
- Dependencies (via frontmatter)
- Quick start
- Project structure
- Common commands
- Troubleshooting

### 4. DRY Patterns

**Reference, don't duplicate:**

```markdown
## TypeScript Config

See @context/blocks/construct/tsconfig-base.md

Tool-specific overrides:
{
"module": "NodeNext", // Only show deltas
"outDir": "dist"
}
```

**NOT this:**

```markdown
Complete config: // ❌ Duplicates base
{
"target": "ES2022", // Already in base
"strict": true, // Already in base
"module": "NodeNext"
}
```

### 5. Validation

**Pre-save checks:**

- [ ] Named per atomic-documentation.md pattern?
- [ ] References dependencies via `@context/...`?
- [ ] Shows only deltas (if foundation/stack)?
- [ ] File size appropriate? (see atomic-documentation.md)
- [ ] Has `depends` frontmatter if references blocks/foundations?
- [ ] Follows prompting.md style (brief, direct, lists)?

**Post-save:**

```bash
# Verify file exists
ls -la all-agents/context/{layer}/{domain}/{file}

# Check cross-references resolve
grep -r "@context/{layer}/{domain}/{file}" all-agents/context/
```

## Examples

### Creating Block

**Input:** "Document bun as runtime"
**Process:**

1. Discovery: Single tool → Block, construct domain
2. Placement: `blocks/construct/bun.md`
3. Structure: Purpose, install, config, usage, when to use
4. Validate: 40-120 lines, no dependencies needed

### Creating Foundation

**Input:** "Document TypeScript + Node + tsx execution"
**Process:**

1. Discovery: Capability (combines tsx block) → Foundation, construct domain
2. Placement: `foundations/construct/exec-tsx.md`
3. Structure: Reference `@context/blocks/construct/tsx.md`, show tsx-specific config deltas, complete package.json
4. Validate: 120-280 lines, has `depends` frontmatter

### Updating Existing

**Input:** "Add vitest coverage to test foundation"
**Process:**

1. Discovery: Find `foundations/test/test-unit-vitest.md`
2. Read existing, identify section to update
3. Add coverage section, reference `@context/blocks/test/vitest.md` coverage options
4. Update `depends` if new block referenced
5. Validate: Still within size limits

## Constraints

- **Never** duplicate content from referenced docs
- **Never** exceed layer size limits (see atomic-documentation.md)
- **Always** use `@context/` prefix for cross-references
- **Always** show only deltas in foundations (not complete configs)
- Use absolute paths: `/Users/Uberto.Rapizzi/dev/all-agents/context/...`
