# Manual Test: subtasks-auto.md Prompt Validation

## Test Date
2026-01-14

## Test Description
Validated that the subtasks-auto.md prompt produces valid subtasks.json output matching the schema.

## Test Input
- **Prompt:** `context/workflows/ralph/planning/subtasks-auto.md`
- **Task ID:** TASK-001 (semantic-release task)
- **Task File:** `docs/planning/tasks/001-semantic-release.md`

## Test Execution
1. Read subtasks-auto.md prompt content
2. Read TASK-001 semantic-release task
3. Followed prompt instructions to generate subtasks.json
4. Applied deep codebase analysis (simulated - checked package.json, existing files)
5. Generated output following schema requirements

## Generated Output
See: `subtasks-auto-test-output.json`

## Validation Results

### JSON Validity
- ✅ Valid JSON parsing

### Schema Compliance
- ✅ Has `subtasks` array (required)
- ✅ Has `metadata` object with `scope` and `milestoneRef`
- ✅ Has `$schema` reference

### Subtask Field Validation
All 4 subtasks have required fields:
- ✅ `id` - SUB-NNN pattern
- ✅ `taskRef` - TASK-NNN pattern
- ✅ `title` - Short descriptive title (max 100 chars)
- ✅ `description` - Detailed implementation description
- ✅ `done` - boolean (false for new subtasks)
- ✅ `acceptanceCriteria` - Array of verification steps
- ✅ `filesToRead` - Array of context files

### Content Quality
- ✅ Subtasks are properly sized (1-3 files each)
- ✅ Acceptance criteria are concrete and verifiable
- ✅ filesToRead contains relevant context files
- ✅ Ordering follows dependency logic (install → config → docs → verify)

## Conclusion
The subtasks-auto.md prompt produces valid subtasks.json that:
1. Parses as valid JSON
2. Matches the subtasks.schema.json structure
3. Contains all required fields
4. Follows ID and reference patterns
5. Generates appropriately-sized subtasks

**TEST PASSED**
