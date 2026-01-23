## Task: CLI Ergonomics Fixes

### Goal
Ralph CLI has consistent, predictable command patterns across all subcommands.

### Context
Opus agent review found several ergonomic issues:
1. `ralph plan subtasks` only takes `--task`, missing `--story`/`--milestone` scope
2. `ralph review` uses positional args while `ralph plan` uses flags (inconsistent)
3. `ralph calibrate` uses fake subcommand via positional arg instead of real subcommands
4. `--max-iterations` defaults to "3" but spec says unlimited
5. `--auto` flag should be removed (conflated with `--supervised`)
6. Missing `--calibrate-every` on build command
7. `ralph review subtasks` not implemented

### Plan

**1. Path-based scope for `ralph plan subtasks`:**
```bash
ralph plan subtasks --task docs/planning/milestones/mvp/tasks/001-auth.md
ralph plan subtasks --story docs/planning/milestones/mvp/stories/STORY-001/
ralph plan subtasks --milestone docs/planning/milestones/mvp/
```
Explicit scope flag + tab-completable path value. Output path inferred (subtasks.json adjacent to input).

**2. Standardize `ralph review` to use path flags:**
```bash
# Before (positional name)
ralph review stories mvp

# After (flag with path)
ralph review stories --milestone docs/planning/milestones/mvp/
ralph review tasks --story docs/planning/milestones/mvp/stories/STORY-001/
```

**3. Convert `ralph calibrate` to real subcommands:**
```typescript
// Before
.argument("[subcommand]", "intention, technical, improve, or all")

// After
calibrateCommand.addCommand(new Command("intention")...)
calibrateCommand.addCommand(new Command("technical")...)
calibrateCommand.addCommand(new Command("improve")...)
calibrateCommand.addCommand(new Command("all")...)
```

**4. Fix `--max-iterations` default:**
- Change from "3" to "0" (0 = unlimited per VISION spec)

**5. Remove `--auto` flag:**
- Delete `-a, --auto` option from plan commands
- Keep only `--supervised` and `--headless`

**6. Add `--calibrate-every` to build:**
```bash
ralph build --calibrate-every 5  # run calibration every 5 iterations
```

**7. Implement `ralph review subtasks`:**
- Add command to review subtask queue before build

**8. Update VISION.md Section 8.2** with final CLI reference

### Acceptance Criteria
- [ ] `ralph plan subtasks --task|--story|--milestone <path>` accepts file paths
- [ ] `ralph review` commands accept `--milestone`/`--story` with path values
- [ ] `ralph calibrate intention --help` works (real subcommand)
- [ ] `ralph build` defaults to unlimited iterations
- [ ] No `--auto` flag exists
- [ ] `ralph build --calibrate-every 5` works
- [ ] `ralph review subtasks` exists
- [ ] VISION.md Section 8.2 matches implementation
- [ ] `bun run typecheck` passes

### Test Plan
- [ ] `bun run typecheck` passes
- [ ] Manual: test each command with `--help`
- [ ] Manual: verify scope inference works

### Scope
- **In:** CLI command structure, flags, subcommands
- **Out:** Prompt content, config schema changes, internal logic

### Related Documentation
- @docs/planning/VISION.md (Section 8.2 CLI Command Structure)
- @docs/planning/milestones/ralph/SPEC-SYNC-PLAN.md
