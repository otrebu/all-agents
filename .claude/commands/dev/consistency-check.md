---
description: Check consistency between docs, code, and references. Pass files, folders, or URLs. Use subagents for multi-file analysis.
allowed-tools: Read, Glob, Grep, Task, WebFetch
argument-hint: <files|folders|urls...>
---

# Consistency Check

Check for inconsistencies in documentation, code, and planning artifacts.

## Reference Documents

- @context/blocks/quality/text-consistency.md - Contradictions, numerical, temporal, definition drift
- @context/blocks/quality/code-prose-consistency.md - Library, function, param, return, config, API mismatches
- @context/blocks/quality/code-code-consistency.md - Style drift, imports, error handling, types, versions
- @context/blocks/quality/planning-consistency.md - Vision/roadmap/story/task hierarchy consistency

## Input: $ARGUMENTS

## Workflow

1. **Identify scope**

   - Files → Read directly
   - Folders → Glob `**/*` then analyze
   - URLs → WebFetch content
   - Planning artifacts → Check hierarchy consistency

2. **Multi-file strategy**

   - 1-2 files → analyze inline
   - 3+ files → spawn `Task(Explore)` subagents per file/section
   - Compare findings across all sources

3. **Analysis focus by content type**

   | Content Type | Reference Doc | Key Checks |
   |--------------|---------------|------------|
   | Documentation text | text-consistency.md | Contradictions, definitions, timelines |
   | Technical docs with code | code-prose-consistency.md | API names, params, config values |
   | Multiple code examples | code-code-consistency.md | Style, imports, patterns |
   | Planning (vision/roadmap/story) | planning-consistency.md | Hierarchy alignment, scope creep |

4. **Output** → Issue table per @context/workflows/consistency-checker.md#Output-Format

## Constraints

- Mark confidence levels (High/Medium/Low)
- Mark severity (Critical/Moderate/Minor)
- Suggest fixes when determination is clear
