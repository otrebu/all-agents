# Subtasks Common Reference

Shared conventions and guidelines for all subtask generation workflows. Referenced by:
- `subtasks-auto.md` - Auto generation from TASK files
- `subtasks-from-source.md` - Generation from arbitrary sources

## Subtask Schema

Each subtask MUST have these fields:

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique ID: `SUB-NNN` pattern (e.g., `SUB-001`) |
| `taskRef` | string | Parent task reference: `<NNN>-TASK-<slug>` pattern (e.g., `014-TASK-review-code-quality`) |
| `title` | string | Short title (max 100 chars) for commits and tracking |
| `description` | string | Detailed description of what to implement |
| `done` | boolean | Always `false` for new subtasks |
| `acceptanceCriteria` | string[] | How to verify subtask is complete |
| `filesToRead` | string[] | Files to read before implementing |

### Optional Fields

| Field | Type | Description |
|-------|------|-------------|
| `storyRef` | string | Parent story reference if task has one |

### Example Subtask

```json
{
  "id": "SUB-001",
  "taskRef": "014-TASK-review-code-quality",
  "storyRef": "001-STORY-parallel-code-review",
  "title": "Create user input validation schema",
  "description": "Add Zod schema for CreateUserInput with email and password validation in src/schemas/user.ts",
  "done": false,
  "acceptanceCriteria": [
    "Zod schema exists in src/schemas/user.ts",
    "Email format is validated",
    "Password strength rules are enforced",
    "Unit test in tools/tests/lib/user-schema.test.ts passes"
  ],
  "filesToRead": [
    "src/schemas/auth.ts",
    "src/types/user.ts"
  ]
}
```

## Size Guidelines

**CRITICAL:** Each subtask must fit within a single context window iteration.

### The Vertical Slice Test

Every subtask must pass the **4-question vertical slice test**:

| # | Question | What It Tests | Red Flag |
|---|----------|---------------|----------|
| 1 | **Is it vertical?** | Delivers value end-to-end | Only touches UI, backend, or tests in isolation |
| 2 | **One pass?** | Completable in single context window | Requires multiple research-then-implement cycles |
| 3 | **Ships alone?** | Can be merged to main independently | Depends on unfinished sibling subtasks |
| 4 | **Test boundary?** | Has natural test boundary | No obvious "given X, when Y, then Z" scenario |

**Scoring:**
- **4/4 Pass** → Correctly scoped
- **3/4 Pass** → Proceed with caution
- **2/4 or less** → Must split or merge

### Sizing Modes

The `--size` flag controls slice thickness:

| Mode | Slice Thickness | Typical Scope | When to Use |
|------|-----------------|---------------|-------------|
| `small` | Thinnest viable | 1 function, 1 file | Fine-grained progress tracking, high uncertainty |
| `medium` | One PR per subtask | 1-3 files | Default. Balanced granularity. |
| `large` | Major boundaries only | 3-5 files | Well-understood work, reduce overhead |

### Context Window Budget

A properly-sized subtask allows the agent to:
1. **Initialize** - Read context files (CLAUDE.md, task, etc.)
2. **Gather** - Read filesToRead and explore related code
3. **Implement** - Write the code changes
4. **Test** - Run tests and fix issues
5. **Commit** - Make a clean commit

All of this must fit in one context window.

### Subtask Scope Rules

Each subtask should:
- **Touch 1-3 files** (not counting test files)
- **Implement one clear concept**
- **Be completable in 15-30 tool calls**
- **Have 2-5 acceptance criteria**
- **Pass the 4-question vertical slice test**

### Signs a Subtask is Too Large

- Fails "One pass?" question - needs multiple research cycles
- Description mentions multiple unrelated changes
- Acceptance criteria span different areas of the codebase
- Implementation requires extensive exploration
- Would result in commits touching 5+ files

**If too large:** Split into multiple subtasks with clear boundaries.

### Signs a Subtask is Too Small

- Only modifies a single line
- Would be trivially merged with another subtask
- Creates overhead without meaningful value
- Doesn't deliver end-to-end value alone

**If too small:** Merge with related subtask.

## ID Generation

To generate subtask IDs:

1. **Target one milestone queue file** - Use only the destination `docs/planning/milestones/<milestone>/subtasks.json`
2. **Find highest SUB-NNN in that file** - Determine the maximum number already present in the target queue
3. **Increment** - New IDs start at max + 1, zero-padded to 3 digits

If no subtasks exist, start with `SUB-001`.

**IDs are milestone-scoped** to the target queue file and must be unique within that file.

## Validation Checklist

Before finalizing subtasks, verify:

- [ ] Each subtask has all required fields (id, taskRef, title, description, done, acceptanceCriteria, filesToRead)
- [ ] All IDs follow SUB-NNN pattern and are unique
- [ ] taskRef is set (NNN-slug pattern)
- [ ] storyRef is included if task has a parent story
- [ ] Subtasks pass the 4-question vertical slice test (see Size Guidelines)
- [ ] Acceptance criteria are concrete and verifiable
- [ ] filesToRead contains relevant context files
- [ ] Output is valid JSON matching the schema

