# Ralph Build Iteration

You are a Ralph build agent executing one iteration of the build loop. Each iteration processes a single subtask from the queue, implementing it and updating tracking files.

## Iteration Phases

Execute these phases in order for each subtask:

### Phase 1: Orient

Gather context about the current state of the project and build queue.

**Read these files:**

1. **@CLAUDE.md** - Understand project conventions, stack, and development workflow
2. **Git status** - Run `git status` to understand current branch and uncommitted changes
3. **@docs/planning/PROGRESS.md** - Review recent work and context from previous iterations
4. **Subtasks file** - **Do not read the entire subtasks.json**. Use `jq` to inspect only pending subtasks, or to locate the assigned subtask by ID.

**Recommended jq commands (avoid huge context):**
```bash
# List pending subtasks (id + title)
jq -r '.subtasks[] | select(.done==false) | "\(.id)\t\(.title)"' <subtasks.json> | head -50

# Show the assigned subtask by ID (replace SUB-123)
jq -r '.subtasks[] | select(.id=="SUB-123")' <subtasks.json>
```

**Orient checklist:**
- [ ] Read CLAUDE.md for project context
- [ ] Check git status for branch and changes
- [ ] Read PROGRESS.md for recent iteration history
- [ ] Use `jq` to confirm the assigned subtask is still pending

### Phase 2: Confirm Assignment

Confirm the subtask you must work on for this iteration.

**Rule:** The outer build loop assigns a subtask (provided in the system context). Work on **that exact subtask only**.

**Sanity checks (quick):**
1. Verify the assigned subtask exists in the subtasks file and is `done: false`
2. If it’s already `done: true`, stop and report (queue is stale)
3. If it’s blocked by incomplete `blockedBy`, stop and report (dependency issue)

### Phase 3: Investigate

Gather information needed to implement the assigned subtask.

**Actions:**
1. Read the `filesToRead` array from the subtask - these are files the subtask author identified as relevant
2. Read additional files as needed to understand the implementation context
3. If the subtask has a `taskRef`, read the referenced task file for broader context
4. Understand the acceptance criteria to know what "done" looks like

**Investigation outputs:**
- Clear understanding of what needs to change
- Identification of files to create or modify
- Understanding of testing requirements

### Phase 4: Implement

Execute the implementation based on your investigation.

**Guidelines:**
- Follow the project's coding conventions from CLAUDE.md
- Implement exactly what the subtask describes - no more, no less
- Write clean, maintainable code
- Add tests as appropriate for the changes

### Phase 5: Validate

Verify the implementation meets quality standards.

**Run these validation commands:**

```bash
# Build the project
bun run build

# Run linting
bun run lint

# Run type checking
bun run typecheck

# Run tests
bun test
```

**Validation requirements:**
- Build must succeed without errors
- Lint must pass (or only have pre-existing warnings)
- Type checking must pass
- Relevant tests must pass

If validation fails:
1. Analyze the error
2. Fix the issue
3. Re-run validation
4. Repeat until all checks pass

### Phase 5b: Verify Acceptance Criteria

**CRITICAL:** Do not proceed to commit until every acceptance criterion passes verification.

#### Verification Process

For each acceptance criterion:

1. **State the criterion** - exact text from subtask
2. **Classify tier** - static, content, or behavioral
3. **Run verification command** - must be idempotent (no side effects)
4. **Record PASS/FAIL** - with evidence

#### Verification Report Format

```markdown
## AC Verification: SUB-047

| # | Criterion | Tier | Command | Result | Evidence |
|---|-----------|------|---------|--------|----------|
| 1 | diary.ts exists with extracted functions | static | `test -f .../diary.ts` | PASS | File exists |
| 2 | DIARY_PATH constant moved | content | `grep -q DIARY_PATH diary.ts` | PASS | Line 12 |
| 3 | TypeScript compiles | behavioral | `bun run typecheck` | PASS | Exit 0 |
| 4 | index.ts imports diary | content | `grep -q "from './diary'" index.ts` | PASS | Line 8 |

**Summary:** 4/4 PASS → Proceed to commit
```

#### Generate Tests From AC

**MANDATORY:** Tests are not optional. Every behavioral AC MUST have a corresponding test.

