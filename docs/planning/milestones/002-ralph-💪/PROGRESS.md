# Progress

## 2026-01-26

### SUB-074
- **Problem:** Need type definitions and Zod schemas for the notify command
- **Changes:** Created types.ts with NotifyConfig interface, QuietHoursConfig interface, Priority type, Zod schemas for validation, and error classes (NtfyError, NtfyValidationError, NtfyNetworkError, NtfyRateLimitError). Added 20 unit tests covering all types, schemas, and error classes.
- **Files:**
  - Created: tools/src/commands/notify/types.ts
  - Created: tools/tests/lib/notify-types.test.ts

### SUB-075
- **Problem:** Need config management module for the notify command
- **Changes:** Created config.ts with loadNotifyConfig(), saveNotifyConfig(), and isInQuietHours() functions. Config stored at ~/.config/aaa/notify.json. Features: merged defaults when file missing, atomic write pattern with parent dir creation, quiet hours handling for both overnight (22:00-08:00) and same-day spans. Added 30 unit tests using temp directories.
- **Files:**
  - Created: tools/src/commands/notify/config.ts
  - Created: tools/tests/lib/notify-config.test.ts

### SUB-076
- **Problem:** Need HTTP client module for sending notifications via ntfy.sh API
- **Changes:** Created client.ts with sendNotification() function. Features: priority mapping (min=1 to max=5), retry logic with exponential backoff (1s, 2s) on 429/5xx errors, 30s request timeout with AbortController, typed error handling (NtfyNetworkError, NtfyRateLimitError), headers support for Title/Tags/Priority. Added 21 unit tests with mocked fetch covering success cases, error handling, and retry behavior.
- **Files:**
  - Created: tools/src/commands/notify/client.ts
  - Created: tools/tests/lib/notify-client.test.ts

### SUB-077
- **Problem:** Need CLI command with subcommands for notification management and documentation
- **Changes:** Created index.ts with Commander.js command structure for aaa notify. Subcommands: on, off, status, config (set/show/test). Main command accepts message with options: --title, --priority, --tags. Config resolution follows CLI > env > config > defaults pattern. Added 13 E2E tests. Updated README.md with full documentation including Claude Code hook integration example.
- **Files:**
  - Created: tools/src/commands/notify/index.ts
  - Created: tools/tests/e2e/notify.test.ts
  - Modified: tools/src/cli.ts (registered command)
  - Modified: README.md (added CLI documentation)

### SUB-078
- **Problem:** Need interactive setup wizard for first-time notify configuration
- **Changes:** Added `aaa notify init` command with interactive prompts using @clack/prompts. Features: topic name prompt with validation (required, alphanumeric + hyphens/underscores, max 64 chars), server URL prompt with default https://ntfy.sh, quiet hours configuration with start/end hour prompts, test notification with ora spinner, next steps display (install app, subscribe to topic, add hook), config overwrite warning if already exists. Added 2 E2E tests for init command help.
- **Files:**
  - Modified: tools/src/commands/notify/index.ts (added init subcommand)
  - Modified: tools/tests/e2e/notify.test.ts (added init tests)

## 2026-01-27

### SUB-079
- **Problem:** Notify command needs to be safe for Claude Code hooks before init is run
- **Changes:** Added E2E tests verifying silent behavior (exit 0, no output) when notifications are disabled or topic is empty. Updated README with note about safe hook usage. The core silent behavior was already implemented in SUB-077 (checkNotificationEnabled function at lines 41-49 in index.ts).
- **Files:**
  - Modified: tools/tests/e2e/notify.test.ts (added 3 tests for silent behavior)
  - Modified: README.md (added note about safe hook usage)

### SUB-080
- **Problem:** UX enhancements needed for testing and scripting scenarios
- **Changes:** Added --dry-run flag that shows notification details without sending (topic, server, title, priority, message). Added -q/--quiet flag that suppresses output on success. Dry-run works even when unconfigured to help users debug their setup. Added 4 E2E tests for dry-run output format and flag registration. Updated README.md with new flag documentation.
- **Files:**
  - Modified: tools/src/commands/notify/index.ts (added --dry-run and -q/--quiet flags)
  - Modified: tools/tests/e2e/notify.test.ts (added 4 tests for dry-run and quiet)
  - Modified: README.md (added flag documentation)

### SUB-081
- **Problem:** Need token usage tracking infrastructure for Ralph build iterations
- **Changes:** Added TokenUsage interface to types.ts with 4 numeric fields (inputTokens, outputTokens, cacheReadTokens, cacheCreationTokens). Added getTokenUsageFromSession() function to session.ts that reads session JSONL files and sums usage data from all API response entries. Function handles missing/empty files by returning zeros and gracefully skips malformed JSON lines. Added 9 unit tests covering all scenarios.
- **Files:**
  - Modified: tools/src/commands/ralph/types.ts (added TokenUsage interface and export)
  - Modified: tools/src/commands/ralph/session.ts (added getTokenUsageFromSession function)
  - Created: tools/tests/lib/session-tokens.test.ts (9 unit tests)

### SUB-082
- **Problem:** Token usage data needed to be wired end-to-end from session extraction to build summary display
- **Changes:** Wired up token usage tracking: Added tokenUsage field to IterationDiaryEntry type, called getTokenUsageFromSession() in post-iteration hook during metrics collection, extended BuildStats with token aggregation fields (inputTokens, outputTokens, cacheReadTokens), aggregated tokens in generateBuildSummary(), and displayed token totals in renderBuildPracticalSummary() with format "In: 35K Out: 7K Cache: 28K". Added formatTokenCount() helper for readable number formatting with K/M suffixes. Added 8 unit tests for token display and formatTokenCount.
- **Files:**
  - Modified: tools/src/commands/ralph/types.ts (added tokenUsage field to IterationDiaryEntry)
  - Modified: tools/src/commands/ralph/post-iteration.ts (call getTokenUsageFromSession, add to diary entry)
  - Modified: tools/src/commands/ralph/summary.ts (token aggregation in BuildStats)
  - Modified: tools/src/commands/ralph/display.ts (formatTokenCount, token display in summary)
  - Modified: tools/tests/lib/display.test.ts (added token-related tests)

### SUB-083
- **Problem:** Need to track lines added/removed during Ralph build iterations for better visibility into code changes
- **Changes:** Added git line change tracking to Ralph build iterations. Created linesAdded/linesRemoved fields in IterationDiaryEntry, parseNumstat() function to parse git diff --numstat output, getLinesChanged() function to extract line stats from staged/unstaged changes. Binary files are excluded from counts. Added 13 unit tests covering single-file, multi-file, binary file exclusion, and edge cases.
- **Files:**
  - Modified: tools/src/commands/ralph/types.ts (added linesAdded/linesRemoved fields)
  - Modified: tools/src/commands/ralph/post-iteration.ts (added LinesChangedResult, parseNumstat, getLinesChanged functions, wired into diary entry)
  - Created: tools/tests/lib/lines-changed.test.ts (13 unit tests)

