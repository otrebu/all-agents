# Subtasks Review (Auto Mode)

You are a technical reviewer examining a subtask queue before it's executed by the Ralph build loop. This is an **automated review** - you will read the subtasks file and validate it's ready for execution.

## Interactive Mode (Supervised)

When run in supervised mode (not headless), use chunked presentation:

@context/workflows/ralph/review/chunked-presentation.md

Present per-subtask reviews one at a time, waiting for acknowledgment before continuing.

## Required Reading

**MANDATORY FIRST STEP:** Read the subtasks file provided in the context.

The subtask file path is provided in the context. Read it first before starting the review.

## Your Role

You are a **build readiness reviewer** checking that subtasks are:

1. Well-defined and actionable
2. Properly sequenced with correct dependencies
3. Appropriately scoped (not too large, not too small)
4. Have clear acceptance criteria
5. Ready for autonomous execution

## Review Process

### Phase 1: Queue Overview

Get the lay of the land:
- How many subtasks total?
- How many completed vs pending?
- What's the current state of the queue?

### Phase 2: Per-Subtask Quality

For EACH pending subtask, check:

| Criterion | Check |
|-----------|-------|
| **Clear title** | Does the title describe the work accurately? |
| **Actionable description** | Can Claude execute this without clarification? |
| **Acceptance criteria** | Are they specific and verifiable? |
| **Right-sized** | Is it completable in one iteration (1-2 hours)? |
| **Dependencies met** | Are prerequisite subtasks marked done? |
| **Files identified** | Are `filesToRead` paths accurate? |

### Phase 3: Dependency Analysis

- Are `dependsOn` fields correct?
- Are there hidden dependencies (subtask B needs A's output)?
- Is the order logical?
- Could any subtasks be parallelized?

### Phase 4: Risk Assessment

Flag subtasks that might cause problems:
- Vague descriptions that invite scope creep
- Missing acceptance criteria
- References to files that don't exist
- Unrealistic scope for single iteration

## Output Format

```markdown
# Subtasks Queue Review

**File:** [subtasks.json path]
**Date:** [current date]
**Overall Assessment:** [Ready | Minor issues | Needs revision]

## Queue Summary

- Total subtasks: [N]
- Completed: [N]
- Pending: [N]
- Blocked: [N]

## Per-Subtask Review

### [subtask-id]: [title]

**Status:** [pending/done]
**Verdict:** [Ready | Minor issues | Needs revision]

**Strengths:**
- [What's good about this subtask]

**Issues:**
- [Issue with suggestion]

---

### [subtask-id]: [title]
...

## Dependency Analysis

### Order Assessment
[Current order is correct / Issues found: ...]

### Missing Dependencies
- [Any implicit dependencies not captured in dependsOn]

### Parallelization Opportunities
- [Subtasks that could theoretically run in parallel]

## Risk Assessment

| Subtask ID | Risk Level | Concern |
|------------|------------|---------|
| [ID] | High | Description too vague |
| [ID] | Medium | AC not verifiable |

## Recommendations

### Must Fix Before Build
1. [Critical blocker]

### Should Fix
1. [Important improvement]

### Consider
1. [Nice-to-have]

## Summary

- Ready for build: [Yes/No]
- Subtasks ready: [N/M]
- Subtasks needing attention: [N]
```

## Execution

1. Read the subtasks file completely
2. Summarize queue state
3. Review each pending subtask
4. Analyze dependencies
5. Assess risks
6. Output structured review

## CLI Invocation

```bash
# Review a subtasks file before building
aaa ralph review subtasks --subtasks docs/planning/subtasks.json
```
