## Task: Create iteration-diary.schema.json

**Story:** [hooks-and-notifications](../stories/006-hooks-and-notifications.md)

### Goal
A JSON Schema exists that defines the structure and validation rules for iteration diary entries in `logs/iterations.jsonl`.

### Context
The iteration diary captures what happened during each Ralph iteration for later analysis, debugging, and metrics. The schema ensures consistent structure across all diary entries and enables validation. It documents the contract between the hook script and any consumers of the diary data.

### Plan
1. Create `docs/planning/schemas/iteration-diary.schema.json`
2. Define required fields from story: subtaskId, sessionId, status, summary, timestamp, errors
3. Define additional fields: toolCalls (count), filesChanged (array), duration (ms)
4. Define status enum: completed, failed, retrying
5. Add field descriptions and examples
6. Create template at `docs/planning/templates/iteration-diary.template.json`

### Acceptance Criteria
- [ ] Schema created at `docs/planning/schemas/iteration-diary.schema.json`
- [ ] Required fields: subtaskId, sessionId, status, summary, timestamp
- [ ] Optional fields: errors (array, can be omitted if no errors), toolCalls (integer), filesChanged (array of strings), duration (integer)
- [ ] Status field is enum: completed | failed | retrying
- [ ] Schema includes field descriptions and format constraints
- [ ] Template created at `docs/planning/templates/iteration-diary.template.json`
- [ ] Schema validates sample diary entries correctly

### Test Plan
- [ ] Validate schema syntax is valid JSON Schema
- [ ] Test schema against valid sample diary entries
- [ ] Test schema rejects entries with missing required fields
- [ ] Test schema rejects invalid status values

### Scope
- **In:** JSON Schema definition, template file, field documentation
- **Out:** Hook implementation (task 019), summary prompt (task 018), actual diary writing

### Notes
- Diary location: `logs/iterations.jsonl` (JSONL format, one entry per line)
- Schema location specified in story: `docs/planning/schemas/iteration-diary.schema.json`
- Template location: `docs/planning/templates/iteration-diary.template.json`
- Reference: VISION.md sections 5 and 8.11
