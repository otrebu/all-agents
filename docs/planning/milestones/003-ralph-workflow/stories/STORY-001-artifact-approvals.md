## Story: Artifact-Centric Approval System

### Narrative

As a developer running cascade mode, I want to match the approval friction to my current trust level so I get the right amount of control without unnecessary interruption.

### Persona

**Developer running cascade mode** who wants control over what gets written.

Different situations require different trust levels:

| Situation | Trust Level | Need |
|-----------|-------------|------|
| Exploring new feature | Low | "Show me everything before writing" |
| Confident in planning | Medium | "Just checkpoint before build starts" |
| Overnight batch run | High | "Run it all, I'll review tomorrow" |

**Emotional job:** Feel in control without feeling micromanaged.

**Social job:** Be able to justify to the team that human review happened at appropriate points.

### Context

The original approval design used **transition-based gates** (`storiesToTasks`, `tasksToSubtasks`) which don't align with cascade mode's targeted execution model. When a user specifies `--cascade subtasks`, they've already implicitly approved that scope.

The new **artifact-centric model** triggers approvals when artifacts are created/changed, not when moving between pipeline stages. This aligns with how developers actually think about review: "What did you generate? Let me see it before you write it."

### Acceptance Criteria

**Config-based approval gates:**
- [ ] `aaa.config.json` supports `approvals` block with artifact-centric gates
- [ ] Gates: `createRoadmap`, `createStories`, `createTasks`, `createSubtasks`, `onDriftDetected`, `correctionTasks`, `promptChanges`, `createAtomicDocs`
- [ ] Each gate accepts modes: `"auto"` | `"suggest"` | `"always"`

**TTY mode (supervised/interactive):**
- [ ] `"auto"` - write artifact immediately
- [ ] `"suggest"` - show artifact summary, brief pause, continue
- [ ] `"always"` - prompt Y/n, wait for explicit response

**Headless mode:**
- [ ] `"auto"` - write artifact immediately
- [ ] `"suggest"` - send notification, wait configurable time (default 3 min), continue
- [ ] `"always"` - write artifacts as unstaged changes, write feedback, exit cascade

**Git-based approval workflow (headless + "always"):**
- [ ] Before generating, cascade commits current state as checkpoint
- [ ] Generated artifacts written as unstaged changes
- [ ] Feedback written to `docs/planning/milestones/<milestone>/feedback/<date>_<kind>_<ref>.md` (unstaged)
- [ ] Cascade exits with instructions: approve (`git add . && commit`), reject (`git checkout .`), modify (edit then approve)
- [ ] Resume with `--from <next-level>` flag to continue cascade

**`onDriftDetected` (same pattern):**
- [ ] `"auto"` - apply suggested action automatically
- [ ] `"suggest"` - show/notify finding, wait, then apply
- [ ] `"always"` - TTY: prompt for action; Headless: write finding to feedback (unstaged), exit

**CLI flags:**
- [ ] `--force` skips all approval prompts
- [ ] `--review` requires all approval prompts
- [ ] `--from <level>` resumes cascade, skipping earlier levels

**Configuration:**
- [ ] `approvals.suggestWaitSeconds` configurable (default: 180)
- [ ] Notify integration works with suggest wait period

### Tasks

<!-- Tasks will be generated separately via tasks-auto.md -->
- [ ] Tasks to be defined

### Notes

**Approval modes explained:**

| Mode | TTY Behavior | Headless Behavior |
|------|--------------|-------------------|
| `"auto"` | Write immediately | Write immediately |
| `"suggest"` | Show summary, brief pause, continue | Notify, wait 3min, continue |
| `"always"` | Prompt Y/n, wait | Write unstaged, feedback, exit |

**Git as approval mechanism:**

```bash
# Cascade generates artifacts as unstaged changes
$ git status
Changes not staged for commit:
  new file: docs/planning/milestones/003-feature/subtasks.json
  new file: docs/planning/milestones/003-feature/feedback/2026-02-03_subtasks.md

# Approve
$ git add . && git commit -m "feat: generated subtasks"
$ aaa ralph plan --milestone 003-feature --cascade calibrate --from build

# Reject
$ git checkout .

# Modify then approve
$ vim docs/planning/milestones/003-feature/subtasks.json
$ git add . && git commit -m "feat: generated subtasks (edited)"
$ aaa ralph plan --milestone 003-feature --cascade calibrate --from build
```

**Resume workflow:**

The `--from <level>` flag allows resuming cascade from any level:
- `--from build` skips planning levels, uses existing artifacts
- `--from subtasks` regenerates subtasks (retry after rejection)

Feedback file always contains resume commands for reference.

**Related docs:**
- VISION.md Section 5 - Approval System (artifact-centric)
- IMPLEMENTATION_STATUS.md Section 5.3 - Approvals config block
