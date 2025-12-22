---
description: Check consistency between docs, code, and references. Pass files, folders, or URLs. Use subagents for multi-file analysis.
allowed-tools: Read, Glob, Grep, Task, WebFetch
argument-hint: <files|folders|urls...>
---

# Consistency Check

Check for inconsistencies per @context/workflows/consistency-checker.md

## Input: $ARGUMENTS

## Workflow

1. **Identify scope**

   - Files → Read directly
   - Folders → Glob `**/*` then analyze
   - URLs → WebFetch content

2. **Multi-file strategy**

   - 1-2 files → analyze inline
   - 3+ files → spawn `Task(Explore)` subagents per file/section
   - Compare findings across all sources

3. **Analysis focus**

   - Text inconsistencies (contradictions, definition drift)
   - Code vs prose (function names, params, config)
   - Code-to-code (style, imports, types)

4. **Output** → Issue table per @context/workflows/consistency-checker.md#Output-Format

## Constraints

- Mark confidence levels
- Suggest fixes when clear
