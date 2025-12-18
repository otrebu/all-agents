---
description: Create a Claude Code command
---

# Create Claude Code Command

## Instructions

- **MANDATORY**: Fetch the latest documentation from WebFetch(https://code.claude.com/context/en/slash-commands.md)
- Create command file in `.claude/commands/` based on `$ARGUMENTS` (lowercase-hyphens name)
- **MANDATORY**: Set `allowed-tools` in frontmatter if tools are used (Ref: `@context/blocks/principles/claude-code-tools-permissions.md`) you must allow all tools used by the command.
- Content **MUST** follow `PROMPTING.md` "Command Context Template":
  - Purpose, When to Use, Parameters, Usage Example, Output, Error Handling
- Use imperative voice, minimal tokens

## Constraints

- `allowed-tools` required if tools used
