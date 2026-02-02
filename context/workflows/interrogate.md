# Interrogation Workflow

**Purpose:** Ask "why" instead of reading code. Surfaces assumptions, decisions, and confidence levels in code changes.

## Session Modes

The interrogation workflow operates in different modes depending on what you're interrogating:

| Mode | Targets | Source | Quality |
|------|---------|--------|---------|
| **Live** | `changes`, `staged`, `unstaged` | Direct introspection (current session memory) | ★★★ Richest |
| **Forensic** | `commit`, `pr`, `range` | Session transcript loaded via `aaa session cat` | ★★ Good |
| **Fallback** | Forensic when no cc-session-id | Diff analysis only | ★ Basic |

### Live Mode (Current Session)

When interrogating current changes, Claude answers from **direct memory** of the current session:

- No file lookup needed
- Alternatives are known from conversation history
- Difficulty is lived experience
- Uncertainty reflects actual current confidence

This is the richest mode because it's introspection, not archaeology.

### Forensic Mode (Past Commits)

When interrogating commits, PRs, or ranges:

1. Extract `cc-session-id` trailer from commit(s)
2. Load session transcript: `aaa session cat --commit <hash>`
3. Use transcript context to inform answers

Forensic mode with session transcript is second-best to live mode.

### Fallback Mode (Diff-Only)

When no `cc-session-id` trailer exists:

- Analyze diff alone
- Answers are speculative
- Clearly indicate reduced confidence

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

## Answer Modes

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
## Interrogation Results [Live|Forensic: <id>|Diff-Only]

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

**Session context indicator:** The header includes one of:
- `[Live]` - Answers from current session memory
- `[Forensic: <session-id>]` - Answers informed by loaded session transcript
- `[Diff-Only]` - No session context available

## Targets

The interrogation can be run against different targets:

| Target | Mode | Command |
|--------|------|---------|
| `changes` | Live | Current staged and unstaged changes (`git diff HEAD`) |
| `staged` | Live | Staged changes only (`git diff --cached`) |
| `unstaged` | Live | Unstaged changes only (`git diff`) |
| `commit <hash>` | Forensic | A specific commit (`git show <hash>`) |
| `pr <number>` | Forensic | A pull request (`gh pr diff <number>`) |
| `range <ref1>..<ref2>` | Forensic | A commit range (`git diff <ref1>..<ref2>`) |

## When to Use

- **Before merging:** Run `/dev:interrogate changes` as a pre-merge checkpoint
- **Reviewing AI code:** Use `--skeptical` mode for extra validation
- **Quick sanity check:** Use `--quick` mode for small changes
- **Understanding unfamiliar code:** Full mode with follow-up questions
- **Auditing past work:** Use `commit` target for forensic analysis of past decisions

## Integration

This workflow is designed to complement code review, not replace it. Use interrogation to understand intent, then review for correctness.

### Forensic Mode Details

To interrogate a past commit with session context:

```bash
# Check if commit has session trailer
git log -1 --format="%(trailers:key=cc-session-id)" <hash>

# Load session content for analysis
aaa session cat --commit <hash>
```

Commits made during Claude Code sessions include a `cc-session-id` trailer that links to the conversation that produced the code. This enables richer interrogation by providing the full decision-making context.
