# Task Documentation Lookup

Pairs tasks with atomic documentation. Used by task generation prompts.

## ⚠️ Trigger

**MANDATORY** - Run this workflow **BEFORE writing each task file**.

Do NOT:
- Write a task without searching for docs first
- Ask user if they want doc lookup (just do it)
- Skip because "it's a simple task"

## Process

### 1. Search Atomic Docs

Use `context/README.md` as index. Search for:
- **Tool names** (prisma, vitest, react) → `context/blocks/`
- **Capabilities** (testing, auth, logging) → `context/foundations/`
- **Artifact types** (cli, api, web) → `context/stacks/`

### 2. Add to Task

Include "Related Documentation" section with `@context/...` refs:

```markdown
### Related Documentation
- @context/blocks/construct/prisma.md
- @context/foundations/construct/data-persist-prisma.md
```

### 3. Handle Missing Docs

**Auto mode:**
- Spawn subagent using `@context/workflows/manage-atomic-doc.md`
- Pass: topic name, what task needs, relevant code patterns
- Flag `[REVIEW]` in output summary
- Link created doc in task with gap marker:

```markdown
### Related Documentation
- @context/blocks/construct/redis.md - **[REVIEW]** (auto-generated)
```

**Interactive mode:**
- Ask: "No docs for [topic]. Want me to create? Give me a prompt to guide it"
- If yes: spawn subagent with manage-atomic-doc.md + user's prompt

## Search Strategy

1. Extract key tech from task (libraries, frameworks, patterns)
2. **Read `context/README.md`** - scan for matching tool/capability names
3. **Glob `context/**/*keyword*.md`** - find doc files by name
4. Verify files exist and are relevant
5. Add to task's Related Documentation section
6. Note gaps for missing coverage

## Example

Task mentions "prisma migration" → search yields:
- `context/blocks/construct/prisma.md` ✅ tool doc
- `context/foundations/construct/data-persist-prisma.md` ✅ patterns

Add both to Related Documentation before writing task.
