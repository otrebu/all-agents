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
| `dev/code-review`                 | AI-assisted code review workflow.                 | `@docs/coding/workflow/CODE_REVIEW.md`                                                                          |
| `dev/git-commit`                  | Generate conventional commit messages from diffs. | `@docs/coding/workflow/COMMIT.md`                                                                               |
| `dev/start-feature`               | Workflow for starting a new feature branch.       | `@docs/coding/workflow/START_FEATURE.md`                                                                        |
| `dev/complete-feature`            | Workflow for completing/merging a feature.        | `@docs/coding/workflow/COMPLETE_FEATURE.md`                                                                     |
| `parallel-search`                 | Run the parallel search research tool.            | • `@docs/knowledge/parallel-search/PARALLEL_SEARCH.md`<br>• `@docs/knowledge/parallel-search/scripts/search.ts` |
| `gemini-research`                 | Run the Gemini research tool.                     | • `@docs/knowledge/gemini-cli/GEMINI_CLI.md`<br>• `@docs/knowledge/gemini-cli/scripts/search.ts`                |

### Skills

| Skill              | Summary                                         | Documentation                              |
| :----------------- | :---------------------------------------------- | :----------------------------------------- |
| `dev-work-summary` | Generates a summary of recent development work. | `.claude/skills/dev-work-summary/SKILL.md` |
| `brainwriting`     | Facilitates brainwriting ideation sessions.     | `.claude/skills/brainwriting/SKILL.md`     |

### Documentation Index

| Category          | Files                                                                                                                                                                                                                                                                                                                                               |
| :---------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Architecture**  | • `docs/architecture/ARCHITECTURE_OVERVIEW.md`: System architecture overview<br>• `docs/architecture/decisions/`: Architecture Decision Records (ADRs)<br>• `docs/architecture/diagrams/`: Architecture diagrams                                                                                                                                   |
| **Coding (Core)** | • `docs/coding/CODING_OVERVIEW.md`: Index & orientation to coding docs<br>• `docs/coding/CODING_STYLE.md`: FP patterns, naming, comments, logging<br>• `docs/coding/SECURITY.md`: Security guidelines and best practices                                                                                                                          |
| **Workflow**      | • `docs/coding/workflow/DEV_LIFECYCLE.md`: Complete development process & Definition of Done<br>• `docs/coding/workflow/COMMIT.md`: Conventional commits<br>• `docs/coding/workflow/START_FEATURE.md`: Feature branching<br>• `docs/coding/workflow/COMPLETE_FEATURE.md`: Merging & cleanup<br>• `docs/coding/workflow/CODE_REVIEW.md`: Review process<br>• `docs/coding/workflow/REFACTORING.md`: Refactoring strategies |
| **Backend**       | • `docs/coding/backend/BACKEND_OVERVIEW.md`: Backend architecture<br>• `docs/coding/backend/AUTHENTICATION.md`: Auth patterns & implementation<br>• `docs/coding/backend/BACKEND_TESTING.md`: Backend test strategies<br>• `docs/coding/backend/DATA_VALIDATION.md`: Validation patterns                                                           |
| **Frontend**      | • `docs/coding/frontend/FRONTEND_OVERVIEW.md`: Frontend architecture<br>• `docs/coding/frontend/COMPONENT_ARCHITECTURE.md`: Component design patterns<br>• `docs/coding/frontend/FRONTEND_TESTING.md`: Testing strategies<br>• `docs/coding/frontend/STATE_MANAGEMENT.md`: State management patterns                                               |
| **Database**      | • `docs/coding/database/DB_OVERVIEW.md`: Database architecture<br>• `docs/coding/database/DATABASE_MIGRATIONS.md`: Migration strategies                                                                                                                                                                                                            |
| **DevOps**        | • `docs/coding/devops/DEPLOYMENT.md`: Deployment procedures<br>• `docs/coding/devops/MONITORING.md`: Monitoring & observability                                                                                                                                                                                                                    |
| **TypeScript**    | • `docs/coding/ts/TYPESCRIPT.md`: TypeScript setup & config<br>• `docs/coding/ts/STACK.md`: Preferred libraries & tools<br>• `docs/coding/ts/TESTING.md`: Vitest, test patterns<br>• `docs/coding/ts/LOGGING.md`: Structured & CLI logging<br>• `docs/coding/ts/TOOLING.md`: Build tools, linting, formatting                                     |
| **Planning**      | • `docs/planning/roadmap.md`: Product roadmap<br>• `docs/planning/task-template.md`: Task definition template<br>• `docs/planning/stories/`: User story templates & examples                                                                                                                                                                      |
| **Meta**          | • `docs/meta/PROMPTING.md`: Context engineering & prompting standards<br>• `docs/meta/OPTIMIZE-PROMPT.md`: Prompt optimization strategies<br>• `docs/meta/AGENT_TEMPLATES.md`: Agent creation templates<br>• `docs/meta/CLAUDE-CODE-TOOLS-PERMISSIONS.md`: Tool permission configurations                                                           |
| **Knowledge**     | • `docs/knowledge/gemini-cli/GEMINI_CLI.md`: Gemini research tool<br>• `docs/knowledge/parallel-search/PARALLEL_SEARCH.md`: Parallel Search API<br>• `docs/knowledge/github/GH_SEARCH.md`: GitHub code search                                                                                                                                     |
