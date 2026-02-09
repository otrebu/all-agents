---
name: write-guide
description: Generate a comprehensive GUIDE.md for a project milestone. Use when user asks to "write guide", "generate guide", "create demo guide", or "write-guide". Analyzes milestone stories, git changes, and project setup to produce a step-by-step demo guide.
allowed-tools: Bash, Read, Write, Edit, Glob, Grep, AskUserQuestion, Task
---

# Write Guide

Generate a comprehensive `GUIDE.md` for a milestone by analyzing stories, git history, and project setup.

## Usage

```
/write-guide [milestone-name]
```

## Arguments

- `milestone-name` — Optional. Name of the milestone directory under `docs/planning/milestones/`. If omitted, present available milestones for selection.

## Workflow

### Step 1 — Discover Milestones

---

"🔍 Checking what milestones are available..."

---

List directories under `docs/planning/milestones/`:

```bash
ls -d docs/planning/milestones/*/
```

- Skip `_orphan` and similar utility directories
- If no argument provided, present options to user via AskUserQuestion
- If argument provided, validate the directory exists

### Step 2 — Inventory Milestone Artifacts

---

"📂 Inventorying the milestone folder — stories, progress, gaps..."

---

Read the milestone directory contents:

```bash
ls -la docs/planning/milestones/{milestone-name}/
```

Look for:
- `stories/` directory (primary story source)
- `tasks/` directory
- `PROGRESS.md` (session notes)
- `subtasks.json` (Ralph build queue)
- `gaps-to-implement.md` (known gaps between stories and implementation)
- `GUIDE.md` or `step-by-step.md` (existing guide)

**If `GUIDE.md` already exists:** Warn the user and ask before overwriting. Offer to update in-place or regenerate from scratch.

### Step 3 — Read All Stories

---

"📖 Reading the stories — need to understand who wanted what."

---

Read every `STORY-*.md` file in the `stories/` folder:

```bash
ls docs/planning/milestones/{milestone-name}/stories/STORY-*.md
```

For each story, extract:
- Story number and title
- Narrative (As a... I want... So that...)
- Acceptance criteria (checkboxes)
- Tasks list
- Implementation notes

**Fallback:** If no `stories/` directory exists:
1. Check `subtasks.json` for `storyRef` fields
2. Check for story files in alternative locations
3. Ask user where stories live

### Step 4 — Check Subtask Completion

---

"🔍 Checking completion — the guide should be honest about what shipped."

---

Run the Ralph status command:

```bash
aaa ralph status --subtasks docs/planning/milestones/{milestone-name}/subtasks.json
```

Parse output for:
- Milestone name
- Progress (X/Y completed)
- Completion percentage
- Next subtask in queue

**If not 100% complete:** Warn user and list incomplete subtasks. Ask whether to proceed (guide will note pending items) or wait.

Read `gaps-to-implement.md` if it exists — these are known gaps between stories and the actual implementation.

### Step 5 — Analyze Git Changes for Unplanned Work

---

"🔍 Peeking at git history for unplanned work..."

---

Find the milestone's branch:

```bash
# Try standard naming first
git branch -a | grep -i "{milestone-name}"
```

Try patterns: `feature/{milestone-name}`, `feature/{milestone-name-variant}`.

List all commits on the branch:

```bash
git log main..{branch} --oneline
```

Get file-level diff summary:

```bash
git diff main...{branch} --stat
git diff main...{branch} --name-only
```

**Cross-reference each commit and changed file against stories to detect:**

- **Unplanned additions:** Commits that don't map to any story (extra features, side-fixes, infrastructure changes). Files changed outside story scope.
- **Missing features:** Story acceptance criteria with no corresponding commits or changed files.
- **Side-fixes:** Bug fixes discovered during development that weren't in the original plan.

Flag these in the guide overview as "Additional functionality not in stories."

### Step 6 — Gather Setup Context

---

"🏗️ Gathering setup context — ports, URLs, gotchas..."

---

Read project setup files:

```bash
# Root-level setup
README.md
CLAUDE.md
package.json

# Scripts directory
ls scripts/
```

Extract:
- How to start services (`pnpm dev:start`, docker commands, etc.)
- How to reset/seed the database
- URLs and ports (Admin UI, API, Mailpit, etc.)
- Known gotchas (docker ghost containers, migration issues, port conflicts)
- Prerequisites (Docker, Node.js, pnpm, etc.)

### Step 7 — Write GUIDE.md

---

"✍️ Writing the guide..."

---

Output to `docs/planning/milestones/{milestone-name}/GUIDE.md`.

