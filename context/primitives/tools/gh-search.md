---
depends: []
---

# GitHub Code Search

Search GitHub for real-world code examples and implementation patterns.

## Use Cases

- Real-world examples ("how do people implement X?")
- Library usage patterns
- Architectural patterns

## Invocation

**Use Bash tool ONLY:** `aaa gh-search`

```bash
aaa gh-search "your query"
```

**Query Strategies:**
- **Code patterns:** `function use` (definitions), `const use =` (arrow functions)
- **Signatures:** `(req, res, next) =>` (middleware), `function(err,` (handlers)
- **Config:** `filename:tsconfig.json`, `extension:yml path:.github`
- **Language:** `language:typescript`, `language:go`

## Workflow

1.  **Generate Queries:** Create 3-5 targeted queries (language, specific patterns, file types).
2.  **Execute:** Run `aaa gh-search "query"` sequentially.
3.  **Aggregate:** Combine results, deduplicate, ensure diversity.
4.  **Analyze:** Extract imports, architectural styles, structures.
5.  **Report:** Synthesize findings with GitHub URLs.
6.  **Generate timestamp:** `date "+%Y%m%d-%H%M%S"`
7.  **Save to:** `docs/research/github/[timestamp]-topic.md`

## Report Format

```markdown
# GitHub Code Search: [Topic]

## Summary
[Overview of patterns found]

## Patterns
- **[Pattern Name]**: [Description] (Refs: [repo/file](url))

## Examples
### [Approach Name]
- **Pros/Cons**: [Trade-offs]
- **Code**: [Link to file](url)

## All Files
[List of all analyzed files with GitHub URLs]
```

## Setup

**Required:** `gh` CLI authenticated (`gh auth login`) or `AAA_GITHUB_TOKEN`.

## Implementation

Scripts: `context/knowledge/github/scripts/`
