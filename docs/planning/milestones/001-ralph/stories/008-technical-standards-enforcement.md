## Story: Technical Standards Enforcement

### Narrative
As a developer maintaining technical quality, I want to detect when code violates documented standards and patterns so that I can maintain consistency across autonomous implementations.

### Persona
A developer who has invested in technical documentation (@context blocks, foundations, stacks). They expect code to follow these patterns. They want automated enforcement, not manual review of every change.

### Context
Technical drift occurs when implementations deviate from documented patterns - using wrong libraries, ignoring conventions, or duplicating instead of reusing. This checks code against the docs referenced in subtask's `filesToRead` field.

### Acceptance Criteria
- [ ] User can run technical drift check: `aaa ralph calibrate technical`
- [ ] System reads git diffs via `commitHash` from completed subtasks
- [ ] System reads documentation from subtask's `filesToRead` references
- [ ] LLM-as-judge compares changes against documented standards
- [ ] Escape hatch: `// HUMAN APPROVED: reason` comments are ignored
- [ ] Output: summary in stdout + task files if violations found
- [ ] Can run standalone or as part of `ralph calibrate all`
- [ ] Skill equivalent: /ralph calibrate technical
- [ ] User can run all calibration checks: aaa ralph calibrate all

### Tasks
- [ ] [TASK-021: Create technical-drift.md prompt](../tasks/021-Create%20technical-drift.md%20prompt.md)

**Shared Tasks from Story 002 (Calibration & Quality Gates):**
- TASK-010: `calibrate.sh` script - provides `aaa ralph calibrate technical` CLI command
- TASK-012: `ralph-calibrate` skill - provides `/ralph-calibrate technical` skill invocation

These shared tasks implement the CLI and skill infrastructure that all calibration types use, including technical standards enforcement.

### Notes
- Uses the same docs the implementation agent read during build
- Prompt includes few-shot examples of violations vs acceptable variations
- Reference: VISION.md section 3.3 (Technical Drift) and 8.8
