# Task: Update CLI Feature Creator Meta-Skill

## Overview

Update `.claude/commands/meta/cli-feature-creator.md` to guide three-mode implementation for new CLI features.

## Current State

The CLI feature creator currently guides:
1. Gathering requirements (feature name, type, auto mode)
2. Creating prompts (interactive vs auto)
3. Updating CLI (index.ts)
4. Updating completions (bash/zsh/fish)
5. Updating SKILL documentation

## Changes Required

### Step 0: Mode Decision Tree (NEW)

Add a new preliminary step before gathering requirements:

```markdown
## Step 0: Determine Mode Support

Before proceeding, determine which modes the feature should support:

### Decision Tree

1. **Is this a human-centric planning activity?**
   - Yes → Support Interactive mode
   - No → Skip Interactive

2. **Does the feature benefit from real-time visibility?**
   - Yes → Support Observable Auto mode
   - Typically yes for: planning, building, calibration

3. **Could this run in CI/CD or batch operations?**
   - Yes → Support Headless mode
   - Typically yes for: auto-generation, validation, analysis

### Mode Mapping Template

| Feature | Interactive | Observable Auto | Headless |
|---------|-------------|-----------------|----------|
| Human-guided planning | Default | With --auto | With --headless |
| Auto-generation | No | Default | With --headless |
| Analysis/validation | No | Default | With --headless |
| Status/display | N/A | N/A | N/A (direct output) |
```

### Updated Step 1: Gather Requirements

Update the requirements table:

```markdown
### Required Information

| Question | Example Answer |
|----------|----------------|
| Feature name | `gap-analysis`, `milestone-tasks` |
| Feature type | `plan-subcommand`, `top-level`, `flag` |
| **Supported modes** | Interactive, Auto, Headless |
| **Default mode** | Interactive or Auto |
| Required arguments | `--milestone <name>`, `--story <id>` |
| Optional flags | `-a, --auto`, `--headless` |
```

### Updated Step 2: Create Prompt

Add note about prompt reuse:

```markdown
### Prompt Structure

**Important:** Auto prompts work for both Observable Auto and Headless modes.
No separate headless prompts needed.

Location:
- Interactive → `{feature}-interactive.md`
- Auto (both modes) → `{feature}-auto.md`
```

### Updated Step 3: Update CLI

Replace `invokeClaude` with three invocation patterns:

```typescript
// Add to index.ts helpers section

// Helper: Determine execution mode from options
function getExecutionMode(options: { auto?: boolean; headless?: boolean }): 'interactive' | 'observable-auto' | 'headless' {
  if (options.headless) return 'headless';
  if (options.auto) return 'observable-auto';
  return 'interactive';
}

// Helper: Get prompt path (auto prompt used for both auto modes)
function getPromptPath(
  contextRoot: string,
  sessionName: string,
  mode: 'interactive' | 'observable-auto' | 'headless',
): string {
  const suffix = mode === 'interactive' ? 'interactive' : 'auto';
  return path.join(
    contextRoot,
    `context/workflows/ralph/planning/${sessionName}-${suffix}.md`,
  );
}

// Interactive mode: human in the loop
function invokeClaude(
  promptPath: string,
  sessionName: string,
  extraContext?: string,
): void {
  const promptContent = readFileSync(promptPath, 'utf8');
  let fullPrompt = promptContent;
  if (extraContext) {
    fullPrompt = `${extraContext}\n\n${promptContent}`;
  }

  console.log(`Starting ${sessionName} planning session...`);
  spawnSync('claude', [
    '--append-system-prompt', fullPrompt,
    `Please begin the ${sessionName} session.`
  ], { stdio: 'inherit' });
}

// Observable Auto mode: human watches, no input
function invokeClaudeAuto(
  promptPath: string,
  sessionName: string,
  extraContext?: string,
): void {
  const promptContent = readFileSync(promptPath, 'utf8');
  let fullPrompt = promptContent;
  if (extraContext) {
    fullPrompt = `${extraContext}\n\n${promptContent}`;
  }

  console.log(`Running ${sessionName} in auto mode...`);
  spawnSync('claude', [
    '-p', fullPrompt,
    '--dangerously-skip-permissions'
  ], { stdio: 'inherit' });
}

// Headless mode: no output until complete, returns JSON
interface HeadlessResult {
  session_id: string;
  result: string;
  cost_usd: number;
}

function invokeClaudeHeadless(
  promptPath: string,
  extraContext?: string,
): HeadlessResult {
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
    process.exit(result.status ?? 1);
  }

  return JSON.parse(result.stdout);
}
```

