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

## Stack Heuristics

Always include relevant stack when task matches these patterns:

| Task Pattern | Include Stack |
|--------------|---------------|
| UI, component, route, page, dialog | `@context/stacks/web/web-pnpm-*.md` |
| API, endpoint, procedure, service | `@context/stacks/api/api-pnpm-*.md` |
| Schema, migration, model | `@context/stacks/api/api-pnpm-*.md` |
| Monorepo packages/* | `@context/stacks/monorepo/monorepo-pnpm-*.md` |

Pick stack matching project setup (check for vite vs tanstack-start, etc.)

## Foundation Coverage

When task involves these patterns, include matching foundations:

| Pattern in Task | Foundation |
|-----------------|------------|
| Form, dialog with inputs, validation | `foundations/construct/validate-forms-react.md` |
| Error state, error boundary, catch | `foundations/construct/error-handling-react.md` |
| Design tokens, theme, colors | `foundations/construct/patterns-design-tokens-tailwind.md` |
| Loading state, skeleton, suspense | `foundations/construct/code-splitting.md` |
| Test plan mentions component tests | `foundations/test/test-component-vitest-rtl.md` |
| Test plan mentions integration tests | `foundations/test/test-integration-api.md` |

## Search Strategy

1. Extract key tech from task (libraries, frameworks, patterns)
2. **Apply stack heuristics** - determine artifact type, add stack
3. **Apply foundation coverage** - match patterns, add foundations
4. **Read `context/README.md`** - scan for matching tool names
5. **Glob `context/blocks/**/*keyword*.md`** - find specific tool docs
6. Verify files exist and are relevant
7. Add to task's Related Documentation section
8. Note gaps for missing coverage

## Example

Task mentions "prisma migration" → search yields:
- `context/blocks/construct/prisma.md` ✅ tool doc
- `context/foundations/construct/data-persist-prisma.md` ✅ patterns

Add both to Related Documentation before writing task.
