# Milestone Progress: Ralph 002

## 2026-01-25

### SUB-012
- **Problem:** Need to define the interrogation workflow for surfacing assumptions and confidence levels in code changes
- **Changes:** Created context/workflows/interrogate.md with:
  - 3 core questions (hardest decision, rejected alternatives, lowest confidence)
  - Default, --quick, and --skeptical modes
  - Structured output format with confidence levels and tables
  - Target options (changes, commit, pr)
  - Integration guidance with code review workflow
- **Files:** context/workflows/interrogate.md (created)

### SUB-013
- **Problem:** Need a skill command to invoke the interrogation workflow with git context
- **Changes:** Created .claude/commands/dev/interrogate.md with:
  - Proper frontmatter (description, allowed-tools, argument-hint)
  - Target argument parsing (changes, commit, pr)
  - Mode flags support (--quick, --skeptical)
  - Git context gathering commands for each target type
  - Reference to interrogate workflow document
- **Files:** .claude/commands/dev/interrogate.md (created)

### SUB-014
- **Problem:** Need to integrate interrogation workflow into the complete-feature workflow as a pre-merge checkpoint
- **Changes:** Updated context/workflows/complete-feature.md with:
  - Added step 4 "Interrogation Checkpoint (Optional)" between storing branch name and squashing commits
  - Documents when interrogation is most valuable (substantial changes, AI code, uncertainty about trade-offs)
  - Shows invocation examples for default, --quick, and --skeptical modes
  - Renumbered subsequent steps (5-11)
- **Files:** context/workflows/complete-feature.md (modified)

### SUB-015
- **Problem:** Need a shared data contract (Finding interface) for all code review agents to output findings in a consistent format
- **Changes:** Created .claude/agents/code-review/ directory and types.md with:
  - Finding interface schema: id, reviewer, severity, file, line?, description, suggestedFix?, confidence
  - Severity enum: critical, high, medium, low with usage guidelines
  - Confidence scale: 0-1 with ranges explained (0.9-1.0 certain, 0.7-0.9 high, etc.)
  - Example Finding JSON for reference
  - Output format specification for reviewer agents
  - Usage notes for synthesizer agent
- **Files:** .claude/agents/code-review/types.md (created)

### SUB-016
- **Problem:** Need a security-focused code reviewer agent that analyzes code for vulnerabilities and outputs findings in the standard Finding JSON format
- **Changes:** Created .claude/agents/code-review/security-reviewer.md with:
  - Proper frontmatter (name, description, model: haiku)
  - Security focus areas: injection, XSS, authentication, secrets, authorization, crypto, data handling
  - OWASP Top 10 coverage
  - Confidence scoring logic with factors that increase/decrease confidence
  - Severity guidelines specific to security issues
  - Example findings for SQL injection, XSS, and hardcoded secrets
  - JSON output format matching Finding schema from types.md
- **Files:** .claude/agents/code-review/security-reviewer.md (created)

### SUB-017
- **Problem:** Need a data integrity focused code reviewer agent that analyzes code for null checks, boundary conditions, race conditions, and data validation issues
- **Changes:** Created .claude/agents/code-review/data-integrity-reviewer.md with:
  - Proper frontmatter (name, description, model: haiku)
  - Data integrity focus areas: null/undefined references, array boundaries, race conditions, data validation, object/map access, string/buffer handling
  - Confidence scoring logic with factors that increase/decrease confidence
  - Severity guidelines specific to data integrity issues
  - Example findings for null dereference, array bounds, race condition, and missing validation
  - JSON output format matching Finding schema from types.md
- **Files:** .claude/agents/code-review/data-integrity-reviewer.md (created)

### SUB-018
- **Problem:** Need an error handling focused code reviewer agent that analyzes code for swallowed exceptions, missing catch blocks, incomplete error recovery, and logging gaps
- **Changes:** Created .claude/agents/code-review/error-handling-reviewer.md with:
  - Proper frontmatter (name, description, model: haiku)
  - Error handling focus areas: swallowed exceptions, missing handlers, incomplete recovery, logging gaps, weak handlers, async/await anti-patterns
  - Distinction between missing handlers (no try/catch) and weak handlers (inadequate handling)
  - Confidence scoring logic with factors that increase/decrease confidence
  - Severity guidelines specific to error handling issues
  - Example findings for swallowed exception, missing handler, incomplete recovery, weak handler, and missing context
  - JSON output format matching Finding schema from types.md
- **Files:** .claude/agents/code-review/error-handling-reviewer.md (created)

### SUB-019
- **Problem:** Need a test coverage focused code reviewer agent that analyzes code for missing tests, untested edge cases, and insufficient test assertions
- **Changes:** Created .claude/agents/code-review/test-coverage-reviewer.md with:
  - Proper frontmatter (name, description, model: haiku)
  - Test coverage focus areas: missing test files, untested branches, edge cases, error handling coverage, assertion quality, integration points
  - Confidence scoring logic with factors that increase/decrease confidence
  - Severity guidelines specific to test coverage issues
  - Example findings for missing test file, untested branch, missing edge case, assertion gap, and untested error path
  - JSON output format matching Finding schema from types.md
- **Files:** .claude/agents/code-review/test-coverage-reviewer.md (created)

