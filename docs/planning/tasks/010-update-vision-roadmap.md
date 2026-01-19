# Task: Update VISION.md and ROADMAP.md

## Overview

Document the three-mode system in VISION.md and create a milestone for implementation in ROADMAP.md.

## VISION.md Updates

### New Section 3.1: Execution Mode System

Insert after Section 3 (Operational Modes), before the existing subsections:

```markdown
### 3.1 Execution Mode System

Ralph commands support three execution modes forming a trust gradient:

#### Three Modes

| Mode | User Experience | User Input | Implementation |
|------|-----------------|------------|----------------|
| **Interactive** | Real-time dialogue | Responds to questions | `claude --append-system-prompt` |
| **Observable Auto** | Real-time progress | None (watches) | `claude -p` with `stdio: inherit` |
| **Headless** | Nothing until end | None | `claude -p --output-format json` |

#### Trust Gradient

```
Low Trust ─────────────────────────────────────────────► High Trust

Interactive          Observable Auto          Headless
(human in loop)      (human on loop)         (human reviews output)
```

#### Five Graduated Trust Principles

1. **Start Interactive**: New prompts and unfamiliar domains begin with human-in-the-loop dialogue
2. **Graduate to Observable**: As prompts prove reliable, shift to auto mode where humans monitor but don't direct
3. **Achieve Headless**: Well-tested workflows run in batch/CI with humans reviewing only outputs
4. **Trust is Earned**: Each workflow earns trust through successful executions, not assumptions
5. **Regression is Valid**: Complex changes or failures warrant returning to higher-touch modes

#### CLI Flags

| Flag | Mode | When to Use |
|------|------|-------------|
| (none) | Interactive | Default for human-centric planning |
| `-a, --auto` | Observable Auto | Proven prompts, want visibility |
| `--headless` | Headless | CI/CD, batch operations |

#### Mode by Command Category

| Category | Default | Supports |
|----------|---------|----------|
| Vision planning | Interactive | Interactive only |
| Roadmap/Stories/Tasks | Interactive | All three modes |
| Subtasks generation | Observable Auto | Auto, Headless |
| Building | Observable Auto | Auto, Headless |
| Calibration | Observable Auto | Auto, Headless |
| Status | N/A | Direct output |

#### Prompt Reuse

Auto prompts (`*-auto.md`) work for both Observable Auto and Headless modes. The difference is invocation, not instruction. No separate headless prompts needed.
```

### Update Section 8.9: Interactive vs Single-Shot Mode

Rename to "Execution Modes Implementation" and expand:

```markdown
### 8.9 Execution Modes Implementation

Three invocation patterns corresponding to the trust gradient:

#### Interactive Mode (Human in Loop)

```bash
# User engages in dialogue
claude --append-system-prompt "$(cat prompt.md)" "Begin session"
```

- Used for: Vision planning, exploratory work
- User responds to questions, guides direction
- Full tool access, no permission skipping

#### Observable Auto Mode (Human on Loop)

```bash
# User watches real-time progress
claude -p "$(cat prompt.md)" --dangerously-skip-permissions
# stdout: inherit (user sees output)
```

- Used for: Proven planning prompts, building iterations
- User monitors progress, can interrupt if needed
- Permissions skipped for autonomous execution

#### Headless Mode (Human Reviews Output)

```bash
# JSON output, nothing visible during execution
result=$(claude -p "$(cat prompt.md)" \
         --dangerously-skip-permissions \
         --output-format json)
session_id=$(echo "$result" | jq -r '.session_id')
```

- Used for: CI/CD, batch operations, scheduled runs
- Returns structured JSON with session_id, result, cost
- Human reviews outputs and logs post-execution

#### Mode Selection Logic

```typescript
function getExecutionMode(options: CommandOptions): ExecutionMode {
  if (options.headless) return 'headless';
  if (options.auto) return 'observable-auto';
  return 'interactive';
}
```

#### Per-Command Mode Mapping

| Command | Default | --auto | --headless |
|---------|---------|--------|------------|
| `plan vision` | Interactive | N/A | N/A |
| `plan roadmap` | Interactive | Observable Auto | Headless |
| `plan stories` | Interactive | Observable Auto | Headless |
| `plan tasks --story` | Interactive | Observable Auto | Headless |
| `plan tasks --milestone` | N/A | Observable Auto | Headless |
| `plan subtasks` | Observable Auto | N/A | Headless |
| `build` | Observable Auto | N/A | Headless |
| `calibrate` | Observable Auto | N/A | Headless |
```

## ROADMAP.md Updates

### Add to Future Considerations (or create new Milestone)

Option A: Add to existing "Future Considerations" section:

```markdown
## Future Considerations

Features from VISION.md that are explicitly deferred beyond these milestones:

- **Three-mode system refinement**: Observable Auto and Headless modes for CI/CD integration ← ADD THIS
- **Multiple agent orchestration**: ...
```

Option B: Create new milestone after full-integration:

```markdown
### 5. [execution-modes](milestones/execution-modes/): Three-Mode Trust System

**Outcome:** All Ralph commands support Interactive, Observable Auto, and Headless modes based on trust gradient

**Why this milestone:** Enables CI/CD integration and batch operations while maintaining human oversight at appropriate trust levels

**Key deliverables:**
- Three helper functions: `invokeClaude`, `invokeClaudeAuto`, `invokeClaudeHeadless`
- `--headless` flag on all auto-capable commands
- Updated CLI feature creator meta-skill for three-mode guidance
- VISION.md Section 3.1 documenting trust gradient
- Updated shell completions (bash/zsh/fish)

**Success criteria:**
- `aaa ralph plan tasks --milestone ralph` → interactive dialogue
- `aaa ralph plan tasks --milestone ralph --auto` → observable auto
- `aaa ralph plan tasks --milestone ralph --headless` → JSON output
- CI/CD can run headless planning and building

**Dependencies:** full-integration (milestone 4)
```

## Implementation Notes

### VISION.md Changes Summary

1. **New Section 3.1**: Insert "Execution Mode System" with trust gradient, CLI flags, mode table
2. **Update Section 8.9**: Expand from two modes to three, add implementation details

### ROADMAP.md Changes Summary

1. **Add milestone or future consideration**: Document three-mode system as planned work

## Files to Modify

| File | Changes |
|------|---------|
| `docs/planning/VISION.md` | New Section 3.1, expanded Section 8.9 |
| `docs/planning/ROADMAP.md` | New milestone or future consideration |

## Validation

After this task:
- [ ] VISION.md Section 3.1 explains trust gradient with clear table
- [ ] VISION.md Section 8.9 covers all three invocation patterns
- [ ] ROADMAP.md includes three-mode system in planning
- [ ] Five trust principles documented
- [ ] Per-command mode mapping table present
