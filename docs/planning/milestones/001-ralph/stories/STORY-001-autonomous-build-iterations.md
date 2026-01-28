## Story: Autonomous Build Iterations

### Narrative
As a developer embracing "humans on loop", I want Ralph to autonomously implement subtasks from a queue so that I can focus on oversight and design rather than writing code directly.

### Persona
A senior developer or tech lead who values their time for high-level thinking - architecture, system design, and business logic. They're comfortable delegating implementation details to autonomous agents and prefer to review completed work rather than hand-write every line. They trust but verify, expecting each iteration to produce committable, tested code.

### Context
This is the foundational capability of Ralph. Without autonomous iteration, all other features (planning, calibration, review) have no execution layer. The memoryless iteration pattern ensures each build starts fresh with deterministically constructed context, avoiding "context rot" that plagues long-running agent sessions. This aligns with the core philosophy: "Humans on the loop, not in it."

### Acceptance Criteria
- [ ] Agent reads subtasks.json queue and selects next pending subtask
- [ ] Agent implements subtask following acceptance criteria and referenced docs
- [ ] Build, lint, type-check, and tests all pass before commit
- [ ] Agent commits with message referencing subtask ID (e.g., "SUB-001: implement auth endpoint")
- [ ] Agent updates subtasks.json marking task as `done: true`
- [ ] Each iteration is memoryless - fresh agent session with clean context
- [ ] Failed validation prevents commit but does not crash iteration loop

### Tasks
<!-- Tasks will be generated separately via tasks-auto.md -->
- [ ] Tasks to be defined

### Notes
**Key technical requirements:**
- Prompt: `context/workflows/ralph/building/ralph-iteration.md`
- Script: `tools/src/commands/ralph/scripts/build.sh`
- Uses `--dangerously-skip-permissions` for autonomous execution
- Backpressure gates: build/lint/type-check/tests must pass
- Git provides rollback safety (one commit per iteration)

**Risk:** Early iterations may produce low-quality code. Mitigated by validation gates and progress tracking enabling human review between iterations.