### SUB-020
- **Problem:** Need a synthesizer agent to aggregate findings from multiple specialized code reviewer agents into a consolidated, deduplicated, and prioritized report
- **Changes:** Created .claude/agents/code-review/synthesizer.md with:
  - Proper frontmatter (name, description, model: haiku)
  - Input format for receiving findings from multiple reviewers
  - Deduplication logic for same file+line+description findings
  - Priority scoring using severity weight × confidence formula
  - Sorting by priority score, severity, then file path
  - Grouping by file for easier navigation
  - Output format with summary statistics, full findings array, and by-file view
  - Example input/output demonstrating deduplication and consolidation
- **Files:** .claude/agents/code-review/synthesizer.md (created)

### SUB-021
- **Problem:** Need to rename and refocus coding-style-reviewer to maintainability-reviewer with new focus areas and move to code-review folder
- **Changes:** Created .claude/agents/code-review/maintainability-reviewer.md with:
  - Proper frontmatter (name, description, model: haiku)
  - Maintainability focus areas: coupling/cohesion, naming conventions, SRP violations, code organization, unnecessary complexity
  - Confidence scoring logic with factors that increase/decrease confidence
  - Severity guidelines specific to maintainability issues
  - Example findings for SRP violation, unclear naming, tight coupling, god function, and magic numbers
  - JSON output format matching Finding schema from types.md
  - Deleted original .claude/agents/coding-style-reviewer.md
  - Updated README.md to reflect the rename
- **Files:** .claude/agents/code-review/maintainability-reviewer.md (created), .claude/agents/coding-style-reviewer.md (deleted), README.md (modified)

### SUB-022
- **Problem:** Need to update the code-review workflow to document parallel multi-agent orchestration, triage actions, and synthesizer integration
- **Changes:** Updated context/workflows/code-review.md with:
  - Added dependency on types.md in frontmatter
  - Restructured into Simple Mode (default) and Parallel Mode (multi-agent)
  - Documented all 6 reviewer agents in a table (security, data-integrity, error-handling, test-coverage, maintainability, synthesizer)
  - Explained Task tool parallel invocation pattern with examples
  - Showed synthesizer invocation for aggregating findings
  - Defined triage actions (FIX, SKIP, FALSE POSITIVE) with meanings and next steps
  - Added triage flow pseudocode
  - Documented review diary logging format (logs/reviews.jsonl)
  - Added "When to Use Each Mode" guidance table
- **Files:** context/workflows/code-review.md (modified)

### SUB-023
- **Problem:** Need a skill to orchestrate parallel code review using multiple specialized reviewer agents with interactive triage
- **Changes:** Created .claude/skills/parallel-code-review/SKILL.md with:
  - Proper frontmatter (name, description, allowed-tools: Task, Bash, Read, Glob, AskUserQuestion)
  - Four-phase workflow: Gather Diff, Invoke Reviewers, Synthesize, Triage
  - Parallel invocation of 5 reviewer agents (security, data-integrity, error-handling, test-coverage, maintainability)
  - --quick mode for only security and data-integrity reviewers
  - Synthesizer invocation to aggregate and dedupe findings
  - Chunked presentation of findings (3-5 at a time)
  - Triage handling for FIX/SKIP/FALSE POSITIVE decisions
  - Review diary logging to logs/reviews.jsonl
  - Error handling for no diff, failed reviewers, and no findings
- **Files:** .claude/skills/parallel-code-review/SKILL.md (created)

### SUB-024
- **Problem:** Need to update the /dev:code-review command to use the new parallel-code-review skill instead of the simple workflow
- **Changes:** Updated .claude/commands/dev/code-review.md with:
  - Reference to .claude/skills/parallel-code-review/SKILL.md instead of context/workflows/code-review.md
  - Added allowed-tools: Task, Bash, Read, Glob, AskUserQuestion
  - Added argument-hint for --quick and --intent flags
  - Pass-through of $ARGUMENTS to the skill
  - /dev:code-review now triggers multi-agent parallel code review
- **Files:** .claude/commands/dev/code-review.md (modified)

### SUB-025
- **Problem:** Need TypeScript types for the code review CLI command to define Finding, ReviewDiaryEntry, and ReviewResult interfaces
- **Changes:** Created tools/src/commands/review/types.ts with:
  - Finding interface matching agent schema (id, reviewer, severity, file, line, description, suggestedFix, confidence)
  - Severity type enum (critical, high, medium, low)
  - ReviewDiaryEntry interface for logs/reviews.jsonl (timestamp, mode, findings count, fixed/skipped/falsePositives counts, decisions array)
  - ReviewResult interface for CLI output
  - TriageAction and TriageDecision types for triage handling
  - SEVERITY_WEIGHTS constant and calculatePriority utility function
  - ReviewerOutput interface for agent output format
  - ReviewMode type (headless, supervised, interactive)
- **Files:** tools/src/commands/review/types.ts (created)

### SUB-026
- **Problem:** Need the main CLI command structure for the code review tool with mode selection and subcommands
- **Changes:** Created tools/src/commands/review/index.ts with:
  - Main review command with mode selection
  - Bare `aaa review` prompts user to choose between modes
  - `--supervised` flag for watched execution with intervention
  - `--headless` flag for fully autonomous mode
  - `--headless --dry-run` flag for preview without applying fixes
  - Error handling for invalid flag combinations
  - `status` subcommand placeholder for diary display
  - Registered command in tools/src/cli.ts
- **Files:** tools/src/commands/review/index.ts (created), tools/src/cli.ts (modified)

