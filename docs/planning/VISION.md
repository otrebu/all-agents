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
| **Story** | User-centric "what, for whom, why" (JTBD). Belongs to exactly one Milestone. Has unique ID (e.g., `STORY-001`). |
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
- `filesToRead` - docs and code to read before implementing (supports glob patterns - agent uses Glob tool to expand)

**Completion fields** (required when `done: true`):
- `completedAt` - timestamp
- `commitHash` - git commit hash
- `sessionId` - Claude Code session ID for debugging

## 3. Operational Modes

### 3.1 Execution Modes (Trust Gradient)

Ralph supports three execution modes with increasing levels of autonomy:

| Mode | Entry Point | What Happens | Claude Invocation | Trust Level |
|------|-------------|--------------|-------------------|-------------|
| **Interactive** | Skill (`/ralph plan`) | User in Claude Code, skill loads prompt, user chats | Skill (no subprocess) | Low (human in loop) |
| **Supervised** | CLI (`aaa ralph --supervised`) | Bash loop of chat sessions, user watches, can participate | `claude` (chat mode, no `-p`) | Medium (human on loop) |
| **Headless** | CLI (`aaa ralph --headless`) | `claude -p` with JSON output + file logging | `claude -p --output-format json` | High (human reviews logs) |

**Key Distinctions:**

