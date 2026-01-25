## Task: Additional Reviewer Agents + Docs Update

**Story:** [STORY-001-parallel-code-review](../stories/STORY-001-parallel-code-review.md)

### Goal
Add remaining reviewer agents and update planning documentation to reflect the new Code Review system.

### Context
Phase 5 of the Parallel Code Review story. After core infrastructure is in place, add the remaining specialized reviewers:
- `over-engineering-reviewer` - YAGNI, premature abstraction
- `performance-reviewer` - N+1, memory leaks, algorithms
- `accessibility-reviewer` - WCAG (frontend only)
- `documentation-reviewer` - Missing/outdated docs
- `dependency-reviewer` - Outdated deps, vulnerabilities
- `intent-alignment-reviewer` - Code matches requirements

Also update docs/planning to reflect the new system.

### Plan
1. Create additional reviewer agents in `.claude/agents/code-review/`:
   - `over-engineering-reviewer.md` - Focus on YAGNI, premature abstraction, unnecessary complexity
   - `performance-reviewer.md` - Focus on N+1 queries, memory leaks, algorithm complexity
   - `accessibility-reviewer.md` - Focus on WCAG compliance (skip for non-frontend code)
   - `documentation-reviewer.md` - Focus on missing/outdated docs, README, comments
   - `dependency-reviewer.md` - Focus on outdated deps, known vulnerabilities, license issues
   - `intent-alignment-reviewer.md` - Focus on code matching requirements (needs intent input)
2. Update `context/blocks/docs/atomic-documentation.md`:
   - Add "Where Lessons Go" decision tree from story
   - Clarify `context/` vs `docs/` distinction
3. Update `docs/planning/VISION.md`:
   - Add Section 3.4 "Code Review Mode"
   - Document 12 specialized reviewers
   - Document trust gradient for review (same as Ralph)
4. Update `docs/planning/ROADMAP.md`:
   - Add Code Review milestone (or integrate into current)
   - Reference dependencies on Ralph patterns

### Acceptance Criteria
- [ ] 6 additional reviewer agents created
- [ ] Each agent outputs findings in consistent JSON format
- [ ] atomic-documentation.md has "Where Lessons Go" section
- [ ] VISION.md has Code Review Mode section (3.4)
- [ ] ROADMAP.md references code review deliverables

### Test Plan
- [ ] Manual: Invoke each new reviewer on appropriate test code
- [ ] Verify accessibility-reviewer skips non-frontend files
- [ ] Verify intent-alignment-reviewer asks for intent input

### Scope
- **In:** 6 additional agents, docs updates (VISION, ROADMAP, atomic-documentation)
- **Out:** CLI enhancements, new modes, lessons system (explicitly removed per story)

### Notes
The story explicitly removes:
- `context/lessons/` - No separate lessons folder
- `docs/lessons/` - No separate lessons folder
- Graduation pipeline - Just put docs where they belong
- `aaa lessons` CLI - Not needed

Project-specific lessons go in `docs/{relevant-folder}/`.
Reusable lessons go in `context/blocks/` as "Gotchas" sections.

### Related Documentation
- @context/blocks/docs/atomic-documentation.md (to update)
- @docs/planning/VISION.md (to update)
- @docs/planning/ROADMAP.md (to update)