Follow this structure — use the reference guides as the gold standard for tone, detail level, and formatting:

| # | Section | Content Source |
|---|---------|---------------|
| 1 | **Overview** | Stories table (number, feature, status, notes), branch name, what's implemented vs pending, unplanned additions |
| 2 | **Prerequisites** | Setup commands from README/package.json, explanatory callouts (`> **Why X?**`), URLs/ports table |
| 3 | **Fresh Start Bootstrap** | Numbered reset-to-running sequence. Order of operations from clean slate to working app. |
| 4 | **Demo Flow** | One **Part** per story. Numbered sub-steps (N.1, N.2...). Each step is actionable: navigate/click/type/verify. Include exact URLs, UI labels, expected outcomes. Add `> **Gotcha**` callouts for non-obvious behavior. |
| 5 | **Verification Checklist** | Per-story checkboxes derived from acceptance criteria. Unchecked `- [ ]` format. |
| 6 | **Key Features Demonstrated** | Feature matrix table mapping features to where they appear in the demo. |
| 7 | **Troubleshooting** | Problem/solution pairs from known issues, gaps doc, and common failures. |
| 8 | **Agent-Browser Automation Gotchas** | Selectors and labels that need special handling. Timing tips (where to add waits). Session management notes. Refs that go stale. |
| 9 | **Gap Analysis** | Stories vs implementation matrix. Columns: Story, Feature, Implemented?, Notes. |

#### Narrative Arc

Each section has a narrative job — the guide should read as a journey, not a checklist:

| Section | Narrative Role |
|---------|---------------|
| 🗺️ Overview | **The hook** — what this milestone gave you, in one sentence |
| 🧰 Prerequisites | **The preparation** — get your tools ready |
| 🚀 Fresh Start Bootstrap | **The ritual** — clean slate to running app |
| 🎬 Demo Flow | **The journey** — explore each feature, one Part per story |
| ✅ Verification Checklist | **The scorecard** — did it all work? |
| 🔑 Key Features Demonstrated | **The map** — what lives where |
| 🛠️ Troubleshooting | **The safety net** — when things go wrong |
| 🤖 Agent-Browser Gotchas | **The automation tips** — selectors, timing, sessions |
| 📋 Gap Analysis | **The honest accounting** — what shipped, what didn't |

### Writing Guidelines

**Tone and Voice:**
- Open with what the milestone gives you — one sentence hook
- 1-2 sentences of scene-setting before each Part's steps, not more
- Short transitions between Parts ("Now let's try Y")
- After key verifications, one line of payoff ("If you see X, the pipeline works end to end")
- Be honest about gaps — don't hide, don't over-explain

**Brevity:**
- Context sentences are short. Steps are shorter. Callouts are one-liners.
- Commands first, explanation after, expected output at the end
- No paragraphs of setup narrative before a code block — get to the command

**Specificity:**
- Use exact URLs (`http://localhost:3001/structure`), exact button labels (`"Create Company"`), exact field names
- Each step follows logically from the previous one — number everything
- After each significant action, tell the reader what they should see

**Callouts:**
- Use `> ⚠️ **Gotcha:**`, `> 💡 **Why?**`, `> 📝 **Note:**` blockquotes for context that helps but isn't a step
- Callouts are one-liners — if you need a paragraph, it's a step

**Agent-Browser Awareness:**
- Write steps that can be automated — name UI elements by their role/label, not their CSS class
- Think in terms of: navigate, find, interact, verify

**Anti-Patterns:**
- No dry checklist tone ("Step 1: Do X. Step 2: Do Y.")
- No passive voice ("The button should be clicked" → "Click the button")
- No generic headings ("Test Steps" → "Build with OpenCode")
- No walls of text between commands

### Step 8 — Present Summary

---

"📝 Guide covers [N] stories in ~[N] lines. [N gaps flagged]. Saved to `docs/planning/milestones/{milestone-name}/GUIDE.md`. Run `/run-guide-and-fix` to battle-test it."

---

Report to user:
- Sections written and approximate line count
- Stories covered (N/total)
- Gaps identified (pending features, unplanned additions)
- File path to the generated guide
- Suggest running `/run-guide-and-fix` next to validate the guide

## Reference Guide (Gold Standard)

This existing guide demonstrates the target quality, tone, and structure:

- `docs/planning/milestones/004-MULTI-CLI/TESTING-GUIDE.md` — Conversational tone, commands first, honest about what works and what doesn't. The real gold standard.

When writing a new guide, match the tone, detail level, and formatting of this reference.
