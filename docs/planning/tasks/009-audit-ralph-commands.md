# Task: Audit and Update All Ralph Commands

## Overview

Update all Ralph commands to support appropriate execution modes based on the three-mode system specification.

## Partial Implementation (Already Done)

The following items have been implemented:

- [x] **`invokeClaudeAuto()` helper** - Added to `tools/src/commands/ralph/index.ts`
- [x] **`ralph plan subtasks` fixed** - Now uses `invokeClaudeAuto()` with `-p` flag

Remaining work:
- [ ] Add `invokeClaudeHeadless()` helper
- [ ] Add `getExecutionMode()` helper
- [ ] Update remaining commands (roadmap, stories, tasks, build, calibrate)
- [ ] Add `--headless` flag to all applicable commands
- [ ] Update shell completions

## Current State Audit

| Command | Current Implementation | Current Modes |
|---------|----------------------|---------------|
| `ralph plan vision` | `invokeClaude()` | Interactive only |
| `ralph plan roadmap` | `invokeClaude()` | Interactive only |
| `ralph plan stories` | `invokeClaude()` + `--auto` | Interactive, (broken auto) |
| `ralph plan tasks --story` | `invokeClaude()` + `--auto` | Interactive, (broken auto) |
| `ralph plan tasks --milestone` | `invokeClaude()` | Auto (forced) |
| `ralph plan subtasks` | `invokeClaudeAuto()` ✅ | Auto only (working) |
| `ralph build` | `execSync()` bash script | Observable Auto (with `-i`) |
| `ralph calibrate` | `execSync()` bash script | Observable Auto |

### Issues Found

1. **Auto mode uses `invokeClaude()`**: Should use `invokeClaudeAuto()` with `-p` flag
2. **No headless support**: No `--headless` flag on any command
3. **Inconsistent invocation**: Some use spawnSync, some use execSync with bash
4. **Missing mode helpers**: No centralized `getExecutionMode()` function

## Target State

| Command | Default Mode | Supported Modes | Changes Needed |
|---------|--------------|-----------------|----------------|
| `ralph plan vision` | Interactive | Interactive only | None |
| `ralph plan roadmap` | Interactive | Interactive, Auto, Headless | Add Auto/Headless |
| `ralph plan stories` | Interactive | Interactive, Auto, Headless | Fix Auto, Add Headless |
| `ralph plan tasks --story` | Interactive | Interactive, Auto, Headless | Fix Auto, Add Headless |
| `ralph plan tasks --milestone` | Auto | Auto, Headless | Add Headless |
| `ralph plan subtasks` | Auto | Auto, Headless | Add Headless |
| `ralph build` | Auto | Auto, Headless | Add Headless |
| `ralph calibrate` | Auto | Auto, Headless | Add Headless |

## Implementation Steps

### Step 1: Add Helper Functions

Add to `tools/src/commands/ralph/index.ts`:

```typescript
// Execution mode types
type ExecutionMode = 'interactive' | 'observable-auto' | 'headless';

// Determine mode from CLI options
function getExecutionMode(options: { auto?: boolean; headless?: boolean }): ExecutionMode {
  if (options.headless) return 'headless';
  if (options.auto) return 'observable-auto';
  return 'interactive';
}

// Get prompt path (auto prompt used for both auto modes)
function getPromptPath(
  contextRoot: string,
  sessionName: string,
  mode: ExecutionMode,
): string {
  const suffix = mode === 'interactive' ? 'interactive' : 'auto';
  return path.join(
    contextRoot,
    `context/workflows/ralph/planning/${sessionName}-${suffix}.md`,
  );
}

// Observable Auto: user watches real-time output
function invokeClaudeAuto(
  promptPath: string,
  sessionName: string,
  extraContext?: string,
): void {
  if (!existsSync(promptPath)) {
    console.error(`Prompt not found: ${promptPath}`);
    process.exit(1);
  }

  const promptContent = readFileSync(promptPath, 'utf8');
  let fullPrompt = promptContent;
  if (extraContext) {
    fullPrompt = `${extraContext}\n\n${promptContent}`;
  }

  console.log(`Running ${sessionName} in auto mode...`);
  console.log(`Prompt: ${promptPath}`);
  if (extraContext) console.log(`Context: ${extraContext}`);
  console.log();

  const result = spawnSync('claude', [
    '-p', fullPrompt,
    '--dangerously-skip-permissions'
  ], { stdio: 'inherit' });

  if (result.error) {
    console.error(`Failed to start Claude: ${result.error.message}`);
    process.exit(1);
  }
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

// Headless: JSON output, no real-time display
interface HeadlessResult {
  session_id: string;
  result: string;
  cost_usd: number;
}

function invokeClaudeHeadless(
  promptPath: string,
  extraContext?: string,
): HeadlessResult {
  if (!existsSync(promptPath)) {
    console.error(`Prompt not found: ${promptPath}`);
    process.exit(1);
  }

  const promptContent = readFileSync(promptPath, 'utf8');
  let fullPrompt = promptContent;
  if (extraContext) {
    fullPrompt = `${extraContext}\n\n${promptContent}`;
  }

  const result = spawnSync('claude', [
    '-p', fullPrompt,
    '--dangerously-skip-permissions',
    '--output-format', 'json'
  ], { encoding: 'utf8' });

  if (result.status !== 0) {
    console.error('Headless execution failed');
    if (result.stderr) console.error(result.stderr);
    process.exit(result.status ?? 1);
  }

  return JSON.parse(result.stdout);
}
```