### SUB-027
- **Problem:** Need to implement supervised mode for the review CLI that invokes Claude in chat mode with the parallel-code-review skill
- **Changes:** Updated tools/src/commands/review/index.ts with:
  - Implemented `runSupervisedReview()` function
  - Added `findProjectRoot()` helper to locate project root via CLAUDE.md marker
  - Loads the parallel-code-review skill from `.claude/skills/parallel-code-review/SKILL.md`
  - Uses `invokeClaudeChat()` from ralph/claude.ts for session management
  - Handles session results: interrupted, failed, and success cases
  - Provides clear error messages when skill file is not found
- **Files:** tools/src/commands/review/index.ts (modified)

### SUB-028
- **Problem:** Need to implement headless mode for the review CLI that invokes Claude with the parallel-code-review skill and processes findings automatically
- **Changes:** Updated tools/src/commands/review/index.ts with:
  - Implemented `runHeadlessReview()` function using `invokeClaudeHeadless()` from ralph/claude.ts
  - Added `buildHeadlessReviewPrompt()` to create prompt with JSON output format requirement
  - Added `parseReviewFindings()` to extract `<review-findings>` JSON block from Claude output
  - Added `autoTriageFindings()` for automatic categorization by severity × confidence (threshold: 3.0)
  - Added `renderFindingsSummary()` for formatted console output with severity breakdown and file grouping
  - Supports `--dry-run` flag to preview findings without applying fixes
  - Prepares diary entry for SUB-029 to persist
- **Files:** tools/src/commands/review/index.ts (modified)

### SUB-029
- **Problem:** Need to implement diary logging for the review command to persist review outcomes and provide a status display
- **Changes:** Updated tools/src/commands/review/index.ts with:
  - Added `writeDiaryEntry()` function to append ReviewDiaryEntry to logs/reviews.jsonl
  - Added `readDiaryEntries()` function to read and parse diary JSONL file
  - Added `getDiaryStats()` function to calculate summary statistics from diary entries
  - Added `formatTimestamp()` function for human-readable time display
  - Implemented `runReviewStatus()` to display review history and statistics
  - Updated `runHeadlessReview()` to call `writeDiaryEntry()` after each run
  - Implemented the `status` subcommand with full functionality (was placeholder)
  - Status displays: total reviews, total findings, avg per review, triage outcomes, recent entries with severity breakdown
- **Files:** tools/src/commands/review/index.ts (modified)

### SUB-030
- **Problem:** Need to add shell completions for the new `aaa review` command
- **Changes:** Updated all three shell completion generators:
  - bash.ts: Added `review` to top-level commands, flag completions (-s/--supervised, -H/--headless, --dry-run), and `status` subcommand
  - zsh.ts: Added `review` command with description, created `_aaa_review()` completion function with all flags and subcommand
  - fish.ts: Added `review` top-level command, all flag completions, and `status` subcommand
- **Files:** tools/src/commands/completion/bash.ts (modified), tools/src/commands/completion/zsh.ts (modified), tools/src/commands/completion/fish.ts (modified)

### SUB-031
- **Problem:** Need an over-engineering focused code reviewer agent that identifies YAGNI violations, premature abstraction, unnecessary complexity, and over-configurability
- **Changes:** Created .claude/agents/code-review/over-engineering-reviewer.md with:
  - Proper frontmatter (name, description, model: haiku)
  - Over-engineering focus areas: YAGNI violations, premature abstraction, unnecessary complexity, over-configurability, accidental complexity
  - Specific patterns to detect: single-implementation patterns, unused abstraction layers, factory patterns with single products, enterprise patterns in non-enterprise contexts
  - Confidence scoring logic with factors that increase/decrease confidence
  - Severity guidelines specific to over-engineering issues
  - Example findings for single implementation factory, premature abstraction, over-configurability, unnecessary indirection, and utility used once
  - JSON output format matching Finding schema from types.md
  - Suggested fixes showing simpler alternatives
- **Files:** .claude/agents/code-review/over-engineering-reviewer.md (created)

### SUB-032
- **Problem:** Need a performance-focused code reviewer agent that identifies N+1 queries, memory leaks, algorithm complexity issues, and inefficient patterns
- **Changes:** Created .claude/agents/code-review/performance-reviewer.md with:
  - Proper frontmatter (name, description, model: haiku)
  - Performance focus areas: N+1 query patterns, memory leaks and retention, algorithm complexity, inefficient data structures, rendering/UI performance, network/I/O inefficiency, startup/bundle performance
  - Confidence scoring logic with factors that increase/decrease confidence
  - Severity guidelines specific to performance issues
  - Example findings for N+1 query, memory leak, O(n²) algorithm, unnecessary re-renders, and missing pagination
  - JSON output format matching Finding schema from types.md
  - Suggested fixes with O-notation improvements where applicable
- **Files:** .claude/agents/code-review/performance-reviewer.md (created)

## 2026-01-26

### SUB-033
- **Problem:** Need an accessibility-focused code reviewer agent that identifies WCAG compliance issues in frontend code
- **Changes:** Created .claude/agents/code-review/accessibility-reviewer.md with:
  - Proper frontmatter (name, description, model: haiku)
  - Accessibility focus areas: ARIA and semantic HTML, keyboard navigation, color and visual, screen reader compatibility, form accessibility, media and time-based content
  - File scope filtering to only review frontend files (tsx, jsx, vue, svelte, html, css, scss)
  - Skip logic for non-frontend files (tests, server-side, config, build scripts)
  - Confidence scoring logic with factors that increase/decrease confidence
  - Severity guidelines specific to accessibility issues
  - Example findings for missing alt text, click handler without keyboard support, missing form label, missing focus indicator, and non-semantic element
  - JSON output format matching Finding schema from types.md
