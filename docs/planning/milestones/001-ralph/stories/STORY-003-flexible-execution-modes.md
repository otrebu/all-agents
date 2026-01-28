## Story: Flexible Execution Modes

### Narrative
As a developer with varying trust levels in autonomous systems, I want to choose between interactive, supervised, and headless execution modes so that I can control how closely I monitor Ralph's work.

### Persona
A pragmatic engineer who adjusts their supervision level based on context. For unfamiliar codebases or critical changes, they want to watch every iteration and can intervene. For trusted patterns or non-critical work, they prefer to let Ralph run autonomously and review results afterward. They appreciate systems that adapt to their comfort level rather than forcing one interaction model.

### Context
The trust gradient concept from VISION.md acknowledges that developers don't trust AI uniformly. Early in a project or for sensitive code, tight supervision makes sense. Once patterns are proven, headless execution saves time. Supporting multiple modes lets developers incrementally build confidence in Ralph's capabilities.

### Acceptance Criteria
- [ ] `ralph build` runs in headless mode by default (one iteration per Claude session)
- [ ] `ralph build -i` or `ralph build --interactive` pauses after each iteration for user to type "continue" or review
- [ ] `ralph build --supervised` allows user to watch chat output and intervene if needed
- [ ] Mode choice does not affect iteration quality or output format
- [ ] Headless mode outputs structured JSON for machine parsing
- [ ] Non-TTY environments (CI/CD) automatically skip interactive prompts and continue

### Tasks
<!-- Tasks will be generated separately via tasks-auto.md -->
- [ ] Tasks to be defined

### Notes
**Three modes compared:**

| Mode | Use When | Invocation | User Position |
|------|----------|------------|---------------|
| **Interactive** | Want to review each iteration before proceeding | `ralph build -i` | User confirms between iterations |
| **Supervised** | Want to watch but not pause | `ralph build --supervised` | User watches chat, can type if needed |
| **Headless** | Trust system, review after | `ralph build` (default) | User reviews logs/commits afterward |

**Implementation notes:**
- All modes use `--dangerously-skip-permissions` - safety comes from iteration boundaries, not inline prompts
- Headless mode uses `--output-format json` for structured parsing
- Interactive mode calls `promptContinue()` with 5-minute timeout to prevent CI hangs
- TTY detection (`process.stdin.isTTY`) prevents prompts in non-interactive environments

**Future:** Skills for Claude Code (milestone 4) will add `/ralph-build` as another entry point, running within an existing Claude Code session.
