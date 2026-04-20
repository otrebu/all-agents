---
name: run-guide-and-fix
description: Walk through a milestone GUIDE.md with agent-browser, testing every step. Fixes code bugs and guide inaccuracies as they're found. Use when user asks to "test the guide", "run guide and fix", "validate guide", or "run-guide-and-fix".
allowed-tools: Bash, Read, Write, Edit, Glob, Grep, AskUserQuestion, Task
---

# Run Guide and Fix

Walk through a milestone's GUIDE.md step-by-step using `agent-browser`, fixing bugs and guide inaccuracies along the way.

## Usage

```
/run-guide-and-fix [milestone-name] [--headed] [--theater]
```

## Arguments

- `milestone-name` — Optional. Name of the milestone directory under `docs/planning/milestones/`. If omitted, look for milestones with a GUIDE.md or step-by-step.md.

## Modes

Three execution modes, chosen by flags:

| Mode | Flags | Browser | Narration | Pause between steps |
|------|-------|---------|-----------|---------------------|
| **Fast** (default) | _none_ | headless | minimal, standard templates | no |
| **Headed** | `--headed` | visible window | standard templates | no |
| **Theater** | `--theater` (implies `--headed`) | visible window | **dramatic narrator voice** | **yes — wait for user confirmation** |

### Flag plumbing

- Every `agent-browser` invocation in this skill MUST append `--headed` when either `--headed` or `--theater` was passed.
  - Example: `agent-browser --session guide-test --headed open {url}`
- Persist the chosen mode for the full run — do not mix modes across steps.
- If `--theater` is passed, treat `--headed` as implied (even if not explicitly set).

### Theater mode — dramatic announce + pause

When `--theater` is active, two things change at every single step:

**1. Dramatic announcement BEFORE the step runs.** Replace the minimal narrator templates with a dramatic, cinematic framing. Channel a movie-trailer voiceover: short, punchy, high-stakes. Examples:

- Standard: `"✅ 3.2 — Create Company form submitted"`
- Theater (pre-step): `"🎬 *Step 3.2.* Our hero approaches the Create Company form. The cursor hovers. Destiny awaits. Clicking... NOW."`
- Theater (post-step, success): `"💥 BOOM. Form accepted. The database trembles. We ride on."`
- Theater (post-step, failure): `"💀 DISASTER. The form rejected us. The server laughs. Investigation begins..."`

Keep it short — 1-3 sentences, high drama, one emoji. Do not pad with filler.

**2. PAUSE after every step.** After each step's outcome is reported (and the guide is updated per §5.4), STOP and wait for the user to say "continue" / "next" / "go" before moving to the next step. Use this exact template to pause:

---

"⏸ **Paused after step [N.M].** Check the browser window — does it match? Reply `continue` / `next` to proceed, `retry` to re-run this step, `skip` to mark it pending and move on, or describe any issue you saw."

---

Do NOT use `AskUserQuestion` for the pause — a plain message keeps the conversation flowing and lets the user type free-form feedback. On receiving `retry`, re-run the same step. On `skip`, mark it in the guide as pending and advance.

The pause also applies to major phase boundaries (end of Prerequisites, end of Fresh Start Bootstrap, end of each Part, before Final Report) — pause there with a phase-appropriate message.

### When to use which mode

- **Fast (default):** CI-like validation, re-runs with cached `<!-- automation: -->` annotations, you trust the guide.
- **Headed:** You want to watch the run live but don't need to intervene — good for demos or first-time new-milestone validation.
- **Theater:** You are easily distracted, reviewing carefully, or using this as a demo to a stakeholder. The pauses give you time to visually confirm each step in the actual browser.

## Agent-Browser Reference

@context/blocks/test/agent-browser.md

## Critical Rules

1. **NEVER use `curl`** — all HTTP/browser interaction goes through `agent-browser`
2. **Always use `--session guide-test`** for session persistence across steps
3. **Refs go stale after any page change** — always re-snapshot after navigation or actions that change the page
4. **Prefer semantic locators** — the guide names UI elements, so use `find role`/`find text`/`find label` before falling back to snapshot @refs
5. **Update GUIDE.md immediately** after each step outcome — don't batch updates
6. **Record working selectors** — after each step passes, embed the exact `agent-browser` command as `<!-- automation: ... -->` in the guide so re-runs skip discovery

## Workflow

### Step 1 — Load Agent-Browser Knowledge

---

"🤖 Loading agent-browser knowledge..."

---

Review agent-browser capabilities from `@context/blocks/test/agent-browser.md`.

Run `agent-browser --help` as a quick refresher if needed.

Selector priority for this workflow:
1. **Semantic locators** (no snapshot needed) — guide already names UI elements:
   - `find role button click --name "Create Company"`
   - `find label "Email" fill "test@test.com"`
   - `find text "Submit" click`
