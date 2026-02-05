# Progress

## Current Focus

**Story:** 001-provider-foundation
**Task:** TASK-037 provider registry
**Status:** SUB-244 complete

## Session Notes

<!-- Format: ### YYYY-MM-DDTHH:MM:SS: Brief title -->
<!-- **Refs:** link to story/tasks -->
<!-- Keep ~5 sessions, archive older to docs/planning/archive/ -->

### 2026-02-05

#### SUB-244
- **Problem:** The provider registry (registry.ts) created in SUB-259 was missing several functions specified in TASK-037: REGISTRY constant, isBinaryAvailable(), getInstallInstructions(), ProviderSelectionContext, selectProviderFromEnv(), autoDetectProvider(), and ProviderError optional cause.
- **Changes:** Expanded registry.ts with all 9 required functions/types. Added REGISTRY constant with all 6 providers (available: false, stub invokers). Added isBinaryAvailable() using Bun.spawn with `which`, getInstallInstructions() for each provider, ProviderError with optional cause field. Changed selectProvider() from simple string override to ProviderSelectionContext object (cliFlag > envVariable > configFile > auto-detect). Added selectProviderFromEnv() reading process.argv and env, autoDetectProvider() with Promise.all for parallel binary checking. Updated invokeWithProvider() to check REGISTRY and binary availability with install instructions in errors. Updated callers in build.ts and review/index.ts. 53 unit tests.
- **Files:**
  - `tools/src/commands/ralph/providers/registry.ts` - Expanded with REGISTRY, isBinaryAvailable, getInstallInstructions, ProviderSelectionContext, selectProviderFromEnv, autoDetectProvider
  - `tools/src/commands/ralph/providers/index.ts` - Added new exports
  - `tools/src/commands/ralph/build.ts` - Updated selectProvider call to use ProviderSelectionContext
  - `tools/src/commands/review/index.ts` - Updated selectProvider calls to use ProviderSelectionContext
  - `tools/tests/providers/registry.test.ts` - Expanded from 20 to 53 unit tests

#### SUB-259
- **Problem:** build.ts and review/index.ts directly imported Claude invocation functions (invokeClaudeHeadlessAsync, invokeClaudeChat), tightly coupling them to Claude as the only provider. No provider registry existed despite being a prerequisite.
- **Changes:** Created providers/registry.ts with selectProvider() (CLI flag > env var > default "claude"), validateProvider(), invokeWithProvider() (discriminated union for headless/supervised modes), and ProviderError class. Updated build.ts to import from registry, pass provider through iteration contexts, and use AgentResult fields (costUsd, durationMs, sessionId). Updated review/index.ts similarly, converting runHeadlessReview to options-object pattern (max-params fix). Added --provider CLI flag to both ralph build and review commands. Added provider?: ProviderType to BuildOptions. Created 20 unit tests (registry.test.ts) and 4 E2E tests (provider-flag.test.ts). All 631 tests pass, typecheck clean.
- **Files:**
  - `tools/src/commands/ralph/providers/registry.ts` - Created: provider selection, validation, invocation routing
  - `tools/src/commands/ralph/providers/index.ts` - Added registry re-exports
  - `tools/src/commands/ralph/build.ts` - Replaced Claude imports with registry calls
  - `tools/src/commands/ralph/index.ts` - Added --provider CLI flag to build command
  - `tools/src/commands/ralph/types.ts` - Added provider?: ProviderType to BuildOptions
  - `tools/src/commands/review/index.ts` - Replaced Claude imports with registry calls, added --provider flag
  - `tools/tests/providers/registry.test.ts` - 20 unit tests for registry
  - `tools/tests/e2e/provider-flag.test.ts` - 4 E2E tests for CLI flag

#### SUB-250
- **Problem:** claude.ts contained local implementations of 5 utility functions that were duplicated in providers/utils.ts after SUB-249 extraction.
- **Changes:** Replaced local implementations of createStallDetector, createTimeoutPromise, killProcessGracefully, readStderrWithActivityTracking, and markTimerAsNonBlocking with imports from providers/utils.ts. Also imported DEFAULT_GRACE_PERIOD_MS constant. Replaced inline unref pattern in invokeClaudeHaiku with markTimerAsNonBlocking call. Reduced claude.ts by 146 lines (622→476) with zero behavior change.
- **Files:**
  - `tools/src/commands/ralph/claude.ts` - Removed 5 local function definitions, added imports from providers/utils

