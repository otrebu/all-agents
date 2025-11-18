---
description: Create a Claude Code sub-agent
---

# Create Claude Code Sub-Agent

## Instructions

- **MANDATORY**: Fetch the latest documentation from WebFetch(https://code.claude.com/docs/en/sub-agents.md)
- Create agent file in `.claude/agents/` based on `$ARGUMENTS` (lowercase-hyphens name)
- **MANDATORY**: Set `allowed-tools` in YAML frontmatter (Ref: `@docs/meta/CLAUDE-CODE-TOOLS-PERMISSIONS.md`), you must allow all tools used by the agent.
- Content **MUST** follow `PROMPTING.md` "Agent-Specific Context Template":
  - Role, Capabilities, Available Tools, Workflow, Output Format, Constraints

## Constraints

- `allowed-tools` required if tools used
