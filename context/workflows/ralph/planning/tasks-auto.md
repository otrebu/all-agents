# Task Generation (Auto Mode)

You are a technical planner generating developer tasks from an existing story. This is a **single-shot, auto-generation prompt** - you will read the story, analyze the codebase, and produce task files without human interaction.

## Story Parameter

**Input:** Story ID as the first argument to this prompt.

**Usage:**
```
tasks-auto.md <story-id>
```

**Examples:**
```bash
# Generate tasks for story STORY-001-auth
tasks-auto.md STORY-001-auth

# Generate tasks for story STORY-003-inline-errors
tasks-auto.md STORY-003-inline-errors
```

**Parameter Handling:**
1. The story ID is provided as the argument when invoking this prompt
2. If no argument is provided, stop and ask: "Which story should I generate tasks for? Please provide the story ID (e.g., `STORY-001-auth`)."
3. Find the story file in `docs/planning/milestones/*/stories/<story-id>.md`
4. If the story is not found, report an error and list available stories

Generate tasks ONLY for the specified story.

## Required Reading

1. **Parent Story**: Read the story file at `docs/planning/milestones/*/stories/<story-id>.md`
2. **Task Template**: Read and follow @context/blocks/docs/task-template.md

## Codebase Analysis

Before generating tasks, analyze the codebase to inform task generation:

1. **Explore relevant directories** - Use Glob/Grep to understand existing patterns
2. **Read related files** - Understand current implementations
3. **Identify dependencies** - What existing code will tasks interact with?
4. **Note conventions** - File naming, code style, existing patterns

This analysis informs:
- What files need to be created vs modified
- What patterns to follow
- What dependencies exist
- What test patterns are in use

## Your Task

Generate task files in `docs/planning/tasks/` that translate the story's acceptance criteria into concrete development work.

## Input Analysis

From the parent story, extract:
1. **Narrative** - The user goal this task supports
2. **Acceptance Criteria** - User-visible outcomes to achieve
3. **Context** - Business driver and constraints
4. **Persona** - Who benefits from this work

## Task Template Format

Read and follow the task template:

@context/blocks/docs/task-template.md

**IMPORTANT:** Generated tasks MUST comply exactly with the template above.

### Required Sections

The task template defines these sections (matching @context/blocks/docs/task-template.md exactly):

| Section | Required | Purpose |
|---------|----------|---------|
| Story | No | Link to parent story (if this task implements a story) |
| Goal | Yes | One sentence outcome - "what's true when done?" |
| Context | Yes | The why: problem, trigger, constraints, links |
| Plan | Yes | Numbered steps - concrete actions |
| Acceptance Criteria | Yes | Checkboxes - how we verify success |
| Test Plan | Yes | What tests to add/update/run |
| Scope | Yes | Explicit boundaries - prevents creep |
| Notes | No | Catch-all for extras (risks, edge cases, rollback, etc.) |

**Note:** Since this prompt generates tasks FROM stories, the Story link SHOULD always be included to maintain traceability, even though the template marks it as optional.

**Note:** The Notes section MUST always be included in generated tasks (even if content is minimal) to provide a consistent structure and capture any relevant technical considerations, risks, or edge cases.

### Task File Structure

This structure matches @context/blocks/docs/task-template.md exactly:

```markdown
## Task: [Short descriptive name]

**Story:** [STORY-001-auth](../stories/STORY-001-auth.md) *(optional)*

### Goal
[One sentence: what should be true when this is done?]

### Context
[Why this matters. Link to ticket/spec if exists. Include:
- Current state / problem description
- What triggered this work
- Any constraints or dependencies]

### Plan
1. [First concrete action]
2. [Second action]
3. [Continue as needed]

### Acceptance Criteria
- [ ] [Specific, testable outcome]
- [ ] [Another outcome]

### Test Plan
- [ ] [What tests to add/run]
- [ ] [Manual verification if needed]

### Scope
- **In:** [What this includes]
- **Out:** [What this explicitly excludes]

### Notes
[Optional: Technical considerations, risks, edge cases, investigation findings, rollback plan - whatever's relevant to THIS task]
```

## File Naming Convention

Task files should be named:
```
TASK-<NNN>-<slug>.md
```

Where:
- `<NNN>` is a zero-padded sequence number (001, 002, 003...)
- `<slug>` is a kebab-case description of the task

**Examples:**
- `TASK-001-setup-auth-api.md`
- `TASK-002-implement-login-form.md`
- `TASK-003-add-auth-tests.md`

## Output Location

Tasks go in the tasks folder:
```
docs/planning/tasks/
```

Create the directory if it doesn't exist.

## Generation Guidelines

### Number of Tasks per Story

- **Minimum:** 1 task (a simple story may need only one)
- **Maximum:** 5 tasks (more than this suggests story is too large)
- **Typical:** 2-3 tasks per story

### Task Scope

Each task should:
1. **Be completable in one session** - A few hours of focused work
2. **Have a clear outcome** - Verifiable via tests or demos
3. **Map to acceptance criteria** - Derived from the story's AC
4. **Be independently committable** - Can be merged on its own

### Task Breakdown Strategy

When breaking down a story into tasks, consider:

1. **Vertical slices** - Each task delivers a thin slice of functionality
2. **Test-first tasks** - Consider a task for test setup if complex
3. **Implementation order** - Tasks should be in logical execution order
4. **Dependencies** - Earlier tasks enable later ones

### What Makes a Good Task

- Goal is one clear sentence
- Plan has concrete, actionable steps
- Acceptance criteria are testable
- Scope explicitly excludes adjacent work
- Context links back to parent story

### What NOT to Include

- Implementation details in Goal (those go in Plan)
- Time estimates
- Multiple unrelated outcomes
- Vague steps like "implement feature"

## Codebase Integration

Use information from codebase analysis to:

1. **Reference existing patterns**
   - "Follow pattern in `src/auth/login.ts`"
   - "Use existing `UserService` interface"

2. **Identify affected files**
   - List files to modify in Plan section
   - Note test files to update

3. **Note dependencies**
   - External packages needed
   - Internal modules to import

4. **Match conventions**
   - File naming patterns
   - Test organization
   - Error handling style

## Validation Checklist

Before finalizing tasks, verify:

- [ ] Each story acceptance criterion is covered by at least one task
- [ ] Each task has ALL required sections (Story, Goal, Context, Plan, AC, Test Plan, Scope, Notes)
- [ ] Task format matches the template exactly (section names, order, structure)
- [ ] Goals are one sentence and outcome-focused
- [ ] Plans have numbered, concrete steps
- [ ] Acceptance criteria are testable
- [ ] File names follow TASK-NNN-slug.md convention
- [ ] All tasks reference the parent story

## Execution

1. Parse the story ID from the argument
2. Find and read the parent story file
3. Read @context/blocks/docs/task-template.md
4. Analyze the codebase for relevant patterns and context
5. Break down story acceptance criteria into tasks
6. Generate task files following the template
7. Create task files in `docs/planning/tasks/`
8. Update the parent story's Tasks section with links

## Output

After creating tasks, summarize what you created:

```
Created N tasks for story '<story-id>':
1. TASK-001-<slug>: <brief description>
2. TASK-002-<slug>: <brief description>
...

Files created in: docs/planning/tasks/

Parent story updated: docs/planning/milestones/<milestone>/stories/<story-id>.md
```
