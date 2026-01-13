## Story: Interactive Vision Planning

### Narrative
As a tech lead starting a new project, I want to collaboratively define the product vision with AI guidance so that I establish a clear direction before autonomous development begins.

### Persona
A tech lead or architect who needs to articulate what an application IS and WILL BECOME. They think strategically but may not have time to write formal documentation. They value Socratic questioning that helps them think through their vision.

### Context
Vision is the foundation of Ralph's planning hierarchy. It's always interactive (never auto) because establishing intent requires human judgment. The vision document evolves as milestones complete.

### Acceptance Criteria
- [ ] User can start vision planning with `/ralph plan vision` skill or `aaa ralph plan vision` CLI
- [ ] AI asks clarifying questions about product purpose, target users, and key capabilities
- [ ] AI guides user through defining what the app IS and WILL BECOME
- [ ] Vision document is created/updated at `docs/planning/VISION.md`
- [ ] Session is multi-turn interactive (not single-shot)
- [ ] User exits session manually when satisfied

### Tasks
- [ ] [TASK-002: Create vision-interactive.md prompt](../tasks/002-Create%20vision-interactive.md%20prompt.md)
- [ ] [TASK-011: Create ralph-plan SKILL.md](../tasks/011-Create%20ralph-plan%20SKILL.md.md)
- [ ] [TASK-028: Implement ralph plan vision CLI](../tasks/028-Implement%20ralph%20plan%20vision%20CLI.md)

### Notes
- Entry point is Vision level in the planning hierarchy
- This is the only planning level that's ALWAYS interactive (never auto)
- Prompt should use Socratic method to guide thinking
- Reference: VISION.md sections 3.1 (Planning Mode) and 8.3 (Prompts)
