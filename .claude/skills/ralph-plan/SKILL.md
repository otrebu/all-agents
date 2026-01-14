---
name: ralph-plan
description: Interactive vision planning using Socratic method. Use when user asks to "ralph plan vision", "plan a vision", "ralph plan roadmap", "ralph plan stories", or needs to define product vision/roadmap/stories through guided dialogue.
---

# Ralph Plan

Interactive planning tools for defining product vision, roadmap, and user stories.

## Execution Instructions

When this skill is invoked, check the ARGUMENTS provided:

### If argument is `vision`:

**START THE VISION PLANNING SESSION IMMEDIATELY.** Follow the vision-interactive prompt below and begin with the opening question. Do NOT just show documentation.

Begin the session with:

---

"Let's work on clarifying your product vision. I'll ask questions to help you articulate what you're building and why.

**To start:** What problem are you trying to solve, and for whom?

(You can say 'done' at any point when you feel we've covered enough.)"

---

Then follow the full workflow in: @context/workflows/ralph/planning/vision-interactive.md

### If argument is `roadmap`:

**START THE ROADMAP PLANNING SESSION IMMEDIATELY.** First read the VISION.md if it exists, then follow the roadmap-interactive prompt and begin with the opening question. Do NOT just show documentation.

1. First, read @docs/planning/VISION.md to understand the product vision
2. If no VISION.md exists, inform the user and suggest they run `/ralph-plan vision` first
3. Begin the session with:

---

"Let's work on your product roadmap. I've read your vision document and I'll ask questions to help translate it into actionable milestones.

**To start:** What's the most important thing users should be able to do in your first release?

(You can say 'done' at any point when you feel we've covered enough.)"

---

Then follow the full workflow in: @context/workflows/ralph/planning/roadmap-interactive.md

### If argument is `stories` (with optional milestone name):

**START THE STORIES PLANNING SESSION IMMEDIATELY.** First read the VISION.md and ROADMAP.md, then follow the stories-interactive prompt. Do NOT just show documentation.

1. First, read @docs/planning/VISION.md and @docs/planning/ROADMAP.md to understand the product context
2. If no VISION.md or ROADMAP.md exists, inform the user and suggest they run `/ralph-plan vision` and `/ralph-plan roadmap` first
3. If a milestone name was provided as a second argument (e.g., `/ralph-plan stories my-milestone`), use that milestone
4. If no milestone was provided, ask the user which milestone they want to create stories for
5. Begin the session with:

---

"Let's create user stories for the **[milestone]** milestone.

I've reviewed the roadmap - this milestone focuses on: [list key deliverables from ROADMAP.md]

**To start:** Who are the primary users that will benefit from these capabilities? What are they trying to accomplish?

(You can say 'done' at any point when you feel we've covered enough, or ask me to save a story when we've defined it well.)"

---

Then follow the full workflow in: @context/workflows/ralph/planning/stories-interactive.md

### If no argument or unknown argument:

Show the usage documentation below.

---

## Usage

```
/ralph-plan <subcommand>
```

## Subcommands

| Subcommand | Description |
|------------|-------------|
| `vision` | Start interactive vision planning session |
| `roadmap` | Start interactive roadmap planning session |
| `stories` | Start interactive stories planning session for a milestone |

## Vision Planning

Start an interactive Socratic dialogue to help define and clarify product vision.

### Invocation

```
/ralph-plan vision
```

### What Happens

1. Begins a multi-turn conversation using the Socratic method
2. Guides you through exploring:
   - Product purpose and problem being solved
   - Target users using Jobs To Be Done framework
   - Key capabilities and differentiators
   - Current state vs future vision
3. Creates or updates `docs/planning/VISION.md` when ready

### Important Notes

- This is **interactive only** - no auto mode exists for vision planning
- Vision planning requires human insight and decision-making
- You control the pace and can exit anytime by saying "done"
- The session can span multiple turns as needed

## Roadmap Planning

Start an interactive Socratic dialogue to help define product milestones and roadmap.

### Invocation

```
/ralph-plan roadmap
```

### What Happens

1. Reads your existing VISION.md document (if it exists)
2. Begins a multi-turn conversation using the Socratic method
3. Guides you through exploring:
   - Scope and priority for first release
   - Tradeoffs and hard decisions
   - Dependency mapping between features
   - Milestone definition with outcomes
4. Creates or updates `docs/planning/ROADMAP.md` when ready

### Important Notes

- Requires VISION.md to exist (run `/ralph-plan vision` first)
- Interactive mode available, auto mode available via `roadmap-auto.md`
- Milestones use outcome-based names, not version numbers
- No time estimates - focus on sequence and dependencies
- You control the pace and can exit anytime by saying "done"

## Stories Planning

Start an interactive Socratic dialogue to help create user stories for a specific milestone.

### Invocation

```
/ralph-plan stories [milestone-name]
```

### What Happens

1. Reads your existing VISION.md and ROADMAP.md documents
2. If a milestone name is provided, uses that milestone
3. If no milestone is provided, asks which milestone to create stories for
4. Begins a multi-turn conversation using Socratic method with JTBD framework
5. Guides you through exploring:
   - Primary users and their context
   - Jobs to be done (functional, emotional, social)
   - Story scope and boundaries
   - Priority and sequencing
   - Tradeoffs and decisions
   - Acceptance criteria
6. Creates story files in `docs/planning/milestones/<milestone>/stories/`

### Important Notes

- Requires VISION.md and ROADMAP.md to exist (run vision and roadmap planning first)
- Uses Jobs To Be Done (JTBD) framework for user-centered stories
- Stories focus on user outcomes, not technical implementation
- You control the pace and can exit anytime by saying "done"
- Can save stories incrementally during the session

## CLI Equivalent

This skill provides the same functionality as:

```bash
aaa ralph plan vision
aaa ralph plan roadmap
aaa ralph plan stories --milestone <name>
```

## References

- **Vision prompt:** @context/workflows/ralph/planning/vision-interactive.md
- **Roadmap prompt:** @context/workflows/ralph/planning/roadmap-interactive.md
- **Stories prompt:** @context/workflows/ralph/planning/stories-interactive.md
