# all-agents

Shared AI configuration and research tools for Claude Code and Cursor. One setup, consistent workflows across all your projects.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Setup](#setup)
- [CLI Tools](#cli-tools)
- [Atomic Documentation](#atomic-documentation)
- [Using with Claude Code](#using-with-claude-code)
- [Using with Cursor](#using-with-cursor)
- [Directory Structure](#directory-structure)
- [Development](#development)
- [Configuration](#configuration)
- [Uninstall](#uninstall)
- [Troubleshooting](#troubleshooting)
- [Roadmap](#roadmap)

## Prerequisites

- [Bun](https://bun.sh) (required)
- [Claude Code](https://claude.ai/download) (Required for full agent/skill functionality. While the CLI tools work standalone, the core value comes from integrating with Claude Code's user config)
- [gh CLI](https://cli.github.com) (optional, for GitHub search)
- [Gemini CLI](https://github.com/google-gemini/gemini-cli) (optional, for Gemini research)

## Setup

### Option 1: Global User Config (Recommended)

Use this repo as your global Claude Code configuration:

```bash
git clone https://github.com/otrebu/all-agents ~/dev/all-agents
cd ~/dev/all-agents/tools
bun install
bun run dev setup --user
```

The setup wizard will:

- Build the CLI binary (`bin/aaa`)
- Create symlink at `~/.local/bin/aaa`
- Check PATH includes `~/.local/bin`
- Prompt to set `CLAUDE_CONFIG_DIR`

**Result:** All Claude Code sessions use this repo's commands, agents, and skills.

> **Note:** `CLAUDE_CONFIG_DIR` is not officially documented. Claude may still create `.claude/settings.local.json` in workspaces.

### Option 2: Project-Level Setup

Add shared documentation to a specific project:

```bash
cd your-project
aaa setup --project
```

This will:

- Check if CLI is installed (warns if not)
- Check/prompt for `CLAUDE_CONFIG_DIR`
- Symlink `context/` → all-agents shared docs
- Create `docs/planning/` and `docs/research/` directories

**Result:** Project gets shared standards via `context/`, keeps local planning/research in `docs/`.

## CLI Tools

The `aaa` binary provides research and search commands:

```bash
# Sync context folder to another project
aaa sync-context --target /path/to/project --watch

# GitHub code search - find real-world examples
aaa gh-search "react hooks typescript"

# Multi-angle web research (up to 30K chars/result)
aaa parallel-search --objective "RAG patterns" --queries "chunking" "retrieval"

# Google Search via Gemini CLI
aaa gemini-research "Next.js 15 features" --mode deep

# Create numbered task/story files
aaa task create my-feature
aaa story create my-story

# Download URLs and convert to markdown
aaa download <urls...> [-o name] [-d dir]

# Ralph - Autonomous Development Framework
#
# "Humans on the loop, not in it." Engineers design specs; agents implement.
# Hierarchy: Vision → Roadmap → Milestone → Story → Task → Subtask
#
aaa ralph plan vision              # Interactive vision planning
aaa ralph build                    # Run iteration loop
aaa ralph build -i                 # Pause between iterations
aaa ralph build --headless         # Headless mode with JSON capture
aaa ralph build --quiet            # Suppress terminal summary (still writes file)
aaa ralph status --subtasks        # Show progress
aaa ralph review subtasks          # Review before building
aaa ralph calibrate intention      # Check for drift
#
# Build completion generates BUILD-SUMMARY-{timestamp}.md with:
# - Completed subtasks and their summaries
# - Git commit range for `git diff` review
# - Stats: completed, failed, cost, duration, files changed
#
# Skills: /ralph-plan, /ralph-build, /ralph-review, /ralph-calibrate, /ralph-status
# Full docs: docs/ralph/README.md | Design spec: docs/planning/VISION.md

# Code Review - Parallel multi-agent review with 11 specialized reviewers
#
# Spawns security, data-integrity, error-handling, test-coverage, maintainability,
# dependency, documentation, accessibility, intent-alignment, over-engineering,
# and performance reviewers in parallel. Synthesizes and triages findings.
#
aaa review                       # Prompt for mode selection
aaa review --supervised          # Watch execution, can intervene
aaa review --headless            # Fully autonomous with auto-triage
aaa review --headless --dry-run  # Preview findings without fixes
aaa review status                # Show review history and statistics
#
# Skill: /dev:code-review | Full docs: docs/planning/VISION.md Section 3.4

# Extract Claude Code conversation history
aaa extract-conversations [-l limit] [-o file]

# Notify - Push notifications via ntfy.sh
#
# Send push notifications to your phone when Claude Code completes tasks.
# Uses ntfy.sh for free, no-auth-required push notifications.
#
aaa notify "Task complete"            # Send notification
aaa notify on                         # Enable notifications
aaa notify off                        # Disable notifications
aaa notify status                     # Show current status
aaa notify config set --topic <topic> # Set your ntfy topic
aaa notify config show                # Display configuration
aaa notify config test                # Send test notification
#
# Options for aaa notify <message>:
#   -t, --title <text>     Notification title
#   -p, --priority <level> Priority: min, low, default, high, max
#   --tags <tags>          Comma-separated tags/emojis
#   -q, --quiet            Suppress output on success
#   --dry-run              Show what would be sent without sending
#   --event <name>         Event name for routing (e.g., ralph:milestoneComplete)
#
# Event routing (via aaa.config.json notify.events):
#   Events map to topic/priority/tags in config. Example config:
#   {
#     "notify": {
#       "defaultTopic": "my-alerts",
#       "events": {
#         "ralph:milestoneComplete": { "topic": "builds", "priority": "high", "tags": ["tada"] },
#         "claude:stop": { "priority": "default" }
#       }
#     }
#   }
#
#   aaa notify --event ralph:milestoneComplete 'Build done!'  # Routes to "builds" topic
#   aaa notify --event unknown:event 'Test'                   # Falls back to defaultTopic
#
# Claude Code hook integration example (in ~/.claude/settings.json):
#   "hooks": {
#     "Stop": [{
#       "hooks": [{ "type": "command", "command": "aaa notify --event claude:stop 'Task complete' --quiet" }]
#     }]
#   }
#
# Config resolution: CLI flags → event config → env vars → config file → defaults
# Env vars: NTFY_TOPIC, NTFY_SERVER, NTFY_PRIORITY
#
# Note: Safe to add to hooks before running `aaa notify init` -
# exits silently (exit 0, no output) when unconfigured.
```

Research outputs are saved to `docs/research/`.

## Reference Management (at-ref)

We use `at-ref` to manage documentation links and compile modular docs into single files. This project relies on `@reference` paths (e.g., `@context/blocks/...`) which `at-ref` handles.

### 1. VS Code Extension

Install the `at-ref` extension (search for `otrebu.at-ref` in marketplace) to enable:

- **Validation**: Real-time red squiggles for broken `@reference` paths.
- **Navigation**: Cmd/Ctrl+Click to follow references.
- **Compilation**: Right-click a file -> "Compile with at-ref" to generate a standalone version.

### 2. CLI Tool

Install the CLI globally to validate references across many files:

```bash
npm install -g @u-b/at-ref
# or
pnpm add -g @u-b/at-ref
```

Verify all references in your project:

```bash
at-ref check
```

### 3. Compilation Strategy

Compilation resolves all `@reference` links into actual content, creating a single, portable markdown file.

**When to compile:**

- **Stacks** (`context/stacks/`) and **Foundations** (`context/foundations/`): These are high-level entry points composed of many blocks. Compiling them creates a complete manual for that specific stack.
- **Blocks** (`context/blocks/`): Usually self-contained or low-level. Rarely need compilation.

**Example:**
Generate a complete guide for the API stack:

```bash
at-ref compile context/stacks/api/rest-fastify.md -o dist/api-guide.md
```

## Atomic Documentation

Documentation that composes like code. Three layers:

| Layer           | Purpose                                  |
| --------------- | ---------------------------------------- |
| **Blocks**      | Single units of knowledge (tool-centric) |
| **Foundations** | Capabilities (how blocks compose)        |
| **Stacks**      | Complete project setups                  |

**Example:** `tools/CLAUDE.md` references `@context/stacks/cli/cli-bun.md` for CLI development context.

**Why compile?** Atomic docs are intentionally granular—a stack references foundations, which reference blocks. Rather than following dozens of links, compile resolves everything into a single file. Use `at-ref compile` from CLI or right-click → "Compile with at-ref" in VS Code.

See [Reference Management](#reference-management-at-ref) for setup. Full spec: **[context/blocks/docs/atomic-documentation.md](context/blocks/docs/atomic-documentation.md)**

## Using with Claude Code

Claude Code extends with three mechanisms:

- **Slash Commands** (`/name`) - Type in chat to trigger. Example: `/dev:git-commit`
- **Skills** - Auto-detected from your request. Example: "what did I work on today?" triggers `dev-work-summary`
- **Sub-agents** - Background workers spawned by skills. Rarely invoked directly.

**Stability:** `stable` = battle-tested | `beta` = works, may evolve | `experimental` = may break

<details>
<summary><strong>Slash Commands</strong> (22 commands)</summary>

| Command                            | Description                                 | Stability    |
| :--------------------------------- | :------------------------------------------ | :----------- |
| `/dev:git-commit`                  | Create conventional commits                 | stable       |
| `/dev:git-multiple-commits`        | Create multiple commits                     | stable       |
| `/dev:start-feature`               | Create/switch feature branches              | stable       |
| `/dev:complete-feature`            | Merge feature to main                       | stable       |
| `/dev:code-review`                 | AI-assisted code review                     | beta         |
| `/dev:consistency-check`           | Verify docs match code, find contradictions | beta         |
| `/dev:interrogate`                 | Surface decisions, alternatives, confidence | experimental |
| `/gh-search`                       | Search GitHub for code examples             | experimental |
| `/gemini-research`                 | Google Search via Gemini                    | experimental |
| `/parallel-search`                 | Multi-angle web research                    | beta         |
| `/create-task`                     | Create numbered task file                   | beta         |
| `/download`                        | Download URLs to markdown                   | beta         |
| `/context:atomic-doc`              | Create/update atomic docs                   | beta         |
| `/context:plan-multi-agent`        | Plan docs with Opus agents                  | experimental |
| `/meta:cli-feature-creator`        | Wizard for adding CLI features              | experimental |
| `/meta:claude-code:create-skill`   | Create a new skill                          | beta         |
| `/meta:claude-code:create-command` | Create a slash command                      | beta         |
| `/meta:claude-code:create-agent`   | Create a sub-agent                          | beta         |
| `/meta:claude-code:create-plugin`  | Scaffold a plugin                           | beta         |
| `/meta:create-cursor-rule`         | Create .cursorrules file                    | experimental |
| `/meta:how-to-prompt`              | Prompting guidance                          | stable       |
| `/meta:optimize-prompt`            | Optimize prompts                            | stable       |

</details>

<details>
<summary><strong>Sub-agents</strong> (20 agents)</summary>

| Agent                            | Description                                       | Stability    | Created    | Used By                     | Action |
| :------------------------------- | :------------------------------------------------ | :----------- | :--------- | :-------------------------- | :----- |
| `atomic-doc-creator`             | Create missing atomic documentation               | experimental | 2026-01-23 | task-generator, ralph-plan  | Requires context/ symlink |
| `conversation-friction-analyzer` | Stage 1: Extract raw friction points from chats   | experimental | 2026-01-05 | analyze-friction skill      | NUKE - duplicate of self-improve |
| `friction-pattern-abstractor`    | Stage 2: Group similar problems, find root causes | experimental | 2026-01-05 | analyze-friction skill      | NUKE - duplicate of self-improve |
| `gemini-research`                | Web research via Gemini CLI                       | experimental | 2025-11-19 | /gemini-research command    | NUKE - doesn't work |
| `parallel-search`                | Multi-angle web research                          | beta         | 2025-11-19 | /parallel-search command    | FIX: (1) agent doesn't invoke CLI, just hallucinates (2) CLI should return formatted markdown like ralph build (3) add --verbose to show full report |
| `subtask-reviewer`               | Review subtasks using vertical slice test         | experimental | 2026-01-26 | ralph-plan skill            | REFACTOR: (1) rename subtasks-common.md → subtask-spec.md (2) DRY up agent to reference spec instead of duplicating vertical slice test + sizing modes |
| `task-generator`                 | Generate technical tasks from stories             | experimental | 2026-01-23 | ralph-plan skill            | REFACTOR: remove embedded template (lines 119-154), just reference task-template.md |
| `accessibility-reviewer`         | WCAG, keyboard nav, ARIA, color contrast          | experimental | 2026-01-26 | parallel-code-review skill  | REFACTOR: reference @context/blocks/quality/accessibility.md |
| `data-integrity-reviewer`        | Null checks, race conditions, schema violations   | experimental | 2026-01-25 | parallel-code-review skill  | REFACTOR: find/create atomic doc, DRY up |
| `dependency-reviewer`            | Version compat, licenses, circular deps           | experimental | 2026-01-26 | parallel-code-review skill  | REFACTOR: find/create atomic doc, DRY up |
| `documentation-reviewer`         | Docstrings, API docs, README gaps                 | experimental | 2026-01-26 | parallel-code-review skill  | REFACTOR: find/create atomic doc, DRY up |
| `error-handling-reviewer`        | Swallowed exceptions, missing catch, async issues | experimental | 2026-01-25 | parallel-code-review skill  | REFACTOR: find/create atomic doc, DRY up |
| `intent-alignment-reviewer`      | Code matches specification                        | experimental | 2026-01-26 | parallel-code-review skill  | REFACTOR: find/create atomic doc, DRY up |
| `maintainability-reviewer`       | Coupling, naming, DRY, SRP issues                 | experimental | 2026-01-25 | parallel-code-review skill  | REFACTOR: reference @context/blocks/quality/coding-style.md |
| `over-engineering-reviewer`      | YAGNI, premature abstraction                      | experimental | 2026-01-26 | parallel-code-review skill  | REFACTOR: find/create atomic doc, DRY up |
| `performance-reviewer`           | O(n²), memory leaks, N+1 queries                  | experimental | 2026-01-26 | parallel-code-review skill  | REFACTOR: find/create atomic doc, DRY up |
| `security-reviewer`              | OWASP Top 10, injection, XSS, auth, secrets       | experimental | 2026-01-25 | parallel-code-review skill  | REFACTOR: find/create atomic doc, DRY up |
| `test-coverage-reviewer`         | Missing tests, untested branches, assertions      | experimental | 2026-01-25 | parallel-code-review skill  | REFACTOR: reference @context/blocks/test/testing.md |
| `synthesizer`                    | Aggregate and dedupe findings from reviewers      | experimental | 2026-01-25 | parallel-code-review skill  | - |

</details>

<details>
<summary><strong>Skills</strong> (13 skills)</summary>

| Skill                  | Description                                    | Stability    |
| :--------------------- | :--------------------------------------------- | :----------- |
| `analyze-friction`     | 3-stage workflow: extract → abstract → approve | experimental |
| `brainwriting`         | 5 parallel idea explorations, then synthesize  | beta         |
| `dev-work-summary`     | Scan ~/dev for today's git work                | beta         |
| `eval-test-skill`      | List and delete branches merged to main        | experimental |
| `parallel-code-review` | Orchestrate 11 reviewers in parallel           | experimental |
| `ralph-build`          | Autonomous build loop for subtasks             | experimental |
| `ralph-calibrate`      | Check intention drift, technical quality       | experimental |
| `ralph-plan`           | Interactive vision planning (Socratic method)  | experimental |
| `ralph-review`         | Review auto-generated planning artifacts       | experimental |
| `ralph-status`         | Display build progress and stats               | experimental |
| `story-create`         | Create story files, prompt for linked tasks    | beta         |
| `task-create`          | Create task files                              | beta         |
| `walkthrough`          | Present items one at a time interactively      | experimental |

</details>

## Using with Cursor

Generate `.cursorrules` files using the `/meta:create-cursor-rule` command. The shared documentation in `context/` can be referenced by both Claude Code and Cursor.

### Cursor Integration with Symlinked `context/`

When your project has `context/` symlinked from this repo:

**`.cursorrules` (root-level)**

```
@context/blocks/principles/coding-style.md
@context/blocks/principles/prompting.md
```

**`.cursor/rules/*.mdc` (modular rules)**

```markdown
---
description: TypeScript coding standards
globs: ["**/*.ts", "**/*.tsx"]
---

Follow guidelines in @context/stacks/ and @context/foundations/
```

## Directory Structure

```
all-agents/
├── bin/                   # Compiled binary (gitignored)
├── context/               # SHAREABLE (symlink to projects)
│   ├── blocks/            # Atomic building blocks
│   │   ├── tools/         # Single-tech docs (bun, node, react, etc.)
│   │   ├── principles/    # Universal philosophies
│   │   └── patterns/      # Context-specific techniques
│   ├── foundations/       # Platform combos + execution strategies
│   ├── stacks/            # Complete app shapes (CLI, API, frontend)
│   └── workflows/         # Dev processes (commit, review, etc.)
├── docs/                  # PROJECT-LOCAL (not shared)
│   ├── planning/          # Tasks, stories
│   └── research/          # Generated research outputs
├── tools/                 # CLI source code
│   ├── src/cli.ts         # Entry point
│   ├── src/commands/      # Command implementations
│   └── lib/               # Shared utilities
├── .claude/               # Claude Code config
│   ├── commands/          # Slash commands
│   ├── agents/            # Sub-agents
│   └── skills/            # Skills
├── CLAUDE.md              # Dev reference (stack, extending CLI)
└── README.md              # This file
```

See **[context/README.md](context/README.md)** for full documentation index.

## Development

```bash
cd tools

bun install           # Install dependencies
bun run build         # Build CLI → bin/aaa
bun run dev <cmd>     # Dev mode
bun run test          # E2E tests (requires API keys)
bun run lint          # Linting
bun run lint:fix      # Auto-fix
```

### Testing Requirements

- `gh-search`: GitHub token via `gh auth login` or `GITHUB_TOKEN`
- `parallel-search`: `AAA_PARALLEL_API_KEY` env var
- `gemini-research`: Skipped by default (set `GEMINI_TEST_ENABLED=1` to run)

## Configuration

Environment variables (create `tools/.env` from `.env.example`):

| Variable               | Required            | Description                              |
| ---------------------- | ------------------- | ---------------------------------------- |
| `AAA_PARALLEL_API_KEY` | For parallel-search | [Get key](https://platform.parallel.ai/) |
| `AAA_GITHUB_TOKEN`     | No                  | Falls back to `gh auth`                  |
| `AAA_DEBUG`            | No                  | Enable verbose logging                   |

## Uninstall

```bash
aaa uninstall --user    # Remove global installation
aaa uninstall --project # Remove project integration
```

Or manually: remove `~/.local/bin/aaa` symlink and unset `CLAUDE_CONFIG_DIR`.

## Troubleshooting

**`command not found: aaa`**
Add `~/.local/bin` to PATH. For zsh: `echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.zshrc` then restart terminal.

**`command not found: bun`**
Install Bun: `curl -fsSL https://bun.sh/install | bash`

**Commands work in terminal but not in Claude Code**
Set `CLAUDE_CONFIG_DIR` environment variable to point to all-agents root directory.

**API commands fail silently**
Check `tools/.env` exists with required keys. Run with `AAA_DEBUG=true` for verbose output.

## Roadmap

See **[docs/planning/roadmap.md](docs/planning/roadmap.md)** for project vision, implementation status, and planned features.

## License

MIT
