## Task: Create pre-build-validation.md prompt

**Story:** [autonomous-code-implementation](../stories/001-autonomous-code-implementation.md)

### Goal
A prompt file exists at `context/workflows/ralph/building/pre-build-validation.md` that validates subtask alignment with parent Task and Story before implementation begins.

### Context
Pre-build validation is an optional alignment check that runs before the build loop starts (triggered by `--validate-first` flag). It ensures subtasks faithfully implement parent intent without scope creep. This is useful when subtasks are auto-generated from stories/tasks and need a sanity check before autonomous execution. The validation is different from intention-drift calibration which checks commits after implementation.

### Plan
1. Create `pre-build-validation.md` at `context/workflows/ralph/building/`
2. Prompt should read:
   - Subtask definition (title, description, acceptance criteria)
   - Parent Task (if exists, via taskRef)
   - Parent Story (if exists, via task's story reference)
3. Prompt instructs LLM to judge alignment:
   - Does subtask faithfully implement parent intent?
   - Not too broad, not too narrow?
   - No scope creep (features not in parent)?
4. Define output format: `{"aligned": true}` or `{"aligned": false, "reason": "..."}`
5. Include graceful degradation for partial chains (Task without Story)

### Acceptance Criteria
- [ ] Prompt file exists at `context/workflows/ralph/building/pre-build-validation.md`
- [ ] Prompt reads subtask definition (title, description, acceptance criteria)
- [ ] Prompt reads parent Task if exists (via taskRef)
- [ ] Prompt reads parent Story if exists (via task's story reference)
- [ ] Prompt outputs JSON: `{"aligned": true}` or `{"aligned": false, "reason": "..."}`
- [ ] Prompt handles graceful degradation for partial chains
- [ ] Prompt checks: scope creep, too broad, too narrow, faithful implementation

### Test Plan
- [ ] Verify prompt file can be read by Claude Code (no syntax errors)
- [ ] Test with aligned subtask: expect `{"aligned": true}`
- [ ] Test with scope-creep subtask: expect `{"aligned": false, "reason": "..."}`
- [ ] Test with partial chain (no Story): verify graceful degradation

### Scope
- **In:** pre-build-validation.md prompt, alignment judgment, JSON output format
- **Out:** The build.sh `--validate-first` flag implementation (that's in build.sh task), intention-drift calibration (post-build check)

### Notes
- Reference: VISION.md section 3.1 (Pre-Build Validation) and 8.9 (Single-Shot Mode)
- This is a single-shot check: `claude -p "$(cat pre-build-validation.md)" --output-format json`
- Runs before build loop, not per-iteration
- Different from intention-drift which checks commits after implementation
- Graceful degradation: validates only what exists in the chain
- Example failure reason: "Subtask adds OAuth support but Task only mentions basic auth"