- **Files:** .claude/agents/code-review/accessibility-reviewer.md (created)

### SUB-034
- **Problem:** Need a documentation-focused code reviewer agent that identifies missing/outdated documentation, README gaps, missing JSDoc/TSDoc comments, and changelog omissions
- **Changes:** Created .claude/agents/code-review/documentation-reviewer.md with:
  - Proper frontmatter (name, description, model: haiku)
  - Documentation focus areas: public API documentation, README and guide updates, inline code documentation, changelog and release notes, type documentation, configuration documentation
  - Confidence scoring logic with factors that increase/decrease confidence
  - Severity guidelines specific to documentation issues
  - Example findings for missing JSDoc on exported function, new CLI flag without README, complex algorithm without comments, missing changelog entry, and missing type documentation
  - JSON output format matching Finding schema from types.md
- **Files:** .claude/agents/code-review/documentation-reviewer.md (created)

### SUB-035
- **Problem:** Need a dependency-focused code reviewer agent that identifies outdated dependencies, known vulnerabilities, license compatibility issues, and unnecessary dependencies
- **Changes:** Created .claude/agents/code-review/dependency-reviewer.md with:
  - Proper frontmatter (name, description, model: haiku)
  - Dependency focus areas: security vulnerabilities (CVEs), outdated dependencies, license compatibility, unnecessary dependencies, version range issues, supply chain risks
  - Confidence scoring logic with factors that increase/decrease confidence
  - Severity guidelines specific to dependency issues
  - Example findings for known vulnerability, deprecated package, unnecessary dependency, license concern, and overly permissive range
  - References to npm audit, npm-check-updates, and license-checker tools
  - JSON output format matching Finding schema from types.md
- **Files:** .claude/agents/code-review/dependency-reviewer.md (created)

### SUB-036
- **Problem:** Need an intent-alignment focused code reviewer agent that verifies implementation matches stated requirements
- **Changes:** Created .claude/agents/code-review/intent-alignment-reviewer.md with:
  - Proper frontmatter (name, description, model: haiku)
  - Requires intent parameter (description or @file reference)
  - Alignment focus areas: missing functionality, implementation gaps, scope creep, misinterpretation, documentation alignment
  - Comparison process: parse intent, map to implementation, identify gaps, find deviations, detect additions
  - Confidence scoring logic based on requirement clarity
  - Severity guidelines specific to alignment issues
  - Example findings for missing feature, partial implementation, scope creep, misinterpretation, and docs mismatch
  - JSON output format matching Finding schema from types.md
- **Files:** .claude/agents/code-review/intent-alignment-reviewer.md (created)

### SUB-037
- **Problem:** Need to document where lessons (learned knowledge) should be placed in the atomic documentation structure
- **Changes:** Updated context/blocks/docs/atomic-documentation.md with:
  - Added "Where Lessons Go" section with context/ vs docs/ comparison table
  - Decision tree for determining placement: project-specific → docs/{folder}/, reusable about a tool → context/blocks/, about combining tools → context/foundations/, about a process → context/workflows/
  - Example showing how to add a Gotcha section to a block
  - Clarification that no separate lessons/ folder exists - lessons live where related docs already exist
- **Files:** context/blocks/docs/atomic-documentation.md (modified)

### SUB-038
- **Problem:** Need to document the Code Review Mode in the project VISION.md
- **Changes:** Added Section 3.4 "Code Review Mode" to docs/planning/VISION.md with:
  - Trust gradient documentation (Interactive, Supervised, Headless modes with commands)
  - Table listing all 12 specialized reviewer agents and their focus areas
  - Interrogation workflow section (/dev:interrogate with core questions and modes)
  - Review diary section documenting logs/reviews.jsonl format
- **Files:** docs/planning/VISION.md (modified)

### SUB-025
- **Problem:** The parallel-code-review skill documentation listed only 5 reviewers but there are 11 reviewer agents
- **Changes:** Updated .claude/skills/parallel-code-review/SKILL.md with:
  - Extended Reviewer Agents table from 5 to 11 agents (added dependency, documentation, accessibility, intent-alignment, over-engineering, performance reviewers)
  - Updated frontmatter description from "5 reviewers" to "11 reviewers"
  - Updated Overview table Phase 2 from "5 specialized agents" to "11 specialized agents"
  - Added Task 6-11 examples in Phase 2 invocation section
  - Updated synthesizer input example to include all 11 reviewers
  - Updated "CRITICAL" note from "All 5 Task calls" to "All 11 Task calls"
- **Files:** .claude/skills/parallel-code-review/SKILL.md (modified)

### SUB-026
- **Problem:** Documentation gaps for the new `aaa review` CLI command - not documented in README.md CLI Tools section, and review/ folder missing from tools/CLAUDE.md directory structure
- **Changes:** Added documentation in two files:
  - README.md: Added "Code Review" section documenting all 11 reviewers, modes (--supervised, --headless, --dry-run), status subcommand, and link to VISION.md
  - tools/CLAUDE.md: Added review/ folder entry to Directory Structure with index.ts and types.ts
- **Files:** README.md (modified), tools/CLAUDE.md (modified)

