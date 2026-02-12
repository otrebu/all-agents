# Ralph - Autonomous Development Framework

> "Humans on the loop, not in it." Engineers design specs; agents implement.

Ralph is a memoryless iteration framework for autonomous software development. Each agent session starts fresh with deterministically constructed context, avoiding "context rot."

## Quick Start

1. **Create config** in project root:

```bash
# Unified config (recommended)
cp docs/planning/templates/ralph.config.template.json aaa.config.json
```

> **Note:** The unified config file is `aaa.config.json`. Legacy `ralph.config.json` is still read with a deprecation warning.

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
ralph build                          # Run iteration loop (supervised default)
ralph build -i                       # Interactive: pause each iteration
ralph build --subtasks <path>        # Specify subtasks.json location
ralph build --max-iterations 5       # Limit iterations
ralph build --validate-first         # Alignment check before building
ralph build --cascade calibrate      # Chain build → calibrate
ralph build --force                  # Auto-apply queue proposals
ralph build --review                 # Require explicit approval for proposals
ralph build --from <level>           # Resume cascade from a specific level
ralph build -S, --skip-summary       # Skip summary generation in headless mode
ralph build --provider opencode --model openai/gpt-5.3-codex  # Multi-provider
```

### Review

```bash
ralph review roadmap                 # Review roadmap quality
ralph review stories --milestone <path>  # Review story completeness
ralph review subtasks --subtasks <path>  # Review queue before build
ralph review tasks <story-id>        # Review tasks for a story
ralph review gap roadmap             # Cold gap analysis
ralph review gap stories --milestone <path>
ralph review gap tasks --story <path>    # Gap analysis of tasks
ralph review gap subtasks                # Gap analysis of subtask queue
```

### Utility Commands

```bash
ralph milestones                     # List milestones from roadmap
ralph milestones --json              # JSON output
ralph models                         # List model names from registry
ralph models --provider opencode     # Filter by provider
ralph archive subtasks --milestone <path>  # Archive completed subtasks
ralph archive progress --progress <path>   # Archive old PROGRESS.md sessions
ralph refresh-models                 # Discover models from CLI providers
ralph refresh-models --dry-run       # Preview without writing
ralph subtasks next --milestone <name>     # Get next runnable subtask
ralph subtasks list --milestone <name>     # List queue
ralph subtasks complete --milestone <name> --id SUB-001  # Mark complete
ralph subtasks append --subtasks <path>    # Append to queue
ralph subtasks prepend --subtasks <path>   # Prepend to queue
ralph subtasks diff --proposal <path>      # Preview proposal changes
ralph subtasks apply --proposal <path>     # Apply proposal
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
| **Supervised** | CLI (default for build/plan) | Spawns chat, user watches |
| **Headless** | CLI (`--headless`) | JSON output, for CI/automation |

**Trust gradient:** Interactive → Supervised → Headless (increasing autonomy)

## Configuration

Create `aaa.config.json` in project root (see [main README](../../README.md#configuration) for full schema):

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
