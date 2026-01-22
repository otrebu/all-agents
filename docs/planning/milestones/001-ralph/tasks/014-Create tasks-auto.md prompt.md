## Task: Create tasks-auto.md prompt

**Story:** [automated-planning-pipeline](../stories/004-automated-planning-pipeline.md)

### Goal
A prompt file exists at `context/workflows/ralph/planning/tasks-auto.md` that enables automatic task generation from stories and codebase analysis.

### Context
The automated planning pipeline generates tasks from stories. Tasks are technical "how" artifacts that break down a story into implementable units. Unlike stories (which only read planning docs), tasks auto-generation also reads the codebase to understand current implementation state and generate realistic technical tasks.

Per VISION.md section 3.1 (Automation Levels), tasks auto-generation reads "Stories + codebase" for context.

CLI trigger: `aaa ralph plan tasks --auto --story <id>`
Skill equivalent: `/ralph plan tasks --auto`

### Plan
1. Ensure directory structure `context/workflows/ralph/planning/` exists
2. Draft the `tasks-auto.md` prompt with:
   - Required reading: Parent story file (via story ID parameter) and codebase (per VISION.md section 3.1: "Tasks read Stories + codebase")
   - Codebase analysis instructions (read relevant source files)
   - Instructions to generate technical tasks
   - Output format matching task template
3. Validate prompt structure and @path references
4. Manual test: Execute prompt with Claude to verify task file structure

### Acceptance Criteria
- [ ] Prompt file exists at `context/workflows/ralph/planning/tasks-auto.md`
- [ ] Prompt reads parent story via story ID parameter
- [ ] Prompt analyzes codebase to inform task generation
- [ ] Generated tasks follow task template format (`context/blocks/docs/task-template.md`)
- [ ] Each task has: Goal, Context, Plan, Acceptance Criteria, Test Plan, Scope, Notes
- [ ] Single-shot execution: one prompt -> one response -> task files created
- [ ] Tasks reference parent story (per VISION.md constraints)
- [ ] Tasks have unique IDs (e.g., `TASK-001`)

### Test Plan
- [ ] Verify prompt file exists at `context/workflows/ralph/planning/tasks-auto.md`
- [ ] Verify prompt reads parent story via story ID parameter (NOT Vision/Roadmap directly - per VISION.md section 3.1)
- [ ] Verify prompt includes codebase analysis instructions
- [ ] Verify prompt output format matches task template (`context/blocks/docs/task-template.md`)
- [ ] Verify prompt generates technical "how" descriptions with: Goal, Context, Plan, Acceptance Criteria, Test Plan, Scope, Notes
- [ ] Manual test: Copy prompt content and execute with Claude to validate task structure

### Scope
- **In:** The tasks-auto.md prompt file, @path references, codebase reading instructions
- **Out:** Interactive task planning (that's tasks-interactive.md), CLI implementation, subtask generation

### Notes
- Tasks can be "orphan" (no story parent) for tech-only work, but this prompt assumes story context
- Codebase reading is critical - tasks should align with existing code patterns
- Task template location: `context/blocks/docs/task-template.md`
- Reference VISION.md section 8.7 (Implementation Order) - tasks-auto is P2 priority
- Tasks are the level before subtasks, so they should be specific enough to break into atomic units
- CLI and skill equivalents (`/ralph plan tasks --auto`) will be addressed in a separate shared skill task