### SUB-027
- **Problem:** Error handling gaps in review/index.ts: readDiaryEntries silently returns [] on error, and parseReviewFindings uses raw JSON.parse without validation
- **Changes:** Added error logging and Zod validation:
  - Added console.warn with chalk.yellow to readDiaryEntries catch block, matching writeDiaryEntry pattern
  - Created Zod schemas (SeveritySchema, FindingSchema, FindingsArraySchema) in types.ts for runtime validation
  - Updated parseReviewFindings to use FindingsArraySchema.safeParse() instead of raw JSON.parse
  - Added detailed Zod error logging when findings validation fails
- **Files:** tools/src/commands/review/index.ts (modified), tools/src/commands/review/types.ts (modified)

### SUB-028a
- **Problem:** Research task to analyze the relationship between /dev:interrogate command and parallel-code-review skill
- **Changes:** Analyzed all relevant files and documented findings:
  - **Interrogate purpose:** Ask "why" - surfaces assumptions, decisions, and confidence levels. Focus: developer's decision-making process. 3 core questions about what was hard, rejected, and uncertain.
  - **Review purpose:** Find issues - identifies bugs, vulnerabilities, anti-patterns across 11 specialized domains. Focus: technical quality of the code itself.
  - **Integration status:** NOT currently integrated - they run independently. Interrogation is documented as optional pre-merge checkpoint in complete-feature.md.
  - **Relationship:** Complementary tools. Interrogate surfaces assumptions, Review validates correctness. Both useful for thorough pre-merge validation.
  - **Recommendation for SUB-028b:** Add "Related Tools" section to SKILL.md clarifying the distinction.
- **Files:** None modified (research task - output in completion notes)

### SUB-028b
- **Problem:** Need to document the distinction between /dev:interrogate and aaa review (parallel code review) so users know when to use each
- **Changes:** Added "Related Tools" section to .claude/skills/parallel-code-review/SKILL.md with:
  - Comparison table: Primary Question, Target, Analogy, Best For
  - "When to use which" guidance explaining interrogate = understanding decisions, review = finding issues
  - Recommendation for thorough pre-merge validation: run both (interrogate first for intent, then review for quality)
- **Files:** .claude/skills/parallel-code-review/SKILL.md (modified)

### SUB-029
- **Problem:** Need types to support timing instrumentation and mode tracking in Ralph iterations
- **Changes:** Extended Ralph types in tools/src/commands/ralph/types.ts:
  - Added IterationTiming interface (claudeMs, hookMs, summaryMs, metricsMs)
  - Added optional timing field to IterationDiaryEntry
  - Added optional mode field to IterationDiaryEntry ('headless' | 'supervised')
  - Added skipSummary boolean field to BuildOptions
  - Updated index.ts to include skipSummary: false in BuildOptions call
- **Files:** tools/src/commands/ralph/types.ts (modified), tools/src/commands/ralph/index.ts (modified)

### SUB-030
- **Problem:** Need CLI flag to skip Haiku summary generation in headless mode to reduce latency and cost
- **Changes:** Added -S, --skip-summary CLI flag to ralph build command:
  - Added .option('-S, --skip-summary', 'Skip Haiku summary generation in headless mode') to build command
  - Updated skipSummary from hardcoded false to options.skipSummary === true in runBuild() call
  - Added E2E test coverage for the new flag
- **Files:** tools/src/commands/ralph/index.ts (modified), tools/tests/e2e/ralph.test.ts (modified)

### SUB-031
- **Problem:** Need timing instrumentation in post-iteration hook to track where time is spent during Ralph build iterations
- **Changes:** Added timing instrumentation to runPostIterationHook() in post-iteration.ts:
  - Extended PostIterationOptions with claudeMs, mode, and skipSummary fields
  - Added timing to generateSummary() - returns summaryMs in SummaryResult
  - Added timing to metrics collection (metricsMs)
  - Added hook total time tracking (hookMs)
  - Implemented skipSummary logic - returns placeholder "[skipped]" summary when true
  - Populated timing field (IterationTiming) in diary entry with all timing values
  - Populated mode field in diary entry when provided
- **Files:** tools/src/commands/ralph/post-iteration.ts (modified)

### SUB-032
- **Problem:** Need to track Claude invocation time in build.ts to complete the timing instrumentation chain
- **Changes:** Added timing instrumentation to processHeadlessIteration() in build.ts:
  - Added shouldSkipSummary to HeadlessIterationContext interface
  - Wrapped invokeClaudeHeadless() call with timing (claudeStart = Date.now(), claudeMs calculation)
  - Passed claudeMs, skipSummary, and mode: "headless" to runPostIterationHook()
  - Destructured skipSummary from build options (as shouldSkipSummary to follow naming convention)
  - Passed shouldSkipSummary through processHeadlessIteration context
- **Files:** tools/src/commands/ralph/build.ts (modified)

### SUB-033
- **Problem:** Need a function to discover the most recent Claude session file created after a given timestamp for supervised mode integration
- **Changes:** Added discoverRecentSession() function to session.ts:
  - Added DiscoveredSession interface for return type { sessionId: string; path: string }
  - Implemented discoverRecentSession(afterTimestamp: number) function
  - Uses find command with -newermt to filter by timestamp
  - Searches in CLAUDE_CONFIG_DIR/projects or ~/.claude/projects
  - Returns most recent session file using ls -t sorting
  - Exported both the function and type
  - Added unit tests in tools/tests/lib/session.test.ts
