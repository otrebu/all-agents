# 🎯 PROMPT ENGINEERING STANDARDS

## Core Principles

This document defines the standards for creating effective prompts and context documentation for AI, based on Anthropic's context engineering principles.

## Key Principles

### 1. Context is a Finite Resource

- LLMs have a limited "attention budget"
- As context length increases, model performance degrades
- Every token depletes attention capacity
- Treat context as precious and finite

### 2. Optimize for Signal-to-Noise Ratio

- Prefer clear, direct language over verbose explanations
- Remove redundant or overlapping information
- Focus on high-value tokens that drive desired outcomes

### 3. Progressive Information Discovery

- Use lightweight identifiers rather than full data dumps
- Load detailed information dynamically when needed
- Allow agents to discover information just-in-time
- Document files must be lightweight pointers.
  - ❌ **BAD**: Duplicating tool flags/options in the prompt.
  - ✅ **GOOD**: `3. Execute search per @docs/knowledge/parallel-search/PARALLEL_SEARCH.md`

## Prompt template

```markdown
# [Topic]

## Context

[Brief context/goal]

## Workflow

1. [Step 1] - Use `tool_name`
2. [Step 2]

## Output

- [Description of expected output/artifact]

## Examples

- [Example 1]

## Constraints

- [Constraint 1]
```

## Writing Standards

### Style

- **Be Direct**: Use imperatives ("Validate input") not suggestions ("You should validate").
- **Structure**: Use lists for constraints/requirements. Avoid paragraphs.
- **No Fluff**: Remove "Why", "How", history, and verbose explanations.
- **Be Brief**: Be extremely brief, sacrifise language and grammar. Be so concise to have to use some emojis to cut things short. You must still be able to read the prompt and understand the intent.

### Examples

✅ **Good**:

```markdown
## Constraints

- Max response: 500 tokens
- Required fields: name, email
```

❌ **Bad**:

```markdown
The response should not exceed 500 tokens and must include name and email.
```

## Best Practices Checklist

- [ ] Markdown headers for organization
- [ ] Clear, direct, minimal, brief language
- [ ] No redundant info, no fluff
- [ ] Actionable instructions
- [ ] Constraints defined in list
- [ ] References (`@docs/...`) used instead of duplication
- [ ] No "historical context" or "evolution"
- [ ] No overlapping tool definitions
