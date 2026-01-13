## Story: Interactive Planning for Roadmap, Stories, and Tasks

### Narrative
As a developer refining my project structure, I want AI-guided interactive sessions for roadmap, stories, and tasks so that I can collaboratively define these artifacts with Socratic questioning rather than reviewing auto-generated output.

### Persona
A developer who values collaborative thinking over review-and-approve. They want the AI to ask clarifying questions, surface tradeoffs, and guide them through decisions. They work iteratively, refining ideas through dialogue.

### Context
While auto-generation (Story 004) is faster, interactive planning produces higher quality artifacts through human-AI collaboration. The AI asks questions, challenges assumptions, and helps the developer think through implications. This complements vision planning (always interactive) and auto-generation (faster but less refined).

### Acceptance Criteria
- [ ] User can start interactive roadmap planning: `aaa ralph plan roadmap` or `/ralph plan roadmap`
- [ ] User can start interactive story planning: `aaa ralph plan stories --milestone <name>` or `/ralph plan stories`
- [ ] User can start interactive task planning: `aaa ralph plan tasks --story <id>` or `/ralph plan tasks`
- [ ] AI asks clarifying questions about scope, priorities, and tradeoffs
- [ ] AI guides user through JTBD (Jobs To Be Done) for stories
- [ ] AI helps break down stories into technical tasks
- [ ] Sessions are multi-turn interactive (user exits when satisfied)
- [ ] Generated artifacts follow schema and template formats
- [ ] Full tool access during session (no restrictions)

### Tasks
- [ ] [TASK-016: Create roadmap-interactive.md prompt](../tasks/016-Create%20roadmap-interactive.md%20prompt.md)
- [ ] [TASK-022: Create stories-interactive.md prompt](../tasks/022-Create%20stories-interactive.md%20prompt.md)
- [ ] [TASK-023: Create tasks-interactive.md prompt](../tasks/023-Create%20tasks-interactive.md%20prompt.md)

### Notes
- Interactive is default mode (no flag needed); `--auto` switches to auto mode
- Roadmap auto is marked "risky" in VISION.md - interactive is preferred
- Prompts should use Socratic method like vision-interactive.md
- Reference: VISION.md sections 3.1 (Automation Levels) and 8.1 (Prompts Location)