#### SUB-249
- **Problem:** Process execution utilities (stall detection, timeout handling, graceful termination, JSON parsing) were tightly coupled to claude.ts, preventing reuse by other providers.
- **Changes:** Created providers/utils.ts with 3 interfaces (StallDetectionConfig, ProcessExecutionOptions, ProcessExecutionResult) and 8 exported functions generalized to accept command/args rather than hardcoding Claude. Renamed safeJsonParse to tryParseJson to satisfy function-name/starts-with-verb lint rule. Added 21 unit tests covering JSON parsing, JSONL parsing, timeout promises, stall detection (including activity tracking and cleanup), graceful process termination (SIGTERM/SIGKILL two-phase), and timer utilities.
- **Files:**
  - `tools/src/commands/ralph/providers/utils.ts` - Shared process execution utilities
  - `tools/tests/providers/utils.test.ts` - 21 unit tests

#### SUB-239
- **Problem:** Ralph had tight coupling to Claude Code CLI with no abstraction for multi-provider support.
- **Changes:** Created provider type system with discriminated unions for 6 AI coding agent providers (claude, opencode, codex, gemini, pi, cursor). Added AgentResult with normalized naming, InvocationMode union, PROVIDER_BINARIES constant, barrel export, and RalphConfig extension with provider/model/lightweightModel fields. Added 10 unit tests covering type narrowing, PROVIDER_BINARIES completeness, and AgentResult shape.
- **Files:**
  - `tools/src/commands/ralph/providers/types.ts` - All provider abstraction types
  - `tools/src/commands/ralph/providers/index.ts` - Barrel export
  - `tools/src/commands/ralph/types.ts` - Extended RalphConfig with provider fields
  - `tools/tests/providers/types.test.ts` - 10 unit tests

### 2026-02-02

#### SUB-190
- **Problem:** No unit tests existed for the new formatNotificationMessage function or the EventConfig enabled field added in SUB-184 and SUB-188.
- **Changes:** Added 11 unit tests for formatNotificationMessage covering: base message only (no metrics), full metrics (all fields), partial metrics combinations, session ID truncation, empty session handling, cost formatting. Added 4 unit tests for EventConfig enabled field covering: true value, false value, full config with enabled, undefined when omitted.
- **Files:**
  - `tools/tests/lib/ralph-hooks.test.ts` - Added formatNotificationMessage describe block with 11 tests
  - `tools/tests/lib/config-types.test.ts` - Added 4 tests for enabled field in eventConfigSchema describe block

#### SUB-189
- **Problem:** Build metrics from iteration results weren't being passed to Ralph hook calls (onSubtaskComplete, onMaxIterationsExceeded, onMilestoneComplete), preventing rich notification messages with build context.
- **Changes:** Updated build.ts to pass metrics from hookResult.entry to all three hook calls. Extracted fireSubtaskCompleteHook helper function to maintain lint compliance (complexity limit). Added formatDuration helper for human-readable duration strings. Refactored handleMaxIterationsExceeded to use options object pattern.
- **Files:**
  - `tools/src/commands/ralph/build.ts` - Added helper functions, updated hook calls with metrics
  - `tools/tests/lib/build-hooks.test.ts` - Updated tests for new helper function usage

#### SUB-188
- **Problem:** Notification messages from Ralph hooks were plain text without build metrics context. Users needed richer notifications showing files changed, lines added/removed, cost, and session info.
- **Changes:** Added formatNotificationMessage(hookName, context) function that builds rich notification messages from HookContext. Appends metrics line when available: 'Files: N | Lines: +X/-Y | Cost: $N.NN | Session: abbrev'. Updated executeNotifyAction and executeNotifyFallback to use this function for message content.
- **Files:**
  - `tools/src/commands/ralph/hooks.ts` - Added formatNotificationMessage function, updated executeNotifyAction and executeNotifyFallback to use it

#### SUB-187
- **Problem:** HookContext interface lacked fields for build metrics, preventing rich notification messages with details like lines changed, cost, and iteration context.
- **Changes:** Extended HookContext interface with 8 optional fields: linesAdded, linesRemoved, filesChanged, costUsd, duration, milestone, iterationNumber, maxIterations. All fields have JSDoc comments following existing patterns.
- **Files:**
  - `tools/src/commands/ralph/hooks.ts` - Added 8 optional metrics fields to HookContext interface

