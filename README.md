# all-agents

Atomic docs + CLI toolkit + AI agents for agentic coding tools. One repo, every project inherits it.

📚 **Atomic docs** — reusable knowledge blocks (tools, principles, patterns) shared across projects via symlinks
🛠️ **`aaa` CLI** — commands for planning, reviewing, researching, notifying
🤖 **Skills & agents** — 18 skills, 17 sub-agents, 9 slash commands (Claude Code today, opencode WIP)
🔄 **Ralph** — autonomous dev loop: vision → roadmap → milestones → build → calibrate, each iteration memoryless

```
you ──► ralph plan vision ──► roadmap ──► milestones
                                              │
                                        stories & tasks
                                              │
                                        ralph build (loop)
                                          │         ▲
                                          ▼         │
                                       implement → validate
                                          │
                                        ralph calibrate
                                          │
                                          ▼
                                       ship it 🚀
```

## Prerequisites

- [Bun](https://bun.sh) (required)
- [Claude Code](https://claude.ai/download) (primary — skills, agents, slash commands)
- [opencode](https://opencode.ai) (supported — atomic docs, CLI, Ralph)
- Cursor CLI (coming soon)
- [gh CLI](https://cli.github.com) (optional, for GitHub search)

## Quickstart

```bash
# Install
git clone https://github.com/otrebu/all-agents ~/dev/all-agents
cd ~/dev/all-agents/tools && bun install
bun run dev setup --user

# Link to your project
cd ~/your-project
aaa setup --project
```

**`command not found: bun`** — Install: `curl -fsSL https://bun.sh/install | bash`

## Setup

### Global (all projects inherit)

```bash
git clone https://github.com/otrebu/all-agents ~/dev/all-agents
cd ~/dev/all-agents/tools && bun install
bun run dev setup --user
```

Builds CLI → `~/.local/bin/aaa`, checks PATH, prompts for `CLAUDE_CONFIG_DIR`.

### Project-level (one project)

```bash
cd your-project
aaa setup --project
```

Creates `docs/planning/` and `docs/research/`, then asks how to share `context/`:

| Method | How it works | Trade-off |
|--------|-------------|-----------|
| **Symlink** | `context/` → all-agents source | Real-time updates, but some tools (Claude Code, Cursor) may not follow symlinks |
| **Sync copy** (recommended) | Copies files into `context/` | Always works, but needs manual refresh |

To update a synced copy:

```bash
aaa sync-context              # one-time sync
aaa sync-context --watch      # auto-sync while editing all-agents
```

## 🔄 Ralph — Autonomous Dev Loop

Ralph turns a vague idea into shipped code through structured phases. You stay on the loop, not in it. Each build iteration starts fresh (memoryless — no context drift).

```bash
# 1. Plan — interactive, Socratic-style dialogue
aaa ralph plan vision            # "what are we building and why?"
aaa ralph plan roadmap           # break vision into milestones
aaa ralph plan stories           # detail each milestone into user stories
aaa ralph plan tasks             # generate implementable subtasks

# 2. Build — agents implement one subtask at a time
aaa ralph build                  # pick next task → implement → validate → repeat
aaa ralph status                 # check queue progress & stats

# 3. Calibrate — catch drift before it compounds
aaa ralph calibrate              # intention drift, technical quality, self-improvement
```

**Ralph skills** (auto-detected in Claude Code):
`ralph-plan` · `ralph-build` · `ralph-status` · `ralph-calibrate` · `ralph-review` · `ralph-prompt-audit`

Full docs: [docs/ralph/README.md](docs/ralph/README.md)

## 🧰 Skills, Agents & Commands

Extend your coding tool. Claude Code fully supported, opencode WIP.

- **Skills** auto-trigger from your request — "review my code" → `code-review`
- **Slash commands** you type explicitly — `/dev:git-commit`
- **Sub-agents** run in background — spawned by skills

| | Name | What it does |
|--|------|-------------|
| 🔍 | `code-review` | 11 parallel reviewers → synthesize → triage |
| 🧠 | `brainwriting` | 5 parallel agents explore an idea space |
| 🔎 | `gh-search` | find real-world code on GitHub |
| 🌐 | `parallel-search` | multi-angle web research, 30K chars/result |
| 📊 | `dev-work-summary` | scan ~/dev for today's git activity |
| ❓ | `interrogate-on-changes` | surface decisions & alternatives in diffs |
| 📝 | `doc-analyze` | find doc gaps, tiered depth |
| 📦 | `context-atomic-doc` | create/update atomic docs |
| 📖 | `write-guide` | generate GUIDE.md for a milestone |
| 🧪 | `run-guide-and-fix` | walk GUIDE.md with browser, fix as you go |
| 👀 | `walkthrough` | present items one at a time interactively |
| 🔧 | `setup-lint-staged` | add lint-staged to any project |
| 🧙 | `aaa-feature-wizard` | scaffold new `aaa` CLI commands |

**Slash commands:** `/dev:git-commit` · `/dev:git-multiple-commits` · `/dev:start-feature` · `/dev:complete-feature` · `/dev:consistency-check` · `/parallel-search` · `/context:plan-multi-agent` · `/meta:claude-code:create-skill` · `/meta:claude-code:create-agent` · `/meta:create-cursor-rule`

<details>
<summary>🔔 Notification Integration</summary>

Push notifications when your agent finishes or needs permission. Uses `aaa notify` + ntfy.sh.

```bash
aaa notify init                  # configure topic
aaa notify "Build done"          # manual notification
```

Hooks in `.claude/settings.json` fire automatically on stop/permission events. Event routing configurable in `aaa.config.json`.

</details>


## Configuration

All config lives in `aaa.config.json` in your project root. See [aaa.config.json](aaa.config.json) for a working example. For notifications: `aaa notify init` walks you through first-time setup.

<details>
<summary>📄 Config reference (<code>aaa.config.json</code>)</summary>

| Section | Key | What it does |
|---------|-----|-------------|
| `notify` | `enabled` | toggle notifications globally |
| | `server` | ntfy server URL (default: ntfy.sh) |
| | `defaultTopic` | default ntfy topic |
| | `defaultPriority` | min / low / default / high / max |
| | `quietHours` | suppress sounds during hours (startHour, endHour) |
| | `events` | per-event routing: topic, priority, tags, enabled |
| `ralph` | `provider` | claude / opencode / gemini / codex / cursor / pi |
| | `model` | default model override |
| | `build.maxIterations` | max retries per subtask (0 = unlimited) |
| | `build.calibrateEvery` | run calibration every N iterations (0 = off) |
| | `approvals` | gates: createRoadmap, createStories, createTasks, createSubtasks, onDriftDetected, etc. Values: always / suggest / auto |
| | `hooks` | lifecycle events: onIterationComplete, onMilestoneComplete, onValidationFail, onMaxIterationsExceeded. Actions: log / notify / pause |
| | `selfImprovement.mode` | off / suggest / autofix |
| | `timeouts` | stallMinutes (default 25), hardMinutes (default 60), graceSeconds (default 5) |
| `review` | `autoFixThreshold` | severity threshold for auto-fix (1-5) |
| | `diaryPath` | path to review diary file |
| `research` | `outputDir` | where to save research results |
| | `github.maxResults` | max GitHub search results |
| | `parallel.maxResults` | max parallel search results |
| `debug` | | enable verbose logging globally |

</details>

<details>
<summary>🔑 Environment variables</summary>

Secrets via shell exports (no `.env` file needed):

| Variable | For | Notes |
|----------|-----|-------|
| `AAA_PARALLEL_API_KEY` | `parallel-search` | required for web research |
| `AAA_GITHUB_TOKEN` | `gh-search` | falls back to `gh auth` |
| `NTFY_PASSWORD` | `notify` | authenticated ntfy topics |
| `NTFY_SERVER` | `notify` | overrides config file |
| `NTFY_TOPIC` | `notify` | overrides config file |
| `AAA_DEBUG` | all | verbose logging (`true`/`1`) |
| `RALPH_PROVIDER` | ralph | override provider per-session |
| `CLAUDE_CONFIG_DIR` | setup | Claude Code config directory |

</details>

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
├── tools/                 # CLI source code (see tools/README.md)
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

Dependencies live in `tools/`. Install once, then run everything from repo root with `--cwd`:

```bash
bun install --cwd tools          # install deps
bun run --cwd tools dev <cmd>    # dev mode (no build needed)
bun run --cwd tools build        # compile CLI → bin/aaa
bun run --cwd tools test         # E2E tests (needs API keys)
bun run --cwd tools check        # lint + typecheck + test
```

## Troubleshooting

**`command not found: aaa`**
Add `~/.local/bin` to PATH. For zsh: `echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.zshrc` then restart terminal.

**`command not found: bun`**
Install Bun: `curl -fsSL https://bun.sh/install | bash`

**Commands work in terminal but not in Claude Code**
Set `CLAUDE_CONFIG_DIR` environment variable to point to all-agents root directory.

**API commands fail silently**
Check env vars are set (`AAA_PARALLEL_API_KEY`, `AAA_GITHUB_TOKEN`). Run with `AAA_DEBUG=true` for verbose output.

## Uninstall

```bash
aaa uninstall --user    # removes ~/.local/bin/aaa, ~/.agents/skills symlink, warns about CLAUDE_CONFIG_DIR
aaa uninstall --project # removes context/ symlink
```

Or manually: remove `~/.local/bin/aaa` and `~/.agents/skills` symlinks, unset `CLAUDE_CONFIG_DIR` from your shell config.

See **[docs/planning/ROADMAP.md](docs/planning/ROADMAP.md)** for project vision and planned features.

## License

MIT
