---
name: ralph-plan
description: Interactive vision planning using Socratic method. Use when user asks to "ralph plan vision", "plan a vision", or needs to define product vision through guided dialogue.
---

# Ralph Plan

Interactive planning tools for defining product vision and roadmap.

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

### Session Flow

Follow the vision-interactive workflow:

@context/workflows/ralph/planning/vision-interactive.md

## CLI Equivalent

This skill provides the same functionality as:

```bash
aaa ralph plan vision
```

## References

- **Vision prompt:** @context/workflows/ralph/planning/vision-interactive.md
