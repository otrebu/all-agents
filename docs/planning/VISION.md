# Unified Framework for Autonomous Software Development

## 0. Core Philosophy

**"Humans on the loop, not in it."** Engineers don't write code directly—they design specs, engineer backpressure, and govern autonomous agents. Each agent iteration starts fresh (memoryless) with deterministically constructed context to avoid "context rot."

## 1. Vocabulary & Hierarchy

```
VISION (singular)
  └── ROADMAP (singular, living doc)
        └── Milestone (outcome-based bucket)
              ├── Story (user-centric what/who/why)
              │     └── Task (technical how)
              │           └── Subtask (atomic implementation)
              └── Task (orphan, tech-only)
                    └── Subtask
```

### Definitions

| Term | Definition |
|------|------------|
| **Vision** | What the app IS and WILL BECOME. Evolves as milestones complete. |
| **Roadmap** | Living doc referencing milestones. Trims as milestones complete. |
| **Milestone** | Outcome-based bucket (e.g., "MVP", "Beta"). Bigger than Epic. Contains Stories and/or orphan Tasks. |
| **Story** | User-centric "what, for whom, why" (JTBD). 1:1 with Milestone. Has unique ID (e.g., `STORY-001`). |
| **Task** | Technical "how". References parent Story (optional). Has unique ID (e.g., `TASK-001`). |
| **Subtask** | Atomic implementation unit. Always has Task parent. Stored in `subtasks.json`. |

### Constraints

- Stories always belong to exactly one Milestone
- Tasks optionally have a Story parent (orphan Tasks allowed for tech-only work)
- Subtasks always have a Task parent
- Entry point is flexible: can start at any level (just create a milestone folder with stories/tasks)

## 2. Folder Structure

```
docs/planning/
  ├── VISION.md
  ├── ROADMAP.md
  └── milestones/
        ├── mvp/
        │     ├── stories/
        │     │     └── auth/
        │     │           └── subtasks.json (optional, story-scoped)
        │     ├── tasks/
        │     └── subtasks.json (optional, milestone-scoped)
        ├── beta/
        │     └── stories/
        └── bug-fixes/
              └── stories/
```

### subtasks.json

Flexible scope—place at milestone level (build whole milestone) or story level (build just that story). JSON format for better AI parseability.

**Schema:** `docs/planning/schemas/subtasks.schema.json`
**Template:** `docs/planning/templates/subtasks.template.json`

```json
{
  "subtasks": [
    {
      "id": "SUB-001",
      "taskRef": "TASK-001",
      "storyRef": "STORY-001",
      "title": "Create user authentication endpoint",
      "description": "Implement POST /api/auth/register with validation and JWT",
      "done": false,
      "acceptanceCriteria": [
        "POST to /api/auth/register with valid email/password returns JWT",
        "Invalid credentials return 401"
      ],
      "filesToRead": [
        "@context/blocks/security/better-auth.md",
        "src/routes/index.ts"
      ]
    }
  ]
}
```

**Key fields:**
- `done` - boolean, agent sets to `true` after successful implementation
- `acceptanceCriteria` - plain English descriptions of how to verify completion
- `filesToRead` - docs and code to read before implementing (supports glob patterns)

**Completion fields** (required when `done: true`):
- `completedAt` - timestamp
- `commitHash` - git commit hash
- `sessionId` - Claude Code session ID for debugging

## 3. Operational Modes

### Planning Mode

Human-guided with AI assistance. No code written. Spans: Vision → Roadmap → Milestone → Stories → Tasks → subtasks.json generation.

**Level-by-level breakdown:**

| Level | Who | How |
|-------|-----|-----|
| Vision → Roadmap → Stories | Human describes, AI generates structured files | Interactive mode, templates/prompts |
| Stories → Tasks | Flexible: automatic (AI breaks down stories + tech docs), semi-automatic, or step-by-step | Different prompts/modes available |
| Tasks → Subtasks | Always AI | Automatic generation |

**Human can refine at any moment.**

**Gap Analysis modes:**
- Automatic: AI reads specs + codebase → produces Tasks
- Semi-automatic: Human guides which areas to analyze
- Step-by-step: Human reviews each gap before Task creation

**Subtask sizing:** Must fit entire cycle in one context window:
- Init + context gathering + implementation + test + commit

**Pre-Building validation:** Drift check at subtask level before execution to verify alignment across full chain (Vision → Roadmap → Stories → Tasks → Subtasks).

**Graceful degradation:** Drift check validates only what exists. Partial chains (e.g., Task → Subtask without Story) still get validated at available levels.

### Building Mode (Ralph Iterations)

Autonomous implementation. Triggered by bash command:
- Interactive mode: check progress between iterations
- `-p` mode: run autonomously until queue empty

Each **Ralph Iteration**:
1. **Orient** - Fresh context, reads subtasks.json, progress file, relevant docs
2. **Select** - Pick one subtask from queue
3. **Investigate** - Confirm not already implemented
4. **Implement** - Write code
5. **Validate** - Run tests/linters (backpressure)
6. **Commit & Update** - Commit, update subtasks.json status

**Memoryless**: Each iteration = new agent session. Special prompt tells agent what to do.

**Ralph Iteration steps:**

**Orient** (understand system state):
1. Read CLAUDE.md / AGENTS.md → understand app, commands
2. Check git status, logs, staged/unstaged → current repo state
3. Read progress file → what's been done
4. Read subtasks.json → the queue

**Select** (pick work):
5. Choose next subtask → agent decides based on context

**Investigate** (prepare & verify):
6. Read `filesToRead` → docs and code referenced in subtask
7. Verify subtask not already implemented

**Implement** (write code):
8. Follow subtask acceptance criteria
9. Follow best practices from docs

