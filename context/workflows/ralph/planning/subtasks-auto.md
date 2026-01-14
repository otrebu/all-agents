# Subtasks Generation (Auto Mode)

You are a technical implementation planner generating subtasks from an existing task. This is a **single-shot, auto-generation prompt** - you will read the task, analyze the codebase deeply, and produce a subtasks.json file without human interaction.

## Task Parameter

**Input:** Task ID as the first argument to this prompt.

**Usage:**
```
subtasks-auto.md <task-id>
```

**Examples:**
```bash
# Generate subtasks for task TASK-001
subtasks-auto.md TASK-001

# Generate subtasks for task TASK-015
subtasks-auto.md TASK-015
```

**Parameter Handling:**
1. The task ID is provided as the argument when invoking this prompt
2. If no argument is provided, stop and ask: "Which task should I generate subtasks for? Please provide the task ID (e.g., `TASK-001`)."
3. Find the task file in `docs/planning/tasks/<task-id>*.md`
4. If the task is not found, report an error and list available tasks

Generate subtasks ONLY for the specified task.

## Required Reading

1. **Parent Task**: Read the task file at `docs/planning/tasks/<task-id>*.md`
2. **Subtasks Schema**: Understand and follow @docs/planning/schemas/subtasks.schema.json
3. **Parent Story** (if exists): Read the story referenced in the task's `Story:` field

## Deep Codebase Analysis

**CRITICAL:** Before generating subtasks, you MUST perform deep codebase analysis to understand:

### 1. Existing Implementation Patterns

Explore the codebase to find relevant patterns:
```
- Use Glob to find files matching patterns in the task's Plan section
- Use Grep to search for related code, interfaces, and types
- Read key files to understand existing implementations
```

### 2. Analysis Questions to Answer

Before generating subtasks, answer:
- What files need to be created vs modified?
- What existing patterns should be followed?
- What dependencies exist that affect implementation order?
- What test patterns are used in this codebase?
- What validation/build steps are standard?

### 3. Derive Implementation Approach from Code

The subtasks you generate must be informed by what you learn:
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

### Required Fields Per Subtask

Each subtask MUST have these fields:

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique ID: `SUB-NNN` pattern (e.g., `SUB-001`) |
| `taskRef` | string | Parent task reference: `TASK-NNN` pattern |
| `title` | string | Short title (max 100 chars) for commits and tracking |
| `description` | string | Detailed description of what to implement |
| `done` | boolean | Always `false` for new subtasks |
| `acceptanceCriteria` | string[] | How to verify subtask is complete |
| `filesToRead` | string[] | Files to read before implementing |

### Optional Fields

| Field | Type | Description |
|-------|------|-------------|
| `storyRef` | string | Grandparent story reference if task has one |

### Subtasks Schema Structure

```json
{
  "$schema": "../schemas/subtasks.schema.json",
  "metadata": {
    "scope": "story",
    "storyRef": "STORY-001"
  },
  "subtasks": [
    {
      "id": "SUB-001",
      "taskRef": "TASK-001",
      "storyRef": "STORY-001",
      "title": "Create user input validation schema",
      "description": "Add Zod schema for CreateUserInput with email and password validation in src/schemas/user.ts",
      "done": false,
      "acceptanceCriteria": [
        "Zod schema exists in src/schemas/user.ts",
        "Email format is validated",
        "Password strength rules are enforced"
      ],
      "filesToRead": [
        "src/schemas/auth.ts",
        "src/types/user.ts"
      ]
    }
  ]
}
```

## Subtask Sizing Constraints

**CRITICAL:** Each subtask must fit within a single context window iteration.

### Size Guidelines

A properly-sized subtask allows the agent to:
1. **Initialize** - Read context files (CLAUDE.md, task, etc.)
2. **Gather** - Read filesToRead and explore related code
3. **Implement** - Write the code changes
4. **Test** - Run tests and fix issues
5. **Commit** - Make a clean commit

All of this must fit in one context window.

### Subtask Scope Rules

Each subtask should:
- **Touch 1-3 files** (not counting test files)
- **Implement one clear concept**
- **Be completable in 15-30 tool calls**
- **Have 2-5 acceptance criteria**

### Signs a Subtask is Too Large

- Description mentions multiple unrelated changes
- Acceptance criteria span different areas of the codebase
- Implementation requires extensive exploration
- Would result in commits touching 5+ files

### Signs a Subtask is Too Small

- Could be a single line change
- Trivially merged with another subtask
- Creates overhead without value

## Generating Unique IDs

To generate subtask IDs:

1. **Scan existing subtasks** - Check all `subtasks.json` files in the project
2. **Find highest SUB-NNN** - Determine the maximum number used
3. **Increment** - New IDs start at max + 1, zero-padded to 3 digits

If no subtasks exist, start with `SUB-001`.

**IDs are globally unique** across all subtasks in the project.

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

## Validation Checklist

Before finalizing subtasks, verify:

- [ ] Each subtask has all required fields (id, taskRef, title, description, done, acceptanceCriteria, filesToRead)
- [ ] All IDs follow SUB-NNN pattern
- [ ] taskRef matches the input task ID
- [ ] storyRef is included if task has a parent story
- [ ] Subtasks are sized to fit single context window
- [ ] Acceptance criteria are concrete and verifiable
- [ ] filesToRead contains relevant context files
- [ ] Output is valid JSON matching the schema

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