### Step 2: Update Each Command

#### `ralph plan roadmap`

```typescript
planCommand.addCommand(
  new Command("roadmap")
    .description("Start roadmap planning session")
    .option("-a, --auto", "Use auto mode")
    .option("--headless", "Use headless mode (JSON output)")
    .action((options) => {
      const contextRoot = getContextRoot();
      const mode = getExecutionMode(options);
      const promptPath = getPromptPath(contextRoot, "roadmap", mode);

      switch (mode) {
        case 'interactive':
          invokeClaude(promptPath, "roadmap");
          break;
        case 'observable-auto':
          invokeClaudeAuto(promptPath, "roadmap");
          break;
        case 'headless':
          const result = invokeClaudeHeadless(promptPath);
          console.log(JSON.stringify(result, null, 2));
          break;
      }
    }),
);
```

#### `ralph plan stories`

```typescript
planCommand.addCommand(
  new Command("stories")
    .description("Start story planning session for a milestone")
    .requiredOption("--milestone <name>", "Milestone name to plan stories for")
    .option("-a, --auto", "Use auto mode")
    .option("--headless", "Use headless mode (JSON output)")
    .action((options) => {
      const contextRoot = getContextRoot();
      const mode = getExecutionMode(options);
      const promptPath = getPromptPath(contextRoot, "stories", mode);
      const context = `Planning stories for milestone: ${options.milestone}`;

      switch (mode) {
        case 'interactive':
          invokeClaude(promptPath, "stories", context);
          break;
        case 'observable-auto':
          invokeClaudeAuto(promptPath, "stories", context);
          break;
        case 'headless':
          const result = invokeClaudeHeadless(promptPath, context);
          console.log(JSON.stringify(result, null, 2));
          break;
      }
    }),
);
```

#### `ralph plan tasks`

```typescript
planCommand.addCommand(
  new Command("tasks")
    .description("Plan tasks for a story or milestone")
    .option("--story <id>", "Story ID to plan tasks for")
    .option("--milestone <name>", "Milestone to plan tasks for (all stories)")
    .option("-a, --auto", "Use auto mode")
    .option("--headless", "Use headless mode (JSON output)")
    .action((options) => {
      // Validation...

      const contextRoot = getContextRoot();
      const mode = getExecutionMode(options);

      if (options.milestone) {
        // Milestone mode: uses special orchestrator prompt
        const promptPath = path.join(
          contextRoot,
          "context/workflows/ralph/planning/tasks-milestone.md",
        );
        const context = `Generating tasks for milestone: ${options.milestone}`;

        if (mode === 'interactive') {
          console.error("Error: --milestone requires --auto or --headless mode");
          process.exit(1);
        } else if (mode === 'observable-auto') {
          invokeClaudeAuto(promptPath, "tasks-milestone", context);
        } else {
          const result = invokeClaudeHeadless(promptPath, context);
          console.log(JSON.stringify(result, null, 2));
        }
        return;
      }

      // Story mode
      const promptPath = getPromptPath(contextRoot, "tasks", mode);
      const context = `Planning tasks for story: ${options.story}`;

      switch (mode) {
        case 'interactive':
          invokeClaude(promptPath, "tasks", context);
          break;
        case 'observable-auto':
          invokeClaudeAuto(promptPath, "tasks", context);
          break;
        case 'headless':
          const result = invokeClaudeHeadless(promptPath, context);
          console.log(JSON.stringify(result, null, 2));
          break;
      }
    }),
);
```

#### `ralph plan subtasks`

```typescript
planCommand.addCommand(
  new Command("subtasks")
    .description("Generate subtasks for a task")
    .requiredOption("--task <id>", "Task ID to generate subtasks for")
    .option("--headless", "Use headless mode (JSON output)")
    .action((options) => {
      const contextRoot = getContextRoot();
      const promptPath = getPromptPath(contextRoot, "subtasks", 'observable-auto');
      const context = `Generating subtasks for task: ${options.task}`;

      if (options.headless) {
        const result = invokeClaudeHeadless(promptPath, context);
        console.log(JSON.stringify(result, null, 2));
      } else {
        invokeClaudeAuto(promptPath, "subtasks", context);
      }
    }),
);
```

#### `ralph build`

Add `--headless` option to build command:

