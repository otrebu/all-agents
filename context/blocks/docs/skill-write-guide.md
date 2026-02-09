---
depends:
  - context/blocks/docs/story-template.md
  - context/blocks/docs/task-management.md
---

# Skill: write-guide

Generate a comprehensive `GUIDE.md` for a project milestone.

## Purpose

Automates the tedious process of writing step-by-step demo guides. Analyzes milestone stories, git history, and project setup to produce a guide that covers every feature with exact URLs, UI labels, and verification steps.

## Trigger Phrases

- "write guide", "generate guide", "create demo guide", "write-guide"

## Invocation

```
/write-guide [milestone-name]
```

If no milestone is specified, presents available milestones for selection.

## Inputs

| Input | Source | Required |
|-------|--------|----------|
| Stories | `docs/planning/milestones/{name}/stories/STORY-*.md` | Yes |
| Subtask status | `aaa ralph status --subtasks` | No |
| Git branch | `feature/{milestone-name}` | No |
| Gap analysis | `gaps-to-implement.md` | No |
| Setup context | `README.md`, `package.json`, `scripts/` | Yes |

## Output

`docs/planning/milestones/{milestone-name}/GUIDE.md` with sections:

1. **Overview** — Stories table, branch, implemented vs pending, unplanned additions
2. **Prerequisites** — Setup commands with explanatory callouts
3. **Fresh Start Bootstrap** — Reset-to-running sequence
4. **Demo Flow** — One Part per story, numbered actionable steps
5. **Verification Checklist** — Per-story checkboxes from acceptance criteria
6. **Key Features Demonstrated** — Feature matrix
7. **Troubleshooting** — Problem/solution pairs
8. **Agent-Browser Automation Gotchas** — Selectors, timing, session tips
9. **Gap Analysis** — Stories vs implementation matrix

## Workflow Summary

1. Discover milestones in `docs/planning/milestones/`
2. Inventory artifacts (stories, subtasks, progress, gaps)
3. Read all stories — extract narratives, acceptance criteria, tasks
4. Check subtask completion via `aaa ralph status`
5. Analyze git changes — detect unplanned work, missing features
6. Gather setup context from README, package.json, scripts
7. Write GUIDE.md following reference guide structure
8. Present summary and suggest `/run-guide-and-fix`

## Reference Guides

Gold-standard examples that define the target quality:

- `docs/planning/milestones/layer-hierarchy/step-by-step.md` (1011 lines)
- `docs/planning/milestones/reports-drill-down/step-by-step.md` (831 lines)

## Companion Skill

After generating a guide, validate it with `/run-guide-and-fix` which walks through every step using `agent-browser`.

## Skill File

`.claude/skills/write-guide/SKILL.md`
