## Task: Create stories-interactive.md prompt

**Story:** [interactive-planning-guidance](../stories/009-interactive-planning-guidance.md)

### Goal
Create a Socratic-style prompt that guides developers through interactive story planning using JTBD (Jobs To Be Done) methodology with AI-assisted questioning.

### Context
Stories define user-facing value within a milestone. Interactive mode helps developers think through the "job" the user is trying to accomplish rather than jumping straight to features. The prompt should guide users through JTBD thinking - understanding user motivations, desired outcomes, and success criteria before defining acceptance criteria.

### Plan
1. Review vision-interactive.md and roadmap-interactive.md for Socratic patterns
2. Draft stories-interactive.md prompt at `context/workflows/ralph/planning/`
3. Include JTBD guidance prompts for:
   - Identifying the user/persona and their context
   - Understanding the "job" they're trying to accomplish
   - Exploring what "done" looks like from user perspective
   - Defining acceptance criteria collaboratively
   - Linking story to milestone context
4. Ensure prompt generates artifacts following story schema format
5. Test prompt in interactive session

### Acceptance Criteria
- [ ] Prompt file exists at `context/workflows/ralph/planning/stories-interactive.md`
- [ ] AI guides user through JTBD (Jobs To Be Done) thinking
- [ ] AI asks clarifying questions about scope, priorities, and tradeoffs
- [ ] Multi-turn conversation flow (user exits when satisfied)
- [ ] Generated stories follow schema format from VISION.md
- [ ] Full tool access during session (no restrictions)
- [ ] Invocable via `aaa ralph plan stories --milestone <name>` or `/ralph plan stories`

### Test Plan
- [ ] Run interactive session with sample milestone
- [ ] Verify AI asks JTBD-style questions (who, what job, what outcome)
- [ ] Confirm output matches story schema structure
- [ ] Test milestone context is properly read and incorporated

### Scope
- **In:** stories-interactive.md prompt, JTBD guidance flow, story schema compliance
- **Out:** stories-auto.md (separate task), CLI command implementation (Story 004)

### Notes
- Stories read from Vision + Roadmap to understand milestone context
- JTBD format: "When [situation], I want to [motivation], so I can [expected outcome]"
- Reference VISION.md sections 3.1 (Automation Levels) and 8.1 (Prompts Location)
- Both interactive and auto modes are valid for stories (unlike roadmap where auto is "risky")
