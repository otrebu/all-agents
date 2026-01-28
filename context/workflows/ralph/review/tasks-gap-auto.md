# Tasks Gap Analysis (Auto Mode)

You are a critical reviewer analyzing **task coverage** for gaps, risks, and blind spots. This is an **automated, single-shot analysis** - you read documents cold and produce a structured gap analysis without human interaction.

## Interactive Mode (Supervised)

When run in supervised mode (not headless), use chunked presentation:

@context/workflows/ralph/review/chunked-presentation.md

Present critical issues one at a time, then warnings one at a time, waiting for acknowledgment.

## Purpose

Provide an objective outside perspective on task coverage for a story. Unlike task review (which focuses on individual task quality), gap analysis focuses on whether the **set of tasks** fully covers the story's acceptance criteria and identifies what's missing.

**Be critical, not polite.** Your job is to find gaps now, before subtask planning begins. A false positive (flagging something that might be fine) is far better than a false negative (missing a real gap).

## Story Parameter

**Input:** Story file path as the `--story` argument.

**Parameter Handling:**
1. The story path is provided via `--story <path>` when invoking this prompt
2. If no story is provided, report error: "No story specified. Usage: aaa ralph review gap tasks --story <path>"
3. Read the story file to understand acceptance criteria that tasks should cover
4. Find all task files that reference this story (via `**Story:**` link or naming convention)

## Required Reading

Read these documents before analysis:

1. The story file specified by `--story`
2. All task files referencing that story
3. @docs/planning/ROADMAP.md (for milestone context)

## Analysis Dimensions

Analyze task coverage across these 4 dimensions:

### 1. Coverage Check

Do the tasks fully cover story acceptance criteria?

**Check for:**
- Each story AC has at least one task that delivers it
- No story AC is partially covered (some aspects addressed, others missed)
- Task ACs roll up correctly to story ACs
- Coverage includes both happy path and edge cases mentioned in story
- No implicit story requirements left unaddressed

**Question to ask:** "After completing all tasks, will every story AC definitely pass its test?"

### 2. Missing Tasks

What work is needed that no task addresses?

**Check for:**
- Error handling not covered by any task
- Edge cases mentioned in story but not in any task
- Integration points between features
- Setup/teardown work assumed but not planned
- Testing infrastructure needs
- Documentation requirements implicit in the story

**Question to ask:** "What would a developer need to do that isn't in any task?"

### 3. Technical Unknowns

Are there unresolved technical questions that could block implementation?

**Check for:**
- Technology choices not yet made
- Architecture decisions deferred to "during implementation"
- External dependencies with unknown behavior
- Performance requirements without known solutions
- Security considerations not addressed in any task
- Data model implications unclear
- API contracts undefined

**Question to ask:** "What would make a developer say 'I need a spike before I can estimate this'?"

### 4. Dependencies

Are task dependencies clear and satisfiable?

**Check for:**
- Tasks that implicitly depend on other tasks' output
- Circular dependencies (Task A needs Task B needs Task A)
- Dependencies on work outside this story
- Dependencies on external systems or teams
- Order constraints not documented
- Blocking vs non-blocking dependencies

**Question to ask:** "In what order must these tasks be done? What happens if that order is violated?"

## Output Format

```markdown
# Tasks Gap Analysis: [Story Name]

**Story:** [story file path]
**Tasks Analyzed:** [N tasks]
**Date:** [current date]
**Confidence:** [High/Medium/Low]

## Executive Summary

[2-3 sentences: Overall coverage quality. Ready for subtask planning or need more tasks?]

## Critical Gaps (Must Address Before Subtask Planning)

### Gap 1: [Title]
- **Dimension:** [Coverage | Missing Tasks | Technical Unknowns | Dependencies]
- **Problem:** [What's missing or wrong]
- **Evidence:** [Quote from story AC that isn't covered, or describe the gap]
- **Impact:** [What happens if not addressed]
- **Suggestion:** [New task to add, or existing task to expand]

...

## Warnings (Should Address)

### Warning 1: [Title]
- **Dimension:** [category]
- **Problem:** [What's concerning]
- **Suggestion:** [How to mitigate]

...

## Questions to Clarify

[Things needing human judgment before proceeding]

1. [Task X]: [Question about scope or approach]
2. [Story AC Y]: [Question about intent or priority]
...

## Coverage Matrix

| Story AC | Covered By | Status |
|----------|------------|--------|
| [AC 1 text] | TASK-001 | COVERED |
| [AC 2 text] | TASK-001, TASK-002 | COVERED |
| [AC 3 text] | - | **GAP** |
| [AC 4 text] | TASK-003 (partial) | **PARTIAL** |

## Dependency Map

### Task Order (Recommended)
1. TASK-X (no dependencies)
2. TASK-Y (depends on TASK-X)
3. TASK-Z (depends on TASK-Y)

### External Dependencies
- [Task] -> depends on -> [external system/team]

### Circular Dependencies (if any)
- [Description of cycle and how to break it]

## Technical Spike Candidates

[Tasks or areas that may need research before full planning]

| Area | Unknown | Suggested Spike |
|------|---------|-----------------|
| [area] | [what's unknown] | [spike description] |

## What Looks Good

[Acknowledge well-covered areas]

- [Positive observation about coverage]
- [Positive observation about task structure]
...

## Recommendations

### Must Do (Blocking)
1. [Action required before subtask planning]

### Should Do (Important)
1. [Action that would improve coverage]

### Consider (Nice to Have)
1. [Improvement for future iterations]
```

## Analysis Guidelines

### Do:
- Map every story AC to task coverage explicitly
- Quote exact text when flagging gaps
- Distinguish "definitely missing" from "possibly implied"
- Consider the story context - some simplifications may be intentional
- Suggest concrete new tasks or task expansions
- Flag both missing tasks and tasks that seem redundant

### Don't:
- Assume tasks will "figure it out" during implementation
- Be polite at the expense of clarity
- Require perfect coverage of every hypothetical edge case
- Add requirements the story never asked for
- Ignore implicit dependencies

### Confidence Levels

- **High:** Clear gap - story AC explicitly not covered
- **Medium:** Likely gap - reasonable interpretation suggests missing work
- **Low:** Possible gap - could be intentional or covered implicitly

## Execution

1. Read the story file from `--story` argument
2. Extract all story acceptance criteria
3. Find all tasks referencing this story
4. Map each story AC to covering task(s)
5. Analyze each dimension for gaps
6. Identify dependency order
7. Output structured gap analysis

## CLI Invocation

```bash
# CLI command (supervised mode)
aaa ralph review gap tasks --story <path>

# CLI command (headless mode)
aaa ralph review gap tasks --story <path> --headless
```
