## Task: Create subtasks-auto.md prompt

**Story:** [automated-planning-pipeline](../stories/004-automated-planning-pipeline.md)

### Goal
A prompt file exists at `context/workflows/ralph/planning/subtasks-auto.md` that enables automatic subtask generation from tasks and codebase analysis.

### Context
Subtasks are the atomic implementation units that Ralph iterations execute. They are ALWAYS auto-generated (never interactive) because they require detailed codebase analysis to be properly sized. Each subtask must fit the entire implementation cycle in one context window: init + gather + implement + test + commit.

Per VISION.md section 3.1 (Automation Levels), subtasks are "always auto" with no interactive mode. They read "Tasks + codebase" for context.

CLI triggers:
- `aaa ralph plan subtasks --auto --task <id>` - generate from single task
- `aaa ralph plan subtasks --auto --milestone <name>` - generate for entire milestone

Skill equivalent: `/ralph plan subtasks --auto`

### Plan
1. Ensure directory structure `context/workflows/ralph/planning/` exists
2. Draft the `subtasks-auto.md` prompt with:
   - Required reading: Parent task file, parent story (if exists), Vision
   - Deep codebase analysis instructions
   - Sizing constraints (must fit single context window)
   - Instructions to populate `filesToRead` field
   - Output format matching subtasks.json schema
3. Test with `ralph plan subtasks --auto --task 001 -p`
4. Validate generated subtasks.json against schema

### Acceptance Criteria
- [ ] Prompt file exists at `context/workflows/ralph/planning/subtasks-auto.md`
- [ ] Prompt reads parent task via task ID parameter
- [ ] Prompt analyzes codebase deeply to determine implementation approach
- [ ] Generated subtasks follow subtasks.json schema (`docs/planning/schemas/subtasks.schema.json`)
- [ ] Each subtask has: id, taskRef, title, description, done, acceptanceCriteria, filesToRead
- [ ] Single-shot execution: one prompt -> one response -> subtasks.json created
- [ ] Subtasks are sized to fit single context window (init + gather + implement + test + commit)
- [ ] Subtasks reference parent task (taskRef field)
- [ ] Milestone-level generation creates subtasks for all tasks in milestone

### Test Plan
- [ ] Verify prompt file exists at `context/workflows/ralph/planning/subtasks-auto.md`
- [ ] Verify prompt reads parent task via task ID parameter
- [ ] Verify prompt includes deep codebase analysis instructions
- [ ] Verify prompt includes sizing constraints (must fit single context window)
- [ ] Verify prompt output format matches subtasks.json schema (`docs/planning/schemas/subtasks.schema.json`)
- [ ] Verify prompt generates required fields: id, taskRef, title, description, done, acceptanceCriteria, filesToRead
- [ ] Manual test: Copy prompt content and execute with Claude to validate subtasks.json structure
- [ ] Manual validation: Check generated JSON against schema (e.g., using online JSON schema validator)

### Scope
- **In:** The subtasks-auto.md prompt file, @path references, codebase analysis, schema compliance
- **Out:** Interactive subtask planning (not supported), CLI implementation, build execution

### Notes
- Subtasks ALWAYS use auto mode - no interactive prompt exists or should exist
- Sizing is critical: too large = context overflow, too small = overhead waste
- `filesToRead` supports glob patterns that agent expands with Glob tool
- Reference VISION.md section 8.7 (Implementation Order) - subtasks-auto is P2 priority
- Schema location: `docs/planning/schemas/subtasks.schema.json`
- Template location: `docs/planning/templates/subtasks.template.json`
- This prompt is foundational - it creates the work queue for Ralph iterations
- CLI and skill equivalents (`/ralph plan subtasks --auto`) will be addressed in a separate shared skill task
