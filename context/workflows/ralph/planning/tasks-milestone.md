# Task Generation: Milestone Mode (Auto)

You are an orchestrator that generates tasks for ALL stories in a milestone using parallel subagents.

## Milestone Parameter

**Input:** Milestone name as argument (e.g., `ralph`, `core-infrastructure`)

**Usage:**
```
aaa ralph plan tasks --milestone <name> --supervised
```

## Required Reading

Before starting, read these documents:

1. **Task Template**: @context/blocks/docs/task-template.md
2. **Doc Lookup Process**: @context/workflows/ralph/planning/task-doc-lookup.md

## Process

### 1. Discover Stories

Find all story files for the milestone:

```
docs/planning/milestones/<milestone>/stories/*.md
```

If no stories found:
- Check if milestone directory exists in `docs/planning/milestones/`
- Report error with available milestones if not found

### 2. Codebase Analysis

Before generating tasks, analyze the codebase for context:

1. **Explore relevant directories** - Use Glob/Grep to understand existing patterns
2. **Read related files** - Understand current implementations
3. **Identify dependencies** - What existing code will tasks interact with?
4. **Note conventions** - File naming, code style, test patterns

This analysis informs the task generation and ensures generated tasks reference real code.

### 3. Documentation Context

Follow the doc lookup workflow:

@context/workflows/ralph/planning/task-doc-lookup.md

Search for relevant atomic docs that apply to the milestone's domain. Pass these to the task-generator agents so they can include them in generated tasks.

### 4. Determine Starting Task ID

Use milestone-first, folder-local numbering:

1. Scan `docs/planning/milestones/<milestone>/tasks/` only
2. Extract `<NNN>` from filenames matching `<NNN>-TASK-<slug>.md`
3. Starting ID = highest + 1 in that milestone folder (or 1 if no tasks exist)

### 5. Spawn Parallel Task Generators

For each story, spawn a `task-generator` subagent:

```
Use Task tool with subagent_type: "task-generator"
```

**Critical: Sequential ID Assignment**

To prevent ID collisions, assign ID ranges BEFORE spawning:
1. Count stories (N)
2. Estimate 5 tasks per story (conservative)
3. Assign ranges:
   - Story 1: starting_id to starting_id + 4
   - Story 2: starting_id + 5 to starting_id + 9
   - Story 3: starting_id + 10 to starting_id + 14
   - etc.

Each agent receives:
- Story path
- Starting task ID for that story
- **Milestone slug** (critical for output path)

### 6. Collect Results

After all agents complete, collect:
- Number of tasks generated per story
- Any errors or skipped stories
- Actual task IDs used

### 7. Report Summary

```
Task Generation Complete for Milestone: <milestone>

Stories Processed: N
Total Tasks Generated: M

By Story:
- STORY-001-auth: 3 tasks (TASK-001 to TASK-003)
- STORY-002-dashboard: 2 tasks (TASK-006 to TASK-007)
- STORY-003-export: 4 tasks (TASK-011 to TASK-014)

Files created in: docs/planning/milestones/<milestone>/tasks/
```

## Agent Invocation Template

For each story, use the Task tool:

```json
{
  "subagent_type": "task-generator",
  "prompt": "Generate tasks for story at: docs/planning/milestones/<milestone>/stories/<story-file>.md\n\nMilestone: <milestone>\nStarting task ID: <N>\n\nOutput path: docs/planning/milestones/<milestone>/tasks/\n\nFollow the task-generator agent instructions to analyze the story, explore the codebase, and generate task files.",
  "description": "Generate tasks for <story-id>"
}
```

**IMPORTANT:** Include the milestone slug and output path in the prompt so the agent writes tasks to the correct location.

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
- [ ] Milestone directory exists (`docs/planning/milestones/<milestone>/`)
- [ ] Stories directory has .md files
- [ ] Tasks directory exists or can be created (`docs/planning/milestones/<milestone>/tasks/`)
- [ ] Starting ID is calculated correctly from milestone task files only
