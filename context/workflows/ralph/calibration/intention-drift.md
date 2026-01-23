# Intention Drift Analysis

You are an LLM-as-judge analyzing completed Ralph subtasks to detect when code changes have diverged from the intended behavior defined in the planning chain. Your goal is to identify drift from intention (not code quality issues—that's technical drift).

## Input Sources

### 1. Completed Subtasks
Read `subtasks.json` to find completed subtasks with `commitHash`:

```json
{
  "id": "SUB-001",
  "taskRef": "TASK-001",
  "title": "Implement user registration endpoint",
  "description": "Create POST /api/auth/register with validation",
  "done": true,
  "completedAt": "2026-01-13T10:30:00Z",
  "commitHash": "abc123def456",
  "sessionId": "session-xyz"
}
```

### 2. Git Diffs
For each completed subtask, read the git diff using the `commitHash`:

```bash
git show <commitHash> --stat
git diff <commitHash>^..<commitHash>
```

### 3. Planning Chain
Trace the full chain from code back to Vision:

1. **Subtask** - The atomic implementation unit (from subtasks.json)
2. **Task** - The technical "how" (via `taskRef` field → `docs/planning/milestones/<milestone>/tasks/TASK-NNN.md`)
3. **Story** - The user-centric "what/who/why" (via Task's `storyRef` field → `docs/planning/milestones/<milestone>/stories/STORY-NNN.md`)
4. **Vision** - What the app IS and WILL BECOME (`@docs/planning/VISION.md`)

**Note:** Not all chains are complete. Tasks may be orphans (no Story parent). Validate what exists.

## What to Analyze

### Intention Drift Patterns

**1. Scope Creep**
Code implements more than what the Subtask/Task/Story specified.

**Example:**
```
Subtask: "Add basic email validation to registration"
Code: Implements email validation + phone validation + CAPTCHA
```
*Drift:* Phone validation and CAPTCHA were not part of this subtask.

**Acceptable Variation:**
- Minor refactoring while touching the same code
- Adding error handling for edge cases implied by the acceptance criteria
- Following established patterns found in the codebase

**2. Scope Shortfall**
Code implements less than what the acceptance criteria require.

**Example:**
```
Subtask acceptance criteria:
- "POST to /api/auth/register with valid email/password returns JWT"
- "Invalid credentials return 401"

Code: Only implements the success path, no 401 handling
```
*Drift:* Acceptance criteria explicitly requires 401 handling.

**Acceptable Variation:**
- Acceptance criteria marked as optional or "nice to have"
- Implementation deferred to a dependent subtask in the queue

**3. Direction Change**
Code solves a different problem than intended.

**Example:**
```
Story: "As a user, I want to register with my email so I can access my account"
Task: "Implement email/password registration"
Subtask: "Create registration endpoint"

Code: Implements OAuth-only registration (no email/password)
```
*Drift:* The implementation approach fundamentally differs from the planning chain.

**Acceptable Variation:**
- The change was discussed and the planning docs were updated
- A related Task or Story explicitly covers this approach

**4. Missing Link**
Code doesn't connect to the intended outcome.

**Example:**
```
Vision: "Users can manage their personal task lists"
Story: "As a user, I want to create tasks so I can track my work"
Task: "Implement task creation API"
Subtask: "Add POST /tasks endpoint"

Code: Endpoint works but doesn't associate tasks with users
```
*Drift:* The implementation doesn't serve the Vision (personal task lists require user association).

**Acceptable Variation:**
- User association is a separate Subtask in the queue
- The Task explicitly notes this as a follow-up

## Don't Jump Ahead Guard

**Important:** Do NOT flag as drift:
- Work planned for future subtasks
- Features documented in ROADMAP but not yet started
- Scope that's explicitly deferred in Task/Story docs

Check the subtasks.json queue. If something "missing" is listed as a future subtask, it's not drift—it's planned work.

## Few-Shot Examples

### Example 1: Clear Drift (Flag This)

**Subtask:** "Add email validation to registration form"
**Acceptance Criteria:**
- Email must be valid format (contains @)
- Show inline error if invalid

**Git Diff:**
```diff
+ function validateRegistration(email, password, phone) {
+   if (!email.includes('@')) return 'Invalid email';
+   if (!phone.match(/^\d{10}$/)) return 'Invalid phone';
+   if (password.length < 8) return 'Password too short';
+   return null;
+ }
```

**Judgment:** DRIFT - Scope Creep
- Phone validation was not in the subtask
- Password length validation was not in the acceptance criteria
- Only email validation was requested

### Example 2: Acceptable Variation (Don't Flag)

**Subtask:** "Add email validation to registration form"
**Acceptance Criteria:**
- Email must be valid format (contains @)
- Show inline error if invalid

**Git Diff:**
```diff
+ function validateEmail(email: string): ValidationResult {
+   if (!email) return { valid: false, error: 'Email is required' };
+   if (!email.includes('@')) return { valid: false, error: 'Invalid email format' };
+   if (email.length > 255) return { valid: false, error: 'Email too long' };
+   return { valid: true };
+ }
```

**Judgment:** NO DRIFT
- Empty check is reasonable (implied by "valid format")
- Length check prevents database issues (defensive coding)
- Core requirement (@ check) is implemented
- These are edge cases, not scope creep

### Example 3: Clear Drift (Flag This)

**Task:** "Implement JWT-based authentication"
**Story:** "As a user, I want to log in with my credentials so I can access my data"
**Subtask:** "Create login endpoint"

**Git Diff:**
```diff
+ // Using session-based auth instead of JWT for simplicity
+ app.post('/login', (req, res) => {
+   req.session.userId = user.id;
+   res.json({ success: true });
+ });
```

**Judgment:** DRIFT - Direction Change
- Task explicitly specifies JWT
- Implementation uses sessions instead
- This is an architectural deviation, not a minor variation

### Example 4: Acceptable Variation (Don't Flag)

**Task:** "Implement JWT-based authentication"
**Subtask:** "Create login endpoint returning JWT"

**Git Diff:**
```diff
+ app.post('/login', (req, res) => {
+   const token = jwt.sign({ userId: user.id }, SECRET, { expiresIn: '7d' });
+   res.cookie('token', token, { httpOnly: true, secure: true });
+   res.json({ success: true, token });
+ });
```

**Judgment:** NO DRIFT
- JWT is implemented as specified
- Adding httpOnly cookie is a security best practice
- Returning token in response AND cookie gives flexibility
- Implementation matches Task intent

## Graceful Degradation

Not all subtasks have complete chains. Validate what exists:

| Available | Validate Against |
|-----------|------------------|
| Subtask only | Just acceptance criteria |
| Subtask + Task | Task description + Subtask criteria |
| Subtask + Task + Story | Full chain from user need to implementation |
| Full chain including Vision | Complete intention alignment |

**If a parent is missing:** Note it in the summary but don't fail. Analyze what you can.

```markdown
**Note:** This subtask has no Story parent. Analysis limited to Task → Subtask alignment.
```

## Output Format

### 1. Summary to stdout

```markdown
# Intention Drift Analysis

## Subtask: <subtask-id>
**Title:** <subtask title>
**Commit:** <commitHash>
**Date:** <analysis date>

## Planning Chain
- **Vision:** <brief vision reference or "N/A">
- **Story:** <story-id and title or "N/A (orphan task)">
- **Task:** <task-id and title>
- **Subtask:** <subtask-id and title>

## Analysis

### Drift Detected: <Yes/No>

<If no drift:>
Implementation aligns with planning chain. No corrective action needed.

<If drift detected:>
### Type: <Scope Creep | Scope Shortfall | Direction Change | Missing Link>

### Evidence
<Specific code/diff that shows drift>

### Intended Behavior
<What the planning chain specified>

### Actual Behavior
<What the code actually does>

### Impact
<How this affects the project's direction>

## Recommendation
<If drift:> See task file created in `docs/planning/tasks/`
<If no drift:> No action required.
```

### 2. Task Files for Divergence

When drift is detected, create a task file:

**File:** `docs/planning/tasks/drift-<subtask-id>-<date>.md`

```markdown
## Task: Correct intention drift in <subtask-id>

**Source:** Intention drift analysis
**Created:** <date>
**Commit:** <commitHash>

### Problem
<Description of the drift detected>

### Planning Chain Reference
- Subtask: <subtask-id> - <title>
- Task: <task-id> - <title>
- Story: <story-id> - <title> (if exists)

### Drift Type
<Scope Creep | Scope Shortfall | Direction Change | Missing Link>

### Evidence
<Code snippets showing drift>

### Corrective Action
<Specific changes needed to realign with intention>

Options:
1. **Modify code** - Change implementation to match plan
2. **Update plan** - If drift is actually desirable, update Task/Story
3. **Create new subtask** - If additional work needed

### Acceptance Criteria
- [ ] Implementation matches planning chain intention
- [ ] Acceptance criteria from original subtask are met
- [ ] No unplanned scope remains
```

## Execution Instructions

1. Read `subtasks.json` to find completed subtasks with `commitHash`
2. For each completed subtask:
   a. Read the git diff: `git show <commitHash> --stat` and `git diff <commitHash>^..<commitHash>`
   b. Read the subtask's `taskRef` to find parent Task
   c. Read the Task's `storyRef` to find parent Story (if exists)
   d. Read @docs/planning/VISION.md for Vision context
   e. Compare code changes against the full planning chain
   f. Apply the "Don't Jump Ahead" guard
   g. Determine if drift exists and what type
3. Output summary to stdout
4. Create task files for any detected drift in `docs/planning/tasks/`

## Configuration

Check `ralph.config.json` for the `driftTasks` setting:
- `"auto"` (default): Creates drift task files automatically
- `"always"`: Requires user approval before creating task files

**CLI overrides:**
- `--force`: Skip approval even if config says `"always"`
- `--review`: Require approval even if config says `"auto"`

## Important Notes

- **Intention, not quality:** This prompt checks alignment with planning docs, not code quality (that's technical drift)
- **Propose only:** Don't modify code directly—only create task files
- **False positives:** When in doubt, don't flag. Some variations are acceptable engineering decisions
- **Context matters:** Consider the subtask's acceptance criteria and the broader project context
- **Planning updates:** If drift is actually desirable, the fix may be updating the planning docs, not the code
