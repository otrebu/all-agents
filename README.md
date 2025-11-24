# all-agents

Briding between Cursor and Claude code AI configuration, making it work as much as possible for web / cloud agents too that don't have the full capabilities of their local counterparts.

## The Problem Space

As the repository grew, several issues emerged with the initial flat structure:

1.  **Fragmented Tooling**: Research scripts (`gh-search`, `gemini-research`) were standalone files with duplicated setup logic (logging, auth, parsing).
2.  **Context vs. Code Mixing**: Documentation (`docs/`) and executable code (`lib/`, scripts) were intermingled, making it unclear what was intended for LLM context versus what was tooling infrastructure.
3.  **Distribution Difficulty**: No unified binary or entry point made it hard to package or deploy the toolkit to other environments.
4.  **Performance**: Node.js startup time for individual scripts accumulated, and dependency management was scattered.

## Architectural Solution

We restructured the repository to clearly separate concerns and leverage modern tooling:

1.  **Context Separation**: All documentation, knowledge bases, and meta-instructions are now in `context/`. This directory is pure "brain" material for the AI.
2.  **Unified Tooling**: A new `tools/` directory contains the source code for a unified CLI (`ai-agent`).
    *   **Bun Runtime**: Switched to [Bun](https://bun.sh) for instant startup times and built-in TypeScript support.
    *   **Command Registry**: Implemented a modular registry pattern (`tools/src/commands/`) where commands are plugins.
    *   **Single Binary**: The toolkit compiles to a single, self-contained binary (`bin/ai-agent`) that includes all dependencies.
3.  **Robust Path Resolution**: A specialized path resolver ensures the CLI can find the `context/` directory regardless of where the binary is executed (symlinked, globally installed, or local).
4.  **Clean Dependencies**: Centralized `package.json` in `tools/` prevents root clutter.

## Functionality / Prompts

### Sub-agents

| Agent Name        | Summary                                                                                                        | Documentation                                        |
| :---------------- | :------------------------------------------------------------------------------------------------------------- | :--------------------------------------------------- |
| `gemini-research` | Web research via Gemini CLI with Google Search grounding. Generates raw JSON data and a Markdown placeholder.  | `@context/knowledge/gemini-cli/GEMINI_CLI.md`           |
| `parallel-search` | Multi-angle web research using Parallel Search API. Useful for comparative analysis and deep content research. | `@context/knowledge/parallel-search/PARALLEL_SEARCH.md` |
| `eslint-fixer` ❌ | Automated ESLint fixing orchestrator (Work In Progress).                                                       | N/A                                                  |

### Commands

| Command                           | Summary                                           | Documentation / Reference                                                                                       |
| :-------------------------------- | :------------------------------------------------ | :-------------------------------------------------------------------------------------------------------------- |
| `how-to-prompt`                   | Guides on effective prompting strategies.         | `@context/meta/PROMPTING.md`                                                                                       |
| `optimize-prompt`                 | Tools and guides to optimize existing prompts.    | `@context/meta/OPTIMIZE-PROMPT.md`                                                                                 |
| `meta/claude-code/create-command` | Create a new slash command for Claude Code.       | Web docs<br>• `@context/meta/PROMPTING.md`<br>• `@context/meta/CLAUDE-CODE-TOOLS-PERMISSIONS.md`                      |
| `meta/claude-code/create-agent`   | Create a new sub-agent configuration.             | Web docs<br>• `@context/meta/AGENT_TEMPLATES.md`                                                                   |
| `meta/claude-code/create-plugin`  | Scaffold a new plugin structure.                  | `create-plugin.ts` script                                                                                       |
| `meta/claude-code/create-skill`   | Scaffold a new skill structure.                   | `create-skill.py` script                                                                                        |
| `meta/create-cursor-rule`         | Create a new `.cursorrules` file.                 | `@context/meta/PROMPTING.md`                                                                                       |
| `dev/code-review`                 | AI-assisted code review workflow.                 | `@context/coding/CODE_REVIEW.md`                                                                                   |
| `dev/git-commit`                  | Generate conventional commit messages from diffs. | `@context/coding/COMMIT.md`                                                                                        |
| `dev/start-feature`               | Workflow for starting a new feature branch.       | `@context/coding/START_FEATURE.md`                                                                                 |
| `dev/complete-feature`            | Workflow for completing/merging a feature.        | `@context/coding/COMPLETE_FEATURE.md`                                                                              |
| `parallel-search`                 | Run the parallel search research tool.            | • `@context/knowledge/parallel-search/PARALLEL_SEARCH.md`<br>• `@context/knowledge/parallel-search/scripts/search.ts` |
| `gemini-research`                 | Run the Gemini research tool.                     | • `@context/knowledge/gemini-cli/GEMINI_CLI.md`<br>• `@context/knowledge/gemini-cli/scripts/search.ts`                |

### Skills

| Skill              | Summary                                         | Documentation                              |
| :----------------- | :---------------------------------------------- | :----------------------------------------- |
| `dev-work-summary` | Generates a summary of recent development work. | `.claude/skills/dev-work-summary/SKILL.md` |
| `brainwriting`     | Facilitates brainwriting ideation sessions.     | `.claude/skills/brainwriting/SKILL.md`     |

### Documentation Index

| Category       | Files                                                                                                                                                                                                                                                                                                                                                                                                                               |
| :------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Coding**     | • `context/coding/DEVELOPMENT_WORKFLOW.md`: Core development workflow guidelines<br>• `context/coding/CODING_STYLE.md`: Comprehensive coding style guide<br>• `context/coding/COMMIT.md`: Conventional commit standards<br>• `context/coding/CODE_REVIEW.md`: Code review process and checklist<br>• `context/coding/START_FEATURE.md`: Feature branching workflow<br>• `context/coding/COMPLETE_FEATURE.md`: Feature completion and merging workflow |
| **TypeScript** | • `context/coding/ts/TYPESCRIPT.md`: TypeScript specific guidelines<br>• `context/coding/ts/STACK.md`: Tech stack and toolchain<br>• `context/coding/ts/TESTING.md`: Testing strategies and tools<br>• `context/coding/ts/LOGGING.md`: Logging standards for CLI tools<br>• `context/coding/ts/TOOLING.md`: Development tooling setup                                                                                                              |
| **Meta**       | • `context/meta/PROMPTING.md`: Context engineering and prompting guide<br>• `context/meta/OPTIMIZE-PROMPT.md`: Strategies for optimizing prompts<br>• `context/meta/AGENT_TEMPLATES.md`: Templates for creating new agents<br>• `context/meta/CLAUDE-CODE-TOOLS-PERMISSIONS.md`: Tool permission configurations                                                                                                                                 |
| **Knowledge**  | • `context/knowledge/gemini-cli/GEMINI_CLI.md`: Gemini research tool documentation<br>• `context/knowledge/parallel-search/PARALLEL_SEARCH.md`: Parallel search tool documentation<br>• `context/knowledge/github/GH_SEARCH.md`: GitHub code search documentation                                                                                                                                                                            |
