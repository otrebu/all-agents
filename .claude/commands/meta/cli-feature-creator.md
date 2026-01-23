# CLI Feature Creator

Wizard-style guide for adding new CLI features to the `aaa` command. Ensures all required files are created and updated consistently.

## Overview

Adding a CLI feature requires updating 4-5 coordinated files:
1. **Prompt** (source of truth) - The workflow/instructions
2. **CLI** - Command registration and argument handling
3. **Completions** - Tab completion for bash/zsh/fish
4. **SKILL** - Thin wrapper that references the prompt

This wizard guides you through each step.

## Step 1: Gather Requirements

Ask the user about the feature:

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
\`\`\`
aaa ralph plan <feature> <args>
\`\`\`

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

File: `tools/src/commands/ralph/index.ts`

### For plan-subcommand:

```typescript
// ralph plan <feature> - description
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
      invokeClaude(
        promptPath,
        "<feature>",
        `Context: ${options.arg}`,
      );
    }),
);
```

### For flag on existing command:

Add `.option("--flag <value>", "description")` and update action logic.

## Step 4: Update Completions

Three files to update:

### Bash (`tools/src/commands/completion/bash.ts`)

1. Add flag value completion in PHASE 1 (if dynamic):
```bash
        --<flag>)
            COMPREPLY=($(compgen -W "$(aaa __complete <type> 2>/dev/null)" -- "$cur"))
            return
            ;;
```

2. Add flag to command's flag list in PHASE 3:
```bash
                            <feature>)
                                COMPREPLY=($(compgen -W "--flag1 --flag2 -a --auto" -- "$cur"))
                                return
                                ;;
```

3. Add subcommand to parent in PHASE 4 (if new subcommand):
```bash
            elif [[ "$subcmd" == "plan" && -z "$subsubcmd" ]]; then
                COMPREPLY=($(compgen -W "vision roadmap stories tasks subtasks <feature>" -- "$cur"))
```

### Zsh (`tools/src/commands/completion/zsh.ts`)

1. Add to `_aaa_ralph_plan` subcommands list:
```zsh
    subcommands=(
        ...
        '<feature>:Description'
    )
```

2. Add case in args handler:
```zsh
                <feature>)
                    _arguments \\
                        '--flag[Description]:type:_completion_func' \\
                        '(-a --auto)'{-a,--auto}'[Use auto mode]'
                    ;;
```

### Fish (`tools/src/commands/completion/fish.ts`)

1. Add subcommand completion:
```fish
complete -c aaa -n '__fish_aaa_using_subsubcommand ralph plan' -a <feature> -d 'Description'
```

2. Add flag completions:
```fish
# ralph plan <feature> options
function __fish_aaa_ralph_plan_<feature>
    set -l cmd (commandline -opc)
    test (count $cmd) -ge 4 -a "$cmd[2]" = ralph -a "$cmd[3]" = plan -a "$cmd[4]" = <feature>
end
complete -c aaa -n __fish_aaa_ralph_plan_<feature> -l flag -d 'Description' -xa '(aaa __complete type 2>/dev/null)'
complete -c aaa -n __fish_aaa_ralph_plan_<feature> -s a -l auto -d 'Use auto mode'
```

## Step 5: Update SKILL

File: `.claude/skills/ralph-plan/SKILL.md` (or create new skill)

Add documentation section:

```markdown
## <Feature> Planning

[Description]

### Invocation

\`\`\`
/ralph-plan <feature> <args>
\`\`\`

### What Happens

1. [Step one]
2. [Step two]
...

### Important Notes

- [Note one]
- [Note two]
```

Update CLI Equivalent section:
```bash
aaa ralph plan <feature> --flag <value>
```

Update References section:
```markdown
- **<Feature> prompt:** `context/workflows/ralph/planning/<feature>-interactive.md`
```

## Step 6: Verification Checklist

- [ ] Prompt file created/updated
- [ ] CLI command added with proper options
- [ ] Bash completion updated (PHASE 1, 3, and/or 4)
- [ ] Zsh completion updated (subcommands + args)
- [ ] Fish completion updated (subcommand + options)
- [ ] SKILL.md documented
- [ ] Test: `aaa ralph plan <feature> --help` shows options
- [ ] Test: Tab completion works for flags
- [ ] Test: Command invokes Claude with correct prompt

## Quick Reference: File Locations

| File | Purpose |
|------|---------|
| `context/workflows/ralph/planning/*.md` | Prompt source of truth |
| `tools/src/commands/ralph/index.ts` | CLI command registration |
| `tools/src/commands/completion/bash.ts` | Bash completion |
| `tools/src/commands/completion/zsh.ts` | Zsh completion |
| `tools/src/commands/completion/fish.ts` | Fish completion |
| `.claude/skills/ralph-plan/SKILL.md` | Skill documentation |

## Example: Adding `--milestone` to tasks

This is a real example from the codebase:

1. **Prompt**: Created `context/workflows/ralph/planning/tasks-milestone.md`
2. **Agent**: Created `.claude/agents/task-generator.md` (for parallel spawning)
3. **CLI**: Updated tasks command to accept `--milestone` or `--story`
4. **Completions**: Added `--milestone` to bash/zsh/fish with milestone completion
5. **SKILL**: Updated Tasks Planning section with milestone mode docs
