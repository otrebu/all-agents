## Story: Automated Planning Pipeline

### Narrative
As a developer with an established vision and roadmap, I want to automatically generate stories, tasks, and subtasks so that I can quickly build an actionable work queue without manual documentation.

### Persona
A developer who has already defined their vision and wants to move fast. They trust AI to break down requirements into implementable units. They prefer reviewing generated output over manual creation.

### Context
Auto-generation enables rapid pipeline from Vision → Roadmap → Stories → Tasks → Subtasks. Each level reads upstream docs plus codebase to generate best-guess artifacts. Human reviews output rather than guiding creation.

### Acceptance Criteria
- [ ] User can auto-generate roadmap from vision: `aaa ralph plan roadmap --auto`
- [ ] Skill equivalent: /ralph plan roadmap --auto
- [ ] User can auto-generate stories from roadmap: `aaa ralph plan stories --auto --milestone <name>`
- [ ] Skill equivalent: /ralph plan stories --auto
- [ ] User can auto-generate tasks from stories: `aaa ralph plan tasks --auto --story <id>`
- [ ] Skill equivalent: /ralph plan tasks --auto
- [ ] User can auto-generate subtasks from tasks: `aaa ralph plan subtasks --auto --task <id>`
- [ ] Skill equivalent: /ralph plan subtasks --auto
- [ ] Subtasks can be generated at milestone level: `aaa ralph plan subtasks --auto --milestone <name>`
- [ ] Each level reads appropriate upstream docs; Tasks and Subtasks also read codebase
- [ ] Generated artifacts follow schema and template formats
- [ ] Single-shot execution (one prompt → one response → artifacts created)
- [ ] Generated subtasks sized to fit single context window (init + gather + implement + test + commit)

### Tasks
- [ ] [TASK-007: Create roadmap-auto.md prompt](../tasks/007-Create%20roadmap-auto.md%20prompt.md)
- [ ] [TASK-013: Create stories-auto.md prompt](../tasks/013-Create%20stories-auto.md%20prompt.md)
- [ ] [TASK-014: Create tasks-auto.md prompt](../tasks/014-Create%20tasks-auto.md%20prompt.md)
- [ ] [TASK-015: Create subtasks-auto.md prompt](../tasks/015-Create%20subtasks-auto.md%20prompt.md)

### Notes
- Subtasks ALWAYS use auto mode (never interactive)
- Subtasks must fit in single context window (size constraint)
- Reference: VISION.md sections 3.1 (Automation Levels) and 8.1 (Prompts Location)
- Roadmap auto-generation is "risky" per VISION.md - consider interactive mode for high-level decisions
