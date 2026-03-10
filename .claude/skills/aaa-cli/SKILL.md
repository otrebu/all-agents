---
name: aaa-cli
description: "Complete reference for using the All Agents CLI (`aaa`). Use this skill whenever the user asks to run an aaa command, wants to plan/build/review with Ralph, needs to know the right CLI invocation, asks about available commands or flags, mentions 'aaa', 'ralph', 'subtasks', 'milestones', 'cascade', or needs help constructing any `aaa` CLI command. Also trigger when user says things like 'plan stories', 'build the queue', 'check status', 'review subtasks', 'run calibration', or any development workflow task that maps to an aaa command."
---

# AAA CLI Reference

The `aaa` CLI (All-Agents CLI Toolkit) is the command-line interface for research, planning, building, and reviewing in the all-agents workflow. This skill is your cheat sheet — use it to pick the exact command and flags for whatever the user is asking.

## Command Map

```
aaa
├── ralph                     # Autonomous dev framework (the big one)
│   ├── plan                  # Planning: vision → roadmap → stories → tasks → subtasks
│   │   ├── vision            # Interactive vision planning (Socratic method)
│   │   ├── roadmap           # Interactive roadmap planning
│   │   ├── stories           # Plan stories for a milestone
│   │   ├── tasks             # Plan tasks (from story, milestone, file, or text)
│   │   └── subtasks          # Generate subtasks (from milestone, story, task, file, text, or review-diary)
│   ├── review                # Review planning artifacts
│   │   ├── stories           # Review stories quality
│   │   ├── roadmap           # Review roadmap quality
│   │   ├── tasks             # Review tasks quality
│   │   ├── subtasks          # Review subtask queue before building
│   │   └── gap               # Cold gap analysis (roadmap/stories/tasks/subtasks)
│   ├── build                 # Run autonomous build loop
│   ├── status                # Show build progress
│   ├── subtasks              # Queue operations (next/list/complete/append/prepend/diff/apply)
│   ├── calibrate             # Drift checks (intention/technical/improve/all)
│   ├── milestones            # List milestones from roadmap
│   ├── models                # List available models
│   ├── refresh-models        # Discover models from providers
│   └── archive               # Archive completed subtasks/progress
├── review                    # Multi-agent code review
├── parallel-search           # Multi-angle web research
├── gh-search                 # GitHub code search
├── gemini-research           # Google Search via Gemini
├── extract-conversations     # Export Claude Code chat history
├── session                   # Manage session files (path/cat/list/current)
├── task create               # Create numbered task file
├── story create              # Create numbered story file
├── setup                     # Install aaa (--user or --project)
├── uninstall                 # Uninstall aaa
├── sync-context              # Sync context/ to another project
├── notify                    # Push notifications via ntfy.sh
└── completion                # Shell tab-completion scripts
```

---

## Ralph: The Planning & Build System

Ralph follows a hierarchy: **Vision → Roadmap → Stories → Tasks → Subtasks → Build**

Each level can be planned, reviewed, and cascaded forward to the next.

### Modes (shared across most ralph commands)

| Flag | Mode | Behavior |
|------|------|----------|
| `-H, --headless` | Headless | Fully autonomous, JSON output + file logging |
| `-s, --supervised` | Supervised | Watch execution, can intervene |
| `-p, --print` | Print | Output the prompt without executing (build only) |
| `--dry-run` | Dry run | Preview execution plan, don't run |

**Practical default: Use `--headless` (`-H`) for most operations.** While supervised is the technical CLI default, headless is the standard way to run planning, building, and review commands. Only use supervised when you specifically want to watch and intervene during execution.

### Provider & Model (shared across ralph commands)

| Flag | Purpose | Default |
|------|---------|---------|
| `--provider <name>` | AI provider | `claude` |
| `--model <name>` | Model name from registry | provider default |

**Available providers:** `claude`, `cursor`, `codex`, `opencode`

#### Common provider/model combos

```bash
# Claude (default provider) — opus is the go-to
--provider claude --model claude-opus-4-6
--provider claude --model opus          # alias for claude-opus-4-6

# Codex — for OpenAI models
--provider codex --model gpt-5.4        # latest frontier agentic model
--provider codex --model gpt-5.3-codex
--provider codex --model gpt-5.3-codex-high   # higher quality, more expensive

# Cursor — broad model access
--provider cursor --model opus-4.6
--provider cursor --model gpt-5.3-codex
```

When the user asks to use a specific provider/model, always include both `--provider` and `--model` flags. Run `aaa ralph models` to see the full registry, or `aaa ralph models --provider <name>` to filter. If a model isn't found, try `aaa ralph refresh-models` to discover newly available models.

