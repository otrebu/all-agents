# Parallel Search

Multi-angle web research using Parallel Search API (up to 30K chars/result).

## Use Cases

- Multi-perspective or comparative analysis
- New frameworks, libraries, current events
- Deep content analysis across sources

## Invocation

**Use Bash tool ONLY:** `aaa parallel-search`

```bash
aaa parallel-search \
  --objective "Your research objective" \
  --queries "query1" "query2" "query3"
```

**Options:**

- `--processor`: lite|base|pro|ultra (default: pro)
- `--max-results`: Default 15
- `--max-chars`: Default 5000 (max 30000)

**Example:**

```bash
aaa parallel-search \
  --objective "Production RAG architecture" \
  --queries \
    "RAG chunking strategies" \
    "RAG evaluation metrics" \
    "RAG deployment challenges"
```

## Workflow

1. Identify objective + 3-5 distinct query angles
2. Execute `aaa parallel-search` via Bash tool
3. Tool automatically saves results:
   - Raw JSON: `docs/research/parallel/raw/<timestamp:YYYYMMDD-HHMMSS>-<topic>.json`
   - Report: `docs/research/parallel/<timestamp:YYYYMMDD-HHMMSS>-<topic>.md`
4. Synthesize results -> key findings in the generated report

## Report Format

Structure reports as:

```markdown
# [Title]

**Date:** YYYY-MM-DD
**Objective:** [Original objective]

## Summary

[2-3 sentence overview]

## Findings

### [Category 1]

- **Key point**: Context

### [Category 2]

- **Key point**: Context

## Analysis

[Synthesis addressing query angles]

## Sources

- **[Domain] Title**: URL
```

**Requirements:**

- Include all source URLs
- Group by category, not source
- Bold key terms
- Synthesize, don't dump raw output

## Setup

**Required:** `AAA_PARALLEL_API_KEY` environment variable
Get key: https://platform.parallel.ai/

## Troubleshooting

- Auth/rate limit errors -> check API key
- Network issues -> retry with `--processor lite`

## Implementation

Scripts: `context/knowledge/parallel-search/scripts/`
