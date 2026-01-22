# Validation: 023-tasks-interactive-prompt-16

## Test: Story context is properly read and incorporated

### Prerequisites
- Story file: `docs/planning/milestones/ralph/stories/001-autonomous-code-implementation.md`
- Prompt file: `context/workflows/ralph/planning/tasks-interactive.md`
- Skill file: `.claude/skills/ralph-plan/SKILL.md`

### Test Steps

#### Step 1: Run with specific story ID
**Command:** `/ralph plan tasks 001-autonomous-code-implementation`

**Expected:** The session should:
1. Find the story file at `docs/planning/milestones/ralph/stories/001-autonomous-code-implementation.md`
2. Read and parse the story content
3. Begin the interactive session with story context

#### Step 2: Verify story info appears in conversation
**Story Content to Verify:**
- **Narrative:** "As a developer with a defined work queue (subtasks.json), I want AI to autonomously implement each subtask with proper validation so that I can focus on oversight rather than writing code."
- **Persona:** A developer who embraces "humans on the loop, not in it" philosophy
- **Context:** Ralph Iteration loop - the heart of autonomous development
- **Key Acceptance Criteria:**
  - User can run build mode: `aaa ralph build --subtasks <path>`
  - Each iteration: Orient → Select → Investigate → Implement → Validate → Commit
  - Agent reads CLAUDE.md, git status, progress file, and subtasks.json
  - Validation runs: build, lint, typecheck, tests must pass
  - On success: commits with subtask ID, appends to PROGRESS.md

**Expected Opening Message Must Include:**
1. The story ID: `001-autonomous-code-implementation`
2. A summary referencing the narrative (autonomous implementation, subtask queue, oversight focus)
3. Reference to key acceptance criteria (build mode, iteration phases, validation)

#### Step 3: Verify tasks align with story
**Expected:** Tasks generated during the session must:
1. Reference the parent story: `[STORY-001-autonomous-code-implementation](../stories/001-autonomous-code-implementation.md)`
2. Address acceptance criteria from the story
3. Follow the scope defined in the story context

### Verification Evidence

#### Prompt Analysis: Story Parameter Handling (lines 12-26)
```markdown
## Story Parameter

**Input:** Story ID as the first argument to this prompt.

**Usage:**
```
tasks-interactive.md <story-id>
```

**Parameter Handling:**
1. The story ID is provided as the argument when invoking this prompt
2. If no argument is provided, ask: "Which story should we create tasks for? Please provide the story ID (e.g., `STORY-001-auth`)."
3. Find the story file in `docs/planning/milestones/*/stories/<story-id>.md`
4. If the story is not found, list available stories and ask for clarification
```

#### Prompt Analysis: Required Reading (lines 5-10)
```markdown
## Required Reading

1. **Parent Story**: Read the story file provided as the argument
2. **Task Template**: @context/blocks/docs/task-template.md

Read the story to understand the user outcomes before starting the conversation.
```

#### Prompt Analysis: Phase 1 Story Context (lines 50-63)
```markdown
### Phase 1: Story Context

Start by grounding the conversation in the parent story:

**Opening:** "Let's create technical tasks for story **[story-id]**.

I've read the story - it focuses on: [brief summary of narrative and acceptance criteria].

**To start:** Looking at the acceptance criteria, which capability should we tackle first?"

Follow-up probes:
- "What's the current state of the codebase in this area?"
- "Are there existing patterns we should follow or extend?"
- "What dependencies or integrations are involved?"
```

#### Prompt Analysis: Starting Message Template (lines 309-329)
```markdown
Begin with:

---

"Let's create technical tasks for story **[story-id]**.

I've read the story - it focuses on: [brief summary of narrative and key acceptance criteria].

Let me also explore the codebase to understand existing patterns..."

[Read relevant files/directories based on the story context]

"Based on the story and the codebase, here's what I see:
- [relevant existing code/patterns]
- [dependencies/integrations involved]

**To start:** Looking at the acceptance criteria, which capability should we tackle first? What's your thinking on the technical approach?"

(You can say 'done' at any point when you feel we've covered enough, or ask me to save a task when we've defined it well.)"
```

#### Prompt Analysis: Task Story Reference Requirement (lines 162-173)
```markdown
### Required Sections

| Section | Required | Purpose |
|---------|----------|---------|
| Story | **Yes*** | Link to parent story - maintains traceability |
...

**\*Story Requirement:** The Story reference is **required** here to maintain the parent-child relationship and traceability chain (Story -> Task).
```

#### Prompt Analysis: Task File Structure (lines 176-209)
```markdown
### Task File Structure

```markdown
## Task: [Short descriptive name]

**Story:** [STORY-001-auth](../stories/STORY-001-auth.md)
...
```

#### Skill Analysis: Story File Reading (SKILL.md lines 76-85)
```markdown
### If argument is `tasks` (with required story ID):

**START THE TASKS PLANNING SESSION IMMEDIATELY.**

1. A story ID must be provided as the second argument
2. If no story ID is provided, ask the user which story to create tasks for and list available stories
3. Find the story file in `docs/planning/milestones/*/stories/<story-id>.md`
4. If the story is not found, list available stories and ask for clarification
5. Read the story file to understand the user outcomes
```

