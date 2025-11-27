# Development Workflow

## Definition of Done ✓

A feature/change is complete when ALL of these are true:

1. ✅ Tests added/updated and passing
2. ✅ README and relevant docs updated
3. ✅ Committed with conventional commit message
4. ✅ On feature branch (when appropriate)

---

## 0) Get context

- Read `README` and package/project config first
- Ask concise questions if missing info (test command, branch naming, CI)

## 1) Planning 📋

**Before starting:**

- Use plan mode → write to `docs/planning/stories/*` or `docs/planning/tasks/*`
- Include: implementation steps, reasoning, broken-down tasks
- Research external knowledge if needed (Task tool)
- Think MVP - don't over-plan
- **Ask for review before proceeding**

**While implementing:**

- Update plan as you work
- Append detailed change descriptions (for handover)

See: `@context/meta/story-template.md`

## 2) Tests 🧪

- Add or update tests for every new feature
- Update tests to reflect new behavior (don't force green)
- Keep tests fast; mark slow tests as integration/e2e and isolate from unit runs
- Use TDD when appropriate

## 3) Commit discipline ✍️

**ATOMIC COMMITS:** One logical change that can be reverted independently

- Commit frequently (after each logical unit)
- Group by scope (auth, payment), NOT type (deps, code, tests)
- ❗ AI SHALL NEVER sign commits
- Run tests before commit

**Read & follow:** `@context/coding/workflow/COMMIT.md`

## 4) Branching 🔀

**Start new feature:**
Read & follow: `@context/coding/workflow/START_FEATURE.md`

**Complete feature:**
Read & follow: `@context/coding/workflow/COMPLETE_FEATURE.md`

## 5) Documentation 📝

Update docs immediately after implementing features:

- **README**: Add features/commands, update examples, refresh structure
- **Relevant docs**: Update `/docs`, HOW_TO guides, patterns
- **Commit with feature** or in immediate follow-up
- **For AI**: Don't wait to be asked. Ask "What docs need updating?" and do it

## 6) Pre-merge checklist ✅

- Tests pass locally and in CI
- Lint/type checks pass
- Docs updated (README/examples)
- PR description explains what/why, links ticket, notes breaking changes