- **Files:** tools/src/commands/ralph/session.ts (modified), tools/tests/lib/session.test.ts (created)

### SUB-034
- **Problem:** Supervised mode didn't display post-iteration metrics or write diary entries like headless mode does
- **Changes:** Updated processSupervisedIteration() in build.ts to add post-iteration feedback:
  - Extended SupervisedIterationContext with currentAttempts, currentSubtask, iteration, maxIterations, remaining
  - Added SupervisedIterationResult interface for return type
  - Capture startTime = Date.now() before invokeClaudeChat
  - After session ends, call discoverRecentSession(startTime) to find session file
  - If session found, call runPostIterationHook() with skipSummary: true, mode: 'supervised'
  - Display metrics box via renderIterationEnd() when hook returns result
  - Diary entry written to logs/iterations.jsonl with mode: 'supervised'
  - Refactored handleMaxIterationsExceeded() into helper function to reduce runBuild complexity
  - Updated runBuild() to use new supervised result tracking
- **Files:** tools/src/commands/ralph/build.ts (modified)

### SUB-035
- **Problem:** Need a foundational helper function to generate milestone-scoped log paths for the daily log file restructuring
- **Changes:** Added getMilestoneLogPath() function to config.ts:
  - Function takes milestoneRoot: string parameter
  - Returns path: {milestoneRoot}/logs/{YYYY-MM-DD}.jsonl
  - Uses UTC date via new Date().toISOString().split('T')[0] for timezone consistency
  - Added unit tests in tools/tests/lib/config.test.ts covering all acceptance criteria
- **Files:** tools/src/commands/ralph/config.ts (modified), tools/tests/lib/config.test.ts (created)

### SUB-036
- **Problem:** Need helper functions to derive log paths from subtasks.json location for iteration logs and milestone path for planning logs
- **Changes:** Added two helper functions to config.ts:
  - getIterationLogPath(subtasksPath: string) - derives milestone root from subtasks.json parent directory using dirname(), routes to _orphan/logs/ for empty/invalid paths
  - getPlanningLogPath(milestonePath: string) - passes milestone path directly to getMilestoneLogPath()
  - Added ORPHAN_MILESTONE_ROOT constant for fallback path
  - Added comprehensive unit tests for both functions (14 new tests)
- **Files:** tools/src/commands/ralph/config.ts (modified), tools/tests/lib/config.test.ts (modified)

### SUB-037
- **Problem:** Need a type discriminator field in IterationDiaryEntry to distinguish iteration entries from planning entries in the same daily log file
- **Changes:** Added optional type field to IterationDiaryEntry in types.ts:
  - Field: `type?: "iteration" | "planning"`
  - JSDoc comment explaining the discriminator's purpose for daily log files
  - Enables iteration and planning entries to coexist in milestone-scoped daily JSONL files
- **Files:** tools/src/commands/ralph/types.ts (modified)

### SUB-038
- **Problem:** Planning logs were being written to global logs/planning.jsonl instead of milestone-scoped locations
- **Changes:** Updated getPlanningLogPath() in index.ts to use milestone-scoped paths:
  - Import getMilestonePlanningLogPath helper from config.ts
  - Function now takes optional milestonePath parameter
  - When milestone provided: writes to {milestone}/logs/{date}.jsonl
  - When no milestone: falls back to _orphan/logs/{date}.jsonl
  - Add 'type: planning' field to all planning log entries for discriminating from iteration entries
  - Updated all call sites (stories, tasks, subtasks commands) to pass milestone path when available
- **Files:** tools/src/commands/ralph/index.ts (modified)

### SUB-039
- **Problem:** Iteration logs were being written to global logs/iterations.jsonl instead of milestone-scoped locations
- **Changes:** Updated post-iteration.ts to use milestone-scoped iteration log paths:
  - Import getIterationLogPath from ./config
  - Add subtasksPath to PostIterationOptions interface
  - Replace hardcoded `${repoRoot}/logs/iterations.jsonl` with `getIterationLogPath(subtasksPath)`
  - Add `type: 'iteration'` field to diary entries for discriminating from planning entries
  - Update build.ts to pass subtasksPath to runPostIterationHook in both headless and supervised modes
- **Files:** tools/src/commands/ralph/post-iteration.ts (modified), tools/src/commands/ralph/build.ts (modified)

### SUB-040
- **Problem:** status.ts read from a single hardcoded log file path instead of aggregating from milestone-scoped daily log files
- **Changes:** Updated status.ts to glob multiple daily log files:
  - readIterationDiary() now accepts a directory path and uses readdirSync to find all *.jsonl files
  - Added readSingleDiaryFile() helper to parse individual JSONL files
  - Aggregates entries from all matching files and sorts by timestamp
  - Added getMilestoneLogsDirectory() to derive log directory from subtasks.json location
  - runStatus() now uses getMilestoneLogsDirectory() instead of hardcoded path
  - Falls back to _orphan/logs/ for orphaned logs
  - Created status.test.ts with unit tests for log aggregation behavior
- **Files:** tools/src/commands/ralph/status.ts (modified), tools/tests/lib/status.test.ts (created)

### SUB-041
- **Problem:** ralph.test.ts diary entry integration tests used hardcoded global log paths (logs/iterations.jsonl) instead of milestone-scoped paths
- **Changes:** Updated diary entry integration tests to use milestone-scoped log paths:
  - Create mock milestone directory structure (docs/planning/milestones/mock-milestone) in temp directories
  - Use UTC date-based log filenames ({YYYY-MM-DD}.jsonl) instead of iterations.jsonl
  - Update DIARY_PATH in bash test scripts to use milestone-scoped paths
  - Update verification assertions to check the new path structure
