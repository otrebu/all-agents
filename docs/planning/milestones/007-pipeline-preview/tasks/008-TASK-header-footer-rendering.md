## Task: Pipeline Header, Footer, and Summary Rendering

**Story:** [002-STORY-visual-pipeline-diagram](../stories/002-STORY-visual-pipeline-diagram.md)

### Goal
Implement the pipeline header (double-border box with command/mode/milestone info), summary footer (totals, warnings, next steps), and compact preview banner for single-level commands.

### Context
The pipeline diagram needs clear visual boundaries and summary information. The header provides context (what command, which milestone, execution mode), and the footer provides actionable next steps and totals. These components wrap the tree structure from TASK-006.

From MILESTONE.md Example 1 (lines 24-30):
```
╔══════════════════════════════════════════════════════════════════════╗
║                      Ralph Pipeline Plan                            ║
╠══════════════════════════════════════════════════════════════════════╣
║  Command:   plan stories --cascade build                            ║
║  Milestone: M1                        Provider: claude (opus-4)     ║
║  Mode:      headless                  Approvals: skipped (--force)  ║
╚══════════════════════════════════════════════════════════════════════╝
```

The summary footer appears at the end of the tree (lines 62-71 in Example 1). The compact preview is a simpler banner for single-level commands (Example 3, lines 134-151).

### Plan
1. Add header/footer types to `tools/src/commands/ralph/types.ts`:
   - `PipelineHeaderData` interface: `{ commandLine: string, milestone?: string, mode: string, provider: string, model?: string, approvalsStatus: string }`
   - `PipelineFooterData` interface: `{ phaseCount: number, approvalCount: number, estimatedMinutes: number, estimatedCostRange?: string, warnings?: string[], nextStep: string }`
   - `CompactPreviewData` interface: `{ milestone: string, provider: string, model: string, queueStats: string, nextSubtask: string, mode: string, validateStatus: string, pipelineSummary: string, gatesSummary: string }`
2. Create `renderPipelineHeader()` in `tools/src/commands/ralph/display.ts`:
   - Use boxen with `borderStyle: 'double'`, width = `BOX_WIDTH`
   - Title: "Ralph Pipeline Plan" (centered)
   - Format two-row layout inside box:
     - Row 1: `Command: <command>`
     - Row 2: `Milestone: <milestone>` (left), `Provider: <provider> (<model>)` (right)
     - Row 3: `Mode: <mode>` (left), `Approvals: <status>` (right)
   - Use chalk.dim for labels, chalk.cyan for values
   - Handle missing milestone/model gracefully (omit if undefined)
3. Create `renderPipelineFooter()` in `tools/src/commands/ralph/display.ts`:
   - Render inside plan box (not a separate boxen, just formatted lines)
   - Section separator: `─` repeated to inner width
   - Summary line: `Phases: N  Gates: N (status)  Est. time: ~X min  Est. cost: $X.XX - $X.XX`
   - Warning lines if present: `⚠ <warning text>` in yellow
   - Next step line: `To execute: remove --dry-run flag` or `Proceed? [Y/n]:` depending on mode
   - Apply chalk colors: dim for labels, cyan for counts, magenta for costs, yellow for warnings
4. Create `renderCompactPreview()` in `tools/src/commands/ralph/display.ts`:
   - Use boxen with `borderStyle: 'double'`, width = `BOX_WIDTH`
   - Title: "Ralph Build" (or command name, centered)
   - Format 6-8 line layout (Example 3, lines 139-149):
     - Milestone
     - Provider + Model
     - Queue stats (pending/total, completed, percentage)
     - Next subtask (ID + title)
     - Mode + Validate status
     - Horizontal separator
     - Pipeline summary (single level name)
     - Gates summary
   - Use existing patterns from `renderPlanSubtasksSummary()` for layout inspiration
5. Add layout helper `formatTwoColumnRow()`:
   - Accept left text, right text, and inner width
   - Left-align left text, right-align right text, pad center with spaces
   - Return formatted row string
   - Use string-width for ANSI-safe alignment
6. Add unit tests in `tools/tests/lib/display.test.ts`:
   - Test header with all fields present
   - Test header with missing milestone/model
   - Test footer with warnings present
   - Test footer without warnings
   - Test compact preview rendering
   - Test two-column alignment helper

### Acceptance Criteria
- [ ] `renderPipelineHeader()` produces double-border box matching Example 1 structure
- [ ] Header two-column rows align correctly (left-aligned labels, right-aligned values)
- [ ] `renderPipelineFooter()` shows summary with totals, warnings, and next step
- [ ] Footer integrates cleanly into plan box without extra borders
- [ ] `renderCompactPreview()` produces 6-8 line banner matching Example 3
- [ ] Compact preview uses existing `renderCommandBanner()` or boxen for consistency
- [ ] All functions handle missing optional data gracefully (no crashes, omit fields)
- [ ] Visual output matches MILESTONE.md Examples 1 and 3

### Test Plan
- [ ] Unit test: render full header with all fields
- [ ] Unit test: render header with missing optional fields
- [ ] Unit test: render footer with warnings
- [ ] Unit test: render footer without warnings
- [ ] Unit test: render compact preview for build command
- [ ] Visual test: inspect header/footer in terminal
- [ ] Visual test: inspect compact preview in terminal

### Scope
- **In:** Pipeline header rendering (double-border box, two-column layout)
- **In:** Summary footer rendering (totals, warnings, next steps)
- **In:** Compact preview banner for single-level commands
- **In:** Two-column alignment helper
- **Out:** Header/footer data computation — Story 001's responsibility
- **Out:** Approval gate detail popup — separate approval rendering task
- **Out:** Live execution header (with status symbols) — Story 003/WS-03

### Notes
- Use existing `BOX_WIDTH` constant (68) for all layout calculations
- The header is displayed once at the top of the plan output
- The footer is displayed once at the bottom of the tree
- Compact preview is an alternative to full diagram for simple commands (auto-selected based on cascade level count)
- Two-column alignment must handle ANSI codes properly (use string-width)
- Follow existing display.ts conventions: boxen for top-level containers, chalk for inline styling
- The compact preview design is based on Example 3 (lines 134-151) which is simpler than the full diagram

### Related Documentation
- @context/blocks/construct/chalk.md
- @context/blocks/construct/boxen.md
- @context/blocks/construct/ralph-patterns.md
- @context/stacks/cli/cli-bun.md
