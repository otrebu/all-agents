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
        │     │     └── STORY-001-auth/
        │     │           └── subtasks.json (optional, story-scoped)
        │     ├── tasks/
        │     │     └── TASK-001-logging.md
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

#### Entry Points

Can enter planning at any level in the hierarchy:

```
VISION ─────► entry point (interactive only)
    │
ROADMAP ────► entry point
    │
Milestone ──► created manually (folder like "mvp")
    │
Stories ────► entry point
    │
Tasks ──────► entry point
    │
Subtasks ───► never enter here (always generated)
```

#### Interfaces

Two interfaces, same underlying prompts:

1. **Skill/Agent** - interactive Claude Code session (`/ralph plan`, `/ralph story`, etc.)
2. **CLI** - `aaa ralph <cmd>` with `--interactive` or `-p` (print) mode

#### Automation Levels

| Level | Interactive | Auto | Auto reads... |
|-------|-------------|------|---------------|
| Vision | ✅ always | ❌ | - |
| Roadmap | ✅ | ⚠️ risky | Vision |
| Stories | ✅ | ✅ | Vision + Roadmap |
| Tasks | ✅ | ✅ | Stories + codebase |
| Subtasks | ❌ | ✅ always | Tasks + codebase |

**Interactive mode**: AI asks questions, guides human thinking, generates artifact collaboratively.

**Auto mode**: AI reads upstream docs + codebase, generates best guess. Human reviews output.

#### Prompts

Each level needs two prompt types (except edges):
- **Interactive prompt** - Socratic guidance, asks clarifying questions
- **Auto prompt** - Reads context, generates artifact

| Level | Interactive Prompt | Auto Prompt |
|-------|-------------------|-------------|
| Vision | `vision-interactive` | - |
| Roadmap | `roadmap-interactive` | `roadmap-auto` |
| Stories | `stories-interactive` | `stories-auto` |
| Tasks | `tasks-interactive` | `tasks-auto` |
| Subtasks | - | `subtasks-auto` |

**TODO:** Draft all 9 prompts (start with `vision-interactive`).

#### Subtask Sizing

Subtasks must fit entire cycle in one context window:
- Init + context gathering + implementation + test + commit

#### Pre-Build Validation (Optional)

Optional drift check before building. Useful when auto-generating subtasks from stories/tasks.

```bash
ralph build --validate-first   # run drift check before building
```

**Mechanism:** Simple prompt with Story + Task + Subtask content. LLM judges if subtask aligns with parent intent.

**Graceful degradation:** Validates only what exists. Partial chains (e.g., Task → Subtask without Story) still validated at available levels.

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

Agent retries implementation until validation passes. Max iterations configurable via CLI (default: unlimited).

```bash
ralph build --max-retries 3   # stop after 3 failed attempts
ralph build                   # unlimited retries (default)
```

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

#### Interfaces

Same as Planning - both available, kept DRY:

1. **Skill/Agent** - interactive Claude Code session (`/ralph calibrate`)
2. **CLI** - `aaa ralph calibrate` calls Claude Code with same prompt

CLI can call itself for end-to-end runs or one-off steps.

#### Three Calibration Types

**1. Intention Drift**

Detects when code diverges from intended behavior.

| Aspect | Detail |
|--------|--------|
| Reads | Git diffs via `commitHash` from subtasks.json |
| Context | Full chain: Vision → Story → Task → Subtask → code changes |
| Method | Subagent per file (manages context), judges alignment |
| Guard | Vision includes "don't jump ahead" - won't flag future planned work |
| Output | Tasks to correct divergence |

**2. Technical Drift**

Detects when code violates technical standards/docs.

| Aspect | Detail |
|--------|--------|
| Reads | Git diffs via `commitHash` + docs from `filesToRead` |
| Context | Subtask's referenced docs, or passed inline in interactive mode |
| Method | Compare changes against doc standards |
| Escape hatch | `// HUMAN APPROVED: reason and context` - marks intentional deviation |
| Output | Tasks to fix violations |

**3. Self-Improvement**

Analyzes agent sessions for inefficiencies.

| Aspect | Detail |
|--------|--------|
| Reads | Conversation logs via `sessionId` from subtasks.json |
| Analyzes | Tool misuse, retries, wasted tokens, repeated patterns, wrong paths |
| Output | Proposes changes to prompts, skills, agents, CLAUDE.md, AGENTS.md |
| Risk | High - can affect everything since skills/agents reference prompts |
| Control | Config controls propose-only vs auto-apply (default: propose) |

**TODO:** Define concrete heuristics for self-improvement analysis.

#### When It Runs

- After N iterations (configurable: `--calibrate-every N`)
- After Milestone completion (unless recently ran)
- On-demand: `ralph calibrate`

#### Output Flow

Always creates Tasks → Subtasks (never direct fixes):

```
Drift detected → Create Task → Human review (per config) → Break to Subtasks → Append to subtasks.json
```

#### Configuration

Via `ralph.config.json` (see Approval System below).

#### Separate Loop Benefits

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

Hooks enable human-on-the-loop checkpoints via `ralph.config.json`. Events: `onIterationComplete`, `onMilestoneComplete`, `onValidationFail`, `onMaxRetriesExceeded`. Actions: `log`, `notify`, `pause`. Notification providers TBD (Pushover, ntfy, webhooks).

## 6. Logging & Monitoring

**Iteration logging:**
- Each completed subtask stores `sessionId` linking to the Claude Code conversation
- Conversations stored at `~/.claude/projects/<encoded-path>/<session-id>.jsonl`

**Capturing session ID:**
```bash
result=$(claude -p "prompt" --output-format json)
session_id=$(echo "$result" | jq -r '.session_id')
```

**Resume sessions:** `claude --resume <session-id>`

## 7. Status & Next Steps

### Current Status

**Framework design: COMPLETE** ✅

All core concepts, flows, and architecture are defined:

| Component | Status |
|-----------|--------|
| Vocabulary & Hierarchy | ✅ Complete |
| Folder Structure | ✅ Complete |
| Subtasks Schema | ✅ Complete (`docs/planning/schemas/subtasks.schema.json`) |
| Story Template | ✅ Complete (`context/blocks/docs/story-template.md`) |
| Task Template | ✅ Complete (`context/blocks/docs/task-template.md`) |
| Planning Mode | ✅ Complete (entry points, interfaces, automation levels) |
| Building Mode | ✅ Complete (Ralph iteration loop, validation, retries) |
| Calibration Mode | ✅ Complete (3 types, interfaces, output flow) |
| Approval System | ✅ Complete (`ralph.config.json` structure) |
| Logging & Monitoring | ✅ Complete (session IDs, progress file) |

### Implementation TODOs

These are implementation artifacts, not design blockers:

1. **Draft 9 planning prompts** (see Prompts table in Planning Mode)
   - Start with `vision-interactive` and `subtasks-auto`

2. **Define self-improvement heuristics** (Calibration Mode)
   - Concrete patterns for detecting tool misuse, wasted tokens, etc.

3. **Implement `aaa ralph` CLI** commands:
   - `ralph plan` - planning mode entry
   - `ralph build` - building mode (Ralph iterations)
   - `ralph calibrate` - calibration mode

### Next Step

**Begin implementation planning** - create Stories/Tasks for Ralph CLI in `aaa`.
