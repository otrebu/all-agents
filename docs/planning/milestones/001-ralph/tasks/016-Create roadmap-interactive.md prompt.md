## Task: Create roadmap-interactive.md prompt

**Story:** [interactive-planning-guidance](../stories/009-interactive-planning-guidance.md)

### Goal
Create a Socratic-style prompt that guides developers through interactive roadmap planning with AI-assisted questioning and tradeoff exploration.

### Context
Roadmap auto-generation is marked as "risky" in VISION.md because roadmaps require deep understanding of priorities, dependencies, and business context. Interactive mode is preferred for roadmaps. The prompt should follow the same Socratic method used in vision-interactive.md, asking clarifying questions and helping the developer think through implications.

### Plan
1. Review vision-interactive.md prompt structure (once created) for Socratic patterns
2. Draft roadmap-interactive.md prompt at `context/workflows/ralph/planning/`
3. Include prompts for:
   - Understanding project goals and current state
   - Identifying milestone candidates and priorities
   - Exploring dependencies between milestones
   - Discussing timeline and resource constraints
   - Surfacing tradeoffs and risks
4. Ensure prompt generates artifacts following roadmap schema format
5. Test prompt in interactive session

### Acceptance Criteria
- [ ] Prompt file exists at `context/workflows/ralph/planning/roadmap-interactive.md`
- [ ] AI asks clarifying questions about scope, priorities, and tradeoffs
- [ ] Multi-turn conversation flow (user exits when satisfied)
- [ ] Generated roadmap follows schema format from VISION.md
- [ ] Full tool access during session (no restrictions)
- [ ] Invocable via `aaa ralph plan roadmap` or `/ralph plan roadmap`

### Test Plan
- [ ] Run interactive session with sample project
- [ ] Verify AI asks meaningful questions before generating
- [ ] Confirm output matches roadmap schema structure
- [ ] Test early exit mid-session works correctly

### Scope
- **In:** roadmap-interactive.md prompt, Socratic questioning flow, roadmap schema compliance
- **Out:** roadmap-auto.md (separate task), CLI command implementation (Story 004)

### Notes
- Roadmap is positioned between Vision (high-level) and Stories (specific features)
- Reference VISION.md sections 3.1 (Automation Levels) and 8.1 (Prompts Location)
- Auto mode for roadmap is "risky" - interactive is the preferred approach
- Prompt should help surface what milestones emerge from vision, not impose structure