- **Files:** tools/tests/e2e/ralph.test.ts (modified)

### SUB-042
- **Problem:** Need to clean up .gitignore and remove v2 remnant files after milestone-scoped logs migration
- **Changes:** Cleanup operations for TASK-LOGS-001 completion:
  - Added .claude/cache/ to .gitignore to exclude cache files from version control
  - Deleted tmp/subtasks-v2.json remnant file (was untracked)
  - Deleted context/workflows/ralph/planning/subtasks-from-source-v2.md remnant file (was untracked)
  - Preserved old global logs/ files (contain historical data not yet migrated - per AC "if migrated" condition)
- **Files:** .gitignore (modified)

### SUB-043
- **Problem:** Need to preserve user-centric narratives from story files before cleanup (Phase 0 of naming consistency cleanup)
- **Changes:** Added Section 2b "User Personas & Stories" to docs/planning/VISION.md:
  - Table with 9 rows mapping features to personas and user stories
  - Features: Building Mode, Intention Drift, Interactive Vision Planning, Automated Pipeline, Self-Improvement, Hooks & Notifications, Progress & Status, Technical Standards, Interactive Planning Guidance
  - Each row preserves the persona description and user story from milestone 001-ralph story files
  - Positioned after Section 2 (Folder Structure), before subtasks.json section
- **Files:** docs/planning/VISION.md (modified)

### SUB-044
- **Problem:** Need to delete milestone 001-ralph story and task files as part of Phase 1a of naming consistency cleanup
- **Changes:** Deleted story and task directories from milestone 001-ralph:
  - Deleted stories/ directory with 9 story files (001-009)
  - Deleted tasks/ directory with 28 task files (001-028)
  - Preserved test-fixtures/ directory and other milestone artifacts
- **Files:** docs/planning/milestones/001-ralph/stories/ (deleted), docs/planning/milestones/001-ralph/tasks/ (deleted)

### SUB-045
- **Problem:** Need to delete milestone 002-ralph story and task files as part of Phase 1b of naming consistency cleanup
- **Changes:** Deleted story and task directories from milestone 002-ralph-💪:
  - Deleted stories/ directory with STORY-001-parallel-code-review.md
  - Deleted tasks/ directory with TASK-014 through TASK-018 (5 files)
  - Feature is documented in VISION.md Section 3.4 Code Review Mode
  - Preserved subtasks.json and PROGRESS.md
- **Files:** docs/planning/milestones/002-ralph-💪/stories/ (deleted), docs/planning/milestones/002-ralph-💪/tasks/ (deleted)

### SUB-046
- **Problem:** Need to delete global orphan stories and tasks as part of Phase 1c of naming consistency cleanup
- **Changes:** Deleted orphaned planning files from global docs/planning/ directories:
  - Deleted docs/planning/stories/001-cost-dashboard-overview.md (empty template)
  - Deleted docs/planning/tasks/011-rename-self-improvement-modes.md
  - Deleted docs/planning/tasks/012-cli-ergonomics-fixes.md
  - Deleted docs/planning/tasks/013-prompt-quality-improvements.md
  - Added .gitkeep to tasks/ to preserve directory structure
  - Preserved existing .gitkeep in stories/
- **Files:** docs/planning/stories/001-cost-dashboard-overview.md (deleted), docs/planning/tasks/011-013 (deleted), docs/planning/tasks/.gitkeep (created)

### SUB-047
- **Problem:** Stale subtasks.json in 001-ralph milestone contained pending subtasks (SUB-001 through SUB-011) referencing task files that were deleted in SUB-044
- **Changes:** Deleted docs/planning/milestones/001-ralph/subtasks.json as part of Phase 1d of naming consistency cleanup
- **Files:** docs/planning/milestones/001-ralph/subtasks.json (deleted)

### SUB-048
- **Problem:** No single source of truth for planning file naming conventions (stories, tasks, subtasks refs)
- **Changes:** Created context/blocks/docs/naming-convention.md documenting:
  - NNN-slug.md pattern with examples (e.g., 001-user-authentication.md)
  - Zero-padded 3-digit numbers rule for correct alphabetical sorting
  - Kebab-case slug rules (lowercase, hyphens, no spaces/special characters)
  - Folder-based type inference (stories/ vs tasks/ determines type, no STORY-/TASK- prefix needed)
  - JSON refs format (filename without .md extension)
  - Migration guidance for legacy TASK-NNN/STORY-NNN formats
- **Files:** context/blocks/docs/naming-convention.md (created)

### SUB-049
- **Problem:** subtasks.schema.json used legacy TASK-NNN/STORY-NNN patterns for taskRef and storyRef
- **Changes:** Updated schema patterns to use filename-based refs:
  - Changed metadata.storyRef pattern from ^STORY-[0-9]{3,}$ to ^[0-9]{3,}-[a-z0-9-]+$
  - Changed subtask.taskRef pattern from ^TASK-[0-9]{3,}$ to ^[0-9]{3,}-[a-z0-9-]+$ (also made nullable)
  - Changed subtask.storyRef pattern from ^STORY-[0-9]{3,}$ to ^[0-9]{3,}-[a-z0-9-]+$
  - Updated descriptions with examples (e.g., '015-cli-ergonomics-fixes', '001-parallel-code-review')
