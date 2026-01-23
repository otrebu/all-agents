# Ralph - Autonomous Development Framework

> "Humans on the loop, not in it." Engineers design specs; agents implement.

Ralph is a memoryless iteration framework for autonomous software development. Each agent session starts fresh with deterministically constructed context, avoiding "context rot."

## Quick Start

1. **Create config** in project root:

```bash
cp docs/planning/templates/ralph.config.template.json ralph.config.json
```

2. **Plan your first milestone:**

```bash
aaa ralph plan vision              # Interactive vision definition
aaa ralph plan roadmap             # Define milestones
aaa ralph plan stories --milestone docs/planning/milestones/001-mvp/
aaa ralph plan subtasks --milestone docs/planning/milestones/001-mvp/
```

3. **Build:**

```bash
aaa ralph build --subtasks docs/planning/milestones/001-mvp/subtasks.json
```

## Planning Hierarchy

```
VISION (singular, evolves)
  └── ROADMAP (living doc)
        └── Milestone (outcome bucket: "MVP", "Beta")
              ├── Story (user-centric: what/who/why)
              │     └── Task (technical how)
              │           └── Subtask (atomic implementation)
              └── Task (orphan, tech-only)
                    └── Subtask
```

For full definitions, see [VISION.md](../planning/VISION.md).

## CLI Commands

### Planning

```bash
ralph plan vision                    # Interactive vision (Socratic dialogue)
ralph plan roadmap                   # Define milestones from vision
ralph plan stories --milestone <path>    # Stories for milestone
ralph plan tasks --story <path>      # Tasks for story
ralph plan subtasks --milestone <path>   # Generate subtask queue
```

### Building

```bash
ralph build                          # Run iteration loop (headless)
ralph build -i                       # Interactive: pause each iteration
ralph build --subtasks <path>        # Specify subtasks.json location
ralph build --max-iterations 5       # Limit iterations
ralph build --validate-first         # Alignment check before building
```

### Review

```bash
ralph review roadmap                 # Review roadmap quality
ralph review stories --milestone <path>  # Review story completeness
ralph review subtasks --subtasks <path>  # Review queue before build
ralph review gap roadmap             # Cold gap analysis
ralph review gap stories --milestone <path>
```

### Calibration

Post-implementation checks for drift and inefficiencies:

```bash
ralph calibrate intention            # Check intention drift
ralph calibrate technical            # Check technical violations
ralph calibrate improve              # Self-improvement analysis
ralph calibrate all                  # Run all checks
```

### Status

```bash
ralph status                         # Show progress summary
ralph status --subtasks <path>       # Status for specific queue
```

## Skills (Claude Code)

Use these in Claude Code sessions:

| Skill | Trigger Examples |
|-------|-----------------|
| `/ralph-plan` | "plan vision", "plan stories for MVP" |
| `/ralph-build` | "run build loop", "start building" |
| `/ralph-review` | "review stories", "gap analysis" |
| `/ralph-calibrate` | "check drift", "run calibration" |
| `/ralph-status` | "show status", "build progress" |

## Execution Modes

| Mode | Invocation | Description |
|------|------------|-------------|
| **Interactive** | Skill (`/ralph-plan`) | Full Socratic dialogue, user participates |
| **Supervised** | CLI (default for plan) | Spawns chat, user watches |
| **Headless** | CLI (`--headless`) | JSON output, for CI/automation |

**Trust gradient:** Interactive → Supervised → Headless (increasing autonomy)

## Configuration

Create `ralph.config.json` in project root:

```json
{
  "approvals": {
    "storiesToTasks": "auto",
    "tasksToSubtasks": "auto",
    "atomicDocChanges": "always"
  },
  "calibration": {
    "everyNIterations": 10,
    "afterMilestone": true
  },
  "hooks": {
    "onMilestoneComplete": ["notify", "pause"]
  }
}
```

Template: [ralph.config.template.json](../planning/templates/ralph.config.template.json)

## Directory Structure

```
docs/planning/
├── VISION.md
├── ROADMAP.md
└── milestones/
      ├── 001-mvp/
      │     ├── stories/
      │     ├── tasks/
      │     ├── subtasks.json
      │     └── PROGRESS.md
      └── 002-beta/
```

## See Also

- [VISION.md](../planning/VISION.md) - Full design specification
- [ROADMAP.md](../planning/ROADMAP.md) - Implementation status
- [subtasks.schema.json](../planning/schemas/subtasks.schema.json) - Queue format
