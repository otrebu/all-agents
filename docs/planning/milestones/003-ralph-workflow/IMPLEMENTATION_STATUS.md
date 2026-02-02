# Ralph Implementation Status

**Generated:** 2026-02-02
**Source:** Analysis of `tools/src/commands/ralph/`, `context/workflows/ralph/`, `.claude/` against VISION.md and ROADMAP.md specifications

---

## Executive Summary

| Category | Status | Notes |
|----------|--------|-------|
| **CLI Commands** | 95% Complete | All main commands exist, some flags missing |
| **Prompts** | 100%+ Complete | 34 prompts (14 spec + 20 extra) |
| **Skills** | 100% Complete | All 5 Ralph skills + 2 code-review skills |
| **Code Review Agents** | 100% Complete | All 12 agents + triage agent |
| **Configuration** | 70% Complete | Hooks work, approvals block missing |
| **Cascade Mode** | 0% Complete | Not implemented |
| **Testing** | Present | E2E + unit tests exist |

---

## 1. CLI Commands Implementation

### 1.1 Implemented Commands

| Command | Subcommands | Status | Notes |
|---------|-------------|--------|-------|
| `ralph build` | - | Complete | Full iteration loop, headless + supervised modes |
| `ralph plan` | vision, roadmap, stories, tasks, subtasks | Complete | All planning levels work |
| `ralph review` | stories, roadmap, tasks, subtasks, gap/* | Complete | 8 review subcommands |
| `ralph calibrate` | intention, technical, improve, all | Complete | LLM-as-judge analysis |
| `ralph status` | - | Complete | Shows queue progress and stats |
| `ralph milestones` | - | Complete | Lists available milestones |

### 1.2 CLI Flags Status

#### Build Command Flags
| Flag | Status | Notes |
|------|--------|-------|
| `--subtasks <path>` | Implemented | Path to subtasks.json |
| `--supervised` | Implemented | Default mode, user watches |
| `--headless` | Implemented | JSON output mode |
| `--interactive` | Implemented | Alias for supervised with pause |
| `--max-iterations <n>` | Implemented | Limit retry attempts |
| `--validate-first` | **STUB ONLY** | Prints message, no actual validation |
| `--calibrate-every <n>` | **MISSING** | Not implemented |
| `--skip-summary` | Implemented | Skip Haiku summary |
| `--quiet` | Implemented | Suppress output |
| `-p, --print` | Implemented | Dry run, print prompt |

#### Plan Command Flags
| Flag | Status | Notes |
|------|--------|-------|
| `--milestone <path>` | Implemented | Scope to milestone; for subtasks acts as **source** (spawns parallel agents per task) |
| `--story <path>` | Implemented | Scope to story; for subtasks acts as **source** (spawns parallel agents per task) |
| `--task <path>` | Implemented | Scope to task |
| `--file <path>` | Implemented | Alternative source for subtasks and tasks commands |
| `--text <string>` | Implemented | Alternative source for subtasks and tasks commands |
| `--supervised` | Implemented | Supervised mode |
| `--headless` | Implemented | Headless mode |
| `--size <mode>` | Implemented | Subtask sizing (small/medium/large) |
| `--review` | Implemented | Parse review findings |
| `-p, --print` | **MISSING** | Only exists for build |
| `--auto` | **MISSING** | Subtasks always auto, flag not exposed |
| `--cascade` | **NOT IMPLEMENTED** | See Section 5 |

#### Calibrate Command Flags
| Flag | Status | Notes |
|------|--------|-------|
| `--subtasks <path>` | Implemented | Path to subtasks.json |
| `--force` | Implemented | Skip approvals |
| `--review` | Implemented | Require approvals |

### 1.3 Missing from VISION.md

1. **`--cascade` flag** - Full pipeline automation not implemented
2. **`--calibrate-every <n>`** - Periodic calibration during build
3. **`-p/--print` for plan commands** - Only works for build
4. **`--auto` exposure for subtasks** - Internal behavior correct, flag hidden

---

## 2. Prompts Implementation

### 2.1 Planning Prompts (context/workflows/ralph/planning/)

| Prompt | Status | Notes |
|--------|--------|-------|
| `vision-interactive.md` | Complete | Socratic vision creation |
| `roadmap-interactive.md` | Complete | Milestone planning dialogue |
| `roadmap-auto.md` | Complete | Auto roadmap generation |
| `stories-interactive.md` | Complete | Story creation dialogue |
| `stories-auto.md` | Complete | Auto story generation |
| `tasks-interactive.md` | Complete | Task planning dialogue |
| `tasks-auto.md` | Complete | Auto task generation |
| `tasks-milestone.md` | Complete | **EXTRA** - Batch task generation |
| `tasks-from-source.md` | Complete | **NEW** - Task generation from --file/--text sources |
| `subtasks-auto.md` | Complete | Subtask decomposition |
| `subtasks-from-source.md` | Complete | **EXTRA** - Flexible source input |
| `subtasks-from-hierarchy.md` | Complete | **NEW** - Parallel subtask generation from --milestone/--story |
| `milestone-review.md` | Complete | **EXTRA** - Milestone quality check |
| `task-doc-lookup.md` | Complete | **EXTRA** - Doc linking |
| `story-gap-analysis.md` | Complete | **EXTRA** - Story gap detection |
| `roadmap-gap-analysis.md` | Complete | **EXTRA** - Roadmap gap detection |
| `subtask-spec.md` | Complete | **EXTRA** - Spec documentation |

### 2.2 Building Prompts (context/workflows/ralph/building/)

| Prompt | Status | Notes |
|--------|--------|-------|
| `ralph-iteration.md` | Complete | Core build loop prompt |
| `pre-build-validation.md` | Complete | Alignment check prompt |

### 2.3 Calibration Prompts (context/workflows/ralph/calibration/)

| Prompt | Status | Notes |
|--------|--------|-------|
| `intention-drift.md` | Complete | Vision-to-code alignment |
| `technical-drift.md` | Complete | Standards compliance |
| `self-improvement.md` | Complete | Session log analysis |

### 2.4 Hooks Prompts (context/workflows/ralph/hooks/)

| Prompt | Status | Notes |
|--------|--------|-------|
| `iteration-summary.md` | Complete | Haiku summary generation |

### 2.5 Review Prompts (context/workflows/ralph/review/)

| Prompt | Status | Notes |
|--------|--------|-------|
| `roadmap-review-auto.md` | Complete | **EXTRA** - Roadmap review |
| `roadmap-gap-auto.md` | Complete | **EXTRA** - Roadmap gap analysis |
| `stories-review-auto.md` | Complete | **EXTRA** - Story review |
| `stories-gap-auto.md` | Complete | **EXTRA** - Story gap analysis |
| `tasks-review-auto.md` | Complete | **EXTRA** - Task review |
| `tasks-gap-auto.md` | Complete | **EXTRA** - Task gap analysis |
| `subtasks-review-auto.md` | Complete | **EXTRA** - Subtask review |
| `subtasks-gap-auto.md` | Complete | **EXTRA** - Subtask gap analysis |
| `chunked-presentation.md` | Complete | **EXTRA** - One-at-a-time presentation |
| `stories-review.md` | Complete | **EXTRA** - Interactive story review |

### 2.6 Component Prompts (context/workflows/ralph/components/)

| Prompt | Status | Notes |
|--------|--------|-------|
| `doc-analysis.md` | Complete | **EXTRA** - Doc analysis utility |

**Summary:** 14 prompts specified in VISION.md + 20 additional prompts = 34 total prompts

---

## 3. Skills Implementation

### 3.1 Ralph Skills (.claude/skills/)

| Skill | Status | Notes |
|-------|--------|-------|
| `ralph-plan/SKILL.md` | Complete | Interactive planning at all levels |
| `ralph-build/SKILL.md` | Complete | Build loop execution |
| `ralph-calibrate/SKILL.md` | Complete | Drift and improvement checks |
| `ralph-review/SKILL.md` | Complete | Artifact review with fresh eyes |
| `ralph-status/SKILL.md` | Complete | Progress visibility |

### 3.2 Code Review Skills

| Skill | Status | Notes |
|-------|--------|-------|
| `code-review/SKILL.md` | Complete | 11-agent parallel review |
| `interrogate-on-changes/SKILL.md` | Complete | Decision/confidence surfacing |

---

## 4. Code Review Agents

### 4.1 Specialized Reviewers (.claude/agents/code-review/)

| Agent | Status | Focus Areas |
|-------|--------|-------------|
| `security-reviewer.md` | Complete | OWASP, injection, XSS, auth, secrets |
| `data-integrity-reviewer.md` | Complete | Null checks, boundaries, race conditions |
| `error-handling-reviewer.md` | Complete | Exceptions, recovery, logging |
| `test-coverage-reviewer.md` | Complete | Missing tests, edge cases |
| `over-engineering-reviewer.md` | Complete | YAGNI, premature abstraction |
| `performance-reviewer.md` | Complete | N+1, memory leaks, complexity |
| `accessibility-reviewer.md` | Complete | WCAG, ARIA, keyboard nav |
| `documentation-reviewer.md` | Complete | Docs, README, JSDoc |
| `maintainability-reviewer.md` | Complete | Coupling, naming, SRP |
| `dependency-reviewer.md` | Complete | Outdated, vulnerabilities, licenses |
| `intent-alignment-reviewer.md` | Complete | Implementation vs requirements |
| `synthesizer.md` | Complete | Aggregate and dedupe findings |
| `triage.md` | Complete | **EXTRA** - Intelligent curation |
| `types.md` | Complete | Shared Finding JSON schema |

**All 12 agents from VISION.md implemented + triage agent + types documentation**

---

## 5. Configuration Implementation

### 5.1 Implemented Config (aaa.config.json)

```json
{
  "notify": {
    "enabled": false,
    "server": "http://...",
    "defaultTopic": "ralph-build",
    "defaultPriority": "high",
    "title": "aaa notify",
    "quietHours": { "enabled": true, "startHour": 22, "endHour": 8 }
  },
  "ralph": {
    "hooks": {
      "onIterationComplete": ["log"],
      "onMilestoneComplete": ["log", "notify"],
      "onValidationFail": ["log", "notify"],
      "onMaxIterationsExceeded": ["log", "notify", "pause"]
    },
    "selfImprovement": { "mode": "suggest" }
  }
}
```

### 5.2 Config Features Status

| Feature | Status | Notes |
|---------|--------|-------|
| `notify.*` | Implemented | ntfy push notifications |
| `ralph.hooks.*` | Implemented | 4 lifecycle events + 3 actions |
| `ralph.selfImprovement` | Implemented | suggest/autofix/off modes |
| `approvals.*` | **NOT IMPLEMENTED** | Missing entire block |
| `calibration.*` | **PARTIALLY IMPLEMENTED** | Core functionality works; missing config options (everyNIterations, afterMilestone) |

### 5.3 Missing Config: Approvals Block

VISION.md specifies but NOT implemented:
```json
{
  "approvals": {
    "storiesToTasks": "auto",
    "tasksToSubtasks": "auto",
    "preBuildDriftCheck": "auto",
    "driftTasks": "auto",
    "selfImprovement": "suggest",
    "atomicDocChanges": "always",
    "llmJudgeSubjective": "auto"
  }
}
```

**Impact:** Per-action governance gates don't exist. `--force`/`--review` flags only work for selfImprovement.

### 5.4 Missing Config: Calibration Block

VISION.md specifies but NOT implemented:
```json
{
  "calibration": {
    "everyNIterations": 10,
    "afterMilestone": true
  }
}
```

**Impact:** Automatic calibration during build loop not supported.

---

## 6. Cascade Mode (NOT IMPLEMENTED)

### 6.1 What VISION.md Specifies

```bash
ralph plan --cascade                    # Full pipeline from vision
ralph plan stories --cascade            # stories -> tasks -> subtasks
ralph plan tasks --cascade --milestone  # tasks -> subtasks for milestone
```

Cascade mode chains: vision -> roadmap -> stories -> tasks -> subtasks

### 6.2 Current State

- **No `--cascade` flag exists** anywhere in codebase
- **No cascade orchestration logic** implemented
- **Approvals gates** (which cascade depends on) not implemented
- **Confirmation prompts** between levels not implemented

### 6.3 Blocking Dependencies

1. `approvals` config block must exist first
2. Confirmation/approval prompt mechanism needed
3. Orchestration logic to chain commands
4. `--force` flag to skip confirmations

### 6.4 Implementation Estimate

This is the **largest missing feature**. Requires:
- New orchestration module (~200-400 LOC)
- Approvals config implementation
- Inter-level confirmation flow
- State tracking between cascade stages

---

## 7. Pre-Build Validation (STUB ONLY)

### 7.1 Current Implementation

```typescript
// tools/src/commands/ralph/build.ts:158-164
if (shouldValidateFirst) {
  console.log("Pre-build validation requested but not yet implemented in TypeScript");
  // TODO: Implement pre-build validation
}
```

### 7.2 What's Missing

1. Invoke `pre-build-validation.md` prompt
2. Pass subtask + parent Task + parent Story context
3. Parse LLM response for `{aligned: true/false, reason: string}`
4. Abort build if not aligned

### 7.3 Prompt Exists

The prompt `context/workflows/ralph/building/pre-build-validation.md` **exists and is complete**. Only the invocation logic in `build.ts` is missing.

---

## 8. Template Substitution (NOT IMPLEMENTED)

### 8.1 What VISION.md Says

Hook prompts should use `{{VAR}}` placeholders:
```markdown
Session log:
{{SESSION_JSONL_CONTENT}}

Subtask being worked on:
{{SUBTASK_TITLE}}: {{SUBTASK_DESCRIPTION}}
```

### 8.2 Current Implementation

- No `{{VAR}}` substitution mechanism exists
- `@path` references work (Claude-native file reading)
- Haiku invocation passes raw prompt with inline content

### 8.3 Impact

Hook prompts cannot use variable substitution as designed. Current workaround: inline content in prompt string.

---

## 9. Schemas and Templates

### 9.1 Implemented Schemas (docs/planning/schemas/)

| Schema | Status | Notes |
|--------|--------|-------|
| `subtasks.schema.json` | Complete | Work queue validation |
| `iteration-diary.schema.json` | Complete | Diary entry validation |
| `ralph-config.schema.json` | Complete | Config validation |
| `aaa-config.schema.json` | Complete | Unified CLI config |

### 9.2 Implemented Templates (docs/planning/templates/)

| Template | Status | Notes |
|----------|--------|-------|
| `subtasks.template.json` | Complete | Example work queue |
| `iteration-diary.template.json` | Complete | Example diary entry |
| `ralph.config.template.json` | Complete | Example config |

### 9.3 Schema/Code Alignment Issues

| Field | Schema | Code | Status |
|-------|--------|------|--------|
| `duration` | `"4m32s"` (string) | `number` (ms) | Mismatch |
| `errors` | `number` (count) | `Array<string>` (messages) | Mismatch |

**Impact:** Minor - code is richer than spec but structurally different.

---

## 10. Testing

### 10.1 Existing Tests

| Test File | Type | Coverage |
|-----------|------|----------|
| `tools/tests/e2e/ralph.test.ts` | E2E | CLI commands, help output, error handling |
| `tools/tests/lib/ralph-config.test.ts` | Unit | Config loading, query helpers |
| `tools/tests/lib/ralph-hooks.test.ts` | Unit | Hook execution logic |

### 10.2 Test Coverage

- **Help commands:** All tested (`--help` for build, plan, status, calibrate)
- **Error handling:** Missing subtasks file, invalid paths
- **Mode flags:** `--supervised`, `--headless`, `--skip-summary` verified
- **Schema validation:** Uses ajv for subtasks.json validation

---

## 11. TypeScript vs Bash Implementation

### 11.1 VISION.md Approach (Bash Prototype)

VISION.md Section 8.5 specifies:
```
tools/src/commands/ralph/
├── index.ts              # Registers "ralph" command, passes args to bash
└── scripts/
    ├── ralph.sh          # Entrypoint, dispatches subcommands
    ├── plan.sh           # ralph plan <level>
    ├── build.sh          # ralph build (iteration loop)
    ├── calibrate.sh      # ralph calibrate <type>
    └── status.sh         # ralph status
```

### 11.2 Actual Implementation (Full TypeScript)

```
tools/src/commands/ralph/
├── index.ts          # CLI commands (1230 lines)
├── build.ts          # Build loop (843 lines)
├── claude.ts         # Claude invocation
├── calibrate.ts      # Calibration checks
├── config.ts         # Config loading
├── types.ts          # Type definitions
├── session.ts        # Session utilities
├── post-iteration.ts # Post-iteration hooks
├── hooks.ts          # Hook execution
├── display.ts        # Terminal output
└── status.ts         # Status display
```

**No bash scripts exist.** Implementation is 100% TypeScript.

### 11.3 Assessment

The TypeScript implementation is more robust than the proposed bash prototype:
- Full type safety
- Better error handling
- Testable components
- No external bash dependencies

This is an improvement over VISION.md's original design.

---

## 12. Feature Completion Matrix

### 12.1 By ROADMAP Milestone

| Milestone | Feature | Status |
|-----------|---------|--------|
| **001-ralph** | ralph-iteration.md prompt | Complete |
| **001-ralph** | build.sh/build.ts script | Complete |
| **001-ralph** | Progress file writing | Complete |
| **001-ralph** | Session ID capture | Complete |
| **001-ralph** | Three-mode execution | Complete |
| **001-ralph** | `--supervised`/`--headless` flags | Complete |
| **002-planning** | tasks-auto.md, subtasks-auto.md | Complete |
| **002-planning** | stories-auto.md, roadmap-auto.md | Complete |
| **002-planning** | vision-interactive.md | Complete |
| **002-planning** | plan.sh/index.ts commands | Complete |
| **002-planning** | Pre-build validation prompt | Complete |
| **002-planning** | Pre-build validation invocation | **STUB ONLY** |
| **003-calibration** | intention-drift.md | Complete |
| **003-calibration** | technical-drift.md | Complete |
| **003-calibration** | self-improvement.md | Complete |
| **003-calibration** | calibrate.ts commands | Complete |
| **003-calibration** | Iteration diary | Complete |
| **004-integration** | Skills (ralph-*) | Complete |
| **004-integration** | Hooks system | Complete |
| **004-integration** | ntfy notifications | Complete |
| **004-integration** | status command | Complete |
| **004-integration** | Interactive mode (`-i`) | Complete |
| **004-integration** | Review commands | Complete |
| **004-integration** | Gap analysis subagent | Complete |
| **005-code-review** | 12 reviewer agents | Complete |
| **005-code-review** | `aaa review` CLI | Complete |
| **005-code-review** | `/dev:code-review` skill | Complete |
| **005-code-review** | `/dev:interrogate` workflow | Complete |
| **005-code-review** | Review diary logging | Complete |

### 12.2 Missing Features (Priority Order)

| Priority | Feature | Effort | Blocking |
|----------|---------|--------|----------|
| **P0** | `approvals` config block | Medium | Cascade mode |
| **P0** | Pre-build validation invocation | Low | Quality gate |
| **P1** | `--calibrate-every <n>` flag | Low | Auto-calibration |
| **P1** | `calibration` config block | Low | Auto-calibration |
| **P2** | `--cascade` mode | High | Full automation |
| **P2** | `-p/--print` for plan commands | Low | Debugging |
| **P3** | `{{VAR}}` template substitution | Medium | Hook flexibility |
| **P3** | `--auto` flag exposure for subtasks | Low | API consistency |

### 12.3 ROADMAP Item Clarifications

Many items appearing "missing" from ROADMAP are either covered under different names or are implementation details:

| Item | Status |
|------|--------|
| Review command structure | Partially covered in ROADMAP - pattern is clear |
| 10 review prompts | Covered - outcomes documented, count is detail |
| Triage agent | Covered under "synthesizer" |
| `--size` subtask sizing | Borderline - user-facing but may not need ROADMAP mention |
| `ralph milestones --json` | Implementation detail |
| `aaa.config.json` naming | Implementation detail |
| TypeScript vs bash | Implementation detail |

---

## 13. Recommendations

### 13.1 Quick Wins (< 1 day each)

1. **Implement pre-build validation invocation** - Prompt exists, just need to call it
2. **Add `--calibrate-every` flag** - Simple iteration counter in build loop
3. **Add `-p/--print` to plan commands** - Copy pattern from build command
4. **Add `calibration` config block** - Schema already exists

### 13.2 Medium Effort (1-3 days each)

1. **Implement `approvals` config block** - Foundation for cascade mode
2. **Template substitution for hook prompts** - Utility function + prompt updates

### 13.3 Large Effort (1+ week)

1. **Cascade mode implementation** - Requires approvals + orchestration + state management

### 13.4 Documentation Sync

1. Update VISION.md to reflect TypeScript implementation (not bash)
2. Document review loop concept (emerges from implementation)
3. Align schema field types with code (`duration`, `errors`)

---

## 14. File Inventory

### 14.1 TypeScript Implementation

```
tools/src/commands/ralph/
├── index.ts           # 1230 lines - CLI commands
├── build.ts           # 843 lines - Build loop
├── claude.ts          # Claude invocation
├── calibrate.ts       # Calibration commands
├── config.ts          # Config loading
├── types.ts           # Type definitions
├── session.ts         # Session utilities
├── post-iteration.ts  # Post-iteration processing
├── hooks.ts           # Hook execution
├── display.ts         # Terminal output
└── status.ts          # Status command
```

### 14.2 Prompts

```
context/workflows/ralph/
├── planning/          # 17 prompts
├── building/          # 2 prompts
├── calibration/       # 3 prompts
├── hooks/             # 1 prompt
├── review/            # 10 prompts
└── components/        # 1 prompt
```

### 14.3 Skills

```
.claude/skills/
├── ralph-plan/SKILL.md
├── ralph-build/SKILL.md
├── ralph-calibrate/SKILL.md
├── ralph-review/SKILL.md
├── ralph-status/SKILL.md
├── code-review/SKILL.md
└── interrogate-on-changes/SKILL.md
```

### 14.4 Agents

```
.claude/agents/code-review/
├── security-reviewer.md
├── data-integrity-reviewer.md
├── error-handling-reviewer.md
├── test-coverage-reviewer.md
├── over-engineering-reviewer.md
├── performance-reviewer.md
├── accessibility-reviewer.md
├── documentation-reviewer.md
├── maintainability-reviewer.md
├── dependency-reviewer.md
├── intent-alignment-reviewer.md
├── synthesizer.md
├── triage.md
└── types.md
```

### 14.5 Config/Schemas

```
docs/planning/
├── schemas/
│   ├── subtasks.schema.json
│   ├── iteration-diary.schema.json
│   ├── ralph-config.schema.json
│   └── aaa-config.schema.json
└── templates/
    ├── subtasks.template.json
    ├── iteration-diary.template.json
    └── ralph.config.template.json
```

---

## 15. Calibration Mode Deep Dive

Detailed explanation of how each calibration command actually works.

### 15.1 `ralph calibrate intention`

- **Analyzes:** Git commits from completed subtasks (uses `commitHash` field)
- **Data source:** `git show <commitHash>` and `git diff <commitHash>^..<commitHash>`
- **Compares against:** Planning chain: Subtask -> Task (via `taskRef`) -> Story (via `storyRef`) -> VISION.md
- **Detects:** Scope creep, scope shortfall, direction changes, missing links
- **Output:** Markdown summary + task files for corrections

### 15.2 `ralph calibrate technical`

- **Analyzes:** Same git commits (uses `commitHash`)
- **Data source:** Git diffs + project standards (eslint, tsconfig, CLAUDE.md)
- **Compares against:** Linting rules, TypeScript config, coding standards, `filesToRead`
- **Detects:** Missing tests, inconsistent patterns, error handling gaps, type safety, security
- **Escape hatch:** `// HUMAN APPROVED: reason` comments ignored (except security)
- **Output:** Markdown summary + task files

### 15.3 `ralph calibrate improve`

- **Analyzes:** Claude session logs (uses `sessionId` field)
- **Data source:** `~/.claude/projects/<encoded-path>/<sessionId>.jsonl`
- **Looks for:** Tool misuse, wasted reads, backtracking, excessive retries
- **Modes:** `suggest` (task files), `autofix` (apply directly), `off` (skip)
- **Output:** Recommendations for prompts, skills, CLAUDE.md

### 15.4 `ralph calibrate all`

- Runs all three sequentially
- Returns success only if all pass

### 15.5 Requirements

- All commands require `subtasks.json` with completed subtasks
- `intention` and `technical` need `commitHash` populated
- `improve` needs `sessionId` populated
- If no matching subtasks, exits gracefully with "nothing to analyze"

---

## Appendix A: Source Documents

- `/docs/planning/VISION.md` - Framework specification
- `/docs/planning/ROADMAP.md` - Milestone definitions
- `/docs/planning/milestones/001-ralph/SPEC-TO-CODE-GAPS.md` - Previous gap analysis
- `/docs/planning/milestones/001-ralph/SPEC-SYNC-PLAN.md` - Sync planning
- `/tools/CLAUDE.md` - Development reference