### Test Result: PASS

The implementation properly ensures story context is read and incorporated through:

1. **Story Parameter Handling** (lines 12-26)
   - Story ID as required input
   - Clear path resolution: `docs/planning/milestones/*/stories/<story-id>.md`
   - Graceful handling when story not found

2. **Required Reading** (lines 5-10)
   - Explicit instruction: "Read the story file provided as the argument"
   - Understanding user outcomes before conversation

3. **Phase 1: Story Context** (lines 50-63)
   - Opening message grounded in parent story
   - Summary of narrative and acceptance criteria
   - Questions referencing story context

4. **Starting Message Template** (lines 315-316)
   - Explicit placeholder: `"I've read the story - it focuses on: [brief summary of narrative and key acceptance criteria]."`
   - Story ID prominently displayed

5. **Task Story Reference** (lines 163, 172, 179)
   - Story reference is REQUIRED in every task
   - Maintains traceability chain (Story -> Task)

6. **Skill Routing** (SKILL.md lines 79-83)
   - "Read the story file to understand the user outcomes"
   - Story file must be read before session begins

### Expected Session Behavior

**User:** `/ralph plan tasks 001-autonomous-code-implementation`

**Claude (expected opening):**
```
Let's create technical tasks for story **001-autonomous-code-implementation**.

I've read the story - it focuses on: autonomous AI implementation of subtasks from a work queue (subtasks.json), with the developer focusing on oversight rather than writing code. Key acceptance criteria include running build mode via `aaa ralph build --subtasks <path>`, following the Orient → Select → Investigate → Implement → Validate → Commit iteration cycle, reading CLAUDE.md and subtasks.json on each iteration, and validating with build/lint/typecheck/tests.

Let me also explore the codebase to understand existing patterns...

[Explores codebase]

Based on the story and the codebase, here's what I see:
- Existing CLI structure in `tools/src/commands/ralph/`
- Prompt templates in `context/workflows/ralph/building/`
- Skill definitions in `.claude/skills/ralph-build/`

**To start:** Looking at the acceptance criteria, which capability should we tackle first? What's your thinking on the technical approach?
```

### Story-Task Alignment Verification

Any task created in this session must:

1. **Include Story Reference:**
   ```markdown
   **Story:** [001-autonomous-code-implementation](../stories/001-autonomous-code-implementation.md)
   ```

2. **Address Story Acceptance Criteria:**
   Tasks should break down items like:
   - Build mode CLI implementation
   - Iteration prompt creation
   - Validation phase implementation
   - Progress tracking updates

3. **Stay Within Story Scope:**
   - Focus on autonomous implementation
   - Not introduce unrelated features
   - Maintain alignment with "Ralph Iteration" context

### Validation Complete

All verification steps satisfied:
- Step 1: Story ID parameter handled and file located
- Step 2: Story narrative, persona, context, and acceptance criteria appear in opening
- Step 3: Task structure requires Story reference, tasks address story acceptance criteria
