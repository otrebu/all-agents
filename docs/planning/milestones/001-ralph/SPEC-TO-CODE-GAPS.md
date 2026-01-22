# Ralph Gap Analysis: What's Missing from Implementation

**Source:** VISION.md + ROADMAP.md requirements not found in code
**Date:** 2026-01-21

---

## Executive Summary

| Category | Critical | Medium | Low |
|----------|----------|--------|-----|
| Config/Governance | 1 | 2 | 0 |
| CLI Flags | 0 | 3 | 1 |
| Prompts/Templates | 0 | 2 | 0 |
| Implementation | 1 | 1 | 2 |
| **TOTAL** | **2** | **8** | **3** |

---

## CRITICAL GAPS

### 1. Approvals Config Block Missing

**VISION.md says (Section 5, lines 412-421):**
```json
{
  "approvals": {
    "storiesToTasks": "auto",
    "tasksToSubtasks": "auto",
    "preBuildDriftCheck": "auto",
    "driftTasks": "auto",
    "selfImprovement": "always",
    "atomicDocChanges": "always",
    "llmJudgeSubjective": "auto"
  }
}
```

**Actual `ralph.config.json`:**
```json
{
  "hooks": { ... },
  "ntfy": { ... },
  "selfImprovement": { "mode": "always" }
}
```

**What's Missing:**
- Entire `approvals` object
- Per-action approval control (storiesToTasks, tasksToSubtasks, etc.)
- Approval levels: `"always"` vs `"auto"`

**Impact:** No config-driven governance. CLI `--force`/`--review` flags exist but defaults can't be set.

**Files to modify:**
- `tools/src/commands/ralph/types.ts` - Add `ApprovalsConfig` interface
- `tools/src/commands/ralph/config.ts` - Load approvals from config
- `docs/planning/schemas/ralph-config.schema.json` - Add approvals schema

---

### 2. Pre-Build Validation Not Implemented

**VISION.md says (Section 8.2, line 606):**
> `--validate-first` - Run alignment check before building

**Current code (`build.ts:158-164`):**
```typescript
if (shouldValidateFirst) {
  console.log("Pre-build validation requested but not yet implemented in TypeScript");
  // TODO: Implement pre-build validation
}
```

**What's Missing:**
- Actual validation logic
- Call to `pre-build-validation.md` prompt
- Abort on validation failure

**Impact:** Can't verify subtask alignment before build starts. Risk of wasted iterations on misaligned work.

**Files to modify:**
- `tools/src/commands/ralph/build.ts` - Implement validation logic

---

## MEDIUM GAPS

### 3. `--calibrate-every <n>` Flag Missing

**VISION.md says (Section 8.2, line 605):**
> `--calibrate-every <n>` - Run calibration after N iterations (default: from config)

**Current `index.ts` build options:**
```typescript
.option("--max-iterations <n>", ...)
.option("-i, --interactive", ...)
.option("-s, --supervised", ...)
.option("-H, --headless", ...)
// NO --calibrate-every
```

**What's Missing:**
- CLI flag definition
- Integration with build loop to trigger calibration
- Config default (`calibration.everyNIterations`)

**Files to modify:**
- `tools/src/commands/ralph/index.ts` - Add flag
- `tools/src/commands/ralph/build.ts` - Implement calibration trigger
- `tools/src/commands/ralph/types.ts` - Add `CalibrationConfig`

---

### 4. Calibration Config Block Missing

**VISION.md says (Section 5, lines 423-426):**
```json
{
  "calibration": {
    "everyNIterations": 10,
    "afterMilestone": true
  }
}
```

**Current `RalphConfig` type:**
```typescript
interface RalphConfig {
  hooks?: HooksConfig;
  ntfy?: NtfyConfig;
  selfImprovement?: SelfImprovementConfig;
  // NO calibration
}
```

**Files to modify:**
- `tools/src/commands/ralph/types.ts`
- `tools/src/commands/ralph/config.ts`
- `ralph.config.json`

---

### 5. `-p/--print` Flag Missing from Plan Commands

**VISION.md says (Section 8.2, line 596):**
> `-p, --print` - Print prompt without executing (all plan commands)

**Current implementation:**
- `ralph build -p` - EXISTS
- `ralph plan stories -p` - MISSING
- `ralph plan tasks -p` - MISSING
- etc.

**Files to modify:**
- `tools/src/commands/ralph/index.ts` - Add `-p` to all plan subcommands

---

### 6. `hooks/iteration-summary.md` Prompt Missing

**VISION.md says (Section 8.5, line 547):**
```
context/workflows/ralph/
└── hooks/
    └── iteration-summary.md
```

