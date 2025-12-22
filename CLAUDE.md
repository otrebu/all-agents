# CLAUDE.md

Development reference for Claude Code when working in this repo. For setup, usage, and features overview, see [README.md](README.md).

## Stack

- **Runtime:** Bun (TypeScript)
- **CLI libs:** commander, chalk, ora, boxen
- **Linting:** ESLint (uba-eslint-config), `no-console` allowed
- **Testing:** bun:test (E2E)

## CLI Tools (`aaa`)

This repo includes the `aaa` CLI for research and task management, and any other command to support ai agents:

```bash
aaa <command>
```

For CLI development (adding commands, architecture, extending): see [tools/CLAUDE.md](tools/CLAUDE.md).

## Workflow

Follow: @context/workflows/dev-lifecycle-simple.md
