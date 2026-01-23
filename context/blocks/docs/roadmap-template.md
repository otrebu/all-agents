---
depends: []
---

# Roadmap Template

A living document that references milestones and tracks progress toward the Vision. The Roadmap is trimmed as milestones complete - completed milestones are archived, keeping the active view focused.

---

```markdown
# Roadmap

**Vision:** [link to VISION.md](./VISION.md)
**Last updated:** [YYYY-MM-DD]

## Current Focus

[One sentence: What's the immediate priority? Which milestone are we driving toward?]

---

## Active Milestones

### [Milestone Name] (e.g., MVP, Beta, v1.0)

**Outcome:** [What's true when this milestone is complete?]
**Status:** [not-started | in-progress | blocked | complete]
**Target:** [Optional: target date or release window]

**Stories:**
- [ ] [STORY-001-auth](./milestones/mvp/stories/STORY-001-auth.md)
- [ ] [STORY-002-profile](./milestones/mvp/stories/STORY-002-profile.md)

**Orphan Tasks:** *(tech-only, no user story)*
- [ ] [TASK-001-logging](./milestones/mvp/tasks/TASK-001-logging.md)

**Progress:** [X/Y stories complete, Z tasks remaining]

---

### [Next Milestone Name]

**Outcome:** [What's true when this milestone is complete?]
**Status:** [not-started | in-progress | blocked | complete]
**Target:** [Optional]

**Stories:**
- [ ] [STORY-003-notifications](./milestones/beta/stories/STORY-003-notifications.md)

**Progress:** [X/Y stories complete]

---

## Upcoming Milestones

*Briefly listed, detailed when they become active.*

- **[Future Milestone 1]** - [One-line outcome]
- **[Future Milestone 2]** - [One-line outcome]

---

## Completed Milestones

*Archive reference. Full details in milestone folders.*

| Milestone | Completed | Notes |
|-----------|-----------|-------|
| [Alpha](./milestones/alpha/) | YYYY-MM-DD | [Brief summary or link to retro] |

---

## Notes

[Optional: Strategic context, dependencies between milestones, risks, timeline considerations]
```

---

## Section Guide

| Section | Required | Purpose |
|---------|----------|---------|
| Vision link | Yes | Anchors roadmap to the product vision |
| Last updated | Yes | When this roadmap was last modified |
| Current Focus | Yes | One sentence on immediate priority |
| Active Milestones | Yes | Milestones currently being worked on (detailed) |
| Upcoming Milestones | No | Future milestones (brief, not detailed) |
| Completed Milestones | No | Archive of finished milestones (summary only) |
| Notes | No | Strategic context, risks, dependencies |

---

## Milestone Status Values

| Status | Meaning |
|--------|---------|
| `not-started` | Milestone defined but no work begun |
| `in-progress` | Active development underway |
| `blocked` | Work paused due to dependency or issue |
| `complete` | All stories/tasks done, ready to archive |

---

## Trimming Behavior

The Roadmap is a **living document** that stays focused on active work:

1. **Active Milestones** - Full detail: outcome, status, stories, tasks, progress
2. **Upcoming Milestones** - Brief: name and one-line outcome only
3. **Completed Milestones** - Archived: moved to summary table with completion date

**When a milestone completes:**
1. Move it from "Active Milestones" to "Completed Milestones" table
2. Remove detailed story/task listings (they remain in milestone folder)
3. Update "Current Focus" to reflect new priority
4. Optionally promote next "Upcoming" milestone to "Active"

**Why trim?** Keeps the Roadmap scannable for humans and AI. Historical details live in milestone folders, not the Roadmap itself.

---

## Linking

**Roadmap to Vision:**
```markdown
**Vision:** [link to VISION.md](./VISION.md)
```

**Roadmap to Milestones:**
```markdown
### [MVP](./milestones/mvp/)
```

**Milestone to Stories:**
```markdown
- [ ] [STORY-001-auth](./milestones/mvp/stories/STORY-001-auth.md)
```

---

## Principles

1. **Living document** - Update frequently, archive aggressively
2. **Outcome-focused** - Milestones describe what's true when done, not tasks
3. **Scannable** - AI or human should grasp priorities in 30 seconds
4. **Single source of truth** - One Roadmap per project, references milestones
5. **Trim completed work** - History lives in folders, not the Roadmap
