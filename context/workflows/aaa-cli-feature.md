# AAA CLI Feature Workflow

Wizard-style guide for adding new CLI features to the `aaa` command. Ensures all required files are created and updated consistently.

**Reference:** @tools/CLAUDE.md

## Overview

Adding a CLI feature requires updating 4-5 coordinated files:
1. **Prompt** (source of truth) - The workflow/instructions
2. **CLI** - Command registration and argument handling
3. **Completions** - Tab completion for bash/zsh/fish
4. **SKILL** - Thin wrapper that references the prompt (if applicable)

## Step 1: Gather Requirements

### Required Information

| Question | Example Answer |
|----------|----------------|
| Feature name | `gap-analysis`, `milestone-tasks` |
| Feature type | `plan-subcommand`, `top-level`, `flag` |
| Has auto mode? | yes/no |
| Required arguments | `--milestone <name>`, `--story <id>` |
| Optional flags | `-a, --auto`, `-p, --print` |

### Feature Types

- **plan-subcommand**: Under `aaa ralph plan <feature>` (vision, roadmap, stories, tasks)
- **top-level**: Direct `aaa <feature>` command
- **flag**: New option on existing command

## Step 2: Create Prompt (Source of Truth)

Location depends on feature type:

```
plan-subcommand → context/workflows/ralph/planning/<feature>-{interactive,auto}.md
top-level       → context/workflows/<feature>.md
flag            → Update existing prompt or create new variant
```

### Prompt Structure

```markdown
# <Feature Name> (<Mode>)

[Description of what this does]

## Input Parameter

**Input:** <required args>

**Usage:**
aaa ralph plan <feature> <args>

## Process

1. [Step one]
2. [Step two]
...

## Output

[What gets created/modified]

## Validation

- [ ] Checklist item
```

## Step 3: Update CLI

File: `tools/src/commands/ralph/index.ts` (or appropriate command file)

### For plan-subcommand:

```typescript
planCommand.addCommand(
  new Command("<feature>")
    .description("Description here")
    .requiredOption("--arg <value>", "Arg description")
    .option("-a, --auto", "Use auto mode")
    .action((options) => {
      const contextRoot = getContextRoot();
      const promptPath = getPromptPath(
        contextRoot,
        "<feature>",
        Boolean(options.auto),
      );
      invokeClaude(promptPath, "<feature>", `Context: ${options.arg}`);
    }),
);
```

### For top-level command:

Create new file in `tools/src/commands/<feature>/index.ts` and register in `tools/src/cli.ts`.

## Step 4: Update Completions

Three files to update in `tools/src/commands/completion/`:

### Bash (`bash.ts`)

1. Add flag value completion in PHASE 1 (if dynamic)
2. Add flag to command's flag list in PHASE 3
3. Add subcommand to parent in PHASE 4 (if new subcommand)

### Zsh (`zsh.ts`)

1. Add to subcommands list
2. Add case in args handler with flag completions

### Fish (`fish.ts`)

1. Add subcommand completion
2. Add flag completions with helper function

## Step 5: Add Tests

File: `tools/tests/e2e/<feature>.test.ts`

```typescript
import { describe, expect, test } from "bun:test";
import { execa } from "execa";

describe("aaa <feature>", () => {
  test("--help shows usage", async () => {
    const { exitCode, stdout } = await execa("bun", ["run", "dev", "<feature>", "--help"]);
    expect(exitCode).toBe(0);
    expect(stdout).toContain("<expected content>");
  });
});
```

## Step 6: Update SKILL (if applicable)

If the feature should be auto-triggered by user intent, create a skill:

File: `.claude/skills/<feature>/SKILL.md`

```markdown
---
name: <feature>
description: [Description with auto-trigger phrases]
---

# <Feature>

[Brief description]

## CLI Equivalent

aaa <feature> [options]

## References

- **Workflow:** @context/workflows/<feature>.md
```

## Verification Checklist

- [ ] Prompt file created/updated
- [ ] CLI command added with proper options
- [ ] Bash completion updated
- [ ] Zsh completion updated
- [ ] Fish completion updated
- [ ] E2E test added
- [ ] Test: `aaa <feature> --help` shows options
- [ ] Test: Tab completion works for flags
- [ ] Test: Command executes correctly

## Quick Reference: File Locations

| File | Purpose |
|------|---------|
| `context/workflows/` | Prompt source of truth |
| `tools/src/commands/` | CLI command registration |
| `tools/src/commands/completion/bash.ts` | Bash completion |
| `tools/src/commands/completion/zsh.ts` | Zsh completion |
| `tools/src/commands/completion/fish.ts` | Fish completion |
| `tools/tests/e2e/` | E2E tests |
| `.claude/skills/` | Skill (optional) |