- **Interactive vs Supervised**: Interactive is a skill (you're already in Claude Code). Supervised spawns chat sessions from CLI.
- **Supervised vs Headless**: Supervised = real chat sessions (can type). Headless = prompt mode (`-p`), no chat possible.
- **Headless has logging**: Even though it's autonomous, logs to file so you can see what's going on.

**Trust Gradient:**

```
Low Trust ────────────────────────────────► High Trust

Interactive          Supervised          Headless
(skill, in chat)    (CLI, chat loop)    (CLI, -p mode)
    │                    │                   │
    └─ Full chat         └─ Watches chat     └─ Reviews logs
       User participates    Can type if needed   JSON for tooling
                            Next on exit
```

**When to Use Each Mode:**

| Mode | Use When |
|------|----------|
| **Interactive** (Skill) | You want to participate, explore, ask questions |
| **Supervised** (CLI) | Process multiple items - watch each, intervene if needed, auto-advance |
| **Headless** (CLI) | CI/CD, overnight runs, batch processing |

For implementation patterns and code examples, see @context/blocks/construct/ralph-patterns.md.

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

**TODO:** Draft all 14 prompts (8 planning, 2 building, 3 calibration, 1 hook).

#### Subtask Sizing

Subtasks must fit entire cycle in one context window:
- Init + context gathering + implementation + test + commit

#### Pre-Build Validation (Optional)

Optional alignment check before building. Useful when auto-generating subtasks from stories/tasks.

```bash
ralph build --validate-first   # run alignment check before building
```

**Mechanism:** `pre-build-validation.md` prompt reads:
- Subtask definition (title, description, acceptance criteria)
- Parent Task (if exists)
- Parent Story (if exists)

LLM judges: Does subtask faithfully implement parent intent? Not too broad, not too narrow, no scope creep?

**Output:**
```json
{"aligned": true}
// or
{"aligned": false, "reason": "Subtask adds OAuth support but Task only mentions basic auth"}
```

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
5. Choose next subtask → agent uses judgment based on progress and dependencies (not rigid sequential)

**Investigate** (prepare & verify):
6. Read `filesToRead` → docs and code referenced in subtask
7. Verify subtask not already implemented

**Implement** (write code):
8. Follow subtask acceptance criteria
9. Follow best practices from docs

**Validate** (backpressure - commands from CLAUDE.md):
10. Build passes
11. Lint passes
12. Type check passes
13. Tests pass (related tests)
14. Subtask acceptance criteria met

**No internal retries:** One iteration = one Claude session. If validation fails, that iteration is consumed. Next iteration starts fresh (memoryless).

```bash
ralph build --max-iterations 3   # stop after 3 iterations per subtask
ralph build                      # unlimited iterations (default)
```

**When max iterations exceeded:** Triggers `onMaxIterationsExceeded` hook. Default action: `pause`.

**Commit & Update**:
15. Commit with message referencing subtask ID
16. Update subtasks.json: set `done: true`, add `completedAt`, `commitHash`, `sessionId`
17. Append entry to progress file

**Progress file:** `PROGRESS.md` lives adjacent to `subtasks.json` (same folder).

```
docs/planning/milestones/mvp/
├── subtasks.json
├── PROGRESS.md      # ← same folder
└── stories/
```

**Format** (markdown, append-only):
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
| Method | LLM-as-judge with few-shot examples of drift vs acceptable |
| Guard | Vision includes "don't jump ahead" - won't flag future planned work |
| Output | Task files to correct divergence |

**2. Technical Drift**

Detects when code violates technical standards/docs.

| Aspect | Detail |
|--------|--------|
| Reads | Git diffs via `commitHash` + docs from `filesToRead` |
| Context | Subtask's referenced docs, or passed inline in interactive mode |
| Method | LLM-as-judge comparing changes against doc standards |
| Escape hatch | `// HUMAN APPROVED: reason` - prompt instruction to ignore these |
| Output | Task files to fix violations |

**3. Self-Improvement**

Analyzes agent sessions for inefficiencies.

| Aspect | Detail |
|--------|--------|
| Reads | Conversation logs via `sessionId` from subtasks.json |
| Analyzes | Tool misuse, retries, wasted tokens, repeated patterns, wrong paths |
| Output | Proposes changes to prompts, skills, agents, CLAUDE.md, AGENTS.md |
| Risk | High - can affect everything since skills/agents reference prompts |
| Control | Config controls propose-only vs auto-apply (default: propose) |

**Approach:** LLM-as-judge with good prompt and context. See Section 8.4.

#### When It Runs

- After N iterations (configurable: `--calibrate-every N`)
- After Milestone completion (unless recently ran)
- On-demand: `ralph calibrate`

#### Output Flow

Calibration prompts output task markdown directly:

```
Analysis → Summary in stdout → Task files created → pause hook → User reviews
```

User then decides: run `ralph plan subtasks` to add tasks to queue, or continue without.

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

Hooks enable human-on-the-loop checkpoints via `ralph.config.json`.

**Events:**
- `onIterationComplete` - After each subtask attempt (success or fail)
- `onMilestoneComplete` - When all subtasks `done: true` (checked after each iteration)
- `onValidationFail` - When build/lint/test fails
- `onMaxIterationsExceeded` - When iteration limit hit for a subtask

**Actions:**
- `log` - Write to iteration diary
- `notify` - Send push notification
- `pause` - Exit build loop, show what triggered pause (e.g., new tasks created), give user options to continue or review

**Notification provider:** ntfy (default)

**Iteration diary:** Machine-readable log at `logs/iterations.jsonl`. Populated by Claude Code hook after each iteration. Includes LLM-generated summary (via haiku) of what happened.

```json
{"subtaskId": "SUB-001", "sessionId": "abc123", "status": "completed", "summary": "Implemented JWT auth. Hit CORS issue, fixed with middleware.", "toolCalls": 42, "filesChanged": ["src/auth.ts"]}
```

**Status command** reads diary for recent activity, success rate, tool call stats.

## 6. Logging & Monitoring

**Iteration logging:**
- Each completed subtask stores `sessionId` linking to the Claude Code conversation
- Conversations stored at `~/.claude/projects/<encoded-path>/<session-id>.jsonl`

**Capturing session ID:**
```bash
result=$(claude -p "prompt" --output-format json)
session_id=$(echo "$result" | jq -r '.session_id')
```

**Session resume:** Not used in Ralph flow (memoryless principle). Session IDs stored for debugging/calibration only.

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

1. **Draft 14 prompts** (8 planning, 2 building, 3 calibration, 1 hook)
   - Start with `ralph-iteration.md` and `subtasks-auto.md`

2. **Define self-improvement heuristics** (Calibration Mode)
   - Concrete patterns for detecting tool misuse, wasted tokens, etc.

3. **Implement `aaa ralph` CLI** commands:
   - `ralph plan` - planning mode entry
   - `ralph build` - building mode (Ralph iterations)
   - `ralph calibrate` - calibration mode

### Next Step

**Begin implementation planning** - create Stories/Tasks for Ralph CLI in `aaa`.

## 8. Implementation Plan

### 8.1 Prompts Location & Format

**Location:** `context/workflows/ralph/`

```
context/workflows/ralph/
├── planning/
│   ├── vision-interactive.md
│   ├── roadmap-interactive.md
│   ├── roadmap-auto.md
│   ├── stories-interactive.md
│   ├── stories-auto.md
│   ├── tasks-interactive.md
│   ├── tasks-auto.md
│   └── subtasks-auto.md
├── building/
│   ├── ralph-iteration.md
│   └── pre-build-validation.md
├── calibration/
│   ├── intention-drift.md
│   ├── technical-drift.md
│   └── self-improvement.md
└── hooks/
    └── iteration-summary.md
```

**Format:** Plain markdown with file path references.

**Templating note:** Planning/building/calibration prompts use `@path` references resolved by Claude Code - no preprocessing needed. Hook prompts (like `iteration-summary.md`) use `{{VAR}}` placeholders substituted by bash before calling Claude - these are programmatic, not interactive.

```markdown
## Required Reading
- @docs/planning/VISION.md
- @docs/planning/ROADMAP.md

Read these before proceeding.
```

**Rationale:**
- CLI and skills reference same paths (`@context/workflows/ralph/...`)
- No templating engine needed - Claude reads files directly
- Self-contained, human-readable prompts
- Matches `filesToRead` pattern from subtasks.json

### 8.2 CLI Command Structure

**Commands:**

```
aaa ralph plan <level>     # Planning mode
aaa ralph build            # Building mode (Ralph iterations)
aaa ralph calibrate <type> # Calibration mode
aaa ralph status           # Show current state
```

**Plan subcommands:**

```bash
ralph plan vision              # Interactive only
ralph plan roadmap             # Interactive (default) or --auto
ralph plan stories             # Interactive (default) or --auto
ralph plan tasks               # Interactive (default) or --auto
ralph plan subtasks --auto     # Auto only (always requires --auto)
```

**Plan options:**

| Option | Description |
|--------|-------------|
| `--auto, -a` | Use auto mode (generate from upstream docs) |
| `--milestone <name>` | Target milestone (e.g., `mvp`) |
| `--story <id>` | Target story (e.g., `STORY-001`) |
| `--task <id>` | Target task (e.g., `TASK-001`) |
| `-p, --print` | Print prompt without executing |

**Build options:**

| Option | Description |
|--------|-------------|
| `--subtasks <path>` | Path to subtasks.json (default: `./subtasks.json`) |
| `--max-iterations <n>` | Max iterations per subtask (default: 0 = unlimited) |
| `--calibrate-every <n>` | Run calibration after N iterations (default: from config) |
| `--validate-first` | Run alignment check before building |
| `-i, --interactive` | Pause after each iteration for review |
| `-p, --print` | Print single iteration prompt, don't execute |

**Calibrate subcommands:**

```bash
ralph calibrate intention      # Check intention drift
ralph calibrate technical      # Check technical drift
ralph calibrate improve        # Analyze for self-improvement
ralph calibrate all            # Run all checks
```

**Global options:**

| Option | Description |
|--------|-------------|
| `--force` | Skip all approvals (overrides config) |
| `--review` | Require all approvals (overrides config) |

**Status output:**

```
Milestone: mvp
Subtasks:  3/10 completed
Last:      SUB-003 (2h ago)
Queue:     SUB-004 "Implement login endpoint"
Config:    ralph.config.json (found)
```

### 8.3 Prompts, Skills, and CLI

**Principle:** Prompts are source of truth. CLI and skills are peer entry points to the same prompts.

**Two entry points, same prompts:**

| Entry | How it works |
|-------|--------------|
| CLI | `claude -p "$(cat prompt.md)" --options` - uses prompt directly |
| Skill | `/ralph-plan` in interactive session - skill loads same prompt |

**Skills to create:**

```
.claude/skills/
├── ralph-plan/SKILL.md         # Planning workflows
├── ralph-build/SKILL.md        # Building mode
├── ralph-calibrate/SKILL.md    # Calibration checks
└── ralph-status/SKILL.md       # Status reporting
```

**Skill structure:**

```markdown
# Ralph Planning

Based on what level the user wants to plan, read and follow the appropriate prompt:

- Vision: @context/workflows/ralph/planning/vision-interactive.md
- Roadmap: @context/workflows/ralph/planning/roadmap-interactive.md (or roadmap-auto.md)
- Stories: @context/workflows/ralph/planning/stories-interactive.md (or stories-auto.md)
- Tasks: @context/workflows/ralph/planning/tasks-interactive.md (or tasks-auto.md)
- Subtasks: @context/workflows/ralph/planning/subtasks-auto.md
```

**CLI invokes prompts directly:**

```bash
# CLI uses prompt file directly, not skills
aaa ralph plan vision
# → claude -p "$(cat context/workflows/ralph/planning/vision-interactive.md)"

aaa ralph build
# → claude -p "$(cat context/workflows/ralph/building/ralph-iteration.md)" \
#          --dangerously-skip-permissions --output-format json
```

**Benefits:**
- Prompts are single source of truth
- CLI and skills are true peers
- No indirection layer - CLI doesn't "call" skills
- Easy to test prompts in isolation

### 8.4 Self-Improvement (LLM-as-Judge)

The `ralph calibrate improve` command analyzes session logs to detect inefficiencies using LLM judgment (not coded heuristics).

**Approach:** Pure prompt-based analysis. Claude reads session logs and identifies patterns like:
- Tool misuse (Bash for file ops instead of Read/Edit/Write)
- Wasted reads (files read but never used)
- Backtracking (edits that cancel each other)
- Excessive iterations on same error
- Missing documentation patterns

**Session logs:** `~/.claude/projects/<encoded-path>/<session-id>.jsonl`

**Large logs:** Prompt instructs Claude to chunk and process incrementally if needed.

**Output:**
- Summary of findings in stdout
- Task files for proposed improvements (prompts, docs, CLAUDE.md)

**Approval:** Controlled by `selfImprovement` in ralph.config.json (default: `always`).

### 8.5 Directory Structure (Bash Prototype)

**Approach:** Bash prototype for quick iteration. TypeScript is a thin wrapper.

```
tools/src/commands/ralph/
├── index.ts              # Registers "ralph" command, passes args to bash
└── scripts/
    ├── ralph.sh          # Entrypoint, dispatches subcommands
    ├── plan.sh           # ralph plan <level> [--auto]
    ├── build.sh          # ralph build (iteration loop + progress writing)
    ├── calibrate.sh      # ralph calibrate <type>
    └── status.sh         # ralph status

context/workflows/ralph/
├── planning/             # 8 planning prompts
├── building/             # ralph-iteration.md
└── calibration/          # 3 calibration prompts

.claude/skills/
├── ralph-plan/SKILL.md
├── ralph-build/SKILL.md
└── ralph-calibrate/SKILL.md
```

**TypeScript wrapper** (minimal):

```typescript
import { Command } from "@commander-js/extra-typings";
import { execSync } from "child_process";

const ralphCommand = new Command("ralph")
  .description("Autonomous development framework")
  .allowUnknownOption()
  .passThroughOptions()
  .action((_, cmd) => {
    const scriptPath = `${__dirname}/scripts/ralph.sh`;
    execSync(`${scriptPath} ${cmd.args.join(" ")}`, { stdio: "inherit" });
  });

export default ralphCommand;
```

**Bash entrypoint** (`ralph.sh`):

```bash
#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMMAND="${1:-help}"
shift || true

case "$COMMAND" in
  plan)      source "$SCRIPT_DIR/plan.sh" "$@" ;;
  build)     source "$SCRIPT_DIR/build.sh" "$@" ;;
  calibrate) source "$SCRIPT_DIR/calibrate.sh" "$@" ;;
  status)    source "$SCRIPT_DIR/status.sh" "$@" ;;
  *)         echo "Usage: ralph <plan|build|calibrate|status>" ;;
esac
```

**Rationale:**
- Bash is fast for prototyping orchestration logic
- Easy to iterate on prompts and flow
- TypeScript version can come later once design is validated
- Each script is self-contained (no over-abstracted libs)

### 8.6 Testing Strategy

**Approach:** Output-based testing. Check file outputs and formats, not internal functions.

#### File Output Tests

| Command | Expected Output | Validation |
|---------|-----------------|------------|
| `ralph plan vision` | `VISION.md` created/updated | File exists, has required sections |
| `ralph plan stories --auto` | `STORY-NNN.md` files | Files created, match template structure |
| `ralph plan subtasks --auto` | `subtasks.json` | Valid JSON, passes schema validation |
| `ralph build` | Updated `subtasks.json` + `PROGRESS.md` | `done: true` set, progress entry appended |
| `ralph status` | stdout | Correct counts, valid format |

#### Schema Validation

```bash
# Validate subtasks.json against schema
ajv validate -s docs/planning/schemas/subtasks.schema.json -d subtasks.json
```

#### Smoke Tests

```bash
# Each command runs without error
ralph --help          # exits 0
ralph plan --help     # exits 0
ralph status          # exits 0 (even with no subtasks)
```

#### Integration Tests (Dummy Run)

No fixtures - test against real planning structure:

1. Create test milestone with sample task
2. Run `ralph plan subtasks --auto`
3. Verify subtasks.json is valid and sensible
4. Run `ralph build --print` (dry run)
5. Verify prompt includes correct context

#### Test Location

```
tools/tests/e2e/ralph.test.ts    # Extend existing E2E tests
```

**Note:** For bash prototype, focus on E2E tests that verify outputs. Unit tests can come later with TypeScript rewrite.

### 8.7 Implementation Order

**Approach:** Parallel workstreams. Prompts and scripts can be developed simultaneously by different agents.

#### P0: Prerequisites

Before starting workstreams, ensure these are in place:

| Item | Purpose |
|------|---------|
| `jq` available | JSON parsing in bash scripts |
| `ralph.config.json` template | Default config with all options |
| `subtasks.json` update utility | Bash function to read/modify/write JSON |
| `logs/` directory convention | Where iteration diary lives |

#### Workstream A: Prompts (can parallelize internally)

| Priority | Prompt | Purpose |
|----------|--------|---------|
| P1 | `ralph-iteration.md` | Core build loop |
| P1 | `iteration-summary.md` | Hook: summarize session for diary |
| P1 | `pre-build-validation.md` | Alignment check before build |
| P2 | `tasks-auto.md` | Generate tasks (needed before subtasks) |
| P2 | `subtasks-auto.md` | Generate subtasks from tasks |
| P2 | `vision-interactive.md` | Vision planning |
| P2 | `stories-auto.md` | Generate stories |
| P3 | Remaining planning prompts | Full planning coverage |
| P3 | Calibration prompts | Drift detection, self-improvement |

**Note:** `subtasks-auto.md` requires tasks to exist. For P1 testing, create manual `subtasks.json`.

#### Workstream B: Scripts (can parallelize internally)

| Priority | Script | Purpose |
|----------|--------|---------|
| P1 | `ralph.sh` | Entrypoint, dispatch |
| P1 | `build.sh` | Iteration loop |
| P1 | `post-iteration-hook.sh` | Diary entry + notifications |
| P2 | `plan.sh` | Planning workflows |
| P2 | `status.sh` | Progress display |
| P3 | `calibrate.sh` | LLM-as-judge analysis |

#### Workstream C: Skills (after scripts work)

- `ralph-plan/SKILL.md`
- `ralph-build/SKILL.md`
- `ralph-calibrate/SKILL.md`
- `ralph-status/SKILL.md`

#### Integration Points

1. **First integration:** `build.sh` + `ralph-iteration.md` + `post-iteration-hook.sh` + manual `subtasks.json`
   - Validates: Core loop works end-to-end with diary
2. **Second integration:** `plan.sh` + `tasks-auto.md` + `subtasks-auto.md`
   - Validates: Can generate work queue from task definitions
3. **Third integration:** `status.sh` + remaining planning prompts
   - Validates: Full planning-to-building pipeline
4. **Full integration:** All scripts + all prompts + skills + calibration

### 8.8 Calibration as LLM-as-Judge

**Principle:** All calibration is prompt-based, not code-based. Claude analyzes inputs (diffs, session logs) via well-crafted prompts.

**Key prompt elements:**
- Few-shot examples (drift vs acceptable variation)
- Clear criteria for judgment
- Instruction to chunk large inputs if needed
- Output: summary in stdout + task files if issues found

**Session log path:** `~/.claude/projects/<encoded-path>/<sessionId>.jsonl`

**Benefits:**
- No complex TypeScript or heuristic code
- Prompts can evolve without code changes
- Same bash + Claude pattern as other commands

### 8.9 Interactive vs Single-Shot Mode

**Two invocation patterns:**

#### Single-Shot (default for `--auto`)

```bash
# CLI passes prompt directly
claude -p "$(cat $PROMPT_FILE)" --output-format json
```

- Used for: auto-generation, build iterations
- One prompt → one response → done

#### Multi-Turn Interactive (for planning without `--auto`)

```bash
# CLI launches interactive Claude Code session with prompt as initial context
claude -p "$(cat context/workflows/ralph/planning/vision-interactive.md)"
```

- Used for: `ralph plan vision`, `ralph plan stories` (without `--auto`)
- Full tool access (no restrictions)
- Claude asks questions, user responds, iterates
- User exits session manually when satisfied (Ctrl+C or `/exit`)

**CLI flag behavior:**

| Command | Mode |
|---------|------|
| `ralph plan vision` | Multi-turn interactive (always) |
| `ralph plan stories` | Multi-turn interactive |
| `ralph plan stories --auto` | Single-shot |
| `ralph build` | Single-shot per iteration |
| `ralph calibrate` | Single-shot |

**Pre-build validation (`--validate-first`):**

```bash
# Single-shot check before build loop
claude -p "$(cat building/pre-build-validation.md)" --output-format json
# If validation fails, abort build
```

**Pre-build validation prompt** checks subtask alignment with parent chain before implementation starts. Different from intention-drift (which checks commits after implementation).

### 8.10 Permission Handling

**Principle:** Autonomous iterations run with `--dangerously-skip-permissions`. Human stays on the loop via iteration boundaries, not inline permission prompts.

```bash
# Build loop invocation
claude -p "$(cat $PROMPT)" \
       --dangerously-skip-permissions \
       --output-format json
```

**Safety model:**
- Permissions skipped within iteration (agent can edit files, run commands)
- Human checkpoint between iterations (`-i/--interactive` flag)
- Backpressure from validation (build/lint/test must pass)
- Git provides rollback safety (each iteration = commit)

**When to use:**

| Command | Permission Mode |
|---------|----------------|
| `ralph build` | `--dangerously-skip-permissions` (autonomous) |
| `ralph build -i` | Same, but pauses between iterations |
| `ralph plan --auto` | `--dangerously-skip-permissions` (single-shot) |
| `ralph plan` (interactive) | Normal permissions (human in loop) |
| `ralph calibrate` | `--dangerously-skip-permissions` (analysis only) |

**Risk mitigation:**
- Each iteration scoped to single subtask
- Validation gates before commit
- Progress file provides audit trail
- Session ID enables debugging

### 8.11 Hooks & Notifications Implementation

**Config structure:**

```json
{
  "hooks": {
    "onIterationComplete": ["log", "notify"],
    "onMilestoneComplete": ["notify"],
    "onValidationFail": ["log"],
    "onMaxIterationsExceeded": ["notify", "pause"]
  },
  "notifications": {
    "provider": "ntfy",
    "topic": "ralph-builds"
  }
}
```

**Iteration diary mechanism:**

Claude Code hook (not the iteration agent) captures session data:

```bash
# .claude/hooks/post-session.sh (or similar)
# Triggered after each ralph iteration session ends

SESSION_JSONL="$1"  # Path to session JSONL

# Parse JSONL for structured data (no LLM needed)
# Extract: tool calls, errors, files changed
# Append to logs/iterations.jsonl
```

**Diary schema:** `docs/planning/schemas/iteration-diary.schema.json`

```json
{
  "timestamp": "2026-01-13T10:30:00Z",
  "subtaskId": "SUB-001",
  "sessionId": "abc123",
  "status": "completed|failed|retrying",
  "summary": "Implemented JWT auth endpoint. Hit CORS issue, fixed by adding middleware. Tests passing.",
  "toolCalls": 42,
  "errors": 0,
  "filesChanged": ["src/auth.ts", "src/auth.test.ts"],
  "duration": "4m32s"
}
```

**Template:** `docs/planning/templates/iteration-diary.template.json`

**What comes from where:**
- `summary` → haiku generates from session JSONL
- `toolCalls`, `errors`, `filesChanged` → parsed from session JSONL
- `timestamp`, `duration` → computed by hook script
- `subtaskId`, `sessionId`, `status` → passed to hook from build.sh

**Summary generation:** Claude Code hook spawns haiku to generate summary.

**Prompt location:** `context/workflows/ralph/hooks/iteration-summary.md`

**Prompt template:**
```markdown
Summarize this Claude Code session in 1-2 sentences.

Focus on:
- What was accomplished
- Any obstacles/errors encountered
- Final outcome (success/failure/partial)

Session log:
{{SESSION_JSONL_CONTENT}}

Subtask being worked on:
{{SUBTASK_TITLE}}: {{SUBTASK_DESCRIPTION}}

Output JSON:
{"summary": "..."}
```

**ntfy integration:**

```bash
# In build.sh, after iteration completes
if [[ " ${HOOKS[onIterationComplete]} " =~ " notify " ]]; then
  curl -d "SUB-001 completed" "ntfy.sh/${NTFY_TOPIC}"
fi
```

**Status command reads diary:**

```bash
ralph status
# Output includes:
# Last 5 iterations: SUB-001 ✓, SUB-002 ✓, SUB-003 ✗ (retrying)
# Success rate: 87% (last 24h)
# Avg tool calls: 38/iteration
```
