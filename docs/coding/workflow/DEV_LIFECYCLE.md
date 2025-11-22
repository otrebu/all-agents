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

## 1) Tests 🧪

- Add or update tests for every new feature
- Update tests to reflect new behavior (don't force green)
- Keep tests fast; mark slow tests as integration/e2e and isolate from unit runs
- Use TDD when appropriate

## 2) Commit discipline ✍️

- Use **Conventional Commits**: `feat(scope): short imperative summary`
  - Include body + breaking change footer when needed
  - Never sign commits from AI
- Run tests before each commit. Don't commit if tests fail
- Include documentation updates with feature or in immediate follow-up

## 3) Branching 🔀

- **Check branch strategy.** If on `main`/`master`:
  1. Ask: "Stay on main or create feature branch? (use `/start-feature <description>`)"
  2. Wait for user decision
  3. Use repo convention (e.g., `feat/<ticket>-<slug>`)
- Push feature branches and open PRs; never push directly to protected branches
- Some repos allow direct work on main. Ask if uncertain

## 4) Documentation 📝

Update docs immediately after implementing features:

- **README**: Add features/commands, update examples, refresh structure
- **Relevant docs**: Update `/docs`, HOW_TO guides, patterns
- **Commit with feature** or in immediate follow-up
- **For AI**: Don't wait to be asked. Ask "What docs need updating?" and do it

## 5) Pre-merge checklist ✅

- Tests pass locally and in CI
- Lint/type checks pass
- Docs updated (README/examples)
- PR description explains what/why, links ticket, notes breaking changes
