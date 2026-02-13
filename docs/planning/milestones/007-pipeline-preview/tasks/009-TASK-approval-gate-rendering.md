## Task: Approval Gate Preview Rendering

**Story:** [002-STORY-visual-pipeline-diagram](../stories/002-STORY-visual-pipeline-diagram.md)

### Goal
Implement approval gate visualization showing resolved actions per mode (auto-proceed, prompt, notify-wait, exit-unstaged) within phase detail and as standalone gate boundaries.

### Context
Approval gates are critical control points in the Ralph pipeline. Users must see in advance whether a gate will prompt, auto-proceed, or block. The gate preview appears in two contexts:

1. **Inline in expanded phase** (GATE section): shows config and resolved action
2. **Collapsed phase summary** (one-liner): shows gate status indicator `[APPROVAL]`

From MILESTONE.md Example 1 (lines 44-45):
```
│  GATE    createStories → SKIP (--force)
```

From Example 4 (lines 170-173):
```
│  ├─ stories    Generate story files              ~3 min   [APPROVAL]
│  ├─ tasks      Break stories into tasks          ~5 min   [APPROVAL]
│  ├─ subtasks   Generate subtask queue            ~8 min   [APPROVAL]
│  └─ build      Execute subtask queue             ~45 min  auto
```

The rendering shows:
- Gate name (e.g., `createStories`)
- Config value (e.g., `suggest`, `require`, `auto`)
- Resolved action per mode (e.g., `SKIP (--force)`, `prompt`, `auto-proceed`, `notify-wait`)

The computation layer (Story 001) calls `evaluateApproval()` to resolve gate actions; this task renders the results.

### Plan
1. Add approval gate types to `tools/src/commands/ralph/types.ts`:
   - `ApprovalGatePreview` interface: `{ gateName: string, configValue: string, resolvedAction: 'skip' | 'prompt' | 'auto-proceed' | 'notify-wait' | 'exit-unstaged', mode: string }`
   - Update `ExpandedPhaseDetail` to include optional `gate?: ApprovalGatePreview`
   - Update `CollapsedPhaseSummary` to include optional `gateStatus?: 'APPROVAL' | 'auto' | 'SKIP'`
2. Create `renderApprovalGatePreview()` in `tools/src/commands/ralph/display.ts`:
   - Accept `ApprovalGatePreview` data
   - Format: `<gateName> → <ACTION> (<reason>)` or `<gateName> → <ACTION>`
   - Apply colors:
     - `skip`: yellow with reason in parentheses (e.g., `SKIP (--force)`)
     - `prompt`: yellow bold (e.g., `PROMPT`)
     - `auto-proceed`: green (e.g., `AUTO`)
     - `notify-wait`: yellow with duration (e.g., `WAIT (5m)`)
     - `exit-unstaged`: red (e.g., `EXIT-UNSTAGED`)
   - Return formatted string for inline use in expanded phase GATE section
3. Create `renderGateStatusIndicator()` helper:
   - Accept gate status: `'APPROVAL' | 'auto' | 'SKIP'`
   - Return short tag for collapsed phase one-liner: `[APPROVAL]`, `auto`, `[SKIP]`
   - Apply colors: yellow for `[APPROVAL]`, green for `auto`, yellow for `[SKIP]`
4. Update `renderExpandedPhase()` from TASK-006:
   - Add GATE section rendering after WRITES
   - Indent: `│  GATE    <renderApprovalGatePreview() output>`
   - Only render GATE section if phase has gate defined
5. Update `renderCollapsedPhase()` from TASK-006:
   - Append gate status indicator to one-liner: `├─ stories  Generate files  ~3 min  [APPROVAL]`
   - Use `renderGateStatusIndicator()` for consistent formatting
6. Add unit tests in `tools/tests/lib/display.test.ts`:
   - Test gate preview with `skip` action shows `SKIP (--force)` in yellow
   - Test gate preview with `prompt` action shows `PROMPT` in yellow bold
   - Test gate preview with `auto-proceed` action shows `AUTO` in green
   - Test gate status indicator for collapsed phase shows `[APPROVAL]` tag
   - Test expanded phase with gate section present
   - Test collapsed phase with gate indicator appended

### Acceptance Criteria
- [ ] `renderApprovalGatePreview()` formats gate name, config, and resolved action correctly
- [ ] Gate actions display with appropriate colors (skip=yellow, prompt=yellow bold, auto=green, wait=yellow, exit=red)
- [ ] `SKIP` action includes reason in parentheses (e.g., `(--force)`)
- [ ] Gate status indicators in collapsed phases show `[APPROVAL]`, `auto`, or `[SKIP]` appropriately
- [ ] Expanded phase GATE section renders after WRITES with proper indentation
- [ ] Collapsed phase one-liner includes gate indicator at the end
- [ ] Visual output matches MILESTONE.md Example 1 (line 45) and Example 4 (lines 170-173)

### Test Plan
- [ ] Unit test: render gate with `skip` action, verify format and color
- [ ] Unit test: render gate with `prompt` action, verify format and color
- [ ] Unit test: render gate with `auto-proceed` action, verify format and color
- [ ] Unit test: render gate status indicator for each status type
- [ ] Unit test: expanded phase with gate section
- [ ] Unit test: collapsed phase with gate indicator
- [ ] Visual test: inspect gate rendering in full pipeline tree

### Scope
- **In:** Inline gate preview rendering in expanded phase GATE section
- **In:** Gate status indicators for collapsed phase one-liners
- **In:** Color coding for different gate actions
- **In:** Reason display for `skip` action (e.g., `(--force)`)
- **Out:** Gate action resolution logic — `evaluateApproval()` in approvals.ts (already exists)
- **Out:** Standalone approval prompt card (APPROVE card from Example 4, lines 346-361) — handled in live execution story (WS-03)
- **Out:** Wait duration calculation — computation layer responsibility

### Notes
- Use existing `evaluateApproval()` function from `tools/src/commands/ralph/approvals.ts` for reference on action types
- The gate preview is informational only — actual prompting happens during execution, not in preview
- Gate names match approval gate keys in config: `createStories`, `createTasks`, `createSubtasks`, etc.
- The `--force` flag skips all gates, `--review` requires all gates — these effects are shown in the preview
- Color choices match existing Ralph display patterns: yellow for warnings/gates, green for success/auto, red for errors/blocks
- The design follows "Approval Gate Visibility" principle from milestone objective: users should never be surprised by a gate

### Related Documentation
- @context/blocks/construct/chalk.md
- @context/blocks/construct/boxen.md
- @context/blocks/construct/ralph-patterns.md
- `tools/src/commands/ralph/approvals.ts` (existing gate evaluation logic)
