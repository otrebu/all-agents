---
name: ralph-review
description: Interactive review of auto-generated Ralph artifacts. Use when user asks to "ralph review stories", "ralph review tasks", "ralph review roadmap", or needs to validate planning artifacts against their intent.
---

# Ralph Review

Interactive review of planning artifacts with fresh eyes.

## Execution

Check the ARGUMENTS:

### `stories <milestone>`

Follow @context/workflows/ralph/review/stories-review.md completely.

### `tasks <story-id>`

🔜 Not yet implemented. Tell user: "Task review coming soon."

### `roadmap`

🔜 Not yet implemented. Tell user: "Roadmap review coming soon."

### No argument

Show:
```
/ralph-review stories <milestone>  - Review stories for a milestone
/ralph-review tasks <story-id>     - (coming) Review tasks for a story
/ralph-review roadmap              - (coming) Review roadmap milestones
```
