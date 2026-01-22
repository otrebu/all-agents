## Task: Implement calibrate.sh script

**Story:** [intention-drift-detection](../stories/002-intention-drift-detection.md)

### Goal
A working `calibrate.sh` script exists at `tools/src/commands/ralph/scripts/calibrate.sh` that orchestrates calibration checks via CLI.

### Context
The calibrate.sh script is part of the bash prototype approach (VISION.md 8.5). It dispatches calibration subcommands (`intention`, `technical`, `improve`, `all`) and invokes the corresponding prompts via Claude. This enables `aaa ralph calibrate intention` to detect intention drift in completed subtasks.

Per VISION.md section 8.3, CLI uses prompts directly (not skills). The script invokes Claude with the appropriate calibration prompt in single-shot mode.

### Plan
1. Create `tools/src/commands/ralph/scripts/calibrate.sh`
2. Implement subcommand dispatch: `intention`, `technical`, `improve`, `all`
3. For `intention` subcommand:
   - Locate and read `subtasks.json` (from `--subtasks` option or default path)
   - Invoke Claude with `intention-drift.md` prompt
   - Handle output: display summary, create task files if divergence found
4. Parse CLI options: `--subtasks <path>`, `--force`, `--review`
5. Implement approval logic based on `ralph.config.json` settings
6. Handle graceful errors (missing files, invalid JSON, etc.)

### Acceptance Criteria
- [ ] Script exists at `tools/src/commands/ralph/scripts/calibrate.sh`
- [ ] `ralph calibrate intention` runs intention drift check successfully
- [ ] Script orchestrates reading git diffs (invokes prompt that reads diffs via `commitHash` from completed subtasks)
- [ ] Script invokes `intention-drift.md` prompt via Claude
- [ ] Output shows summary in stdout + creates task files if divergence found
- [ ] Script respects `ralph.config.json` approval settings
- [ ] Script works with `--force` and `--review` overrides
- [ ] Script handles errors gracefully (missing subtasks.json, etc.)

### Test Plan
- [ ] Run `ralph calibrate --help` - exits 0, shows usage
- [ ] Run `ralph calibrate intention` with valid subtasks.json - completes without error
- [ ] Run `ralph calibrate intention` with missing subtasks.json - shows helpful error
- [ ] Verify task files are created when drift is detected
- [ ] Verify no task files created when no drift detected

### Scope
- **In:** calibrate.sh script, `intention` subcommand implementation, CLI options parsing
- **Out:** The calibration prompts themselves (separate tasks), `technical` and `improve` subcommands (can be stubs initially)

### Notes
- **Scheduling:** Automatic calibration scheduling (e.g., "run after N iterations or after milestone completion" per AC#7 in the story) is handled by `build.sh` integration via `--calibrate-every N` option (see VISION.md 8.2), not by calibrate.sh itself. This script handles on-demand calibration invocation.
- Location: `tools/src/commands/ralph/scripts/calibrate.sh`
- CLI invocation pattern:
  ```bash
  claude -p "$(cat context/workflows/ralph/calibration/intention-drift.md)" \
         --dangerously-skip-permissions \
         --output-format json
  ```
- Depends on: `intention-drift.md` prompt (TASK-004)
- `technical` and `improve` subcommands can be placeholder stubs initially (separate stories)
- Reference: VISION.md sections 8.2 (CLI Command Structure) and 8.5 (Directory Structure)
