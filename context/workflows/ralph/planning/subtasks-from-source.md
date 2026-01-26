# Subtasks Generation from Any Source

You are a technical implementation planner generating subtasks from arbitrary input. Unlike `subtasks-auto.md` which requires a formal TASK document, this workflow accepts **any text source**: files, direct text descriptions, or review diaries.

## Input Sources

This workflow supports three input types:

### 1. File Path
```
subtasks-from-source.md ./review-findings.md
subtasks-from-source.md ./plan.md
```
If the argument is a path to an existing file, read and parse that file.

### 2. Text Description
```
subtasks-from-source.md "Fix array bounds check in review command"
subtasks-from-source.md "Add error logging to diary functions"
```
If the argument doesn't point to a file, treat it as a direct description.

### 3. Review Diary
```
subtasks-from-source.md --review
```
If `--review` flag is set, parse `logs/reviews.jsonl` for findings.

## Parameters

| Parameter | Required | Description |
|-----------|----------|-------------|
| `<source>` | Yes* | File path or text description |
| `--review` | Yes* | Parse review diary instead of source |
| `--milestone <name>` | No | Target milestone for output location |
| `--story <ref>` | No | Link subtasks to parent story |

*One of `<source>` or `--review` is required.

## Workflow

### Phase 1: Parse Input

**For file input:**
1. Read the file content
2. Identify actionable items (numbered lists, headers with issues, etc.)
3. Extract title, description, and context for each item

**For text input:**
1. Parse the description as a single actionable item
2. If it contains multiple items (separated by newlines or semicolons), split them

**For review diary:**
1. Read `logs/reviews.jsonl`
2. Extract findings from most recent review session
3. Filter to unresolved findings (not marked as FALSE POSITIVE)

### Phase 2: Codebase Analysis

Before generating subtasks, explore the codebase to understand context:

```
- Use Glob to find files mentioned in the input
- Use Grep to search for related code patterns
- Read key files to understand existing implementations
```

Answer these questions:
- What files need to be created vs modified?
- What existing patterns should be followed?
- What dependencies exist that affect implementation order?

### Phase 3: Generate Subtasks

For each actionable item, create a subtask following the schema:

```json
{
  "id": "SUB-NNN",
  "taskRef": "TASK-NNN",
  "storyRef": "STORY-NNN",
  "title": "Short title (max 100 chars)",
  "description": "Detailed implementation description",
  "done": false,
  "acceptanceCriteria": ["Verifiable condition 1", "..."],
  "filesToRead": ["path/to/context/file.ts", "..."]
}
```

**taskRef handling:**
- If input references a specific TASK, use that
- If generating from review findings or text, use a placeholder `TASK-REVIEW-001`
- If `--story` provided, also set `storyRef`

### Phase 4: Size Validation

**CRITICAL:** Each subtask must fit within a single context window iteration.

#### Size Guidelines

A properly-sized subtask allows the agent to:
1. **Initialize** - Read context files (CLAUDE.md, task, etc.)
2. **Gather** - Read filesToRead and explore related code
3. **Implement** - Write the code changes
4. **Test** - Run tests and fix issues
5. **Commit** - Make a clean commit

All of this must fit in one context window.

#### Subtask Scope Rules

Each subtask should:
- **Touch 1-3 files** (not counting test files)
- **Implement one clear concept**
- **Be completable in 15-30 tool calls**
- **Have 2-5 acceptance criteria**

#### Signs a Subtask is Too Large

- Description mentions multiple unrelated changes
- Acceptance criteria span different areas of the codebase
- Implementation requires extensive exploration
- Would result in commits touching 5+ files

**If too large:** Split into multiple subtasks with clear boundaries.

#### Signs a Subtask is Too Small

- Could be a single line change
- Trivially merged with another subtask
- Creates overhead without value

**If too small:** Merge with related subtask.

### Phase 5: ID Generation

To generate subtask IDs:

1. **Scan existing subtasks** - Check all `subtasks.json` files in the project
2. **Find highest SUB-NNN** - Determine the maximum number used
3. **Increment** - New IDs start at max + 1, zero-padded to 3 digits

If no subtasks exist, start with `SUB-001`.

**IDs are globally unique** across all subtasks in the project.

### Phase 6: Validation Checklist

Before finalizing subtasks, verify:

- [ ] Each subtask has all required fields (id, taskRef, title, description, done, acceptanceCriteria, filesToRead)
- [ ] All IDs follow SUB-NNN pattern and are unique
- [ ] taskRef is set (TASK-NNN or TASK-REVIEW-NNN)
- [ ] storyRef is included if `--story` was provided
- [ ] Subtasks are sized to fit single context window
- [ ] Acceptance criteria are concrete and verifiable
- [ ] filesToRead contains relevant context files
- [ ] Output is valid JSON matching the schema

### Phase 7: Output

**Output location:**
- If `--milestone` provided: `docs/planning/milestones/<milestone>/subtasks.json`
- Otherwise: `docs/planning/subtasks.json`

**Behavior:**
- If file exists: Append new subtasks to existing array
- If file doesn't exist: Create new file with proper structure

**Schema reference:**
```json
{
  "$schema": "../schemas/subtasks.schema.json",
  "metadata": {
    "scope": "milestone",
    "milestoneRef": "<milestone-name>"
  },
  "subtasks": [...]
}
```

## Output Summary

After creating subtasks, summarize:

```
Created N subtasks from [source type]:
1. SUB-040: <title>
2. SUB-041: <title>
...

File: docs/planning/milestones/<milestone>/subtasks.json

Ready for: ralph build --subtasks <path>
```

## Parsing Patterns

### Review Findings File (Markdown)

Look for patterns like:
```markdown
### 1. Title of finding
**File:** `path/to/file.ts`
**Issue:** Description of what's wrong
**Fix:** What needs to be done
```

Each numbered heading becomes a subtask.

### Review Diary (JSONL)

Parse entries like:
```json
{"timestamp": "...", "findings": [...], "decisions": [...]}
```

Extract findings where decision != "FALSE POSITIVE".

### Plain Text

For simple text input:
- Single item: Create one subtask
- Multiple lines/semicolons: Create multiple subtasks

## CLI Invocation

```bash
# From file
aaa ralph plan subtasks ./review-findings.md --milestone 002-ralph

# From text
aaa ralph plan subtasks "Fix null safety in parsing" --story STORY-001

# From review diary
aaa ralph plan subtasks --review --milestone 002-ralph
```
