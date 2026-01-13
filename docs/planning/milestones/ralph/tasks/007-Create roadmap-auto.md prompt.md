## Task: Create roadmap-auto.md prompt

**Story:** [automated-planning-pipeline](../stories/004-automated-planning-pipeline.md)

### Goal
A prompt file exists at `context/workflows/ralph/planning/roadmap-auto.md` that enables automatic roadmap generation from vision documents.

### Context
The automated planning pipeline allows developers to rapidly generate planning artifacts from upstream documents. Roadmap auto-generation reads VISION.md and produces a ROADMAP.md with milestones. This is marked as "risky" in VISION.md because high-level decisions benefit from human input, but auto mode is still useful for rapid prototyping or when vision is very clear.

Per VISION.md section 8.1, prompts live at `context/workflows/ralph/planning/` and use `@path` references resolved by Claude Code.

### Plan
1. Create the directory structure `context/workflows/ralph/planning/` if not exists
2. Draft the `roadmap-auto.md` prompt with:
   - Required reading: `@docs/planning/VISION.md`
   - Instructions to analyze vision and generate milestones
   - Output format matching ROADMAP.md template
3. Test the prompt with `ralph plan roadmap --auto -p` (print mode)
4. Validate generated ROADMAP.md structure

### Acceptance Criteria
- [ ] Prompt file exists at `context/workflows/ralph/planning/roadmap-auto.md`
- [ ] Prompt reads VISION.md via `@docs/planning/VISION.md` reference
- [ ] Prompt generates ROADMAP.md with milestone references
- [ ] Single-shot execution: one prompt -> one response -> artifact created
- [ ] Output follows ROADMAP.md conventions from VISION.md section 2

### Test Plan
- [ ] Verify prompt file exists at `context/workflows/ralph/planning/roadmap-auto.md`
- [ ] Verify prompt contains `@docs/planning/VISION.md` reference
- [ ] Verify prompt includes instructions to generate milestones with outcome-based naming
- [ ] Verify prompt output format matches ROADMAP.md conventions (section 2 of VISION.md)
- [ ] Manual test: Copy prompt content and execute with Claude to validate output structure

### Scope
- **In:** The roadmap-auto.md prompt file, @path references to Vision
- **Out:** Interactive roadmap planning (that's roadmap-interactive.md), CLI implementation, testing infrastructure

### Notes
- VISION.md notes roadmap auto-generation is "risky" - consider adding a warning in the prompt output
- Prompt should generate a "best guess" roadmap that humans review
- Reference VISION.md section 3.1 (Automation Levels) for the risky designation
- No templating engine needed - Claude reads files directly via @path
- CLI and skill equivalents (`/ralph plan roadmap --auto`) will be addressed in a separate shared skill task