### SUB-084
- **Problem:** Need to display lines changed metrics in iteration boxes and build summary
- **Changes:** Added linesAdded/linesRemoved fields to IterationDisplayData interface for per-iteration display. Updated renderIterationEnd() to show line changes as +N/-M with green/red chalk coloring. Extended BuildStats with linesAdded/linesRemoved aggregate fields. Updated generateBuildSummary() to aggregate line counts from diary entries. Updated renderBuildPracticalSummary() to display line stats in summary line. Updated display tests to include line stats.
- **Files:**
  - Modified: tools/src/commands/ralph/display.ts (added fields to IterationDisplayData, updated renderIterationEnd and renderBuildPracticalSummary)
  - Modified: tools/src/commands/ralph/summary.ts (added fields to BuildStats, updated aggregation)
  - Modified: tools/tests/lib/display.test.ts (added linesAdded/linesRemoved to test data)

### SUB-085
- **Problem:** Need unified config types and schemas for the aaa CLI
- **Changes:** Created tools/src/lib/config/types.ts with AaaConfig interface that unifies notify, ralph, review, and research config under one root schema. Includes nested interfaces (NotifySection, RalphSection, ReviewSection, ResearchSection), Zod schemas for runtime validation, event routing types for notify.events map (EventConfig with topic, priority, tags). Added 36 unit tests verifying schema validation behavior.
- **Files:**
  - Created: tools/src/lib/config/types.ts
  - Created: tools/tests/lib/config-types.test.ts

### SUB-086
- **Problem:** Need unified config defaults and typed environment variables for secrets
- **Changes:** Created tools/src/lib/config/defaults.ts with DEFAULT_AAA_CONFIG constant covering all sections (notify, ralph, research, review) with sensible defaults. Also exported per-section defaults (DEFAULT_NOTIFY, DEFAULT_RALPH, etc.) for convenience. Created tools/src/lib/config/env.ts with Zod-validated environment variables (NTFY_PASSWORD, NTFY_TOPIC, NTFY_SERVER) as optional secrets. Follows secrets-env-typed.md pattern: warns on invalid values but doesn't exit. Added 10 unit tests for env parsing.
- **Files:**
  - Created: tools/src/lib/config/defaults.ts
  - Created: tools/src/lib/config/env.ts
  - Created: tools/tests/lib/config-env.test.ts

### SUB-087
- **Problem:** Need unified config loader that looks for aaa.config.json with fallback to legacy files
- **Changes:** Created tools/src/lib/config/loader.ts with loadAaaConfig() function that: (1) looks for aaa.config.json in project root as primary source, (2) falls back to legacy files (ralph.config.json, ~/.config/aaa/notify.json) with deprecation warnings logged to console, (3) deep merges user config with defaults for each section using specialized merge functions (mergeNotify, mergeRalph, etc.), (4) validates with Zod schema using safeParse, (5) on invalid config, logs warning and returns defaults (no throw). Created barrel export in tools/src/lib/config/index.ts that exports loadAaaConfig, DEFAULT_AAA_CONFIG, env, and all types. Added 13 unit tests using temp directories to verify loading, merging, error handling, and validation behavior.
- **Files:**
  - Created: tools/src/lib/config/loader.ts
  - Created: tools/src/lib/config/index.ts
  - Created: tools/tests/lib/config-loader.test.ts

### SUB-088
- **Problem:** Need --event flag for event-based notification routing
- **Changes:** Added --event <name> option to aaa notify command that looks up event-specific configuration (topic, priority, tags) from the unified config's notify.events map. When an event is not found, it gracefully falls back to defaultTopic and defaultPriority. CLI tags (--tags) are merged with event-configured tags (deduped). CLI flags like --priority still override event config. Dry-run output shows event routing information including whether the event was found. Added 10 E2E tests covering flag recognition, event routing, fallback behavior, and tag merging. Updated README.md with --event flag documentation and example aaa.config.json structure.
- **Files:**
  - Modified: tools/src/commands/notify/index.ts (added --event flag, getEventConfig, mergeTags, updated resolveConfig)
  - Created: tools/tests/e2e/notify-event.test.ts (10 E2E tests)
  - Modified: README.md (documented --event flag and event routing)

### SUB-089
- **Problem:** Ralph hooks used inline fetch for notifications instead of the unified notify CLI
- **Changes:** Refactored executeNotifyAction() in hooks.ts to use Bun.spawn to call `aaa notify --event` CLI with --quiet flag. Added hookNameToEventName() function to convert hook names to event format (e.g., onMaxIterationsExceeded → ralph:maxIterationsExceeded). Kept inline fetch as fallback via executeNotifyFallback() when CLI is unavailable (ENOENT). Added 13 unit tests covering hook name conversion (7 tests), CLI invocation pattern (2 tests), and fallback behavior (4 tests).
- **Files:**
  - Modified: tools/src/commands/ralph/hooks.ts (added hookNameToEventName, refactored executeNotifyAction, added executeNotifyFallback)
  - Created: tools/tests/lib/ralph-hooks.test.ts (13 unit tests)

### SUB-090
- **Problem:** Need to wire onMilestoneComplete and onSubtaskComplete hooks in the build loop
- **Changes:** Added hook execution to build.ts at two key lifecycle points: (1) onMilestoneComplete fires when all subtasks complete (remaining === 0) with milestone name and count in message, (2) onSubtaskComplete fires when individual subtask completes (didComplete === true) with subtaskId and title in context. Both hooks use executeHook from hooks.ts which respects aaa.config.json ralph.hooks configuration. Added 6 unit tests using static code analysis to verify hook integration.
- **Files:**
  - Modified: tools/src/commands/ralph/build.ts (added executeHook calls for onMilestoneComplete and onSubtaskComplete)
  - Created: tools/tests/lib/build-hooks.test.ts (6 unit tests)

### SUB-091
- **Problem:** Ralph config loading needed to use the unified config system instead of standalone ralph.config.json
- **Changes:** Refactored loadRalphConfig() to call loadAaaConfig() from the unified config loader and extract the .ralph section. Added loadRalphConfigLegacy() for backward compatibility with tests that pass explicit paths. Added onSubtaskComplete to HooksConfig type for consistency with unified config. Legacy ralph.config.json files continue to work via the unified loader's fallback mechanism. Added 8 unit tests verifying both unified and legacy config loading scenarios.
- **Files:**
  - Modified: tools/src/commands/ralph/config.ts (refactored loadRalphConfig, added loadRalphConfigLegacy)
  - Modified: tools/src/commands/ralph/types.ts (added onSubtaskComplete to HooksConfig)
  - Created: tools/tests/lib/ralph-config.test.ts (8 unit tests)

### SUB-092
- **Problem:** Notify config loading needed to use the unified config system instead of standalone ~/.config/aaa/notify.json
- **Changes:** Refactored loadNotifyConfig() to call loadAaaConfig() from the unified config loader and extract the .notify section. Added mapNotifySectionToConfig() to handle field mapping between unified NotifySection (defaultTopic) and legacy NotifyConfig (topic). Updated saveNotifyConfig() to write notify section to aaa.config.json while preserving other sections. Added loadNotifyConfigLegacy() and saveLegacyNotifyConfig() for backward compatibility with tests that pass explicit paths. Legacy ~/.config/aaa/notify.json continues to work via unified loader's fallback mechanism. aaa notify init now creates aaa.config.json instead of legacy file. Added 9 unit tests verifying unified config loading and round-trip behavior.
- **Files:**
  - Modified: tools/src/commands/notify/config.ts (refactored loadNotifyConfig, saveNotifyConfig to use unified loader)
  - Created: tools/tests/lib/notify-unified-config.test.ts (9 unit tests)

