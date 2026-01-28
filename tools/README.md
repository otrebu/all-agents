# aaa - All-Agents CLI Toolkit

Command-line tools for research, task management, and documentation workflows. Built with Bun and TypeScript.

## Installation

### User Installation (Global CLI)

Install `aaa` as a global command:

```bash
# From this repository
bun --cwd tools run dev setup --user

# After installation, use directly
aaa --help
```

This will:

- Build the CLI binary at `bin/aaa`
- Create a symlink in `~/.local/bin/aaa`
- Install shell tab completion (zsh, bash, or fish)
- Prompt to set `CLAUDE_CONFIG_DIR` for global Claude Code integration

### Project Integration

Set up all-agents integration in another project:

```bash
# From your project directory
aaa setup --project
```

This will:

1. Set up `CLAUDE_CONFIG_DIR` to use all-agents globally
2. Ask how to link `context/`:
   - **Symlink**: Real-time updates, but may not work with Claude Code/Cursor
   - **Sync copy** (recommended): Manual updates via `aaa sync-context`
3. Copy docs templates

If you choose sync mode:

- `context/` is added to `.gitignore` automatically
- First sync runs immediately
- Use `aaa sync-context --watch` while working on all-agents for auto-updates

### Uninstall

```bash
aaa uninstall --user    # Remove global CLI installation
aaa uninstall --project # Remove project integration
```

## Quick Start

```bash
# Sync context to another project
aaa sync-context --target ~/my-project --watch

# Research commands
aaa download https://example.com/article
aaa gh-search "react hooks"
aaa gemini-research "latest TypeScript features" --mode deep
aaa parallel-search "best practices for CLI tools"

# Task management
aaa task create "Implement user authentication"
aaa story create "As a user, I want to login"
```

## Commands

| Command                      | Description                                                                | Output Location            |
| ---------------------------- | -------------------------------------------------------------------------- | -------------------------- |
| `sync-context`               | Sync context/ folder to target project (with --watch)                      | Target project's context/  |
| `download <urls...>`         | Fetch URLs, extract text, save as markdown                                 | `docs/research/downloads/` |
| `extract-conversations`      | Extract Claude Code conversation history as markdown                       | stdout or file             |
| `gh-search <query>`          | GitHub code search with intent-based ranking                               | `docs/research/github/`    |
| `gemini-research <query>`    | Google Search via Gemini CLI (modes: quick, deep, code)                    | `docs/research/google/`    |
| `parallel-search <query>`    | Multi-angle web research with configurable depth                           | `docs/research/parallel/`  |
| `task create <description>`  | Create auto-numbered task file (NNN-name.md), with optional `--story` link | `docs/planning/tasks/`     |
| `story create <description>` | Create auto-numbered story file (NNN-name.md)                              | `docs/planning/stories/`   |
| `setup`                      | Install CLI (`--user`) or integrate project (`--project`)                  | -                          |
| `uninstall`                  | Remove CLI (`--user`) or project integration (`--project`)                 | -                          |
| `ralph plan <level>`         | Interactive planning (vision, roadmap, stories, tasks)                     | `docs/planning/`           |
| `ralph build`                | Run subtask iteration loop (autonomous dev)                                | `subtasks.json`            |
| `ralph status`               | Display build status and progress                                          | -                          |
| `ralph calibrate <type>`     | Run drift checks (intention, technical, improve)                           | -                          |
| `completion <shell>`         | Generate shell completion script (bash, zsh, fish)                         | stdout                     |

### Command Examples

#### sync-context

```bash
# One-time sync to current directory
aaa sync-context

# Sync to specific directory
aaa sync-context --target ~/my-project

# Watch mode - auto-sync on changes
aaa sync-context --watch
aaa sync-context -t ~/my-project -w
```

Syncs the `context/` folder from all-agents repo to target directory. Watch mode continuously monitors for changes and re-syncs automatically.

**Note:** Always syncs FROM all-agents TO target (one-way sync).

#### download

