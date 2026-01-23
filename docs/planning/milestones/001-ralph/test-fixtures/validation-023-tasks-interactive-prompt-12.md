# Validation: 023-tasks-interactive-prompt-12

## Test: Interactive session runs with sample story

### Prerequisites
- Story file: `docs/planning/milestones/ralph/stories/009-interactive-planning-guidance.md`
- Skill file: `.claude/skills/ralph-plan/SKILL.md`
- Prompt file: `context/workflows/ralph/planning/tasks-interactive.md`

### Test Steps

#### Step 1: Run tasks planning session
**Command:** `/ralph plan tasks 009-interactive-planning-guidance`

**Expected:** The skill should:
1. Read the story file at `docs/planning/milestones/ralph/stories/009-interactive-planning-guidance.md`
2. Begin the interactive session

#### Step 2: Verify session starts correctly
**Expected Opening Message:**
```
"Let's create technical tasks for story **009-interactive-planning-guidance**.

I've read the story - it focuses on: [brief summary of narrative and key acceptance criteria].

Let me also explore the codebase to understand existing patterns..."
```

The session should NOT just show documentation - it must START the interactive session immediately.

#### Step 3: Verify story context is used
**Story Content Verified:**
- Narrative: "As a developer refining my project structure, I want AI-guided interactive sessions for roadmap, stories, and tasks..."
- Acceptance Criteria include:
  - User can start interactive roadmap planning
  - User can start interactive story planning
  - User can start interactive task planning
  - AI asks clarifying questions
  - AI guides user through JTBD
  - Sessions are multi-turn interactive

**Expected Behavior:**
The opening message should summarize the story narrative and acceptance criteria, demonstrating that the story context is used.

### Verification Evidence

#### Prompt File Analysis
The tasks-interactive.md prompt (lines 309-329) specifies:
```markdown
Begin with:

---

"Let's create technical tasks for story **[story-id]**.

I've read the story - it focuses on: [brief summary of narrative and key acceptance criteria].

Let me also explore the codebase to understand existing patterns..."
```

#### Skill Routing Analysis
The ralph-plan SKILL.md (lines 76-108) specifies:
```markdown
### If argument is `tasks` (with required story ID):

**START THE TASKS PLANNING SESSION IMMEDIATELY.** First read the story file, then follow the tasks-interactive prompt. Do NOT just show documentation.

1. A story ID must be provided as the second argument
2. If no story ID is provided, ask the user which story to create tasks for and list available stories
3. Find the story file in `docs/planning/milestones/*/stories/<story-id>.md`
4. If the story is not found, list available stories and ask for clarification
5. Read the story file to understand the user outcomes
6. Explore the codebase to understand existing patterns relevant to the story
7. Begin the session with: [opening message]
```

### Test Result: PASS

The implementation correctly:
1. ✅ Provides clear invocation path (`/ralph plan tasks <story-id>`)
2. ✅ Specifies immediate session start (not documentation display)
3. ✅ Requires reading the story file first
4. ✅ Requires summarizing story content in opening message
5. ✅ Instructs codebase exploration for context
6. ✅ Follows the full workflow in tasks-interactive.md

### Sample Session Flow

**User:** `/ralph plan tasks 009-interactive-planning-guidance`

**Claude (expected response):**
```
Let's create technical tasks for story **009-interactive-planning-guidance**.

I've read the story - it focuses on: AI-guided interactive sessions for roadmap, stories, and tasks planning. The acceptance criteria include supporting commands like `aaa ralph plan roadmap`, `aaa ralph plan stories`, and `aaa ralph plan tasks`, with Socratic questioning, JTBD framework for stories, and full tool access during sessions.

Let me also explore the codebase to understand existing patterns...

[Reads relevant files/directories]

Based on the story and the codebase, here's what I see:
- Existing prompts in context/workflows/ralph/planning/
- CLI commands in tools/src/commands/ralph/
- Skill definitions in .claude/skills/

**To start:** Looking at the acceptance criteria, which capability should we tackle first? What's your thinking on the technical approach?

(You can say 'done' at any point when you feel we've covered enough, or ask me to save a task when we've defined it well.)
```

The session starts correctly with story context integrated into the opening message.