### SUB-096
- **Problem:** renderIterationEnd() calls in build.ts were missing linesAdded, linesRemoved, and tokenUsage data from diary entries
- **Changes:** Fixed data pass-through in build.ts: Both headless mode (processHeadlessIteration) and supervised mode (processSupervisedIteration) calls to renderIterationEnd() now include linesAdded, linesRemoved, and tokenUsage from the diary entry. Also added tokenUsage field to IterationDisplayData interface in display.ts (required for TypeScript compilation). Imported TokenUsage type from types.ts.
- **Files:**
  - Modified: tools/src/commands/ralph/build.ts (added linesAdded, linesRemoved, tokenUsage to both renderIterationEnd calls)
  - Modified: tools/src/commands/ralph/display.ts (added tokenUsage field to IterationDisplayData, imported TokenUsage type)

### SUB-097
- **Problem:** getLinesChanged() in post-iteration.ts returns zeros after Claude commits because git diff --cached and git diff are empty
- **Changes:** Added fallback logic: when staged+unstaged diffs both return zero lines, now runs 'git show --numstat HEAD' to get line counts from the latest commit. This captures lines changed even when the iteration has already committed. Added 3 unit tests to verify parseNumstat handles git show output format (which includes commit metadata before numstat lines).
- **Files:**
  - Modified: tools/src/commands/ralph/post-iteration.ts (added git show --numstat HEAD fallback in getLinesChanged)
  - Modified: tools/tests/lib/lines-changed.test.ts (added 3 tests for git show output parsing)

### SUB-098
- **Problem:** Token usage data not displayed in iteration end boxes despite being available
- **Changes:** Added token usage line to renderIterationEnd() that displays when tokenUsage is present and non-zero. Format: "Tokens  In: 42K  Out: 3K  Cache: 28K" using formatTokenCount(). Also refactored helper functions (formatTokenLine, formatPathLines) to reduce function complexity from 21 to 17 for ESLint compliance.
- **Files:**
  - Modified: tools/src/commands/ralph/display.ts (added tokenUsage extraction, formatTokenLine helper, formatPathLines helper, token line rendering)

