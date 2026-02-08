# Task Generation (Auto Mode)

You are a technical planner generating developer tasks from an existing story. This is a **single-shot, auto-generation prompt** - you will read the story, analyze the codebase, and produce task files without human interaction.

## Story Parameter

**Input:** Story reference as the first argument to this prompt.

**Usage:**
```
tasks-auto.md <story-ref>
```

**Examples:**
```bash
# Generate tasks for story 001-STORY-auth
tasks-auto.md 001-STORY-auth

# Generate tasks for story 003-STORY-inline-errors
tasks-auto.md 003-STORY-inline-errors
```

**Parameter Handling:**
1. The story reference is provided as the argument when invoking this prompt
2. If no argument is provided, stop and ask: "Which story should I generate tasks for? Please provide the story reference (e.g., `001-STORY-auth`)."
3. Find the story file in `docs/planning/milestones/*/stories/<story-ref>.md`
4. If the story is not found, report an error and list available stories

Generate tasks ONLY for the specified story.

## Required Reading

1. **Parent Story**: Read the story file at `docs/planning/milestones/*/stories/<story-ref>.md`
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

## Documentation Context

@context/workflows/ralph/planning/task-doc-lookup.md

Follow the doc lookup workflow for each task. In auto mode, spawn subagent for missing docs and flag `[REVIEW]`.

**Component reference:** The doc lookup process is part of the tiered doc-analysis system. See @context/workflows/ralph/components/doc-analysis.md for T1 (index lookup) and T2 (gap creation) patterns used here.

## Your Task

Generate task files in `docs/planning/milestones/<milestone>/tasks/` that translate the story's acceptance criteria into concrete development work.

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
| Story | **Yes*** | Link to parent story - maintains traceability |
| Goal | Yes | One sentence outcome - "what's true when done?" |
| Context | Yes | The why: problem, trigger, constraints, links |
| Plan | Yes | Numbered steps - concrete actions |
| Acceptance Criteria | Yes | Checkboxes - how we verify success |
| Test Plan | Yes | What tests to add/update/run |
| Scope | Yes | Explicit boundaries - prevents creep |
| Notes | No | Catch-all for extras (risks, edge cases, rollback, etc.) |
| Related Documentation | No | Links to @context docs; note gaps |

**\*Story Requirement:** While VISION.md allows orphan Tasks for tech-only work (no parent Story), this prompt generates tasks FROM stories. Therefore, the Story reference is **required** here to maintain the parent-child relationship and traceability chain (Story → Task).

**Note:** The Notes section MUST always be included in generated tasks (even if content is minimal) to provide a consistent structure and capture any relevant technical considerations, risks, or edge cases.

### Task File Structure

This structure matches @context/blocks/docs/task-template.md exactly:

```markdown
## Task: [Short descriptive name]

**Story:** [001-STORY-auth](../stories/001-STORY-auth.md) *(required - links to parent story)*

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

### Related Documentation
- @context/blocks/... *(relevant docs from lookup)*
- **Gap:** [topic] - created by subagent `[REVIEW]`
```

## Task Number Generation

Task files use folder-local numbering in the destination milestone tasks directory.

To generate the next number:

1. Scan `docs/planning/milestones/<milestone>/tasks/`
2. Extract `<NNN>` from existing `<NNN>-TASK-<slug>.md` filenames
3. Find the highest number in that folder
4. Use next number (`max + 1`, zero-padded to 3 digits)

If no task files exist in that milestone folder, start with `001`.

## File Naming Convention

Task files should be named using the task ID plus a slug:
```
<NNN>-TASK-<slug>.md
```

Where:
- `<NNN>` is the folder-local task number (as generated above)
- `<slug>` is a kebab-case description of the task

**Examples:**
- `001-TASK-setup-auth-api.md`
- `002-TASK-implement-login-form.md`
- `003-TASK-add-auth-tests.md`

## Output Location

If the story is at `docs/planning/milestones/<milestone>/stories/<story>.md`, write tasks to:
```
docs/planning/milestones/<milestone>/tasks/
```

Create the directory if it doesn't exist. Use milestone-first placement by default.

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
- Plan has concrete, actionable steps with **technical how descriptions**
- Acceptance criteria are testable
- Scope explicitly excludes adjacent work
- Context links back to parent story

### Technical How Descriptions

The Plan section must include **technical implementation details** - not just "what" to do, but "how" to do it technically:

**Bad (too vague):**
```
1. Add user validation
2. Implement error handling
3. Add tests
```

**Good (technical how):**
```
1. Add Zod schema for `CreateUserInput` with email format validation and password strength rules in `src/schemas/user.ts`
2. Create `validateUser()` function using the schema, returning `Result<User, ValidationError>` pattern
3. Add unit tests in `src/schemas/__tests__/user.test.ts` covering: valid input, invalid email, weak password
```

Technical details to include:
- **Specific file paths** - Where code goes
- **Function/class names** - What to create
- **Data types/interfaces** - What shapes to use
- **Patterns to follow** - Which existing code to reference
- **Library usage** - What packages/modules to import

### What NOT to Include

- Implementation details in Goal (those go in Plan)
- Time estimates
- Multiple unrelated outcomes
- Vague steps like "implement feature"

## Testing & Verification

@context/workflows/ralph/planning/components/testing-guidance.md

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
- [ ] File names follow `<NNN>-TASK-<slug>.md` convention
- [ ] All tasks reference the parent story

## Execution

1. Parse the story ID from the argument
2. Find and read the parent story file in `docs/planning/milestones/<milestone>/stories/`
3. Set output directory to `docs/planning/milestones/<milestone>/tasks/`
4. Read @context/blocks/docs/task-template.md
5. Analyze the codebase for relevant patterns and context
6. Scan the destination milestone `tasks/` directory for the highest existing `<NNN>`
7. Break down story acceptance criteria into tasks
8. Generate task files following the template
9. Create task files in the determined output directory
10. Update the parent story's Tasks section with links

## Output

After creating tasks, summarize what you created:

```
Created N tasks for story '<story-ref>':
1. 001-TASK-<slug>: <brief description>
2. 002-TASK-<slug>: <brief description>
...

Files created in: docs/planning/milestones/<milestone>/tasks/

Parent story updated: <story-path>
```
