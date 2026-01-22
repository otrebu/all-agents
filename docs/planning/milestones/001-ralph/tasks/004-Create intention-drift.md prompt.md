## Task: Create intention-drift.md prompt

**Story:** [intention-drift-detection](../stories/002-intention-drift-detection.md)

### Goal
A working `intention-drift.md` prompt exists at `context/workflows/ralph/calibration/intention-drift.md` that enables LLM-as-judge drift detection.

### Context
Autonomous agents can subtly drift from intent - implementing related but unintended features, over-engineering, or missing the point. The intention-drift prompt is the core analysis tool for detecting when implemented code diverges from intended behavior. It runs as a separate calibration loop, not inline with build iterations.

Per VISION.md section 3.3 and 8.8, all calibration is prompt-based (not code-based). The prompt enables Claude to analyze the full intent chain (Vision → Story → Task → Subtask → code changes) and judge whether implementation faithfully matches intent.

### Plan
1. Create `context/workflows/ralph/calibration/intention-drift.md`
2. Structure the prompt with:
   - Instructions to read git diffs via `commitHash` from completed subtasks
   - Context gathering from full chain: Vision → Story → Task → Subtask
   - LLM-as-judge criteria with few-shot examples of drift vs acceptable variation
   - "Don't jump ahead" guard - instruction to not flag future planned work
3. Define output format: summary in stdout + task files if divergence found
4. Include instruction for graceful degradation (validate partial chains if full chain unavailable)

### Acceptance Criteria
- [ ] Prompt file exists at `context/workflows/ralph/calibration/intention-drift.md`
- [ ] Prompt reads git diffs via `commitHash` from completed subtasks in `subtasks.json`
- [ ] Prompt analyzes full chain: Vision → Story → Task → Subtask → code changes
- [ ] Prompt includes LLM-as-judge criteria with few-shot examples
- [ ] Prompt includes "don't jump ahead" guard to avoid flagging planned future work
- [ ] Prompt outputs summary to stdout + creates task files for divergence
- [ ] Prompt handles partial chains gracefully (validates what exists)

### Test Plan
- [ ] Run prompt with a sample subtasks.json containing completed subtasks with commitHash
- [ ] Verify prompt correctly identifies drift in synthetic test case
- [ ] Verify prompt does NOT flag acceptable variation in synthetic test case
- [ ] Verify prompt handles missing parent Story/Task gracefully

### Scope
- **In:** The intention-drift.md prompt file, few-shot examples of drift detection
- **Out:** The calibrate.sh script (separate task), technical-drift.md prompt, self-improvement.md prompt

### Notes
- Location: `context/workflows/ralph/calibration/intention-drift.md`
- Uses `@path` references resolved by Claude Code - no preprocessing needed
- Few-shot examples should cover common drift patterns:
  - Over-engineering (added complexity not requested)
  - Scope creep (implemented adjacent but unintended features)
  - Under-delivery (missed acceptance criteria)
  - Wrong direction (misinterpreted intent)
- Reference: VISION.md sections 3.3 (Calibration Mode) and 8.8 (Calibration as LLM-as-Judge)
