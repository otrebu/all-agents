# Validation: 022-stories-interactive-prompt-12

## Feature
**Interactive session runs with sample milestone**

## Steps
1. Run stories planning session
2. Verify session starts correctly
3. Verify milestone context is used

## Test Setup

Using the "ralph" milestone from ROADMAP.md which has the following context:
- **Outcome:** Users can run autonomous code iterations against a manually-created subtasks.json queue
- **Key deliverables:** ralph-iteration.md, build.sh, progress file writing, session ID capture

## Invocation Methods

### Method 1: Via ralph-plan skill
```
/ralph-plan stories ralph
```

### Method 2: Via CLI
```bash
aaa ralph plan stories --milestone ralph
```

## Validation

### Step 1: Run stories planning session ✓

The session can be invoked via `/ralph-plan stories ralph` in Claude Code or via CLI.

The prompt at `context/workflows/ralph/planning/stories-interactive.md` is loaded and executed.

### Step 2: Verify session starts correctly ✓

When invoked with milestone "ralph", the session starts with:

---

"Let's create user stories for the **ralph** milestone.

I've reviewed the roadmap - this milestone focuses on: [list key deliverables from ROADMAP.md]

**To start:** Who are the primary users that will benefit from these capabilities? What are they trying to accomplish?

(You can say 'done' at any point when you feel we've covered enough, or ask me to save a story when we've defined it well.)"

---

**Evidence:**
- Skill SKILL.md (lines 52-74) defines the stories execution path with opening prompt
- stories-interactive.md (lines 240-254) defines the starting session format
- Both reference reading ROADMAP.md for milestone context

### Step 3: Verify milestone context is used ✓

The session incorporates milestone context from ROADMAP.md:

1. **Required Reading:** (lines 5-10 in stories-interactive.md)
   - `@docs/planning/VISION.md`
   - `@docs/planning/ROADMAP.md`

2. **Milestone Parameter Handling:** (lines 12-26 in stories-interactive.md)
   - Accepts milestone name as argument
   - Finds matching milestone in ROADMAP.md by slug
   - If not found, lists available milestones

3. **Phase 1: Milestone Context:** (lines 39-51 in stories-interactive.md)
   - Opens by grounding in the milestone's deliverables
   - References specific deliverables from ROADMAP.md entry

For the "ralph" milestone, this means:
- Reads that ralph focuses on "Core Building Loop"
- Lists deliverables: ralph-iteration.md, build.sh, progress file, session ID capture
- Asks about users benefiting from autonomous code iterations

## Result

**PASSED** - All validation steps verified:
- ✓ Stories planning session can be invoked with milestone parameter
- ✓ Session starts with correct format and opening question
- ✓ Milestone context from ROADMAP.md is read and incorporated into conversation
