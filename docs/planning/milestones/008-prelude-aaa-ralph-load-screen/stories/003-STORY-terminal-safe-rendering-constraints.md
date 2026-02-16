## Story: Shared Terminal Rendering Constraints Are Defined

### Narrative
As a CLI maintainer preparing implementation handoff, I want shared rendering constraints for intro concepts so that either variant can be shown safely across terminal setups.

### Persona
A maintainer responsible for shipping polished terminal UX across local shells, remote sessions, and CI-like environments. They care about predictable rendering and graceful fallback behavior.

### Context
Milestone 008 requires explicit rendering constraints, including size limits, fallback behavior, and optional color strategy. Without this, concept selection cannot be translated reliably into implementation.

### Acceptance Criteria
- [ ] A shared constraint set defines target intro dimensions (line count and width) for both variants
- [ ] Fallback behavior for limited terminal capabilities is documented so the intro remains understandable
- [ ] Color usage is documented as optional enhancement, not a requirement for brand recognition
- [ ] Both concept variants are evaluated against the same constraint set for fair comparison

### Tasks
<!-- Tasks will be generated separately via tasks-auto.md -->
- [ ] Tasks to be defined

### Notes
Keep constraints scoped to startup intro rendering, not broader terminal theming policy.

