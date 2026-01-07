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

# PRD-driven iterative Claude (Ralph)
aaa ralph init                    # Create PRD interactively
aaa ralph run                     # Run 5 iterations (default)
aaa ralph run --unlimited         # Run until complete
aaa ralph run --interactive       # Human approval each iteration

# Extract Claude Code conversation history
aaa extract-conversations [-l limit] [-o file]
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
<summary><strong>Slash Commands</strong> (21 commands)</summary>

| Command                            | Description                                 | Stability    |
| :--------------------------------- | :------------------------------------------ | :----------- |
| `/dev:git-commit`                  | Create conventional commits                 | stable       |
| `/dev:git-multiple-commits`        | Create multiple commits                     | stable       |
| `/dev:start-feature`               | Create/switch feature branches              | stable       |
| `/dev:complete-feature`            | Merge feature to main                       | stable       |
| `/dev:code-review`                 | AI-assisted code review                     | beta         |
| `/dev:consistency-check`           | Verify docs match code, find contradictions | beta         |
| `/gh-search`                       | Search GitHub for code examples             | experimental |
| `/gemini-research`                 | Google Search via Gemini                    | experimental |
| `/parallel-search`                 | Multi-angle web research                    | beta         |
| `/create-task`                     | Create numbered task file                   | beta         |
| `/download`                        | Download URLs to markdown                   | beta         |
| `/context:atomic-doc`              | Create/update atomic docs                   | beta         |
| `/context:plan-multi-agent`        | Plan docs with Opus agents                  | experimental |
| `/meta:claude-code:create-skill`   | Create a new skill                          | beta         |
| `/meta:claude-code:create-command` | Create a slash command                      | beta         |
| `/meta:claude-code:create-agent`   | Create a sub-agent                          | beta         |
| `/meta:claude-code:create-plugin`  | Scaffold a plugin                           | beta         |
| `/meta:create-cursor-rule`         | Create .cursorrules file                    | experimental |
| `/meta:how-to-prompt`              | Prompting guidance                          | stable       |
| `/meta:optimize-prompt`            | Optimize prompts                            | stable       |

</details>

<details>
<summary><strong>Sub-agents</strong> (5 agents)</summary>

| Agent                            | Description                                       | Stability    |
| :------------------------------- | :------------------------------------------------ | :----------- |
| `gemini-research`                | Web research via Gemini CLI                       | experimental |
| `parallel-search`                | Multi-angle web research                          | beta         |
| `conversation-friction-analyzer` | Stage 1: Extract raw friction points from chats   | experimental |
| `friction-pattern-abstractor`    | Stage 2: Group similar problems, find root causes | experimental |
| `coding-style-reviewer`          | Review code against style guidelines              | experimental |

</details>

<details>
<summary><strong>Skills</strong> (6 skills)</summary>

| Skill              | Description                                    | Stability    |
| :----------------- | :--------------------------------------------- | :----------- |
| `dev-work-summary` | Scan ~/dev for today's git work                | beta         |
| `brainwriting`     | 5 parallel idea explorations, then synthesize  | beta         |
| `task-create`      | Create task files                              | beta         |
| `story-create`     | Create story files, prompt for linked tasks    | beta         |
| `analyze-friction` | 3-stage workflow: extract → abstract → approve | experimental |
| `eval-test-skill`  | List and delete branches merged to main        | experimental |

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
