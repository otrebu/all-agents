## Task: Review CLI Command with Trust Gradient

**Story:** [STORY-001-parallel-code-review](../stories/STORY-001-parallel-code-review.md)

### Goal
Create `aaa review` CLI command with supervised and headless modes following the same trust gradient pattern as Ralph.

### Context
Phase 4 of the Parallel Code Review story. Following Ralph's trust gradient pattern:
- **Interactive** (skill): Human in loop, always (existing `/dev:code-review`)
- **Supervised**: Autopilot, user can watch and stop
- **Headless**: Fully autonomous, auto-fix, logs

The CLI extracts and reuses patterns from Ralph:
- Claude invocation helpers from `tools/src/commands/ralph/claude.ts`
- Display utilities from `tools/src/commands/ralph/display.ts`
- Diary pattern from `tools/src/commands/ralph/post-iteration.ts`

### Plan
1. Create types at `tools/src/commands/review/types.ts`:
   - Define Finding interface (same as agent schema)
   - Define ReviewDiaryEntry interface for logging
   - Define ReviewResult interface for CLI output
2. Create main command at `tools/src/commands/review/index.ts`:
   - `aaa review` - Asks: supervised or headless?
   - `aaa review --supervised` - Autopilot, can stop manually
   - `aaa review --headless` - Fully autonomous, auto-fix
   - `aaa review --headless --dry-run` - Preview without fixing
   - `aaa review status` - Show review diary
3. Create review execution logic:
   - Invoke parallel reviewer agents using headless claude invocation
   - Synthesize findings
   - Auto-triage based on severity/confidence
   - Apply fixes (or preview in dry-run mode)
4. Create diary logging:
   - Log to `logs/reviews.jsonl` (similar to ralph's iterations.jsonl)
   - Track findings, fixed, skipped, falsePositives
5. Update shell completions (bash, zsh, fish):
   - Add `review` command with `--supervised`, `--headless`, `--dry-run` flags
   - Add `status` subcommand
6. Register command in CLI entry point

### Acceptance Criteria
- [ ] `aaa review` prompts for mode selection
- [ ] `aaa review --supervised` runs with user watching
- [ ] `aaa review --headless` runs fully autonomous
- [ ] `aaa review --headless --dry-run` shows preview without fixing
- [ ] `aaa review status` shows review history from diary
- [ ] Diary entries logged to `logs/reviews.jsonl`
- [ ] Shell completions work for new command

### Test Plan
- [ ] E2E: `aaa review --help` shows all options
- [ ] E2E: `aaa review status` works with empty diary
- [ ] Manual: Run `aaa review --supervised` and verify user can watch
- [ ] Manual: Run `aaa review --headless --dry-run` and verify no changes made

### Scope
- **In:** CLI command, types, diary logging, shell completions
- **Out:** Reviewer agents (TASK-015), skill enhancement (TASK-016)

### Notes
Reuse from Ralph (DRY principle):
- `invokeClaudeChat()` for supervised mode
- `invokeClaudeHeadless()` for headless mode
- `renderIterationEnd()` / `renderIterationStart()` for display
- Diary pattern from `post-iteration.ts`

Consider extracting these to a shared `tools/lib/` location if duplication becomes significant.

### Related Documentation
- @tools/src/commands/ralph/claude.ts (invocation helpers)
- @tools/src/commands/ralph/display.ts (display utilities)
- @tools/src/commands/ralph/post-iteration.ts (diary pattern)
- @context/blocks/construct/ralph-patterns.md (trust gradient modes)
