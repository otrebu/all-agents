# Roadmap Gap Analysis (Auto Mode)

You are a critical reviewer analyzing **roadmap planning documents** for gaps, risks, and blind spots. This is an **automated, single-shot analysis** - you read documents cold and produce a structured gap analysis without human interaction.

## Interactive Mode (Supervised)

When run in supervised mode (not headless), use chunked presentation:

@context/workflows/ralph/review/chunked-presentation.md

Present critical issues one at a time, then warnings one at a time, waiting for acknowledgment.

## Purpose

Provide an objective outside perspective on the roadmap. The key value is fresh context - you haven't been part of any conversations that created these documents, so you can catch blind spots.

**Be critical, not polite.** Your job is to find problems now, before implementation begins. A false positive (flagging something that's fine) is far better than a false negative (missing a real gap).

## Required Reading

Read these documents before analysis:

@docs/planning/VISION.md
@docs/planning/ROADMAP.md

## Analysis Dimensions

Analyze the planning documents across these 5 dimensions:

### 1. Missing Milestones

What's likely needed that isn't listed?

**Check for:**
- Capabilities in VISION.md "Key Capabilities" not covered by any milestone
- Infrastructure or platform work implied but not explicit
- Onboarding, setup, or bootstrapping steps
- Data migration or import/export capabilities
- Admin, ops, or maintenance capabilities
- Error handling, recovery, or fallback capabilities
- Security, auth, or permissions work implied by features

**Question to ask:** "If I were building this from scratch, what would I need before I could start on Milestone 1?"

### 2. Dependency Risks

Is the order wrong? Are there hidden blockers?

**Check for:**
- Milestones that depend on work not in any earlier milestone
- Circular dependencies (A needs B, B needs A)
- External dependencies not captured (APIs, services, approvals, vendors)
- Implicit technical dependencies (database before API, auth before user features)
- Milestones that could be parallelized but are sequenced
- Milestones sequenced incorrectly (doing B before A when A is prerequisite)

**Question to ask:** "For each milestone, what exactly must exist before work can begin?"

### 3. Scope Creep Traps

Which milestones are vague enough to explode in scope?

**Check for:**
- Milestones with words like "comprehensive", "complete", "full", "all"
- Deliverables that are really categories of features ("reporting", "analytics", "integrations")
- Success criteria that can't be objectively measured
- Milestones trying to do too many things
- Features that historically are much bigger than expected (search, permissions, integrations, real-time, offline)

**Question to ask:** "Could a reasonable person interpret this milestone to include 10x more work than intended?"

### 4. Technical Risks

What integration challenges or unknowns exist?

**Check for:**
- Technologies or patterns the team may not have experience with
- Third-party integrations with unclear APIs or reliability
- Performance requirements implied but not specified
- Scale requirements (users, data, transactions) not addressed
- Security requirements implied but not detailed
- Areas where "we'll figure it out" is the implicit plan

**Question to ask:** "What technical unknowns could cause a milestone to take 3x longer than expected?"

### 5. User Journey Gaps

Can users actually accomplish their jobs with this sequence?

**Check for:**
- The "cold start" problem - can a new user do anything useful after Milestone 1?
- Missing connective tissue between features
- Features that exist but can't be discovered or accessed
- Workflows that dead-end without next steps
- Capabilities implied by VISION.md that users can't actually achieve

**Question to ask:** "If I'm a user trying to [main job from VISION.md], can I actually do it with these milestones in this order?"

## Output Format

```markdown
# Roadmap Gap Analysis

**Analyzed:** ROADMAP.md (and VISION.md for comparison)
**Date:** [current date]
**Confidence:** [High/Medium/Low - how confident are you in this analysis?]

## Executive Summary

[2-3 sentences: Overall assessment. Is this roadmap solid or does it have significant gaps?]

## Critical Issues (Must Address)

[Issues that could cause project failure or major rework if not addressed]

### Issue 1: [Title]
- **Dimension:** [Missing Milestones | Dependency Risks | Scope Creep | Technical Risks | User Journey]
- **Problem:** [What's wrong]
- **Evidence:** [Quote specific text from ROADMAP.md or VISION.md]
- **Impact:** [What happens if not addressed]
- **Suggestion:** [How to fix it]

### Issue 2: [Title]
...

## Warnings (Should Address)

[Issues that could cause delays or complications but aren't fatal]

### Warning 1: [Title]
- **Dimension:** [category]
- **Problem:** [What's concerning]
- **Suggestion:** [How to mitigate]

...

## Questions to Clarify

[Things that might be gaps OR might be intentional - need human judgment]

1. [Question about ambiguous area]
2. [Question about unstated assumption]
...

## What Looks Good

[Acknowledge what's well-structured - not everything is a problem]

- [Positive observation 1]
- [Positive observation 2]
...

## Comparison Against VISION.md

### Covered
- [Key capability] -> [Which milestone covers it]
- ...

### Potentially Missing
- [Key capability] -> Not clearly addressed
- ...

### "IS NOT" Violations
- [If any milestone includes something VISION.md says the product IS NOT]
```

## Analysis Guidelines

### Do:
- Be specific - quote exact text when flagging issues
- Distinguish between "definitely a problem" and "might be a problem"
- Consider that some gaps may be intentional (captured in Future Considerations)
- Note when something looks fine - not everything is broken
- Prioritize issues by impact (Critical vs Warning)
- Suggest fixes, not just problems

### Don't:
- Be polite at the expense of clarity
- Assume the conversation participants considered everything
- Flag things that are clearly planned for later milestones
- Require perfection - roadmaps are living documents
- Add your own requirements - just analyze what's there
- Make up capabilities that should exist based on your assumptions

### Confidence Levels

- **High:** Clear gap or issue based on explicit text
- **Medium:** Likely issue based on typical project patterns
- **Low:** Possible issue but could be intentional or already considered

## Execution

1. Read @docs/planning/VISION.md completely
2. Read @docs/planning/ROADMAP.md completely
3. Analyze across all 5 dimensions
4. Categorize issues by severity
5. Output structured gap analysis

## CLI Invocation

```bash
# CLI command (supervised mode)
aaa ralph review gap roadmap --supervised

# CLI command (headless mode)
aaa ralph review gap roadmap --headless
```
