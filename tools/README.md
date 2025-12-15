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
- Prompt to set `CLAUDE_CONFIG_DIR` for global Claude Code integration

### Project Integration

Set up all-agents integration in another project:

```bash
# From your project directory
aaa setup --project
```

This will:

- Set up `CLAUDE_CONFIG_DIR` to use all-agents globally
- Configure Claude Code to use shared commands, skills, and agents

### Uninstall

```bash
aaa uninstall --user    # Remove global CLI installation
aaa uninstall --project # Remove project integration
```

## Quick Start

```bash
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

| Command                      | Description                                                | Output Location                  |
| ---------------------------- | ---------------------------------------------------------- | -------------------------------- |
| `download <urls...>`         | Fetch URLs, extract text, save as markdown                 | `docs/research/downloads/`       |
| `gh-search <query>`          | GitHub code search with intent-based ranking               | `docs/research/github/`          |
| `gemini-research <query>`    | Google Search via Gemini CLI (modes: quick, deep, code)    | `docs/research/gemini/`          |
| `parallel-search <query>`    | Multi-angle web research with configurable depth           | `docs/research/parallel-search/` |
| `task create <description>`  | Create auto-numbered task file (NNN-name.md)               | `docs/planning/tasks/`           |
| `story create <description>` | Create auto-numbered story file (NNN-name.md)              | `docs/planning/stories/`         |
| `setup`                      | Install CLI (`--user`) or integrate project (`--project`)  | -                                |
| `uninstall`                  | Remove CLI (`--user`) or project integration (`--project`) | -                                |

### Command Examples

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

Output: `docs/research/gemini/YYYYMMDD-HHMMSS-{topic}.md`

#### parallel-search

```bash
# Basic search
aaa parallel-search "best practices for API design"

# Higher quality (slower, more thorough)
aaa parallel-search "microservices architecture" --processor pro
```

Output:

- `docs/research/parallel-search/YYYYMMDD-HHMMSS-{topic}.md` (formatted report)
- `docs/research/parallel-search/raw/YYYYMMDD-HHMMSS-{topic}.json` (raw data)

#### task create / story create

```bash
# Create task
aaa task create "Implement user authentication"
# → docs/planning/tasks/001-implement-user-authentication.md

# Create story
aaa story create "As a user, I want to reset my password"
# → docs/planning/stories/001-as-a-user-i-want-to-reset-my-password.md

# Custom directory
aaa task create "Setup CI/CD pipeline" -d "backend/tasks"
# → docs/planning/backend/tasks/001-setup-ci-cd-pipeline.md
```

Files are auto-numbered incrementally (001, 002, 003...).

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
│   │   ├── github/
│   │   ├── gemini/
│   │   ├── parallel-search/
│   │   ├── setup/
│   │   ├── story/
│   │   ├── task/
│   │   └── uninstall/
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
