# Planning Consistency

Patterns for detecting inconsistencies in planning artifacts: vision/roadmap/story contradictions, milestone scope drift, story-task misalignment, and requirement conflicts across the planning hierarchy.

---

## Quick Reference

- Vision describes outcome X, but roadmap milestones don't lead to X.
- Roadmap milestone promises feature Y, but no stories implement Y.
- Story acceptance criteria conflict with task implementation approach.
- Subtask scope exceeds parent task boundaries.
- Dependencies contradict timeline commitments.

---

## Planning Hierarchy

```
Vision (why, outcomes)
  └─ Roadmap (what, milestones, sequence)
       └─ Milestone (phase, deliverables)
            └─ Story (user value, acceptance criteria)
                 └─ Task (implementation work)
                      └─ Subtask (atomic unit, hours)
```

Each level should trace to its parent without contradiction.

---

## Vision-Roadmap Inconsistencies

### Patterns

| Pattern | Risk | Detection Method |
|---------|------|------------------|
| Vision goal not addressed by any milestone | Goal won't be achieved | Map vision goals to milestones |
| Milestone contradicts vision philosophy | Philosophical conflict | Compare stated values |
| Roadmap timeline conflicts with vision scope | Under/over scoped | Compare ambition vs timeline |
| Vision updated but roadmap unchanged | Stale roadmap | Compare modification dates |

### Rules

- Every vision outcome should map to at least one milestone
- Milestones should not introduce goals outside the vision
- Timeline must be realistic for stated ambition
- When vision changes, review entire roadmap

### Example

```markdown
❌ Vision-Roadmap inconsistency:

Vision: "Build a privacy-first analytics platform with zero third-party data sharing."
Roadmap Milestone 3: "Integrate Google Analytics for enhanced insights."

→ Milestone contradicts vision's "zero third-party data sharing" principle

✅ Consistent:

Vision: "Build a privacy-first analytics platform with zero third-party data sharing."
Roadmap Milestone 3: "Add self-hosted analytics dashboard with privacy-preserving aggregation."
```

---

## Roadmap-Story Inconsistencies

### Patterns

| Pattern | Risk | Detection Method |
|---------|------|------------------|
| Milestone promises feature with no backing stories | Feature won't ship | Map features to stories |
| Story delivers value not mentioned in milestone | Scope creep | Check story maps to milestone |
| Milestone deadline vs story estimates | Timeline breach | Sum story estimates |
| Dependencies across milestones not reflected | Blocked work | Trace inter-milestone deps |

### Rules

- Each milestone deliverable should have concrete stories
- Story completion should demonstrably advance milestone goals
- Story estimates should fit within milestone timeline
- Cross-milestone dependencies should be explicit

### Example

```markdown
❌ Roadmap-Story inconsistency:

Milestone: "User authentication complete by Q2"
Stories:
  - "As a user, I can register with email" (2 pts)
  - "As a user, I can reset my password" (3 pts)

→ Missing login story; milestone can't be "complete" without it

✅ Consistent:

Milestone: "User authentication complete by Q2"
Stories:
  - "As a user, I can register with email" (2 pts)
  - "As a user, I can log in with email/password" (2 pts)
  - "As a user, I can reset my password" (3 pts)
  - "As a user, I can log out" (1 pt)
```

---

## Story-Task Inconsistencies

### Patterns

| Pattern | Risk | Detection Method |
|---------|------|------------------|
| Task implements more than story asks | Scope creep, wasted effort | Compare task scope to AC |
| Task omits story acceptance criterion | Story incomplete | Map tasks to AC |
| Task approach contradicts story constraints | Wrong implementation | Check constraints |
| No task for a complex AC | AC won't be met | Check AC coverage |

### Rules

- Each acceptance criterion should map to task(s)
- Tasks should not exceed story scope
- Task technical approach must satisfy story constraints
- Sum of task outputs should equal story deliverable

### Example

```markdown
❌ Story-Task inconsistency:

Story AC: "User can log in with email and password"
Tasks:
  - Create login form component
  - Add Google OAuth integration
  - Create password reset flow

→ OAuth and password reset exceed story scope; should be separate stories

✅ Consistent:

Story AC: "User can log in with email and password"
Tasks:
  - Create login form component
  - Implement login API endpoint
  - Add client-side validation
  - Write login E2E test
```

---

## Task-Subtask Inconsistencies

### Patterns

