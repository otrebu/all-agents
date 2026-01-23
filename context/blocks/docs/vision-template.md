---
depends: []
---

# Vision Template

The Vision document defines what the application IS and WILL BECOME. It anchors all downstream planning (Roadmap, Milestones, Stories, Tasks) and evolves as milestones complete.

---

```markdown
# Vision: [Product/Project Name]

## Purpose
[One paragraph: What is this product and why does it exist? What problem does it solve?]

## North Star
[One sentence: The ultimate success metric or guiding principle. What does "winning" look like?]

## Core Principles
- **[Principle Name]**: [Brief explanation]
- **[Principle Name]**: [Brief explanation]
- **[Principle Name]**: [Brief explanation]

## Target Users
| Persona | Description | Primary Need |
|---------|-------------|--------------|
| [Name] | [Who they are, their context] | [What they need from this product] |
| [Name] | [Who they are, their context] | [What they need from this product] |

## Current State
[What exists today. Capabilities, limitations, known issues. Be honest about where you are.]

## Future State
[What the product becomes when the vision is realized. Paint the picture of success.]

## Key Capabilities
What the product must do to achieve the vision:

- [ ] [Capability 1 - brief description]
- [ ] [Capability 2 - brief description]
- [ ] [Capability 3 - brief description]

*Checkboxes track which capabilities have been delivered via completed milestones.*

## Non-Goals
What this product explicitly will NOT do:

- [Non-goal 1]
- [Non-goal 2]

## Success Metrics
How we know the vision is being achieved:

| Metric | Current | Target | Notes |
|--------|---------|--------|-------|
| [Metric name] | [Value or "N/A"] | [Target value] | [How measured] |

## Evolution Log
Track how the vision evolves as milestones complete:

| Date | Milestone | Change | Rationale |
|------|-----------|--------|-----------|
| [YYYY-MM-DD] | [Milestone name] | [What changed in vision] | [Why it changed] |
```

---

## Section Guide

| Section | Required | Purpose |
|---------|----------|---------|
| Purpose | Yes | The "elevator pitch" - what and why |
| North Star | Yes | Single guiding metric or principle |
| Core Principles | Yes | Decision-making guardrails |
| Target Users | Yes | Who benefits, what they need |
| Current State | Yes | Honest assessment of today |
| Future State | Yes | The destination - success picture |
| Key Capabilities | Yes | What must be built (links to milestones) |
| Non-Goals | Yes | Explicit boundaries - what we won't do |
| Success Metrics | No | Quantifiable progress indicators |
| Evolution Log | No | Audit trail of vision changes |

---

## Linking

**Vision to Roadmap:** The Roadmap document references this Vision and breaks it into Milestones:
```markdown
**Vision:** [VISION.md](VISION.md)
```

**Vision to Milestones:** Key Capabilities should map to Milestones. When a Milestone completes, check off the corresponding capability.

---

## When to Update

The Vision is a living document. Update it when:

1. **Milestone Completes** - Check off delivered capabilities, update Current State
2. **Strategic Shift** - New business context changes the North Star or Principles
3. **User Learning** - Research reveals new personas or needs
4. **Scope Change** - Non-Goals become goals (or vice versa)

**Always log changes in the Evolution Log with rationale.**

---

## Principles

1. **Aspirational but achievable** - Vision should stretch but not fantasy
2. **Stable anchor** - Changes should be infrequent and deliberate
3. **Guides decisions** - If it doesn't help you decide, it's not useful
4. **Human and AI readable** - Clear enough for autonomous agents to align on
5. **Honest current state** - Don't hide problems; they inform the roadmap
6. **Non-goals matter** - What you won't do is as important as what you will

---

## Example Evolution

After completing "MVP" milestone:

```markdown
## Evolution Log

| Date | Milestone | Change | Rationale |
|------|-----------|--------|-----------|
| 2026-01-15 | MVP | Updated Current State to reflect auth, basic UI shipped. Checked off "User authentication" capability. | MVP delivered core user flows. |
| 2026-02-01 | Beta | Added "Enterprise SSO" to Key Capabilities based on user feedback. Added "Enterprise Admin" persona. | Beta users requested team management features. |
```
