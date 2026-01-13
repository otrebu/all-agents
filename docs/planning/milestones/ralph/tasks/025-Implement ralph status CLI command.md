## Task: Implement ralph status CLI command

**Story:** [progress-visibility-status](../stories/007-progress-visibility-status.md)

### Goal
Add `aaa ralph status` CLI subcommand that invokes the status.sh script to display Ralph's current progress.

### Context
The story requires users to check Ralph's autonomous build progress via `aaa ralph status`. This task adds the CLI command that wraps the status.sh script (implemented in TASK-008). The command follows the same pattern as `aaa ralph run` and `aaa ralph init` - simple wrappers that delegate to shell scripts.

### Plan
1. Add `status` subcommand to `tools/src/commands/ralph/index.ts`
2. Wire the command to invoke `status.sh` script from SCRIPTS_DIR
3. Pass working directory context to the script
4. Handle script exit codes appropriately
5. Update help text to include status command

### Acceptance Criteria
- [ ] `aaa ralph status` command is available in CLI
- [ ] Command invokes status.sh script with proper path resolution
- [ ] Works from any subdirectory within a project
- [ ] Outputs status.sh results to stdout
- [ ] Non-zero exit code propagated on script errors
- [ ] Shows in `aaa ralph --help` output

### Test Plan
- [ ] Test `aaa ralph status` invocation
- [ ] Test from different working directories
- [ ] Verify output matches direct status.sh execution
- [ ] Test error handling when status.sh fails

### Scope
- **In:** CLI command wiring, script invocation, exit code handling
- **Out:** The status.sh script itself (covered in TASK-008), skill wrapper (TASK-017)

### Notes
- Depends on TASK-008 (status.sh script) being completed first
- Follow existing command patterns in `tools/src/commands/ralph/index.ts`
- The command is read-only, no side effects beyond displaying output
- Consider adding --json flag in future iteration for machine-readable output