```bash
# Single URL
aaa download https://example.com/article

# Multiple URLs
aaa download https://example.com/article https://example.com/tutorial

# Custom output name
aaa download https://example.com/article -o "my-article"

# Custom directory (relative to docs/research/)
aaa download https://example.com/article -d "special/folder"
```

Output: `docs/research/downloads/YYYYMMDD-HHMMSS-{topic}.md`

#### extract-conversations

Extract Claude Code conversation history from the current project as readable markdown.

```bash
# Extract last 20 conversations (default) to stdout
aaa extract-conversations

# Extract last 5 conversations
aaa extract-conversations --limit 5

# Save to file
aaa extract-conversations --limit 10 -o conversations.md
```

**Features:**

- Extracts from both local (`.claude/projects/`) and global (`~/.claude/projects/`) directories
- Includes AI thinking blocks (`<thinking>...</thinking>`)
- Includes tool calls (`<tool_use>`) and results (`<tool_result>`)
- Shows timestamps for each message
- Sorted by most recent first

**Output format:**

```markdown
## Session: 25345590

**Started:** 2025-12-31 14:44
**Branch:** main
**Summary:** Feature implementation

### 👤 User (14:44:26)

User message here...

### 🤖 Assistant (14:44:33)

<thinking>
AI reasoning...
</thinking>

### 🤖 Assistant (14:44:36)

Response text...
```

#### gh-search

```bash
# Basic search
aaa gh-search "useEffect cleanup"

# Limit results
aaa gh-search "docker compose examples" --limit 10
```

Output:

- `docs/research/github/YYYYMMDD-HHMMSS-{topic}.md` (formatted report)
- `docs/research/github/raw/YYYYMMDD-HHMMSS-{topic}.json` (raw data)

#### gemini-research

```bash
# Quick mode (fast, high-level)
aaa gemini-research "What is WebAssembly?" --mode quick

# Deep mode (comprehensive research)
aaa gemini-research "GraphQL vs REST APIs" --mode deep

# Code mode (focused on code examples)
aaa gemini-research "implement OAuth2 in Node.js" --mode code
```

Output: `docs/research/google/YYYYMMDD-HHMMSS-{topic}.md`

#### parallel-search

**Note:** `--objective` is required.

```bash
# Basic search (--objective required)
aaa parallel-search --objective "best practices for API design"

# With additional queries
aaa parallel-search --objective "microservices" --queries "patterns" "testing"

# Higher quality (slower, more thorough)
aaa parallel-search --objective "microservices architecture" --processor pro

# Advanced: control result size
aaa parallel-search --objective "API design" --max-results 20 --max-chars 10000
```

**Options:**

- `--objective <string>` - Main search objective (required)
- `--queries <string...>` - Additional search queries (optional, can also be positional args)
- `--processor <level>` - Processing quality: `base` or `pro` (default: `pro`)
- `--max-results <number>` - Max results per search (default: 15)
- `--max-chars <number>` - Max characters per excerpt (default: 5000)

Output:

- `docs/research/parallel/YYYYMMDD-HHMMSS-{topic}.md` (formatted report)
- `docs/research/parallel/raw/YYYYMMDD-HHMMSS-{topic}.json` (raw data)

#### task create / story create

```bash
# Create task
aaa task create "Implement user authentication"
# → docs/planning/tasks/001-implement-user-authentication.md

# Create task linked to story
aaa task create "Implement auth API" --story 001
# → docs/planning/tasks/002-implement-auth-api.md (with Story: link to 001-*.md)

# Short flag also works
aaa task create "Add login form" -s 1
# → docs/planning/tasks/003-add-login-form.md (with Story: link)

# Create story
aaa story create "As a user, I want to reset my password"
# → docs/planning/stories/001-as-a-user-i-want-to-reset-my-password.md

# Custom directory
aaa task create "Setup CI/CD pipeline" -d "backend/tasks"
# → docs/planning/backend/tasks/001-setup-ci-cd-pipeline.md
```

Files are auto-numbered incrementally (001, 002, 003...).

**Options:**

- `-d, --dir <path>` - Custom tasks directory (default: `docs/planning/tasks`)
- `-s, --story <number>` - Link task to story by number (e.g., `001` or `1`)

