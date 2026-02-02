# Task Generation from Alternative Sources

You are a technical planner generating tasks from arbitrary input. Unlike `tasks-auto.md` which requires a story, this workflow accepts **alternative sources**: files or text descriptions.

## Input Sources

This workflow supports two input types:

### 1. File Path (`--file`)
```bash
aaa ralph plan tasks --file ./spec.md
aaa ralph plan tasks --file ./requirements.txt
```
If the source is a file path, read and parse that file.

### 2. Text Description (`--text`)
```bash
aaa ralph plan tasks --text "Add user authentication"
aaa ralph plan tasks --text "Fix the login flow bugs"
```
If the source is text, treat it as a direct description.

## Required Reading

1. **Task Template**: Read and follow @context/blocks/docs/task-template.md

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

## Process

### Phase 1: Parse Input

**For file input:**
1. Read the file content
2. Identify actionable items (requirements, features, bug fixes)
3. Extract title, description, and context for each item

**For text input:**
1. Parse the description as an actionable item
2. If it contains multiple items (separated by newlines or semicolons), split them

### Phase 2: Extract Requirements

From the parsed input, identify:
1. **Features/Capabilities** - What functionality is needed
2. **Technical Requirements** - Specific implementation needs
3. **Constraints** - Any limitations or boundaries mentioned
4. **Context** - Why this work is needed

### Phase 3: Generate Tasks

For each actionable item, generate a task following the template in @context/blocks/docs/task-template.md.

**Task format differences from story-based tasks:**
- **Story field**: Optional - use `N/A (source-based task)` if no story exists
- **Context**: Reference the source file/text instead of a story

### Phase 4: Task ID Generation

Each task MUST have a unique ID. Scan existing tasks in **ALL locations**:
- `docs/planning/tasks/` (global/legacy)
- `docs/planning/milestones/*/tasks/` (milestone-scoped)

Extract all TASK-NNN patterns, find highest number, increment.

### Phase 5: Output

Write tasks to `docs/planning/tasks/` (default location for orphan tasks).

## Task Template

Tasks must follow @context/blocks/docs/task-template.md exactly:

```markdown
## Task: [Short descriptive name]

**Story:** N/A (source-based task) *(or link if applicable)*

### Goal
[One sentence: what should be true when this is done?]

### Context
[Why this matters. Reference source file/text. Include:
- Current state / problem description
- What triggered this work
- Any constraints or dependencies]

### Plan
1. [First concrete action with technical details]
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
[Optional: Technical considerations, risks, edge cases]

### Related Documentation
- @context/blocks/... *(relevant docs)*
```

## Generation Guidelines

### Number of Tasks

- **Minimum:** 1 task per actionable item
- **Maximum:** 5 tasks per source (more suggests source is too broad)
- **Typical:** 2-3 tasks per source

### Task Scope

Each task should:
1. **Be completable in one session** - A few hours of focused work
2. **Have a clear outcome** - Verifiable via tests or demos
3. **Be independently committable** - Can be merged on its own

### Technical How Descriptions

The Plan section must include **technical implementation details**:

**Good example:**
```
1. Add Zod schema for `CreateUserInput` with email format validation in `src/schemas/user.ts`
2. Create `validateUser()` function using the schema, returning `Result<User, ValidationError>`
3. Add unit tests in `src/schemas/__tests__/user.test.ts`
```

## Validation Checklist

Before finalizing tasks, verify:

- [ ] Each source item is covered by at least one task
- [ ] Each task has ALL required sections
- [ ] Task format matches the template exactly
- [ ] Goals are one sentence and outcome-focused
- [ ] Plans have numbered, concrete steps
- [ ] Acceptance criteria are testable
- [ ] File names follow TASK-NNN-slug.md convention

## Output Summary

After creating tasks, summarize:

```
Created N tasks from [source type]:
1. TASK-001-<slug>: <brief description>
2. TASK-002-<slug>: <brief description>
...

Files created in: docs/planning/tasks/
Source: [file path or text description]
```

## CLI Invocation

```bash
# From file
aaa ralph plan tasks --file ./spec.md
aaa ralph plan tasks --file ./requirements.md --headless

# From text
aaa ralph plan tasks --text "Add user authentication"
aaa ralph plan tasks --text "Fix login flow" --supervised
```
