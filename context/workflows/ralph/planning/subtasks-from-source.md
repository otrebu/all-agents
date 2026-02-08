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
| `--1-to-1` | No | Direct mapping mode: skip sizing/splitting, one input → one subtask |

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

### Phase 1b: Doc Lookup

**Purpose:** Before codebase analysis, identify relevant atomic documentation that informs subtask boundaries and implementation context.

**Reference:** @context/workflows/ralph/components/doc-analysis.md (Tier 1: Index Lookup)

**Process (Haiku subagent):**

1. **Extract technologies/concepts** from parsed input
   - Tools, libraries, patterns mentioned
   - File types and modules involved
   - Domain concepts (e.g., "code review", "CLI", "logging")

2. **Search documentation index** (`context/README.md`)
   - Query the index for relevant blocks/foundations/stacks
   - Match against: `context/blocks/`, `context/foundations/`, `context/stacks/`

3. **Classify results:**
   | Found | Action |
   |-------|--------|
   | Relevant doc exists | Add to `filesToRead` for subtasks touching that area |
   | Doc missing for critical concept | Flag for Phase 6b (Doc Linking) |
   | Doc exists but outdated | Flag for Phase 6b update |

**Output:**
- `docMatches`: Array of `{ concept, docPath }` to add to filesToRead
- `missingDocs`: Array of `{ concept, reason }` for Phase 6b to create

**Example:**
```
Input: "Add error logging to diary functions"
→ Search: "error handling", "logging", "diary"
→ Found: context/blocks/patterns/error-handling.md
→ Missing: No diary-specific doc (flag for potential creation)
→ Output: { docMatches: [{ concept: "error handling", docPath: "context/blocks/patterns/error-handling.md" }], missingDocs: [{ concept: "diary module", reason: "No docs for review/diary subsystem" }] }
```

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

### Phase 2b: Testing & Verification

When no parent task provides testing context:

@context/workflows/ralph/planning/components/testing-guidance.md

### Phase 3: Generate Subtasks

For each actionable item, create a subtask following the schema in subtask-spec.md.

**taskRef handling (specific to this workflow):**
- If input references a specific TASK, use that
- If generating from review findings or text, use a placeholder like `review-findings`
- If `--story` provided, also set `storyRef`

Apply the AC Quality Gate from subtask-spec.md before proceeding.

**`--1-to-1` mode:** When this flag is set, each parsed input item maps directly to exactly one subtask. Do not decompose large items or merge small ones. Trust that the input is already appropriately scoped.

### Phase 3b: Size Judgment

**Skip this phase if `--1-to-1` flag is set.** In 1-to-1 mode, trust that input items are already appropriately scoped.

**Purpose:** Validate each subtask's scope using the vertical slice test before proceeding.

For each generated subtask, answer these **4 questions**:

| # | Question | What It Tests | Red Flag |
|---|----------|---------------|----------|
| 1 | **Is it vertical?** | Does it deliver value end-to-end? | Touches only UI, only backend, or only tests without the others needed |
| 2 | **One pass?** | Can an agent complete it in a single context window? | Requires multiple research-then-implement cycles |
| 3 | **Ships alone?** | Could this be merged to main independently? | Depends on unfinished sibling subtasks |
| 4 | **Test boundary?** | Does it have a natural test boundary? | No obvious "given X, when Y, then Z" scenario |

**Scoring:**
- **4/4 Pass** → Subtask is correctly scoped
- **3/4 Pass** → Consider refinement, proceed with caution
- **2/4 or less** → Must split or merge

**Sizing Mode Guidance:**

The `--size` flag controls slice thickness:

| Mode | Interpretation of "One pass" | Guidance |
|------|------------------------------|----------|
| `small` | Thinnest viable slice | Split aggressively. Each subtask = 1 function or 1 file change. Maximize granularity. |
| `medium` | One PR per subtask | Each subtask is a coherent unit that ships independently. 1-3 files typical. (Default) |
| `large` | Major boundaries only | Only split at major functional seams. Prefer fewer, larger subtasks. 3-5 files acceptable. |

**Example Size Judgment:**

```
Subtask: "Add error logging to diary functions"

1. Is it vertical? YES - touches code + tests
2. One pass? YES - localized change, clear scope
3. Ships alone? YES - independent improvement
4. Test boundary? YES - "when error occurs, log message appears"

Result: 4/4 PASS → Proceed
```

### Phase 4: Size Validation

**Skip this phase if `--1-to-1` flag is set.** In 1-to-1 mode, no resizing is performed.

Apply Size Guidelines from subtask-spec.md using the vertical slice test from Phase 3b.

### Phase 5: ID Generation

Follow ID Generation rules from subtask-spec.md (SUB-NNN pattern, milestone-scoped allocation in target queue).

### Phase 6: Validation

Run through the Validation Checklist in subtask-spec.md before proceeding.

### Phase 6b: Doc Linking

**Purpose:** Create missing atomic documentation flagged during Phase 1b, ensuring subtasks have complete context.

**Reference:** @context/workflows/ralph/components/doc-analysis.md (Tier 2: Gap Creation)

**Input:** `missingDocs` array from Phase 1b containing `{ concept, reason }` entries.

**Process:**

1. **Filter for critical gaps**
   - Skip docs for concepts that are trivial or well-known
   - Prioritize docs that would help multiple subtasks
   - Skip if existing doc covers 80%+ of the concept