2. **@refs from snapshot** — for complex pages where text/role doesn't match:
   - `agent-browser --session guide-test snapshot -i` then use `@e1`, `@e2`...
3. **CSS selectors** — when DOM structure is known

### Step 2 — Find and Read the Guide

---

"📖 Reading the guide..."

---

After reading, narrate what you found:

---

"Got it — [N] parts covering [themes]."

---

Look for the guide in the milestone folder:

```bash
# Primary
docs/planning/milestones/{milestone-name}/GUIDE.md

# Fallback
docs/planning/milestones/{milestone-name}/step-by-step.md
```

If no guide exists, tell the user to run `/write-guide` first and stop.

Read the full guide. Parse its structure to identify:
- Prerequisites section (setup commands)
- Fresh Start Bootstrap section (reset + start sequence)
- Demo Flow parts (one per story, with numbered steps)
- Verification Checklist items
- **Automation annotations** — Look for `<!-- automation: ... -->` HTML comments after step descriptions. If present, this is a re-run. Collect them into a step-to-command map (keyed by step number). During Step 5, use these cached commands directly instead of discovering selectors from scratch.

### Step 3 — Execute Prerequisites

---

"🏗️ Running prerequisites..."

---

Per command, narrate: "✅ done" or "❌ investigating..." After all pass:

---

"✅ Environment ready."

---

Run the setup commands from the Prerequisites section:

1. Execute bash commands (e.g., `pnpm dev:start`, `prisma db push`, seed scripts)
2. Wait for services to be ready — verify with:
   ```bash
   agent-browser --session guide-test open {app-url}
   agent-browser --session guide-test wait --load networkidle
   ```
3. Run DB reset and seed commands as specified

**On failure:**
- Spawn a Task sub-agent to investigate and fix the issue
- Provide: the failed command, error output, relevant config files
- Document the fix in the Troubleshooting section of GUIDE.md immediately

### Step 4 — Execute Fresh Start Bootstrap

---

"🚀 Fresh start bootstrap..."

---

After completion:

---

"✅ Clean baseline ready."

---

Follow the bootstrap sequence from the guide. Use:
- Bash for CLI commands (reset scripts, docker commands, imports)
- `agent-browser` for any browser verification steps

Verify each bootstrap step succeeds before moving to the next.

### Step 5 — Walk Through Demo Flow

This is the main loop. For each **Part** in the Demo Flow, narrate as you go.

**Fast / Headed mode — standard templates:**

| Beat | Narrator Template |
|------|-------------------|
| Part start | "🎬 Part [N]: [title]" |
| Step pass | "✅ [N.M] — [what was verified]" |
| Step fail | "❌ [N.M] — expected [X], got [Y]. Investigating..." |
| After fix | "🔧 Fixed: [one-liner]. Re-running..." |
| Part done | "🎬 Part [N] done — [X/Y] first-pass." |
| Progress (every 5 steps or end of Part) | "📊 [X]/[total] steps, [Y] first-pass, [Z] fixes." |

**Theater mode — replace above with dramatic voiceover + mandatory pause.** See the Theater mode section above for the full protocol. Every step gets a pre-step cinematic announcement, a post-step dramatic outcome, then STOPS and waits for the user to reply `continue` / `next` / `retry` / `skip`.

#### 5.1 — Read the Part

Read the current Part from the guide. Identify:
- Step numbers and descriptions
- URLs to navigate to
- UI elements to interact with (button names, field labels)
- Expected outcomes (what should appear)

#### 5.2 — Execute Each Step

**Replay-first:** If an `<!-- automation: ... -->` annotation exists for this step (collected in Step 2), run that cached command first. If it passes, mark the step done — no discovery needed. If it fails (e.g., selector became stale after a code change), fall through to the normal discovery flow below and update the annotation with the new working command after it passes.

For each numbered step, use the **leanest selector approach**:

**Navigation:**
```bash
agent-browser --session guide-test open {url}
agent-browser --session guide-test wait --load networkidle
```

**Interaction (prefer semantic locators):**
```bash
# Buttons — use role + name from guide
agent-browser --session guide-test find role button click --name "Create Company"

# Form fields — use label from guide
agent-browser --session guide-test find label "Company Name" fill "Acme Corp"

# Text links — use text content
agent-browser --session guide-test find text "View handsets" click

# Dropdowns
agent-browser --session guide-test find label "Division" select "Sales"
```

**Fallback to snapshot + @refs:**
```bash
agent-browser --session guide-test snapshot -i
# Identify the right ref from output
agent-browser --session guide-test click @e3
```

**Verification:**
```bash
# Check page state
agent-browser --session guide-test snapshot -i -c

# Check specific text
agent-browser --session guide-test get text @ref
agent-browser --session guide-test find text "Expected Content" is visible

# Check URL changed
agent-browser --session guide-test get url

# Take screenshot for evidence
agent-browser --session guide-test screenshot /tmp/guide-test-step-{N}.png
```

