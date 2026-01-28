---
name: meta:claude-code:create-agent
description: Create a Claude Code sub-agent
allowed-tools: Read, Write, WebFetch
---

# Create Claude Code Sub-Agent

## When to Use

Use this command when you need to create a specialized agent for:
- Repetitive multi-step tasks requiring specific tool access
- Domain-specific workflows with custom constraints
- Task decomposition into autonomous sub-agents

## Workflow

1. Fetch latest docs: `WebFetch(https://docs.anthropic.com/en/docs/claude-code/sub-agents)`
2. Pick the agent structure that fits the best for the agent you are creating from @context/blocks/docs/prompting-agent-templates.md
3. Apply prompting standards from @context/blocks/docs/prompting.md
4. **IMPORTANT**: When a document is provided in the `$ARGUMENTS` input you must only reference it (`@context/path/to/document.md`), don't include the content of the document in the agent file.
5. Create `.claude/agents/[name].md` (lowercase-hyphen naming from `$ARGUMENTS`).
6. Add YAML frontmatter with appropriate fields (see Frontmatter Fields below)

## Frontmatter Fields

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Agent identifier (lowercase-hyphen) |
| `description` | string | When/what agent does (for agent selection) |
| `tools` | string[] | Tools agent can use: Read, Write, Edit, Bash, etc. |
| `disallowedTools` | string[] | Tools explicitly blocked for this agent |
| `model` | string | Model override: "sonnet", "opus", "haiku" |
| `permissionMode` | string | "default", "acceptEdits", "bypassPermissions" |
| `skills` | string[] | Skills available to this agent |
| `hooks` | object | Lifecycle hooks (onStart, onComplete, etc.) |

## Output

Agent file following structure:

- Clear role definition
- Numbered workflow steps
- Specific output description
- Direct constraint list

## Constraints

- Use doc references ("@context/...), not content duplication
- Direct language (no "might", "should consider")
- Structured lists over paragraphs
- Minimal high-signal tokens only
- `tools` in frontmatter if used
