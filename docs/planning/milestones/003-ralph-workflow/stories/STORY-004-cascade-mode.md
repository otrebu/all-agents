## Story: Cascade Mode Pipeline

### Narrative

As a developer with a validated milestone plan, I want to cascade through planning levels automatically so that I can go from stories to running build with minimal manual steps.

### Persona

**Developer with established planning artifacts** who trusts the process and wants velocity.

Situation: "I've reviewed my stories and tasks. Now I want to generate subtasks, build them, and calibrate - all in one command without babysitting each transition."

**Functional job:** Chain planning levels together: stories → tasks → subtasks → build → calibrate.

**Emotional job:** Feel the power of automation while maintaining control via approval gates.

### Context

This is the largest missing feature (IMPLEMENTATION_STATUS Section 6). Cascade mode depends on:
1. **STORY-001 (Artifact Approvals)** - Gates between levels
2. **STORY-003 (Auto-Calibration)** - Final calibration step

Cascade is the "automation dial" - users choose how far to automate based on trust level.

### Acceptance Criteria

**CLI flag:**
- [ ] `--cascade <target>` continues to target level after current command completes
- [ ] Valid targets depend on starting level (forward-only):
  | Starting From | Valid Targets |
  |---------------|---------------|
  | `stories` | `tasks`, `subtasks`, `build`, `calibrate` |
  | `tasks` | `subtasks`, `build`, `calibrate` |
  | `subtasks` | `build`, `calibrate` |
  | `build` | `calibrate` |

**Examples:**
- [ ] `ralph plan stories --milestone 003-feature --cascade calibrate` chains all levels
- [ ] `ralph plan subtasks --milestone 003-feature --cascade build` generates and builds
- [ ] `ralph build --cascade calibrate` builds then calibrates

**Orchestration:**
- [ ] Each level completes before next starts
- [ ] Output from one level feeds into next (e.g., generated subtasks.json → build)
- [ ] State persists between levels via filesystem (no in-memory state)

**Approval gates:**
- [ ] Between each level, check `approvals.create<Artifact>` config
- [ ] TTY mode: Follow STORY-001 behavior (auto/suggest/always)
- [ ] Headless mode: Follow STORY-001 behavior (immediate/wait/exit-with-unstaged)

**Resume workflow:**
- [ ] `--from <level>` skips earlier levels, uses existing artifacts
- [ ] `--from subtasks` regenerates subtasks (retry after rejection)
- [ ] Feedback files contain resume commands for reference

**Error handling:**
- [ ] If any level fails, cascade stops with clear error
- [ ] Partial progress is preserved (completed levels remain)
- [ ] Exit code indicates which level failed

**Graceful degradation (dependency handling):**
- [ ] If `approvals` config block not implemented, cascade continues without approval gates (equivalent to `--force`)
- [ ] If `--cascade calibrate` but calibration not available, log warning and stop at build completion
- [ ] Missing dependencies produce clear error: "Cascade to 'calibrate' requires STORY-003 (auto-calibration). Use '--cascade build' instead."

**Timeouts and limits:**
- [ ] Cascade respects `--max-iterations` for build phase
- [ ] No global cascade timeout (user should use system-level timeout like `timeout 4h` if needed)
- [ ] Each level has its own timeout based on existing command behavior

### Tasks

<!-- Tasks will be generated separately via tasks-auto.md -->
- [ ] Tasks to be defined

### Notes

**Implementation estimate:** ~200-400 LOC new orchestration module

**Key design decisions:**
- State via filesystem, not memory (crash-safe)
- Forward-only cascade (no backtracking)
- Approval gates are the "human checkpoint" mechanism

**Related docs:**
- VISION.md Section 3.3 (Cascade Mode)
- IMPLEMENTATION_STATUS.md Section 6
- STORY-001 (Artifact Approvals) - dependency
