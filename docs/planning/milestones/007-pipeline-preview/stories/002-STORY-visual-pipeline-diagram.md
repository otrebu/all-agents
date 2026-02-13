## Story: Visual Pipeline Diagram with Collapsible Phases

### Narrative
As a developer reviewing a cascade plan, I want a structured visual diagram showing each phase's inputs, steps, outputs, and approval gates so that I can understand the full pipeline at a glance without reading code or docs.

### Persona
A developer who runs multi-level cascades like `ralph plan stories --cascade build`. They understand the pipeline conceptually but need a concrete, readable view of what will happen at each level. They work in terminals of varying sizes and occasionally pipe output to files or CI logs. They value information density but not clutter.

### Context
Ralph cascades can chain 4+ phases together, each with different reads, writes, and approval gates. Without a visual representation, users must mentally reconstruct the pipeline from help text and config files. A collapsible tree diagram (entry phase expanded, downstream phases collapsed) gives users the right level of detail: deep where it matters, compact where it doesn't. This is the core deliverable of the milestone.

### Acceptance Criteria
- [ ] Multi-level cascades render as a collapsible tree: entry phase expanded with full detail (reads, steps, writes, gate), downstream phases collapsed to one-liners
- [ ] Single-level commands show a compact banner (6-8 lines) with queue stats, next subtask, mode, and provider
- [ ] Flag annotations use distinct visual markers: `+` for added steps, `~` for replaced steps, `x` for skipped steps, with `[flag-name]` right-aligned
- [ ] Approval gates show the resolved action per mode (auto-proceed, prompt, notify-wait, exit-unstaged)
- [ ] Output renders correctly in TTY (with colors), non-TTY (plain text), and CI environments (NO_COLOR)
- [ ] Summary footer shows total phases, approval stops, estimated time, and actionable next step

### Tasks
- [ ] [TASK-006: Core Pipeline Tree Rendering Engine](../tasks/006-TASK-tree-rendering-core.md)
- [ ] [TASK-007: Flag Annotation Markers and Step Rendering](../tasks/007-TASK-annotation-markers.md)
- [ ] [TASK-008: Pipeline Header, Footer, and Summary Rendering](../tasks/008-TASK-header-footer-rendering.md)
- [ ] [TASK-009: Approval Gate Preview Rendering](../tasks/009-TASK-approval-gate-rendering.md)

### Notes
- Two-tier detail is automatic based on cascade level count, not a user flag
- Uses existing display.ts patterns: BOX_WIDTH, chalk colors, boxen borders
- The visual examples in MILESTONE.md (Examples 1-6) serve as the design spec
- Maps to WS-02 (Visual Pipeline Rendering) from the milestone plan
