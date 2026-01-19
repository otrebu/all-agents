# Task: Three-Mode System Definition

## Overview

Formalize the three distinct execution modes for Ralph commands, establishing a clear specification that all other tasks follow.

## Three Execution Modes

| Mode | User Sees | User Input | Claude Invocation | Use Case |
|------|-----------|------------|-------------------|----------|
| **Interactive** | Real-time dialogue | Responds to questions | `claude --append-system-prompt` | New prompts, unfamiliar domains |
| **Observable Auto** | Real-time progress | None (watches) | `claude -p` with `stdio: inherit` | Proven prompts, want to monitor |
| **Headless** | Nothing until end | None | `claude -p --output-format json` | Batch ops, CI/CD |

## Trust Gradient Principle

The three modes form a trust gradient:

```
Low Trust ─────────────────────────────────────────────► High Trust

Interactive          Observable Auto          Headless
(human in loop)      (human on loop)         (human reviews output)
```

### When to Use Each Mode

| Trust Level | Mode | Context |
|-------------|------|---------|
| **Low** | Interactive | New prompts, unfamiliar domains, high-stakes decisions |
| **Medium** | Observable Auto | Proven prompts, want visibility, can intervene if needed |
| **High** | Headless | Batch operations, CI/CD, well-tested workflows |

## CLI Flag Design

### Flags

| Flag | Meaning |
|------|---------|
| (none) | Interactive mode (default for human-centric commands) |
| `-a, --auto` | Observable Auto mode |
| `--headless` | Headless mode (JSON output, no stdio) |

### Flag Combinations

- `ralph plan vision` → Interactive (always)
- `ralph plan tasks --story S-001` → Interactive
- `ralph plan tasks --story S-001 --auto` → Observable Auto
- `ralph plan tasks --story S-001 --headless` → Headless
- `ralph build` → Observable Auto (default) or Headless with flag

### Mode Determination Logic

```typescript
function determineMode(options: CommandOptions): ExecutionMode {
  if (options.headless) return 'headless';
  if (options.auto) return 'observable-auto';
  return 'interactive';
}
```

## Per-Command Mode Mapping

| Command | Default | Supports |
|---------|---------|----------|
| `ralph plan vision` | Interactive | Interactive only |
| `ralph plan roadmap` | Interactive | Interactive, Auto, Headless |
| `ralph plan stories --milestone` | Interactive | Interactive, Auto, Headless |
| `ralph plan tasks --story` | Interactive | Interactive, Auto, Headless |
| `ralph plan tasks --milestone` | Auto | Auto, Headless |
| `ralph plan subtasks --task` | Auto | Auto, Headless |
| `ralph build` | Auto | Auto, Headless |
| `ralph calibrate` | Auto | Auto, Headless |
| `ralph status` | N/A | Direct output (no Claude) |

## Prompt File Conventions

### No New Headless Prompts Needed

The same `-auto.md` prompt works for both Observable Auto and Headless modes. The difference is in *how* Claude is invoked, not *what* it's told.

### Prompt Naming

```
context/workflows/ralph/planning/
├── vision-interactive.md      # Interactive only
├── roadmap-interactive.md     # Interactive mode
├── roadmap-auto.md            # Auto mode (both observable and headless)
├── stories-interactive.md
├── stories-auto.md
├── tasks-interactive.md
├── tasks-auto.md
├── tasks-milestone.md         # Special orchestrator for --milestone
└── subtasks-auto.md           # Auto only (no interactive)
```

### Selection Logic

```typescript
function getPromptPath(sessionName: string, mode: ExecutionMode): string {
  if (mode === 'interactive') {
    return `${sessionName}-interactive.md`;
  }
  // Both 'observable-auto' and 'headless' use the same auto prompt
  return `${sessionName}-auto.md`;
}
```

## Invocation Patterns

### Interactive Mode

```typescript
function invokeClaude(promptPath: string, sessionName: string): void {
  const promptContent = readFileSync(promptPath, 'utf8');
  spawnSync('claude', [
    '--append-system-prompt', promptContent,
    `Please begin the ${sessionName} session.`
  ], { stdio: 'inherit' });
}
```

### Observable Auto Mode

```typescript
function invokeClaudeAuto(promptPath: string, context: string): void {
  const promptContent = readFileSync(promptPath, 'utf8');
  const fullPrompt = `${context}\n\n${promptContent}`;
  spawnSync('claude', [
    '-p', fullPrompt,
    '--dangerously-skip-permissions'
  ], { stdio: 'inherit' });  // User sees real-time output
}
```

### Headless Mode

```typescript
interface HeadlessResult {
  session_id: string;
  result: string;
  cost_usd: number;
}

function invokeClaudeHeadless(promptPath: string, context: string): HeadlessResult {
  const promptContent = readFileSync(promptPath, 'utf8');
  const fullPrompt = `${context}\n\n${promptContent}`;
  const result = spawnSync('claude', [
    '-p', fullPrompt,
    '--dangerously-skip-permissions',
    '--output-format', 'json'
  ], { encoding: 'utf8' });
  return JSON.parse(result.stdout);
}
```

## Output Handling by Mode

| Mode | stdout | Return Value |
|------|--------|--------------|
| Interactive | Real-time dialogue | Exit code |
| Observable Auto | Real-time progress | Exit code |
| Headless | Nothing (or progress to stderr) | JSON with session_id, result, cost |

## Validation

After implementing this specification:

- [ ] All commands support their designated modes per the mapping table
- [ ] `--auto` flag works consistently across commands
- [ ] `--headless` flag produces JSON output
- [ ] Mode determination logic is centralized in a helper function
- [ ] Shell completions include `--headless` flag for applicable commands

## Implementation Notes

1. **Centralize mode handling**: Create shared helper functions in `tools/src/commands/ralph/index.ts`
2. **Backward compatibility**: Existing `-a, --auto` behavior unchanged
3. **CI/CD friendly**: `--headless` mode exits with proper codes and parseable output
4. **Permission handling**: Both auto modes use `--dangerously-skip-permissions`
