## Task: Add --dry-run examples to README with visual preview

**Story:** [005-STORY-docs-and-completions](../stories/005-STORY-docs-and-completions.md)

### Goal
The tools/README.md should include example output showing the visual pipeline preview for at least one cascade scenario, so users understand what `--dry-run` does before running it.

### Context
The README currently documents ralph commands in a table format with brief descriptions, but doesn't show example output or explain the `--dry-run` feature. The MILESTONE.md file (007-pipeline-preview/MILESTONE.md) contains detailed visual examples of dry-run output for multiple scenarios (full cascade, build with flags, compact preview, etc.). These examples should be adapted into the README in the ralph commands section to help users understand the feature's value and behavior.

Users need to see:
1. What the flag does (shows execution plan before running)
2. What the output looks like (visual diagram with phase breakdown)
3. When to use it (safety check before expensive operations)
4. How it integrates with other flags (works with --cascade, --headless, --force, etc.)

### Plan
1. Read current `tools/README.md` to locate the ralph commands section (starts around line 85)
2. Read `docs/planning/milestones/007-pipeline-preview/MILESTONE.md` to review example outputs (Examples 1-6 starting at line 19)
3. Create a new "Ralph --dry-run Preview" subsection in README after the commands table
4. Select the most illustrative example from MILESTONE.md (recommend Example 1: full cascade dry-run, lines 19-72)
5. Adapt the example for README:
   - Simplify if needed for readability (README should be scannable)
   - Include the command line invocation
   - Show the visual diagram output
   - Add brief explanation of what each section means (header, pipeline tree, summary footer)
6. Add a short introductory paragraph explaining the --dry-run flag's purpose
7. Mention key behaviors: exits without executing, works with all modes, shows approval gates
8. Link to MILESTONE.md for more examples if users want to see other scenarios
9. Update the commands table description for ralph build/plan to mention `--dry-run` support

### Acceptance Criteria
- [ ] README includes a "Ralph --dry-run Preview" or similar subsection
- [ ] At least one full example shows command invocation + visual output
- [ ] Example demonstrates cascade scenario (most useful for understanding impact)
- [ ] Introductory text explains when and why to use --dry-run
- [ ] Example output preserves the visual formatting (code blocks with proper indentation)
- [ ] Commands table mentions --dry-run availability for affected commands
- [ ] Example shows the "remove --dry-run to execute" footer message

### Test Plan
- [ ] Manual verification: Render README locally (VS Code preview or GitHub) to verify formatting
- [ ] Visual inspection: Ensure code blocks render correctly with monospace font
- [ ] Completeness check: Example includes command, visual diagram, and summary footer
- [ ] Readability check: Example is understandable without reading MILESTONE.md
- [ ] Integration check: New section flows naturally with existing ralph documentation

### Scope
- **In:** Adding --dry-run examples to tools/README.md
- **In:** Adapting examples from MILESTONE.md for README context
- **In:** Updating commands table to mention --dry-run support
- **In:** Brief explanation of flag purpose and behavior
- **Out:** Documenting every flag combination (link to MILESTONE.md for comprehensive examples)
- **Out:** Adding screenshots (text-based examples are sufficient for CLI tool)
- **Out:** Documenting implementation details (README is user-facing)
- **Out:** Updating other documentation files (focus on README only)

### Notes
- Choose Example 1 from MILESTONE.md (lines 19-72) as it shows the most complete picture: full cascade with multiple flags, expanded entry phase, collapsed downstream phases, annotation markers, and summary
- The visual diagrams use box-drawing characters and chalk colors - preserve these in code blocks
- Consider adding a note about color output (works in TTY, degrades to plain text when piped)
- The README is the first place users look for features - make the example immediately compelling
- If space is a concern, you can shorten the example slightly but keep the core structure (header, first expanded phase, collapsed phases, summary)
- Add a table of contents entry if the README has one

### Related Documentation
- @context/stacks/cli/cli-bun.md