#### SUB-186
- **Problem:** No event-specific routing configuration existed in aaa.config.json. Events like claude:stop needed to be disabled, and ralph hooks needed appropriate priority levels.
- **Changes:** Added events section to aaa.config.json notify configuration with four event configs: claude:stop (disabled), ralph:maxIterationsExceeded (priority max with alert/failure tags), ralph:milestoneComplete (priority high with tada tag), ralph:subtaskComplete (priority low).
- **Files:**
  - `aaa.config.json` - Added notify.events section with event routing configuration

#### SUB-185
- **Problem:** Notify command lacked event-level disable capability. The enabled field was added to EventConfig in SUB-184, but the notify command didn't check it.
- **Changes:** Added check in notify command's main action: after getEventConfig() is called, check if eventConfig?.enabled === false and exit silently with code 0. Also enhanced dry-run mode to show "(disabled)" indicator for disabled events to help with debugging.
- **Files:**
  - `tools/src/commands/notify/index.ts` - Added enabled check after getEventConfig(), enhanced dry-run output

#### SUB-184
- **Problem:** Notification system lacked event-level disable capability. Events could only be enabled/disabled globally via NotifySection.enabled.
- **Changes:** Added optional `enabled?: boolean` field to EventConfig interface with JSDoc comment. Added corresponding `enabled: z.boolean().optional()` to eventConfigSchema. This allows individual events like `claude:stop` to be disabled in aaa.config.json.
- **Files:**
  - `tools/src/lib/config/types.ts` - Added enabled field to EventConfig interface and eventConfigSchema

#### SUB-183
- **Problem:** Inconsistent BOX_WIDTH values between display.ts (68) and status.ts (64) caused visual inconsistency in Ralph CLI output boxes.
- **Changes:** Exported BOX_WIDTH from display.ts and imported it in status.ts, removing the duplicate local constant. Updated header padding from padStart(41) to padStart(43) to properly center "Ralph Build Status" in the wider 68-character box.
- **Files:**
  - `tools/src/commands/ralph/display.ts` - Added BOX_WIDTH to exports
  - `tools/src/commands/ralph/status.ts` - Replaced local BOX_WIDTH with import, updated padding

#### SUB-182
- **Problem:** The pre-execution display in invokeClaudeHeadless() used plain console.log output without styling, inconsistent with the styled post-execution summary boxes.
- **Changes:** Replaced plain output with styled header using renderInvocationHeader('headless'). Display Source (cyan path), Size (yellow mode - when passed), and Log (plain path) with chalk.dim labels. Added optional sizeMode parameter to HeadlessWithLoggingOptions interface and updated subtasks command to pass it.
- **Files:**
  - `tools/src/commands/ralph/index.ts` - Added chalk import, renderInvocationHeader import, sizeMode to interface, styled pre-execution output

#### SUB-181
- **Problem:** Paths displayed in renderPlanSubtasksSummary() could wrap awkwardly mid-word inside the box since they weren't using truncation.
- **Changes:** Applied makeClickablePath() with calculated max lengths to source.path and storyRef in renderPlanSubtasksSummary(). Source paths use innerWidth - 16 (label width), story paths use innerWidth - 7. Paths now truncate from the middle with "..." when they exceed box width.
- **Files:**
  - `tools/src/commands/ralph/display.ts` - Applied makeClickablePath() truncation to source.path and storyRef displays

#### SUB-180
- **Problem:** renderPlanSubtasksSummary() displayed redundant path information when using --story flag. Both "Source (file):" and "Story:" lines showed the same path, cluttering the output.
- **Changes:** Added isStorySource check before rendering source info section. When source.type is 'file' and source.path equals storyRef, the Source line is skipped, showing only the Story line. Added 5 unit tests for renderPlanSubtasksSummary to verify the fix.
- **Files:**
  - `tools/src/commands/ralph/display.ts` - Added isStorySource conditional to skip duplicate source line
  - `tools/tests/lib/display.test.ts` - Added 5 tests for renderPlanSubtasksSummary path redundancy handling

#### SUB-179
- **Problem:** invokeClaudeHeadless() printed "Duration: Xs | Cost: $X.XX" which duplicated the same info shown in styled summary boxes (like renderPlanSubtasksSummary). When running `aaa ralph plan subtasks --headless`, users saw duration/cost twice.
- **Changes:** Removed the duplicate duration/cost console.log from invokeClaudeHeadless(). Kept the session ID line ("Session: ...") as it's useful for debugging. Duration/cost data remains logged to JSONL files and available in return values for callers that need to display it in summary boxes.
- **Files:**
  - `tools/src/commands/ralph/index.ts` - Modified invokeClaudeHeadless to only print session ID

