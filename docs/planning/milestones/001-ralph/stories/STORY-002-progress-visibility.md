## Story: Progress Tracking & Visibility

### Narrative
As a developer monitoring Ralph builds, I want clear visibility into what's been completed and what's in progress so that I can understand system state without reading git diffs or code.

### Persona
A developer running Ralph iterations who needs to check progress periodically. They may step away during a long build and want to quickly see what happened when they return. They value human-readable summaries over raw logs, but also want structured data for debugging. They trust the system but want transparency into its actions.

### Context
Autonomous systems become black boxes without proper logging. Progress visibility is essential for building trust - developers need to see what Ralph accomplished, what files changed, and whether iterations succeeded or failed. This supports the "humans on the loop" philosophy by giving oversight without requiring constant attention.

### Acceptance Criteria
- [ ] PROGRESS.md file is created adjacent to subtasks.json
- [ ] Each completed subtask appends an entry with: date, subtask ID, problem, changes, files modified, acceptance criteria verified
- [ ] Progress entries are human-readable markdown format
- [ ] `ralph status` command shows: milestone name, completion count (e.g., "3/10 completed"), last completed subtask, next in queue
- [ ] Status output includes recent activity timestamp (e.g., "2h ago")
- [ ] Progress file is append-only (never overwrites existing entries)

### Tasks
<!-- Tasks will be generated separately via tasks-auto.md -->
- [ ] Tasks to be defined

### Notes
**PROGRESS.md format example:**
```markdown
## 2026-01-29: SUB-001 - Implement auth endpoint

**Problem**: Need JWT-based authentication for API

**Changes**:
- Added POST /api/auth/login endpoint with email/password validation
- Integrated better-auth library for JWT generation
- Added middleware for token verification

**Files modified**:
- `src/routes/auth.ts` (new)
- `src/middleware/auth.ts` (new)
- `package.json` (added better-auth dependency)

**Acceptance criteria**:
- Valid credentials return JWT token
- Invalid credentials return 401
- Protected routes require valid JWT
```

**Future enhancement:** Iteration diary (logs/iterations.jsonl) will provide structured JSON logs with tool call counts, errors, and LLM-generated summaries. That's part of milestone 4 (full-integration).