2. **Spawn atomic-doc-creator for each critical gap**
   ```
   For each { concept, reason } in missingDocs:
     → Invoke @.claude/agents/atomic-doc-creator.md with:
       - Topic: <concept>
       - Context: <reason>
       - Suggested Layer: (inferred from concept type)
   ```

3. **Log creation to milestone diary**

   Each created doc is logged to the milestone's daily log:
   ```json
   {
     "type": "doc-creation",
     "timestamp": "<ISO 8601>",
     "what": "<concept>",
     "path": "<created doc path>",
     "reason": "<why it was needed>",
     "triggeredBy": "subtasks-from-source"
   }
   ```

4. **Update subtask filesToRead**
   - Add created doc paths to relevant subtasks' `filesToRead` arrays
   - A doc is relevant if the subtask touches the concept area

**Important:** Created docs do NOT have the `[REVIEW]` flag. The atomic-doc-creator normally adds this flag, but in the subtask generation context, docs are created just-in-time for immediate use. Human review happens during the broader subtask review cycle.

**Skip conditions:**
- No `missingDocs` from Phase 1b → skip entire phase
- Concept already documented elsewhere → skip that doc
- Doc would be trivially small (< 50 words) → skip

**Example:**

```
Phase 1b output:
  missingDocs: [
    { concept: "diary module", reason: "No docs for review/diary subsystem" },
    { concept: "chalk styling", reason: "No docs for console formatting" }
  ]

Phase 6b actions:
  1. "diary module" → Create context/blocks/tools/diary.md
     → Log: { type: "doc-creation", what: "diary module", path: "context/blocks/tools/diary.md", ... }
     → Add to filesToRead for SUB-058, SUB-059 (touch diary code)

  2. "chalk styling" → SKIP (well-known library, npm docs sufficient)
```

### Phase 7: Output (Draft)

**Output location:** `tmp/subtasks-draft.json`

All generated subtasks are written to a draft file first. This enables Phase 8 review before committing to the final location.

**Draft format:**
```json
{
  "$schema": "../docs/planning/schemas/subtasks.schema.json",
  "metadata": {
    "scope": "milestone",
    "milestoneRef": "<milestone-name>",
    "isDraft": true
  },
  "subtasks": [...]
}
```

**Behavior:**
- Always write to `tmp/subtasks-draft.json` (overwrite if exists)
- Include all generated subtasks from Phases 3-6
- Draft is input for Phase 8 review

### Phase 8: Review

**Purpose:** Review all generated subtasks for sizing issues before committing to final location.

This phase always runs. There is no `--no-review` flag.

**`--1-to-1` mode behavior:** Review still runs for validation, but merge/split suggestions are informational only. The 1-to-1 mapping is preserved regardless of sizing findings.

#### Step 1: Invoke Haiku Subtask Reviewer

Spawn the subtask-reviewer agent to analyze all pending subtasks:

```
Invoke @.claude/agents/subtask-reviewer.md with:
  - Input: contents of tmp/subtasks-draft.json
  - Sizing mode: <small|medium|large> from --size flag
  - Output: structured review findings
```

The reviewer applies the 4-question vertical slice test:
- Fails 2+ questions → needs attention (split or merge)
- Passes 3-4 questions → approved

#### Step 2: Log Review Findings

Write review findings to milestone daily log:

```json
{
  "type": "subtask-review",
  "timestamp": "<ISO 8601>",
  "subtasksPath": "tmp/subtasks-draft.json",
  "summary": {
    "total": 15,
    "pending": 8,
    "oversized": 1,
    "undersized": 3,
    "approved": 4
  },
  "oversized": [...],
  "undersized": [...],
  "mergeCandidates": [...],
  "splitCandidates": [...],
  "approved": [...]
}
```

Log location: `docs/planning/milestones/<milestone>/logs/<YYYY-MM-DD>.jsonl`

#### Step 3: Opus Triage

Opus reviews the Haiku findings and applies suggestions:

| Finding Type | Opus Action |
|--------------|-------------|
| `mergeCandidates` | Combine subtasks into single entry |
| `splitCandidates` | Create multiple subtasks from one |
| `undersized` (no merge) | Keep as-is or merge with adjacent |
| `oversized` (no split suggestion) | Add spike subtask or split by files |
| `approved` | Pass through unchanged |

**Triage guidelines:**
- Haiku suggestions are advisory, not mandatory
- Opus uses judgment to accept, modify, or reject suggestions
- Priority: avoid context window overflow (split) > reduce overhead (merge)
- When uncertain, err on keeping subtasks separate

**`--1-to-1` mode:** Skip triage actions. All subtasks pass through unchanged regardless of sizing findings. Log findings for informational purposes but do not apply merge/split actions.

#### Step 4: Write Final Output

After triage, write final subtasks to the destination:

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

#### Step 5: Cleanup

Delete the draft file after successful write:
```bash
rm tmp/subtasks-draft.json
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

# Direct 1-to-1 mapping (skip decomposition/sizing)
aaa ralph plan subtasks ./well-scoped-items.md --milestone 002-ralph --1-to-1
```

### When to Use `--1-to-1`

Use `--1-to-1` when:
- **Tasks are already well-scoped** - Each input item is already the right size for a subtask
- **You want predictable output** - One input item → one subtask, no splitting or merging
- **Importing from external sources** - Converting issue tracker items or PR descriptions directly

Do NOT use when:
- Input items vary wildly in scope (some huge, some tiny)
- You want intelligent sizing and decomposition
- Items need to be grouped or split for optimal context window usage
