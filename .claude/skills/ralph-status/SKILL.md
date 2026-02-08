---
name: ralph-status
description: Display Ralph build status and progress. Use when user asks for "ralph status", "build status", "queue status", or wants to see subtask progress and iteration statistics.
---

# Ralph Status

Display the current Ralph build status, including subtask progress, iteration statistics, and configuration state.

## Usage

```
/ralph-status [--subtasks <path>]
```

## Arguments

| Argument | Description |
|----------|-------------|
| `--subtasks <path>` | Optional path to subtasks.json file (defaults to `subtasks.json`) |

## What It Shows

### Configuration
- Whether `ralph.config.json` exists in the project

### Subtasks Queue
- Current milestone name (from taskRef or milestone field)
- Progress bar with done/total count and percentage
- Last completed subtask with timestamp
- Next pending subtask in queue

### Iteration Statistics
- Total iteration count from diary
- Success rate (color-coded: green ≥80%, yellow ≥50%, red <50%)
- Average tool calls per iteration

## Examples

**Check current build status:**
```
/ralph-status
```

**Check status for a specific subtasks file:**
```
/ralph-status --subtasks docs/planning/milestones/ralph/subtasks.json
```

## Execution

When invoked, this skill maps to the TypeScript runtime command in
`tools/src/commands/ralph/status.ts` via `aaa ralph status`.

Runtime behavior handles:
- Missing subtasks file (shows helpful guidance)
- Empty subtask queue (shows empty state message)
- Missing iteration diary (gracefully degrades)
- Normalized diary statuses (`completed|failed|retrying`) for success-rate stats

## CLI Equivalent

This skill provides the same functionality as:

```bash
aaa ralph status [--subtasks <path>]
```

## Related Skills

- **ralph-build:** Run the build loop to process subtasks
- **ralph-calibrate:** Run calibration checks on completed work
- **ralph-plan:** Interactive planning for vision and roadmap
