---
description: Check if implementation drifted from documentation specs
---

# Doc-Implementation Drift Checker

## Context

Verify codebase adheres to specs in CLAUDE.md-referenced docs. Uses parallel subagents for deep analysis.

## Arguments

- `$ARGUMENTS` - Output file path (default: `docs/drift-report.md`)

## Workflow

1. **Init** - Create temp directory: `/tmp/drift-check-{timestamp}/`
2. **Discover** - Find all `CLAUDE.md` files in repo (exclude node_modules)
3. **Parse** - Extract `@context/...` and `@...` references from each
4. **Spawn subagents** (parallel) - For each referenced doc:
   - Assign unique temp file: `/tmp/drift-check-{timestamp}/{doc-hash}.md`
   - Pass: doc path + source CLAUDE.md path + temp file path
   - Task: compare codebase against doc specs
   - Each writes findings to its OWN temp file (no conflicts)
5. **Merge** - After ALL subagents complete:
   - Read all temp files from `/tmp/drift-check-{timestamp}/`
   - Concatenate into final output file
   - Add summary table at end
6. **Cleanup** - Remove temp directory

## Subagent Prompt Template

```
You are auditing implementation drift.

**Source**: {CLAUDE.md path}
**Spec Doc**: {doc path}
**Temp File**: {temp_file}

## Task

1. Read the spec doc
2. Identify what it specifies (patterns, structure, conventions)
3. Search codebase for relevant files
4. Compare actual vs documented
5. Report drift per @context/workflows/consistency-checker.md format

Focus: Critical/Moderate issues only. Skip Minor.

## IMPORTANT: Write to YOUR Temp File

Write findings to `{temp_file}` (WRITE, not append - you own this file):

## 📄 {doc path}

**Source**: {CLAUDE.md path}
**Checked**: {timestamp}

### Critical Issues
{critical issues table or "None"}

### Moderate Issues
{moderate issues table or "None"}

### Compliant Items
{list of what matches spec}

---
```

## Merge Step (orchestrator does this)

After all agents complete:

```bash
# Pseudocode
cat /tmp/drift-check-{timestamp}/*.md > {output_file}
```

Then append summary:

```markdown
# Summary

| Doc | Critical | Moderate | Status |
|-----|----------|----------|--------|
{for each temp file, extract counts}

Generated: {date}
```

## Constraints

- 🚀 Parallel subagents (one per doc)
- 📁 Each agent writes to UNIQUE temp file (no race conditions)
- 🔍 Deep validation (search actual files, don't assume)
- ⏭️ Skip docs that are meta/how-to (check implementation docs only)
- 📊 Use consistency-checker.md severity/confidence definitions
- 🎯 Focus on: naming, structure, patterns, config mismatches
- 🔄 Orchestrator merges after ALL agents complete
