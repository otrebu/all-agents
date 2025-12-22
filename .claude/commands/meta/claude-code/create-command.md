---
description: Create a Claude Code command
---

# Create Claude Code Command

## Instructions

- **MANDATORY**: Fetch the latest documentation from WebFetch(https://code.claude.com/docs/en/slash-commands.md#custom-slash-commands)
- Create command file in `.claude/commands/` based on `$ARGUMENTS` (lowercase-hyphens name)
- **MANDATORY**: Set `allowed-tools` in frontmatter if tools are used (Ref: @context/blocks/construct/claude-code-permissions.md) you must allow all tools used by the command.
- **MANDATORY**: You must reference the docs using the `@context/path/to/document.md` format syntax withouth the speech marks. Keep the command as DRY as possible and only include the most relevant docs.
- Content **MUST** follow @context/blocks/docs/prompting.md
-
- Use imperative voice, minimal tokens

## Constraints

- `allowed-tools` required if tools used
