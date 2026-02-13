## Task: Flag Annotation Markers and Step Rendering

**Story:** [002-STORY-visual-pipeline-diagram](../stories/002-STORY-visual-pipeline-diagram.md)

### Goal
Implement flag annotation markers (`+`, `~`, `×`) with right-aligned flag tags to visually indicate which steps are added, replaced, or skipped by command flags.

### Context
Flags like `--headless`, `--force`, and `--validate-first` modify pipeline behavior. Users need to see these effects clearly in the preview diagram. The annotation system uses visual markers and right-aligned tags within expanded phase step lists.

From MILESTONE.md Example 1 (lines 39-43):
```
│  STEPS   1. Read milestone description
│       ~  2. Single-pass autonomous generation        [headless]
│       ~  3. Generate without iteration               [headless]
│          4. Number stories (S-001, S-002...)
│          5. Write each as separate file
│       +  6. Auto-approve all changes                    [force]
```

The markers and colors convey intent:
- `+` (green) = step added by a flag
- `~` (orange/yellow) = step replaced by a flag
- `×` (dim, strikethrough) = step skipped by a flag

This task extends the step rendering from TASK-006 to handle annotations. The computation layer (Story 001) will provide the annotation metadata; this task renders it.

### Plan
1. Add annotation types to `tools/src/commands/ralph/types.ts`:
   - `StepAnnotation` interface: `{ effect: 'added' | 'replaced' | 'struck', flag: string }`
   - `PipelineStep` interface: `{ text: string, annotation?: StepAnnotation }`
   - Update `ExpandedPhaseDetail` to use `PipelineStep[]` for steps
2. Create `renderAnnotatedStep()` in `tools/src/commands/ralph/display.ts`:
   - Accept step text, optional annotation, and max line width
   - Apply annotation marker (`+`, `~`, `×`) before step text
   - Apply color: green for `+`, yellow for `~`, dim+strikethrough for `×`
   - Right-align flag tag in `[flag-name]` format within `BOX_WIDTH - indent`
   - Handle line length: truncate step text if needed to fit flag tag
3. Create `formatStepWithAnnotation()` helper:
   - Calculate available width: `BOX_WIDTH - indent - marker(3) - flagTag(length)`
   - Truncate step text using existing `truncate()` if needed
   - Return formatted line with proper spacing: `   ~  Step text...   [flag-name]`
4. Update `renderExpandedPhase()` from TASK-006:
   - Use `renderAnnotatedStep()` for STEPS section
   - Apply 4-space indent + marker + step text + right-aligned flag tag
   - Preserve existing indentation for READS/WRITES sections (no annotations there)
5. Add visual marker constants:
   - `MARKER_ADDED = '+'` (chalk.green)
   - `MARKER_REPLACED = '~'` (chalk.yellow)
   - `MARKER_STRUCK = '×'` (chalk.dim + strikethrough on step text)
6. Add unit tests in `tools/tests/lib/display.test.ts`:
   - Test step with `added` annotation shows `+` and green color
   - Test step with `replaced` annotation shows `~` and yellow color
   - Test step with `struck` annotation shows `×`, dim, and strikethrough
   - Test flag tag right-alignment with different step text lengths
   - Test truncation when step text + flag tag exceed line width

### Acceptance Criteria
- [ ] Steps with `added` annotation render with `+` marker in green and `[flag-name]` right-aligned
- [ ] Steps with `replaced` annotation render with `~` marker in yellow and `[flag-name]` right-aligned
- [ ] Steps with `struck` annotation render with `×` marker, dim styling, strikethrough text, and `[flag-name]` right-aligned
- [ ] Steps without annotations render with normal indentation (no marker, no flag tag)
- [ ] Flag tags align correctly within BOX_WIDTH regardless of step text length
- [ ] Long step text truncates properly to prevent line overflow
- [ ] Visual output matches MILESTONE.md Example 1 annotation style (lines 39-43)

### Test Plan
- [ ] Unit test: render step with `added` annotation, verify marker and color
- [ ] Unit test: render step with `replaced` annotation, verify marker and color
- [ ] Unit test: render step with `struck` annotation, verify marker, dim, and strikethrough
- [ ] Unit test: render step without annotation, verify plain formatting
- [ ] Unit test: long step text with flag tag, verify truncation
- [ ] Visual test: inspect Example 1 annotation rendering in terminal

### Scope
- **In:** Step annotation marker rendering (`+`, `~`, `×`)
- **In:** Flag tag right-alignment within step lines
- **In:** Color application (green, yellow, dim+strikethrough)
- **In:** Text truncation to prevent line overflow
- **Out:** Annotation metadata computation — Story 001's responsibility
- **Out:** READS/WRITES section rendering — no annotations needed there
- **Out:** Approval gate annotations — separate rendering pattern

### Notes
- Use string-width package for ANSI-safe width calculations (already in display.ts)
- The right-alignment math must account for ANSI escape codes (chalk colors don't count toward visual width)
- Strikethrough styling: `chalk.dim.strikethrough(text)`
- Flag tags are always wrapped in brackets: `[flag-name]`, no exceptions
- If multiple flags affect the same step, show only one tag (computation layer picks most relevant)
- The annotation design follows the "Annotation Markers" section in MILESTONE.md (lines 77-84)

### Related Documentation
- @context/blocks/construct/chalk.md (strikethrough, color chaining)
- @context/blocks/construct/boxen.md (BOX_WIDTH reference)
- @context/blocks/construct/ralph-patterns.md
