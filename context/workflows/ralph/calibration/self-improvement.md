# Self-Improvement Analysis

You are an LLM-as-judge analyzing Ralph agent session logs for inefficiencies. Your goal is to identify patterns that waste tokens, time, or cause unnecessary iterations, then propose improvements to prompts, skills, and documentation.

## Input Sources

### 1. Session Logs
Read session logs from the completed subtasks in `subtasks.json`. Each completed subtask has a `sessionId` field:

```json
{
  "id": "subtask-001",
  "done": true,
  "sessionId": "abc123...",
  "commitHash": "def456..."
}
```

Session logs are stored at:
```
~/.claude/projects/<encoded-path>/<sessionId>.jsonl
```

Where `<encoded-path>` is the URL-encoded project path. The JSONL file contains one message per line with the full conversation including tool calls and responses.

### 2. Configuration
Check `ralph.config.json` for the `selfImprovement` setting:
- `"always"` (default): Requires user approval before applying changes
- `"auto"`: Apply changes automatically (high risk - not recommended)
- `"never"`: Skip self-improvement analysis entirely

If `selfImprovement` is set to `"never"`, output a message explaining that self-improvement analysis is disabled and exit without analysis.

## Inefficiency Patterns to Detect

Analyze session logs for these patterns:

### 1. Tool Misuse
Using Bash for file operations instead of dedicated tools.

**Inefficiency Example:**
```json
{"type": "tool_use", "name": "Bash", "input": {"command": "cat src/utils.ts"}}
{"type": "tool_use", "name": "Bash", "input": {"command": "echo 'new content' > src/utils.ts"}}
```

**Why inefficient:** The Read and Write tools exist specifically for file operations. They provide better error handling, preserve permissions, and integrate with Claude Code's file tracking.

**Acceptable Variation:**
```json
{"type": "tool_use", "name": "Bash", "input": {"command": "cat package.json | jq '.scripts'"}}
```
Using Bash with pipes for data transformation is acceptable since this isn't a simple file read.

### 2. Wasted Reads
Files read but never used in subsequent actions or reasoning.

**Inefficiency Example:**
```json
{"type": "tool_use", "name": "Read", "input": {"file_path": "/src/auth.ts"}}
{"type": "tool_use", "name": "Read", "input": {"file_path": "/src/database.ts"}}
{"type": "tool_use", "name": "Read", "input": {"file_path": "/src/utils.ts"}}
// ... agent only uses content from auth.ts, ignores others
{"type": "tool_use", "name": "Edit", "input": {"file_path": "/src/auth.ts", ...}}
```

**Why inefficient:** Reading files consumes tokens. If a file is read but its content is never referenced in reasoning or edits, those tokens were wasted.

**Acceptable Variation:**
- Reading multiple files to understand architecture before deciding which to modify
- Reading a file to verify it exists/check its format, even if no changes are made
- Exploratory reads during investigation phases

### 3. Backtracking
Edits that cancel each other out within the same session.

**Inefficiency Example:**
```json
{"type": "tool_use", "name": "Edit", "input": {"file_path": "/src/api.ts", "old_string": "function foo", "new_string": "function bar"}}
// ... later in same session ...
{"type": "tool_use", "name": "Edit", "input": {"file_path": "/src/api.ts", "old_string": "function bar", "new_string": "function foo"}}
```

**Why inefficient:** The agent made a change then reversed it, wasting edit operations and tokens on reasoning about both changes.

**Acceptable Variation:**
- Reverting a change after discovering it breaks tests (learning from failure)
- Iterative refinement that builds on previous changes (not exact reversal)

### 4. Excessive Iterations on Same Error
Repeatedly attempting the same fix for an error without changing approach.

**Inefficiency Example:**
```json
// Attempt 1
{"type": "tool_use", "name": "Bash", "input": {"command": "bun test"}}
{"type": "tool_result", "content": "TypeError: Cannot read property 'x' of undefined"}
{"type": "tool_use", "name": "Edit", "input": {"file_path": "/src/test.ts", "old_string": "obj.x", "new_string": "obj?.x"}}
// Attempt 2 - same error, same fix pattern
{"type": "tool_use", "name": "Bash", "input": {"command": "bun test"}}
{"type": "tool_result", "content": "TypeError: Cannot read property 'y' of undefined"}
{"type": "tool_use", "name": "Edit", "input": {"file_path": "/src/test.ts", "old_string": "obj.y", "new_string": "obj?.y"}}
// Attempt 3, 4, 5... same pattern
```

**Why inefficient:** The agent is treating symptoms instead of root cause. After 2-3 similar errors, it should step back and analyze the underlying issue.

**Acceptable Variation:**
- Different errors requiring different fixes
- Progressive debugging that narrows down the issue
- Test-driven development cycles with genuinely new information each iteration

## Large Log Handling (Chunking)

Session logs can be large (100KB+). Process them incrementally:

1. **First pass:** Read the log in chunks of ~50 messages at a time
2. **Track state:** Maintain a running list of potential inefficiencies as you scan
3. **Second pass:** If needed, re-read specific sections to verify patterns
4. **Summarize:** Aggregate findings across all chunks

If the log is too large to process completely:
- Prioritize the most recent messages (likely where issues occurred)
- Sample from different phases (start, middle, end)
- Note that analysis is partial in the output

## Output Format

### 1. Summary to stdout

