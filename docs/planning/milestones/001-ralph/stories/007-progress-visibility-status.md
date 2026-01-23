## Story: Progress Visibility & Status

### Narrative
As a developer monitoring autonomous builds, I want clear visibility into progress and iteration history so that I can understand what's happening without reading code diffs.

### Persona
A developer who has kicked off a Ralph build and wants to check in periodically. They don't want to watch a terminal - they want a quick status check that shows what's done, what failed, and what's next.

### Context
Ralph operates autonomously, so visibility is crucial. Status command reads from subtasks.json (queue state), PROGRESS.md (narrative history), and iteration diary (machine-readable stats).

### Acceptance Criteria
- [ ] User can check status: `aaa ralph status`
- [ ] Output shows:
  - Current milestone and subtask counts (done/total)
  - Last completed subtask with timestamp
  - Next subtask in queue
  - Config status (found/not found)
- [ ] Status reads iteration diary for recent activity
- [ ] Shows success rate and average tool calls (from diary)
- [ ] Works even with no subtasks (graceful empty state)
- [ ] Skill equivalent: /ralph status

### Tasks
- [ ] [TASK-008: Implement status.sh script](../tasks/008-Implement status.sh script.md)
- [ ] [TASK-017: Create ralph-status SKILL.md](../tasks/017-Create ralph-status SKILL.md)
- [ ] [TASK-025: Implement ralph status CLI command](../tasks/025-Implement ralph status CLI command.md)

### Notes
- PROGRESS.md is append-only markdown (human-readable history)
- Iteration diary is `logs/iterations.jsonl` (machine-readable)
- Status command is read-only, no side effects
- Reference: VISION.md sections 3.2 (Progress file), 5 (Hooks), 8.2 (Status output)
