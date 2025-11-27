# all-agents

Bridging Cursor and Claude Code AI configuration, making prompts work across local and cloud-based AI agents.

## Quick Start

```bash
# First time setup (builds CLI and creates symlink)
cd tools && ./setup.sh

# If ~/.local/bin not in PATH, add to ~/.zshrc:
export PATH="$HOME/.local/bin:$PATH"
```

### Environment Variables

Copy `.env.example` to `.env` in the project root:

```bash
AAA_PARALLEL_API_KEY=   # Required for parallel-search (https://platform.parallel.ai/)
AAA_GITHUB_TOKEN=       # Optional, uses gh CLI by default
AAA_ROOT_PATH=          # Optional, for deployed binary
AAA_DEBUG=false         # Enable verbose logging
```

## CLI Tools

The `aaa` binary provides research and search commands:

```bash
# GitHub code search - find real-world examples
aaa gh-search "react hooks typescript"

# Multi-angle web research (up to 30K chars/result)
aaa parallel-search --objective "RAG patterns" --queries "chunking" "retrieval"

# Google Search via Gemini CLI
aaa gemini-research "Next.js 15 features" --mode deep
```

Research outputs are saved to `context/research/`.

## Using with Claude Code

### Slash Commands

| Command | Description | Documentation |
|:--------|:------------|:--------------|
| `/dev:git-commit` | Create conventional commits from diffs | `@context/coding/workflow/COMMIT.md` |
| `/dev:start-feature` | Create/switch feature branches | `@context/coding/workflow/START_FEATURE.md` |
| `/dev:complete-feature` | Merge feature branch to main | `@context/coding/workflow/COMPLETE_FEATURE.md` |
| `/dev:code-review` | AI-assisted code review | `@context/coding/workflow/CODE_REVIEW.md` |
| `/gh-search <query>` | Search GitHub for code examples | `@context/knowledge/github/GH_SEARCH.md` |
| `/gemini-research <query>` | Google Search via Gemini CLI | `@context/knowledge/gemini-cli/GEMINI_CLI.md` |
| `/parallel-search <topic>` | Multi-angle web research | `@context/knowledge/parallel-search/PARALLEL_SEARCH.md` |
| `/meta:claude-code:create-command` | Create a new slash command | `@context/meta/PROMPTING.md` |
| `/meta:claude-code:create-agent` | Create a new sub-agent | `@context/meta/AGENT_TEMPLATES.md` |
| `/meta:claude-code:create-skill` | Create a new skill | — |
| `/meta:claude-code:create-plugin` | Scaffold a plugin structure | — |
| `/meta:create-cursor-rule` | Create a `.cursorrules` file | `@context/meta/PROMPTING.md` |
| `/meta:how-to-prompt` | Prompting guidance | `@context/meta/PROMPTING.md` |
| `/meta:optimize-prompt` | Optimize existing prompts | `@context/meta/OPTIMIZE-PROMPT.md` |

### Sub-agents

| Agent | Description | Documentation |
|:------|:------------|:--------------|
| `gemini-research` | Web research via Gemini CLI with Google Search grounding | `@context/knowledge/gemini-cli/GEMINI_CLI.md` |
| `parallel-search` | Multi-angle web research using Parallel Search API | `@context/knowledge/parallel-search/PARALLEL_SEARCH.md` |

### Skills

| Skill | Description |
|:------|:------------|
| `dev-work-summary` | Scan ~/dev for git repos and report today's work |
| `brainwriting` | Facilitate structured brainstorming using parallel sub-agents |

## Using with Cursor

Generate `.cursorrules` files using the `/meta:create-cursor-rule` command. The shared documentation in `context/` can be referenced by both Claude Code and Cursor.

## Directory Structure

```
all-agents/
├── bin/                           # Compiled binary (gitignored)
│   └── aaa
├── context/                       # Documentation & research outputs
│   ├── knowledge/                 # Tool documentation
│   │   ├── github/GH_SEARCH.md
│   │   ├── parallel-search/PARALLEL_SEARCH.md
│   │   └── gemini-cli/GEMINI_CLI.md
│   ├── coding/                    # Coding standards & workflows
│   │   ├── CODING_STYLE.md
│   │   ├── workflow/              # Git, commits, code review
│   │   ├── ts/                    # TypeScript stack & testing
│   │   ├── backend/               # Backend patterns
│   │   └── frontend/              # Frontend patterns
│   ├── meta/                      # Prompting & agent standards
│   │   ├── PROMPTING.md
│   │   └── AGENT_TEMPLATES.md
│   ├── research/                  # Output directory
│   │   ├── github/
│   │   ├── google/
│   │   └── parallel/
│   └── planning/                  # Roadmap & stories
├── tools/                         # CLI source code
│   ├── src/
│   │   ├── cli.ts                 # Entry point
│   │   ├── env.ts                 # Zod env parser
│   │   └── commands/              # Command implementations
│   ├── lib/                       # Shared utilities
│   ├── tests/                     # E2E tests
│   ├── package.json
│   └── setup.sh                   # Installation script
├── .claude/
│   ├── commands/                  # Slash commands
│   ├── agents/                    # Sub-agents
│   ├── skills/                    # Skills
│   └── settings.json              # Tool permissions
├── .env.example
├── CLAUDE.md                      # Claude Code project guidance
└── README.md
```

## Documentation Index

| Category | Files |
|:---------|:------|
| **Coding (Core)** | `context/coding/CODING_STYLE.md` - FP patterns, naming, logging |
| **Workflow** | `context/coding/workflow/` - Commits, branches, code review, refactoring |
| **TypeScript** | `context/coding/ts/` - Stack, testing, logging, tooling |
| **Backend** | `context/coding/backend/` - API conventions, auth, validation, error handling |
| **Frontend** | `context/coding/frontend/` - Components, state management, testing |
| **Database** | `context/coding/database/` - Schema, migrations |
| **DevOps** | `context/coding/devops/` - Deployment, monitoring |
| **Meta** | `context/meta/` - Prompting standards, agent templates |
| **Knowledge** | `context/knowledge/` - Research tool documentation |
| **Planning** | `context/planning/` - Roadmap, user stories |

## Development

```bash
cd tools

# Install dependencies
bun install

# Build CLI
bun run build              # Creates bin/aaa

# Development mode
bun run dev gh-search <query>

# Testing
bun run test               # E2E tests (requires API keys)
bun run test:watch

# Linting
bun run lint
bun run lint:fix
```

### Testing Requirements

- `gh-search`: GitHub token via `gh auth login` or `GITHUB_TOKEN`
- `parallel-search`: `AAA_PARALLEL_API_KEY` env var
- `gemini-research`: Skipped by default (set `GEMINI_TEST_ENABLED=1` to run)

## License

MIT
