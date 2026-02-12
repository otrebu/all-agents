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

When task includes testing work, resolve docs by testing profile (web visual, web E2E, CLI E2E, unit/integration) instead of assuming a single CLI-centric baseline.

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
| CLI command, terminal workflow, stdout/stderr behavior | `@context/stacks/cli/cli-*.md` |
| API, endpoint, procedure, service | `@context/stacks/api/api-pnpm-*.md` |
| Schema, migration, model | `@context/stacks/api/api-pnpm-*.md` |
| Monorepo packages/* | `@context/stacks/monorepo/monorepo-pnpm-*.md` |

Pick stack matching project setup (check for vite vs tanstack-start, etc.)

## Foundation Coverage

When task involves these patterns, include matching foundations:

| Pattern in Task | Foundation |
|-----------------|------------|
| Form, dialog with inputs, validation | `@context/foundations/construct/validate-forms-react.md` |
| Error state, error boundary, catch | `@context/foundations/construct/error-handling-react.md` |
| Design tokens, theme, colors | `@context/foundations/construct/patterns-design-tokens-tailwind.md` |
| Loading state, skeleton, suspense | `@context/foundations/construct/code-splitting.md` |
| Test plan mentions component tests | `@context/foundations/test/test-component-vitest-rtl.md` |
| Test plan mentions integration tests | `@context/foundations/test/test-integration-api.md` |
| Web user-visible AC needs visual verification | `@context/blocks/test/agent-browser.md` |
| Web behavioral flow needs automated E2E | `@context/blocks/test/playwright.md` |
| Web visual verification evidence workflow | `@context/foundations/test/test-visual-web-agent-browser.md` |
| Web E2E strategy/details | `@context/foundations/test/test-e2e-web-playwright.md` |
| CLI E2E in Bun projects | `@context/foundations/test/test-e2e-cli-bun.md` |
| CLI E2E in Node projects | `@context/foundations/test/test-e2e-cli-node.md` |

For web/UI tasks, include all three web test docs together when relevant:
- `@context/blocks/test/agent-browser.md`
- `@context/blocks/test/playwright.md`
- `@context/foundations/test/test-visual-web-agent-browser.md`
- `@context/foundations/test/test-e2e-web-playwright.md`

For CLI tasks, include runtime-appropriate E2E foundation:
- `@context/foundations/test/test-e2e-cli-bun.md` for Bun runtime
- `@context/foundations/test/test-e2e-cli-node.md` for Node runtime

## Search Strategy

1. Extract key tech from task (libraries, frameworks, patterns)
2. **Apply stack heuristics** - determine artifact type, add stack
3. **Apply foundation coverage** - match patterns, add foundations
4. **Apply testing profile coverage** - include required web/CLI test docs when task AC/Test Plan implies them
5. **Read `context/README.md`** - scan for matching tool names
6. **Glob `context/blocks/**/*keyword*.md`** - find specific tool docs
7. Verify files exist and are relevant
8. Add to task's Related Documentation section
9. Note gaps for missing coverage

## Example

Task mentions "prisma migration" → search yields:
- `context/blocks/construct/prisma.md` ✅ tool doc
- `context/foundations/construct/data-persist-prisma.md` ✅ patterns

Add both to Related Documentation before writing task.