#### SUB-178
- **Problem:** Output path shown in renderPlanSubtasksSummary() didn't match actual file location when using --story flag. resolvedMilestonePath was only set when --milestone was explicitly provided, but Claude correctly inferred milestone from story path for file creation.
- **Changes:** Added milestone inference from resolved story path in subtasks command. Call resolveStoryPath() early to get the resolved path (handles slugs and full paths), then extract milestone using regex /milestones\/([^/]+)\//. This ensures the displayed output path matches where Claude creates the subtasks.json file.
- **Files:**
  - `tools/src/commands/ralph/index.ts` - Added milestone inference from story path using IIFE pattern for lint compliance

#### SUB-177
- **Problem:** No E2E tests existed to verify cascade validation in ralph CLI commands
- **Changes:** Added 'cascade validation' describe block to ralph.test.ts with four tests: (1) plan subtasks --help shows --cascade option, (2) invalid cascade target produces error listing valid levels, (3) backward cascade (subtasks → stories) is rejected with helpful error, (4) build --cascade subtasks is rejected as invalid target. Note: Used plan subtasks instead of plan tasks for backward cascade test because subtasks has early cascade validation.
- **Files:**
  - `tools/tests/e2e/ralph.test.ts` - Added cascade validation describe block with 4 E2E tests

#### SUB-174
- **Problem:** Ralph build command lacked cascade capability to chain to calibration after build completes
- **Changes:** Added --cascade <target> option to the build command. Target is validated early (before running build) - only 'calibrate' is valid since build can only cascade forward. After runBuild() succeeds, runCascadeFrom() is called to continue the cascade when --cascade flag is provided.
- **Files:**
  - `tools/src/commands/ralph/index.ts` - Added --cascade option with early validation and post-build cascade execution

#### SUB-171
- **Problem:** Ralph plan subtasks command lacked cascade capability to chain to subsequent levels (build, calibrate)
- **Changes:** Added --cascade <target> and --calibrate-every <n> options to the subtasks command. Added early validation of cascade targets before running Claude session, so backward cascades and invalid targets fail immediately with helpful error messages. Extended handleCascadeExecution with calibrateEvery and subtasksPath support.
- **Files:**
  - `tools/src/commands/ralph/index.ts` - Added cascade options, early validation, and updated HandleCascadeOptions interface

#### SUB-170
- **Problem:** Ralph plan tasks command lacked cascade capability to chain to subsequent planning levels (subtasks, build, calibrate)
- **Changes:** Added --cascade <target> option to `ralph plan tasks` command. Refactored tasks action to use helper functions (runTasksMilestoneMode, runTasksStoryMode, runTasksSourceMode) to reduce complexity and enable shared cascade handling. Cascade validation rejects backward cascades (tasks → stories) and invalid targets with helpful error messages. The cascade logic applies to all source types (--story, --milestone, --file, --text).
- **Files:**
  - `tools/src/commands/ralph/index.ts` - Added --cascade option, helper functions, and interfaces for tasks command
  - `tools/src/commands/ralph/config.ts` - Fixed pre-existing lint errors (variable initialization, error types)

#### SUB-169
- **Problem:** Ralph plan commands (roadmap, stories) lacked cascade capability to chain to subsequent planning levels
- **Changes:** Added imports for runCascadeFrom and validateCascadeTarget from cascade.ts. Added --cascade <target> option to both ralph plan roadmap and ralph plan stories commands. After existing command logic completes, if --cascade is specified, validates target direction and calls runCascadeFrom to chain planning levels. Also fixed pre-existing lint errors in config.ts and config.test.ts (alphabetical function ordering, variable initialization, naming).
- **Files:**
  - `tools/src/commands/ralph/index.ts` - Added cascade imports and --cascade option to roadmap and stories commands
  - `tools/src/commands/ralph/config.ts` - Fixed lint errors (reordered appendSubtasksToFile/saveSubtasksFile)
  - `tools/tests/lib/config.test.ts` - Fixed lint errors (variable initialization, naming, inline comments)

#### SUB-166
- **Problem:** Cascade mode needs a function to resolve milestone identifiers (either full paths or short names) to full paths
- **Changes:** Implemented resolveMilestonePath() that handles absolute paths, relative paths, and milestone names (e.g., '003-ralph-workflow'). Lists available milestones in error messages. Also added listAvailableMilestones() and getMilestonesBasePath() helpers.
- **Files:**
  - `tools/src/commands/ralph/config.ts` - Added resolveMilestonePath, listAvailableMilestones, getMilestonesBasePath functions
  - `tools/tests/lib/ralph-config.test.ts` - Added 11 unit tests for milestone resolution functions

