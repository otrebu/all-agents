# Iteration Summary Prompt

You are summarizing a Claude Code build iteration for subtask **{{SUBTASK_ID}}**.

## Context

- **Subtask:** {{SUBTASK_TITLE}}
- **Milestone:** {{MILESTONE}}
- **Task Reference:** {{TASK_REF}}
- **Iteration:** {{ITERATION_NUM}}
- **Status:** {{STATUS}}

## Session Log (excerpt)

```
{{SESSION_CONTENT}}
```

## Instructions

Analyze the session log excerpt above and produce a concise summary of what happened during this iteration.

Return JSON only:

```json
{
  "summary": "1-2 sentence summary of what was accomplished or attempted",
  "keyFindings": ["observation 1", "observation 2"]
}
```

Focus on:
- What was attempted vs accomplished
- Key files modified or created
- Any blockers or errors encountered
- Notable decisions made
