# all-agents

If you use Claude Code across multiple projects, you're repeating yourself — same CLAUDE.md, same workflows, same prompts copied everywhere. all-agents gives you a single source of truth: one config, every project inherits it.

It includes `aaa`, a CLI toolkit with autonomous planning (Ralph), parallel code review, web research, and push notifications — plus 18 skills and 9 slash commands for Claude Code.

## Prerequisites

- [Bun](https://bun.sh) (required)
- [Claude Code](https://claude.ai/download) (required for full value — skills, agents, slash commands)
- [gh CLI](https://cli.github.com) (optional, for GitHub search)

## Quickstart

```bash
git clone https://github.com/otrebu/all-agents ~/dev/all-agents
cd ~/dev/all-agents/tools && bun install
bun run dev setup --user

# Now try it in any project:
cd ~/your-project
aaa setup --project              # Link shared config
aaa review --base main --dry-run # Find issues in your changes (11 parallel reviewers)
```

**`command not found: bun`** — Install: `curl -fsSL https://bun.sh/install | bash`
**`command not found: aaa`** — Add `~/.local/bin` to PATH: `echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.zshrc`

## What You Get

| What | Command | Description |
|------|---------|-------------|
| Plan features with AI | `aaa ralph plan vision` | Interactive planning — vision, roadmap, stories, subtasks |
| Build autonomously | `aaa ralph build` | Agents implement subtasks one by one with validation gates |
| Refresh model registry | `aaa ralph refresh-models` | Discover provider models and update the dynamic registry |
| Review code (11 agents) | `aaa review --headless` | Security, data integrity, performance, accessibility, and more |
| Research the web | `aaa parallel-search` | Multi-angle web research with up to 30K chars/result |
| Get notified | `aaa notify "Done"` | Push notifications when Claude finishes work |
| Search GitHub | `aaa gh-search "react hooks"` | Find real-world code examples with intent-based ranking |
| Sync context | `aaa sync-context --target ~/project` | Share docs across projects with watch mode |

**Ralph** is an autonomous dev framework: you define a vision, and agents plan, build, review, and calibrate — while you stay on the loop, not in it. Each iteration is memoryless (fresh context, no drift). Full docs: [docs/ralph/README.md](docs/ralph/README.md)

```bash
aaa ralph build --provider opencode --model openai/gpt-5.3-codex
aaa ralph build --provider cursor
aaa ralph build --provider codex --model gpt-5.3-codex
```

Full CLI reference: [tools/README.md](tools/README.md)

## Setup

| | Global (Recommended) | Project-Level |
|---|---|---|
| Use when | You want all-agents everywhere | You want it in one specific project |
| What it does | All Claude Code sessions inherit config | Just that project gets shared docs |
| Command | `bun run dev setup --user` | `aaa setup --project` |

### Global User Config

```bash
git clone https://github.com/otrebu/all-agents ~/dev/all-agents
cd ~/dev/all-agents/tools
bun install
bun run dev setup --user
```

The setup wizard builds the CLI binary, creates `~/.local/bin/aaa`, checks your PATH, and prompts to set `CLAUDE_CONFIG_DIR`.

**Result:** All Claude Code sessions use this repo's commands, agents, and skills.

> **Note:** `CLAUDE_CONFIG_DIR` is not officially documented. Claude may still create `.claude/settings.local.json` in workspaces.

### Project-Level Setup

```bash
cd your-project
aaa setup --project
```

Links `context/` to all-agents shared docs, creates `docs/planning/` and `docs/research/` directories, and checks `CLAUDE_CONFIG_DIR`.

**Result:** Project gets shared standards via `context/`, keeps local planning/research in `docs/`.

## Using with Claude Code

Claude Code extends with three mechanisms:

- **Slash Commands** (`/name`) — Type in chat to trigger. Example: `/dev:git-commit`
- **Skills** — Auto-detected from your request. Example: "what did I work on today?" triggers `dev-work-summary`
- **Sub-agents** — Background workers spawned by skills. Rarely invoked directly.

**Stability:** `stable` = battle-tested | `beta` = works, may evolve | `experimental` = may break

<details>
<summary><strong>Slash Commands</strong> (9 commands)</summary>

| Command | Description | Stability |
|:--------|:------------|:----------|
| `/dev:git-commit` | Create conventional commits | stable |
| `/dev:git-multiple-commits` | Create multiple commits | stable |
| `/dev:start-feature` | Create/switch feature branches | stable |
| `/dev:complete-feature` | Merge feature to main | stable |
| `/dev:consistency-check` | Verify docs match code, find contradictions | beta |
| `/parallel-search` | Multi-angle web research | beta |
| `/context:plan-multi-agent` | Plan docs with Opus agents | experimental |
| `/meta:claude-code:create-skill` | Create a new skill | beta |
| `/meta:claude-code:create-agent` | Create a sub-agent | beta |
| `/meta:create-cursor-rule` | Create .cursorrules file | experimental |

</details>

<details>
<summary><strong>Sub-agents</strong> (17 agents)</summary>

| Agent | Description | Stability |
|:------|:------------|:----------|
| `atomic-doc-creator` | Create missing atomic documentation | experimental |
| `parallel-search` | Multi-angle web research | beta |
| `subtask-reviewer` | Review subtasks using vertical slice test | experimental |
| `task-generator` | Generate technical tasks from stories | experimental |
| `accessibility-reviewer` | WCAG, keyboard nav, ARIA, color contrast | experimental |
| `data-integrity-reviewer` | Null checks, race conditions, schema violations | experimental |
| `dependency-reviewer` | Version compat, licenses, circular deps | experimental |
| `documentation-reviewer` | Docstrings, API docs, README gaps | experimental |
| `error-handling-reviewer` | Swallowed exceptions, missing catch, async issues | experimental |
| `intent-alignment-reviewer` | Code matches specification | experimental |
| `maintainability-reviewer` | Coupling, naming, DRY, SRP issues | experimental |
| `over-engineering-reviewer` | YAGNI, premature abstraction | experimental |
| `performance-reviewer` | O(n^2), memory leaks, N+1 queries | experimental |
| `security-reviewer` | OWASP Top 10, injection, XSS, auth, secrets | experimental |
| `test-coverage-reviewer` | Missing tests, untested branches, assertions | experimental |
| `synthesizer` | Aggregate and dedupe findings from reviewers | experimental |
| `triage` | Curate findings: select must-review, group by root cause, filter noise | experimental |

</details>

<details>
<summary><strong>Skills</strong> (18 skills)</summary>

| Skill | Description | Stability |
|:------|:------------|:----------|
| `aaa-feature-wizard` | Wizard for adding new aaa CLI commands | experimental |
| `brainwriting` | 5 parallel idea explorations, then synthesize | beta |
| `context-atomic-doc` | Create/update atomic docs (blocks, foundations, stacks) | experimental |
| `dev-work-summary` | Scan ~/dev for today's git work | beta |
| `doc-analyze` | Tiered doc analysis (T1: Haiku lookup, T2: Sonnet gaps, T3: Opus deep) | experimental |
| `gh-search` | Search GitHub for code examples and patterns | experimental |
| `interrogate-on-changes` | Surface decisions, alternatives, confidence | experimental |
| `code-review` | Orchestrate 11 reviewers in parallel | experimental |
| `ralph-build` | Autonomous build loop for subtasks | experimental |
| `ralph-calibrate` | Check intention drift, technical quality | experimental |
| `ralph-plan` | Interactive vision planning (Socratic method) | experimental |
| `ralph-review` | Review auto-generated planning artifacts | experimental |
| `ralph-status` | Display build progress and stats | experimental |
| `ralph-prompt-audit` | Audit ralph command examples in prompts vs live CLI | experimental |
| `run-guide-and-fix` | Walk through GUIDE.md with agent-browser, fix bugs | experimental |
| `write-guide` | Generate comprehensive GUIDE.md for a milestone | experimental |
| `setup-lint-staged` | Set up lint-staged for optimized pre-commit validation | experimental |
| `walkthrough` | Present items one at a time interactively | experimental |

</details>

<details>
<summary><strong>Notification Integration</strong> (Claude Code hooks)</summary>

Get push notifications when Claude Code completes tasks or needs permission. Uses the `aaa notify` CLI with event routing.

**Setup:**

1. Configure your notify topic: `aaa notify init`
2. The hooks in `.claude/settings.json` are pre-configured:

```json
{
  "hooks": {
    "Stop": [{
      "hooks": [{ "type": "command", "command": "aaa notify --event claude:stop 'Task complete' --quiet" }]
    }],
    "Notification": [{
      "matcher": "permission_prompt",
      "hooks": [{ "type": "command", "command": "aaa notify --event claude:permissionPrompt 'Permission needed' --quiet" }]
    }]
  }
}
```

**Event routing** uses `aaa.config.json` to customize notifications per event:

```json
{
  "notify": {
    "defaultTopic": "claude",
    "events": {
      "claude:stop": { "priority": "default" },
      "claude:permissionPrompt": { "topic": "critical", "priority": "max" }
    }
  }
}
```

**Available events:** `claude:stop` (task completed), `claude:permissionPrompt` (permission required)

**Note:** Hooks are safe before running `aaa notify init` — they exit silently when unconfigured.

</details>

<details>
<summary><strong>Using with Cursor</strong></summary>

Generate `.cursorrules` files using the `/meta:create-cursor-rule` command. The shared documentation in `context/` can be referenced by both Claude Code and Cursor.
Cursor is also a Ralph provider via `aaa ralph build --provider cursor`; this is separate from `.cursorrules` generation.

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

</details>

## Configuration

Minimal example — create `aaa.config.json` in your project root:

```json
{
  "$schema": "./docs/planning/schemas/aaa-config.schema.json",
  "notify": { "enabled": true, "defaultTopic": "my-project" },
  "ralph": { "build": { "maxIterations": 3 } }
}
```

| Section | What you can configure |
|---------|----------------------|
| `notify` | Push notifications via ntfy.sh — topics, priorities, quiet hours, event routing |
| `ralph` | Autonomous build hooks, self-improvement mode, iteration limits |
| `review` | Auto-fix threshold, diary location |
| `research` | Output directory, result limits for GitHub/parallel search |

<details>
<summary><strong>Full config example</strong></summary>

```json
{
  "$schema": "./docs/planning/schemas/aaa-config.schema.json",

  "notify": {
    "enabled": true,
    "server": "https://ntfy.sh",
    "defaultTopic": "my-project",
    "defaultPriority": "high",
    "quietHours": { "enabled": true, "startHour": 22, "endHour": 8 },
    "events": {
      "ralph:milestoneComplete": { "topic": "builds", "priority": "high", "tags": ["tada"] },
      "ralph:subtaskComplete": { "priority": "default" },
      "claude:stop": { "enabled": false },
      "claude:permissionPrompt": { "topic": "critical", "priority": "max" }
    }
  },

  "ralph": {
    "hooks": {
      "onIterationComplete": ["log"],
      "onSubtaskComplete": ["log", "notify"],
      "onMilestoneComplete": ["log", "notify"],
      "onValidationFail": ["log", "notify"],
      "onMaxIterationsExceeded": ["log", "notify", "pause"]
    },
    "selfImprovement": { "mode": "suggest" },
    "build": { "maxIterations": 3, "calibrateEvery": 0 }
  },

  "review": { "autoFixThreshold": 3, "diaryPath": "logs/reviews.jsonl" },
  "research": { "outputDir": "docs/research", "github": { "maxResults": 10 }, "parallel": { "maxResults": 15 } },
  "debug": false
}
```

</details>

### Environment Variables

Secrets go in environment variables, not the config file. Create `tools/.env` from `.env.dev`:

| Variable | Required | Description |
|----------|----------|-------------|
| `NTFY_PASSWORD` | No | ntfy password for authenticated topics |
| `NTFY_TOPIC` | No | Override default topic via environment |
| `NTFY_SERVER` | No | Override server URL via environment |
| `AAA_PARALLEL_API_KEY` | For parallel-search | [Get key](https://platform.parallel.ai/) |
| `AAA_GITHUB_TOKEN` | No | Falls back to `gh auth` |
| `AAA_DEBUG` | No | Enable verbose logging |
| `RALPH_PROVIDER` | No | Override default provider (`claude`, `codex`, `cursor`, `opencode`) |

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

**Atomic Documentation:** Documentation that composes like code — blocks (single-tech), foundations (capabilities), stacks (complete setups). See **[context/README.md](context/README.md)** for the full index, at-ref reference management, and compilation guide.

## Development

```bash
cd tools

bun install           # Install dependencies
bun run build         # Build CLI -> bin/aaa
bun run dev <cmd>     # Dev mode
bun run test          # E2E tests (requires API keys)
bun run lint          # Linting
bun run lint:fix      # Auto-fix
```

### Testing Requirements

- `gh-search`: GitHub token via `gh auth login` or `GITHUB_TOKEN`
- `parallel-search`: `AAA_PARALLEL_API_KEY` env var

## Troubleshooting

**`command not found: aaa`**
Add `~/.local/bin` to PATH. For zsh: `echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.zshrc` then restart terminal.

**`command not found: bun`**
Install Bun: `curl -fsSL https://bun.sh/install | bash`

**Commands work in terminal but not in Claude Code**
Set `CLAUDE_CONFIG_DIR` environment variable to point to all-agents root directory.

**API commands fail silently**
Check `tools/.env` exists with required keys. Run with `AAA_DEBUG=true` for verbose output.

## Uninstall

```bash
aaa uninstall --user    # Remove global installation
aaa uninstall --project # Remove project integration
```

Or manually: remove `~/.local/bin/aaa` symlink and unset `CLAUDE_CONFIG_DIR`.

See **[docs/planning/ROADMAP.md](docs/planning/ROADMAP.md)** for project vision and planned features.

## License

MIT
