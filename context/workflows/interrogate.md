# Interrogation Workflow

**Purpose:** Ask "why" instead of reading code. Surfaces assumptions, decisions, and confidence levels in code changes.

## Core Questions

Ask these three questions about any code change:

### 1. What was the hardest decision?

Identify the most difficult trade-off or design choice in this change.

- Why was this hard?
- What constraints made it difficult?
- What would need to change to make a different choice viable?

### 2. What alternatives did you reject?

Surface the paths not taken.

- What other approaches were considered?
- Why were they rejected?
- Under what circumstances would a rejected approach become the better choice?

### 3. What are you least confident about?

Reveal uncertainty and assumptions.

- Which parts feel fragile or uncertain?
- What assumptions are being made?
- What would need to be true for this to fail?

## Modes

### Default Mode

Asks all three questions with full explanations. Use for substantial changes or when you need deep understanding.

**Invocation:**
```
/dev:interrogate changes
/dev:interrogate commit <hash>
/dev:interrogate pr <number>
```

### Quick Mode (`--quick`)

Minimal output - just the three answers in a compact table. Use for small changes or rapid review.

**Invocation:**
```
/dev:interrogate changes --quick
```

**Output format:**
| Question | Answer |
|----------|--------|
| Hardest decision | Brief answer |
| Rejected alternatives | Brief list |
| Lowest confidence | Brief answer |

### Skeptical Mode (`--skeptical`)

Extra validation for AI-generated or unfamiliar code. Adds follow-up probes:

- "Walk me through the logic step by step"
- "What edge cases could break this?"
- "If this code has a bug, where is it most likely?"

**Invocation:**
```
/dev:interrogate changes --skeptical
```

## Output Format

### Full Output (Default/Skeptical)

```
## Interrogation Results

### Hardest Decision
**Decision:** <what was decided>
**Why hard:** <why this was difficult>
**Trade-offs:** <what was sacrificed>
**Confidence:** <0-100%>

### Rejected Alternatives
| Alternative | Why Rejected | When It Would Be Better |
|-------------|--------------|------------------------|
| <option 1>  | <reason>     | <scenario>             |
| <option 2>  | <reason>     | <scenario>             |

### Lowest Confidence
**Area:** <which part is uncertain>
**Assumptions:** <what must be true>
**Risk:** <what could go wrong>
**Confidence:** <0-100%>

### Summary
| Aspect | Confidence |
|--------|------------|
| Overall approach | <0-100%> |
| Implementation correctness | <0-100%> |
| Edge case handling | <0-100%> |
```

## Targets

The interrogation can be run against different targets:

- **changes** - Current staged and unstaged changes (`git diff HEAD`)
- **commit** - A specific commit (`git show <hash>`)
- **pr** - A pull request (uses `gh pr diff <number>`)

## When to Use

- **Before merging:** Run `/dev:interrogate changes` as a pre-merge checkpoint
- **Reviewing AI code:** Use `--skeptical` mode for extra validation
- **Quick sanity check:** Use `--quick` mode for small changes
- **Understanding unfamiliar code:** Full mode with follow-up questions

## Integration

This workflow is designed to complement code review, not replace it. Use interrogation to understand intent, then review for correctness.
