# Progress

## Current Focus

**Story:** none
**Task:** TASK-013 in progress
**Status:** SUB-024 complete

## Session Notes

<!-- Format: ### YYYY-MM-DDTHH:MM:SS: Brief title -->
<!-- **Refs:** link to story/tasks -->
<!-- Keep ~5 sessions, archive older to docs/planning/archive/ -->

### 2026-01-22

#### SUB-024
- **Problem:** stories-review-auto.md lacked Interactive Mode (Supervised) section for chunked presentation
- **Changes:** Added Interactive Mode section referencing chunked-presentation.md protocol; now presents per-story reviews one at a time in supervised mode
- **Files:**
  - `context/workflows/ralph/review/stories-review-auto.md` - Added Interactive Mode (Supervised) section

#### SUB-022
- **Problem:** VISION.md Section 8.2 was outdated after CLI ergonomics changes
- **Changes:** Updated Section 8.2 CLI Command Structure with: plan subtasks scope flags, review flag syntax with --milestone/--subtasks, calibrate as real subcommands, max-iterations=0 default, calibrate-every flag, review subtasks command
- **Files:**
  - `docs/planning/VISION.md` - Rewrote Section 8.2 to match current implementation

#### SUB-023
- **Problem:** Need to verify TASK-012 CLI changes compile and work correctly
- **Changes:** Ran typecheck (passed), verified all CLI commands with --help show correct flags. Confirmed: plan subtasks scope flags, calibrate as real subcommands, review commands use --milestone/--subtasks flags, build shows max-iterations default 0 and calibrate-every option
- **Files:** No code changes - verification only

### 2026-01-21

#### SUB-021
- **Problem:** `ralph review tasks` was a placeholder showing "coming soon" message
- **Changes:** Replaced placeholder with real `ralph review subtasks --subtasks <path>` command that invokes subtasks-review-auto.md prompt in supervised mode
- **Files:**
  - `tools/src/commands/ralph/index.ts` - Replaced review tasks with review subtasks command using --subtasks flag
  - `context/workflows/ralph/review/subtasks-review-auto.md` - Created new prompt file for subtask queue review
  - `tools/tests/e2e/ralph.test.ts` - Updated test to verify new command behavior

#### SUB-020
- **Problem:** No way to automatically run calibration checks during long build loops
- **Changes:** Added `--calibrate-every <n>` flag to ralph build command; when set, runCalibrate('all', ...) is called every N iterations; extracted runPeriodicCalibration helper for lint compliance
- **Files:**
  - `tools/src/commands/ralph/index.ts` - Added --calibrate-every option, passed to BuildOptions
  - `tools/src/commands/ralph/build.ts` - Import runCalibrate, add runPeriodicCalibration helper, call every N iterations
  - `tools/src/commands/ralph/types.ts` - Added calibrateEvery field to BuildOptions

#### SUB-019
- **Problem:** `ralph build` defaulted to `--max-iterations 3` which was too restrictive; `--auto` flag on plan stories/tasks was redundant alias for `--supervised`
- **Changes:** Changed --max-iterations default to 0 (unlimited); updated build.ts to skip iteration limit check when value is 0; removed --auto flag from plan stories and plan tasks commands; updated tests
- **Files:**
  - `tools/src/commands/ralph/index.ts` - Changed default, removed --auto option and logic
  - `tools/src/commands/ralph/build.ts` - Handle maxIterations=0 as unlimited
  - `tools/src/commands/ralph/types.ts` - Updated comment
  - `tools/tests/e2e/ralph.test.ts` - Removed --auto expectations

#### SUB-018
- **Problem:** `ralph calibrate` used `.argument('[subcommand]')` pattern instead of real Commander subcommands, making `--help` less useful for individual subcommands
- **Changes:** Converted to real subcommands using `calibrateCommand.addCommand(new Command('intention')...)` pattern; each subcommand now has proper `--help` with its own options
- **Files:**
  - `tools/src/commands/ralph/index.ts` - Replaced argument pattern with addCommand pattern, added helper functions
  - `tools/tests/e2e/ralph.test.ts` - Updated test to expect Commander help output instead of custom error

#### SUB-017
- **Problem:** `ralph review stories` and `ralph review gap stories` used positional arguments inconsistent with other ralph commands
- **Changes:** Changed from `.argument("<milestone>")` to `.requiredOption("--milestone <path>")` for both commands; updated tests to expect new error message format
- **Files:**
  - `tools/src/commands/ralph/index.ts` - Changed review stories and gap stories to use --milestone option
  - `tools/tests/e2e/ralph.test.ts` - Updated test assertions for new error message

#### SUB-016
- **Problem:** `ralph plan subtasks` only accepted `--task` flag, missing `--story` and `--milestone` scope options
- **Changes:** Added `--story <path>` and `--milestone <path>` options; made all three mutually exclusive (require exactly one); added error messages guiding correct usage
- **Files:**
  - `tools/src/commands/ralph/index.ts` - Extended subtasks command with scope flags and validation

#### SUB-015
- **Problem:** Tests and CLI option descriptions still referenced old selfImprovement mode names (always/auto/never)
- **Changes:** Updated ralph.test.ts to use 'suggest' instead of 'always' and 'off' instead of 'never'; updated index.ts --force and --review option help text to use new mode names
- **Files:**
  - `tools/tests/e2e/ralph.test.ts` - Updated config fixture and assertions
  - `tools/src/commands/ralph/index.ts` - Updated option descriptions

#### SUB-014
- **Problem:** VISION.md lacked documentation of the new selfImprovement mode values (suggest/autofix/off)
- **Changes:** Added mode table to Self-Improvement section under Calibration Mode; updated example config to use 'suggest' instead of 'always'
- **Files:**
  - `docs/planning/VISION.md` - Added mode table with descriptions and use cases

#### SUB-013
- **Problem:** calibrate.ts still used old mode names (always/auto/never) after schema/types were updated
- **Changes:** Updated all mode references in calibrate.ts to use new names (suggest/autofix/off)
- **Files:**
  - `tools/src/commands/ralph/calibrate.ts` - Updated doc comments, default value, mode checks, and prompt text

#### SUB-012
- **Problem:** selfImprovement.mode used confusing names (always/auto) that didn't clearly convey their meaning
- **Changes:** Renamed mode values to suggest/autofix/off across schema, types, and config default
- **Files:**
  - `docs/planning/schemas/ralph-config.schema.json` - Updated enum and description
  - `tools/src/commands/ralph/types.ts` - Updated SelfImprovementConfig mode union type
  - `tools/src/commands/ralph/config.ts` - Changed default from 'always' to 'suggest'
  - `tools/src/commands/completion/zsh.ts` - Fixed pre-existing lint error (eslint disable for shell template)

