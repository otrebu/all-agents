## Task: Create ralph-status SKILL.md

**Story:** [progress-visibility-status](../stories/007-progress-visibility-status.md)

### Goal
Create a SKILL.md file for the ralph-status skill that enables `/ralph status` command as a skill equivalent.

### Context
The status.sh script provides the core functionality for checking Ralph's progress. This task creates the skill wrapper that makes it accessible via `/ralph status` in Claude Code. Skills provide a user-friendly interface that developers can invoke without remembering exact script paths or CLI syntax.

### Plan
1. Create `skills/ralph-status/` directory structure
2. Create SKILL.md with proper skill configuration
3. Configure skill to invoke status.sh script
4. Add appropriate description and usage examples
5. Test skill invocation works correctly

### Acceptance Criteria
- [ ] `skills/ralph-status/SKILL.md` file exists with valid skill configuration
- [ ] Skill properly invokes status.sh script
- [ ] `/ralph status` command works from Claude Code
- [ ] Skill description clearly explains what it does
- [ ] Usage examples are provided in the skill documentation

### Test Plan
- [ ] Verify skill is discovered by Claude Code
- [ ] Test `/ralph status` invocation
- [ ] Verify output matches direct status.sh execution
- [ ] Test skill help/description display

### Scope
- **In:** SKILL.md file, skill directory structure, skill configuration
- **Out:** The status.sh script itself (covered in separate task 008)

### Notes
- Depends on Task 008 (status.sh script) being completed first
- Reference existing skills in the codebase for SKILL.md format conventions
- Skill should be read-only like the underlying script
- Consider if any skill-specific formatting or options are needed