#### ralph

Autonomous development framework using the hierarchy: Vision → Roadmap → Milestone → Story → Task → Subtask.

**Execution Modes (Three-Mode System):**

| Mode        | Flag      | Description                          |
| ----------- | --------- | ------------------------------------ |
| Interactive | (default) | Full chat, back-and-forth dialogue   |
| Supervised  | `-s`      | Watch Claude work, can intervene     |
| Headless    | `-H`      | Fully autonomous, JSON output + logs |

Note: Review commands are supervised-only (no `-H`). Rationale:

- Review produces questions requiring human judgment ("Is this intentional?")
- Feedback capture is complicated - where would headless output go?
- Human needs to be in the loop anyway to act on suggestions

**Planning commands:**

```bash
# Vision planning - define what the app IS and WILL BECOME
aaa ralph plan vision

# Roadmap planning - define milestones
aaa ralph plan roadmap

# Story planning for a milestone
aaa ralph plan stories --milestone docs/planning/milestones/mvp.md
aaa ralph plan stories --milestone docs/planning/milestones/mvp.md --supervised  # watch mode
aaa ralph plan stories --milestone docs/planning/milestones/mvp.md --headless    # autonomous

# Task planning for a story
aaa ralph plan tasks --story docs/planning/stories/001-user-auth.md
aaa ralph plan tasks --milestone docs/planning/milestones/mvp.md --supervised    # all stories in milestone
```

**Review commands** (supervised-only):

```bash
# Review stories for quality and completeness
aaa ralph review stories --milestone docs/planning/milestones/mvp.md

# Review roadmap milestones
aaa ralph review roadmap

# Gap analysis (cold analysis for blind spots)
aaa ralph review gap roadmap
aaa ralph review gap stories --milestone docs/planning/milestones/mvp.md
```

**Build command** (autonomous implementation):

```bash
# Run subtask iteration loop (supervised by default)
aaa ralph build
aaa ralph build --supervised   # same as above
aaa ralph build --headless     # fully autonomous, JSON logs

# Interactive mode - pause after each iteration
aaa ralph build -i

# Custom subtasks file
aaa ralph build --subtasks ./my-subtasks.json

# Max iterations per subtask (default: 3)
aaa ralph build --max-iterations 5

# Run pre-build validation first
aaa ralph build --validate-first

# Print prompt without executing
aaa ralph build -p

# Multi-CLI Provider Support (choose your AI CLI)
aaa ralph build --provider claude              # Default - Claude Code
aaa ralph build --provider cursor              # Cursor Composer Agent
aaa ralph build --provider gemini              # Google Gemini CLI
aaa ralph build --provider codex               # OpenAI Codex CLI
aaa ralph build --provider opencode            # Opencode multi-provider

# Provider with specific model
aaa ralph build --provider claude --model claude-3-opus-20240229
aaa ralph build --provider cursor --model composer-1
aaa ralph build --provider gemini --model gemini-2.5-pro
aaa ralph build --provider codex --model gpt-5.1-codex-max
```

**Status command:**

```bash
# Show current build progress
aaa ralph status
aaa ralph status ./path/to/subtasks.json
```

**Calibration commands** (drift detection):

```bash
# Check for intention drift (code vs planning docs)
aaa ralph calibrate intention

# Check for technical drift (code quality issues)
aaa ralph calibrate technical

# Run self-improvement analysis on session logs
aaa ralph calibrate improve

# Run all calibration checks
aaa ralph calibrate all

# Approval overrides
aaa ralph calibrate intention --force   # Skip approvals
aaa ralph calibrate technical --review  # Require approvals
```

**Subtasks format** (`subtasks.json`):

```json
{
  "subtasks": [
    {
      "id": "SUB-001",
      "taskRef": "TASK-001",
      "title": "Create user authentication endpoint",
      "description": "Implement POST /api/auth/register",
      "done": false,
      "acceptanceCriteria": [
        "Returns JWT on success",
        "Returns 401 on invalid credentials"
      ],
      "filesToRead": ["@context/blocks/security/auth.md", "src/routes/index.ts"]
    }
  ]
}
```

