## Story: Approval Gate Visibility Before and During Execution

### Narrative
As a developer running cascades with approval gates, I want to see where approvals will be required before the cascade starts so that I am never surprised by an unexpected prompt or a headless exit mid-pipeline.

### Persona
A developer or team lead who configures approval gates in `ralph.config.json` (e.g., `createStories: "always"`, `createSubtasks: "suggest"`). They run cascades in different modes (supervised, headless, with `--force` or `--review`) and need to understand how their config + flags combine to determine what happens at each gate. Being surprised by an approval prompt after 20 minutes of execution breaks their flow; a headless pipeline exiting unexpectedly wastes CI time.

### Context
Ralph's approval system has three modes (`auto`, `suggest`, `always`) that interact with execution mode (supervised/headless) and override flags (`--force`/`--review`). The resulting behavior matrix is non-obvious. Showing gate status in the preview (both in `--dry-run` and in the pre-execution summary) makes the approval flow predictable. During execution, approval gates display as a visual card with the gate name, config, and options.

### Acceptance Criteria
- [ ] The dry-run preview shows each approval gate with its resolved action (SKIP, PROMPT, NOTIFY-WAIT, EXIT-UNSTAGED) based on config, mode, and flags
- [ ] The `--force` flag is visually annotated as skipping all approval gates
- [ ] The `--review` flag is visually annotated as requiring approval at every gate
- [ ] During live execution, reaching an approval gate shows a clear card with gate name, what was generated, and action options (approve/abort/edit)
- [ ] The pipeline header uses a distinct symbol (`pause`) for gates in waiting state, differentiating from running (`dot`) and complete (`checkmark`)

### Tasks
- [ ] [016-TASK-approval-gate-preview-rendering](../tasks/016-TASK-approval-gate-preview-rendering.md) - Add approval gate preview rendering in dry-run mode
- [ ] [017-TASK-live-approval-gate-card](../tasks/017-TASK-live-approval-gate-card.md) - Implement live approval gate card during execution
- [ ] [018-TASK-pipeline-header-gate-symbols](../tasks/018-TASK-pipeline-header-gate-symbols.md) - Wire approval gate status into pipeline header

### Notes
- Approval visibility is woven through both WS-02 (rendering) and WS-04 (CLI integration)
- The approval resolution logic already exists in `evaluateApproval()` from approvals.ts - preview reuses it
- Gate names map to config keys: `createRoadmap`, `createStories`, `createTasks`, `createSubtasks`, `onDriftDetected`
