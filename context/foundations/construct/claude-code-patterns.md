---
depends: []
tags: [claude-code, ai-agents, patterns]
---

# Claude Code Patterns

Friction patterns and solutions discovered from analyzing Claude Code conversations. Reference for effective agent orchestration and tool usage.

**For:** Claude Code users, agent developers, AI workflow designers

## Subagent Constraints

Subagents have reduced capabilities compared to the main agent.

**Key Limitations:**

- Cannot spawn nested subagents (no recursive Task calls)
- Limited tool access (varies by agent type)
- No access to conversation history from parent
- Independent context window per subagent

```typescript
// BAD: Subagent trying to spawn another subagent
// This will fail silently or error
Task("analyze", "spawn another agent to help"); // ❌

// GOOD: Keep subagent tasks atomic and self-contained
Task("analyze", "read files X, Y, Z and return summary"); // ✓
```

**Pattern:** Design subagent tasks to be self-contained. If a task needs multiple agents, orchestrate from the main agent.

## Output Truncation

Outputs exceeding ~30KB get truncated silently with `... [N lines truncated] ...`.

**Signals:**

- `... [247 lines truncated] ...` in output
- Missing data at end of large results
- Incomplete JSON structures

**Pattern: Write to File**

```typescript
// BAD: Return large data directly
const results = await analyzeAllFiles(); // 50KB output
return results; // ❌ Truncated!

// GOOD: Write to file, return path
const results = await analyzeAllFiles();
const outputPath = "/tmp/analysis-results.json";
await Bun.write(outputPath, JSON.stringify(results, null, 2));
return `Analysis complete. Results at: ${outputPath}`; // ✓
```

**Thresholds:**

| Output Size | Action |
|-------------|--------|
| < 10KB | Return directly |
| 10-30KB | Consider file output |
| > 30KB | Always write to file |

## Context Passing

`@references` in prompts are literal text, NOT automatically resolved.

**Problem:**

```typescript
// BAD: @reference not resolved for subagent
Task("analyze", "Read @context/blocks/docs/maintenance.md and summarize");
// Subagent receives literal "@context/blocks/docs/maintenance.md" string
```

**Solution: Use Absolute Paths**

```typescript
// GOOD: Full absolute paths
Task("analyze", `Read /Users/me/project/context/blocks/docs/maintenance.md and summarize`);

// GOOD: Pass resolved content
const content = await Bun.file("context/blocks/docs/maintenance.md").text();
Task("analyze", `Analyze this content:\n\n${content}`);
```

**Key Rules:**

- Each subagent re-reads files independently
- Pass absolute paths, not relative
- For large files, pass summaries or specific sections
- Include all necessary context in the prompt

## Timeouts

Default timeout of 30 seconds is often too short for complex tasks.

**Guidance by Task Type:**

| Task Type | Timeout | Examples |
|-----------|---------|----------|
| Simple lookup | 30s | Find function definition, check file exists |
| Exploration | 60s | Search codebase for pattern, list all usages |
| Complex analysis | 120s | Multi-file refactoring, architecture review |
| External API | 120-180s | Web fetch, API calls with retries |

**No Automatic Retry:** Timeouts fail permanently. Design tasks to fit within limits.

```typescript
// Adjust timeout for complex tasks
Task("analyze-architecture", prompt, { timeout: 120000 }); // 2 minutes

// Break large tasks into smaller pieces
// Instead of one 5-minute task, run five 1-minute tasks
```

## Agent Selection

Choose the right agent type for the task.

| Agent | Best For | Capabilities |
|-------|----------|--------------|
| `Explore` | Fast codebase search | Glob, Grep, Read - quick answers |
| `Plan` | Architecture design | Multi-file analysis, planning |
| `general-purpose` | Complex multi-step | Full tool access, extended reasoning |
| `claude-code-guide` | Claude Code questions | Meta-knowledge about the tool |

**Selection Heuristics:**

```typescript
// Quick lookup → Explore
Task("Explore", "Find all files importing 'lodash'");

// Design work → Plan
Task("Plan", "Design database schema for user auth");

// Multi-step implementation → general-purpose
Task("general-purpose", "Refactor logger to use structured format");
```

## Parallel Orchestration

Pattern for spawning multiple agents and synthesizing results.

**Workflow:**

1. Validate data count
2. Spawn agents in parallel
3. Collect results
4. Synthesize/aggregate

```typescript
// Step 1: Validate count BEFORE spawning
const files = await glob("src/**/*.ts");
if (files.length > 20) {
  // Don't spawn 50 agents for 50 files
  // Batch or use different strategy
}

// Step 2: Spawn parallel agents
const tasks = files.map((file) =>
  Task("analyze", `Analyze ${file} for security issues`)
);
const results = await Promise.all(tasks);

// Step 3: Synthesize
const summary = synthesize(results);
return summary;
```

**Anti-patterns:**

- Spawning agents without knowing item count
- No aggregation step (30 separate responses)
- Unbounded parallelism (spawn hundreds of agents)

**Rule of Thumb:** Max 10-15 parallel agents. Batch larger workloads.

## Interactive CLI Handling

Some commands hang waiting for user input.

**Commands That Hang:**

- `ssh` - Prompts for password/confirmation
- REPLs - `node`, `python`, `bun repl`
- Interactive installers - Some npm packages
- Confirmations - "Are you sure? [y/N]"

**Bypass Flags:**

```bash
# Package managers
npm install --yes
yarn --non-interactive
pnpm install --reporter=silent

# Git operations
git commit --no-edit  # Use default message
git merge --no-edit   # Skip merge message editor

# Other tools
rm -f file.txt        # Force, no confirmation
cp -f src dst         # Force overwrite
```

**Detect Package Manager First:**

```typescript
// Check for lock files before running install
const hasPackageLock = await exists("package-lock.json");
const hasYarnLock = await exists("yarn.lock");
const hasPnpmLock = await exists("pnpm-lock.yaml");
const hasBunLock = await exists("bun.lockb");

if (hasBunLock) {
  await exec("bun install");
} else if (hasPnpmLock) {
  await exec("pnpm install");
} else if (hasYarnLock) {
  await exec("yarn install");
} else {
  await exec("npm install");
}
```

**When Stuck:** Kill the process (Ctrl+C) and use non-interactive alternative.

## Quick Reference

| Issue | Solution |
|-------|----------|
| Output truncated | Write to file, return path |
| @reference not resolved | Use absolute paths |
| Task timing out | Increase timeout, break into smaller tasks |
| Subagent can't spawn agent | Orchestrate from main agent |
| Command hanging | Use --yes, -y, --non-interactive flags |
| Wrong package manager | Check lock files first |
| Too many parallel agents | Batch into groups of 10-15 |

## When to Use

- Debugging unexpected Claude Code behavior
- Designing multi-agent workflows
- Understanding tool limitations
- Optimizing agent task performance

## When NOT to Use

- General Claude prompting (see @context/blocks/docs/prompting.md)
- Non-Claude Code AI tools
- Single-agent simple tasks
