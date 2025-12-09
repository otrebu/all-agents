---
description: Create a Claude Code sub-agent
---

# Create Claude Code Sub-Agent

## Workflow

1. Fetch latest docs: `WebFetch(https://code.claude.com/context/en/sub-agents.md)`
2. Pick the agent structure that fits the best for the agent you are creating from @context/primitives/patterns/agent-templates.md
3. Apply prompting standards from @context/primitives/principles/prompting.md
4. **IMPORTANT**: When a document is provided in the `$ARGUMENTS` input you must only reference it (`@context/path/to/document.md`), don't include the content of the document in the agent file.
5. Create `.claude/agents/[name].md` (lowercase-hyphen naming from `$ARGUMENTS`).
6. Add YAML frontmatter with `tools` to allow all tools used by the agent

## Output

Agent file following structure:

- Clear role definition
- Numbered workflow steps
- Specific output description
- Direct constraint list

## Constraints

- Use doc references (@context/...), not content duplication
- Direct language (no "might", "should consider")
- Structured lists over paragraphs
- Minimal high-signal tokens only
- `tools` in frontmatter if used
