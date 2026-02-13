## Task: Update CLI help text for --dry-run flag

**Story:** [005-STORY-docs-and-completions](../stories/005-STORY-docs-and-completions.md)

### Goal
Ensure `aaa ralph build --help` and all other affected commands display clear, accurate help text for the `--dry-run` flag that explains it shows the execution plan without running anything.

### Context
The `--dry-run` flag was added to ralph commands in Story 001 (CLI Integration), but the help text may need refinement to clearly communicate its purpose and behavior. Users discovering the feature through `--help` output need a one-line description that conveys both what it does (shows visual preview) and what it doesn't do (doesn't execute). This is especially important because the flag changes exit behavior (early exit after preview) and users need to understand this is a safety/preview tool, not a no-op mode.

Affected commands:
- `ralph build`
- `ralph plan stories`
- `ralph plan tasks`
- `ralph plan subtasks`
- `ralph plan roadmap`
- `ralph calibrate all`
- `ralph calibrate intention`
- `ralph calibrate technical`

### Plan
1. Read `tools/src/commands/ralph/index.ts` to locate all command definitions with `--dry-run` flag
2. Check existing help text for the `--dry-run` option on each command
3. Update help text to use consistent language: "Preview execution plan without running (exits after showing visual diagram)"
4. Verify help text follows Commander.js patterns (via `.description()` on option)
5. Run `bun --cwd tools run dev ralph build --help` to verify output formatting
6. Run `bun --cwd tools run dev ralph plan stories --help` to verify cascade commands
7. Run `bun --cwd tools run dev ralph calibrate all --help` to verify calibrate commands

### Acceptance Criteria
- [ ] `aaa ralph build --help` shows `--dry-run` with clear one-line description
- [ ] Description clarifies that command exits without executing and shows execution plan
- [ ] Help text is consistent across all 8 affected commands
- [ ] Help text mentions "visual diagram" or "preview" to set expectations
- [ ] Running `--help` on any affected command displays the flag in the options list

### Test Plan
- [ ] Manual verification: Run `aaa ralph build --help` and confirm flag appears with description
- [ ] Manual verification: Run `aaa ralph plan stories --help` and confirm consistent help text
- [ ] Manual verification: Run `aaa ralph calibrate all --help` and confirm consistent help text
- [ ] Visual inspection: Ensure help text fits in standard terminal width (~80 chars)

### Scope
- **In:** Updating help text descriptions for existing `--dry-run` flags on ralph commands
- **In:** Ensuring consistency across all 8 affected commands
- **Out:** Adding new flags or commands
- **Out:** Changing flag behavior (already implemented in Story 001)
- **Out:** Updating shell completions (separate task)
- **Out:** Updating README documentation (separate task)

### Notes
- The help text should be a single line (Commander.js convention)
- Keep it concise but informative - users scanning `--help` need instant clarity
- Consider mentioning "Terraform-style" if it helps users understand the pattern
- The flag was already added in Story 001's CLI integration work, so we're just refining help text here

### Related Documentation
- @context/blocks/construct/commander.md
- @context/stacks/cli/cli-bun.md
