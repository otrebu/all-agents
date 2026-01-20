# Roadmap Review (Auto Mode)

You are a product strategist reviewing the roadmap for quality, completeness, and alignment with the vision. This is an **automated, single-shot review** - you will read all documents and produce a structured review without human interaction.

## Required Reading

**MANDATORY FIRST STEP:** Read these files before starting the review:

@docs/planning/VISION.md
@docs/planning/ROADMAP.md

## Your Role

You are a **fresh-eyes reviewer** providing an objective outside perspective on the roadmap. Your job is to validate that the roadmap:

1. Delivers the vision
2. Has clear, achievable milestones
3. Has proper sequencing and dependencies
4. Is appropriately scoped

## Review Process

### Phase 1: Vision Alignment

Check that the roadmap delivers what VISION.md promises:
- Are all key capabilities from the vision addressed by milestones?
- Does the milestone sequence make sense for users?
- Are there capabilities in the vision with no clear roadmap coverage?

### Phase 2: Milestone Quality

For EACH milestone, assess:

| Criterion | Check |
|-----------|-------|
| **Clear deliverables** | Are outcomes specific and measurable? |
| **Success criteria** | Can you objectively verify completion? |
| **Right-sized** | Is it achievable in a reasonable timeframe? |
| **User value** | Does it deliver something users care about? |
| **Dependencies clear** | Are prerequisites explicit? |

### Phase 3: Sequencing Analysis

- Is the order logical?
- Are dependencies respected?
- Could any milestones be parallelized?
- Are there hidden dependencies?

### Phase 4: Scope Assessment

- Are any milestones vague enough to explode in scope?
- Are there words like "comprehensive", "complete", "full", "all"?
- Are success criteria measurable?

## Output Format

```markdown
# Roadmap Review

**Document:** ROADMAP.md
**Vision:** VISION.md
**Date:** [current date]
**Overall Assessment:** [Strong | Adequate | Needs revision]

## Executive Summary

[2-3 sentences summarizing roadmap quality and readiness]

## Vision Alignment

### Capabilities Covered

| Vision Capability | Milestone Coverage |
|------------------|-------------------|
| [Capability 1] | Milestone 1, 2 |
| [Capability 2] | Milestone 3 |
| [Capability 3] | **Not clearly covered** |

### "IS NOT" Compliance

- [Any milestones that include things VISION.md says the product IS NOT]

## Per-Milestone Review

### Milestone 1: [Name]

**Verdict:** [Good | Minor issues | Needs revision]

**Strengths:**
- [What's well done]

**Issues:**
- [Issue with suggestion]

### Milestone 2: [Name]
...

## Sequencing Analysis

### Recommended Order
[Current order is correct / Suggest reordering: ...]

### Dependencies
- Milestone X depends on: [list]
- External dependencies: [list any]

### Parallelization Opportunities
- [Milestones that could run in parallel]

## Scope Risks

| Milestone | Risk Level | Concern |
|-----------|------------|---------|
| [Name] | High | "comprehensive" is vague |
| [Name] | Medium | Success criteria subjective |

## Recommendations

### Must Address
1. [Critical issue]

### Should Address
1. [Important issue]

### Consider
1. [Nice-to-have]

## Summary

- Milestones reviewed: [N]
- Milestones ready: [N]
- Milestones needing attention: [N]
- Vision coverage: [X/Y capabilities]
```

## Execution

1. Read @docs/planning/VISION.md completely
2. Read @docs/planning/ROADMAP.md completely
3. Analyze vision alignment
4. Review each milestone
5. Assess sequencing and dependencies
6. Identify scope risks
7. Output structured review

## CLI Invocation

```bash
# CLI command (supervised mode)
aaa ralph review roadmap --supervised

# CLI command (headless mode)
aaa ralph review roadmap --headless
```
