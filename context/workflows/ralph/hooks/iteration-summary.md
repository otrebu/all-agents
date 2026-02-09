# Iteration Summary Generator

You are generating a concise iteration summary for the Ralph build system. This summary will be used for notifications (ntfy push notifications) and logging.

## Input

### Available Template Variables

These variables are substituted before the prompt is sent to the summary model.

| Variable | Description | Example Value | Required |
|---|---|---|---|
| `{{SUBTASK_ID}}` | Current subtask identifier. | `SUB-398` | Yes |
| `{{SUBTASK_TITLE}}` | Human-readable subtask title. | `Add Available Variables documentation section to iteration-summary.md prompt` | Yes |
| `{{SUBTASK_DESCRIPTION}}` | Detailed subtask description text. | `Update context/workflows/ralph/hooks/iteration-summary.md to add a comprehensive "Available Template Variables" section...` | No |
| `{{STATUS}}` | Iteration outcome. | `completed` | Yes |
| `{{MILESTONE}}` | Parent milestone identifier/name. | `003-ralph-workflow` | No |
| `{{TASK_REF}}` | Parent task reference. | `035-document-template-variables` | No |
| `{{ITERATION_NUM}}` | Iteration attempt number (1-based). | `1` | No |
| `{{SESSION_CONTENT}}` | Session JSONL content excerpt (trimmed for prompt size). | `{"type":"tool_call",...}` | No |
| `{{SESSION_JSONL_PATH}}` | Absolute path to the session JSONL file. | `/home/user/.claude/projects/.../session.jsonl` | No |
| `{{SESSION_JSONL_CONTENT}}` | Alias of session JSONL content (same value source as `SESSION_CONTENT`). | `{"type":"tool_call",...}` | No |

Notes:

- Missing variables are left as literal `{{missing_variable}}` text and are not replaced.
- `SESSION_CONTENT` is substituted last because it may be large and can contain `{{...}}` text.

## Task

1. Review the session content provided in the "Session Content" section below
2. Extract the key activities and outcomes from the session
3. Generate a brief summary suitable for a push notification

## Output Format

**IMPORTANT:** Output ONLY valid JSON. No explanatory text, no markdown code fences around the JSON, just the raw JSON object.

Output a JSON object with these fields:

```json
{
  "subtaskId": "{{SUBTASK_ID}}",
  "status": "completed|failed|retrying",
  "summary": "1-3 sentence summary of what happened",
  "keyFindings": ["finding1", "finding2"]
}
```

## Summary Guidelines

**Length constraints for notifications:**
- Summary should be 1-3 sentences maximum
- Total summary text should be under 200 characters when possible
- Be concise but informative

**Content guidelines:**
- Lead with the outcome (what was accomplished or what failed)
- Mention specific files or components affected if relevant
- For failures, briefly note the type of failure
- Avoid technical jargon where possible

**Examples:**

Completed:
```json
{
  "subtaskId": "task-015-04",
  "status": "completed",
  "summary": "Implemented user authentication. Added JWT token validation to 3 endpoints.",
  "keyFindings": ["Added auth middleware", "Updated user routes", "All tests passing"]
}
```

Failed:
```json
{
  "subtaskId": "task-015-04",
  "status": "failed",
  "summary": "Failed to implement auth - TypeScript errors in middleware. Tests blocked.",
  "keyFindings": ["Type mismatch in auth handler", "Missing jwt dependency", "3 test failures"]
}
```

Retrying:
```json
{
  "subtaskId": "task-015-04",
  "status": "retrying",
  "summary": "Auth middleware added but token validation incomplete. Tests skipped.",
  "keyFindings": ["Middleware scaffolded", "Validation logic TODO", "Needs follow-up"]
}
```

## Instructions

1. Parse the session content provided below
2. Determine the overall status from the session outcome
3. Identify 2-4 key findings from the work done
4. Write a summary that captures the essential outcome in 1-3 sentences
5. Output the JSON structure above

Keep the summary actionable and scannable - this will appear in mobile notifications.

## Session Content

```jsonl
{{SESSION_CONTENT}}
```
