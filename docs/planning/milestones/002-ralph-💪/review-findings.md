# Code Review Findings

Findings from parallel code review of `tools/src/commands/review/` implementation.

## Critical (2)

### 1. Update SKILL.md - Missing reviewers
**File:** `.claude/skills/parallel-code-review/SKILL.md`
**Issue:** SKILL.md only lists 5 reviewers but there are 11 reviewer agents
**Fix:** Add all 11 reviewers to the spawn list

### 2. Array bounds check - undefined decision
**File:** `tools/src/commands/review/index.ts:2532`
**Issue:** Loop continues with potentially undefined decision value
**Fix:** Add `if (decision === undefined) continue;` guard

---

## High - Documentation (2)

### 3. README.md - Missing review command docs
**File:** `README.md`
**Issue:** `aaa review` command not documented
**Fix:** Add `aaa review` command documentation with modes and flags

### 4. tools/CLAUDE.md - Missing review architecture
**File:** `tools/CLAUDE.md`
**Issue:** Review command architecture not documented
**Fix:** Add review command to directory structure and document review/ folder

---

## High - Code Quality (4)

### 5. Null safety - regex match
**File:** `tools/src/commands/review/index.ts:2415`
**Issue:** Missing optional chaining on regex match result
**Fix:** Add `?.` before accessing match result properties

### 6. Error logging - swallowed exceptions
**File:** `tools/src/commands/review/index.ts`
**Issue:** Diary read/write functions swallow exceptions silently
**Fix:** Add `console.warn` for caught exceptions in diary functions

### 7. JSON validation - unvalidated Claude output
**File:** `tools/src/commands/review/index.ts`
**Issue:** Parsed JSON from Claude output is not schema-validated
**Fix:** Add Zod schema validation for Finding[] structure

### 8. Simplify threshold calculation
**File:** `tools/src/commands/review/index.ts`
**Issue:** Complex severity × confidence calculation is over-engineered
**Fix:** Replace with direct severity check (critical/high = auto-fix)

---

## High - Refactoring (3)

### 9. Split index.ts into modules
**File:** `tools/src/commands/review/index.ts`
**Issue:** Single file is too large (2600+ lines)
**Fix:** Extract into modules:
- `diary.ts` - Read/write diary functions
- `headless.ts` - Headless mode logic
- `supervised.ts` - Supervised mode logic
- `status.ts` - Status display
- `parsing.ts` - Findings parsing
- `triage.ts` - Auto-triage logic

### 10. Break up runHeadlessReview()
**File:** `tools/src/commands/review/index.ts`
**Issue:** Function is too long with multiple responsibilities
**Fix:** Extract into stages:
- `loadHeadlessContext()`
- `invokeHeadlessReview()`
- `processReviewResults()`
- `persistAndDisplay()`

### 11. Break up runReviewStatus()
**File:** `tools/src/commands/review/index.ts`
**Issue:** Function mixes data gathering and display
**Fix:** Extract:
- `buildStatusSummary()`
- `formatRecentEntries()`
- `countSeverities()`

---

## Medium - New Feature (1)

### 12. Interrogate workflow not implemented
**File:** `context/workflows/interrogate.md`, `.claude/commands/dev/interrogate.md`
**Issue:** `/dev:interrogate` is documented in VISION.md but workflow and command already exist
**Fix:** Verify integration works, add to code-review workflow if not already integrated

---

## Summary

| Severity | Count |
|----------|-------|
| Critical | 2 |
| High - Documentation | 2 |
| High - Code Quality | 4 |
| High - Refactoring | 3 |
| Medium | 1 |
| **Total** | **12** |

## Next Steps

Use `aaa ralph plan subtasks ./review-findings.md --milestone 002-ralph-💪` to convert these findings into subtasks.
