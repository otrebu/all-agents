## Task: Create ralph-iteration.md prompt

**Story:** [autonomous-code-implementation](../stories/001-autonomous-code-implementation.md)

### Goal
A complete prompt file exists at `context/workflows/ralph/building/ralph-iteration.md` that guides the autonomous agent through a single subtask implementation cycle.

### Context
The ralph-iteration.md prompt is the heart of the autonomous development loop. Each "Ralph Iteration" is a memoryless agent session that picks one subtask, implements it, validates via backpressure (build/lint/test), and commits. The prompt must guide the agent through the full cycle: Orient → Select → Investigate → Implement → Validate → Commit. This is a P1 priority as it's required for the core build loop.

### Plan
1. Create directory structure `context/workflows/ralph/building/` if not exists
2. Create `ralph-iteration.md` with the following sections:
   - **Orient phase**: Read CLAUDE.md, git status, PROGRESS.md, and subtasks.json
   - **Select phase**: Pick next subtask using judgment (not rigid sequential)
   - **Investigate phase**: Read `filesToRead` from subtask, verify not already implemented
   - **Implement phase**: Follow subtask acceptance criteria and best practices
   - **Validate phase**: Run build, lint, typecheck, tests; verify acceptance criteria
   - **Commit phase**: Commit with subtask ID, update subtasks.json, append to PROGRESS.md
3. Include file path references using `@path` syntax (e.g., `@docs/planning/VISION.md`)
4. Document the "no internal retries" principle - failed validation consumes one iteration

### Acceptance Criteria
- [ ] Prompt file exists at `context/workflows/ralph/building/ralph-iteration.md`
- [ ] Prompt instructs agent to read CLAUDE.md, git status, progress file, and subtasks.json
- [ ] Prompt instructs agent to select next subtask using judgment
- [ ] Prompt instructs agent to read `filesToRead` from subtask definition
- [ ] Prompt includes validation steps: build, lint, typecheck, tests
- [ ] Prompt instructs commit with subtask ID reference
- [ ] Prompt instructs updating subtasks.json with `done: true`, `completedAt`, `commitHash`, `sessionId`
- [ ] Prompt instructs appending to PROGRESS.md with standard format
- [ ] Prompt uses `@path` references (no templating engine needed)

### Test Plan
- [ ] Verify prompt file can be read by Claude Code (no syntax errors in references)
- [ ] Manually run `ralph build --print` and verify prompt includes correct context
- [ ] Test one iteration with manual subtasks.json to validate full cycle works

### Scope
- **In:** The ralph-iteration.md prompt file, Orient/Select/Investigate/Implement/Validate/Commit phases
- **Out:** The build.sh script that orchestrates iterations, iteration-summary.md hook prompt, pre-build-validation.md prompt

### Notes
- Reference: VISION.md section 3.2 (Building Mode) and 8.1 (Prompts Location)
- Each iteration is memoryless - prompt must be self-contained
- No `{{VAR}}` templating - use `@path` references resolved by Claude Code
- Safety via `--dangerously-skip-permissions` with validation gates
- PROGRESS.md format is append-only markdown with date, subtask ID, problem, changes, files, acceptance criteria
