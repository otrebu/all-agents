# all-agents

Briding between Cursor and Claude code AI configuration, making it work as much as possible for web / cloud agents too that don't have the full capabilities of their local counterparts.

## Functionality / Prompts

### Sub-agents

| Agent Name        | Summary                                                                                                        | Documentation                                        |
| :---------------- | :------------------------------------------------------------------------------------------------------------- | :--------------------------------------------------- |
| `gemini-research` | Web research via Gemini CLI with Google Search grounding. Generates raw JSON data and a Markdown placeholder.  | `@docs/knowledge/gemini-cli/GEMINI_CLI.md`           |
| `parallel-search` | Multi-angle web research using Parallel Search API. Useful for comparative analysis and deep content research. | `@docs/knowledge/parallel-search/PARALLEL_SEARCH.md` |
| `eslint-fixer` ❌ | Automated ESLint fixing orchestrator (Work In Progress).                                                       | N/A                                                  |

### Commands

| Command                           | Summary                                           | Documentation / Reference                                                                                       |
| :-------------------------------- | :------------------------------------------------ | :-------------------------------------------------------------------------------------------------------------- |
| `how-to-prompt`                   | Guides on effective prompting strategies.         | `@docs/meta/PROMPTING.md`                                                                                       |
| `optimize-prompt`                 | Tools and guides to optimize existing prompts.    | `@docs/meta/OPTIMIZE-PROMPT.md`                                                                                 |
| `meta/claude-code/create-command` | Create a new slash command for Claude Code.       | Web docs<br>• `@docs/meta/PROMPTING.md`<br>• `@docs/meta/CLAUDE-CODE-TOOLS-PERMISSIONS.md`                      |
| `meta/claude-code/create-agent`   | Create a new sub-agent configuration.             | Web docs<br>• `@docs/meta/AGENT_TEMPLATES.md`                                                                   |
| `meta/claude-code/create-plugin`  | Scaffold a new plugin structure.                  | `create-plugin.ts` script                                                                                       |
| `meta/claude-code/create-skill`   | Scaffold a new skill structure.                   | `create-skill.py` script                                                                                        |
| `meta/create-cursor-rule`         | Create a new `.cursorrules` file.                 | `@docs/meta/PROMPTING.md`                                                                                       |
| `dev/code-review`                 | AI-assisted code review workflow.                 | `@docs/coding/CODE_REVIEW.md`                                                                                   |
| `dev/git-commit`                  | Generate conventional commit messages from diffs. | `@docs/coding/COMMIT.md`                                                                                        |
| `dev/start-feature`               | Workflow for starting a new feature branch.       | `@docs/coding/START_FEATURE.md`                                                                                 |
| `dev/complete-feature`            | Workflow for completing/merging a feature.        | `@docs/coding/COMPLETE_FEATURE.md`                                                                              |
| `parallel-search`                 | Run the parallel search research tool.            | • `@docs/knowledge/parallel-search/PARALLEL_SEARCH.md`<br>• `@docs/knowledge/parallel-search/scripts/search.ts` |
| `gemini-research`                 | Run the Gemini research tool.                     | • `@docs/knowledge/gemini-cli/GEMINI_CLI.md`<br>• `@docs/knowledge/gemini-cli/scripts/search.ts`                |

### Skills

| Skill              | Summary                                         | Documentation                              |
| :----------------- | :---------------------------------------------- | :----------------------------------------- |
| `dev-work-summary` | Generates a summary of recent development work. | `.claude/skills/dev-work-summary/SKILL.md` |
| `brainwriting`     | Facilitates brainwriting ideation sessions.     | `.claude/skills/brainwriting/SKILL.md`     |

### Documentation Index

| Category       | Files                                                                                                                                                                                                                                                                                                                                                                                                                               |
| :------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Coding**     | • `docs/coding/DEVELOPMENT_WORKFLOW.md`: Core development workflow guidelines<br>• `docs/coding/CODING_STYLE.md`: Comprehensive coding style guide<br>• `docs/coding/COMMIT.md`: Conventional commit standards<br>• `docs/coding/CODE_REVIEW.md`: Code review process and checklist<br>• `docs/coding/START_FEATURE.md`: Feature branching workflow<br>• `docs/coding/COMPLETE_FEATURE.md`: Feature completion and merging workflow |
| **TypeScript** | • `docs/coding/ts/TYPESCRIPT.md`: TypeScript specific guidelines<br>• `docs/coding/ts/STACK.md`: Tech stack and toolchain<br>• `docs/coding/ts/TESTING.md`: Testing strategies and tools<br>• `docs/coding/ts/LOGGING.md`: Logging standards for CLI tools<br>• `docs/coding/ts/TOOLING.md`: Development tooling setup                                                                                                              |
| **Meta**       | • `docs/meta/PROMPTING.md`: Context engineering and prompting guide<br>• `docs/meta/OPTIMIZE-PROMPT.md`: Strategies for optimizing prompts<br>• `docs/meta/AGENT_TEMPLATES.md`: Templates for creating new agents<br>• `docs/meta/CLAUDE-CODE-TOOLS-PERMISSIONS.md`: Tool permission configurations                                                                                                                                 |
| **Knowledge**  | • `docs/knowledge/gemini-cli/GEMINI_CLI.md`: Gemini research tool documentation<br>• `docs/knowledge/parallel-search/PARALLEL_SEARCH.md`: Parallel search tool documentation<br>• `docs/knowledge/github/GH_SEARCH.md`: GitHub code search documentation                                                                                                                                                                            |