#### 5.3 — Handle Failures

When a step fails:

1. **Screenshot the failure:**
   ```bash
   agent-browser --session guide-test screenshot /tmp/guide-test-failure-{step}.png
   ```

2. **Spawn a Task sub-agent to investigate.** Provide:
   - Step description from the guide
   - Expected vs actual outcome
   - Screenshot path
   - Relevant source file paths (from the milestone's git diff)

3. **Classify and fix:**

   | Failure Type | Action | Guide Update |
   |-------------|--------|-------------|
   | **Code bug** | Sub-agent fixes source code, re-run step | Add to "Bugs Fixed During Validation" table |
   | **Guide inaccuracy** | Update the Demo Flow step in-place | Fix URL, label, or instruction text |
   | **Timing issue** | Add `wait` command before the step | Add to "Agent-Browser Automation Gotchas" |
   | **Missing prerequisite** | Add setup step to Prerequisites | Update Prerequisites section |
   | **Flaky behavior** | Add retry or explicit wait | Note in Troubleshooting |

4. **Re-run the step** after fixing to confirm it passes.

#### 5.4 — Update GUIDE.md Immediately

After each step outcome, update the guide **right now** (don't batch):

- **Step passed** — Check off the corresponding Verification Checklist item: `- [x] Description (validated {date})`
- **Record automation command** — Embed the exact `agent-browser` command(s) that worked as an HTML comment directly after the step in the guide:
  ```markdown
  3.2 Click "Create Company" and fill in the form

  <!-- automation: agent-browser --session guide-test find role button click --name "Create Company" -->
  ```
  Format: `<!-- automation: {exact command} -->` — one comment per step. If a step required multiple commands (navigate + interact + verify), record all of them separated by ` && `. If an annotation already exists, replace it with the new working command.
- **Guide inaccuracy fixed** — Edit the Demo Flow step in-place with correct info
- **Code bug fixed** — Add entry to "Bugs Fixed During Validation" table:
  ```markdown
  | Bug | Fix | Step |
  |-----|-----|------|
  | Description of bug | What was changed | Part N, Step N.M |
  ```
- **Timing issue** — Add to "Agent-Browser Automation Gotchas" section
- **New troubleshooting discovery** — Add problem/solution pair to Troubleshooting

#### 5.5 — Track Progress

Maintain running counts:
- Steps attempted
- Steps passed on first try
- Guide corrections made
- Code bugs fixed
- Steps still failing

### Step 6 — Final Guide Review

---

"📖 Final read-through for consistency..."

---

After all Demo Flow parts are complete:

1. Re-read the full GUIDE.md
2. Verify all incremental updates are consistent (no contradictions)
3. Ensure these sections are current:
   - Verification Checklist — all tested items checked
   - Gap Analysis — updated with findings
   - Troubleshooting — includes all discovered issues
   - Agent-Browser Automation Gotchas — includes all timing/selector notes
4. Fix any formatting issues from incremental edits

### Step 7 — Final Report

---

"🏁 Here's how the guide held up..."

---

Present a narrator-framed summary:

---

"🏁 **[N] steps**, ✅ **[N] first-pass** ([%]%). 🔧 [N] guide fixes, [N] code fixes. [conditional: ❌ [N] still broken / ✅ all clear]. Guide at `[path]` is battle-tested."

---

Then provide the detailed breakdown:

- **Bugs Fixed:** `[file:line] — description` for each
- **Guide Corrections:** `[section] — what changed` for each
- **Remaining Issues:** `[step] — what's still broken and why` for each (if any)

## Sub-Agent Patterns

### Bug Investigation Sub-Agent

Spawn via Task tool when a step fails due to a code bug:

```
Provide to the sub-agent:
- Step description from the guide
- Expected behavior vs actual behavior
- Screenshot path: /tmp/guide-test-failure-{step}.png
- Relevant source files (from git diff)
- Error messages from console: `agent-browser --session guide-test errors`

Sub-agent tasks:
1. Read the source files
2. Find root cause
3. Implement fix
4. Report what was changed
```

### Guide Section Writing Sub-Agent

For large milestones, delegate individual Part sections:

```
Provide to the sub-agent:
- Story excerpts (narrative + acceptance criteria)
- Git diff summary for the story's scope
- Reference guide section to follow (format/style)
- Project setup context (URLs, ports, etc.)
```

## Error Recovery

| Problem | Recovery |
|---------|----------|
| Service won't start | Check `docker ps`, look for port conflicts, try reset script |
| DB issues | Verify postgres running, try `prisma db push`, re-run seed |
| agent-browser session died | `agent-browser --session guide-test close` then re-open URL |
| Element not found | Re-snapshot, check if page loaded, add `wait`, try different selector |
| Context overflow | Delegate remaining Parts to sub-agents via Task tool |
| Flaky async content | Add `wait --load networkidle` or `wait --text "Expected"` before interaction |
