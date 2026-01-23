# Iteration Summary Generator

You are generating a concise iteration summary for the Ralph build system. This summary will be used for notifications (ntfy push notifications) and logging.

## Input

### Required Inputs

These inputs must be provided for the summary to be generated:

- **Subtask ID:** `{{SUBTASK_ID}}` - The ID of the subtask that was processed (e.g., "task-015-04")
- **Status:** `{{STATUS}}` - The iteration status: "success", "failure", or "partial"
- **Session JSONL Path:** `{{SESSION_JSONL_PATH}}` - Path to the Claude session JSONL file containing the iteration transcript

### Optional Context Fields

These inputs provide additional context when available:

- **Subtask Title:** `{{SUBTASK_TITLE}}` - Human-readable title of the subtask (defaults to subtaskId if not provided)
- **Milestone:** `{{MILESTONE}}` - Name of the parent milestone (e.g., "authentication-mvp")
- **Task Reference:** `{{TASK_REF}}` - Reference to the parent task file (e.g., "docs/planning/tasks/015-auth.md")
- **Iteration Number:** `{{ITERATION_NUM}}` - Current iteration attempt number (e.g., 1, 2, 3)

## Task

1. If `{{SESSION_JSONL_PATH}}` is provided and exists, read the session JSONL to understand what happened during the iteration
2. Extract the key activities and outcomes from the session
3. Generate a brief summary suitable for a push notification

## Output Format

Output a JSON object with these fields:

```json
{
  "subtaskId": "{{SUBTASK_ID}}",
  "status": "success|failure|partial",
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

Success:
```json
{
  "subtaskId": "task-015-04",
  "status": "success",
  "summary": "Implemented user authentication. Added JWT token validation to 3 endpoints.",
  "keyFindings": ["Added auth middleware", "Updated user routes", "All tests passing"]
}
```

Failure:
```json
{
  "subtaskId": "task-015-04",
  "status": "failure",
  "summary": "Failed to implement auth - TypeScript errors in middleware. Tests blocked.",
  "keyFindings": ["Type mismatch in auth handler", "Missing jwt dependency", "3 test failures"]
}
```

Partial:
```json
{
  "subtaskId": "task-015-04",
  "status": "partial",
  "summary": "Auth middleware added but token validation incomplete. Tests skipped.",
  "keyFindings": ["Middleware scaffolded", "Validation logic TODO", "Needs follow-up"]
}
```

## Instructions

1. Parse the session JSONL if available to understand iteration activities
2. Determine the overall status from the session outcome
3. Identify 2-4 key findings from the work done
4. Write a summary that captures the essential outcome in 1-3 sentences
5. Output the JSON structure above

Keep the summary actionable and scannable - this will appear in mobile notifications.
