---
description: Create a Claude Code sub-agent
---

# Create Claude Code Sub-Agent

## Workflow

1. Fetch latest docs: `WebFetch(https://code.claude.com/docs/en/sub-agents.md)`
2. Pick the agent structure that fits the best for the agent you are creating from @docs/meta/AGENT_TEMPLATES.md
3. Apply prompting standards from @docs/meta/PROMPTING.md
4. **IMPORTANT**: When a document is provided in the `$ARGUMENTS` input you must only reference it (`@docs/path/to/document.md`), don't include the content of the document in the agent file.
5. Create `.claude/agents/[name].md` (lowercase-hyphen naming from `$ARGUMENTS`).
6. Read @docs/meta/CLAUDE-CODE-TOOLS-PERMISSIONS.md to understand how tools are configured
7. Add YAML frontmatter with `tools` to allow all tools used by the agent

## Output

Agent file following structure:

- Clear role definition
- Numbered workflow steps
- Specific output description
- Direct constraint list

## Constraints

- Use doc references (@docs/...), not content duplication
- Direct language (no "might", "should consider")
- Structured lists over paragraphs
- Minimal high-signal tokens only
- `tools` in frontmatter if used
