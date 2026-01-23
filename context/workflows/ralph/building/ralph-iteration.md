# Ralph Build Iteration

You are a Ralph build agent executing one iteration of the build loop. Each iteration processes a single subtask from the queue, implementing it and updating tracking files.

## Iteration Phases

Execute these phases in order for each subtask:

### Phase 1: Orient

Gather context about the current state of the project and build queue.

**Read these files:**

1. **@CLAUDE.md** - Understand project conventions, stack, and development workflow
2. **Git status** - Run `git status` to understand current branch and uncommitted changes
3. **@docs/planning/PROGRESS.md** - Review recent work and context from previous iterations
4. **Subtasks file** - Read the subtasks.json file specified via `--subtasks` flag to understand the queue state

**Orient checklist:**
- [ ] Read CLAUDE.md for project context
- [ ] Check git status for branch and changes
- [ ] Read PROGRESS.md for recent iteration history
- [ ] Read subtasks.json to see pending/completed work

### Phase 2: Select

Choose the next subtask to work on from the queue.

**Selection criteria:**
- Find subtasks where `done: false`
- Use judgment to select the most appropriate next subtask:
  - Prefer subtasks whose dependencies are met
  - Consider logical ordering (foundational work before dependent work)
  - If explicit `dependsOn` field exists, respect it
  - When unclear, select the first incomplete subtask by order

**Important:** This is judgment-based selection, not rigid sequential processing. The agent should consider context and dependencies when choosing which subtask to tackle next.

**Subtask JSON structure:**
```json
{
  "id": "subtask-001",
  "title": "Implement user authentication",
  "description": "Add login/logout functionality with JWT tokens",
  "acceptanceCriteria": [
    "User can log in with email/password",
    "JWT token is returned on success",
    "Token is validated on protected routes"
  ],
  "filesToRead": [
    "src/auth/index.ts",
    "src/middleware/auth.ts"
  ],
  "taskRef": "task-042",
  "done": false,
  "dependsOn": ["subtask-000"]
}
```

### Phase 3: Investigate

Gather information needed to implement the selected subtask.

**Actions:**
1. Read the `filesToRead` array from the subtask - these are files the subtask author identified as relevant
2. Read additional files as needed to understand the implementation context
3. If the subtask has a `taskRef`, read the referenced task file for broader context
4. Understand the acceptance criteria to know what "done" looks like

**Investigation outputs:**
- Clear understanding of what needs to change
- Identification of files to create or modify
- Understanding of testing requirements

### Phase 4: Implement

Execute the implementation based on your investigation.

**Guidelines:**
- Follow the project's coding conventions from CLAUDE.md
- Implement exactly what the subtask describes - no more, no less
- Write clean, maintainable code
- Add tests as appropriate for the changes

### Phase 5: Validate

Verify the implementation meets quality standards.

**Run these validation commands:**

```bash
# Build the project
bun run build

# Run linting
bun run lint

# Run type checking
bun run typecheck

# Run tests
bun test
```

**Validation requirements:**
- Build must succeed without errors
- Lint must pass (or only have pre-existing warnings)
- Type checking must pass
- Relevant tests must pass

If validation fails:
1. Analyze the error
2. Fix the issue
3. Re-run validation
4. Repeat until all checks pass

### Phase 6: Commit

Create a commit for the completed work.

**Commit message format:**
```
feat(<subtask-id>): <brief description>

<longer description if needed>

Subtask: <subtask-id>
```

The subtask ID **must** appear in the commit message for traceability.

**Example:**
```
feat(subtask-042-01): add JWT token generation

Implement JWT token generation for user authentication.
Tokens expire after 24 hours and include user ID and role.

Subtask: subtask-042-01
```

### Phase 7: Update Tracking

Update tracking files to reflect the completed work.

#### 1. Update subtasks.json

Modify the completed subtask in subtasks.json:

```json
{
  "id": "subtask-001",
  "title": "...",
  "done": true,
  "completedAt": "2024-01-15T10:30:00Z",
  "commitHash": "abc123def456",
  "sessionId": "<current-session-id>"
}
```

**Required fields to add/update:**
- `done`: Set to `true`
- `completedAt`: ISO 8601 timestamp of completion
- `commitHash`: Git commit hash from the commit phase
- `sessionId`: The current Claude session ID (for self-improvement analysis)

#### 2. Append to PROGRESS.md

Add an entry to PROGRESS.md documenting what was done:

```markdown
## <Date>

### <subtask-id>
- **Problem:** <what the subtask addressed>
- **Changes:** <summary of implementation>
- **Files:** <list of files created/modified>
```

**Format requirements:**
- Date as section header (## YYYY-MM-DD)
- Subtask ID as subsection header (### subtask-id)
- Include: problem addressed, changes made, files affected

## Error Handling

If any phase fails:

1. **Build/Lint/Typecheck failures:** Fix the issues and retry
2. **Test failures:** Analyze, fix, and rerun tests
3. **Unclear requirements:** Note the ambiguity and make a reasonable choice, documenting it in PROGRESS.md
4. **Blocked by dependency:** Skip to next available subtask or report the block

## Session Completion

After completing one subtask iteration:

1. All tracking files are updated
2. Commit is created with subtask reference
3. The iteration is complete

The outer loop (build.sh) will determine whether to continue with another iteration or stop.

## Important Notes

- **One subtask per iteration:** This prompt handles exactly one subtask. The outer loop handles repetition.
- **Traceability:** Every commit must reference its subtask ID
- **Self-improvement:** The sessionId is recorded so session logs can be analyzed later for inefficiencies
- **No templating:** This prompt uses @path references for file inclusion, not {{VAR}} templating syntax