**Prerequisites:**

Before using Ralph planning commands in a new project, you must sync the context folder:

```bash
# From your project directory, sync context from all-agents
aaa sync-context -t /path/to/your-project

# Or if you're already in the project directory
cd /path/to/your-project && aaa sync-context
```

**Why this is required:** Ralph skills reference `@context/workflows/ralph/...` paths which must exist in the target project. The sync-context command copies these workflow prompts to your project's `context/` folder. Without this step, the planning commands will fail to find the required prompt templates.

**Workflow:**

```bash
# 0. Sync context (required first step!)
aaa sync-context -t /path/to/your-project

# 1. Plan vision and roadmap
aaa ralph plan vision
aaa ralph plan roadmap

# 2. Create stories and tasks
aaa ralph plan stories --milestone docs/planning/milestones/mvp.md
aaa ralph plan tasks --story docs/planning/stories/001-user-auth.md

# 3. Build autonomously
aaa ralph build

# 4. Check for drift periodically
aaa ralph calibrate all
```

## Shell Completion

Enable tab completion for faster command entry.

### Automatic Installation (Recommended)

Shell completion is **automatically offered** during `aaa setup --user`. If you decline or want to install later:

```bash
# Re-run setup - it will detect and offer to install completion
aaa setup --user
```

### Manual Installation

If you prefer to set up completion manually:

#### Bash

Add to `~/.bashrc`:

```bash
source <(aaa completion bash)
```

#### Zsh

Add to `~/.zshrc`:

```bash
source <(aaa completion zsh)
```

For oh-my-zsh users:

```bash
aaa completion zsh > ~/.oh-my-zsh/completions/_aaa
```

#### Fish

```bash
aaa completion fish > ~/.config/fish/completions/aaa.fish
```

### What's Completed

Tab completion provides suggestions for:

- All top-level commands (`download`, `gh-search`, `ralph`, etc.)
- Subcommands (`ralph plan`, `ralph build`, `task create`)
- Options and flags (`--milestone`, `--interactive`, `-o`)
- Dynamic values where supported (e.g., milestone names from `roadmap.md`)

**Note:** Restart your shell or run `source ~/.bashrc` (or equivalent) after setup.

## Configuration

### Environment Variables

Create a `.env` file in the `tools/` directory:

```bash
# Optional: Enable debug logging
AAA_DEBUG=true

# Optional: GitHub token override (uses gh CLI by default)
AAA_GITHUB_TOKEN=ghp_xxxxxxxxxxxx

# Required for parallel-search command
AAA_PARALLEL_API_KEY=your_api_key_here
```

### API Keys

**GitHub Search (`gh-search`):**

- Requires GitHub CLI (`gh`) to be installed and authenticated
- Run `gh auth login` if not already authenticated
- Alternatively, set `AAA_GITHUB_TOKEN` in `.env`

**Gemini Research (`gemini-research`):**

- Requires `@google/gemini-cli` package (included as dependency)
- Follows standard Gemini API authentication

**Parallel Search (`parallel-search`):**

- Requires `AAA_PARALLEL_API_KEY` in `.env`
- Get API key from parallel-search provider

### Multi-CLI Provider Configuration

Configure AI providers in `aaa.config.json` (project root):

```json
{
  "ralph": {
    "provider": "claude",
    
    "claude": {
      "model": "claude-3-opus-20240229",
      "dangerouslySkipPermissions": false
    },
    
    "cursor": {
      "model": "composer-1",
      "dangerouslyAllowForceWrites": false
    },
    
    "gemini": {
      "model": "gemini-2.5-pro",
      "rateLimitRpm": 60
    },
    
    "codex": {
      "model": "gpt-5.1-codex-max",
      "sandbox": "workspace-write"
    },
    
    "opencode": {
      "model": "claude/claude-3-opus"
    }
  }
}
```

**Environment Variables:**

