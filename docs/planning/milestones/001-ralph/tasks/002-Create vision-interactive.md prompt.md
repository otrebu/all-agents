## Task: Create vision-interactive.md prompt

**Story:** [interactive-vision-planning](../stories/003-interactive-vision-planning.md)

### Goal
Create a Socratic prompt that guides users through collaborative vision planning for their projects.

### Context
Vision planning is the foundation of Ralph's planning hierarchy (VISION -> Roadmap -> Milestone -> Story -> Task -> Subtask). It's unique in being ALWAYS interactive (never auto) because establishing intent requires human judgment. The prompt must guide tech leads through articulating what an application IS and WILL BECOME.

Reference: VISION.md sections 3.1 (Planning Mode) and 8.3 (Prompts)

### Plan
1. Create directory structure: `context/workflows/ralph/planning/`
2. Create `vision-interactive.md` prompt file
3. Design Socratic questioning flow:
   - Product purpose and problem being solved
   - Target users and their needs (JTBD approach)
   - Key capabilities and features
   - What the app IS vs WILL BECOME
   - Success criteria and constraints
4. Include instructions for creating/updating `docs/planning/VISION.md`
5. Ensure multi-turn interactive session design (not single-shot)

### Acceptance Criteria
- [ ] `context/workflows/ralph/planning/vision-interactive.md` exists
- [ ] Prompt uses Socratic method with clarifying questions
- [ ] Prompt covers product purpose, target users, and key capabilities
- [ ] Prompt guides defining what app IS and WILL BECOME
- [ ] Prompt instructs Claude to create/update `docs/planning/VISION.md`
- [ ] Prompt supports multi-turn interactive sessions
- [ ] User can exit session manually when satisfied
- [ ] No `--auto` mode supported (vision is always interactive)

### Test Plan
- [ ] Manual test: Run prompt in Claude Code session and verify it asks appropriate questions
- [ ] Manual test: Verify VISION.md is created with required sections
- [ ] Manual test: Verify multi-turn conversation flow works (not single-shot)

### Scope
- **In:** The interactive prompt file, Socratic questioning flow, VISION.md output format
- **Out:** CLI implementation (separate task), skill file (separate task), auto mode

### Notes
- This is the ONLY planning level that's always interactive (never auto)
- The prompt should feel like working with a thoughtful colleague, not a form
- Consider referencing the vocabulary hierarchy from VISION.md Section 1
- Prompt format uses `@path` references resolved by Claude Code (no preprocessing)