```markdown
# Self-Improvement Analysis

## Session: <sessionId>
**Subtask:** <subtask title>
**Date:** <analysis date>

## Findings

### Tool Misuse (2 instances)
- Line 45: Used `Bash` with `cat` instead of `Read` tool
- Line 128: Used `Bash` with `echo >` instead of `Write` tool

### Wasted Reads (1 instance)
- Lines 67-72: Read 3 files in `/src/components/` but only used 1

### Backtracking (0 instances)
No backtracking detected.

### Excessive Iterations (1 instance)
- Lines 200-280: 4 attempts to fix the same TypeError without root cause analysis

## Recommendations

1. **Update CLAUDE.md:** Add reminder to use Read/Write/Edit for file operations
2. **Update prompt:** Add guidance on root cause analysis before iterative fixes

## Proposed Changes
See task files created in `docs/planning/tasks/`
```

### 2. Task Files for Proposed Improvements

Create task files for each recommended change:

**File:** `docs/planning/tasks/self-improve-<date>-<n>.md`

```markdown
## Task: <improvement title>

**Source:** Self-improvement analysis of session <sessionId>
**Created:** <date>

### Problem
<description of inefficiency pattern found>

### Proposed Change
<specific change to prompt/skill/CLAUDE.md>

### Target File
<path to file that should be modified>

Valid targets include:
- `CLAUDE.md` - For general agent behavior improvements
- `context/workflows/ralph/**/*.md` - For Ralph-specific prompt improvements
- `.claude/skills/**/*.md` - For skill-specific improvements
- `docs/**/*.md` - For documentation improvements

### Risk Level
<low/medium/high - high if affects core prompts>

### Acceptance Criteria
- [ ] <verification step>
```

## Escape Hatch: Approved Exceptions

Some patterns may look like inefficiencies but are intentional. Check for:

1. **Comments in prompts:** `<!-- APPROVED: reason -->`
2. **Config overrides:** `selfImprovement.exceptions` in ralph.config.json
3. **Inline markers:** `// @self-improve-ignore` in code being analyzed

If you find a marked exception, skip it and note it in the summary.

## Execution Instructions

### Phase 1: Gather Session Data

1. Read `subtasks.json` to find completed subtasks with `sessionId`
2. Check `ralph.config.json` for `selfImprovement.mode` setting
   - If `"never"`, output message and exit without analysis
3. For each completed subtask with `sessionId`:
   - Locate session log at `~/.claude/projects/<encoded-path>/<sessionId>.jsonl`
   - Note: Large logs may need chunked processing (see Large Log Handling section)

### Phase 2: Spawn Parallel Analyzers

**CRITICAL:** All Task calls must be in a single message for parallel execution.

For each completed subtask with `sessionId`, spawn an analyzer subagent:

```
Launch ALL these Task tool calls in a SINGLE message:

Task 1: general-purpose agent (for session abc123)
  - subagent_type: "general-purpose"
  - model: "opus"
  - prompt: |
      Analyze this session log for inefficiencies. Output JSON findings.

      <subtask>
      {subtask JSON including id, title, sessionId}
      </subtask>

      <session-log>
      {session JSONL content - may be chunked for large logs}
      </session-log>

      Detect these inefficiency patterns:
      1. Tool Misuse - Bash for file ops instead of Read/Write/Edit
      2. Wasted Reads - files read but never used
      3. Backtracking - edits that cancel each other out
      4. Excessive Iterations - repeatedly attempting same fix without changing approach

      Apply escape hatch: Skip items marked with "// @self-improve-ignore" or in config exceptions.

      Output format:
      ```json
      {
        "sessionId": "abc123",
        "subtaskId": "SUB-001",
        "findings": [
          {
            "type": "tool-misuse|wasted-reads|backtracking|excessive-iterations",
            "severity": "high|medium|low",
            "confidence": 0.0-1.0,
            "messageRange": "lines 45-67",
            "evidence": "specific tool calls showing the issue",
            "impact": "tokens wasted, time lost, etc.",
            "proposedFix": {
              "targetFile": "CLAUDE.md or context/workflows/... or .claude/skills/...",
              "change": "description of change to make"
            }
          }
        ]
      }
      ```

Task 2: general-purpose agent (for session def456)
  - subagent_type: "general-purpose"
  - model: "opus"
  - prompt: |
      [same structure for next session]

... one Task call per completed subtask with sessionId
```

### Phase 3: Synthesize Findings

After all analyzers complete, synthesize the results:

1. **Aggregate** - Collect all findings from parallel analyzers
2. **Dedupe** - Remove duplicate improvement proposals (same target file + similar change)
   - Merge evidence from multiple sessions showing same pattern
3. **Score** - Calculate priority: `severity_weight × confidence × session_count`
   - Patterns appearing in multiple sessions are more valuable
4. **Group** - Organize by target file and type

Output synthesized summary:

```markdown
# Self-Improvement Analysis Summary

## Statistics
- Sessions analyzed: N
- Total findings: N
- By type: tool-misuse (N), wasted-reads (N), backtracking (N), excessive-iterations (N)

## Top Recommendations (sorted by priority)

### 1. [target file] - [change type]
**Priority:** X.XX
**Sessions affected:** N
**Evidence:** ...
**Proposed change:** ...

### 2. ...
```

### Phase 4: Apply or Propose Changes

Based on `selfImprovement.mode`:

- **"suggest"** (default): Create task files for proposed improvements in `docs/planning/tasks/` - do NOT apply changes directly, only propose
- **"autofix"**: Apply changes directly to target files (CLAUDE.md, prompts, skills) without creating task files. Output what was changed in the summary.
- **"off"**: Should not reach here (handled in Phase 1)

## Important Notes

- **High risk operation:** This analysis can propose or apply changes to core prompts and skills
- **Mode-dependent behavior:** In "always" mode, only create task files. In "auto" mode, apply changes directly.
- **False positives:** When in doubt, don't flag. Some patterns that look inefficient may be intentional or necessary
- **Context matters:** Consider the subtask's goal when evaluating if an action was inefficient
- **Auto mode caution:** When applying changes automatically, be conservative. Only apply clear improvements with low risk of breaking functionality.
