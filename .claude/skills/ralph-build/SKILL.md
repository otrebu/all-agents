---
name: ralph-build
description: Run Ralph autonomous build loop. Use when user asks to "ralph build", "run build loop", or needs to process subtasks autonomously. Executes iterations against a subtasks.json queue.
---

# Ralph Build

Execute the Ralph autonomous build loop to process subtasks from a queue.

## Usage

```
/ralph-build [options]
```

## Options

| Option | Description |
|--------|-------------|
| `--subtasks <path>` | Path to subtasks.json file (default: `subtasks.json`) |
| `-s, --supervised` | Supervised mode (default) |
| `-H, --headless` | Headless mode (for automation/CI) |
| `-i, --interactive` | Pause between iterations for user review |
| `-p, --print` | Output the prompt without executing (dry run) |
| `--validate-first` | Run pre-build validation before starting the loop |
| `--max-iterations <n>` | Maximum retry attempts per subtask (`0` = unlimited, default: `0`) |

## Workflow

### 1. Get Assignment from Queue

Use the same runtime queue logic as CLI build:

```bash
aaa ralph subtasks next --milestone <name-or-path>
```

Use `aaa ralph subtasks list --milestone <name-or-path>` to inspect pending items.

### 2. Print Mode (-p)

If print mode is requested:
1. Output the full prompt content that would be sent to Claude
2. Do NOT execute any iterations
3. Exit after printing

### 3. Validate First (--validate-first)

If validate-first is requested:
1. Run pre-build validation prompt on the next subtask
2. If validation fails, report the issue and stop
3. If validation passes, proceed to build

### 4. Execute Build Loop

For each iteration, follow the ralph-iteration workflow:

@context/workflows/ralph/building/ralph-iteration.md

### 5. Interactive Mode (-i)

After each completed iteration:
1. Display summary of what was done
2. Prompt: "Continue to next subtask? [Y/n]"
3. Wait for user confirmation before proceeding
4. User can abort the loop at any time

### 6. Max Iterations (--max-iterations)

If a subtask fails repeatedly:
1. Track retry count per subtask
2. Stop after `max-iterations` failures on the same subtask
3. Report the failure and suggest next steps

### Runtime Source of Truth

Runtime behavior is defined by the TypeScript CLI implementation:

```bash
aaa ralph build [options]
```

This skill should follow CLI defaults and queue semantics.

## CLI Equivalent

This skill provides the same functionality as:

```bash
aaa ralph build [options]
```

## References

- **Iteration prompt:** @context/workflows/ralph/building/ralph-iteration.md
- **Pre-build validation:** @context/workflows/ralph/building/pre-build-validation.md