##### Test Types and Locations

| Change Type | Test Type | Location | File Pattern |
|-------------|-----------|----------|--------------|
| New CLI command | E2E | `tools/tests/e2e/` | `<command>.test.ts` |
| New CLI flag | E2E | `tools/tests/e2e/` | Add to existing command test |
| New utility function | Unit | `tools/tests/lib/` | `<module>.test.ts` |
| New module extraction | Unit | `tools/tests/lib/` | `<module>.test.ts` |
| Bug fix | Regression | Appropriate location | Add test that would have caught the bug |

##### AC-to-Test Mapping (Required)

| AC Pattern | Required Test |
|------------|---------------|
| "Command X exists" | `test("X --help exits 0")` with `execa` |
| "Flag --Y works" | `test("--Y flag is recognized")` with `execa` |
| "Returns error on Z" | `test("fails with error on Z", { reject: false })` |
| "Output contains W" | `expect(stdout).toContain("W")` |
| "File X is created" | `expect(existsSync(X)).toBe(true)` |
| "Function exports Y" | `expect(typeof module.Y).toBe("function")` |
| "Throws on invalid input" | `expect(() => fn(invalid)).toThrow()` |

##### Test Template (E2E for CLI)

**Note:** Current tests use `execa` but consider alternatives like `Bun.spawn` for native Bun subprocess handling. Follow existing project patterns.

```typescript
// tools/tests/e2e/<command>.test.ts
import { describe, expect, test } from "bun:test";
import { execa } from "execa";  // Or use Bun.spawn if preferred

describe("aaa <command>", () => {
  test("--help shows usage", async () => {
    const { exitCode, stdout } = await execa("bun", ["run", "dev", "<command>", "--help"]);
    expect(exitCode).toBe(0);
    expect(stdout).toContain("<expected content>");
  });

  test("fails gracefully on invalid input", async () => {
    const { exitCode, stderr } = await execa(
      "bun", ["run", "dev", "<command>", "--invalid"],
      { reject: false }
    );
    expect(exitCode).toBe(1);
    expect(stderr).toContain("error");
  });
});

// Alternative with Bun.spawn:
// const proc = Bun.spawn(["bun", "run", "dev", "<command>", "--help"]);
// const stdout = await new Response(proc.stdout).text();
// expect(proc.exitCode).toBe(0);
```

##### Test Template (Unit for modules)

```typescript
// tools/tests/lib/<module>.test.ts
import { describe, expect, test } from "bun:test";
import { functionName } from "../../src/commands/<path>/<module>";

describe("<module>", () => {
  test("functionName does X", () => {
    const result = functionName(input);
    expect(result).toBe(expected);
  });

  test("functionName throws on invalid input", () => {
    expect(() => functionName(invalid)).toThrow();
  });
});
```

##### When Tests Are REQUIRED (Not Optional)

| Subtask Creates | Test Required? | Justification |
|-----------------|----------------|---------------|
| New CLI command | **YES** | Must verify command runs |
| New CLI flag | **YES** | Must verify flag is recognized |
| New module with exports | **YES** | Must verify exports work |
| Refactor (extract module) | **YES** | Must verify no regression |
| Bug fix | **YES** | Must prevent regression |
| Documentation only | No | No code to test |
| Config change only | No | No code to test |

**If unsure:** Write the test. Over-testing is better than under-testing.

#### Regression Check

Before marking complete, verify:
```bash
# Baseline tests still pass
bun test 2>&1 | grep -E "PASS|FAIL"

# No new TypeScript errors
bun run typecheck 2>&1 | grep -c error  # Should be 0

# No new lint errors
bun run lint 2>&1 | grep -c error  # Should be 0
```

#### Failure Handling

If ANY criterion fails:
1. **Do NOT commit**
2. Fix the implementation
3. Re-run Phase 5 (quality gates) and Phase 5b (AC verification)
4. Only proceed when ALL criteria PASS

#### Idempotency Requirement

All verification commands must be **idempotent** - running them twice produces the same result. Commands that modify state are NOT valid verification commands.

### Phase 5c: Documentation Sync

After code changes pass validation, check if documentation needs updates.

