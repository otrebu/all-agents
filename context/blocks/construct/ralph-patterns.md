---
depends:
  - "@context/blocks/docs/atomic-documentation.md"
tags: [ralph, autonomous, patterns]
---

# Ralph Development Patterns

Ergonomics and patterns for developing Ralph features. This document is the source of truth for how Ralph commands should be structured.

## 1. Two Entry Points (Skill vs CLI)

Ralph commands have two entry points that share the same prompts (DRY):

```
SKILL (Interactive mode):
└── /ralph plan vision → User already in Claude Code, skill loads prompt

CLI (Supervised & Headless modes):
├── aaa ralph plan stories --supervised → Bash loop of chat sessions
└── aaa ralph plan stories --headless   → Bash loop of -p with JSON + logs
```

**DRY Principle**: Same prompts used by both skills and CLI.

```
context/workflows/ralph/planning/
├── vision-interactive.md    ← Skill reads this
├── stories-auto.md          ← CLI reads this (supervised & headless)
└── ...
```

## 2. Three Execution Modes

| Mode | Entry | Invocation | User Can Type? | Output |
|------|-------|------------|----------------|--------|
| **Interactive** | Skill | None (already in Claude Code) | Yes | Chat |
| **Supervised** | CLI | `claude` (chat, no `-p`) | Yes (watches, can jump in) | Chat + next item on exit |
| **Headless** | CLI | `claude -p --output-format json` | No | JSON + file logs |

### Mode Details

**Interactive** (Skill, Low Trust)
- Entry: `/ralph plan vision` skill in Claude Code
- You're already in an interactive session
- Full participation, exploration, questions
- No CLI needed - skill loads the prompt directly

**Supervised** (CLI, Medium Trust)
- Entry: `aaa ralph plan stories --supervised`
- Spawns real `claude` chat sessions (NOT `-p` mode)
- Uses `stdio: inherit` - user CAN type if needed
- When chat exits, loop continues to next item
- User watches, intervenes when needed, auto-advances

**Headless** (CLI, High Trust)
- Entry: `aaa ralph plan stories --headless`
- Uses `claude -p --output-format json`
- No chat UI, runs autonomously
- **Logs to file** so user can see what happened
- Suitable for CI/CD, overnight runs, batch processing

### Trust Gradient

```
Low Trust ────────────────────────────────► High Trust

Interactive          Supervised          Headless
(skill, in chat)    (CLI, chat loop)    (CLI, -p mode)
    │                    │                   │
    └─ Full chat         └─ Watches chat     └─ Reviews logs
       User participates    Can type if needed   JSON for tooling
                            Next on exit
```

## 3. CLI Command Pattern

CLI only handles Supervised and Headless modes - Interactive is skills only.

```typescript
import { spawnSync } from "node:child_process";

// Type for execution modes (CLI only - interactive is skills)
type ExecutionMode = "supervised" | "headless";

// Determine mode from CLI options
function determineMode(options: { supervised?: boolean; headless?: boolean }): ExecutionMode {
  if (options.headless) return "headless";
  return "supervised"; // default for CLI
}

// Supervised: spawn chat session, user watches and can type
function invokeClaudeChat(promptPath: string, extraContext?: string): void {
  const promptContent = readFileSync(promptPath, "utf8");
  let fullPrompt = promptContent;
  if (extraContext) {
    fullPrompt = `${extraContext}\n\n${promptContent}`;
  }

  // Chat mode (no -p), stdio: inherit so user can watch AND type
  const result = spawnSync(
    "claude",
    ["--append-system-prompt", fullPrompt, "Please begin the session."],
    { stdio: "inherit" }
  );

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

// Headless result type
interface HeadlessResult {
  sessionId: string;
  result: string;
  durationMs: number;
  costUsd: number;
  numTurns: number;
}

// Headless: -p mode with JSON output + file logging
function invokeClaudeHeadless(
  promptPath: string,
  logFile: string,
  extraContext?: string
): HeadlessResult {
  const promptContent = readFileSync(promptPath, "utf8");
  let fullPrompt = promptContent;
  if (extraContext) {
    fullPrompt = `${extraContext}\n\n${promptContent}`;
  }

  const result = spawnSync(
    "claude",
    ["-p", fullPrompt, "--dangerously-skip-permissions", "--output-format", "json"],
    { encoding: "utf8" }
  );

  if (result.status !== 0) {
    console.error("Claude headless invocation failed");
    process.exit(result.status ?? 1);
  }

  // Parse JSON output
  const output = JSON.parse(result.stdout);

  // Log to file for user visibility
  const logEntry = {
    timestamp: new Date().toISOString(),
    sessionId: output.session_id,
    result: output.result,
    durationMs: output.duration_ms,
    costUsd: output.total_cost_usd,
    numTurns: output.num_turns,
  };
  appendFileSync(logFile, JSON.stringify(logEntry) + "\n");

  return {
    sessionId: output.session_id,
    result: output.result,
    durationMs: output.duration_ms,
    costUsd: output.total_cost_usd,
    numTurns: output.num_turns,
  };
}
```

### Adding New Ralph Commands

When adding a new Ralph CLI command:

```typescript
ralphCommand.addCommand(
  new Command("review")
    .option("-s, --supervised", "Watch each review, continue on exit")
    .option("-H, --headless", "Run all reviews autonomously with logging")
    .action((options) => {
      const items = getItemsToProcess();
      const promptPath = "context/workflows/ralph/review/story-review.md";
      const mode = determineMode(options);

      for (const item of items) {
        if (mode === "headless") {
          // JSON output + file logging
          invokeClaudeHeadless(promptPath, "logs/review.jsonl", item.context);
        } else {
          // Supervised: spawn chat session, user watches
          invokeClaudeChat(promptPath, item.context);
          // Loop continues when chat exits
        }
      }
    })
);
```

## 4. When to Use Each Mode

| Mode | Use When |
|------|----------|
| **Interactive** (Skill) | You want to participate, explore, ask questions |
| **Supervised** (CLI) | Review 10 stories - watch each, intervene if needed, auto-advance |
| **Headless** (CLI) | CI/CD, overnight runs, batch processing |

### Mode Selection Flow

```
User wants to plan something?
    │
    ├── Wants to participate interactively?
    │   └── Use SKILL: /ralph plan vision
    │
    └── Processing multiple items?
        │
        ├── Wants to watch and maybe intervene?
        │   └── Use CLI: aaa ralph plan stories --supervised
        │
        └── Fully autonomous (CI/CD, batch)?
            └── Use CLI: aaa ralph plan stories --headless
```

## 5. Flag Conventions

| Flag | Short | Description |
|------|-------|-------------|
| `--supervised` | `-s` | Supervised mode (default for CLI multi-item commands) |
| `--headless` | `-H` | Headless mode with JSON output + logging |

**Note**: `-H` (capital H) avoids conflict with `-h/--help`.

## References

- @docs/planning/VISION.md - Three-mode system definition
- @context/workflows/ralph/ - Prompt files
- @tools/src/commands/ralph/index.ts - CLI implementation
