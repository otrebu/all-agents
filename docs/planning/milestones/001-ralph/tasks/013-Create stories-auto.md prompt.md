## Task: Create stories-auto.md prompt

**Story:** [automated-planning-pipeline](../stories/004-automated-planning-pipeline.md)

### Goal
A prompt file exists at `context/workflows/ralph/planning/stories-auto.md` that enables automatic story generation from vision and roadmap documents.

### Context
The automated planning pipeline generates stories from upstream planning documents. Stories are user-centric artifacts defining "what, for whom, why" (JTBD - Jobs To Be Done). Auto-generation reads VISION.md and ROADMAP.md to produce story files for a given milestone.

Per VISION.md section 3.1 (Automation Levels), stories auto-generation is safe (checkmark) because they can be reliably derived from well-defined vision and roadmap.

CLI trigger: `aaa ralph plan stories --auto --milestone <name>`
Skill equivalent: `/ralph plan stories --auto`

### Plan
1. Ensure directory structure `context/workflows/ralph/planning/` exists
2. Draft the `stories-auto.md` prompt with:
   - Required reading: `@docs/planning/VISION.md`, `@docs/planning/ROADMAP.md`
   - Milestone parameter handling (passed via CLI)
   - Instructions to generate user-centric stories with JTBD format
   - Output format matching story template
3. Test with `ralph plan stories --auto --milestone mvp -p`
4. Validate generated story files match template structure

### Acceptance Criteria
- [ ] Prompt file exists at `context/workflows/ralph/planning/stories-auto.md`
- [ ] Prompt reads Vision and Roadmap via `@path` references
- [ ] Prompt accepts milestone name parameter
- [ ] Generated stories follow story template format (`context/blocks/docs/story-template.md`)
- [ ] Each story has: Narrative, Persona, Context, Acceptance Criteria, Tasks section
- [ ] Single-shot execution: one prompt -> one response -> story files created
- [ ] Stories belong to exactly one milestone (per VISION.md constraints)

### Test Plan
- [ ] Verify prompt file exists at `context/workflows/ralph/planning/stories-auto.md`
- [ ] Verify prompt contains `@docs/planning/VISION.md` and `@docs/planning/ROADMAP.md` references
- [ ] Verify prompt includes milestone parameter placeholder/instructions
- [ ] Verify prompt output format matches story template (`context/blocks/docs/story-template.md`)
- [ ] Verify prompt includes JTBD format guidance (Narrative, Persona, Context, Acceptance Criteria, Tasks)
- [ ] Manual test: Copy prompt content and execute with Claude to validate story structure

### Scope
- **In:** The stories-auto.md prompt file, @path references to Vision/Roadmap, story template compliance
- **Out:** Interactive story planning (that's stories-interactive.md), CLI implementation, task generation

### Notes
- Stories are the "what/who/why" level - they don't describe technical implementation
- Generated stories should have placeholder task references that will be filled by tasks-auto
- Reference VISION.md section 1 (Definitions) for story requirements
- Story template location: `context/blocks/docs/story-template.md`
- CLI and skill equivalents (`/ralph plan stories --auto`) will be addressed in a separate shared skill task
