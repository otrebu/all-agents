# Bug Report: Ralph Build Loop Session Hangs After Internal Stop

## Summary

The `aaa ralph build --headless` command spawns Claude sessions that can internally stop (via Stop hook or error) but the underlying process never exits, causing the outer build loop to hang indefinitely waiting for JSON output that will never come.

## Severity

**HIGH** - The Ralph build loop becomes completely stuck, requiring manual intervention to kill the process. This defeats the purpose of autonomous builds.

## Environment

- **aaa version**: Latest (from `/home/otrebu/dev/all-agents`)
- **Claude Code version**: 2.1.31
- **Command**: `aaa ralph build --subtasks docs/planning/milestones/layer-hierarchy/subtasks.json --headless`

## Reproduction

1. Run `aaa ralph build --headless` with a subtasks queue
2. Wait for a session to hit an error or internal stop condition (e.g., `MaxFileReadTokenExceededError`)
3. Observe that the outer loop hangs indefinitely

## Evidence

### Session Timeline (SUB-174)

```
13:46:00  Claude process 3844653 spawned for SUB-174
14:04:00  Git commit started (pre-commit hooks running)
14:06:07  MaxFileReadTokenExceededError triggered
14:06:17  Stop hook triggered internally
14:06:17  [DEBUG] Hook output does not start with {, treating as plain text
          ^^^ Last activity in debug log
14:09:xx  Process still running (23+ minutes elapsed)
```

### Debug Log Evidence

```
/home/otrebu/dev/all-agents/.claude/debug/38df905e-3772-47b1-9b36-158834a1c8dd.txt

2026-02-04T14:06:07.850Z [ERROR] "MaxFileReadTokenExceededError: File content (27638 tokens) exceeds maximum allowed tokens (25000)..."
2026-02-04T14:06:17.979Z [DEBUG] Getting matching hook commands for Stop with query: undefined
2026-02-04T14:06:17.979Z [DEBUG] Found 1 hook matchers in settings
2026-02-04T14:06:17.992Z [DEBUG] Hook output does not start with {, treating as plain text
^^^ LAST LOG ENTRY - process never exited
```

### Process State

```bash
$ ps -p 3844653 -o pid,stat,etime,args
PID   STAT  ELAPSED  COMMAND
3844653 Sl+  23:53    claude -p "Execute one iteration..." --dangerously-skip-permissions --output-format json
```

Process tree shows it's still a child of the Ralph build loop:
```
aaa(3818750)───claude(3844653)───{claude threads...}
```

### File Descriptors

```bash
$ ls -la /proc/3844653/fd/
1 -> socket:[42282359]  # stdout to parent via socket
```

The process is waiting to write JSON to the parent but never will because the internal session ended.

## Root Cause Analysis

1. **Ralph build loop** spawns Claude with `--output-format json` and reads from stdout
2. **Claude session** runs and eventually hits an error or Stop condition
3. **Stop hook fires** internally but the **process doesn't exit**
4. **Outer loop waits** forever for JSON output on the socket
5. **Result**: Deadlock - parent waiting for output, child waiting for... nothing (session ended but process alive)

### Likely Code Path

The Stop event triggers `Getting matching hook commands for Stop` but after the hook runs, the process should call `process.exit()` but doesn't. The `--output-format json` mode may be missing proper exit handling when sessions end via Stop events.

## Files to Investigate

In `/home/otrebu/dev/all-agents`:

1. **Ralph build loop** - `src/commands/ralph/build.ts` or similar
   - How does it spawn Claude?
   - How does it handle timeouts/subprocess death?

2. **Headless session handling** - wherever `--output-format json` is processed
   - Does it properly exit when Stop hook fires?
   - Is there a cleanup handler for session end?

3. **Stop hook handling** - wherever hooks are processed
   - The log shows `Hook output does not start with {, treating as plain text`
   - What happens after this? Should trigger exit

## Expected Behavior

When a Claude session ends (via Stop hook, error, or completion):
1. Any final JSON output should be written to stdout
2. Process should call `process.exit(0)` or `process.exit(1)`
3. Parent process should receive EOF and continue to next iteration

## Actual Behavior

1. Session ends internally (Stop hook fires)
2. Debug log shows hook processing
3. Process remains alive indefinitely
4. Parent hangs waiting for output

## Suggested Fix

### Option 1: Explicit Exit on Stop

In the Stop hook handler or session end handler, ensure `process.exit()` is called:

```typescript
// When Stop hook fires in headless/json mode
if (outputFormat === 'json') {
  const result = { status: 'stopped', reason: 'session_ended' };
  process.stdout.write(JSON.stringify(result) + '\n');
  process.exit(0);
}
```

### Option 2: Timeout in Ralph Build Loop

Add a subprocess timeout in the ralph build loop:

```typescript
const subprocess = spawn('claude', args);
const timeout = setTimeout(() => {
  console.error('Session timeout - killing subprocess');
  subprocess.kill('SIGTERM');
}, MAX_SESSION_TIME);

subprocess.on('exit', () => clearTimeout(timeout));
```

### Option 3: Heartbeat/Health Check

Add periodic health checks from the parent:

```typescript
setInterval(() => {
  if (!isSessionResponsive(subprocess)) {
    subprocess.kill('SIGTERM');
  }
}, HEALTH_CHECK_INTERVAL);
```

## Workaround

Until fixed, users must manually kill stuck processes:

```bash
# Find and kill stuck Claude processes
pgrep -f "claude.*ralph.*headless" | xargs kill

# Or kill the entire ralph build
pkill -f "aaa ralph build"
```

## Additional Context

### The work completed successfully

Despite the hang, SUB-174 actually completed:
- Commit `cdc9e81` was created
- Tracking files were updated (commit `277fcc6`)
- `subtasks.json` shows `done: true`

The hang occurred **after** successful completion, during cleanup/exit.

### Session logs location

Full conversation for debugging:
```
/home/otrebu/dev/all-agents/.claude/projects/-home-otrebu-dev-BillingManager/38df905e-3772-47b1-9b36-158834a1c8dd.jsonl
```

Debug log:
```
/home/otrebu/dev/all-agents/.claude/debug/38df905e-3772-47b1-9b36-158834a1c8dd.txt
```

## Test Case

To verify the fix:

1. Create a subtask that will trigger a `MaxFileReadTokenExceededError`:
   - Add AC that reads a file > 25K tokens
2. Run `aaa ralph build --headless`
3. Verify process exits cleanly after the error
4. Verify outer loop continues to next subtask or exits gracefully

## Related Issues

- The `MaxFileReadTokenExceededError` itself may be worth addressing separately (the session tried to read a file that was too large after completing work)
- The Stop hook matchers config may need review - it matched 1 hook but output wasn't JSON