**Actual directory structure:**
- `context/workflows/ralph/hooks/` - DIRECTORY DOES NOT EXIST
- `iteration-summary.md` - NOT FOUND

**VISION.md says (Section 8.11, lines 1041-1060):**
> Prompt template with placeholders:
> - `{{SESSION_JSONL_CONTENT}}`
> - `{{SUBTASK_TITLE}}`
> - `{{SUBTASK_DESCRIPTION}}`

**Current `post-iteration.ts` (line 106):**
```typescript
const ITERATION_SUMMARY_PROMPT_PATH = path.join(
  contextRoot,
  "context/workflows/ralph/hooks/iteration-summary.md"
);
// File doesn't exist - falls back to hardcoded prompt
```

**Files to create:**
- `context/workflows/ralph/hooks/iteration-summary.md`

---

### 7. {{VAR}} Template Substitution Not Implemented

**VISION.md says (Section 8.1, line 552):**
> Hook prompts use `{{VAR}}` placeholders substituted by bash before calling Claude

**Current implementation:**
- No evidence of `{{VAR}}` substitution in `claude.ts` or `post-iteration.ts`
- Prompts use `@path` references (Claude-native)
- Haiku invocation passes raw prompt string

**Impact:** Hook prompts can't use variable substitution as designed.

**Files to modify:**
- `tools/src/commands/ralph/claude.ts` - Add template substitution helper
- `tools/src/commands/ralph/post-iteration.ts` - Use substitution for summary prompt

---

### 8. `--cascade` / `--full-auto` Flag Missing

**FEEDBACK.md item #3:**
> Need `--cascade` or `--full-auto` flag that chains through entire workflow:
> vision → roadmap → stories (ALL) → tasks (ALL) → subtasks (ALL)

**Current implementation:** Not found in codebase.

**Files to modify:**
- `tools/src/commands/ralph/index.ts` - Add `--cascade` flag
- New file for cascade orchestration logic

---

### 9. Subtasks `--auto` Flag Not Exposed

**VISION.md says (Section 8.2, line 586):**
> `ralph plan subtasks --auto` - Auto only (always requires --auto)

**Current implementation (`index.ts:469-501`):**
- No `--auto` flag visible
- Internally forces auto prompt: `getPromptPath(contextRoot, "subtasks", true)`
- User can't explicitly request `--auto`

**Impact:** CLI doesn't match documented API. Internal behavior correct.

**Files to modify:**
- `tools/src/commands/ralph/index.ts` - Add `--auto` flag (even if always true)

---

### 10. Diary Schema Location Undiscoverable

**VISION.md says (Section 8.11, lines 1015-1031):**
> Schema: `docs/planning/schemas/iteration-diary.schema.json`
> Template: `docs/planning/templates/iteration-diary.template.json`

**Current state:**
- Schema file exists but diary entry type differs from schema
- `duration` is `number` (ms) in code vs `"4m32s"` string in VISION
- `errors` is `Array<string>` in code vs `number` count in VISION

**Files to verify/update:**
- `docs/planning/schemas/iteration-diary.schema.json`
- `tools/src/commands/ralph/types.ts` - Align `IterationDiaryEntry`

---

## LOW GAPS

### 11. Permission Model Deviation

**VISION.md says (Section 8.10, line 972):**
> `ralph plan` (interactive): Normal permissions (human in loop)

**Current implementation (`claude.ts:112-122`):**
```typescript
const result = spawnSync("claude", [
  "--permission-mode",
  "bypassPermissions",  // ALL modes bypass
```

**Impact:** Interactive mode bypasses permissions (safer but differs from design).

---

### 12. Diary `duration` Format Mismatch

**VISION.md:** `"duration": "4m32s"` (formatted string)
**Code:** `duration?: number` (milliseconds)

**Impact:** Cosmetic - format differs but data is equivalent.

---

### 13. Diary `errors` Type Mismatch

**VISION.md:** `"errors": 0` (count)
**Code:** `errors?: Array<string>` (messages)

**Impact:** Richer data than spec but different structure.

---

## Implementation Priority

### P0 - Blocking
1. **Approvals config block** - Governance foundation
2. **Pre-build validation** - Quality gate

### P1 - Important
3. `--calibrate-every` flag + config
4. `hooks/iteration-summary.md` prompt
5. `-p/--print` for plan commands

### P2 - Completeness
6. `--cascade` flag
7. {{VAR}} template substitution
8. Subtasks `--auto` flag exposure
9. Diary schema alignment

### P3 - Polish
10. Permission model documentation
11. Format consistency (duration, errors)
