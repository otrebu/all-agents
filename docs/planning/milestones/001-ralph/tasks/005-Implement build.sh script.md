## Task: Implement build.sh script

**Story:** [autonomous-code-implementation](../stories/001-autonomous-code-implementation.md)

### Goal
A working build.sh script exists at `tools/src/commands/ralph/scripts/build.sh` that orchestrates the autonomous iteration loop, invoking Claude with the ralph-iteration.md prompt and handling all loop control options.

### Context
The build.sh script is the orchestration layer for Ralph iterations. It manages the iteration loop, invokes Claude with the correct prompt and flags, handles iteration limits, interactive mode pauses, and triggers hooks on events. This is a P1 priority as it's the primary entry point for autonomous code implementation. The script is part of the "bash prototype" approach for quick iteration.

### Plan
1. Create directory structure `tools/src/commands/ralph/scripts/` if not exists
2. Create `build.sh` with:
   - Argument parsing for `--subtasks`, `--max-iterations`, `--interactive`, `--print`, `--validate-first`
   - Main iteration loop that continues until queue is empty or max iterations exceeded
   - Claude invocation: `claude -p "$(cat ralph-iteration.md)" --dangerously-skip-permissions --output-format json`
   - Session ID capture from Claude output JSON
   - Interactive mode (`-i`): pause between iterations for user review
   - Print mode (`-p`): output prompt without executing
   - Pre-build validation (`--validate-first`): run alignment check before building
   - Max iterations tracking per subtask
   - Hook triggers: `onIterationComplete`, `onValidationFail`, `onMaxIterationsExceeded`
3. Wire into `ralph.sh` dispatcher

### Acceptance Criteria
- [ ] Script exists at `tools/src/commands/ralph/scripts/build.sh`
- [ ] `aaa ralph build --subtasks <path>` runs iteration loop against specified subtasks.json
- [ ] `aaa ralph build -i` (interactive) pauses between iterations for review
- [ ] `aaa ralph build -p` (print) outputs iteration prompt without execution
- [ ] `aaa ralph build --max-iterations <n>` limits retries per subtask
- [ ] `aaa ralph build --validate-first` runs pre-build validation before starting
- [ ] Script captures session ID from Claude output and passes to hooks
- [ ] Script invokes Claude with `--dangerously-skip-permissions` flag
- [ ] Script triggers `onMaxIterationsExceeded` hook when limit hit
- [ ] Script reads ralph.config.json for hook configuration

### Test Plan
- [ ] Smoke test: `aaa ralph build --help` exits 0
- [ ] Print mode test: `aaa ralph build -p` outputs prompt without running Claude
- [ ] Integration test: Create test subtasks.json, run `aaa ralph build`, verify subtask marked done
- [ ] Interactive mode test: Verify pause occurs between iterations
- [ ] Max iterations test: Verify loop stops after N failed attempts

### Scope
- **In:** build.sh script, iteration loop, Claude invocation, all build flags, hook triggers
- **Out:** The ralph-iteration.md prompt content, post-iteration-hook.sh script, TypeScript wrapper

### Notes
- Reference: VISION.md sections 8.5 (Directory Structure) and 8.9-8.10 (Invocation Patterns)
- Uses `set -euo pipefail` for safety
- Session ID captured via: `result=$(claude -p ... --output-format json); session_id=$(echo "$result" | jq -r '.session_id')`
- Requires `jq` for JSON parsing
- Each iteration is single-shot: one prompt → one response → done
- Failed validation consumes one iteration (no internal retries)