## Acceptance Criteria Quality Gate

**Goal:** Ensure each AC is verifiable while preserving semantic meaning.

### Two-Layer AC Structure

Each acceptance criterion has two aspects:
1. **Intent** - What outcome we want (human-readable, semantic)
2. **Verification** - How to confirm it's done (machine-checkable)

**Good AC preserves both:**
```
"Diary functionality is extracted into its own module"
  → Verify: test -f tools/src/commands/review/diary.ts && grep -q "export.*readDiary" diary.ts
```

**Bad AC loses intent:**
```
"grep returns match" ← This is a test case, not an acceptance criterion
```

### Three-Tier Verification Methods

| Tier | AC Pattern | Verification | Example |
|------|------------|--------------|---------|
| **Static** | "X exists", "file at Y" | `test -f`, `ls` | "diary.ts exists" → `test -f diary.ts` |
| **Content** | "contains X", "has section Y" | `grep -q`, `jq` | "Lists 11 agents" → `grep -c "reviewer" \| test $(cat) -eq 11` |
| **Behavioral** | "X works", "returns Y on Z" | Run command | "review --help works" → `aaa review --help` exits 0 |

### Extended Verification Patterns

| Pattern | Command | Example AC |
|---------|---------|------------|
| File exists | `test -f <path>` | "diary.ts exists" |
| File NOT exists | `! test -f <path>` | "Legacy file removed" |
| Contains string | `grep -q "string" file` | "Exports readDiary function" |
| Does NOT contain | `! grep -q "string" file` | "No console.error calls" |
| JSON field value | `jq '.field == "value"'` | "Mode is 'suggest'" |
| Count items | `grep -c "pattern"` | "Lists 11 reviewers" |
| Command succeeds | `cmd; test $? -eq 0` | "TypeScript compiles" |
| Output contains | `cmd \| grep -q "text"` | "Help shows --supervised flag" |
| Line count | `wc -l < file` | "Under 300 lines" |

### Vague Terms That Need Specificity

When you see these terms, **add specificity** (don't just rewrite mechanically):

| Vague | Ask Yourself | Better |
|-------|--------------|--------|
| "works correctly" | What's the expected output/behavior? | "Returns 200 and JSON body with 'status: ok'" |
| "properly handles" | What happens on success? On failure? | "Returns 400 for invalid input, 200 for valid" |
| "significantly smaller" | What's the target? | "Reduced from 2600 to under 500 lines" |
| "follows format" | What specific elements? | "Has: title, description, flags table" |
| "single responsibility" | What's the measurable proxy? | "Each function under 50 lines and has one verb in name" |

### BDD-Style AC (Encouraged for User-Facing Features)

For commands and user interactions, Given/When/Then is clearer:

```
Given: User runs `aaa review` without flags
When: Command executes
Then: Prompt appears asking for mode selection

Verification: aaa review 2>&1 | grep -q "supervised.*headless"
```

### Test-Related AC Requirements

Every subtask that creates executable code MUST include test-related acceptance criteria:

| Subtask Type | Required AC |
|--------------|-------------|
| New CLI command | "E2E test in tools/tests/e2e/<cmd>.test.ts passes" |
| New CLI flag | "Test for --<flag> added to existing E2E test" |
| New module | "Unit test in tools/tests/lib/<module>.test.ts passes" |
| Refactor | "Existing tests still pass" AND "New test for extracted code" |
| Bug fix | "Regression test added that would have caught the bug" |

**Example AC with test requirement:**
```json
{
  "acceptanceCriteria": [
    "diary.ts exports readDiary and writeDiaryEntry",
    "Unit test tools/tests/lib/diary.test.ts exists and passes",
    "Test covers: read empty file, read valid entries, write new entry"
  ]
}
```

### Documentation-Related AC Requirements

When a subtask creates user-facing features, include documentation AC:

| Change Type | Required Documentation AC |
|-------------|---------------------------|
| New CLI command | "README.md CLI Tools section documents the command" |
| New CLI flag | "README.md documents the new flag in command section" |
| New public API | "JSDoc/TSDoc added for exported functions" |
| Breaking change | "CHANGELOG.md updated with migration notes" |
| New workflow | "Relevant context/ or docs/ file updated" |

**Example AC with documentation requirement:**
```json
{
  "acceptanceCriteria": [
    "aaa review command runs with --headless flag",
    "README.md CLI Tools section documents 'aaa review --headless'",
    "tools/CLAUDE.md directory structure includes review/ folder"
  ]
}
```

**Before proceeding:** Review each AC. Ensure it has:
1. Clear intent
2. Verification method
3. Test requirement (if code change)
4. Documentation requirement (if user-facing)
