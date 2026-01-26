---
name: parallel-code-review
description: Orchestrate parallel code review using specialized reviewer agents. Spawns 11 reviewers in parallel, synthesizes findings, and presents for triage. Use when user wants comprehensive multi-agent code review.
allowed-tools: Task, Bash, Read, Glob, AskUserQuestion
---

# Parallel Code Review

Orchestrates a multi-agent code review using specialized reviewers running in parallel.

## Arguments

- `--intent <description|@file>` - Optional intent for alignment check
- `--quick` - Only run security and data-integrity reviewers

## Overview

| Phase | Action | Purpose |
|-------|--------|---------|
| 1 | Gather Diff | Get code changes to review |
| 2 | Invoke Reviewers | Spawn 11 specialized agents in parallel |
| 3 | Synthesize | Aggregate and dedupe findings |
| 4 | Triage | Present findings for FIX/SKIP/FALSE POSITIVE decisions |

## Reviewer Agents

| Agent | Focus Area |
|-------|------------|
| `security-reviewer` | OWASP Top 10, injection, XSS, auth, secrets |
| `data-integrity-reviewer` | Null checks, boundaries, race conditions |
| `error-handling-reviewer` | Exceptions, catch blocks, error recovery |
| `test-coverage-reviewer` | Missing tests, edge cases, assertions |
| `maintainability-reviewer` | Coupling, naming, SRP, organization |
| `dependency-reviewer` | Outdated deps, vulnerabilities, licenses |
| `documentation-reviewer` | Missing docs, README gaps, JSDoc/TSDoc |
| `accessibility-reviewer` | WCAG, ARIA, color contrast, keyboard nav |
| `intent-alignment-reviewer` | Implementation vs requirements, scope creep |
| `over-engineering-reviewer` | YAGNI, premature abstraction, complexity |
| `performance-reviewer` | N+1 queries, memory leaks, algorithm complexity |

All reviewers output findings in the standard JSON format defined in @.claude/agents/code-review/types.md.

## Workflow

### Phase 1: Gather Diff

Get the code changes to review:

```bash
# Get staged and unstaged changes
git diff HEAD
```

If no changes exist, check for commits not pushed:

```bash
# Changes since last push/merge
git diff origin/main...HEAD
```

If still no changes, inform user and exit.

### Phase 2: Invoke Reviewers in Parallel

Spawn all reviewer agents simultaneously using Task tool. Each agent receives:
1. The diff content
2. Instructions to output findings in JSON format

**For --quick mode:** Only spawn `security-reviewer` and `data-integrity-reviewer`.

**Standard mode (11 agents in parallel):**

```
Launch ALL these Task tool calls in a SINGLE message:

Task 1: security-reviewer agent
  - subagent_type: "security-reviewer"
  - prompt: |
      Review this diff for security issues. Output JSON findings per the Finding schema.

      <diff>
      {diff content}
      </diff>

Task 2: data-integrity-reviewer agent
  - subagent_type: "data-integrity-reviewer"
  - prompt: |
      Review this diff for data integrity issues. Output JSON findings per the Finding schema.

      <diff>
      {diff content}
      </diff>

Task 3: error-handling-reviewer agent
  - subagent_type: "error-handling-reviewer"
  - prompt: |
      Review this diff for error handling issues. Output JSON findings per the Finding schema.

      <diff>
      {diff content}
      </diff>

Task 4: test-coverage-reviewer agent
  - subagent_type: "test-coverage-reviewer"
  - prompt: |
      Review this diff for test coverage issues. Output JSON findings per the Finding schema.

      <diff>
      {diff content}
      </diff>

Task 5: maintainability-reviewer agent
  - subagent_type: "maintainability-reviewer"
  - prompt: |
      Review this diff for maintainability issues. Output JSON findings per the Finding schema.

      <diff>
      {diff content}
      </diff>

Task 6: dependency-reviewer agent
  - subagent_type: "dependency-reviewer"
  - prompt: |
      Review this diff for dependency issues. Output JSON findings per the Finding schema.

      <diff>
      {diff content}
      </diff>

Task 7: documentation-reviewer agent
  - subagent_type: "documentation-reviewer"
  - prompt: |
      Review this diff for documentation issues. Output JSON findings per the Finding schema.

      <diff>
      {diff content}
      </diff>

Task 8: accessibility-reviewer agent
  - subagent_type: "accessibility-reviewer"
  - prompt: |
      Review this diff for accessibility issues. Output JSON findings per the Finding schema.

      <diff>
      {diff content}
      </diff>

Task 9: intent-alignment-reviewer agent
  - subagent_type: "intent-alignment-reviewer"
  - prompt: |
      Review this diff for intent alignment issues. Output JSON findings per the Finding schema.

      <intent>
      {intent description or @file reference, if provided via --intent flag}
      </intent>

      <diff>
      {diff content}
      </diff>

Task 10: over-engineering-reviewer agent
  - subagent_type: "over-engineering-reviewer"
  - prompt: |
      Review this diff for over-engineering issues. Output JSON findings per the Finding schema.

      <diff>
      {diff content}
      </diff>

Task 11: performance-reviewer agent
  - subagent_type: "performance-reviewer"
  - prompt: |
      Review this diff for performance issues. Output JSON findings per the Finding schema.

      <diff>
      {diff content}
      </diff>
```