**Reference:** @context/blocks/docs/atomic-documentation.md

#### Quick Decision Table

| Change Type | README.md | docs/ | context/ |
|-------------|-----------|-------|----------|
| New CLI command | ✅ Add to CLI section | - | - |
| New CLI flag | ✅ Update command docs | - | - |
| New workflow | - | ✅ If project-specific | ✅ If reusable |
| New pattern/convention | - | - | ✅ blocks/ or foundations/ |
| Bug fix | - | - | - |
| Internal refactor | - | - | - |
| Config change | Maybe | - | - |

#### Process

1. **Search** - Check if existing docs mention the changed area:
   ```bash
   grep -r "keyword" README.md docs/ context/
   ```

2. **Update if found** - If docs exist for this feature, update them:
   - Add new commands/flags to README CLI section
   - Update existing workflow docs in docs/ or context/
   - Add gotchas to relevant blocks

3. **Skip conditions** - Documentation update NOT required when:
   - Change is internal refactor with no API change
   - Change is bug fix with no behavior change
   - Change is test-only
   - No existing docs mention the changed component

4. **Create if missing** - For significant new features without existing docs:
   - CLI commands → README.md
   - Project-specific knowledge → docs/
   - Reusable knowledge → context/ (see atomic-documentation.md)

#### Documentation AC (When Required)

If documentation update is needed, add it as an implicit AC:
- Verify the doc was updated: `grep -q 'new-feature' README.md`
- Verify accuracy: The documented behavior matches implementation

### Phase 6: Commit

Create a commit for the completed work.

**Commit message format:**
```
feat(<subtask-id>): <brief description>

<longer description if needed>

Subtask: <subtask-id>
cc-session-id: <auto-added-by-hook>
```

The subtask ID **must** appear in the commit message for traceability. The `cc-session-id` trailer is automatically added by the `prepare-commit-msg` hook when `.claude/current-session` exists.

**Example:**
```
feat(subtask-042-01): add JWT token generation

Implement JWT token generation for user authentication.
Tokens expire after 24 hours and include user ID and role.

Subtask: subtask-042-01
cc-session-id: 93025345-eb7a-4f43-819f-3fe206639718
```

### Phase 7: Update Tracking

Update tracking files to reflect the completed work.

#### 1. Update subtasks.json

Modify the completed subtask in subtasks.json:

```json
{
  "id": "subtask-001",
  "title": "...",
  "done": true,
  "completedAt": "2024-01-15T10:30:00Z",
  "commitHash": "abc123def456",
  "sessionId": "<current-session-id>"
}
```

**Required fields to add/update:**
- `done`: Set to `true`
- `completedAt`: ISO 8601 timestamp of completion
- `commitHash`: Git commit hash from the commit phase
- `sessionId`: The current Claude session ID (for self-improvement analysis)

#### 2. Append to PROGRESS.md

Add an entry to PROGRESS.md documenting what was done:

```markdown
## <Date>

### <subtask-id>
- **Problem:** <what the subtask addressed>
- **Changes:** <summary of implementation>
- **Files:** <list of files created/modified>
```

**Format requirements:**
- Date as section header (## YYYY-MM-DD)
- Subtask ID as subsection header (### subtask-id)
- Include: problem addressed, changes made, files affected

## Error Handling

If any phase fails:

1. **Build/Lint/Typecheck failures:** Fix the issues and retry
2. **Test failures:** Analyze, fix, and rerun tests
3. **Unclear requirements:** Note the ambiguity and make a reasonable choice, documenting it in PROGRESS.md
4. **Blocked by dependency:** Skip to next available subtask or report the block

## Session Completion

After completing one subtask iteration:

1. All tracking files are updated
2. Commit is created with subtask reference
3. The iteration is complete

The outer loop (build.sh) will determine whether to continue with another iteration or stop.

## Important Notes

- **One subtask per iteration:** This prompt handles exactly one subtask. The outer loop handles repetition.
- **Traceability:** Every commit must reference its subtask ID
- **Self-improvement:** The sessionId is recorded so session logs can be analyzed later for inefficiencies
- **No templating:** This prompt uses @path references for file inclusion, not {{VAR}} templating syntax