#### SUB-163
- **Problem:** Cascade mode needed display functions to visualize cascade progression and results
- **Changes:** Implemented renderCascadeProgress() for showing level progression with completed (✓), current (◉), and remaining levels. Implemented renderCascadeSummary() for boxen-formatted results with success status, completed levels list, stopped-at location, and error messages. Also fixed pre-existing lint errors in index.ts (outputDir → outputDirectory abbreviation).
- **Files:**
  - `tools/src/commands/ralph/display.ts` - Added renderCascadeProgress and renderCascadeSummary functions
  - `tools/tests/lib/display.test.ts` - Added 9 unit tests for cascade display functions
  - `tools/src/commands/ralph/index.ts` - Fixed lint errors (variable abbreviation)

#### SUB-161
- **Problem:** Cascade module needed E2E tests to validate exports and verify validation functions work correctly
- **Changes:** Created E2E test file with 11 tests covering validateCascadeTarget (backward cascade returns error, forward cascade returns null, invalid levels handled) and getLevelsInRange (correct level sequences, edge cases). All cascade functions were already exported from previous subtasks.
- **Files:**
  - `tools/tests/e2e/cascade.test.ts` - New E2E test file with 11 tests for cascade validation functions

#### SUB-160
- **Problem:** Cascade module needs main loop function to orchestrate execution of multiple Ralph levels in sequence
- **Changes:** Implemented runCascadeFrom(start, target, options) function in cascade.ts that validates cascade direction using validateCascadeTarget(), gets levels to execute using getLevelsInRange(), loops through levels calling runLevel() for each, and prompts user between levels with promptContinue() (unless headless mode). Returns CascadeFromResult with completedLevels, success status, error message, and stoppedAt level.
- **Files:**
  - `tools/src/commands/ralph/cascade.ts` - Added runCascadeFrom function, CascadeFromOptions and CascadeFromResult interfaces
  - `tools/tests/lib/cascade.test.ts` - Added 10 unit tests for runCascadeFrom function

#### SUB-159
- **Problem:** Cascade module needs a level dispatcher function to route execution to existing Ralph functions
- **Changes:** Implemented runLevel(level, options) function in cascade.ts that dispatches to runBuild() for 'build' level and runCalibrate('all') for 'calibrate' level. Planning levels (roadmap, stories, tasks, subtasks) return "not yet implemented" error. Added RunLevelOptions interface with contextRoot and subtasksPath fields.
- **Files:**
  - `tools/src/commands/ralph/cascade.ts` - Added runLevel function with level dispatch logic, RunLevelOptions interface
  - `tools/tests/lib/cascade.test.ts` - Added 3 unit tests for runLevel function

#### SUB-158
- **Problem:** Cascade mode needs TTY-aware prompt for user continuation between cascade levels
- **Changes:** Implemented promptContinue(completed, next) function in cascade.ts. Returns true on 'y', 'Y', or empty input (default yes). Returns false on 'n' or 'no'. Detects non-TTY mode via process.stdin.isTTY and returns true automatically without blocking. Uses readline.createInterface following build.ts pattern.
- **Files:**
  - `tools/src/commands/ralph/cascade.ts` - Added promptContinue function with TTY detection
  - `tools/tests/lib/cascade.test.ts` - Added 21 unit tests for cascade module including promptContinue

#### SUB-157
- **Problem:** Cascade mode needs core module with level ordering and validation logic
- **Changes:** Created cascade.ts with LEVELS constant defining the cascade order (roadmap → stories → tasks → subtasks → build → calibrate), each with name, order, and requiresMilestone properties. Implemented validateCascadeTarget() to validate forward-only cascade direction and getLevelsInRange() to return intermediate levels between start and target.
- **Files:**
  - `tools/src/commands/ralph/cascade.ts` - New cascade orchestration module with LEVELS constant and validation functions

#### SUB-155
- **Problem:** Cascade mode needs a type definition for cascade levels (name + order)
- **Changes:** Added CascadeLevel interface with name (string) and order (number) fields. JSDoc describes it as a level in the Ralph cascade hierarchy. Added export to types.ts alongside CascadeOptions and CascadeResult.
- **Files:**
  - `tools/src/commands/ralph/types.ts` - Added CascadeLevel interface with JSDoc and export

