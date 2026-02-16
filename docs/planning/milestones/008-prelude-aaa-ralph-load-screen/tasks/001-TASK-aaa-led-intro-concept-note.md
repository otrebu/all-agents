## Task: Define AAA-Led Intro Concept Note

**Story:** [001-STORY-aaa-led-intro-concept](../stories/001-STORY-aaa-led-intro-concept.md) *(required - links to parent story)*

### Goal
Produce one AAA-led startup intro concept note that is terminal-safe, monochrome-readable, and implementation-ready for milestone comparison.

### Context
Milestone 008 explicitly requires an AAA-led variant concept before default intro selection. The repository currently has no dedicated `aaa-led-intro-concept.md` artifact, so downstream implementation would otherwise rely on ad hoc interpretation. Constraints in `docs/planning/milestones/008-prelude-aaa-ralph-load-screen/MILESTONE.md` (about 12-14 lines, about 72 columns, ASCII-safe) and current CLI display patterns in `tools/src/commands/ralph/display.ts` / `tools/tests/lib/display.test.ts` indicate terminal-width discipline is expected and should be captured in this concept task.

### Plan
1. Create `docs/planning/milestones/008-prelude-aaa-ralph-load-screen/aaa-led-intro-concept.md` with sections `Identity Intent`, `Logo Direction`, `Mascot Direction`, `Monochrome Readability`, `AAA vs Ralph Signal`, and `Verification`.
2. Add exactly one fenced `text` sketch block wrapped by `<!-- AAA-ASCII-START -->` / `<!-- AAA-ASCII-END -->` markers so width and character checks can target only the visual payload.
3. Keep the sketch to about 12-14 lines and enforce a maximum 72-character line width, matching the milestone constraints and preserving readability in standard terminal windows.
4. Write explicit copy that makes AAA the first-read identity (title/heading language) while presenting Ralph as secondary mascot context without color-only cues.
5. Add reproducible verification commands in the `Verification` section (width check, ASCII check, terminal preview) that future implementation tasks can rerun unchanged.

### Acceptance Criteria
- [ ] [Behavioral][Profile: module][Tool: markdown checklist] `docs/planning/milestones/008-prelude-aaa-ralph-load-screen/aaa-led-intro-concept.md` defines one AAA-led logo direction and one mascot direction for startup intro use.
- [ ] [Visual][Profile: module][Tool: plain terminal preview via `cat`] The sketch is understandable in monochrome terminal output and does not require color to convey structure or identity.
- [ ] [Behavioral][Profile: module][Tool: content intent checklist] The note explicitly positions AAA as primary identity and Ralph as secondary/supporting signal.
- [ ] [Regression][Profile: module][Tool: shell width/ASCII checks] The marked sketch block remains within 72 columns and printable ASCII range.
- [ ] [Evidence][Profile: module][Tool: command-output capture] Task delivery includes output from the documented verification commands.

### Test Plan
- [ ] [Behavioral][Profile: module][Tool: `awk`] Run `sed -n '/AAA-ASCII-START/,/AAA-ASCII-END/p' docs/planning/milestones/008-prelude-aaa-ralph-load-screen/aaa-led-intro-concept.md | awk 'NR>1 && $0 !~ /AAA-ASCII-(START|END)/ && length>72 { print NR ":" length }'` and confirm no output.
- [ ] [Regression][Profile: module][Tool: `rg`] Run `sed -n '/AAA-ASCII-START/,/AAA-ASCII-END/p' docs/planning/milestones/008-prelude-aaa-ralph-load-screen/aaa-led-intro-concept.md | LC_ALL=C rg -n '[^ -~]'` and confirm no output.
- [ ] [Visual][Profile: module][Tool: `cat`] Run `cat docs/planning/milestones/008-prelude-aaa-ralph-load-screen/aaa-led-intro-concept.md` in a plain terminal and verify AAA-first readability with Ralph as secondary context.
- [ ] [Evidence][Profile: module][Tool: task completion notes] Include captured command outputs for width and ASCII checks with task handoff.

### Scope
- **In:** Author one AAA-led concept note artifact in milestone 008 with terminal-safe, monochrome-readable constraints and reproducible verification commands.
- **Out:** CLI runtime wiring in `tools/src/commands/ralph/*`, Ralph-led concept authoring (story 002), cross-variant constraints spec (story 003), and default-variant selection (story 004).

### Notes
This task is documentation-only by design. Keep wording implementation-ready and measurable so later CLI integration work can execute without reinterpretation.

### Related Documentation
- @context/stacks/cli/cli-bun.md
- @context/blocks/construct/ralph-patterns.md
- @context/foundations/observe/log-structured-cli.md
- @context/workflows/ralph/planning/components/testing-profile-contract.md
- @context/workflows/ralph/planning/components/testing-guidance.md
- @context/blocks/construct/chalk.md
- @context/blocks/construct/boxen.md