### Approval Flags (shared across plan/build/calibrate)

| Flag | Behavior |
|------|----------|
| `--force` | Auto-apply proposals, skip prompts |
| `--review` | Require explicit approval for all proposals |

---

## Planning Commands

### `aaa ralph plan vision`

Interactive Socratic dialogue to define product vision. No flags needed.

```bash
aaa ralph plan vision
aaa ralph plan vision --provider cursor --model opus-4.6
```

### `aaa ralph plan roadmap`

Interactive roadmap planning. Reads VISION.md first.

```bash
aaa ralph plan roadmap
aaa ralph plan roadmap --cascade stories    # plan roadmap, then cascade into stories
aaa ralph plan roadmap --force              # skip approval prompts
```

### `aaa ralph plan stories`

Plan stories for a milestone.

```bash
aaa ralph plan stories --milestone docs/planning/milestones/003-my-feature
aaa ralph plan stories --milestone 003-my-feature   # name lookup also works
aaa ralph plan stories --milestone 003-my-feature --headless
aaa ralph plan stories --milestone 003-my-feature --cascade tasks
aaa ralph plan stories --milestone 003-my-feature --cascade build  # all the way to build
aaa ralph plan stories --milestone 003-my-feature --with-reviews --cascade build
```

### `aaa ralph plan tasks`

Plan tasks from a story, milestone, file, or text.

```bash
# From hierarchy
aaa ralph plan tasks --story docs/planning/milestones/003/stories/001-auth.md
aaa ralph plan tasks --milestone 003-my-feature                  # all stories → tasks
aaa ralph plan tasks --milestone 003-my-feature --headless

# From alternative sources
aaa ralph plan tasks --file ./spec.md
aaa ralph plan tasks --text "Add user authentication with JWT"

# Cascade forward
aaa ralph plan tasks --milestone 003-my-feature --cascade subtasks
aaa ralph plan tasks --story path/to/story.md --cascade subtasks --cascade build
```

### `aaa ralph plan subtasks`

Generate subtasks — the atomic work units that the build loop executes.

```bash
# From hierarchy (most common)
aaa ralph plan subtasks --milestone 003-my-feature
aaa ralph plan subtasks --milestone 003-my-feature --headless
aaa ralph plan subtasks --story path/to/story.md
aaa ralph plan subtasks --task path/to/task.md

# From alternative sources
aaa ralph plan subtasks --file ./findings.md
aaa ralph plan subtasks --text "Fix the off-by-one error in pagination"
aaa ralph plan subtasks --review-diary                           # parse logs/reviews.jsonl

# Sizing control
aaa ralph plan subtasks --milestone 003-my-feature --size small  # thinnest viable slices
aaa ralph plan subtasks --milestone 003-my-feature --size medium # one PR per subtask (default)
aaa ralph plan subtasks --milestone 003-my-feature --size large  # major boundaries only

# Cascade into build
aaa ralph plan subtasks --milestone 003-my-feature --cascade build
aaa ralph plan subtasks --milestone 003-my-feature --cascade build --validate-first
aaa ralph plan subtasks --milestone 003-my-feature --cascade build --calibrate-every 3

# Output control (for --file/--text with no milestone context)
aaa ralph plan subtasks --file ./spec.md --output-dir docs/planning/milestones/003-my-feature

# With reviews before cascading
aaa ralph plan subtasks --milestone 003-my-feature --with-reviews --cascade build
```

---

## Cascade: Chaining Commands Forward

Cascade is the power-user pattern — it chains one planning level into the next automatically. Instead of running 4 separate commands, you start from wherever you are and cascade forward.

### How it works

Add `--cascade <target>` to any plan command to continue forward after it completes. The cascade runs each subsequent level until it reaches the target.

### Cascade targets by command

| Start from | Valid cascade targets |
|------------|---------------------|
| `plan roadmap` | `stories`, `tasks`, `subtasks`, `build` |
| `plan stories` | `tasks`, `subtasks`, `build` |
| `plan tasks` | `subtasks`, `build` |
| `plan subtasks` | `build`, `calibrate` |
| `build` | `calibrate` |

### Common cascade patterns

```bash
# "Plan everything from stories down to build for this milestone"
aaa ralph plan stories --milestone 003-feature --cascade build --headless

# "Generate subtasks and immediately start building"
aaa ralph plan subtasks --milestone 003-feature --cascade build

# "Build and then calibrate when done"
aaa ralph build --cascade calibrate

# "Plan subtasks, review them, then build"
aaa ralph plan subtasks --milestone 003-feature --with-reviews --cascade build

# Resume from a specific level (if a cascade was interrupted)
aaa ralph plan stories --milestone 003-feature --from tasks --cascade build
```