**CRITICAL:** All 11 Task calls must be in a single message for true parallel execution.

### Phase 3: Synthesize Results

After all reviewers complete, collect their JSON findings and pass to synthesizer:

```
Task: synthesizer agent
  - subagent_type: "synthesizer"
  - prompt: |
      Aggregate these findings from multiple reviewers. Dedupe, rank by severity x confidence, and group by file.

      <findings>
      {
        "reviewers": {
          "security-reviewer": { "findings": [...] },
          "data-integrity-reviewer": { "findings": [...] },
          "error-handling-reviewer": { "findings": [...] },
          "test-coverage-reviewer": { "findings": [...] },
          "maintainability-reviewer": { "findings": [...] },
          "dependency-reviewer": { "findings": [...] },
          "documentation-reviewer": { "findings": [...] },
          "accessibility-reviewer": { "findings": [...] },
          "intent-alignment-reviewer": { "findings": [...] },
          "over-engineering-reviewer": { "findings": [...] },
          "performance-reviewer": { "findings": [...] }
        }
      }
      </findings>
```

The synthesizer outputs:
- Summary statistics (total, unique, by severity, by reviewer)
- Sorted findings array (highest priority first)
- By-file grouping for navigation

### Phase 4: Triage Findings

Present findings to user in chunks of 3-5 findings at a time, starting with highest priority.

For each chunk, display:

```markdown
## Review Findings (Showing N-M of Total)

### Finding 1: [severity] in [file]:[line]

**Reviewer:** [agent name]
**Confidence:** [0-1]
**Description:** [issue description]
**Suggested Fix:**
```[language]
[code snippet if available]
```

### Finding 2: ...
```

Use AskUserQuestion for triage decisions:

```
Questions:
1. "What action for Finding 1: [brief description]?"
   Options:
   - FIX: Issue is valid, apply the fix
   - SKIP: Valid issue, won't fix now (add to tech debt)
   - FALSE POSITIVE: Not actually an issue (record for calibration)

2. "What action for Finding 2: ..."

... up to 4 findings per question batch
```

After each batch:
- For FIX decisions: Apply the suggested fix or implement correction
- For SKIP: Note the reason if provided
- For FALSE POSITIVE: Record for future agent calibration
- Continue to next batch

### Completion

After all findings triaged, output summary:

```markdown
## Code Review Complete

**Findings Summary:**
- Total findings: N
- Fixed: X
- Skipped: Y
- False positives: Z

**Fixed Issues:**
1. [file:line] - [brief description]
2. ...

**Skipped (Tech Debt):**
1. [file:line] - [brief description] - [reason]
2. ...

**False Positives (for calibration):**
1. [file:line] - [brief description]
2. ...
```

## Review Diary

If `logs/reviews.jsonl` exists or should be created, append entry:

```json
{
  "timestamp": "2024-01-15T10:30:00Z",
  "mode": "parallel",
  "findingsCount": 12,
  "fixed": 8,
  "skipped": 3,
  "falsePositives": 1,
  "decisions": [
    { "id": "abc123", "action": "FIX" },
    { "id": "def456", "action": "SKIP", "reason": "tech debt" },
    { "id": "ghi789", "action": "FALSE_POSITIVE" }
  ]
}
```

## Error Handling

- **No diff found:** Inform user "No changes to review" and exit
- **Reviewer fails:** Log error, continue with other reviewers' findings
- **No findings:** Report "No issues found by any reviewer"
- **Synthesizer fails:** Present raw findings ungrouped, note synthesis failed

## Related Tools

### Interrogate vs Review

These are complementary tools for thorough pre-merge validation:

| Aspect | `/dev:interrogate` | `aaa review` (this tool) |
|--------|-------------------|--------------------------|
| **Primary Question** | "Why did you make these choices?" | "What problems does this code have?" |
| **Target** | Developer's reasoning and intent | Code quality and correctness |
| **Analogy** | Explaining your work to a colleague | Having your work audited |
| **Best For** | Understanding design decisions | Finding bugs and anti-patterns |

**When to use which:**

- **Use Interrogate** when you want to understand the "why" behind changes - surfaces assumptions, rejected alternatives, and areas of low confidence. Especially valuable for AI-generated code or complex decisions.

- **Use Review** (this tool) when you want to find issues - bugs, vulnerabilities, anti-patterns, missing tests. Validates correctness across 11 specialized domains.

**For thorough pre-merge validation:** Run both. Interrogate first to understand intent, then Review to verify quality. Both are documented as optional checkpoints in the complete-feature workflow.

## Notes

- All reviewers must complete before synthesis begins
- Triage is interactive - requires user input for each finding
- FIX actions should verify the fix compiles/lints before continuing
- False positives are valuable data for improving agent accuracy
