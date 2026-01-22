## Task: Create ralph.config.json template

**Story:** [hooks-and-notifications](../stories/006-hooks-and-notifications.md)

### Goal
A ralph.config.json template exists that documents all hook types with sensible defaults, enabling developers to configure Ralph's notification and checkpoint behavior.

### Context
Ralph's hook system needs a configuration file to define when and how hooks fire. The template serves as both documentation and a starting point for users. It must define all 4 hook types from the story, their available actions, and provide placeholder configuration for ntfy notifications.

### Plan
1. Create `docs/planning/templates/ralph.config.template.json`
2. Define structure for all 4 hook types with their triggers
3. Set default actions for each hook type
4. Include ntfy topic placeholder and notification settings
5. Add inline comments (via description fields) explaining each option

### Acceptance Criteria
- [ ] Template created at `docs/planning/templates/ralph.config.template.json`
- [ ] All 4 hook types defined:
  - `onIterationComplete` - default: `["log"]`
  - `onMilestoneComplete` - default: `["log", "notify"]`
  - `onValidationFail` - default: `["log", "notify"]`
  - `onMaxIterationsExceeded` - default: `["log", "notify", "pause"]`
- [ ] Actions array supports: `log`, `notify`, `pause`
- [ ] ntfy configuration section with:
  - `topic` placeholder (e.g., `"your-ntfy-topic"`)
  - `server` default (`"https://ntfy.sh"`)
- [ ] JSON is valid and parseable
- [ ] Field descriptions explain purpose of each setting

### Test Plan
- [ ] Validate JSON syntax
- [ ] Verify template can be copied and used as-is (with topic replaced)
- [ ] Confirm all hook types from story are represented

### Scope
- **In:** Config template structure, hook type definitions, default actions, ntfy placeholder config
- **Out:** Hook implementation (task 019), actual notification sending, runtime config loading

### Notes
- Template complements iteration-diary.template.json (task 020)
- Users copy this template to `ralph.config.json` in their project root
- Reference: VISION.md sections 5 (Hooks & Notifications) and 8.11
