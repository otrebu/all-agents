---
allowed-tools: Read, Write, Bash(ls:*), Bash(mkdir:*)
description: Create a new Claude Code plugin with proper structure
argument-hint: <what the plugin is about>
---

# Create Claude Code Plugin

Analyze `$ARGUMENTS` to generate a concise plugin name and description.

## Execution

1. **Generate Metadata**: Derive specific `<plugin-name>` and `<plugin-description>` from `$ARGUMENTS`.
2. **Create Plugin**:
   ```bash
   node ./docs/meta/create-plugin.ts <plugin-name> <plugin-description>
   ```
3. **Refine**: Populate generated files with relevant content, including the README.md file.

## Example

Input: "I need something to handle my database migrations automatically"
Action:

```bash
node ./docs/meta/create-plugin.ts migration-automator "Automates database schema migrations and version control"
```
