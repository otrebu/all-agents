## Story: Session Debugging Support

### Narrative
As a developer troubleshooting Ralph iterations, I want session IDs captured and stored so that I can review exact conversation logs when something goes wrong.

### Persona
A detail-oriented engineer who needs to debug why an iteration failed or produced unexpected code. They're comfortable reading raw conversation logs (JSONL format with tool calls and responses) and want to trace exactly what the agent read, what tools it invoked, and where it went wrong. They value debuggability over simplicity when tracking down issues.

### Context
Autonomous systems fail in non-obvious ways. When Ralph produces incorrect code or gets stuck, developers need forensic capabilities. Session IDs linking subtasks to conversation logs enable post-mortem analysis. This is especially critical for calibration (milestone 3), which will analyze session logs to detect inefficiencies and drift.

### Acceptance Criteria
- [ ] After each iteration completes, session ID is captured from Claude Code
- [ ] Session ID is stored in subtasks.json completion metadata (e.g., `"sessionId": "abc123"`)
- [ ] Session logs are retrievable at `~/.claude/projects/<encoded-path>/<session-id>.jsonl`
- [ ] Failed iterations also store session IDs for debugging
- [ ] Session discovery falls back through multiple path encoding strategies (base64, dash-encoded, direct)
- [ ] `DEBUG=true ralph build` outputs session discovery path attempts

### Tasks
<!-- Tasks will be generated separately via tasks-auto.md -->
- [ ] Tasks to be defined

### Notes
**Session ID capture mechanism:**
```bash
# In build.sh after each iteration
result=$(claude -p "$(cat ralph-iteration.md)" --output-format json)
session_id=$(echo "$result" | jq -r '.sessionId')

# Update subtasks.json
jq --arg sid "$session_id" \
   '.subtasks[0] += {sessionId: $sid}' \
   subtasks.json > subtasks.tmp.json
mv subtasks.tmp.json subtasks.json
```

**Session log location strategies:**
1. Base64-encoded repo path: `~/.claude/projects/L1VzZXJzL3Vz.../abc123.jsonl`
2. Dash-encoded repo path: `~/.claude/projects/-Users-user-dev-proj/abc123.jsonl`
3. Direct project path: `~/.claude/projects/my-project/abc123.jsonl`
4. Sessions directory: `~/.claude/sessions/abc123.jsonl`

**Future use:** 
- Calibration (milestone 3) will read session logs for self-improvement analysis
- Iteration diary (milestone 4) will parse session logs for tool call counts, errors, and summaries
- Session IDs enable tracking agent behavior over time to identify patterns and improvements
