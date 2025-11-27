# Gemini Research CLI

Deep web research using Gemini CLI with Google Search grounding. Cost-effective alternative to expensive research APIs.

## Overview

Leverage Gemini CLI's built-in Google Search grounding (`google_web_search`) to fetch real-time information with citations. Returns structured JSON which Claude synthesizes into a final Markdown report.

**Key advantages:**

- Free tier: 60 requests/min, 1000/day
- 1M-token context window (Gemini 2.5 Pro)
- Built-in Google Search grounding
- Structured JSON output with citations
- Real-time data (news, docs, tutorials)

## Prerequisites (Environment Pre-configured)

**Gemini CLI installed:**
(Assumed installed)

```bash
npm add -g @google/gemini-cli
```

**Authentication:**
(Assumed authenticated)
First run requires Google login:

```bash
gemini -p "test" --output-format json
```

## Usage

**Agent Protocol:**

1. **Select Mode**: Choose `quick` (default), `deep` (analysis), or `code` (examples).
2. **Execute Immediately**: Run the command. Do **NOT** check for files or install packages.
3. **Synthesize**: Read the output files and update the report.

When user asks to:

- "Research X using Google Search"
- "Find real-world examples of X"
- "Get latest information about X"

Run the CLI tool:

```bash
aaa gemini-research "your query here" [--mode quick|deep|code]
```

### Output Structure

The script generates two files in `docs/research/google/`:

1. **Raw Data**: `raw/YYYYMMDDHHMMSS-topic.json`
   - Contains the raw structured data from Gemini (sources, quotes, key points).
2. **Report Placeholder**: `YYYYMMDDHHMMSS-topic.md`
   - Contains the report header and a "PENDING ANALYSIS" section.

## CRITICAL WORKFLOW STEP

**EVERY TIME this skill runs, Claude MUST complete these steps:**

1. **Wait for research to complete** - Script outputs file paths.
2. **Read the Raw Data** - Use `Read` tool on the `.json` file.
3. **Read the Placeholder** - Use `Read` tool on the `.md` file.
4. **Analyze & Synthesize** - Apply the **Research Analysis Template** below to the raw data.
5. **Write Final Report** - Use `Edit` tool to replace the "PENDING ANALYSIS" section in the `.md` file with your synthesized report.

---

## Research Analysis Template

Use this structure to format your analysis of the raw JSON data:

````markdown
## Summary

<summary_from_json>

## Key Findings

- <key_point_1>
- <key_point_2>
  ...

## Sources

1. **[<title>](url)**
2. ...

## Detailed Quotes

> "<quote_text>"
> — [<source_url>]

## Deep Analysis (if deep mode)

### Contradictions

- <contradiction_1>

### Consensus

- <consensus_1>

### Knowledge Gaps

- <gap_1>

## Code Examples (if code mode)

### <description>

```<language>
<code>
```

**Source**: <source_url>

### Patterns & Best Practices

- <pattern_1>

### Gotchas

**Issue**: <issue>
**Solution**: <solution>

## Claude's Analysis

### Key Learnings

- <learning_1>
- <learning_2>

### Recommendations

- <recommendation_1>
- <recommendation_2>

### Next Steps

- <step_1>
````

---

## Research Modes

### 1. Quick Research (default)

Fast overview with 5-8 sources.

```bash
aaa gemini-research "TypeScript error handling patterns 2025"
```

### 2. Deep Research

Comprehensive analysis with 10-15 sources, contradictions identified.

```bash
aaa gemini-research "React Server Components best practices" --mode deep
```

### 3. Code Examples

Focus on practical code snippets, tutorials, and real-world implementations.

```bash
aaa gemini-research "Playwright headless browser automation" --mode code
```

## Troubleshooting

**Missing API auth:**
`Error: Not authenticated.` -> Run `gemini -p "test"` manually to auth.

**Rate limits:**
`Error: Rate limit exceeded` -> Wait 1 minute.

**JSON parsing errors:**
The script attempts to clean markdown blocks from Gemini's output. If it fails, the raw output is saved to the `raw/` directory for manual inspection.
