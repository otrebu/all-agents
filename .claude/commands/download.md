---
description: Download URLs, extract text, save as markdown
allowed-tools: Bash(aaa download:*), Bash(bin/aaa download:*), Read
argument-hint: <urls...> [-o name] [-d dir]
---

# Download URLs

Fetch URLs, convert HTML to plaintext, save as markdown file.

## Workflow

### 1. Clean URLs from user input

User input may be messy. Before passing to CLI:

- **Extract from markdown**: `[link text](https://url.com)` → `https://url.com`
- **Remove trailing punctuation**: strip `,`, `.`, `)`, `]` from end
- **Split lists**: handle comma-separated, newline-separated, or space-separated URLs
- **Validate**: ensure each URL starts with `http://` or `https://`

### 2. Generate smart filename (unless `-o` provided)

Analyze the cleaned URLs to derive a meaningful topic name:

| URL Pattern | Generated Name |
|-------------|----------------|
| Same domain, different paths | `{domain}-{common-segment}` |
| `docs.tanstack.com/router` + `/start` | `tanstack-docs` |
| Multiple GitHub repos | `github-repos` |
| Single URL | extract domain + key path |

**Rules:**
- Keep concise: 2-4 words, hyphen-separated
- Lowercase, no special chars
- When in doubt, use the most specific common denominator

### 3. Execute

```bash
aaa download <url1> <url2> ... -o <generated-name> [-d <dir>]
```

## Parameters

- `<urls...>` - URLs to download (can be messy - will be cleaned)
- `-o, --output <name>` - Override auto-generated filename
- `-d, --dir <path>` - Output directory (default: `docs/research/downloads`)

## Constraints

- URLs must be http/https
- DO NOT modify the output file after download