**Validate** (backpressure):
10. Build passes
11. Lint passes
12. Type check passes
13. Tests pass (related tests)
14. Subtask acceptance criteria met

Agent retries implementation until validation passes (up to max iterations).

**Commit & Update**:
15. Commit with message referencing subtask ID
16. Update subtasks.json: set `done: true`, add `completedAt`, `commitHash`, `sessionId`
17. Append entry to progress file

**Progress file format** (markdown, append-only):
```markdown
# Progress

## 2026-01-08: SUB-001 - Short title

**Problem**: What needed solving

**Changes**:
- What was modified and why

**Files modified**:
- `path/to/file.ts`

**Acceptance criteria**:
- How completion was verified
```

### Calibration Mode

Governance layer running as **separate loop** (not inline with Ralph Iterations).

**Three calibration types:**

1. **Intention Drift**
   - Detection: Read code vs Story acceptance criteria
   - Method: LLM judges alignment
   - Output: Tasks to correct divergence

2. **Technical Drift**
   - Detection: Compare code vs atomic docs
   - Method: LLM judges compliance
   - Output: Tasks to fix violations

3. **Self-Improvement**
   - Detection: Read full AI conversation logs from sessions
   - Method: LLM with custom prompt identifies failures/inefficiencies
   - Output: Can modify prompts, AGENTS.md, CLAUDE.md, create/update commands, skills, sub-agents
   - Can **propose** atomic doc changes (higher risk, never auto-applied)
   - **Requires human review** (flag) to avoid garbage
   - Atomic doc changes always require human review (even with `--auto-proceed`)

**When it runs:**
- After N iterations (configurable: `--calibrate-every N`)
- After Milestone completion (unless recently ran)
- On-demand: `ralph calibrate`

**Output flow:**
```
Drift detected → Create Task → Human review (optional) → Break to Subtasks → Append to subtasks.json
```

**Configuration:** via `ralph.config.json` (see Approval System below)

**Separate loop benefits:**
- Can run standalone without active Ralph loop
- Can run in parallel
- Flexible scheduling

## 4. Technical Documentation

Three layers in `@context/`:
- **Blocks** - frequently referenced patterns and tools
- **Foundations** - integration guides and common implementations
- **Stacks** - larger scope, full stack configurations

Subtasks reference relevant docs via `filesToRead` field. Agent reads these during Investigate phase before implementing.

## 5. Approval System

Centralized in `ralph.config.json`:

```json
{
  "approvals": {
    "storiesToTasks": "auto",
    "tasksToSubtasks": "auto",
    "preBuildDriftCheck": "auto",
    "driftTasks": "auto",
    "selfImprovement": "always",
    "atomicDocChanges": "always",
    "llmJudgeSubjective": "auto"
  },
  "calibration": {
    "everyNIterations": 10,
    "afterMilestone": true
  }
}
```

**Two approval levels:**
- `always` - asks for approval by default
- `auto` - skips approval by default

**CLI overrides config:**
- `--force` - skip all approvals (even `always`)
- `--review` - require all approvals (even `auto`)

```bash
ralph calibrate              # uses config defaults
ralph calibrate --force      # skip all approvals
ralph calibrate --review     # ask for all approvals
```

### Hooks & Notifications

Configurable hooks for human-on-the-loop checkpoints and notifications:

```json
{
  "hooks": {
    "onIterationComplete": {
      "enabled": true,
      "actions": ["log", "notify"]
    },
    "onMilestoneComplete": {
      "enabled": true,
      "actions": ["log", "notify", "pause"]
    },
    "onValidationFail": {
      "enabled": true,
      "actions": ["log", "notify"],
      "pauseAfterRetries": 3
    },
    "onMaxRetriesExceeded": {
      "enabled": true,
      "actions": ["notify", "pause"]
    }
  },
  "notifications": {
    "provider": "pushover",
    "config": {
      "userKey": "${PUSHOVER_USER_KEY}",
      "appToken": "${PUSHOVER_APP_TOKEN}"
    }
  }
}
```

**Hook events:**
- `onIterationComplete` - After each subtask completes
- `onMilestoneComplete` - When all subtasks in a milestone are done
- `onValidationFail` - When backpressure checks fail
- `onMaxRetriesExceeded` - When agent exhausts retry attempts

**Actions:**
- `log` - Write to progress file
- `notify` - Send push notification
- `pause` - Stop autonomous loop, wait for human

**Notification providers (research needed):**
- Pushover - iOS/Android push notifications
- ntfy - Open source, self-hostable
- Slack/Discord webhooks
- Custom webhook URL

## 6. TODO

### Next Up

- [x] Review subtasks.json schema together - simplified from 17+ fields to 10

### Research

- [x] Claude Code conversation IDs - see Logging & Monitoring below
- [ ] Notification provider options (Pushover, ntfy, etc.) - for phone notifications on hook events

### Templates

**All templates complete:**
- [x] VISION: `context/blocks/docs/vision-template.md`
- [x] ROADMAP: `context/blocks/docs/roadmap-template.md`
- [x] subtasks.json schema: `docs/planning/schemas/subtasks.schema.json`
- [x] subtasks.json example: `docs/planning/templates/subtasks.template.json`
- Story: `context/blocks/docs/story-template.md` (existing)
- Task: `context/blocks/docs/task-template.md` (existing)

### Logging & Monitoring

**Iteration logging:**
- Each completed subtask stores `sessionId` linking to the Claude Code conversation
- Conversations stored at `~/.claude/projects/<encoded-path>/<session-id>.jsonl`

**Capturing session ID:**
```bash
result=$(claude -p "prompt" --output-format json)
session_id=$(echo "$result" | jq -r '.session_id')
```

**Resume sessions:** `claude --resume <session-id>`
