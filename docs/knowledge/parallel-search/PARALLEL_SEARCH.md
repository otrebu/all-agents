# Parallel Search

Web research using Parallel's Search API with extended excerpts (up to 30K chars per result).

## Checklist: When to Use

- [ ] Topic requires multiple perspectives or comparative analysis
- [ ] Investigating new frameworks, libraries, or current events
- [ ] Need documentation synthesis from multiple sources
- [ ] Need deep content analysis (extended excerpts)

## Prerequisites

1. **Environment**: `PARALLEL_API_KEY` set (Get key: https://platform.parallel.ai/)
2. **Dependencies**: Auto-installed via pnpm

## Workflow

1. **Analyze**: Identify main objective and 3-5 distinct query angles.
2. **Execute**: Run search command (see Usage).
3. **Synthesize**: Analyze results to extract key findings.
4. **Persist**: Save report to `docs/research/parallel/TIMESTAMP-topic.md` using the **Strict Output Template**.

## Usage

### Comprehensive Research (Recommended)

```bash
pnpm parallel-search \
  --objective "Production RAG system architecture" \
  --queries \
    "RAG chunking strategies" \
    "RAG evaluation metrics" \
    "RAG deployment challenges" \
    "RAG vector database selection"
```

### Options

- `--processor`: `lite`, `base`, `pro` (default), `ultra`
- `--max-results`: Default 15
- `--max-chars`: Default 5000 (up to 30000)

## Research Persistence: Strict Output Template

**CRITICAL**: You MUST use this exact markdown structure for all research reports.

```markdown
# [Title based on Objective]

**Date:** YYYY-MM-DD
**Objective:** [Original search objective]

## Executive Summary

[Brief 2-3 sentence overview of high-level findings]

## Key Findings

### [Category 1]

- **Finding**: Description with context.
- **Finding**: Description with context.

### [Category 2]

- **Finding**: Description with context.

## Detailed Analysis

[In-depth synthesis of the gathered information, resolving the query angles]

## Sources

[List ALL relevant sources found]

- **[Domain] Title**: URL
- **[Domain] Title**: URL
```

### Formatting Rules

- **Do** include specific URLs for every source.
- **Do** group findings by category, not by source.
- **Do** use bolding for key terms.
- **Don't** dump raw API output; synthesize it.
- **Don't** omit the "Sources" section.

## Error Handling

- **Auth/Rate Limits**: Check API key and wait for reset if needed.
- **Network**: Retry with `--processor lite` if connection is unstable.

## Implementation Details

Files in `docs/knowledge/parallel-search/scripts/`: `search.ts`, `parallel-client.ts`, `formatter.ts`, `log.ts`, `types.ts`.
