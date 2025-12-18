# CLAUDE.md

Development reference for Claude Code when working in this repo. For setup, usage, and features overview, see [README.md](README.md).

## Stack

- **Runtime:** Bun (TypeScript)
- **CLI libs:** commander, chalk, ora, boxen
- **Linting:** ESLint (uba-eslint-config), `no-console` allowed
- **Testing:** bun:test (E2E)

See @context/stacks/cli/cli-bun.md for full stack patterns.

## CLI Tools (`aaa`)

This repo includes the `aaa` CLI for research and task management:

```bash
aaa <command>
```

For CLI development (adding commands, architecture, extending): see [tools/CLAUDE.md](tools/CLAUDE.md).

## Workflow

### Definition of Done

1. Tests passing (when tests exist)
2. README/docs updated
3. Committed with conventional commit

### Commits

Use **Conventional Commits**: `feat(scope): description`

Run `/dev:git-commit` to create commits. **Never** add Claude signature/co-authorship.

### Branching

Ask before creating feature branches. Use `/dev:start-feature <description>` if needed.

## Important Notes

- No emojis in code/commits unless requested
- FP-first: avoid `this`, `new`, classes (except errors)
- Follow @context/workflows/dev-lifecycle.md when coding
