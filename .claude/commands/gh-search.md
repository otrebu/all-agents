---
description: Search GitHub for code examples and patterns
allowed-tools: Bash(pnpm gh-search:*), Read
argument-hint: <query>
---

# GitHub Code Search

Search GitHub for real-world code examples and implementation patterns.

## Purpose

Find production code showing:
- Library usage patterns
- Architecture implementations
- Configuration examples

## When to Use

- Need real-world examples ("how do people implement X?")
- Exploring unfamiliar libraries/frameworks
- Comparing implementation approaches

## Parameters

**$ARGUMENTS**: Search query (code patterns, signatures, files)

## Workflow

1. Generate 3-5 targeted queries (language filters, patterns, file types)
2. Execute: `pnpm gh-search "query"` per query
3. Aggregate results, deduplicate, ensure diversity
4. Analyze: Extract imports, patterns, structures
5. Report findings with GitHub URLs

## Query Strategies

**Code patterns:**
- `function use` (definitions)
- `const use =` (arrow functions)

**Signatures:**
- `(req, res, next) =>` (middleware)
- `function(err,` (error handlers)

**Config:**
- `filename:tsconfig.json`
- `extension:yml path:.github`

**Language:**
- `language:typescript`
- `language:go`

## Output

```markdown
# GitHub Code Search: [Topic]

## Summary
[Pattern overview]

## Patterns
- **[Pattern]**: [Description] (Refs: [repo/file](url))

## Examples
### [Approach]
- **Pros/Cons**: [Trade-offs]
- **Code**: [Link](url)

## All Files
[GitHub URLs]
```

## Error Handling

- **No results**: Broaden query, remove filters
- **Too many**: Add language/file filters
- **Auth error**: Run `gh auth login` or set `GH_TOKEN`

## Constraints

- Requires `gh` CLI authenticated
- Scripts in `docs/knowledge/github/scripts/`
