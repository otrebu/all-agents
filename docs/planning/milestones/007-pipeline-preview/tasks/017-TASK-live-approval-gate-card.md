## Task: Implement Live Approval Gate Card During Execution

**Story:** [004-STORY-approval-gate-visibility](../stories/004-STORY-approval-gate-visibility.md)

### Goal
When execution reaches an approval gate, show a clear visual card with gate name, what was generated (summary), config mode, resolved action, and action options (approve/abort/edit), making the approval decision context explicit.

### Context
During live execution, approval gates currently trigger via `checkApprovalGate()` in `cascade.ts`, which calls approval functions from `approvals.ts`. The current prompts are minimal text—they don't show the full decision context (config mode, execution mode, why this action was chosen).

This task adds a rich visual card that appears when an approval gate is reached during execution. The card shows:
- Gate name (formatted via `formatGateName()`)
- Summary of what was generated (e.g., "5 story files created: stories/001-STORY-*.md...")
- Config mode and resolved action (e.g., "Config: suggest  Mode: supervised  Action: prompt")
- Action options with keyboard shortcuts (e.g., "[Y] Approve and continue", "[n] Abort cascade", "[e] Edit files first")

This is the MOST complex visual element in the milestone—it combines boxen layout, multi-line content formatting, and integration with existing approval logic.

**Dependencies:**
- Task 016 (gate preview) should be complete—`renderApprovalGatePreview()` may be reusable
- Existing approval functions in `approvals.ts` handle the actual user interaction—this task only adds the visual presentation

### Plan
1. Add `renderApprovalGateCard()` function in `tools/src/commands/ralph/display.ts` that takes: gate name, summary text, config mode, execution mode, resolved action, and returns a styled boxen card
2. Use `boxen` with `borderStyle: "round"`, padding 1, and `BOX_WIDTH` constant for consistency
3. Format card sections: header (gate name), summary (artifact list), context (config/mode/action), options (action buttons)
4. Add visual separators between sections using chalk dim lines
5. Integrate card rendering into `promptApproval()` in `approvals.ts`—call `renderApprovalGateCard()` before showing the prompt
6. Build summary text from artifact context: for stories level, list story files created; for tasks level, list task files; etc.
7. Map action options to keyboard shortcuts: `[Y]` approve (green), `[n]` abort (red), `[e]` edit (yellow)—match existing `promptApproval()` logic
8. Add unit tests for card rendering with various gate types and actions
9. Test manual approval flow in supervised mode to verify card appears correctly

### Acceptance Criteria
- [ ] Approval gate card displays during live execution when reaching a gate
- [ ] Card shows gate name formatted as human-readable text (e.g., "Create Stories" not "createStories")
- [ ] Card shows summary of generated artifacts (file list with paths)
- [ ] Card shows config mode, execution mode, and resolved action
- [ ] Card shows action options with keyboard shortcuts matching existing approval logic
- [ ] Card uses consistent visual style (boxen, BOX_WIDTH, chalk colors)
- [ ] Works in both supervised and headless modes—headless mode shows card in logs even if it auto-proceeds
- [ ] Card integrates with existing `promptApproval()` without breaking current approval flow

### Test Plan
- [ ] Unit test: `renderApprovalGateCard()` with `createStories` gate and summary returns valid boxen string
- [ ] Unit test: Card content includes all required sections (gate name, summary, context, options)
- [ ] Unit test: Card width does not exceed `BOX_WIDTH` constant
- [ ] Manual test: Run `aaa ralph plan stories --milestone M1 --cascade tasks` in supervised mode, verify card appears at `createStories` gate
- [ ] Manual test: Card shows correct action options based on approval config (prompt vs notify-wait vs exit-unstaged)
- [ ] E2E test: Cascade with approval gate in supervised mode shows card before prompting (test exit code only, not visual output)

### Scope
- **In:** Visual approval card rendering, integration with `promptApproval()`, artifact summary generation, action options display
- **Out:** Approval decision logic (already in `approvals.ts`), pipeline header gate symbols (Task 018), gate preview in dry-run (Task 016), editing workflow (`[e]` option implementation—out of scope for this milestone)

### Notes
- The approval card is the centerpiece of gate visibility during execution—invest time in making it clear and visually distinct
- Example layout from MILESTONE.md:
  ```
  ├─ APPROVE: createTasks ──────────────────────────────────────────┤
  │                                                                  │
  │  5 story files have been created:                                │
  │    stories/001-STORY-dry-run-preview.md                          │
  │    ...                                                           │
  │                                                                  │
  │  Config: suggest    Mode: supervised    Action: prompt            │
  │                                                                  │
  │  [Y] Approve and continue to tasks                               │
  │  [n] Abort cascade                                               │
  │  [e] Edit files first, then re-prompt                            │
  │                                                                  │
  └──────────────────────────────────────────────────────────────────┘
  ```
- Use `chalk.green.bold` for `[Y]`, `chalk.red` for `[n]`, `chalk.yellow` for `[e]`
- Summary text should truncate file lists if > 10 files (show first 5 + "... and N more")
- The `[e]` edit option shows in the card but may not be fully implemented in this milestone—it's a visual placeholder for future work

### Related Documentation
- @context/blocks/construct/chalk.md
- @context/blocks/construct/boxen.md
- @context/blocks/construct/ralph-patterns.md
- @context/stacks/cli/cli-bun.md
