# Ralph Testing Feedback

Raw observations during hands-on testing. Process into Tasks/Stories when done.

---

## 2026-01-19

### CLI: Missing `aaa ralph milestones` Command
- Completion script lists `milestones` subcommand but it doesn't exist
- Need to add `aaa ralph milestones` to list available milestones
- Should parse `docs/planning/roadmap.md` for milestone headers
- Already have `discoverMilestones()` in `tools/lib/milestones.ts` - just need CLI command

### CLI: Auto-completion for Milestone Options
- `--milestone` flag requires exact name, no discovery
- Should auto-complete from available milestones in `docs/planning/milestones/`
- Or parse ROADMAP.md to extract milestone slugs
- Example: `aaa ralph plan stories --milestone <TAB>` → shows available options
- Could also add `aaa ralph milestones` command to list them

### CLI: Cascading Auto Mode
- Current auto mode only does one level at a time
- Need `--cascade` or `--full-auto` flag that chains through the entire workflow
- After vision (if exists) → auto-generate roadmap → auto-generate stories for ALL milestones → auto-generate tasks for ALL stories → auto-generate subtasks for ALL tasks
- Example: `aaa ralph plan --cascade` or `aaa ralph plan stories --auto --cascade`
- Could also start from any level: `--cascade` from stories would do stories → tasks → subtasks for all
- Risk: massive generation without review - maybe require `--force` or add confirmation prompts between levels
- Useful for: bootstrapping a new project, regenerating after major vision changes