| Pattern | Risk | Detection Method |
|---------|------|------------------|
| Subtask scope exceeds task boundary | Scope confusion | Compare subtask to task |
| Subtask duplicates work from another task | Wasted effort | Check for overlap |
| Subtask missing for complex task step | Incomplete breakdown | Verify task coverage |
| Subtask dependency not in same task | Cross-task coupling | Check subtask deps |

### Rules

- Subtasks should be "vertical slices" within their task
- No subtask should require changes to areas outside the task
- Subtask dependencies should primarily be within the same task
- If subtask grows, it may need to become its own task

### Example

```markdown
❌ Task-Subtask inconsistency:

Task: "Create login form component"
Subtasks:
  - Create form JSX structure
  - Add form validation
  - Implement authentication API endpoint  ← This is a different task!
  - Style the form

→ "Implement authentication API" is backend work, not part of form component task

✅ Consistent:

Task: "Create login form component"
Subtasks:
  - Create form JSX structure
  - Add form validation
  - Add form submission handler (calls existing API)
  - Style the form
  - Write component tests
```

---

## Acceptance Criteria Conflicts

### Patterns

| Pattern | Risk | Detection Method |
|---------|------|------------------|
| AC requires feature story doesn't authorize | Unauthorized work | Check AC vs story scope |
| AC conflicts with another AC in same story | Impossible to satisfy | Check for contradictions |
| AC contradicts system constraint | Implementation blocked | Check against constraints |
| AC too vague to verify | Can't confirm done | Check for testability |

### Rules

- Each AC should be independently verifiable
- ACs must not contradict each other
- ACs must be achievable within story constraints
- ACs should be specific enough to test

### Example

```markdown
❌ AC conflict:

Story: "As a user, I can set my profile photo"
AC1: "Photo upload accepts JPEG and PNG up to 5MB"
AC2: "Photo upload accepts any image format with no size limit"

→ AC1 and AC2 directly contradict on format and size

✅ Consistent:

Story: "As a user, I can set my profile photo"
AC1: "Photo upload accepts JPEG and PNG"
AC2: "Photos are resized to max 5MB before storage"
AC3: "User sees error if upload exceeds 10MB"
```

---

## Timeline and Dependency Conflicts

### Patterns

| Pattern | Risk | Detection Method |
|---------|------|------------------|
| Story depends on story not yet scheduled | Blocked work | Check dependency dates |
| Milestone deadline before dependent work completes | Impossible timeline | Trace critical path |
| Parallel stories modify same component | Merge conflicts | Check file/component overlap |
| Priority conflicts with dependencies | Wrong execution order | Verify priority vs deps |

### Rules

- Dependencies must complete before dependents start
- Critical path must fit within timeline
- Parallel work should not have file-level conflicts
- Priority ordering must respect dependencies

### Example

```markdown
❌ Dependency conflict:

Milestone 1 (Q1): "Authentication system"
Milestone 2 (Q1): "User dashboard" - depends on auth

→ Can't both complete in Q1 if auth must finish first

✅ Consistent:

Milestone 1 (Q1): "Authentication system"
Milestone 2 (Q2): "User dashboard" - depends on auth

Or, if parallel:
Milestone 1 (Q1): "Authentication system"
Milestone 2 (Q1): "User dashboard" - uses mock auth until M1 complete
```

---

## Severity Definitions

| Severity | Criteria | Example |
|----------|----------|---------|
| **Critical** | Work will fail to meet stated goal | Vision goal with no backing milestone |
| **Moderate** | Scope confusion, potential rework | Story scope exceeds milestone boundaries |
| **Minor** | Unclear traceability, documentation issue | Task not explicitly linked to AC |

---

## Review Triggers

Check planning consistency when:

- Creating new planning artifacts (review against parents)
- Updating vision or roadmap (cascade check to children)
- Completing a milestone (verify against original scope)
- Story or task seems to have grown (check for scope creep)
- Dependencies change (re-verify timeline feasibility)

---

## Summary: Checklist

When reviewing planning artifacts for consistency:

- [ ] Every vision outcome maps to roadmap milestone(s)
- [ ] Every milestone deliverable has backing stories
- [ ] Story acceptance criteria are covered by tasks
- [ ] Subtask scope stays within parent task boundaries
- [ ] No acceptance criteria contradict each other
- [ ] Dependencies are satisfiable within timeline
- [ ] No unauthorized scope creep at any level
- [ ] Changes cascade to affected child artifacts
