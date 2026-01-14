---
name: ralph-plan
description: Interactive vision planning using Socratic method. Use when user asks to "ralph plan vision", "plan a vision", or needs to define product vision through guided dialogue.
---

# Ralph Plan

Interactive planning tools for defining product vision and roadmap.

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

## CLI Equivalent

This skill provides the same functionality as:

```bash
aaa ralph plan vision
```

## References

- **Vision prompt:** @context/workflows/ralph/planning/vision-interactive.md
