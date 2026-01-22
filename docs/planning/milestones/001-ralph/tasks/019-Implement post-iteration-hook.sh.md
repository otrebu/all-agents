## Task: Implement post-iteration-hook.sh

**Story:** [hooks-and-notifications](../stories/006-hooks-and-notifications.md)

### Goal
A bash script exists that runs after each iteration, generating summaries, logging to the iteration diary, and triggering configured actions (log, notify, pause).

### Context
Ralph builds need human-on-the-loop checkpoints. The post-iteration hook is invoked after each subtask attempt to capture what happened, write to the iteration diary, and execute actions configured in `ralph.config.json`. This enables developers to walk away from builds while staying informed.

### Plan
1. Create `scripts/post-iteration-hook.sh` script
2. Parse hook configuration from `ralph.config.json`
3. Generate summary using iteration-summary.md prompt with Haiku
4. Append entry to `logs/iterations.jsonl` with required fields
5. Execute configured actions based on hook type:
   - `onIterationComplete` - after each subtask attempt
   - `onMilestoneComplete` - when all subtasks done
   - `onValidationFail` - when build/lint/test fails
   - `onMaxIterationsExceeded` - when iteration limit hit
6. Implement action handlers: `log`, `notify` (ntfy), `pause`
7. For `pause` action: display trigger reason and prompt for continue/abort

### Acceptance Criteria
- [ ] Script reads hook config from `ralph.config.json`
- [ ] Calls Haiku with iteration-summary.md prompt to generate summary
- [ ] Writes iteration diary entry with: subtaskId, sessionId, status, summary, timestamp, errors, toolCalls count, filesChanged, duration
- [ ] Status field uses enum: completed, failed, or retrying
- [ ] `log` action writes to stdout/logs
- [ ] `notify` action sends HTTP POST to ntfy.sh
- [ ] `pause` action shows trigger reason and offers continue/abort options
- [ ] Script is executable and follows existing Ralph script patterns

### Test Plan
- [ ] Unit test each action handler (log, notify, pause)
- [ ] Integration test: run hook after mock iteration, verify diary entry
- [ ] Test ntfy notification delivery (with test topic)
- [ ] Test pause behavior and user input handling

### Scope
- **In:** Hook script, action handlers, diary writing, ntfy integration, pause UX
- **Out:** Summary prompt (task 018), diary schema (task 020), ralph.config.json template (separate task)

### Notes
- ntfy.sh uses simple HTTP POST: `curl -d "message" ntfy.sh/topic`
- Diary format: JSONL at `logs/iterations.jsonl`
- Reference: VISION.md sections 5 (Hooks & Notifications) and 8.11
