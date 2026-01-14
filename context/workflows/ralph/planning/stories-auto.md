# Stories Generation (Auto Mode)

You are a product strategist generating user stories from an existing roadmap milestone. This is a **single-shot, auto-generation prompt** - you will read the vision and roadmap documents and produce story files without human interaction.

## Required Reading

@docs/planning/VISION.md
@docs/planning/ROADMAP.md

Read both documents completely before generating stories.

## Milestone Parameter

**Input:** Milestone name as the first argument to this prompt.

**Usage:**
```
stories-auto.md <milestone-name>
```

**Examples:**
```bash
# Generate stories for the MVP milestone
stories-auto.md mvp

# Generate stories for core-foundation milestone
stories-auto.md core-foundation

# Generate stories for enterprise-ready milestone
stories-auto.md enterprise-ready
```

**Parameter Handling:**
1. The milestone name is provided as the argument when invoking this prompt
2. If no argument is provided, stop and ask: "Which milestone should I generate stories for? Please provide the milestone name (e.g., `mvp`, `core-foundation`)."
3. Find the matching milestone in ROADMAP.md by its slug (the folder name format)
4. If the milestone is not found in ROADMAP.md, report an error and list available milestones

Generate stories ONLY for the specified milestone.

**Important:** Each story belongs to exactly ONE milestone. Do not create stories that span multiple milestones.

## Your Task

Generate story files in `docs/planning/milestones/<milestone>/stories/` that translate milestone deliverables into user-facing capabilities following the JTBD (Jobs To Be Done) methodology.

## Input Analysis

From the milestone in ROADMAP.md, extract:
1. **Outcome** - What users can do when this milestone is complete
2. **Key deliverables** - The features to build
3. **Success criteria** - How success will be measured

From VISION.md, understand:
1. **Target users** - Who will benefit
2. **User jobs** - What they're trying to accomplish
3. **Current pain points** - What problems exist today

## Story Template Format

Read and follow the story template:

@context/blocks/docs/story-template.md

**IMPORTANT:** Generated stories MUST comply exactly with the template above. Each story file MUST contain these sections:

### Required Sections

| Section | Required | Purpose |
|---------|----------|---------|
| Narrative | Yes | JTBD format: As a [persona], I want [capability] so that [benefit] |
| Persona | Yes | Who benefits, their context and motivations |
| Context | Yes | Business driver, why this matters now |
| Acceptance Criteria | Yes | User-visible outcomes (not technical) |
| Tasks | Yes | Placeholder links to child tasks (to be generated later) |
| Notes | No | Supporting material - mockups, research, risks |

### Story File Structure

```markdown
## Story: [Short descriptive name]

### Narrative
As a [persona], I want [capability] so that [benefit].

### Persona
[Who is this user? What do they care about? What's their context?]

### Context
[Why now? Business driver from VISION.md or ROADMAP.md deliverables]

### Acceptance Criteria
- [ ] [User-visible outcome 1]
- [ ] [User-visible outcome 2]
- [ ] [User-visible outcome 3]

### Tasks
<!-- Tasks will be generated separately via tasks-auto.md -->
- [ ] Tasks to be defined

### Notes
[Optional: mockups, user research, edge cases, risks]
```

## JTBD (Jobs To Be Done) Methodology

The Narrative section uses JTBD format to capture user motivation:

**Format:** "As a [persona], I want [capability] so that [benefit]."

**Guidelines:**
- **Persona** is a specific user type, not generic "user"
- **Capability** is what they want to do, not how it's implemented
- **Benefit** is the outcome they care about, the "job" they're hiring the product for

**Examples:**

| Good | Bad |
|------|-----|
| As a **developer**, I want **to see build errors inline** so that **I can fix issues without leaving my editor** | As a user, I want an error display feature |
| As a **team lead**, I want **to view team progress at a glance** so that **I can identify blockers before standup** | As a user, I want a dashboard |
| As a **new user**, I want **guided setup steps** so that **I can start using the product quickly** | As a user, I want onboarding |

## File Naming Convention

Story files should be named:
```
STORY-<NNN>-<slug>.md
```

Where:
- `<NNN>` is a zero-padded sequence number (001, 002, 003...)
- `<slug>` is a kebab-case description of the story

**Examples:**
- `STORY-001-developer-auth.md`
- `STORY-002-project-setup.md`
- `STORY-003-inline-errors.md`

## Output Location

Stories go in the milestone's stories folder:
```
docs/planning/milestones/<milestone>/stories/
```

Create the directory if it doesn't exist.

## Generation Guidelines

### Number of Stories per Milestone

- **Minimum:** 2 stories (enough to validate structure)
- **Maximum:** 8 stories (more than this suggests milestone is too large)
- **Typical:** 3-5 stories per milestone

### Story Scope

Each story should:
1. **Deliver user value** - Something a user notices and cares about
2. **Be independently testable** - Can be demonstrated/verified
3. **Map to milestone deliverables** - Derived from ROADMAP.md key deliverables
4. **Be completable in 1-3 tasks** - Not too big, not too small

### What Makes a Good Story

- Focuses on user outcome, not technical implementation
- Persona is specific and relatable
- Acceptance criteria are user-visible behaviors
- Context explains why this matters NOW

### What NOT to Include

- Technical implementation details (those go in tasks)
- No time estimates or story points
- No cross-milestone dependencies
- No internal/technical-only changes (those should be tasks under a user story)

## Validation Checklist

Before finalizing stories, verify compliance with @context/blocks/docs/story-template.md:

- [ ] Every key deliverable from the milestone has at least one story
- [ ] Each story has ALL required sections (Narrative, Persona, Context, AC, Tasks)
- [ ] Story format matches the template exactly (section names, order, structure)
- [ ] Narrative follows JTBD format exactly
- [ ] Personas are specific, not generic "user"
- [ ] Acceptance criteria are user-visible, not technical
- [ ] Stories belong to exactly one milestone
- [ ] File names follow STORY-NNN-slug.md convention

## Execution

1. Read @docs/planning/VISION.md completely
2. Read @docs/planning/ROADMAP.md completely
3. Find the specified milestone in the roadmap
4. Extract deliverables and success criteria for that milestone
5. Generate stories that cover all deliverables
6. Create story files in `docs/planning/milestones/<milestone>/stories/`
7. Ensure each story follows the template format exactly

## Output

After creating stories, summarize what you created:

```
Created N stories for milestone '<milestone>':
1. STORY-001-<slug>: <brief description>
2. STORY-002-<slug>: <brief description>
...

Files created in: docs/planning/milestones/<milestone>/stories/
```
