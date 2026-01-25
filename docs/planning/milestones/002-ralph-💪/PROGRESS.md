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
