# Task Management

Create structured task files for planning and execution.

## When to Create Tasks

- New features, bug fixes, refactors
- Work requiring structured planning
- Delegating to humans or AI agents

## Workflow

1. **Read templates** - See @context/meta/task-template.md for available templates:
   - Feature, Bug, Refactor, Spike, Integration

2. **Draft task content** - Pick appropriate template, fill in sections

3. **Derive task name** - Kebab-case, descriptive (e.g., `add-user-auth`, `fix-login-timeout`)

4. **Create file** - Run CLI to get numbered filepath:
   ```bash
   aaa task create <task-name>
   # Creates: docs/planning/tasks/001-<task-name>.md
   ```

5. **Write content** - Save drafted content to the returned filepath

## File Naming

- Format: `<number>-<kebab-case-name>.md`
- Numbers: Zero-padded 3 digits (001, 002, ...)
- Location: `docs/planning/tasks/`

## Template Quick Reference

| Type | When | Key Sections |
|------|------|--------------|
| Feature | New functionality | Steps, Technical Notes, Out of Scope |
| Bug | Fixing broken behavior | Repro Steps, Investigation |
| Refactor | Code improvement | Current/Target State, Risk |
| Spike | Research → decision | Timebox, Questions, Options Table |
| Integration | System changes | Migration Strategy, Monitoring |

## Principles

- **Goal is mandatory** - One sentence, clear outcome
- **AC drives testing** - Each criterion maps to a test
- **Test Plan is explicit** - Include runnable commands
- **Scope boundaries** - "Out of Scope" prevents creep
