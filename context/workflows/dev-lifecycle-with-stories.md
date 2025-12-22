# Development Workflow

## Definition of Done ✓

A feature/change is complete when ALL of these are done:

- [ ] Tests added/updated and passing
- [ ] README, CLAUDE.md and relevant docs updated
- [ ] Committed with conventional commit message
- [ ] On feature branch (when appropriate)

---

## 0) Get context

- Ask concise questions if missing info (test command, branch naming, CI)

## 1) Full Planning 📋

**Before starting:**

- Use plan mode to plan, plan the story and the tasks
- Write to `docs/planning/stories/*` or `docs/planning/tasks/*` when plan is approved
- Follow @context/blocks/docs/task-template.md and @context/blocks/docs/story-template.md for templates
- Research external knowledge if needed with `parallel-search` or `gh-search`
- Think MVP - don't over-plan
- **Ask for review before proceeding**

**While implementing:**

- Update plan as you work
- Append detailed change descriptions (for handover)

## 2) Implement 💻

- Implement the feature
- Add tests for the feature
- Update tests to reflect new behavior (don't force green)
- Keep tests fast; mark slow tests as integration/e2e and isolate from unit runs
- Use TDD when appropriate

## 3) Commit discipline ✍️

Follow: @context/workflows/commit.md

## 4) Documentation 📝

Update docs immediately after implementing features:

- **README**: Add features/commands, update examples, refresh structure
- **CLAUDE.md**: Update technical details, how to develop on the project
- **Relevant docs**: Update `/context` if it is central global knowledge or `/docs` if it is project specific knowledge
- **Commit with feature** or in immediate follow-up
- **For AI**: Don't wait to be asked. Ask "What docs need updating?" and do it

## 5) Pre-merge checklist ✅

- Tests pass locally and in CI
- Lint/type checks pass
- Docs updated (README/examples)
- PR description explains what/why, links ticket, notes breaking changes
- If Tests are NOT in hooks (judgment call based on change scope), and `run test` for big changes.

## 6) Tools/ CLI Development

If pre-commit hooks are installed they will run automatically for quality checks like:

- `run lint:fix`
- `run format:check`
- `run typecheck`

## 7) Complete feature 🔀

@context/workflows/complete-feature.md
