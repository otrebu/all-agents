## Story: Pre-build Validation

### Narrative

As a developer running overnight batch builds, I want to validate subtask alignment before the first iteration so that I catch misalignments early instead of wasting compute on drifted subtasks.

### Persona

**Developer running overnight batch** who auto-generates subtasks and kicks off headless builds.

Their fear: "I auto-generated 20 subtasks, one drifted from parent intent, and I'll wake up to 5 wasted iterations building the wrong thing."

**Functional job:** Validate subtask alignment with parent chain (Story → Task → Subtask) BEFORE iteration starts.

**Emotional job:** Sleep soundly knowing obvious misalignments get caught early.

### Context

The `--validate-first` flag exists but is a stub (IMPLEMENTATION_STATUS Section 7). The prompt `pre-build-validation.md` is complete and ready to use. Only the invocation logic in `build.ts` is missing.

Pre-build validation is different from intention drift calibration:
- **Pre-build validation:** Checks subtask definition against parent chain BEFORE implementation
- **Intention drift:** Checks committed code against intent AFTER implementation

### Acceptance Criteria

**Core validation:**
- [ ] `ralph build --validate-first` invokes `pre-build-validation.md` prompt before starting iterations
- [ ] Prompt receives: subtask definition, parent Task (via `taskRef`), parent Story (via `storyRef`)
- [ ] LLM returns `{aligned: true}` or `{aligned: false, reason: "..."}`

**Mode-dependent behavior:**
- [ ] **Supervised:** If misaligned, show reason and prompt: "Skip this subtask? (y/n)"
- [ ] **Headless:** If misaligned, write feedback to `docs/planning/milestones/<milestone>/feedback/<date>_validation_<subtaskId>.md`, skip subtask, continue with others

**Graceful degradation:**
- [ ] If `taskRef` missing, validate only what exists (subtask definition alone)
- [ ] If `storyRef` missing, validate subtask against task only
- [ ] Partial chains still get validated at available levels

**Timeout and error handling:**
- [ ] Validation prompt times out after 60 seconds per subtask
- [ ] If timeout: treat as aligned, log warning "Validation timed out for SUB-XXX, proceeding"
- [ ] If LLM returns invalid JSON: treat as aligned, log warning with raw response

**Batch validation:**
- [ ] When queue has multiple subtasks, validate ALL before starting any iterations
- [ ] Report summary: "Validated 18/20 subtasks. 2 skipped due to misalignment."

### Tasks

<!-- Tasks will be generated separately via tasks-auto.md -->
- [ ] Tasks to be defined

### Notes

**Implementation location:** `tools/src/commands/ralph/build.ts:158-164`

**Prompt location:** `context/workflows/ralph/building/pre-build-validation.md`

**Expected output format:**
```json
{"aligned": true}
// or
{"aligned": false, "reason": "Subtask adds OAuth support but Task only mentions basic auth"}
```

**Related docs:**
- VISION.md Section 3.3 (Pre-Build Validation)
- IMPLEMENTATION_STATUS.md Section 7