### Command Pattern Template

```typescript
// Example: Command supporting all three modes
planCommand.addCommand(
  new Command("<feature>")
    .description("Description here")
    .requiredOption("--arg <value>", "Arg description")
    .option("-a, --auto", "Use auto mode (observable)")
    .option("--headless", "Use headless mode (JSON output)")
    .action((options) => {
      const contextRoot = getContextRoot();
      const mode = getExecutionMode(options);
      const promptPath = getPromptPath(contextRoot, "<feature>", mode);

      const context = `Context: ${options.arg}`;

      switch (mode) {
        case 'interactive':
          invokeClaude(promptPath, "<feature>", context);
          break;
        case 'observable-auto':
          invokeClaudeAuto(promptPath, "<feature>", context);
          break;
        case 'headless':
          const result = invokeClaudeHeadless(promptPath, context);
          console.log(JSON.stringify(result, null, 2));
          break;
      }
    }),
);
```

### Updated Step 4: Update Completions

Add `--headless` to all three shell completions:

**Bash:**
```bash
<feature>)
    COMPREPLY=($(compgen -W "--arg -a --auto --headless" -- "$cur"))
    return
    ;;
```

**Zsh:**
```zsh
<feature>)
    _arguments \
        '--arg[Arg description]:value:' \
        '(-a --auto)'{-a,--auto}'[Use auto mode]' \
        '--headless[Use headless mode (JSON output)]'
    ;;
```

**Fish:**
```fish
complete -c aaa -n __fish_aaa_ralph_plan_<feature> -s a -l auto -d 'Use auto mode'
complete -c aaa -n __fish_aaa_ralph_plan_<feature> -l headless -d 'Use headless mode (JSON output)'
```

### Updated Step 5: Update SKILL.md

Add modes documentation section:

```markdown
## <Feature> Planning

[Description]

### Modes

| Mode | Flag | Behavior |
|------|------|----------|
| Interactive | (none) | Socratic dialogue, human responds |
| Observable Auto | `--auto` | Real-time progress, no input needed |
| Headless | `--headless` | JSON output, for CI/CD |

### Invocation

\`\`\`bash
# Interactive (default)
aaa ralph plan <feature> --arg value

# Observable auto
aaa ralph plan <feature> --arg value --auto

# Headless (CI/CD)
aaa ralph plan <feature> --arg value --headless
\`\`\`
```

### Updated Verification Checklist

```markdown
## Step 6: Verification Checklist

- [ ] Mode decision documented in task/story
- [ ] Prompt file created (one for interactive, one for auto modes)
- [ ] CLI command added with `--auto` and `--headless` flags (if applicable)
- [ ] Bash completion updated with new flags
- [ ] Zsh completion updated with new flags
- [ ] Fish completion updated with new flags
- [ ] SKILL.md documents all supported modes
- [ ] Test: Interactive mode starts dialogue
- [ ] Test: `--auto` mode shows real-time output
- [ ] Test: `--headless` mode returns JSON
```

## Files to Modify

| File | Changes |
|------|---------|
| `.claude/commands/meta/cli-feature-creator.md` | Add Step 0, update all steps |

## Validation

After this task:
- [ ] Meta-skill includes mode decision tree
- [ ] Three invocation patterns documented with code
- [ ] Completion templates include `--headless`
- [ ] SKILL.md template includes modes table
