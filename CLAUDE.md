# CLAUDE.md

Development reference for Claude Code when working in this repo. For setup, usage, and features overview, see [README.md](README.md).

## Stack

- **Runtime:** Bun (TypeScript)
- **CLI libs:** commander, chalk, ora, boxen
- **Linting:** ESLint (uba-eslint-config), `no-console` allowed
- **Testing:** bun:test (E2E)

See @context/coding/stacks/STACK_TS_BUN_CLI.md for full stack patterns.

## CLI Tools (`aaa`)

This repo includes the `aaa` CLI for research and task management. Run from project root:

```bash
bun --cwd tools run dev <command>
```

For CLI development (adding commands, architecture, extending): see [tools/CLAUDE.md](tools/CLAUDE.md).

## Coding Style

See @context/coding/CODING_STYLE.md. Key points:

- FP-first, avoid classes (except custom errors)
- Small, focused functions
- Explicit naming: `timeoutMs`, `priceGBP`, `isValid`
- CLI logging via `tools/lib/log.ts` (chalk-based)

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
- Follow @context/coding/workflow/DEV_LIFECYCLE.md when coding
