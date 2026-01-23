## Story: Autonomous Code Implementation

### Narrative
As a developer with a defined work queue (subtasks.json), I want AI to autonomously implement each subtask with proper validation so that I can focus on oversight rather than writing code.

### Persona
A developer who embraces "humans on the loop, not in it" philosophy. They design specs and engineer backpressure (tests, linting) while autonomous agents do the implementation. They want visibility into progress without micromanaging.

### Context
This is the core "Ralph Iteration" loop - the heart of autonomous development. Each iteration is memoryless (fresh context), picks one subtask, implements it, validates with backpressure (build/lint/test), and commits. The queue is defined in subtasks.json.

### Acceptance Criteria
- [ ] User can run build mode: `aaa ralph build --subtasks <path>`
- [ ] Each iteration: Orient → Select → Investigate → Implement → Validate → Commit
- [ ] Agent reads CLAUDE.md, git status, progress file, and subtasks.json on each iteration
- [ ] Agent selects next subtask using judgment (not rigid sequential)
- [ ] Agent reads `filesToRead` from subtask definition before implementing
- [ ] Validation runs: build, lint, typecheck, tests must pass
- [ ] On success: commits with subtask ID, appends to PROGRESS.md
- [ ] Iterations are memoryless - each is a new agent session
- [ ] Interactive mode (`-i`) pauses between iterations for review
- [ ] `--max-iterations <n>` limits retries per subtask
- [ ] User can run build mode via skill: `/ralph build`
- [ ] Optional pre-build validation: `aaa ralph build --validate-first`
- [ ] Print mode outputs iteration prompt without execution: `-p, --print`
- [ ] On success, subtasks.json updated with completion fields: `done: true`, `completedAt`, `commitHash`, `sessionId`
- [ ] When max iterations exceeded, triggers `onMaxIterationsExceeded` hook
- [ ] Subtask's own acceptance criteria verified during validation

### Tasks
- [ ] [TASK-003: Create ralph-iteration.md prompt](../tasks/003-Create%20ralph-iteration.md%20prompt.md)
- [ ] [TASK-005: Implement build.sh script](../tasks/005-Implement%20build.sh%20script.md)
- [ ] [TASK-006: Create pre-build-validation.md prompt](../tasks/006-Create%20pre-build-validation.md%20prompt.md)
- [ ] [TASK-009: Create ralph-build SKILL.md](../tasks/009-Create%20ralph-build%20SKILL.md.md)

### Notes
- Uses `--dangerously-skip-permissions` for autonomous execution
- Safety via iteration boundaries, validation gates, and git rollback
- No internal retries - failed validation consumes one iteration
- Reference: VISION.md section 3.2 (Building Mode) and 8.5-8.10
