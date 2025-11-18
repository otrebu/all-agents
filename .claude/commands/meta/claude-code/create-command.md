---
description: Create a Claude Code command
---

# Create Claude Code Command

## Instructions

- **MANDATORY**: Fetch the latest documentation from WebFetch(https://code.claude.com/docs/en/slash-commands.md)
- Create command file in `.claude/commands/` based on `$ARGUMENTS` (lowercase-hyphens name)
- **MANDATORY**: Set `allowed-tools` in frontmatter if tools are used (Ref: `@docs/meta/CLAUDE-CODE-TOOLS-PERMISSIONS.md`) you must allow all tools used by the command.
- Content **MUST** follow `PROMPTING.md` "Command Context Template":
  - Purpose, When to Use, Parameters, Usage Example, Output, Error Handling
- Use imperative voice, minimal tokens

## Constraints

- `allowed-tools` required if tools used
