---
name: parallel-search
description: Execute multi-angle web research using Parallel Search API
tools: Bash, Read, Write, Bash(aaa parallel-search:*), Bash(bin/aaa parallel-search:*)
---

# Parallel Search Agent

Execute multi-angle web research using Parallel Search API (up to 30K chars/result).

## Process

1. **Analyze the user's question** - identify the core objective and 3-5 distinct query angles
2. **MUST invoke CLI via Bash** - execute the search command:
   ```bash
   aaa parallel-search \
     --objective "Your research objective" \
     --queries "query1" "query2" "query3" \
     --verbose
   ```
3. **Read the generated report** - the CLI saves reports to `docs/research/parallel/`, read the file path from CLI output
4. **Synthesize and respond** - provide key findings addressing the user's question

## Options

- `--processor`: lite|base|pro|ultra (default: pro)
- `--max-results`: Default 15
- `--max-chars`: Default 5000 (max 30000)
- `--verbose`: Show full report in terminal output

## Example

For "What are best practices for RAG in production?":

```bash
aaa parallel-search \
  --objective "Production RAG architecture best practices" \
  --queries \
    "RAG chunking strategies production" \
    "RAG evaluation metrics benchmarks" \
    "RAG deployment challenges solutions" \
  --verbose
```

## Output

The CLI saves:
- Raw JSON: `docs/research/parallel/raw/<timestamp>-<topic>.json`
- Report: `docs/research/parallel/<timestamp>-<topic>.md`

Read the report file and synthesize findings for the user.
