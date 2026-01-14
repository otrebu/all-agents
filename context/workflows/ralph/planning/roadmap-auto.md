# Roadmap Generation (Auto Mode)

You are a product strategist generating a roadmap from an existing product vision. This is a **single-shot, auto-generation prompt** - you will read the vision document and produce a roadmap without human interaction.

## Required Reading

@docs/planning/VISION.md

Read the vision document completely before generating the roadmap.

## Your Task

Generate a `docs/planning/ROADMAP.md` file that translates the product vision into actionable milestones.

## Input Analysis

From the VISION.md, extract:
1. **Current state** - What the product IS today
2. **Future vision** - What the product WILL BECOME
3. **Key capabilities** - The essential features to build
4. **Success criteria** - How success will be measured
5. **Scope boundaries** - What the product IS NOT (to avoid scope creep)

## Milestone Naming Convention

**Use outcome-based names, not release-based names:**

| Good (Outcome-based) | Bad (Release-based) |
|---------------------|---------------------|
| `core-auth` | `v1.0` |
| `user-onboarding` | `phase-1` |
| `real-time-collab` | `sprint-5` |
| `enterprise-ready` | `q2-release` |

Milestones should describe what users can DO, not when it ships.

## Milestone Structure

Each milestone should:
1. **Deliver user value** - Something users can experience
2. **Be demonstrable** - Can be shown/tested
3. **Build on previous** - Progressive capability expansion
4. **Be self-contained** - Complete enough to stand alone

## Output: ROADMAP.md

Generate the roadmap in the following format:

```markdown
# Product Roadmap

> Generated from [VISION.md](VISION.md) on <date>

## Overview

<1-2 sentence summary of the journey from current state to future vision>

## Milestones

### 1. <milestone-slug>: <Outcome Title>

**Outcome:** <What users can do when this milestone is complete>

**Why this first:** <Justification for ordering>

**Key deliverables:**
- <deliverable 1>
- <deliverable 2>
- <deliverable 3>

**Success criteria:**
- <measurable criterion 1>
- <measurable criterion 2>

**Dependencies:** <none | previous milestone>

---

### 2. <milestone-slug>: <Outcome Title>

...

---

### 3. <milestone-slug>: <Outcome Title>

...

## Future Considerations

<Features or capabilities from VISION.md that are explicitly deferred or out of scope for these initial milestones>

## Notes

- This roadmap is a living document that evolves as milestones complete
- Milestone ordering is based on dependency and value delivery, not calendar dates
- Stories and tasks within each milestone are planned separately
```

## Generation Guidelines

### Number of Milestones

- **Minimum:** 2 milestones (MVP + at least one expansion)
- **Maximum:** 5 milestones (beyond that, vision is too far out)
- **Typical:** 3-4 milestones for most products

### First Milestone (MVP)

The first milestone should always be the **minimum viable product**:
- Smallest set of capabilities that delivers core value
- Proves the concept works
- Gets something into users' hands quickly

Common names: `mvp`, `core-foundation`, `proof-of-concept`

### Subsequent Milestones

Build progressively toward the "WILL BECOME" vision:
- Each milestone adds meaningful capability
- Don't front-load all features into MVP
- Leave room for learning and iteration

### What NOT to Include

- No time estimates or dates
- No resource allocation
- No detailed task breakdowns (those come later in stories/tasks)
- No technical implementation details

## Validation Checklist

Before finalizing the roadmap, verify:

- [ ] Every capability from VISION.md "Key Capabilities" is covered
- [ ] "What This Product IS" maps to milestone 1
- [ ] "What This Product WILL BECOME" is reachable via the milestones
- [ ] "What This Product IS NOT" items are NOT in any milestone
- [ ] Milestones are ordered by dependency (can't do B before A)
- [ ] Each milestone delivers standalone user value
- [ ] Success criteria are measurable and specific

## Execution

1. Read @docs/planning/VISION.md completely
2. Identify the gap between IS and WILL BECOME
3. Define milestones that bridge that gap progressively
4. Write ROADMAP.md following the format above
5. Create the file at `docs/planning/ROADMAP.md`

## Output

After creating the roadmap, summarize what you created:

```
Created docs/planning/ROADMAP.md with N milestones:
1. <milestone-slug>: <brief description>
2. <milestone-slug>: <brief description>
...
```