### `--from <level>`: Resume a cascade

If a cascade was interrupted or you want to skip earlier levels, use `--from` to jump to a specific point:

```bash
# Skip stories planning, start from tasks, cascade to build
aaa ralph plan stories --milestone 003-feature --from tasks --cascade build
```

---

## Build Commands

### `aaa ralph build`

Run the autonomous build loop — picks up subtasks from the queue and executes them.

```bash
# Basic build (supervised, default)
aaa ralph build

# Headless (autonomous, for CI or background)
aaa ralph build --headless

# With specific subtasks file
aaa ralph build --subtasks docs/planning/milestones/003-feature/subtasks.json

# With validation before starting
aaa ralph build --validate-first

# With periodic calibration
aaa ralph build --calibrate-every 5    # calibrate every 5 iterations

# Limit iterations
aaa ralph build --max-iterations 10

# With a different provider/model
aaa ralph build --provider cursor --model opus-4.6

# Build then calibrate
aaa ralph build --cascade calibrate

# Preview what would happen
aaa ralph build --dry-run

# Combine options
aaa ralph build --headless --validate-first --calibrate-every 3 --cascade calibrate
```

### `aaa ralph status`

Show current build progress and queue state.

```bash
aaa ralph status
aaa ralph status --subtasks docs/planning/milestones/003-feature/subtasks.json
```

---

## Subtask Queue Operations

Direct manipulation of the subtask queue — useful for inspecting, modifying, or managing what gets built.

### `aaa ralph subtasks list`

```bash
aaa ralph subtasks list --milestone 003-feature
aaa ralph subtasks list --milestone 003-feature --pending   # only pending items
aaa ralph subtasks list --milestone 003-feature --limit 10
aaa ralph subtasks list --milestone 003-feature --json       # machine-readable
```

### `aaa ralph subtasks next`

Get the next runnable subtask (what the build loop would pick up).

```bash
aaa ralph subtasks next --milestone 003-feature
aaa ralph subtasks next --milestone 003-feature --json
```

### `aaa ralph subtasks complete`

Mark a subtask as done.

```bash
aaa ralph subtasks complete --milestone 003-feature --id SUB-001
aaa ralph subtasks complete --milestone 003-feature --id SUB-001 --commit abc123 --session sess-id
```

### `aaa ralph subtasks append / prepend`

Add subtasks to the end or beginning of the queue.

```bash
aaa ralph subtasks append --subtasks path/to/subtasks.json --file new-subtasks.json
aaa ralph subtasks prepend --subtasks path/to/subtasks.json --file urgent-subtasks.json
aaa ralph subtasks append --subtasks path/to/subtasks.json --dry-run --file preview.json
```

### `aaa ralph subtasks diff / apply`

Preview and apply queue proposals (used by validation/calibration).

```bash
aaa ralph subtasks diff --proposal proposal.json --subtasks path/to/subtasks.json
aaa ralph subtasks apply --proposal proposal.json --subtasks path/to/subtasks.json
```

---

## Review Commands

### Standard Reviews

Review planning artifacts for quality, gaps, and alignment.

```bash
aaa ralph review roadmap
aaa ralph review stories --milestone docs/planning/milestones/003-feature
aaa ralph review tasks --story docs/planning/milestones/003/stories/001-auth.md
aaa ralph review subtasks --subtasks docs/planning/milestones/003-feature/subtasks.json

# Headless mode (for automation)
aaa ralph review stories --milestone 003-feature --headless
aaa ralph review subtasks --subtasks path/to/subtasks.json --headless --dry-run
```

### Gap Analysis

Cold, independent analysis of planning artifacts for blind spots and risks. Unlike standard reviews which check quality, gap analysis looks for what's missing.

```bash
aaa ralph review gap roadmap
aaa ralph review gap stories --milestone docs/planning/milestones/003-feature
aaa ralph review gap tasks --story docs/planning/milestones/003/stories/001-auth.md
aaa ralph review gap subtasks --subtasks docs/planning/milestones/003-feature/subtasks.json
```

---

## Calibration Commands

Calibration checks for drift after building — did the code match the plan? Are there quality issues?

```bash
# Run all calibration checks
aaa ralph calibrate all
aaa ralph calibrate all --milestone 003-feature

# Individual checks
aaa ralph calibrate intention                    # code vs planning docs drift
aaa ralph calibrate intention --milestone 003-feature
aaa ralph calibrate technical                    # code quality issues
aaa ralph calibrate technical --milestone 003-feature
aaa ralph calibrate improve                      # self-improvement from session logs

# Approval control
aaa ralph calibrate all --force                  # auto-apply fixes
aaa ralph calibrate all --review                 # require approval for each fix

# Preview
aaa ralph calibrate intention --dry-run
```

