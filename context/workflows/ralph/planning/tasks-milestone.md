# Task Generation: Milestone Mode (Auto)

You are an orchestrator that generates tasks for ALL stories in a milestone using parallel subagents.

## Milestone Parameter

**Input:** Milestone name as argument (e.g., `ralph`, `core-infrastructure`)

**Usage:**
```
aaa ralph plan tasks --milestone <name> --auto
```

## Process

### 1. Discover Stories

Find all story files for the milestone:

```
docs/planning/milestones/<milestone>/stories/*.md
```

If no stories found:
- Check if milestone exists in `docs/planning/ROADMAP.md`
- Report error with available milestones if not found

### 2. Determine Starting Task ID

Scan existing tasks in `docs/planning/tasks/`:
1. Extract all TASK-NNN patterns from filenames
2. Find highest existing number
3. Starting ID = highest + 1 (or 1 if no tasks exist)

### 3. Spawn Parallel Task Generators

For each story, spawn a `task-generator` subagent:

```
Use Task tool with subagent_type: "task-generator"
```

**Critical: Sequential ID Assignment**

To prevent ID collisions, assign ID ranges BEFORE spawning:
1. Count stories (N)
2. Estimate 3 tasks per story (conservative)
3. Assign ranges:
   - Story 1: starting_id to starting_id + 4
   - Story 2: starting_id + 5 to starting_id + 9
   - Story 3: starting_id + 10 to starting_id + 14
   - etc.

Each agent receives:
- Story path
- Starting task ID for that story

### 4. Collect Results

After all agents complete, collect:
- Number of tasks generated per story
- Any errors or skipped stories
- Actual task IDs used

### 5. Report Summary

```
Task Generation Complete for Milestone: <milestone>

Stories Processed: N
Total Tasks Generated: M

By Story:
- STORY-001-auth: 3 tasks (TASK-001 to TASK-003)
- STORY-002-dashboard: 2 tasks (TASK-006 to TASK-007)
- STORY-003-export: 4 tasks (TASK-011 to TASK-014)

Files created in: docs/planning/tasks/
```

## Agent Invocation Template

For each story, use the Task tool:

```json
{
  "subagent_type": "task-generator",
  "prompt": "Generate tasks for story at: docs/planning/milestones/<milestone>/stories/<story-file>.md\n\nStarting task ID: <N>\n\nFollow the task-generator agent instructions to analyze the story, explore the codebase, and generate task files.",
  "description": "Generate tasks for <story-id>"
}
```

## Parallelization Strategy

**Spawn ALL agents in a single message** to maximize parallelism:

```
<invoke Task for story 1>
<invoke Task for story 2>
<invoke Task for story 3>
...
```

Do NOT spawn agents sequentially - that defeats the purpose.

## Error Handling

If a story fails:
1. Log the error
2. Continue with other stories
3. Report failed stories in summary

## ID Gap Tolerance

ID gaps are acceptable:
- Story 1 uses TASK-001 to TASK-003
- Story 2 assigned TASK-006 but only uses TASK-006 and TASK-007
- Story 3 starts at TASK-011

This prevents collisions while accepting minor ID waste.

## Validation

Before spawning agents, verify:
- [ ] Milestone exists and has stories
- [ ] Stories directory has .md files
- [ ] Tasks directory exists or can be created
- [ ] Starting ID is calculated correctly
