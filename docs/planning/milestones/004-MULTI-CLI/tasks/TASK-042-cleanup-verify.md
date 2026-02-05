---
depends:
  - @docs/planning/milestones/004-MULTI-CLI/stories/002-claude-refactor.md
  - @context/foundations/quality/gate-standards.md
  - @context/foundations/scm/commit-monorepo-subdir.md
---

## Task: Delete Legacy Claude Module and Verify Migration

**Story:** [002-claude-refactor](./002-claude-refactor.md)

### Goal
The legacy `tools/src/commands/ralph/claude.ts` file is deleted, all imports are migrated to the new provider-based structure, and all 7 acceptance criteria pass.

### Context
This is the final cleanup task for Story 002 (Claude Provider Refactor). The Claude provider has been successfully refactored to use the new provider abstraction at `tools/src/commands/ralph/providers/claude.ts`. All dependent tasks (TASK-039, TASK-040, TASK-041) must be complete before this cleanup can proceed.

This task ensures:
- No dead code remains in the codebase
- All imports reference the new provider location
- The migration is fully verified through testing
- No regressions in existing Claude Code functionality

**Dependencies:**
- TASK-039: Move and refactor Claude provider to use new abstraction (MUST be complete)
- TASK-040: Integrate provider registry with build and review commands (MUST be complete)
- TASK-041: Update calibrate.ts to use provider registry (MUST be complete)

### Plan

1. **Verify all dependencies are complete**
   - Confirm TASK-039, TASK-040, TASK-041 are marked complete
   - Verify `tools/src/commands/ralph/providers/claude.ts` exists and is functional
   - Verify provider registry is properly integrated

2. **Search for remaining imports of legacy claude.ts**
   - Search entire codebase for `from './claude'` or `from '../claude'`
   - Search for `import.*claude\.ts` patterns
   - Check `tools/src/commands/ralph/build.ts` uses registry
   - Check `tools/src/commands/ralph/review/index.ts` uses registry
   - Check `tools/src/commands/ralph/calibrate.ts` uses registry
   - Update any remaining references to use `providers/registry` or `providers/claude`

3. **Delete the legacy claude.ts file**
   - Remove `tools/src/commands/ralph/claude.ts` (root level)
   - Verify file is actually deleted from filesystem

4. **Run type checking**
   - Execute `cd tools && bun run typecheck` or equivalent
   - Fix any type errors that surface from the deletion

5. **Run linting**
   - Execute `cd tools && bun run lint` or equivalent
   - Fix any lint errors

6. **Run full test suite**
   - Execute `cd tools && bun test` or equivalent
   - Verify all existing tests pass
   - Pay special attention to provider-related tests

7. **Manual verification of acceptance criteria**
   - Test `aaa ralph build` works without config changes
   - Test `aaa ralph build --provider claude` works
   - Verify JSON parsing returns correct cost/duration/sessionId
   - Verify stall detection works
   - Test interrupt (Ctrl+C) exits cleanly
   - ~~Verify no orphaned MCP processes~~ (DEFERRED - see Notes)
   - Test permission bypass flag works
   - Verify all 3 invocation modes work

8. **Commit the changes**
   - Follow monorepo commit patterns per @context/foundations/scm/commit-monorepo-subdir.md
   - Commit message: `refactor(ralph): delete legacy claude.ts after migration`
   - Include scope note: affects `tools/` subdirectory

### Acceptance Criteria

- [ ] `aaa ralph build` works without any changes to existing configs
- [ ] `aaa ralph build --provider claude` explicit selection works
- [ ] JSON parsing returns correct cost/duration/sessionId from Claude output
- [ ] Stall detection continues to work as before
- [ ] Interrupt (Ctrl+C) exits cleanly
- [ ] ~~No orphaned MCP processes after exit~~ (DEFERRED - see Notes)
- [ ] Permission bypass flag works correctly
- [ ] All 3 invocation modes work (supervised, headless-async, haiku)
- [ ] All existing tests pass
- [ ] Legacy `tools/src/commands/ralph/claude.ts` is deleted
- [ ] No remaining imports reference the deleted file

### Test Plan

**Automated Tests:**
- [ ] Run `bun run typecheck` in tools/ directory - must pass
- [ ] Run `bun run lint` in tools/ directory - must pass
- [ ] Run `bun test` in tools/ directory - all tests must pass
- [ ] Verify provider registry tests pass
- [ ] Verify Claude provider unit tests pass (TASK-043)

**Manual Testing Checklist:**
- [ ] `aaa ralph build` uses claude by default
- [ ] `aaa ralph build --provider claude` explicit selection
- [ ] JSON parsing returns correct cost/duration/sessionId
- [ ] Stall detection triggers after timeout
- [ ] Interrupt (Ctrl+C) exits cleanly
- [ ] ~~No orphaned MCP processes after exit~~ (DEFERRED)
- [ ] Permission bypass flag works correctly (`--dangerously-skip-permissions`)
- [ ] All 3 invocation modes work:
  - [ ] supervised
  - [ ] headless-async
  - [ ] haiku
  - *(headless-sync removed in timeout protection migration)*

### Scope

**In:**
- Deleting `tools/src/commands/ralph/claude.ts` (root level legacy file)
- Updating any remaining imports to use new provider structure
- Running full test suite verification
- Manual acceptance criteria verification

**Out:**
- Changes to provider implementation logic (handled in TASK-039)
- Changes to registry implementation (handled in TASK-040)
- Changes to calibrate command (handled in TASK-041)
- Adding new tests (handled in TASK-043 and TASK-044)
- MCP process cleanup implementation (DEFERRED to future iteration)

### Notes

**Risks:**
- **Risk:** Hidden imports of legacy file that only surface at runtime
  - **Mitigation:** Comprehensive grep search + full typecheck + full test run
- **Risk:** Breaking changes to user workflows
  - **Mitigation:** All 7 acceptance criteria must pass before commit
- **Risk:** Tests pass but manual verification fails
  - **Mitigation:** Mandatory manual testing checklist completion

**Rollback Plan:**
If issues are discovered after deletion:
1. File can be restored from git history: `git checkout HEAD~1 -- tools/src/commands/ralph/claude.ts`
2. Or recreate from `providers/claude.ts` if needed (copy and adjust imports)
3. Revert commit if already pushed: `git revert <commit-hash>`

**MCP Process Cleanup (DEFERRED):**
Per Story 002, MCP cleanup is intentionally deferred:
- Issue #1935 (orphaned MCP processes) is a known issue with Claude Code
- Existing behavior (potential zombie processes) is preserved
- This is acceptable for the initial refactor scope
- Future iteration will address explicit MCP child process cleanup

**Verification Checkpoints:**
1. Before deletion: Confirm all 3 dependency tasks are complete
2. After deletion: Typecheck passes
3. After deletion: Lint passes
4. After deletion: All tests pass
5. Final: All 7 acceptance criteria verified manually

**Commit Scope:**
This change affects the `tools/` subdirectory only. Follow monorepo commit patterns from @context/foundations/scm/commit-monorepo-subdir.md.

### Related Documentation

- @context/blocks/docs/task-template.md - Task file format
- @context/foundations/scm/commit-monorepo-subdir.md - Monorepo commit patterns
- @context/foundations/quality/gate-standards.md - Quality gates (typecheck, lint, test)
- @docs/planning/milestones/004-MULTI-CLI/stories/002-claude-refactor.md - Parent story
- **Gap:** Provider testing patterns - see TASK-043, TASK-044
