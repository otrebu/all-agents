## Story: Dry-Run Preview Before Execution

### Narrative
As a developer running long Ralph pipelines, I want to preview exactly what a command will do before it executes so that I can catch misconfigurations and avoid wasting time on unintended cascades.

### Persona
A developer who uses Ralph for autonomous building and planning. They frequently run multi-level cascades (`--cascade build`, `--cascade calibrate`) that take 30-60+ minutes. They've been burned before by running a cascade with wrong flags and only discovering the mistake after 20 minutes of execution. They want a "Terraform plan" experience: see the full plan, then decide whether to proceed.

### Context
With the full pipeline operational (plan, build, calibrate, cascade, review), commands can chain multiple levels together. A single typo or forgotten flag can trigger hours of unintended work. The `--dry-run` flag gives users a safety net: preview the entire execution plan (phases, approval gates, reads, writes, flag effects) and exit without executing. This is especially critical for headless/CI runs where there's no human watching.

### Acceptance Criteria
- [ ] Running any pipeline command with `--dry-run` shows a visual execution plan and exits without executing anything
- [ ] The preview shows all cascade levels that would execute, including per-phase detail (reads, steps, writes, approval gates)
- [ ] Flag effects are visually annotated so users can see how `--headless`, `--force`, `--validate-first`, etc. modify the default pipeline
- [ ] `--headless --dry-run` outputs a JSON execution plan suitable for CI consumption
- [ ] The preview uses the same computation functions as the real executor, so the plan cannot drift from reality
- [ ] Exit code is 0 after a successful dry-run preview

### Tasks
- [ ] [001-TASK-execution-plan-computation](../tasks/001-TASK-execution-plan-computation.md) - Create computation layer for execution plan
- [ ] [002-TASK-cli-dry-run-flag](../tasks/002-TASK-cli-dry-run-flag.md) - Wire --dry-run flag to all pipeline commands

### Notes
- The `--dry-run` flag applies to all 8 pipeline commands: `ralph build`, `ralph plan stories/tasks/subtasks/roadmap`, `ralph calibrate all/intention/technical`
- Follows the "Terraform plan" model: static, one-shot, printable, pipeable, CI-friendly
- Zero new dependencies required (uses existing chalk + boxen + string-width)
- Maps to WS-01 (computation), WS-02 (rendering), and WS-04 (CLI integration) from the milestone plan
