## Story: Auto-Calibration During Build

### Narrative

As a developer running long build sessions, I want calibration to run automatically at intervals so that drift is detected early without manual intervention.

### Persona

**Developer running multi-hour builds** who wants governance without babysitting.

Situation: "I kicked off a 50-subtask build. By subtask 30, the agent might have drifted from intent, but I won't know until I review commits tomorrow."

**Functional job:** Run calibration automatically every N iterations during build loop.

**Emotional job:** Trust that the system self-corrects without constant oversight.

### Context

Calibration commands exist and work (`ralph calibrate intention/technical/improve`). What's missing:
1. The `--calibrate-every <n>` flag for build command (IMPLEMENTATION_STATUS Section 1.2)
2. The `calibration` config block (IMPLEMENTATION_STATUS Section 5.4)

Currently, calibration only runs when manually invoked. Auto-calibration integrates it into the build loop.

### Acceptance Criteria

**CLI flag:**
- [ ] `ralph build --calibrate-every 10` runs calibration after every 10 completed subtasks
- [ ] Flag accepts positive integer (1-100 reasonable range)
- [ ] Default: disabled (no automatic calibration)

**Config block:**
- [ ] `aaa.config.json` supports `calibration` block:
  ```json
  {
    "calibration": {
      "everyNIterations": 10,
      "afterMilestone": true
    }
  }
  ```
- [ ] CLI flag overrides config value
- [ ] `afterMilestone: true` triggers calibration when all subtasks complete

**Calibration behavior:**
- [ ] When triggered, runs `ralph calibrate all` (intention + technical + improve)
- [ ] If drift detected, behavior follows `approvals.onDriftDetected` config
- [ ] Calibration uses completed subtasks since last calibration (not all completed)

**Build loop integration:**
- [ ] Counter tracks iterations since last calibration
- [ ] Counter resets to zero after ANY calibration (automatic or manual `ralph calibrate`)
- [ ] Calibration runs BETWEEN iterations (after commit, before next subtask)
- [ ] Build loop resumes after calibration completes
- [ ] If drift detected mid-build, current iteration completes before calibration pauses/acts

**Reporting:**
- [ ] Status output shows: "Calibration: every 10 iterations (next at iteration 7)"
- [ ] Iteration diary logs calibration events

### Tasks

<!-- Tasks will be generated separately via tasks-auto.md -->
- [ ] Tasks to be defined

### Notes

**Implementation locations:**
- Build loop: `tools/src/commands/ralph/build.ts`
- Config: `tools/src/commands/ralph/config.ts`
- Schema: `docs/planning/schemas/aaa-config.schema.json`

**Related docs:**
- VISION.md Section 5 (Calibration Configuration)
- IMPLEMENTATION_STATUS.md Section 5.4
