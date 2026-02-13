## Task: Core Pipeline Tree Rendering Engine

**Story:** [002-STORY-visual-pipeline-diagram](../stories/002-STORY-visual-pipeline-diagram.md)

### Goal
Implement the foundational tree rendering functions that display pipeline phases in collapsible tree layout with proper connectors, symbols, and visual hierarchy.

### Context
The visual pipeline diagram is the centerpiece of the milestone — it shows users exactly what a Ralph command will do before execution. The tree renderer must handle:
- Expanded nodes (`▾`) showing full reads/steps/writes/gate sections
- Collapsed nodes (`├─`, `└─`) showing one-line summaries
- Proper indentation and tree connectors
- Phase-level detail without clutter

This task builds the core tree layout primitives that other rendering functions will use. The implementation follows existing patterns in `display.ts` (BOX_WIDTH, chalk styling, boxen integration) and references the 6 visual examples in MILESTONE.md as the design spec.

Story 001 (computation layer) will provide the `ExecutionPlan` data structure that feeds into these rendering functions. This task focuses solely on turning that data into visual output.

### Plan
1. Add tree rendering types to `tools/src/commands/ralph/types.ts`:
   - `PipelinePhaseNode` interface (name, expanded, reads, steps, writes, gate, timeEstimate)
   - `StepAnnotation` type (effect: 'added' | 'replaced' | 'struck', flag: string)
   - `ExpandedPhaseDetail` interface (sections: reads[], steps[], writes[], gate?)
   - `CollapsedPhaseSummary` interface (description, timeEstimate, gateStatus)
2. Create `renderPipelineTree()` in `tools/src/commands/ralph/display.ts`:
   - Accept array of `PipelinePhaseNode[]` as input
   - Use tree symbols: `├─`, `└─`, `│`, `▾` (expanded), `▸` (collapsed)
   - Apply proper indentation (2 spaces per level)
   - Return formatted string array (one element per line)
3. Create `renderExpandedPhase()` helper:
   - Render phase with `▾` symbol and name on first line
   - Indent READS/STEPS/WRITES/GATE sections by 4 spaces (`│  READS ...`)
   - Apply chalk colors: cyan for phase names, dim for section labels, yellow for gates
   - Use existing `BOX_WIDTH` constant for line length constraints
4. Create `renderCollapsedPhase()` helper:
   - Render phase with tree connector (`├─` or `└─`) and name
   - Show one-line summary: `├─ tasks  Break stories into task files  ~5 min  [APPROVAL]`
   - Apply chalk colors: cyan for phase names, dim for description, yellow for gate indicators
5. Add unit tests in `tools/tests/lib/display.test.ts`:
   - Test expanded phase with all sections present
   - Test collapsed phase with tree connectors
   - Test mixed expanded/collapsed tree rendering
   - Test proper symbol positioning (last node uses `└─`, others use `├─`)

### Acceptance Criteria
- [ ] `renderPipelineTree()` produces correct tree structure with connectors for 2-4 phase pipeline
- [ ] Expanded phase shows all sections (READS, STEPS, WRITES, GATE) with proper indentation
- [ ] Collapsed phase shows one-line summary with connector symbols
- [ ] Last collapsed phase uses `└─` connector, others use `├─`
- [ ] Visual output matches Example 1 tree structure from MILESTONE.md (structure, not annotations yet)
- [ ] All rendering functions return string arrays for easy joining/testing
- [ ] Chalk colors applied consistently (cyan phases, dim labels, yellow gates)

### Test Plan
- [ ] Unit test: render single expanded phase with all sections
- [ ] Unit test: render 3 collapsed phases with correct connectors
- [ ] Unit test: render mixed tree (1 expanded + 2 collapsed)
- [ ] Visual test: inspect output in terminal matches MILESTONE.md Example 1 structure
- [ ] Test ANSI width calculation handles chalk styling correctly (use string-width if needed)

### Scope
- **In:** Core tree rendering primitives (tree connectors, expanded/collapsed phase rendering, basic layout)
- **In:** Type definitions for pipeline phase nodes and tree structure
- **In:** Basic chalk styling for visual hierarchy
- **Out:** Annotation markers (`+`, `~`, `×`) and flag tags — handled in next task
- **Out:** Approval gate detail rendering — separate task
- **Out:** Header/footer rendering — separate task
- **Out:** Integration with `ExecutionPlan` computation — Story 001's responsibility

### Notes
- Follow existing `display.ts` patterns: functions return formatted strings, tests can verify without TTY
- The tree structure is read-only display — no interactivity needed
- Use boxen `BOX_WIDTH` constant (68) for consistent layout across all Ralph outputs
- Tree symbols (`├─`, `└─`, etc.) are Unicode characters that render well in all modern terminals
- The expanded phase detail format directly maps to Example 1 in MILESTONE.md (lines 32-46)

### Related Documentation
- @context/blocks/construct/chalk.md
- @context/blocks/construct/boxen.md
- @context/blocks/construct/ralph-patterns.md
- @context/stacks/cli/cli-bun.md
- @context/foundations/test/test-e2e-cli-bun.md
