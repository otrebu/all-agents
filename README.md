# all-agents

Bridging Cursor and Claude Code AI configuration, making prompts work across local and cloud-based AI agents.

## Setup

### Option 1: Global User Config (Recommended)

Use this repo as your global Claude Code configuration:

```bash
git clone <repo> ~/dev/all-agents
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

### Environment Variables

Copy `.env.example` to `.env`:

```bash
AAA_PARALLEL_API_KEY=   # Required for parallel-search (https://platform.parallel.ai/)
AAA_GITHUB_TOKEN=       # Optional, uses gh CLI by default
AAA_DEBUG=false         # Enable verbose logging
```

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

# Extract Claude Code conversation history
aaa extract-conversations [-l limit] [-o file]
```

Research outputs are saved to `docs/research/`.

## Using with Claude Code

### Slash Commands

| Command | Description | Stability |
|:--------|:------------|:----------|
| `/dev:git-commit` | Create conventional commits | stable |
| `/dev:git-multiple-commits` | Create multiple commits | stable |
| `/dev:start-feature` | Create/switch feature branches | stable |
| `/dev:complete-feature` | Merge feature to main | stable |
| `/dev:code-review` | AI-assisted code review | beta |
| `/dev:consistency-check` | Check consistency docs/code/refs | beta |
| `/gh-search` | Search GitHub for code examples | experimental |
| `/gemini-research` | Google Search via Gemini | experimental |
| `/parallel-search` | Multi-angle web research | beta |
| `/create-task` | Create numbered task file | beta |
| `/download` | Download URLs to markdown | beta |
| `/context:atomic-doc` | Create/update atomic docs | beta |
| `/context:plan-multi-agent` | Plan docs with Opus agents | experimental |
| `/meta:claude-code:create-skill` | Create a new skill | beta |
| `/meta:claude-code:create-command` | Create a slash command | beta |
| `/meta:claude-code:create-agent` | Create a sub-agent | beta |
| `/meta:claude-code:create-plugin` | Scaffold a plugin | beta |
| `/meta:create-cursor-rule` | Create .cursorrules file | experimental |
| `/meta:how-to-prompt` | Prompting guidance | stable |
| `/meta:optimize-prompt` | Optimize prompts | stable |

### Sub-agents

| Agent | Description | Stability |
|:------|:------------|:----------|
| `gemini-research` | Web research via Gemini CLI | experimental |
| `parallel-search` | Multi-angle web research | beta |
| `conversation-friction-analyzer` | Extract friction from conversations | experimental |
| `friction-pattern-abstractor` | Abstract patterns from friction data | experimental |
| `coding-style-reviewer` | Review code against style guidelines | experimental |

### Skills

| Skill | Description | Stability |
|:------|:------------|:----------|
| `dev-work-summary` | Scan ~/dev for today's git work | beta |
| `brainwriting` | Structured brainstorming | beta |
| `task-create` | Create task files | beta |
| `analyze-friction` | Orchestrate friction analysis | experimental |
| `eval-test-skill` | Git branch cleanup | experimental |

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

## License

MIT
