# Subtask Generation from Hierarchy

You are an orchestrator that generates subtasks for tasks in the planning hierarchy using parallel subagents.

## Hierarchy Sources

This workflow handles two hierarchy-based source types:

### 1. Milestone Source (`--milestone`)
```bash
aaa ralph plan subtasks --milestone 003-ralph-workflow --headless
```
Find all tasks in the milestone and generate subtasks for each.

### 2. Story Source (`--story`)
```bash
aaa ralph plan subtasks --story STORY-001 --headless
```
Find all tasks linked to the story and generate subtasks for each.

## Shared Reference

For subtask schema, size guidelines, ID generation, validation checklist:
→ See @context/workflows/ralph/planning/subtask-spec.md

## Process

### 1. Discover Tasks

**For `--milestone`:**
```
docs/planning/milestones/<milestone>/tasks/*.md
```

**For `--story`:**
1. Find all task files in `docs/planning/milestones/*/tasks/*.md`
2. Filter to tasks that reference the story (look for `Story:` or `storyRef:` in frontmatter/content)

If no tasks found:
- Check if milestone/story path exists
- Report error with helpful message

### 2. Determine Starting Subtask ID

Use milestone-scoped allocation from the target queue file only:
- `docs/planning/milestones/<milestone>/subtasks.json`

1. Extract existing `SUB-NNN` IDs from the target milestone queue
2. Find highest existing number in that file
3. Starting ID = highest + 1 (or 1 if the file is missing/empty)

### 3. Spawn Parallel Subtask Generators

For each task, spawn a subagent to generate subtasks:

```
Use Task tool with subagent_type: "general-purpose"
```

**Critical: Sequential ID Assignment**

To prevent ID collisions, assign ID ranges BEFORE spawning:
1. Count tasks (N)
2. Estimate 3 subtasks per task (conservative)
3. Assign ranges:
   - Task 1: starting_id to starting_id + 2
   - Task 2: starting_id + 3 to starting_id + 5
   - Task 3: starting_id + 6 to starting_id + 8
   - etc.

Each agent receives:
- Task file path
- Starting subtask ID for that task
- Milestone name (for output location)
- Sizing mode from `--size` flag

### 4. Agent Prompt Template

For each task, use the Task tool:

```json
{
  "subagent_type": "general-purpose",
  "prompt": "Generate subtasks for task at: <task-path>\n\nStarting subtask ID: SUB-<N>\nMilestone: <milestone>\nSizing mode: <small|medium|large>\n\nRead the task file, explore the codebase to understand context, and generate subtasks following the schema in context/workflows/ralph/planning/subtask-spec.md.\n\nIMPORTANT OUTPUT INSTRUCTION:\nWrite the subtasks as a bare JSON array to:\n<milestone-dir>/.subtasks-task-<task-num>.json\n\nThe file must contain ONLY a JSON array of subtask objects (no wrapper object).\nDo NOT call appendSubtasksToFile() or saveSubtasksFile(); those are TypeScript functions, not CLI tools.\n\nApply the AC Quality Gate and 4-question vertical slice test from subtask-spec.md.",
  "description": "Generate subtasks for <task-id>"
}
```

### 5. Parallelization Strategy

**Spawn ALL agents in a single message** to maximize parallelism:

```
<invoke Task for task 1>
<invoke Task for task 2>
<invoke Task for task 3>
...
```

Do NOT spawn agents sequentially - that defeats the purpose.

### 5.5. Fragment Merge (automatic)

The CLI automatically merges `.subtasks-task-*.json` fragment files into canonical
`subtasks.json` after subagents finish.

You do **not** need to merge fragments manually in the orchestrator prompt.

### 6. Collect Results

After all agents complete, collect:
- Number of subtasks generated per task
- Any errors or skipped tasks
- Actual subtask IDs used

### 7. Report Summary

```
Subtask Generation Complete

Source: <milestone|story> <name>
Tasks Processed: N
Total Subtasks Generated: M

By Task:
- TASK-001-auth: 3 subtasks (SUB-040 to SUB-042)
- TASK-002-ui: 2 subtasks (SUB-046 to SUB-047)
- TASK-003-api: 4 subtasks (SUB-052 to SUB-055)

Output: docs/planning/milestones/<milestone>/subtasks.json

Ready for: aaa ralph build --subtasks docs/planning/milestones/<milestone>/subtasks.json --headless
```

## Error Handling

If a task fails:
1. Log the error
2. Continue with other tasks
3. Report failed tasks in summary

## ID Gap Tolerance

ID gaps are acceptable:
- Task 1 uses SUB-040 to SUB-042
- Task 2 assigned SUB-046 but only uses SUB-046 and SUB-047
- Task 3 starts at SUB-052

This prevents collisions while accepting minor ID waste.

## Validation

Before spawning agents, verify:
- [ ] Milestone directory exists (for `--milestone`)
- [ ] Story exists and has linked tasks (for `--story`)
- [ ] Tasks directory has .md files
- [ ] Starting ID is calculated correctly from the target milestone queue only

## CLI Invocation

```bash
# From milestone (all tasks in milestone)
aaa ralph plan subtasks --milestone 003-ralph-workflow --headless
aaa ralph plan subtasks --milestone 003-ralph-workflow --supervised

# From story (all tasks for that story)
aaa ralph plan subtasks --story STORY-001-auth --headless
aaa ralph plan subtasks --story STORY-001-auth --supervised

# With sizing
aaa ralph plan subtasks --milestone 003-ralph-workflow --size small --headless
```
