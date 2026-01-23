## Task: Create technical-drift.md prompt

**Story:** [technical-standards-enforcement](../stories/008-technical-standards-enforcement.md)

### Goal
Create a prompt file (`technical-drift.md`) that enables LLM-as-judge detection of code violations against documented technical standards.

### Context
Technical drift occurs when implementations deviate from documented patterns - using wrong libraries, ignoring conventions, or duplicating instead of reusing. This prompt will be used by `aaa ralph calibrate technical` to compare code changes against the technical documentation that was referenced during implementation (from subtask's `filesToRead` field).

The prompt follows the calibration-as-LLM-as-judge pattern described in VISION.md section 8.8: all calibration is prompt-based, not code-based. Claude analyzes inputs via well-crafted prompts.

### Plan
1. Create `context/workflows/ralph/calibration/technical-drift.md` prompt file
2. Include few-shot examples showing drift vs acceptable variation
3. Define clear criteria for technical violations
4. Specify the escape hatch pattern: `// HUMAN APPROVED: reason`
5. Structure output format: summary in stdout + task files for violations
6. Include instructions for chunking large inputs

### Acceptance Criteria
- [ ] Prompt file created at `context/workflows/ralph/calibration/technical-drift.md`
- [ ] Prompt instructs LLM to read git diffs via `commitHash` from completed subtasks
- [ ] Prompt instructs LLM to read documentation from subtask's `filesToRead` references
- [ ] Prompt includes few-shot examples of violations vs acceptable variations
- [ ] Prompt respects escape hatch: `// HUMAN APPROVED: reason` comments are ignored
- [ ] Output format specified: summary to stdout + task files if violations found
- [ ] Prompt can be invoked standalone or as part of `ralph calibrate all`

### Test Plan
- [ ] Manual test: run prompt against a sample subtask with known technical drift
- [ ] Manual test: verify escape hatch comments are properly ignored
- [ ] Manual test: verify output produces actionable task files for violations

### Scope
- **In:**
  - The technical-drift.md prompt file
  - Few-shot examples for drift detection
  - Output format specification
- **Out:**
  - CLI command implementation (`aaa ralph calibrate technical`)
  - Skill implementation (`/ralph calibrate technical`)
  - Integration with `ralph calibrate all`

### Notes
- Reference: VISION.md section 3.3 (Technical Drift) and section 8.8 (Calibration as LLM-as-Judge)
- The prompt uses the same docs the implementation agent read during build (from `filesToRead`)
- Key prompt elements per VISION.md 8.8:
  - Few-shot examples (drift vs acceptable variation)
  - Clear criteria for judgment
  - Instruction to chunk large inputs if needed
  - Output: summary in stdout + task files if issues found

### Cross-Story Dependencies
- **TASK-010 (Story 002)**: Implements `calibrate.sh` script which provides `aaa ralph calibrate technical` CLI command
- **TASK-012 (Story 002)**: Implements `ralph-calibrate` skill which provides `/ralph-calibrate technical` skill invocation

These shared tasks from [Story 002: Calibration & Quality Gates](../stories/002-calibration-and-quality-gates.md) handle the CLI and skill infrastructure for all calibration types. This task (TASK-021) only creates the prompt file that defines what technical drift detection checks for.