```bash
# Provider selection
export RALPH_PROVIDER=cursor

# Claude-specific
export RALPH_CLAUDE_MODEL=claude-3-opus-20240229
export RALPH_CLAUDE_DANGEROUSLY_SKIP_PERMISSIONS=true

# Cursor-specific (security)
export RALPH_CURSOR_DANGEROUSLY_ALLOW_FORCE_WRITES=true

# Gemini-specific
export RALPH_GEMINI_MODEL=gemini-2.5-pro
```

**Installing Provider CLIs:**

```bash
# Claude Code (default)
npm install -g @anthropic-ai/claude-code

# Opencode
npm install -g opencode

# Gemini CLI
npm install -g @google/gemini-cli

# Codex CLI
npm install -g @openai/codex

# Cursor Agent - Enable in Cursor IDE settings
```

See [docs/multi-cli-providers.md](../docs/multi-cli-providers.md) for full documentation.

### Claude Code Integration

After running `aaa setup --user`, you can optionally set `CLAUDE_CONFIG_DIR` to use all-agents commands, skills, and agents globally in Claude Code.

Add to your shell config (`~/.zshrc`, `~/.bashrc`, etc.):

```bash
export CLAUDE_CONFIG_DIR="/path/to/all-agents/.claude"
```

Then reload: `source ~/.zshrc`

## Development

### Prerequisites

- [Bun](https://bun.sh/) v1.0+
- Node.js 18+ (for some dependencies)

### Running Locally

```bash
# Run command in dev mode
bun --cwd tools run dev <command>

# Examples
bun --cwd tools run dev gh-search "react hooks"
bun --cwd tools run dev task create "My task"
```

### Testing

```bash
# Run all tests
bun --cwd tools test

# Run specific test file
bun --cwd tools test ./tests/e2e/task.test.ts

# Watch mode
bun --cwd tools run test:watch
```

### Building

```bash
# Build standalone binary
bun --cwd tools run build

# Output: ../bin/aaa
```

### Code Quality

```bash
# TypeScript type checking
bun --cwd tools run typecheck

# Linting
bun --cwd tools run lint
bun --cwd tools run lint:fix

# Formatting
bun --cwd tools run format
bun --cwd tools run format:check
```

## Project Structure

```
tools/
├── src/
│   ├── cli.ts              # Entry point (Commander.js)
│   ├── env.ts              # Environment configuration
│   ├── commands/           # Command implementations
│   │   ├── download/
│   │   ├── extract-conversations.ts
│   │   ├── github/
│   │   ├── gemini/
│   │   ├── parallel-search/
│   │   ├── ralph/          # Autonomous development framework
│   │   │   ├── index.ts    # CLI commands (plan, build, status, calibrate)
│   │   │   ├── claude.ts   # Claude invocation helpers
│   │   │   ├── types.ts    # Type definitions
│   │   │   ├── config.ts   # Config + subtasks loading
│   │   │   ├── session.ts  # Session file utilities
│   │   │   ├── display.ts  # Terminal output utilities
│   │   │   ├── hooks.ts    # Hook execution (log, notify, pause)
│   │   │   ├── status.ts   # Status command
│   │   │   ├── calibrate.ts # Calibrate command
│   │   │   ├── build.ts    # Build loop
│   │   │   └── post-iteration.ts # Post-iteration hook
│   │   ├── setup/
│   │   ├── story.ts
│   │   ├── task.ts
│   │   └── uninstall.ts
│   └── utils/
│       └── paths.ts        # Path resolution
├── lib/                    # Shared utilities
│   ├── log.ts              # CLI logging (chalk)
│   ├── numbered-files.ts   # Auto-numbered file creation
│   ├── research.ts         # Research output formatting
│   └── format.ts           # Filename sanitization
├── tests/
│   ├── e2e/                # End-to-end tests
│   └── lib/                # Unit tests
├── package.json
├── tsconfig.json
└── README.md
```

## Contributing

See the main repository [CLAUDE.md](../CLAUDE.md) for:

- Coding standards
- Conventional commit format
- Development workflow
- Definition of done

For AI-specific development guidance (architecture, patterns, extending), see [tools/CLAUDE.md](./CLAUDE.md).

## License

Part of the All-Agents repository.
