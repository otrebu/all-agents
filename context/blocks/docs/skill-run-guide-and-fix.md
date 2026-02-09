---
depends:
  - context/blocks/test/agent-browser.md
  - context/blocks/docs/skill-write-guide.md
---

# Skill: run-guide-and-fix

Walk through a milestone's GUIDE.md step-by-step using `agent-browser`, fixing bugs and guide inaccuracies along the way.

## Purpose

Validates demo guides by actually executing every step in a headless browser. When something fails, it classifies the failure (code bug, guide inaccuracy, timing issue) and fixes it immediately — producing a battle-tested guide and cleaner code.

## Trigger Phrases

- "test the guide", "run guide and fix", "validate guide", "run-guide-and-fix"

## Invocation

```
/run-guide-and-fix [milestone-name]
```

If no milestone specified, looks for milestones with an existing `GUIDE.md` or `step-by-step.md`.

## Prerequisites

- `agent-browser` CLI installed and available on PATH
- Services running (the guide's Prerequisites section is executed first)
- A `GUIDE.md` or `step-by-step.md` in the milestone folder (run `/write-guide` first if missing)

## Critical Rules

1. **NEVER use `curl`** — all browser interaction through `agent-browser`
2. **Always use `--session guide-test`** for persistence
3. **Re-snapshot after every page change** — refs go stale
4. **Prefer semantic locators** — `find role`/`find text`/`find label` before @refs
5. **Update GUIDE.md after each step** — don't batch

## Workflow Summary

1. Load agent-browser knowledge from `@context/blocks/test/agent-browser.md`
2. Find and read the guide
3. Execute Prerequisites (bash + agent-browser verification)
4. Execute Fresh Start Bootstrap
5. Walk through Demo Flow — for each Part:
   - Execute each step using leanest selector approach
   - On failure: screenshot, spawn Task sub-agent, classify and fix
   - Update GUIDE.md immediately (checklist, bug table, gotchas)
6. Final guide review — verify consistency across all incremental edits
7. Final report with pass/fail/fix counts

## Failure Classification

| Type | Fix | Guide Update |
|------|-----|-------------|
| Code bug | Sub-agent patches source | Add to "Bugs Fixed During Validation" |
| Guide inaccuracy | Edit Demo Flow step | Fix URL, label, or instruction |
| Timing issue | Add `wait` command | Add to "Agent-Browser Gotchas" |
| Missing prerequisite | Add setup step | Update Prerequisites |

## Output

Updates the GUIDE.md in-place with:
- Verification Checklist items checked off with validation date
- "Bugs Fixed During Validation" table
- Updated Troubleshooting section
- Updated Agent-Browser Automation Gotchas

Final summary report:
```
Total steps: N | Passed first try: N | Guide corrections: N
Code bugs fixed: N | Still failing: N | Checklist: N/total
```

## Sub-Agents Used

- **Bug investigation** — receives step context, expected vs actual, screenshot, source files
- **Guide section writing** — for large milestones, delegates Part sections

## Companion Skill

Generate the guide first with `/write-guide`, then validate with this skill.

## Skill File

`.claude/skills/run-guide-and-fix/SKILL.md`

## Related Docs

- @context/blocks/test/agent-browser.md — agent-browser CLI reference
- @context/blocks/docs/skill-write-guide.md — companion guide generation skill
