
## Context

`context/` = SWEBOK-aligned atomic docs. Structure: @context/README.md . Philosophy: @context/blocks/docs/atomic-documentation.md

Blocks → foundations → stacks → workflows.

## .claude & .agents

Slash commands, subagents, skills live in `.claude/`. `.agents/` mirrors via symlinks:

- `.agents/skills` → `.claude/skills`
- `.agents/agents` → `.opencode/agents`
- `.agents/commands` → `.claude/commands`

Agents, skills, and slash commands use `context/` atomic docs to drive behavior.

## tools/ (aaa CLI)

Centerpiece. `aaa` CLI implementation + utilities that support skills, agents, and programmatic workflows. 
`aaa ralph` it is fully featured Ralph loop style workflow.

For CLI dev: @tools/CLAUDE.md

Add new functionality in `tools/` to help skills/agents do programmatic things.
