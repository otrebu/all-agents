# Fix Opencode/Cursor Interactive Mode in Multi-CLI Providers

## Background

We implemented multi-CLI provider support for Ralph, allowing users to choose between Claude, Opencode, Cursor, Gemini, and Codex. While headless mode works for all providers, **interactive mode only works for Claude**. Opencode and Cursor exit immediately instead of staying interactive.

## Current Status

### What Works ✅

1. **Provider Infrastructure**
   - All 5 providers registered and available
   - Provider detection works (shows installed providers)
   - Configuration system supports all providers
   - CLI flags `--provider` and `--model` work

2. **Claude**
   - Interactive mode: ✅ Works perfectly
   - Headless mode: ✅ Works perfectly
   - All features functional

3. **Headless Mode (All Providers)**
   - Opencode: ✅ Works with NDJSON parsing
   - Cursor: ✅ Works with JSON output
   - Gemini: ✅ Works with JSON output
   - Codex: ✅ Works with JSONL parsing

4. **Completion System**
   - Dynamic provider completion shows installed providers
   - Model completion per provider
   - Command flag completion

### What Doesn't Work ❌

1. **Opencode Interactive Mode**
   - Starts but exits immediately (within seconds)
   - Cannot type responses
   - Process continues running in background detached from terminal

2. **Cursor Interactive Mode**
   - Same issue as Opencode
   - TUI applications require full terminal control

3. **Gemini Interactive Mode**
   - Not fully tested but likely same issue

### Root Cause Analysis

**The Problem:** TUI applications (opencode, cursor) require a real TTY (terminal) for interactive mode. When spawned from Bun/Node via `Bun.spawnSync()`, the child process doesn't properly inherit the TTY from the parent terminal.

**Why Claude Works:** Claude is REPL-based, not TUI-based. It handles non-TTY mode gracefully and doesn't require full terminal control.

**Why Others Don't:** Opencode and Cursor are TUI applications that:
- Use raw terminal mode
- Take over the entire terminal
- Check `process.stdin.isTTY`
- Require exclusive terminal access

## Attempted Solutions

### 1. Bun.spawnSync with stdio: inherit ❌
```typescript
Bun.spawnSync(args, { stdio: ["inherit", "inherit", "inherit"] })
```
**Result:** Exits immediately

### 2. Node spawnSync with stdin input ❌
```typescript
spawnSync(command, args, { input: fullPrompt, stdio: ["pipe", "inherit", "inherit"] })
```
**Result:** Sends input but closes stdin, preventing interaction

### 3. Shell exec wrapper ❌
```typescript
Bun.spawnSync(["/bin/sh", "-c", `exec ${command}`], ...)
```
**Result:** Same issue - no TTY inheritance

### 4. script command for PTY ❌
```typescript
Bun.spawnSync(["script", "-q", "/dev/null", ...args], ...)
```
**Result:** Creates PTY but loses interactive control

### 5. expect command ❌
```typescript
Bun.spawnSync(["expect", "-c", "spawn ...; interact"], ...)
```
**Result:** Script generation issues with complex prompts

### 6. Bun PTY Support ❌
```typescript
Bun.spawn(args, { stdin: "pty", stdout: "pty" })
```
**Result:** Not available in Bun 1.2.23 (PR #25319 still open)

## Technical Constraints

1. **Bun.spawnSync cannot do PTY**
   - PTY requires async I/O
   - `spawnSync` with PTY throws error

2. **Bun PTY PR not merged**
   - PR #25319 created Dec 3, 2025
   - Still open as of now
   - No timeline for merge

3. **Provider Interface is Synchronous**
   ```typescript
   invokeChat(options: ChatOptions): ProviderResult
   ```
   - Changing to async would be breaking
   - Would require refactoring all provider calls

## What's Left To Try

### Option 1: Use Bun.spawn (Async) with Interface Refactoring
**Effort:** High
**Approach:**
- Change `invokeChat` to return `Promise<ProviderResult>`
- Use `Bun.spawn()` instead of `Bun.spawnSync()`
- Handle async/await throughout the codebase
- Test with PTY when Bun supports it

### Option 2: Use node-pty Library
**Effort:** Medium
**Approach:**
- Add `node-pty` as optional dependency
- Use PTY to spawn interactive processes
- Handle terminal emulation

**Blocker:** node-pty doesn't work with Bun (Issue #7362)

### Option 3: Process Replacement (exec)
**Effort:** Medium
**Approach:**
- Replace current process with opencode/cursor
- Use `process.exec()` or similar
- Lose control but gain TTY

**Blocker:** Bun doesn't have true process replacement

### Option 4: Terminal Multiplexer (tmux/screen)
**Effort:** Medium
**Approach:**
- Spawn opencode in tmux session
- Attach to tmux session
- Detach on completion

**Challenge:** Complex integration, requires tmux installed

### Option 5: Document Limitation
**Effort:** Low
**Approach:**
- Accept that interactive mode only works for Claude
- Document headless-only for opencode/cursor
- Guide users to run these CLIs directly for interactive mode

## Recommendation

**Short-term:** Document the limitation (Option 5)
**Long-term:** Wait for Bun PTY support (PR #25319) then implement Option 1

## Related Links

- Bun PTY PR: https://github.com/oven-sh/bun/pull/25319
- Bun node-pty Issue: https://github.com/oven-sh/bun/issues/7362
- Current branch: `feature/multi-cli-provider-support`

## Files Involved

- `tools/src/commands/ralph/providers/opencode.ts`
- `tools/src/commands/ralph/providers/cursor.ts`
- `tools/src/commands/ralph/providers/types.ts`
- `tools/src/commands/ralph/index.ts` (CLI commands)

## Success Criteria

- [ ] Opencode interactive mode allows typing responses
- [ ] Cursor interactive mode allows typing responses  
- [ ] Session stays interactive until user exits
- [ ] Signal handling (Ctrl+C) works correctly
- [ ] No background detached processes