#### SUB-154
- **Problem:** Ralph cascade mode needs TypeScript interfaces to define cascade execution options and results
- **Changes:** Added CascadeOptions interface (milestone, force, headless, calibrateEvery fields) and CascadeResult interface (success, completedLevels, stoppedAt, error fields) with JSDoc comments following existing patterns. Both types exported from types.ts.
- **Files:**
  - `tools/src/commands/ralph/types.ts` - Added CascadeOptions and CascadeResult interfaces with exports

#### SUB-153
- **Problem:** Interrogate skill and workflow lacked distinction between live mode (current session introspection) and forensic mode (past commit session loading)
- **Changes:** Added "Session Modes: Live vs Forensic" section to SKILL.md documenting three modes: Live (direct introspection for current changes), Forensic (load session via aaa session cat), Fallback (diff-only). Updated interrogate workflow with modes table, target mapping, and forensic mode details. Added session context indicators to output format.
- **Files:**
  - `.claude/skills/interrogate-on-changes/SKILL.md` - Added session modes section, updated allowed-tools, enhanced gather context with mode annotations
  - `context/workflows/interrogate.md` - Added Session Modes section with table, forensic mode details, target/mode mapping table

#### SUB-152
- **Problem:** Session CLI lacked commands to output session content and list recent sessions
- **Changes:** Extended `aaa session` with `cat` and `list` subcommands. Cat outputs session JSONL content to stdout (supports direct session ID or --commit flag). List outputs recent sessions - one per line (machine-parseable) by default, or table format with --verbose. Includes --limit flag for both modes.
- **Files:**
  - `tools/src/commands/session/index.ts` - Add cat and list subcommands with helper functions
  - `tools/tests/e2e/session.test.ts` - E2E tests for cat and list subcommands (11 new tests)
  - `tools/README.md` - Document new subcommands and use cases

#### SUB-151
- **Problem:** No CLI command to retrieve Claude session files for interrogation workflows
- **Changes:** Created `aaa session` command with `path` and `current` subcommands. Path subcommand accepts session ID directly or extracts from commit's cc-session-id trailer. Current subcommand reads from .claude/current-session. Includes E2E tests and documentation.
- **Files:**
  - `tools/src/commands/session/index.ts` - New CLI command with Commander.js
  - `tools/tests/e2e/session.test.ts` - E2E tests for all subcommands
  - `tools/src/cli.ts` - Import and register session command
  - `tools/README.md` - Document session commands and usage
  - `tools/CLAUDE.md` - Update directory structure

#### SUB-150
- **Problem:** Commit workflow documentation didn't document the cc-session-id trailer that is automatically added by the prepare-commit-msg hook
- **Changes:** Updated all four commit workflow docs to document the automatic cc-session-id trailer: commit.md (added Session Tracking section with interrogate reference), complete-feature.md, multiple-commits.md (both added notes about automatic trailer), ralph-iteration.md (updated example to show both Subtask and cc-session-id trailers)
- **Files:** `context/workflows/commit.md`, `context/workflows/complete-feature.md`, `context/workflows/multiple-commits.md`, `context/workflows/ralph/building/ralph-iteration.md`

#### SUB-149
- **Problem:** No automatic mechanism to include session IDs in commit messages for later interrogation
- **Changes:** Added prepare-commit-msg git hook that appends cc-session-id trailer to commit messages. Hook reads session ID from .claude/current-session (written by SessionStart hook), is idempotent, handles missing files gracefully, and skips merge/squash commits.
- **Files:** `tools/.husky/prepare-commit-msg` - New git hook for automatic session ID trailers

#### SUB-148
- **Problem:** No mechanism to capture Claude session IDs for later interrogation of commit decisions
- **Changes:** Added SessionStart hook that writes session_id to .claude/current-session using jq; set cleanupPeriodDays to 90 for longer session retention
- **Files:** `.claude/settings.json` - Added SessionStart hook and cleanupPeriodDays at root level

### 2026-01-26

#### SUB-067
- **Problem:** No module for build summary functionality - types and functions for aggregating Ralph build results were needed
- **Changes:** Created summary.ts with BuildPracticalSummary module containing types and aggregation functions
- **Files:**
  - `tools/src/commands/ralph/summary.ts` - New module with BuildPracticalSummary, CompletedSubtaskInfo, BuildStats, CommitRange types; generateBuildSummary(), getCommitRange(), writeBuildSummaryFile() functions
  - `tools/tests/lib/summary.test.ts` - 14 unit tests covering all summary functions

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

