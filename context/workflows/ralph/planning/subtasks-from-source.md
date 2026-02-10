# Subtasks Generation from Any Source

You are a technical implementation planner generating subtasks from arbitrary input. Unlike `subtasks-auto.md` which requires a formal TASK document, this workflow accepts **any text source**: files, direct text descriptions, or review diaries.

## Shared Reference

For subtask schema, size guidelines, ID generation, validation checklist, and AC quality gate:
→ See @context/workflows/ralph/planning/subtask-spec.md

## Input Sources

This workflow supports three input types:

### 1. File Path
```
aaa ralph plan subtasks --file ./review-findings.md
aaa ralph plan subtasks --file ./plan.md
```
If `--file` is provided, read and parse that file.

### 2. Text Description
```
aaa ralph plan subtasks --text "Fix array bounds check in review command"
aaa ralph plan subtasks --text "Add error logging to diary functions"
```
If `--text` is provided, treat it as a direct description.

### 3. Review Diary
```
aaa ralph plan subtasks --review-diary
```
If `--review-diary` flag is set, parse `logs/reviews.jsonl` for findings.

## Parameters

| Parameter | Required | Description |
|-----------|----------|-------------|
| `--file <path>` | Yes* | File path as source |
| `--text <string>` | Yes* | Text description as source |
| `--review-diary` | Yes* | Parse review diary instead of file/text |
| `--output-dir <path|milestone>` | No | Output directory for `subtasks.json`; milestone-shaped paths (`docs/planning/milestones/<slug>`) also set the planning log directory |
| `--size <small\|medium\|large>` | No | Slice thickness for generated subtasks |

*One of `--file`, `--text`, or `--review-diary` is required.
Do not combine these source flags with `--milestone`, `--story`, or `--task`.

## Workflow

Execute this workflow in one deterministic pass:

1. Parse input
2. Analyze codebase context
3. Generate subtasks
4. Validate subtasks
5. Append subtasks to destination file
6. Summarize results
7. Stop immediately

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

For each actionable item, create a subtask following the schema in subtask-spec.md.

**taskRef handling (specific to this workflow):**
- If input references a specific TASK, use that
- If generating from review findings or text, use a placeholder like `review-findings`

### Phase 4: Validate Subtasks

Run the Validation Checklist and AC Quality Gate in @context/workflows/ralph/planning/subtask-spec.md before writing output.

### Phase 5: Append Subtasks

After validation, write final subtasks to the destination directly:

**Output location:**
- If `--output-dir` is provided: `<output-dir>/subtasks.json`
- Otherwise: `docs/planning/subtasks.json`

When `--output-dir` points to a milestone-shaped path (`docs/planning/milestones/<slug>`), both generated subtasks and planning logs resolve to that same milestone context.

**IMPORTANT: Use `appendSubtasksToFile()` from `tools/src/commands/ralph/config.ts`**

This function handles the append-vs-create logic automatically:
- If file exists: Appends new subtasks to existing array (skips duplicates by ID)
- If file doesn't exist: Creates new file with proper structure

**Never use `saveSubtasksFile()` directly** - it overwrites the entire file and will destroy existing subtasks.

Example usage:
```typescript
import { appendSubtasksToFile } from "@tools/commands/ralph/config";

const result = appendSubtasksToFile(subtasksPath, newSubtasks, metadata);
console.log(`Added ${result.added} subtasks, skipped ${result.skipped} duplicates`);
```

Do not use draft files, reviewer loops, or triage phases in this workflow.

### Phase 6: Summarize and Stop

After appending subtasks, output a short summary:

```
Created N subtasks from [source type]:
1. SUB-040: <title>
2. SUB-041: <title>
...

File: <resolved-output-dir>/subtasks.json

Ready for: aaa ralph build --subtasks <path>
```

Then stop immediately. Do not continue with any additional review or follow-up phases.

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
aaa ralph plan subtasks --file ./review-findings.md --output-dir 002-ralph

# From text
aaa ralph plan subtasks --text "Fix null safety in parsing" --output-dir docs/planning/milestones/002-ralph

# From review diary
aaa ralph plan subtasks --review-diary --output-dir 002-ralph
```