```typescript
ralphCommand.addCommand(
  new Command("build")
    .description("Run subtask iteration loop")
    .option("--subtasks <path>", "Subtasks file path", DEFAULT_SUBTASKS_PATH)
    .option("-p, --print", "Print prompt without executing")
    .option("-i, --interactive", "Pause between iterations")
    .option("--headless", "Run in headless mode (JSON output)")
    .option("--max-iterations <n>", "Max iterations per subtask", "3")
    .option("--validate-first", "Run pre-build validation")
    .action((options) => {
      // Pass headless flag to build.sh
      const headless = options.headless ? "true" : "false";

      execSync(
        `bash "${scriptPath}" "${subtasksPath}" "${options.maxIterations}" "${interactive}" "${validateFirst}" "${permFlag}" "${headless}"`,
        { stdio: options.headless ? 'pipe' : 'inherit' },
      );
    }),
);
```

#### `ralph calibrate`

Add `--headless` option:

```typescript
ralphCommand.addCommand(
  new Command("calibrate")
    .description("Run calibration checks")
    .argument("[subcommand]", "Check type")
    .option("--force", "Skip approval")
    .option("--review", "Require approval")
    .option("--headless", "Use headless mode (JSON output)")
    .action((subcommand, options) => {
      const args = [subcommand];
      if (options.force) args.push("--force");
      if (options.review) args.push("--review");
      if (options.headless) args.push("--headless");

      execSync(`bash "${scriptPath}" ${args.join(" ")}`, {
        stdio: options.headless ? 'pipe' : 'inherit',
      });
    }),
);
```

### Step 3: Update Shell Completions

#### Bash (`tools/src/commands/completion/bash.ts`)

Add `--headless` to each command's flag list:

```bash
# PHASE 3: Flag completion for each subcommand
roadmap)
    COMPREPLY=($(compgen -W "-a --auto --headless" -- "$cur"))
    ;;
stories)
    COMPREPLY=($(compgen -W "--milestone -a --auto --headless" -- "$cur"))
    ;;
tasks)
    COMPREPLY=($(compgen -W "--story --milestone -a --auto --headless" -- "$cur"))
    ;;
subtasks)
    COMPREPLY=($(compgen -W "--task --headless" -- "$cur"))
    ;;
build)
    COMPREPLY=($(compgen -W "--subtasks -p --print -i --interactive --headless --max-iterations --validate-first" -- "$cur"))
    ;;
calibrate)
    COMPREPLY=($(compgen -W "--force --review --headless intention technical improve all" -- "$cur"))
    ;;
```

#### Zsh (`tools/src/commands/completion/zsh.ts`)

```zsh
roadmap)
    _arguments \
        '(-a --auto)'{-a,--auto}'[Use auto mode]' \
        '--headless[Use headless mode (JSON output)]'
    ;;
# Similar for other commands...
```

#### Fish (`tools/src/commands/completion/fish.ts`)

```fish
complete -c aaa -n '__fish_aaa_ralph_plan_roadmap' -l headless -d 'Use headless mode (JSON output)'
# Similar for other commands...
```

### Step 4: Update Bash Scripts

Update `build.sh` and `calibrate.sh` to accept `--headless` flag and pass `--output-format json` to Claude when in headless mode.

## Files to Modify

| File | Changes |
|------|---------|
| `tools/src/commands/ralph/index.ts` | Add helpers, update all commands |
| `tools/src/commands/completion/bash.ts` | Add `--headless` flags |
| `tools/src/commands/completion/zsh.ts` | Add `--headless` flags |
| `tools/src/commands/completion/fish.ts` | Add `--headless` flags |
| `tools/src/commands/ralph/scripts/build.sh` | Handle headless mode |
| `tools/src/commands/ralph/scripts/calibrate.sh` | Handle headless mode |

## Manual Testing Checklist

After implementation, verify:

- [ ] `aaa ralph plan vision` → Interactive dialogue
- [ ] `aaa ralph plan roadmap` → Interactive dialogue
- [ ] `aaa ralph plan roadmap --auto` → Observable auto
- [ ] `aaa ralph plan roadmap --headless` → JSON output
- [ ] `aaa ralph plan stories --milestone ralph` → Interactive
- [ ] `aaa ralph plan stories --milestone ralph --auto` → Observable auto
- [ ] `aaa ralph plan stories --milestone ralph --headless` → JSON output
- [ ] `aaa ralph plan tasks --story S-001` → Interactive
- [ ] `aaa ralph plan tasks --story S-001 --auto` → Observable auto
- [ ] `aaa ralph plan tasks --story S-001 --headless` → JSON output
- [ ] `aaa ralph plan tasks --milestone ralph --auto` → Observable auto
- [ ] `aaa ralph plan tasks --milestone ralph --headless` → JSON output
- [ ] `aaa ralph plan subtasks --task T-001` → Observable auto
- [ ] `aaa ralph plan subtasks --task T-001 --headless` → JSON output
- [ ] `aaa ralph build` → Observable auto
- [ ] `aaa ralph build --headless` → JSON output
- [ ] `aaa ralph calibrate intention` → Observable auto
- [ ] `aaa ralph calibrate intention --headless` → JSON output
- [ ] Tab completion shows `--headless` for applicable commands

## Validation

After this task:
- [ ] All commands support their designated modes
- [ ] Helper functions centralized and reusable
- [ ] Shell completions updated for all three shells
- [ ] Manual testing checklist passes
