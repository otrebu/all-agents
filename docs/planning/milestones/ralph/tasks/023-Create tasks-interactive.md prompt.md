## Task: Create tasks-interactive.md prompt

**Story:** [interactive-planning-guidance](../stories/009-interactive-planning-guidance.md)

### Goal
Create a Socratic-style prompt that guides developers through interactive task planning, helping break down stories into technical implementation tasks with AI-assisted questioning.

### Context
Tasks bridge the gap between user-facing stories and technical implementation. Interactive mode helps developers think through the technical approach, identify dependencies, and surface potential risks before committing to a plan. The AI should guide technical decomposition while referencing the codebase to ground suggestions in reality.

### Plan
1. Review vision-interactive.md, roadmap-interactive.md, and stories-interactive.md for Socratic patterns
2. Draft tasks-interactive.md prompt at `context/workflows/ralph/planning/`
3. Include technical breakdown guidance for:
   - Understanding the story's acceptance criteria
   - Exploring implementation approaches and tradeoffs
   - Identifying technical dependencies and blockers
   - Breaking work into appropriately-sized tasks
   - Defining clear acceptance criteria for each task
   - Referencing codebase context (existing patterns, files to modify)
4. Ensure prompt generates artifacts following task schema format
5. Test prompt in interactive session

### Acceptance Criteria
- [ ] Prompt file exists at `context/workflows/ralph/planning/tasks-interactive.md`
- [ ] AI helps break down stories into technical tasks
- [ ] AI asks clarifying questions about technical approach and tradeoffs
- [ ] Multi-turn conversation flow (user exits when satisfied)
- [ ] Codebase is referenced for context (existing patterns, related files)
- [ ] Generated tasks follow schema format from VISION.md
- [ ] Full tool access during session (no restrictions)
- [ ] Invocable via `aaa ralph plan tasks --story <id>` or `/ralph plan tasks`

### Test Plan
- [ ] Run interactive session with sample story
- [ ] Verify AI explores technical approaches before committing
- [ ] Confirm codebase references are incorporated (file paths, patterns)
- [ ] Confirm output matches task schema structure
- [ ] Test story context is properly read and incorporated

### Scope
- **In:** tasks-interactive.md prompt, technical breakdown guidance, task schema compliance
- **Out:** tasks-auto.md (separate task), subtasks-auto.md (always auto), CLI command implementation (Story 004)

### Notes
- Tasks read from Stories + codebase to understand implementation context
- Task sizing should consider what can be done in a single AI iteration
- Reference VISION.md sections 3.1 (Automation Levels) and 8.1 (Prompts Location)
- Both interactive and auto modes are valid for tasks
- Subtasks are always auto-generated (no interactive mode) - see VISION.md