- **Files:** docs/planning/schemas/subtasks.schema.json (modified)

### SUB-050
- **Problem:** Global subtasks.json used legacy TASK-NNN format for taskRef values
- **Changes:** Updated all taskRef values to use filename-based NNN-slug format:
  - TASK-011 → 011-rename-self-improvement-modes
  - TASK-012 → 012-cli-ergonomics-fixes
  - TASK-013 → 013-prompt-quality-improvements
- **Files:** docs/planning/subtasks.json (modified)

### SUB-051
- **Problem:** Milestone 002-ralph subtasks.json used legacy TASK-XXX and STORY-XXX format for taskRef and storyRef values
- **Changes:** Updated all taskRef and storyRef values to use filename-based NNN-slug format:
  - TASK-REVIEW-001 → 014-review-code-quality
  - TASK-TIMING-001 → 015-timing-instrumentation
  - TASK-SUPERVISED-001 → 016-supervised-mode-feedback
  - TASK-LOGS-001 → 017-milestone-scoped-logs
  - TASK-NAMING-001 → 018-naming-consistency-cleanup
  - STORY-001 → 001-parallel-code-review
- **Files:** docs/planning/milestones/002-ralph-💪/subtasks.json (modified)

### SUB-052
- **Problem:** Final verification needed to confirm naming consistency cleanup was successful (Phase 6)
- **Changes:** Verified all acceptance criteria:
  - Confirmed no stories/ or tasks/ directories in milestone folders
  - Confirmed no subtasks.json in 001-ralph/
  - Confirmed no files in docs/planning/stories/ or tasks/ (except .gitkeep)
  - Validated both subtasks.json files are valid JSON via jq
  - Build, typecheck, and lint all pass
  - Pre-existing test failures in format.test.ts unrelated to cleanup
- **Files:** None modified (verification task)

### SUB-053
- **Problem:** The sizing metric field was named `elementCount` but the plan decided to use `changeCount` as the field name
- **Changes:**
  - Added `classification` schema to subtasks.schema.json with:
    - `knowledgeCertainty` enum (known-known, known-unknown, unknown-unknown)
    - `spikeIndicators` integer field
    - `changeCount` integer field (the renamed sizing metric)
    - `reasoning` string field
  - Replaced all `elementCount` occurrences with `changeCount` in milestone subtasks.json (29 occurrences)
  - The changeCount field is documented for sizing: <2 = undersized, >8 = oversized
- **Files:** docs/planning/schemas/subtasks.schema.json (modified), docs/planning/milestones/002-ralph-💪/subtasks.json (modified)

### SUB-054
- **Problem:** Need a reusable pattern documentation for the triage workflow (dedupe, score, rank, group) used by code-review synthesizer and future subtask-reviewer
- **Changes:** Created context/blocks/patterns/triage.md with:
  - Phase 1: Deduplication logic (same file + line + description overlap, merge strategy)
  - Phase 2: Priority scoring formula (severity × confidence, with weight table)
  - Phase 3: Ranking/sorting rules (priority desc, severity, alphabetical location)
  - Phase 4: Grouping strategies (by file for navigation)
  - Output structure documentation (summary, items array, grouped view)
  - Use case references to code-review synthesizer and subtask-reviewer
- **Files:** context/blocks/patterns/triage.md (created)

### SUB-055
- **Problem:** Need a Haiku-based agent to review ALL subtasks for sizing issues (oversized, undersized, merge/split candidates)
- **Changes:** Created .claude/agents/subtask-reviewer.md with:
  - YAML frontmatter with model: haiku
  - Input format documentation (subtasks JSON array)
  - Sizing heuristics: changeCount < 2 = undersized, > 8 = oversized
  - Output format: oversized, undersized, mergeCandidates, splitCandidates, approved arrays
  - Reference to @context/blocks/patterns/triage.md for core triage logic
  - Merge candidate detection criteria (same taskRef, same files, sequential blockedBy)
  - Split candidate suggestion boundaries (research/implementation, file boundaries, functional units)
- **Files:** .claude/agents/subtask-reviewer.md (created)

### SUB-056
- **Problem:** The synthesizer.md contained duplicated triage logic instead of referencing the shared triage pattern documentation
- **Changes:** Updated .claude/agents/code-review/synthesizer.md to reference triage pattern:
  - Added "Core Pattern" section with reference to @context/blocks/patterns/triage.md
  - Annotated processing steps with "Pattern Phase N" references
  - Kept code-review specific details (file/line/description duplicate criteria)
  - Preserved output format unchanged
- **Files:** .claude/agents/code-review/synthesizer.md (modified)

### SUB-057
- **Problem:** Need to add Phase 1b (Doc Lookup) to subtasks-from-source.md workflow for identifying relevant atomic docs before codebase analysis
- **Changes:** Added Phase 1b: Doc Lookup between Phase 1 (Parse Input) and Phase 2 (Codebase Analysis):
  - Documents using Haiku subagent to extract technologies/concepts from parsed input
  - Documents searching context/README.md index for matching blocks/foundations/stacks
  - Documents classification of results: add to filesToRead OR flag missing for Phase 6b
  - Output format: docMatches array and missingDocs array
  - Includes example showing end-to-end doc lookup process
- **Files:** context/workflows/ralph/planning/subtasks-from-source.md (modified)
