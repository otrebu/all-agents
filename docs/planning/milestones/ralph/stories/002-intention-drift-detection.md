## Story: Intention Drift Detection

### Narrative
As a tech lead overseeing autonomous development, I want to detect when implemented code diverges from intended behavior so that I can correct course before drift compounds.

### Persona
A tech lead or architect who sets the vision but delegates implementation. They need governance without micromanagement. They trust the system to flag problems rather than reviewing every commit.

### Context
Autonomous agents can subtly drift from intent - implementing related but unintended features, over-engineering, or missing the point. Calibration runs as a separate loop (not inline with build iterations), comparing code changes against the intent chain: Vision → Story → Task → Subtask.

### Acceptance Criteria
- [ ] User can run intention drift check: `aaa ralph calibrate intention`
- [ ] System reads git diffs via `commitHash` from completed subtasks
- [ ] System analyzes full chain: Vision → Story → Task → Subtask → code changes
- [ ] LLM-as-judge evaluates: Does code faithfully implement parent intent?
- [ ] Vision includes "don't jump ahead" guard - won't flag future planned work
- [ ] Output: summary in stdout + task files if divergence found
- [ ] Can run after N iterations or after milestone completion
- [ ] Skill equivalent: /ralph calibrate intention

### Tasks
- [ ] [TASK-004: Create intention-drift.md prompt](../tasks/004-Create%20intention-drift.md%20prompt.md)
- [ ] [TASK-010: Implement calibrate.sh script](../tasks/010-Implement%20calibrate.sh%20script.md)
- [ ] [TASK-012: Create ralph-calibrate SKILL.md](../tasks/012-Create%20ralph-calibrate%20SKILL.md.md)

### Notes
- Uses few-shot examples of drift vs acceptable variation
- Graceful degradation: validates what exists (partial chains OK)
- Not inline - runs as separate calibration loop
- Reference: VISION.md section 3.3 (Calibration Mode) and 8.4, 8.8
