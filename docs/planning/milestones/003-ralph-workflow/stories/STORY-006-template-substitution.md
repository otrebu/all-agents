## Story: Template Substitution for Hook Prompts

### Narrative

As a developer customizing ralph hooks, I want to use `{{VAR}}` placeholders in hook prompts so that I can inject runtime values without hardcoding paths.

### Persona

**Developer customizing ralph behavior** who wants flexible hook prompts.

Situation: "The `iteration-summary.md` prompt needs session log content, but I have to inline it in code instead of using a clean template variable."

**Functional job:** Inject runtime values into hook prompts via template substitution.

**Emotional job:** Feel that the system is extensible and maintainable.

### Context

VISION.md Section 8.1 specifies `{{VAR}}` substitution for hook prompts, but this is not implemented (IMPLEMENTATION_STATUS Section 8). Currently, values are inlined in code before prompt is sent.

This is medium effort - requires a substitution utility and updates to hook prompt handling.

### Acceptance Criteria

**Template engine:**
- [ ] Hook prompts support `{{VAR}}` placeholders
- [ ] Substitution happens before prompt is sent to Claude
- [ ] Missing variables logged as warning, not error (prompt still sent with `{{VAR}}` literal)

**Supported variables:**
- [ ] `{{SESSION_JSONL_CONTENT}}` - full session log content
- [ ] `{{SESSION_JSONL_PATH}}` - path to session log file
- [ ] `{{SUBTASK_ID}}` - current subtask ID (e.g., SUB-001)
- [ ] `{{SUBTASK_TITLE}}` - current subtask title
- [ ] `{{SUBTASK_DESCRIPTION}}` - current subtask description
- [ ] `{{MILESTONE}}` - current milestone name
- [ ] `{{ITERATION_NUM}}` - current iteration number

**Updated prompts:**
- [ ] `iteration-summary.md` updated to use template variables
- [ ] Variables documented in prompt header comments

### Tasks

<!-- Tasks will be generated separately via tasks-auto.md -->
- [ ] Tasks to be defined

### Notes

**Priority:** P3 (nice to have, lower priority)

**Implementation locations:**
- New utility: `tools/src/commands/ralph/template.ts`
- Hook invocation: `tools/src/commands/ralph/hooks.ts`
- Prompt: `context/workflows/ralph/hooks/iteration-summary.md`

**Example prompt with substitution:**
```markdown
Summarize this Claude Code session in 1-2 sentences.

Session log:
{{SESSION_JSONL_CONTENT}}

Subtask being worked on:
{{SUBTASK_TITLE}}: {{SUBTASK_DESCRIPTION}}

Output JSON:
{"summary": "..."}
```

**Related docs:**
- VISION.md Section 8.1 (Templating)
- IMPLEMENTATION_STATUS.md Section 8 (Template Substitution)
