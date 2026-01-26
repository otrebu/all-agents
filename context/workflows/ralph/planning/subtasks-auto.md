# Subtasks Generation (Auto Mode)

You are a technical implementation planner generating subtasks from an existing task. This is a **single-shot, auto-generation prompt** - you will read the task, analyze the codebase deeply, and produce a subtasks.json file without human interaction.

## Shared Reference

For schema, size guidelines, ID generation, validation checklist, and AC quality gate:
@context/workflows/ralph/planning/subtasks-common.md

## Task Parameter

**Input:** Task ID as the first argument to this prompt.

**Usage:**
```
subtasks-auto.md <task-id>
```

**Examples:**
```bash
# Generate subtasks for task 014-review-code-quality
subtasks-auto.md 014-review-code-quality

# Generate subtasks for task 015-timing-instrumentation
subtasks-auto.md 015-timing-instrumentation
```

**Parameter Handling:**
1. The task ID is provided as the argument when invoking this prompt
2. If no argument is provided, stop and ask: "Which task should I generate subtasks for? Please provide the task ID (e.g., `014-review-code-quality`)."
3. Find the task file in `docs/planning/tasks/<task-id>*.md`
4. If the task is not found, report an error and list available tasks

Generate subtasks ONLY for the specified task.

## Required Reading

1. **Parent Task**: Read the task file at `docs/planning/tasks/<task-id>*.md`
2. **Subtasks Schema**: Understand and follow @docs/planning/schemas/subtasks.schema.json
3. **Subtasks Common**: Read @context/workflows/ralph/planning/subtasks-common.md for shared conventions
4. **Parent Story** (if exists): Read the story referenced in the task's `Story:` field

## Deep Codebase Analysis

**CRITICAL:** Before generating subtasks, you MUST perform **deep** codebase analysis to understand the implementation landscape thoroughly. Shallow analysis leads to subtasks that don't reflect reality.

### Why Depth Matters

- **Shallow analysis** produces generic subtasks that miss existing patterns
- **Deep analysis** produces subtasks aligned with actual code structure
- Subtasks derived from real code exploration are more accurately sized
- Implementation surprises decrease when you've explored deeply first

### Depth Requirements

You MUST:
1. **Explore extensively** - Don't stop at the first match; find multiple examples
2. **Read actual code** - Don't just search, read files to understand patterns
3. **Answer key questions** - Use analysis to inform subtask design
4. **Reference real paths** - Every file path in subtasks should be verified to exist

### 1. Explore Existing Implementation Patterns

Explore the codebase **extensively** to find relevant patterns:
```
- Use Glob to find files matching patterns in the task's Plan section
- Use Grep to search for related code, interfaces, and types
- Read key files to understand existing implementations
```

### 2. Answer Deep Analysis Questions

Before generating subtasks, answer these questions **based on code exploration**:
- What files need to be created vs modified?
- What existing patterns should be followed?
- What dependencies exist that affect implementation order?
- What test patterns are used in this codebase?
- What validation/build steps are standard?

### 3. Derive Implementation Approach from Deep Code Understanding

The subtasks you generate must be **directly informed** by what you discovered:
- Reference specific files that exist
- Follow naming conventions found in the codebase
- Match existing test patterns
- Use established error handling patterns
- Follow the project's file organization

**Example Deep Analysis:**
```
For a task about adding a new CLI command:
1. Find existing commands: `glob("**/commands/*.ts")`
2. Read a sample command to understand the pattern
3. Find test files: `glob("**/__tests__/commands/*.test.ts")`
4. Read existing tests to understand test patterns
5. Generate subtasks that follow these discovered patterns
```

## Output Format: subtasks.json

Generate a `subtasks.json` file that complies with the schema:

@docs/planning/schemas/subtasks.schema.json

See @context/workflows/ralph/planning/subtasks-common.md for:
- Required and optional fields per subtask
- Example subtask JSON structure
- Size guidelines and classification-based sizing
- ID generation rules
- Validation checklist
- Acceptance criteria quality gate

## Generation Guidelines

### Number of Subtasks per Task

- **Minimum:** 1 subtask (simple tasks may only need one)
- **Maximum:** 8 subtasks (more suggests the task is too large)
- **Typical:** 3-5 subtasks per task

### Subtask Ordering

Order subtasks by implementation dependency:
1. Schema/type definitions first
2. Core implementation second
3. Integration/wiring third
4. Tests throughout or at end

### What Makes a Good Subtask

- Title is concise and commit-message ready
- Description specifies exact files to create/modify
- Acceptance criteria are verifiable by running tests or inspecting code
- filesToRead provides context without overwhelming

### filesToRead Guidelines

Include files that:
- Define interfaces the subtask will implement
- Show patterns to follow
- Contain types to import
- Have tests to update or extend

Use paths relative to project root:
- `src/services/auth.ts`
- `@context/blocks/docs/api-conventions.md`
- `src/**/*.schema.ts` (globs for exploration)

## Milestone-Level Generation

When generating subtasks for all tasks in a milestone:

**Usage:**
```
subtasks-auto.md --milestone <milestone-name>
```

**Behavior:**
1. Find all tasks in `docs/planning/tasks/` that reference stories in the milestone
2. Generate subtasks for each task
3. Combine into a single subtasks.json with appropriate metadata

Metadata for milestone-level generation:
```json
{
  "metadata": {
    "scope": "milestone",
    "milestoneRef": "mvp"
  }
}
```

## Output Location

The subtasks.json file goes in:
```
docs/planning/milestones/<milestone>/subtasks.json
```

If working on a single task without milestone context:
```
docs/planning/subtasks.json
```

## Execution

1. Parse the task ID from the argument
2. Find and read the parent task file
3. Read the parent story if one is referenced
4. Read @docs/planning/schemas/subtasks.schema.json
5. **Deep codebase analysis** - Explore relevant code and patterns
6. Break down task into properly-sized subtasks
7. Generate subtasks.json following the schema
8. Validate JSON against schema
9. Write subtasks.json to output location

## Output

After creating subtasks, summarize what you created:

```
Created N subtasks for task '<task-id>':
1. SUB-001: <title>
2. SUB-002: <title>
...

File created: docs/planning/milestones/<milestone>/subtasks.json

Ready for: ralph build --subtasks <path>
```