---

## Archive Commands

Manage file sizes by archiving completed work.

```bash
aaa ralph archive subtasks --subtasks path/to/subtasks.json --milestone 003-feature
aaa ralph archive progress --progress path/to/PROGRESS.md
```

---

## Milestone & Model Discovery

```bash
# List milestones
aaa ralph milestones
aaa ralph milestones --json

# List models
aaa ralph models
aaa ralph models --provider claude
aaa ralph models --provider cursor
aaa ralph models --json

# Refresh model registry from providers
aaa ralph refresh-models
aaa ralph refresh-models --provider claude --dry-run
aaa ralph refresh-models --prune   # remove models no longer available
```

---

## Code Review

Multi-agent parallel code review (not part of Ralph, but a top-level `aaa` command).

```bash
# Review current changes (supervised, default)
aaa review

# Headless (autonomous)
aaa review --headless

# Specific diff targets
aaa review --base main                          # compare HEAD vs main
aaa review --range abc123..def456               # specific commit range
aaa review --staged-only                        # only staged changes
aaa review --unstaged-only                      # only unstaged changes

# With approval before fixes
aaa review --headless --require-approval
aaa review --headless --dry-run                 # preview, don't fix

# Review history
aaa review status
```

---

## Research Commands

```bash
# Multi-angle web research
aaa parallel-search --objective "best practices for X" --queries "query1" "query2"
aaa parallel-search --objective "how to do X" --max-results 10 --verbose

# GitHub code search
aaa gh-search "commander.js subcommand pattern"

# Google Search via Gemini
aaa gemini-research "latest TypeScript patterns" --mode deep
aaa gemini-research "bun test mocking" --mode code
```

---

## Utility Commands

```bash
# Session management
aaa session current                              # current session ID
aaa session list                                 # recent sessions
aaa session list --limit 5 --verbose             # detailed table
aaa session path <session-id>                    # file path for a session
aaa session path --commit abc123                 # session from a commit
aaa session cat <session-id>                     # dump session JSONL

# Extract conversation history
aaa extract-conversations --limit 10 --output history.md
aaa extract-conversations --skip 5 --limit 5    # skip 5 most recent

# Create planning files
aaa task create my-task-name --milestone 003-feature --story 1
aaa story create my-story-name --milestone 003-feature

# Notifications
aaa notify "Build complete!" --title "Ralph" --priority high
aaa notify --event ralph:milestoneComplete "Milestone 003 done"
aaa notify init                                  # first-time setup
aaa notify on / off / status                     # toggle notifications

# Setup
aaa setup --user                                 # global CLI setup
aaa setup --project                              # current project setup
aaa setup --user --worktree /path/to/worktree    # switch to worktree

# Sync context
aaa sync-context --target /path/to/project
aaa sync-context --target /path/to/project --watch

# Shell completion
aaa completion bash >> ~/.bashrc
aaa completion zsh >> ~/.zshrc
aaa completion fish > ~/.config/fish/completions/aaa.fish
```

---

## Quick Decision Guide

**"I want to..."**

| Intent | Command |
|--------|---------|
| Start a new project from scratch | `aaa ralph plan vision` |
| Break a vision into milestones | `aaa ralph plan roadmap` |
| Create stories for a milestone | `aaa ralph plan stories --milestone <name>` |
| Create tasks for a story | `aaa ralph plan tasks --story <path>` |
| Create tasks for a whole milestone | `aaa ralph plan tasks --milestone <name>` |
| Generate subtasks for a milestone | `aaa ralph plan subtasks --milestone <name>` |
| Generate subtasks from a text description | `aaa ralph plan subtasks --text "description"` |
| Plan everything and build in one go | `aaa ralph plan stories --milestone <name> --cascade build -H` |
| Just build what's in the queue | `aaa ralph build -H` |
| Build with Claude Opus | `aaa ralph build -H --provider claude --model opus` |
| Build with Codex | `aaa ralph build -H --provider codex --model gpt-5.4` |
| See what's pending | `aaa ralph subtasks list --milestone <name> --pending` |
| See build progress | `aaa ralph status` |
| Review before building | `aaa ralph review subtasks --subtasks <path>` |
| Check for drift after building | `aaa ralph calibrate all --milestone <name>` |
| Review code changes | `aaa review --base main` |
| Search the web for research | `aaa parallel-search --objective "question"` |
| Find code examples on GitHub | `aaa gh-search "query"` |
| Archive completed work | `aaa ralph archive subtasks --milestone <name>` |
