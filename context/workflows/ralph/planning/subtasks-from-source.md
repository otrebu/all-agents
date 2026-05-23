# Subtasks Generation from Any Source

You are a technical implementation planner generating subtasks from arbitrary input. Unlike `subtasks-auto.md` which requires a formal TASK document, this workflow accepts **any text source**: files, direct text descriptions, or review diaries.

## Tracer-Bullet Framing

Each generated subtask is a **tracer bullet**: the thinnest vertical slice that cuts through every relevant layer (UI/CLI surface → application logic → integration boundary → persistence/IO) and is demoable on its own.

Prefer many thin vertical slices over few thick horizontal slices. A subtask that lights up one user-observable behavior end-to-end beats N subtasks that each build a single horizontal layer in isolation.

When evaluating a candidate subtask, ask:
- Could a user/operator/developer see this slice produce its outcome without waiting for other subtasks?
- Does it touch every layer the behavior requires, even if shallowly?
- Is there a single command, request, or interaction that demonstrates the slice?

If any answer is "no", the slice is horizontal — re-cut it.

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
4. **If multi-story bundle:** check for `---STORY: <id>---` separators (produced by `aaa story concat`) or repeated `## Story:` headings. If present, treat the file as a milestone-batched bundle and **look for cross-story vertical slices first** before falling back to per-story subtasks (see "Cross-Story Subtask Contract" in Phase 3).

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
- Which testing profiles apply (logic, integration/API, CLI E2E, web visual, web flow E2E)?
- **If input is a multi-story bundle, what cross-story tracer bullets exist?** Look for end-to-end behaviors that touch multiple stories — a single slice covering 2-3 stories is preferable to 2-3 horizontal per-story slices.

### Phase 3: Generate Subtasks

For each actionable item, create a subtask following the schema in subtask-spec.md.

Acceptance criteria and test intent must be profile-driven and **behavior-first**. Each subtask describes one externally observable behavior, with paired test/behavior evidence:

- `[Behavioral]` — an automated test exists and asserts the behavior end-to-end
- `[Evidence]` — the exact test command and expected artifact/output are named
- `[Manual]` — if the behavior has UI/UX/visual state, manual verification (Agent Browser or equivalent) is required with explicit artifact paths
- `[Visual]` / `[Regression]` are also valid prefixes when relevant (see @context/workflows/ralph/building/ralph-iteration.md)

Tool-qualify verification ACs (unit/integration, Playwright E2E, Agent Browser visual, CLI E2E).

For web/UI work, always include:
- a user-visible `[Visual]`/`[Manual]` AC with Agent Browser verification and an explicit artifact path
- a behavioral flow `[Behavioral]` AC with automated Playwright E2E

Apply **mixed TDD intent** explicitly. The implementing agent will execute RED → GREEN → REFACTOR per @context/workflows/ralph/building/ralph-iteration.md — write the AC so the failing test direction is obvious:
- **outside-in** for end-to-end/user-flow behavior — the outer test (CLI E2E, browser flow, API integration, provider invocation) fails first
- **unit-first** for pure logic/rules/helpers
- **characterization-first** for refactors
- **failing-regression-first** for bug fixes

Do not require BDD/Cucumber unless explicitly requested by the source input.

**End-to-end requirement (mandatory for cross-layer behavior):**

For any CLI command, API route, web user flow, provider integration, or behavior that crosses layer boundaries, the subtask MUST require an end-to-end or integration test at the real boundary. Unit tests are allowed as supporting coverage but do NOT satisfy the tracer-bullet requirement by themselves. Name the exact boundary in the AC (e.g. "the `aaa story concat` CLI", "POST /api/v1/foo", "the claude provider's `invoke()`", "the `/settings` web flow").

**Manual verification requirements:**

For UI/web/visual subtasks, include both:
- automated Playwright/browser E2E for the behavioral flow
- a `[Manual]` AC mandating Agent Browser verification with screenshot/snapshot/video artifacts under `artifacts/browser/<subtask-id>/...`

For non-web CLI/provider subtasks, include the equivalent manual smoke:
- a `[Manual]` AC mandating the real CLI command or provider invocation run in deterministic mode, with stdout/stderr/log evidence captured under `artifacts/cli/<subtask-id>/...`

**Subagent encouragement for verification ACs:**

When an AC requires Agent Browser verification or running multiple E2E test files, phrase the AC so the implementing agent is steered toward **spawning subagents** for verification — keeping the main iteration context lean for production code. Suggested AC phrasings:
- "Spawn a subagent to drive Agent Browser verification for AC <N>, capturing artifacts under `artifacts/browser/<subtask-id>/...`"
- "Run multiple E2E test files in parallel via subagents (single message, multiple Task calls) when more than one file covers this slice"
- "Delegate provider/CLI smoke runs to a subagent so stdout/stderr stay isolated from the iteration context"

The anti-pattern is sequential one-at-a-time subagent spawning, which defeats the purpose (mirrors guidance in @context/workflows/ralph/planning/tasks-milestone.md).

**taskRef handling (specific to this workflow):**
- If input references a specific TASK, use that
- If generating from review findings or text, use a placeholder like `review-findings`

**Cross-Story Subtask Contract (multi-story bundles):**

The current queue schema supports only a single `storyRef`. When a subtask covers behavior from multiple stories in a milestone bundle, use this explicit contract:

- `storyRef`: the **primary story** — usually the one whose user-visible outcome names the behavior
- `taskRef`: the real parent task if one exists; otherwise a stable synthetic reference like `<milestone-slug>-tracer-bullets`
- `description`: the **first line MUST be exactly**:
  `Stories covered: <story-id-1>, <story-id-2>, ...`
- `acceptanceCriteria`: MUST include at least one `[Behavioral]` AC proving the end-to-end behavior across covered stories AND one `[Evidence]` AC naming the exact command/artifact expected

Do **not** invent ad-hoc JSON fields (e.g. `storiesCovered`) — they will be silently dropped by the schema. The `Stories covered:` description line is the durable signal that survives schema validation and remains visible in CLI listings.

### Phase 4: Validate Subtasks

Run the Validation Checklist and AC Quality Gate in @context/workflows/ralph/planning/subtask-spec.md before writing output.

During validation, additionally confirm:
- Each AC states the verification tool/profile explicitly where relevant
- Cross-layer behavioral subtasks include an outer-boundary `[Behavioral]` AC and a paired `[Evidence]` AC naming the real boundary
- Cross-story subtasks (multi-story input) begin description with `Stories covered: ...` and pick a primary `storyRef`
- UI/visual subtasks include a `[Manual]` AC for Agent Browser verification with artifact paths under `artifacts/browser/<subtask-id>/...`
- CLI/provider subtasks include a `[Manual]` AC for real-boundary smoke runs with artifact paths under `artifacts/cli/<subtask-id>/...`
- Verification-heavy ACs include subagent-delegation phrasing (Agent Browser runs and multi-file E2E)

### Phase 5: Append Subtasks

After validation, write final subtasks to the destination directly:

**Output location:**
- If `--output-dir` is provided: `<output-dir>/subtasks.json`
- Otherwise: `docs/planning/subtasks.json`

Canonical output shape is required: `{ "subtasks": [ ... ] }` (optionally `"$schema"` and `"metadata"`), validated by `@docs/planning/schemas/subtasks.schema.json`.

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

# From multi-story milestone bundle (produced by `aaa story concat`)
aaa story concat --milestone 004-MULTI-CLI --output /tmp/m004-stories.md
aaa ralph plan subtasks --file /tmp/m004-stories.md --output-dir docs/planning/milestones/004-MULTI-CLI
```
