---
name: dev:interrogate
description: Interrogate code changes to surface decisions, alternatives, and confidence levels. Use when user asks to "interrogate", "what decisions", "hardest part", "alternatives", or wants to understand the reasoning behind code changes.
allowed-tools: Bash(git diff:*), Bash(git show:*), Bash(gh pr diff:*), Bash(aaa session:*)
argument-hint: <unstaged|staged|changes|commit|pr> [--quick|--skeptical]
---

# Interrogate Code Changes

Ask "why" instead of just reading code. Surfaces assumptions, decisions, and confidence levels.

## Workflow

@context/workflows/interrogate.md

## Input: $ARGUMENTS

Parse arguments to determine:
- **Target:** `unstaged` (default), `staged`, `changes` (staged+unstaged), `commit <hash>`, `pr <number>`, or `range <ref1>..<ref2>`
- **Mode:** `--quick` (minimal output) or `--skeptical` (extra validation)

## Session Modes: Live vs Forensic

This skill operates in two distinct modes depending on the target:

| Mode | Targets | Behavior | Richness |
|------|---------|----------|----------|
| **Live** | `changes`, `staged`, `unstaged` | Direct introspection - answer from current session memory | ★★★ Best |
| **Forensic** | `commit <hash>`, `pr <N>`, `range` | Load session transcript via `aaa session cat` | ★★ Good |
| **Fallback** | Forensic when no cc-session-id | Diff-only analysis (speculative) | ★ Basic |

### Live Mode (Same Session)

When interrogating current changes (`changes`, `staged`, `unstaged`), Claude can answer directly from memory of the current session. This provides the richest answers because:

- **Alternatives tried** are known from the conversation history
- **What was hard** is lived experience, not inference
- **Uncertainty** reflects actual current confidence

**No file lookup needed.** Just answer the three questions directly from memory.

### Forensic Mode (Past Commits)

When interrogating past commits (`commit`, `pr`, `range`), attempt to load the session transcript:

1. Extract cc-session-id from commit: `git log --format="%(trailers:key=cc-session-id,valueonly)" <hash>`
2. If found, load session content: `aaa session cat --commit <hash>`
3. Pass session transcript to analysis for context-rich answers
4. If cc-session-id not found, fall back to diff-only mode

**Forensic mode is second-best to live mode** - it has the conversation context but not the "lived experience" of the current session.

### Fallback Mode (Diff-Only)

When no cc-session-id trailer exists (older commits or external contributions):

- Analyze the diff alone
- Answers are speculative based on code patterns
- Clearly indicate reduced confidence in answers

## Gather Context

Based on target, gather the code diff:

### Target: unstaged (default) [Live Mode]
```bash
git diff
```

### Target: staged [Live Mode]
```bash
git diff --cached
```

### Target: changes [Live Mode]
```bash
git diff HEAD
```

### Target: commit <hash> [Forensic Mode]
```bash
git show <hash>
# Also attempt session retrieval:
aaa session cat --commit <hash>
```

### Target: pr <number> [Forensic Mode]
```bash
gh pr diff <number>
# For each commit in PR, attempt session retrieval
```

### Target: range <ref1>..<ref2> [Forensic Mode]
```bash
git diff <ref1>..<ref2>
# For each commit in range, attempt session retrieval
```

## Execute Interrogation

Apply the three core questions from the workflow to the gathered diff:

1. **What was the hardest decision?**
2. **What alternatives did you reject?**
3. **What are you least confident about?**

**Live mode:** Answer these from direct memory of the current session.

**Forensic mode:** Use loaded session transcript to inform answers. If no session available, derive answers from diff analysis only.

## Mode Behavior

- **Default:** Full explanations with confidence levels and structured tables
- **--quick:** Compact table with brief answers only
- **--skeptical:** Full output plus follow-up probes:
  - "Walk me through the logic step by step"
  - "What edge cases could break this?"
  - "If this code has a bug, where is it most likely?"

## Output

Format output per @context/workflows/interrogate.md#Output-Format based on selected mode.

Include a session context indicator in output:
- `[Live]` - Answers from current session memory
- `[Forensic: <session-id>]` - Answers informed by loaded session transcript
- `[Diff-Only]` - No session context available
