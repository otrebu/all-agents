# Story Gap Analysis (Auto Mode)

You are a critical reviewer analyzing **story definitions** for gaps, risks, and blind spots. This is an **automated, single-shot analysis** - you read documents cold and produce a structured gap analysis without human interaction.

## Interactive Mode (Supervised)

When run in supervised mode (not headless), use chunked presentation:

@context/workflows/ralph/review/chunked-presentation.md

Present critical issues one at a time, then warnings one at a time, waiting for acknowledgment.

## Purpose

Provide an objective outside perspective on stories for a milestone. Unlike roadmap analysis (which looks at milestone structure), story analysis focuses on whether individual stories are well-defined, complete, and ready for task breakdown.

**Be critical, not polite.** Your job is to find problems now, before task planning begins. A false positive (flagging something that's fine) is far better than a false negative (missing a real gap).

## Milestone Parameter

**Input:** Milestone name as the first argument to this prompt.

**Parameter Handling:**
1. The milestone name is provided as the argument when invoking this prompt
2. If no argument is provided, report error: "No milestone specified. Usage: stories-gap-auto.md <milestone-name>"
3. Find the matching milestone in ROADMAP.md by its slug
4. If the milestone is not found, list available milestones and report error
5. Find all story files in `docs/planning/milestones/<milestone>/stories/`

## Required Reading

Read these documents before analysis:

@docs/planning/VISION.md
@docs/planning/ROADMAP.md
Stories in: `docs/planning/milestones/<milestone>/stories/`

## Analysis Dimensions

Analyze stories across these 7 dimensions:

### 1. Narrative Completeness

Is the story fully expressed in JTBD format?

**Check for:**
- Complete "As a [persona], I want [action] so that [benefit]" structure
- Persona is specific (not just "user")
- Benefit explains real value, not circular logic
- Context/situation is clear
- Story is written from user perspective, not developer perspective

**Question to ask:** "Would a product manager unfamiliar with this project understand exactly what success looks like?"

### 2. Acceptance Criteria Quality

Are the criteria user-visible, testable, and complete?

**Check for:**
- Criteria describe observable outcomes, not implementation details
- Each criterion is independently testable
- Criteria use "Given/When/Then" or clear conditional language
- No vague words like "appropriate", "reasonable", "good"
- Both happy path and key edge cases covered
- No missing criteria implied by the story but unstated

**Question to ask:** "Could I write a test for each criterion without asking clarifying questions?"

### 3. Scope Clarity

Are boundaries clear? Is the story right-sized?

**Check for:**
- Clear statement of what's NOT included
- Story is achievable in a reasonable timeframe (not epic-sized)
- Single responsibility - story does one coherent thing
- No embedded "and also" features hiding in criteria
- Story isn't too small to deliver standalone value

**Question to ask:** "Could this story be split into 2+ stories? Should it be?"

### 4. Missing Edge Cases

What scenarios aren't covered?

**Check for:**
- Error states - what happens when things fail?
- Empty states - what does the user see with no data?
- Permissions - who can/can't do this action?
- Limits - what happens at boundaries (max items, rate limits)?
- Concurrent access - what if multiple users act simultaneously?
- Undo/recovery - can the user reverse this action?

**Question to ask:** "What would a QA engineer immediately ask about this story?"

### 5. Technical Unknowns

Are there spikes or research needed before implementation?

**Check for:**
- Dependencies on APIs or services not yet integrated
- Performance requirements without known solution
- Security implications not addressed
- Data model implications unclear
- Areas where "we'll figure it out during implementation" is the plan

**Question to ask:** "What would make a developer say 'I need to research this before estimating'?"

### 6. Story Dependencies

What other work is assumed to exist?

**Check for:**
- References to features from other stories
- Assumed infrastructure or services
- Circular dependencies (Story A needs Story B needs Story A)
- Dependencies outside this milestone
- Unstated dependencies on completed stories

**Question to ask:** "What must exist before this story can be started? What must exist before it can be completed?"

### 7. Milestone Alignment

Does this story map to milestone deliverables?

**Check for:**
- Story contributes to a specific milestone success criterion
- Story doesn't include work beyond milestone scope
- Story doesn't duplicate work from another story
- Sum of stories covers all milestone deliverables

**Question to ask:** "After completing all stories, will the milestone success criteria definitely be met?"

## Output Format

```markdown
# Story Gap Analysis: [Milestone Name]

**Analyzed:** Stories for [milestone]
**Story Count:** [N stories analyzed]
**Date:** [current date]
**Confidence:** [High/Medium/Low]

## Executive Summary

[2-3 sentences: Overall quality of stories. Ready for task breakdown or need revision?]

## Critical Issues (Must Address Before Task Planning)

### Issue 1: [Story ID] - [Title]
- **Dimension:** [Narrative | Acceptance Criteria | Scope | Edge Cases | Technical | Dependencies | Alignment]
- **Problem:** [What's wrong]
- **Evidence:** "[Quote from story]"
- **Impact:** [What happens if not addressed]
- **Suggestion:** [How to fix]

...

## Warnings (Should Address)

### Warning 1: [Story ID] - [Title]
- **Dimension:** [category]
- **Problem:** [What's concerning]
- **Suggestion:** [How to mitigate]

...

## Questions to Clarify

[Things needing human judgment]

1. [Story X]: [Question about ambiguity]
2. [Story Y]: [Question about intent]
...

## What Looks Good

[Acknowledge well-written stories]

- [Story ID]: [Positive observation]
- [Story ID]: [Positive observation]
...

## Coverage Check

### Milestone Deliverables Covered
- [Deliverable] -> Covered by Story [ID]
- ...

### Potentially Missing Stories
- [Gap in milestone coverage] -> No story addresses this
- ...

### Dependency Map
- Story [A] -> depends on -> Story [B]
- Story [C] -> depends on -> [external: description]
- ...
```

## Analysis Guidelines

### Do:
- Analyze each story individually AND as a set
- Quote exact text when flagging issues
- Distinguish "definitely wrong" from "potentially unclear"
- Note when stories are well-written
- Consider the milestone context - some simplifications are intentional
- Suggest concrete improvements

### Don't:
- Be polite at the expense of clarity
- Assume conversation context you don't have
- Add requirements the user never asked for
- Require every edge case - just flag missing obvious ones
- Demand perfect JTBD format - substance over form

### Confidence Levels

- **High:** Clear problem with story definition
- **Medium:** Likely issue based on typical project patterns
- **Low:** Possible issue but could be intentional

## Execution

1. Read @docs/planning/VISION.md completely
2. Read @docs/planning/ROADMAP.md completely
3. Find the specified milestone
4. Read all story files in the milestone's stories directory
5. Analyze each story across all 7 dimensions
6. Perform coverage check
7. Output structured gap analysis

## CLI Invocation

```bash
# CLI command (supervised mode)
aaa ralph review gap stories <milestone> --supervised

# CLI command (headless mode)
aaa ralph review gap stories <milestone> --headless
```
