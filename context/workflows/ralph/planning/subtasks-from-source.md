# Subtasks Generation from Any Source

You are a technical implementation planner generating subtasks from arbitrary input. Unlike `subtasks-auto.md` which requires a formal TASK document, this workflow accepts **any text source**: files, direct text descriptions, or review diaries.

## Shared Reference

For subtask schema, size guidelines, ID generation, validation checklist, and AC quality gate:
→ See @context/workflows/ralph/planning/subtask-spec.md

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
- If `--story` provided, also set `storyRef`

### Phase 4: Validate Subtasks

Run the Validation Checklist and AC Quality Gate in @context/workflows/ralph/planning/subtask-spec.md before writing output.

### Phase 5: Append Subtasks

After validation, write final subtasks to the destination directly:

**Output location:**
- If `--milestone` provided: `docs/planning/milestones/<milestone>/subtasks.json`
- Otherwise: `docs/planning/subtasks.json`

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

File: docs/planning/milestones/<milestone>/subtasks.json

Ready for: ralph build --subtasks <path>
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
aaa ralph plan subtasks ./review-findings.md --milestone 002-ralph

# From text
aaa ralph plan subtasks "Fix null safety in parsing" --story STORY-001

# From review diary
aaa ralph plan subtasks --review --milestone 002-ralph
```