### SUB-093
- **Problem:** Ralph used Node.js child_process execSync for git operations while other files used Bun.spawnSync
- **Changes:** Replaced all execSync calls in post-iteration.ts with Bun.spawnSync for consistency. All ralph/*.ts files now use native Bun APIs (Bun.spawn for async, Bun.spawnSync for sync) instead of Node.js child_process. Also added Bun as a global in ESLint config to fix no-undef errors, fixed unused timeout variable in claude.ts, and fixed unnecessary conditional lint error in index.ts.
- **Files:**
  - Modified: tools/src/commands/ralph/post-iteration.ts (replaced execSync with Bun.spawnSync for git diff/show)
  - Modified: tools/src/commands/ralph/claude.ts (fixed unused timeout variable)
  - Modified: tools/src/commands/ralph/index.ts (fixed unnecessary conditional lint error)
  - Modified: tools/eslint.config.js (added Bun as readonly global)

### SUB-094
- **Problem:** Need JSON Schema and documentation for the unified aaa.config.json configuration file
- **Changes:** Created comprehensive JSON Schema for aaa.config.json with all four sections (notify, ralph, review, research). Schema includes full property definitions, enums, default values, and examples. Updated README.md Configuration section with complete example config matching the plan format, config sections reference table, environment variables documentation, and legacy config migration note. The .env.dev file already existed with placeholders.
- **Files:**
  - Created: docs/planning/schemas/aaa-config.schema.json (full JSON Schema with all sections and IDE support)
  - Modified: README.md (expanded Configuration section with example config and env var docs)

### SUB-095
- **Problem:** Need Claude Code hooks to send notifications when tasks complete or permissions are needed
- **Changes:** Updated .claude/settings.json to add notification hooks for Claude Code events. Added Stop hook that sends notification via `aaa notify --event claude:stop` when Claude completes a task. Added Notification hook with matcher for `permission_prompt` that sends notification via `aaa notify --event claude:permissionPrompt` when permission is needed. Both hooks use --quiet flag to suppress terminal output. Preserved existing afplay sound hook. Added new "Claude Code Notification Integration" section to README.md documenting setup, available events, and event routing via aaa.config.json.
- **Files:**
  - Modified: .claude/settings.json (added notify hooks for Stop and Notification events)
  - Modified: README.md (added Claude Code Notification Integration section)

### SUB-099
- **Problem:** Friction analysis system duplicates functionality already provided by ralph calibrate improve
- **Changes:** Deleted conversation-friction-analyzer agent (Stage 1: extract raw friction), friction-pattern-abstractor agent (Stage 2: group and abstract patterns), and analyze-friction skill (orchestrator). Updated README.md to remove entries from Sub-agents table (count 20→18) and Skills table (count 13→12). Verified no remaining references in .claude/ directory.
- **Files:**
  - Deleted: .claude/agents/conversation-friction-analyzer.md
  - Deleted: .claude/agents/friction-pattern-abstractor.md
  - Deleted: .claude/skills/analyze-friction/SKILL.md
  - Modified: README.md (removed 2 agent rows, 1 skill row, updated counts)

### SUB-100
- **Problem:** The gemini-research agent and command don't work - the agent doesn't properly invoke the CLI and just hallucinates results
- **Changes:** Deleted the non-functional agent and command files. Kept the CLI command (aaa gemini-research) since it works standalone - it properly calls the Gemini CLI and generates research output. Updated README.md to remove entries from Sub-agents table (18→17) and Slash Commands table (22→21).
- **Files:**
  - Deleted: .claude/agents/gemini-research.md
  - Deleted: .claude/commands/gemini-research.md
  - Modified: README.md (removed agent row, command row, updated counts)

### SUB-101
- **Problem:** README.md Sub-agents table had incorrect Action entries for atomic-doc-creator and intent-alignment-reviewer
- **Changes:** Updated two rows in the Sub-agents table: (1) atomic-doc-creator Action changed from 'Requires context/ symlink' to 'DONE (documented)' because the agent already documents this requirement in its header. (2) intent-alignment-reviewer Action changed from 'REFACTOR: find/create atomic doc, DRY up' to 'N/A - uses planning chain' because this reviewer doesn't use atomic docs - it compares code against intent passed as input parameter.
- **Files:**
  - Modified: README.md (updated 2 rows in Sub-agents table)

### SUB-102
- **Problem:** The parallel-search agent was not properly invoking the aaa parallel-search CLI, instead hallucinating results
- **Changes:** Updated .claude/agents/parallel-search.md to explicitly require CLI invocation via Bash tool. Added clear process section with: (1) MUST invoke CLI requirement, (2) full command example with all options (--objective, --queries, --verbose), (3) output paths documentation (docs/research/parallel/), (4) synthesize and respond step. Updated README.md Sub-agents table to mark action as 'DONE (agent fixed)'.
- **Files:**
  - Modified: .claude/agents/parallel-search.md (rewrote process section with CLI invocation pattern)
  - Modified: README.md (updated parallel-search row Action to 'DONE (agent fixed)')

### SUB-103
- **Problem:** parallel-search CLI output full report by default, making it hard for agents to read concise results
- **Changes:** Added --verbose flag to show full report content. Default output now shows concise summary with query info, top domains, and key findings (top 5 result titles with links). Full excerpts only shown with --verbose. Added formatSummary() function to formatter.ts. Added 11 unit tests for formatter output. Updated README with --verbose usage example. Also fixed unrelated max-params lint error in notify/client.ts by refactoring buildHeaders to use options object.
- **Files:**
  - Modified: tools/src/commands/parallel-search/index.ts (add --verbose flag, use formatSummary by default)
  - Modified: tools/src/commands/parallel-search/formatter.ts (add formatSummary function)
  - Modified: tools/src/cli.ts (register --verbose flag)
  - Created: tools/tests/lib/parallel-search-formatter.test.ts (11 unit tests)
  - Modified: README.md (add --verbose usage example)
  - Modified: tools/src/commands/notify/client.ts (fix max-params lint error)

### SUB-104
- **Problem:** The file `subtasks-common.md` had an unclear name that didn't convey its purpose as the subtask specification
- **Changes:** Renamed `context/workflows/ralph/planning/subtasks-common.md` to `subtask-spec.md` for clarity. Updated all references in `subtasks-auto.md` (3 refs), `subtasks-from-source.md` (6 refs), and added a new reference in `subtask-reviewer.md` to point to the spec as the source of truth for the vertical slice test.
- **Files:**
  - Renamed: context/workflows/ralph/planning/subtasks-common.md → subtask-spec.md
  - Modified: context/workflows/ralph/planning/subtasks-auto.md (3 reference updates)
  - Modified: context/workflows/ralph/planning/subtasks-from-source.md (6 reference updates)
  - Modified: .claude/agents/subtask-reviewer.md (added reference to spec)

### SUB-105
- **Problem:** Need atomic documentation for quality patterns to enable DRY-up of code reviewer agents
- **Changes:** Created three atomic documentation files in context/blocks/quality/, extracting domain knowledge from the corresponding code reviewer agents. data-integrity.md covers null checks, array boundaries, race conditions, and validation patterns. dependencies.md covers version compatibility, license issues, supply chain risks, and unnecessary dependency detection. simplicity.md covers YAGNI violations, premature abstraction, and over-engineering patterns. Each doc follows the atomic documentation structure with Quick Reference, pattern tables, rules, and code examples.
- **Files:**
  - Created: context/blocks/quality/data-integrity.md
  - Created: context/blocks/quality/dependencies.md
  - Created: context/blocks/quality/simplicity.md

### SUB-106
- **Problem:** Need atomic documentation for performance, security, and documentation standards to enable DRY-up of more code reviewer agents
- **Changes:** Created three atomic documentation files extracting domain knowledge from corresponding code reviewer agents. performance.md covers N+1 queries, memory leaks, algorithm complexity, inefficient data structures, UI rendering, network/IO, and startup/bundle patterns. secure-coding.md covers OWASP Top 10 patterns including injection, XSS, authentication, secrets exposure, authorization flaws, and cryptographic issues. documentation-standards.md covers JSDoc/TSDoc comments, README structure, changelog maintenance, inline comments, and type documentation. Each doc follows the atomic documentation structure with Quick Reference, pattern tables, rules, examples, and summary checklist.
- **Files:**
  - Created: context/blocks/quality/performance.md
  - Created: context/blocks/security/secure-coding.md
  - Created: context/blocks/docs/documentation-standards.md

### SUB-107
- **Problem:** The subtask-reviewer agent was 247 lines with duplicated content from subtask-spec.md (vertical slice test, sizing modes)
- **Changes:** Reduced subtask-reviewer.md from 247 lines to 79 lines by referencing subtask-spec.md instead of duplicating content. Removed: full 4-question vertical slice test table (now references spec), sizing mode interpretation table (now references spec with brief note), verbose JSON example (replaced with compact table). Preserved all unique logic: merge candidate detection criteria, split candidate suggestion boundaries, JSON output format fields, and key principles.
- **Files:**
  - Modified: .claude/agents/subtask-reviewer.md (reduced from 247 to 79 lines)

### SUB-108
- **Problem:** The task-generator agent was 167 lines with a duplicated task template (~35 lines) that already exists in task-template.md
- **Changes:** Removed the embedded task template (markdown code block with full template structure) from task-generator.md and replaced it with a reference to @context/blocks/docs/task-template.md. Preserved the note about story link paths which is context-specific guidance for this agent. Agent now references the source of truth instead of duplicating content.
- **Files:**
  - Modified: .claude/agents/task-generator.md (reduced from 167 to 129 lines, 38 lines removed)

### SUB-109
- **Problem:** Three code reviewer agents (data-integrity, dependency, over-engineering) contained duplicated domain knowledge that now exists in atomic docs created in SUB-105
- **Changes:** Updated each agent to reference its corresponding atomic doc instead of duplicating patterns: data-integrity-reviewer.md → @context/blocks/quality/data-integrity.md, dependency-reviewer.md → @context/blocks/quality/dependencies.md, over-engineering-reviewer.md → @context/blocks/quality/simplicity.md. Preserved role definition, output format, severity guidelines, and example findings. Condensed confidence scoring sections. Updated README.md Sub-agents table to mark all three as 'DONE (DRYed up)'.
- **Files:**
  - Modified: .claude/agents/code-review/data-integrity-reviewer.md (188 → 87 lines, 54% reduction)
  - Modified: .claude/agents/code-review/dependency-reviewer.md (224 → 153 lines, 31% reduction)
  - Modified: .claude/agents/code-review/over-engineering-reviewer.md (211 → 92 lines, 56% reduction)
  - Modified: README.md (updated 3 rows in Sub-agents table)

### SUB-110
- **Problem:** Three code reviewer agents (performance, security, documentation) contained duplicated domain knowledge that now exists in atomic docs created in SUB-106
- **Changes:** Updated each agent to reference its corresponding atomic doc instead of duplicating patterns: performance-reviewer.md → @context/blocks/quality/performance.md, security-reviewer.md → @context/blocks/security/secure-coding.md, documentation-reviewer.md → @context/blocks/docs/documentation-standards.md. Preserved role definition, output format, severity guidelines, and example findings. Condensed confidence scoring sections. Updated README.md Sub-agents table to mark all three as 'DONE (DRYed up)'.
- **Files:**
  - Modified: .claude/agents/code-review/performance-reviewer.md (217 → 104 lines, 52% reduction)
  - Modified: .claude/agents/code-review/security-reviewer.md (182 → 103 lines, 43% reduction)
  - Modified: .claude/agents/code-review/documentation-reviewer.md (211 → 105 lines, 50% reduction)
  - Modified: README.md (updated 3 rows in Sub-agents table)

### SUB-111
- **Problem:** Three code reviewer agents (accessibility, maintainability, test-coverage) contained duplicated domain knowledge that already exists in atomic docs
- **Changes:** Updated each agent to reference its corresponding atomic doc instead of duplicating patterns: accessibility-reviewer.md → @context/blocks/quality/accessibility.md, maintainability-reviewer.md → @context/blocks/quality/coding-style.md, test-coverage-reviewer.md → @context/blocks/test/testing.md. Preserved role definition, output format, severity guidelines, and example findings. Condensed confidence scoring sections. Updated README.md Sub-agents table to mark all three as 'DONE (DRYed up)'.
- **Files:**
  - Modified: .claude/agents/code-review/accessibility-reviewer.md (222 → 116 lines, 48% reduction)
  - Modified: .claude/agents/code-review/maintainability-reviewer.md (200 → 118 lines, 41% reduction)
  - Modified: .claude/agents/code-review/test-coverage-reviewer.md (204 → 138 lines, 32% reduction)
  - Modified: README.md (updated 3 rows in Sub-agents table)

### SUB-112
- **Problem:** The intention-drift calibration workflow traced the planning chain all the way to Vision, which is too abstract for meaningful drift analysis
- **Changes:** Simplified the planning chain to trace only to Story level (Subtask → Task → Story). Vision is now mentioned as optional additional context that provides high-level direction but is not a required analysis target. Updated the Missing Link example to reference Story instead of Vision. Removed the "Full chain including Vision" row from the graceful degradation table. Updated execution instructions to reflect the simpler chain.
- **Files:**
  - Modified: context/workflows/ralph/calibration/intention-drift.md (7 insertions, 10 deletions)

### SUB-113
- **Problem:** The technical-drift calibration workflow didn't specifically verify that code follows guidance from atomic docs referenced in subtask's filesToRead
- **Changes:** Enhanced technical-drift.md to require checking filesToRead for @context/ paths (atomic docs) and verifying code follows their guidance. Added "Atomic Doc References" section explaining how to handle @context/ paths with a table mapping common atomic docs to expected patterns. Added new drift pattern #7 "Does Not Follow Atomic Doc Guidance" with examples and acceptable variations. Updated execution instructions to include explicit steps for identifying atomic docs and checking compliance.
- **Files:**
  - Modified: context/workflows/ralph/calibration/technical-drift.md (48 insertions, 9 deletions)

### SUB-114
- **Problem:** VISION.md contained a stale TODO comment listing calibration improvements that had already been implemented
- **Changes:** Removed the TODO comment block (7 lines) from VISION.md. The three items in the TODO were: (1) intention drift should trace to Story level - done in SUB-112, (2) technical drift should verify atomic doc guidance - done in SUB-113, (3) friction analyzer agents are redundant - deleted in SUB-099. All items addressed, so the TODO was no longer needed.
- **Files:**
  - Modified: docs/planning/VISION.md (removed 7-line TODO comment block)

### SUB-115
- **Problem:** Need to verify all deletions and refactors from code quality review work correctly
- **Changes:** Ran verification commands and fixed remaining issues. Removed gemini-research test from eval.sh (agent deleted in SUB-100). Updated README.md Sub-agents table: subtask-reviewer and task-generator marked as 'DONE (DRYed up)' (completed in SUB-107 and SUB-108). Verified: no remaining references to friction-analyzer, friction-pattern, or gemini-research in .claude/; no references to subtasks-common in context/; new atomic docs exist in context/blocks/quality/ (data-integrity.md, dependencies.md, simplicity.md, performance.md) and context/blocks/security/ (secure-coding.md).
- **Files:**
  - Modified: .claude/scripts/eval.sh (removed gemini-research test, updated test count from 11 to 10)
  - Modified: README.md (updated Sub-agents table status for subtask-reviewer and task-generator)

### SUB-116
- **Problem:** The legacy notify config path (~/.config/aaa/notify.json) was still supported in the unified config loader, but this deprecation period has ended
- **Changes:** Removed all legacy notify config support from the unified config loader. Deleted LEGACY_NOTIFY_CONFIG constant, loadLegacyNotifyConfig() function, and simplified the fallback logic to only check legacy ralph.config.json (the ralph legacy path is still supported for now). Also removed LEGACY_CONFIG_PATH from notify/config.ts, simplified getConfigPath() to always return the unified config path, updated JSDoc comments to remove legacy path references, and updated test description from "returns defaults (merged with any legacy config)" to "returns defaults when config missing".
- **Files:**
  - Modified: tools/src/lib/config/loader.ts (removed legacy notify config support)
  - Modified: tools/src/commands/notify/config.ts (removed LEGACY_CONFIG_PATH, simplified getConfigPath())
  - Modified: tools/src/commands/notify/types.ts (updated comment to reference unified config)
  - Modified: tools/tests/lib/config-loader.test.ts (updated test description)

## 2026-01-28

### SUB-117
- **Problem:** Eight slash commands were redundant - either replaced by skills that auto-trigger or containing advice Claude already knows
- **Changes:** Deleted 8 command files: /dev:code-review (parallel-code-review skill auto-triggers), /create-task (legacy task creation skill auto-triggers), /download (WebFetch+Write sufficient, zero usage), /meta:claude-code:create-command (merged into create-skill), /meta:claude-code:create-plugin (superseded by official plugin), /meta:how-to-prompt (just read prompting.md directly), /meta:optimize-prompt (generic advice Claude already knows). Also deleted CLI implementation (tools/src/commands/download.ts), tests (tools/tests/e2e/download.test.ts), and unused doc (context/blocks/docs/prompting-optimize.md). Updated shell completion scripts (bash, zsh, fish) to remove download command. Updated README.md Commands table from 21 to 13 commands.
- **Files:**
  - Deleted: .claude/commands/dev/code-review.md
  - Deleted: .claude/commands/create-task.md
  - Deleted: .claude/commands/download.md
  - Deleted: .claude/commands/meta/claude-code/create-command.md
  - Deleted: .claude/commands/meta/claude-code/create-plugin.md
  - Deleted: .claude/commands/meta/claude-code/create-plugin.ts
  - Deleted: .claude/commands/meta/how-to-prompt.md
  - Deleted: .claude/commands/meta/optimize-prompt.md
  - Deleted: context/blocks/docs/prompting-optimize.md
  - Deleted: tools/src/commands/download.ts
  - Deleted: tools/tests/e2e/download.test.ts
  - Modified: README.md (Commands table 21→13)
  - Modified: tools/src/cli.ts (removed download import and registration)
  - Modified: tools/src/commands/completion/bash.ts (removed download)
  - Modified: tools/src/commands/completion/zsh.ts (removed download)
  - Modified: tools/src/commands/completion/fish.ts (removed download)

### SUB-118
- **Problem:** Four git-related commands had missing permissions and workflow issues
- **Changes:** Fixed 4 git commands: (1) git-commit: added Bash(git pull:*), Bash(git log:*), Bash(git reset:*) permissions; (2) git-multiple-commits: fixed name field from git-commit to dev:git-multiple-commits, added Bash(git reset:*); (3) start-feature: added Bash(git fetch:*), argument-hint field, and $ARGUMENTS handling prompt; (4) complete-feature: added Bash(git reset:*) and name field. Updated workflows: commit.md now has pre-flight checks section, complete-feature.md Step 4 trimmed to 3 lines (was 24), Step 10 branch deletion removed (now "Confirm Completion").
- **Files:**
  - Modified: .claude/commands/dev/git-commit.md (added 3 permissions)
  - Modified: .claude/commands/dev/git-multiple-commits.md (fixed name, added git reset:*)
  - Modified: .claude/commands/dev/start-feature.md (added git fetch:*, argument-hint, $ARGUMENTS prompt)
  - Modified: .claude/commands/dev/complete-feature.md (added git reset:*, name field)
  - Modified: context/workflows/commit.md (added pre-flight checks section)
  - Modified: context/workflows/complete-feature.md (trimmed Step 4, removed branch deletion)

### SUB-119
- **Problem:** Three meta commands (create-skill, create-agent, create-cursor-rule) had incorrect paths, missing permissions, and inconsistent references
- **Changes:** Fixed all three commands: (1) create-skill: corrected script path from ./plugins/meta-work/... to ./.claude/commands/meta/claude-code/init_skill.py, fixed step numbering (added Step 5 label), added references to @context/blocks/docs/prompting.md and @context/blocks/construct/claude-code-permissions.md, aligned "templates" terminology; (2) create-agent: fixed URL from code.claude.com/context to docs.anthropic.com, documented all 8 frontmatter fields (name, description, tools, disallowedTools, model, permissionMode, skills, hooks), added allowed-tools (Read, Write, WebFetch), added "When to Use" section; (3) create-cursor-rule: added allowed-tools (Read, Write, Bash(mkdir:*)), fixed @context/meta/PROMPTING.md to @context/blocks/docs/prompting.md.
- **Files:**
  - Modified: .claude/commands/meta/claude-code/create-skill.md (script path, step numbering, @context refs)
  - Modified: .claude/commands/meta/claude-code/create-agent.md (URL, frontmatter docs, allowed-tools, when-to-use)
  - Modified: .claude/commands/meta/create-cursor-rule.md (allowed-tools, prompting.md ref)

### SUB-120
- **Problem:** Three slash commands needed to be converted to skills for better discoverability via auto-triggers
- **Changes:** Converted 3 commands to skills with auto-triggers: (1) interrogate → interrogate-on-changes skill with expanded targets (unstaged, staged, range, changes, commit, pr) and modes (--quick, --skeptical); (2) gh-search → gh-search skill referencing @context/blocks/construct/gh-search.md with Write permission added; (3) cli-feature-creator → aaa-feature-wizard skill with extracted workflow at context/workflows/aaa-cli-feature.md. Deleted original command files. Updated README.md: Slash Commands table from 13 to 10 entries, Skills table from 12 to 15 entries.
- **Files:**
  - Created: .claude/skills/interrogate-on-changes/SKILL.md
  - Created: .claude/skills/gh-search/SKILL.md
  - Created: .claude/skills/aaa-feature-wizard/SKILL.md
  - Created: context/workflows/aaa-cli-feature.md
  - Deleted: .claude/commands/dev/interrogate.md
  - Deleted: .claude/commands/gh-search.md
  - Deleted: .claude/commands/meta/cli-feature-creator.md
  - Modified: README.md (updated Slash Commands and Skills tables)

### SUB-121
- **Problem:** The atomic-doc command needed to be converted to a skill for better discoverability via auto-triggers, and the workflow needed Phase 0 to check the index before creating new docs
- **Changes:** Created context-atomic-doc skill with auto-triggers for "create atomic doc", "add a block", "add a foundation", "setup a stack". Added Phase 0 (Index Check) to manage-atomic-doc.md workflow that requires checking context/README.md index and doing web research for unfamiliar topics before creating new documentation. Deleted the old atomic-doc slash command. Updated README.md Skills table (15→16) and Commands table (10→9). Also updated atomic-doc-creator agent action to reference the new skill.
- **Files:**
  - Created: .claude/skills/context-atomic-doc/SKILL.md
  - Modified: context/workflows/manage-atomic-doc.md (added Phase 0 section)
  - Deleted: .claude/commands/context/atomic-doc.md
  - Modified: README.md (updated Skills table, Commands table, Sub-agents table)

### SUB-122
- **Problem:** The consistency-checker.md workflow contained all consistency check categories inline, making it hard to maintain and reuse. Needed to split into atomic documentation for better organization and DRY principle.
- **Changes:** Created 4 atomic documentation files from consistency-checker.md categories: (1) text-consistency.md covers categories 1-5 (contradictions, numbers, timelines, definition drift, logical impossibilities); (2) code-prose-consistency.md covers categories 6-13 (library, function, param, return, config, variable, API, error mismatches); (3) code-code-consistency.md covers categories 14-19 (style drift, imports, error handling, types, versions, initialization); (4) planning-consistency.md is NEW content for vision/roadmap/story hierarchy consistency checks. Updated consistency-check command and workflow to reference all 4 docs. Updated README.md Action column to DONE.
- **Files:**
  - Created: context/blocks/quality/text-consistency.md (223 lines)
  - Created: context/blocks/quality/code-prose-consistency.md (336 lines)
  - Created: context/blocks/quality/code-code-consistency.md (386 lines)
  - Created: context/blocks/quality/planning-consistency.md (310 lines)
  - Modified: .claude/commands/dev/consistency-check.md (references all 4 docs)
  - Modified: context/workflows/consistency-checker.md (replaced inline content with refs)
  - Modified: README.md (Action → DONE)

### SUB-123
- **Problem:** The plan-multi-agent command needed to be integrated into a tiered doc-analysis component that unifies documentation lookup, gap creation, and deep analysis
- **Changes:** Created tiered doc-analysis component with 3 tiers: T1 (Haiku) for fast index lookup against context/README.md, T2 (Sonnet) for gap creation via atomic-doc-creator agent, T3 (Opus) for deep parallel 4-agent analysis (from plan-multi-agent). Created doc-analyze skill with auto-triggers for "analyze docs", "find missing docs", "plan documentation". Updated planning workflows (subtasks-from-source.md, stories-auto.md, tasks-auto.md) to reference the new component. Updated README.md to mark plan-multi-agent as DONE (INTEGRATED) and add doc-analyze skill.
- **Files:**
  - Created: context/workflows/ralph/components/doc-analysis.md
  - Created: .claude/skills/doc-analyze/SKILL.md
  - Modified: context/workflows/ralph/planning/subtasks-from-source.md (added component references in Phase 1b and 6b)
  - Modified: context/workflows/ralph/planning/stories-auto.md (noted future T1 integration)
  - Modified: context/workflows/ralph/planning/tasks-auto.md (added component reference)
  - Modified: README.md (plan-multi-agent → DONE, added doc-analyze skill)

### SUB-124
- **Problem:** The eval-test-skill was a placeholder skill committed accidentally by eval.sh; eval script needed cleanup logic to prevent future accidental commits
- **Changes:** Deleted .claude/skills/eval-test-skill/ directory and its README.md entry (17→16 skills). Added eval-test-* patterns to .gitignore to prevent future accidental commits. Updated eval.sh cleanup() function to remove eval-test-* artifacts after each run.
- **Files:**
  - Deleted: .claude/skills/eval-test-skill/SKILL.md
  - Modified: README.md (removed skill from table, updated count)
  - Modified: .gitignore (added eval-test-* patterns for skills, agents, commands, rules, blocks)
  - Modified: .claude/scripts/eval.sh (added artifact cleanup to cleanup() function)

### SUB-125
- **Problem:** The parallel-code-review skill name exposed an implementation detail ('parallel') rather than describing the primary function (code review)
- **Changes:** Renamed skill folder from .claude/skills/parallel-code-review/ to .claude/skills/code-review/. Updated SKILL.md frontmatter name field from 'parallel-code-review' to 'code-review'. Updated all references in tools/src/commands/review/index.ts (skill path, JSDoc comments). Updated README.md Skills table (skill name) and Sub-agents table (12 references from 'parallel-code-review skill' to 'code-review skill').
- **Files:**
  - Renamed: .claude/skills/parallel-code-review/SKILL.md → .claude/skills/code-review/SKILL.md
  - Modified: tools/src/commands/review/index.ts (skill path and comments)
  - Modified: README.md (skill name and sub-agent references)

### SUB-126
- **Problem:** Need a triage agent specification to intelligently curate code review findings from the synthesizer
- **Changes:** Created .claude/agents/code-review/triage.md with specification for triage agent. Agent defines: (1) selection criteria for must-review items (critical severity, high+high confidence, security issues, multiple flaggers), (2) root cause grouping logic (location proximity, description similarity, pattern matching), (3) filtering criteria for low-value noise (low severity + low confidence + style-only). Spec references @context/blocks/patterns/triage.md for core pattern. Input is synthesized findings JSON; output includes selected/grouped/filtered findings with reasons.
- **Files:**
  - Created: .claude/agents/code-review/triage.md

### SUB-127
- **Problem:** The code-review skill needed to integrate the new triage agent between synthesis and user presentation
- **Changes:** Added Phase 3.5 (Triage Filtering) to code-review SKILL.md that invokes the triage agent via Task tool after synthesizer. Updated workflow to: (1) invoke triage agent with synthesized findings, (2) display triage summary showing "X findings selected, Y grouped by root cause, Z filtered", (3) present only selected findings in Phase 4, (4) update completion summary with triage statistics. Also added grouped findings display format showing root cause and recommendation. Updated review diary format to include triage data. Added triage agent to README.md Sub-agents table (17→18 agents).
- **Files:**
  - Modified: .claude/skills/code-review/SKILL.md (Phase 3.5 Triage, updated Phase 4 presentation)
  - Modified: README.md (added triage agent to table, marked code-review skill item 2 as DONE)

### SUB-128
- **Problem:** Need an approval gate in headless code review mode to let users review triage decisions before fixes are applied
- **Changes:** Added --require-approval flag to aaa review --headless that pauses after triage to show fix summary. When used, Claude reports findings without applying fixes (like dry-run). Displays: findings to fix count, findings to skip count, and affected files list. User can approve to proceed or abort without changes. Added promptForApproval() function using @clack/prompts confirm. Added getFixInstructions() helper to select prompt instructions based on mode. Added validation requiring --headless when --require-approval is specified. Created 7 E2E tests for flag validation and help output.
- **Files:**
  - Modified: tools/src/commands/review/index.ts (added --require-approval flag, promptForApproval, getFixInstructions)
  - Created: tools/tests/e2e/review.test.ts (7 E2E tests)
  - Modified: README.md (added flag to CLI examples, marked item 3 as DONE in Skills table)

### SUB-129
- **Problem:** Code review CLI needed flexible diff target options to control what code changes are reviewed
- **Changes:** Added 4 mutually exclusive CLI flags: --base <branch> (compares HEAD against branch using git diff branch...HEAD), --range <from>..<to> (compares specific commits using git diff from..to), --staged-only (reviews only staged changes using git diff --cached), --unstaged-only (reviews only unstaged changes using git diff). Added DiffTarget type, validateDiffTargetOptions() for validation with mutual exclusion, and buildDiffCommand() to generate git commands. Both runHeadlessReview() and runSupervisedReview() now accept and use diffTarget. Added 8 E2E tests and 15 unit tests. Updated README with new flag examples.
- **Files:**
  - Modified: tools/src/commands/review/index.ts (added DiffTarget type, validation, buildDiffCommand, flags)
  - Created: tools/tests/lib/review-diff-target.test.ts (15 unit tests)
  - Modified: tools/tests/e2e/review.test.ts (8 new E2E tests)
  - Modified: README.md (added new flags to CLI examples, marked item 4 as DONE in Skills table)

### SUB-130
- **Problem:** The code-review SKILL.md needed to document the flexible diff target flags added to the CLI in SUB-129
- **Changes:** Added "Diff Target Flags (mutually exclusive)" section to the Arguments area documenting --base, --range, --staged-only, and --unstaged-only flags. Updated Phase 1 (Gather Diff) to show conditional git diff commands for each argument type, with clear default behavior section that matches the CLI implementation.
- **Files:**
  - Modified: .claude/skills/code-review/SKILL.md (added Diff Target Flags section, updated Phase 1 instructions)

### SUB-131
- **Problem:** Need review hook points in Ralph config schema to trigger actions on code review events
- **Changes:** Added onReviewComplete and onCriticalFinding hook definitions to both the Ralph config JSON schema and the HooksConfig TypeScript interface. These hooks follow the existing pattern (accepting log, notify, pause actions) and will be consumed by the review CLI in SUB-132.
- **Files:**
  - Modified: docs/planning/schemas/ralph-config.schema.json (added 2 new hook definitions)
  - Modified: tools/src/commands/ralph/types.ts (added hooks to HooksConfig interface)

### SUB-132
- **Problem:** Need to wire review hooks to code review CLI for Ralph build integration
- **Changes:** Added hook execution calls to runHeadlessReview() in the code review CLI. onReviewComplete fires after triage completes with findingCount, criticalCount, and sessionId in the hook context. onCriticalFinding fires for each critical severity finding with confidence >= 0.9, including file path in context. Extended HookContext type to support review-specific fields (findingCount, criticalCount, sessionId, file). Hooks gracefully no-op when not configured (executeHook defaults to log action). Added 10 unit tests verifying hook integration via static code analysis.
- **Files:**
  - Modified: tools/src/commands/review/index.ts (added hook execution after triage)
  - Modified: tools/src/commands/ralph/hooks.ts (extended HookContext with review fields)
  - Created: tools/tests/lib/review-hooks.test.ts (10 unit tests)

### SUB-133
- **Problem:** pre-build-validation.md duplicated sizing rules (too_broad, too_narrow) that already exist in subtask-spec.md
- **Changes:** Replaced inline sizing rule definitions with a reference to @context/workflows/ralph/planning/subtask-spec.md. Kept Scope Creep and Faithful Implementation sections since they are unique alignment checks. Added note that sizing issues should cite specific rules from the spec.
- **Files:**
  - Modified: context/workflows/ralph/building/pre-build-validation.md (10 insertions, 33 deletions)

### SUB-134
- **Problem:** The ralph-plan skill lacked an argument-hint frontmatter field, making it unclear what arguments users should provide
- **Changes:** Added `argument-hint: <vision|roadmap|stories|tasks|subtasks> [options]` to the YAML frontmatter in SKILL.md. Format follows existing patterns from gh-search and interrogate-on-changes skills (angle brackets for required choice, square brackets for optional parts).
- **Files:**
  - Modified: .claude/skills/ralph-plan/SKILL.md (added argument-hint field)

### SUB-135
- **Problem:** The ralph-plan skill execution instructions only covered interactive mode for tasks, missing auto mode instructions
- **Changes:** Added two new execution instruction sections to ralph-plan SKILL.md: (1) "If argument is `tasks <story-id> --auto`" for single-story auto generation - reads tasks-auto.md workflow, generates task files without interaction; (2) "If argument is `tasks --milestone <name> --auto`" for milestone-wide parallel generation - reads tasks-milestone.md workflow, spawns parallel task-generator subagents. Both sections follow the established pattern with MANDATORY FIRST STEP file reads and numbered process steps.
- **Files:**
  - Modified: .claude/skills/ralph-plan/SKILL.md (added 32 lines of auto mode execution instructions)

### SUB-136
- **Problem:** Subtasks generation lacked an option to bypass decomposition/sizing logic when tasks are already well-scoped
- **Changes:** Added --1-to-1 flag to subtasks generation that maps each input item directly to one subtask without splitting or merging. Updated SKILL.md with: invocation example, --1-to-1 in Optional Flags table, "When to Use" section with guidelines. Updated subtasks-from-source.md workflow: added flag to Parameters table, added skip instructions for Phase 3b (Size Judgment) and Phase 4 (Size Validation), made Phase 8 triage findings informational-only in 1-to-1 mode.
- **Files:**
  - Modified: .claude/skills/ralph-plan/SKILL.md (added --1-to-1 documentation in subtasks section)
  - Modified: context/workflows/ralph/planning/subtasks-from-source.md (added flag handling throughout workflow)

### SUB-137
- **Problem:** The ralph review commands (stories, roadmap, subtasks, gap *) were supervised-only with no --headless option, even though workflow files already documented this pattern
- **Changes:** Added -H/--headless option to all 5 ralph review commands: stories, roadmap, subtasks, gap roadmap, and gap stories. When headless mode is used, commands run invokeClaudeHeadless() with JSON output and file logging instead of invokeClaudeChat(). Also updated milestone validation in stories and gap stories commands to use requireMilestone() for consistent error handling. Updated 5 E2E tests to verify --headless flag presence (changed from checking for "supervised only" to checking for "--headless").
- **Files:**
  - Modified: tools/src/commands/ralph/index.ts (added --headless to 5 review commands)
  - Modified: tools/tests/e2e/ralph.test.ts (updated 5 tests, added 1 new test)

### SUB-138
- **Problem:** Need a workflow file for reviewing task definitions against parent stories
- **Changes:** Created context/workflows/ralph/review/tasks-review-auto.md for reviewing task definitions. Includes five quality dimensions: Goal clarity, Plan concreteness, AC testability, Scope boundaries, Story alignment. Follows stories-review-auto.md pattern with per-task analysis table, cross-task analysis (coverage, overlaps, dependencies, gaps), and structured output format. References chunked-presentation.md for interactive mode. Documents CLI invocation: aaa ralph review tasks --story <path>.
- **Files:**
  - Created: context/workflows/ralph/review/tasks-review-auto.md

### SUB-139
- **Problem:** Need a workflow file for gap analysis of task coverage against story acceptance criteria
- **Changes:** Created context/workflows/ralph/review/tasks-gap-auto.md for cold analysis of task coverage. Includes four gap analysis dimensions: Coverage check (story AC to task mapping), Missing tasks (work not addressed), Technical unknowns (spike candidates), Dependencies (order constraints). Follows stories-gap-auto.md pattern with coverage matrix, dependency map, technical spike candidates table. References chunked-presentation.md for interactive mode. Documents CLI invocation: aaa ralph review gap tasks --story <path>.
- **Files:**
  - Created: context/workflows/ralph/review/tasks-gap-auto.md

### SUB-140
- **Problem:** Need CLI commands for Tasks review and gap analysis to complete the workflow integration
- **Changes:** Added two new ralph review commands to the CLI: `aaa ralph review tasks --story <path>` for reviewing tasks and `aaa ralph review gap tasks --story <path>` for gap analysis. Both commands support --headless flag and invoke the correct workflow files (tasks-review-auto.md and tasks-gap-auto.md). Added 5 E2E tests (2 for tasks, 2 for gap tasks, 1 for gap --help). Updated README.md with new command examples.
- **Files:**
  - Modified: tools/src/commands/ralph/index.ts (added tasks and gap tasks commands)
  - Modified: tools/tests/e2e/ralph.test.ts (added 5 E2E tests)
  - Modified: README.md (added command examples)

### SUB-141
- **Problem:** Need a workflow file for gap analysis of subtask queue coverage against parent tasks
- **Changes:** Created context/workflows/ralph/review/subtasks-gap-auto.md for cold analysis of subtask queue coverage. Includes four gap analysis dimensions: Coverage check (task AC to subtask mapping), AC verification (testability and completeness), Dependency analysis (order and blocking issues), Risk assessment (build loop failure risks). Follows the pattern from tasks-gap-auto.md and stories-gap-auto.md. References chunked-presentation.md for interactive mode. Documents CLI invocation: aaa ralph review gap subtasks --subtasks <path>.
- **Files:**
  - Created: context/workflows/ralph/review/subtasks-gap-auto.md

### SUB-142
- **Problem:** Need CLI command to invoke the Subtasks Gap Analysis workflow
- **Changes:** Added `aaa ralph review gap subtasks --subtasks <path>` command to the CLI. Command invokes subtasks-gap-auto.md workflow for cold analysis of subtask queue coverage. Supports --headless mode for JSON output and file logging. Added 2 E2E tests (help output, required option validation) and updated gap --help test to include subtasks. Updated README.md with command example.
- **Files:**
  - Modified: tools/src/commands/ralph/index.ts (added gap subtasks subcommand)
  - Modified: tools/tests/e2e/ralph.test.ts (added 3 test assertions)
  - Modified: README.md (added command example)

### SUB-143
- **Problem:** Duplicate gap workflows existed in planning/ and review/ directories
- **Changes:** Replaced planning/roadmap-gap-analysis.md and planning/story-gap-analysis.md with references to their canonical versions in review/. The planning/ files now contain brief redirect notes pointing to review/roadmap-gap-auto.md and review/stories-gap-auto.md respectively. Updated ralph-review SKILL.md to reference the review/ versions instead of the planning/ versions.
- **Files:**
  - Modified: context/workflows/ralph/planning/roadmap-gap-analysis.md (replaced 205 lines with 17-line reference)
  - Modified: context/workflows/ralph/planning/story-gap-analysis.md (replaced 222 lines with 17-line reference)
  - Modified: .claude/skills/ralph-review/SKILL.md (updated 2 path references)
