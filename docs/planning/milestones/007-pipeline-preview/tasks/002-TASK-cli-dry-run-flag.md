## Task: CLI --dry-run Flag Integration

**Story:** [001-STORY-dry-run-preview](../stories/001-STORY-dry-run-preview.md)

### Goal
Add `--dry-run` flag to all 8 Ralph pipeline commands, wire it to the execution plan computation layer, and implement early-exit behavior that shows the plan and exits without executing anything.

### Context
This task integrates the `--dry-run` flag into the CLI layer and wires it to the computation layer built in Task 001. The flag must be added to all pipeline commands (`ralph build`, `ralph plan stories/tasks/subtasks/roadmap`, `ralph calibrate all/intention/technical`) and follow a consistent early-exit pattern: resolve options → compute plan → render plan → exit(0). This is the CLI half of WS-04 from the milestone plan.

The visual rendering is Story 002's responsibility, so this task focuses on the flag wiring and control flow. For now, we'll output a simple text placeholder (e.g., `console.log(JSON.stringify(plan, null, 2))`) to prove the integration works. Story 002 will replace this with the full visual diagram.

### Plan
1. Add `--dry-run` flag to all 8 Ralph pipeline commands in `tools/src/commands/ralph/index.ts`:
   - `ralph build`
   - `ralph plan roadmap`
   - `ralph plan stories`
   - `ralph plan tasks`
   - `ralph plan subtasks`
   - `ralph calibrate all`
   - `ralph calibrate intention`
   - `ralph calibrate technical`
2. Update `BuildOptions` and `CascadeOptions` types in `types.ts` to include `dryRun?: boolean` field
3. For each command's action handler, implement early-exit pattern at the top:
   ```typescript
   if (options.dryRun) {
     const plan = computeExecutionPlan({...});
     console.log(JSON.stringify(plan, null, 2)); // Placeholder for visual rendering
     process.exit(0);
   }
   ```
4. Wire `computeExecutionPlan()` to receive all resolved options (milestone path, provider, model, approvals config, cascade target, from level, flags)
5. Handle `--headless --dry-run` mode: output JSON execution plan to stdout
6. Update help text for each command to document the `--dry-run` flag
7. Add shell completion for `--dry-run` flag in `completion/zsh.ts` and `completion/fish.ts`

### Acceptance Criteria
- [ ] `--dry-run` flag is present on all 8 Ralph pipeline commands
- [ ] Running `aaa ralph build --dry-run` outputs execution plan JSON and exits with code 0 without executing anything
- [ ] Running `aaa ralph plan stories --milestone M1 --cascade build --dry-run` outputs full cascade plan and exits without executing
- [ ] `--headless --dry-run` outputs valid JSON to stdout that can be parsed by `JSON.parse()`
- [ ] All existing command behavior is unchanged when `--dry-run` is not present
- [ ] Help text for each command documents the `--dry-run` flag
- [ ] Tab completion offers `--dry-run` for all Ralph pipeline commands

### Test Plan
- [ ] E2E test: `aaa ralph build --dry-run` exits 0 and outputs JSON
- [ ] E2E test: `aaa ralph plan stories --milestone <test-milestone> --dry-run` exits 0 and outputs JSON
- [ ] E2E test: `aaa ralph build --dry-run --headless` outputs valid JSON to stdout
- [ ] E2E test: `aaa ralph plan subtasks --milestone <test-milestone> --cascade build --dry-run` shows all cascade levels in plan
- [ ] E2E test: Verify existing `aaa ralph build` (no --dry-run) still executes normally (use test fixture with empty queue or mocked provider)
- [ ] Manual test: Run `aaa ralph build --help` and verify `--dry-run` appears in help text
- [ ] Manual test: Tab completion offers `--dry-run` for `ralph build` and `ralph plan stories`

### Scope
- **In:**
  - Adding `--dry-run` flag to all 8 pipeline commands
  - Early-exit pattern in each command's action handler
  - Wiring `computeExecutionPlan()` with all resolved options
  - JSON output for `--headless --dry-run` mode
  - Help text updates for all commands
  - Shell completion integration
- **Out:**
  - Visual rendering of the execution plan (Story 002)
  - Auto-preview mode without `--dry-run` (Story 002)
  - Live execution progress updates (WS-03, not in this story)
  - Command-specific customization beyond the standard pattern

### Notes
- The placeholder rendering (`console.log(JSON.stringify(plan, null, 2))`) will be replaced by `renderPipelinePlan()` from Story 002. This task proves the integration path works.
- For cascade commands, `computeExecutionPlan()` needs the cascade target and from level to compute the correct range via `getLevelsInRange()`
- The early-exit pattern should be at the top of each action handler, before any filesystem operations or provider invocations
- Exit code must be 0 on successful dry-run preview (not 1 or any error code)
- The `--dry-run` flag is boolean (no value), added with `.option('--dry-run', 'Show execution plan without executing')`
- This task should be testable without Story 002 by verifying the JSON output structure matches the `ExecutionPlan` type
- For calibrate commands, the plan may be simpler (single-level, no cascade), but still needs reads/writes/steps detail

### Related Documentation
- @context/blocks/construct/commander.md (Commander.js flag syntax)
- @context/blocks/construct/ralph-patterns.md (Ralph CLI patterns)
- @context/stacks/cli/cli-bun.md (CLI stack overview)
- @context/foundations/test/test-e2e-cli-bun.md (E2E testing with Bun and execa)
