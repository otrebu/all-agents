## Task: Implement status.sh script

**Story:** [progress-visibility-status](../stories/007-progress-visibility-status.md)

### Goal
Create a status.sh script that provides clear visibility into Ralph's autonomous build progress by reading from subtasks.json and the iteration diary.

### Context
Ralph operates autonomously, so developers need visibility without watching terminals. The status command is read-only and aggregates information from multiple sources:
- `subtasks.json` - queue state (done/total counts, current/next subtask)
- `logs/iterations.jsonl` - machine-readable iteration stats (success rate, tool calls)

Note: PROGRESS.md is a separate narrative log for human review but is NOT parsed by the status command. Status focuses on machine-readable data sources.

This enables periodic check-ins to understand what's done, what failed, and what's next.

### Plan
1. Create `status.sh` script at `tools/src/commands/ralph/scripts/status.sh`
2. Implement reading from subtasks.json for queue state
3. Parse iteration diary (logs/iterations.jsonl) for recent activity stats
4. Calculate success rate and average tool calls from diary
5. Format output showing all required status information
6. Handle graceful empty state when no subtasks exist
7. Add config status detection (found/not found)

### Acceptance Criteria
- [ ] Script reads subtasks.json and displays current milestone
- [ ] Shows subtask counts (done/total)
- [ ] Shows last completed subtask with timestamp
- [ ] Shows next subtask in queue
- [ ] Displays config status (found/not found)
- [ ] Reads iteration diary for recent activity
- [ ] Shows success rate (from diary data)
- [ ] Shows average tool calls (from diary data)
- [ ] Works gracefully with no subtasks (empty state)
- [ ] Output is clear and scannable

### Test Plan
- [ ] Test with populated subtasks.json
- [ ] Test with empty subtasks.json (empty state)
- [ ] Test with missing iteration diary
- [ ] Test with various diary entries to verify stats calculation
- [ ] Test config detection (present/absent scenarios)

### Scope
- **In:** status.sh script, reading all data sources, formatted output
- **Out:** Modifying any data files (read-only), skill wrapper (separate task)

### Notes
- Reference VISION.md sections 3.2 (Progress file), 5 (Hooks), 8.2 (Status output)
- Status command must have no side effects
- Consider colorized output for better readability
- Iteration diary format is JSONL (one JSON object per line)
