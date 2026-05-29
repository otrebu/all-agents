# Ralph Build Iteration

Basic rules to follow:

- **Stay in scope.** Ralph assigned you one subtask. Implement that one, then stop. Don't pick up the next one in the same iteration. If the assigned subtask is already `done: true`, stop and report (stale queue).
- **Use subagents with highest intelligence** as you are the orchestrator and mindful of your context window. 
- **Default to spawning** for steps 3, 4, 5 (Visual/Manual), and 6. Doing them in-context is the exception, not the norm.

Follow the instructions steps:

1. **Orient:** work out what the project is, the house rules to follow, if there is work in progress to be aware of. Do that by reading the @CLAUDE.md, run git status, git log, read @docs/planning/PROGRESS.md and confirm the assigned subtask is still pending.

2. **Understand**: the subtask, that should be a vertical slice, a tracer buller. Read it and follow the `filesToRead` and `taskRef`. Understand the ACs and have them clear. 

3. **Spawn a subagent** to write the failing test. Brief it with: outside-in for vertical slices (E2E Playwright test, API integration test) and unit-first for pure logic; failing regression test for bug fixes; cover Happy Paths and Unhappy paths. The test must fail because **implementation is missing** — not because **data is missing**. Leverage mock and seed data, avoid duplication and centralise it — always prefer seed data over mock when it makes sense. Add seed data, reset db and seed as much as you need.

4. **Spawn a subagent** to make the test pass. Brief it with: minimum production code, follow the codebase best practises.

5. **Verify each AC.** Fill the verification report (template below). For `[Visual]`/`[Manual]` ACs, spawn a subagent to drive Agent Browser; spawn in parallel if you have more than one. If any AC fails, fix it before committing. Verification commands must be idempotent. **For `[Visual]`/`[Manual]` ACs, seed the real dev DB now.** Not later, not in a side commit. The live URL has to render seeded data before you can claim GREEN — a passing unit test on mocked data does not satisfy a `[Visual]`/`[Manual]` AC.

6. **Sync docs if needed.** Use subagents to find relevant docs and update them based on the changes made. 

7. **Commit ONLY once.** Append to PROGRESS.md, stage everything you have done, format staged files, re-stage, commit with `feat: implement <SUB-ID>` in the message. 

8. **Stop.** Ralph decides whether to start the next iteration.

---

## Picking the failing test

| Subtask type | Start with |
|---|---|
| Vertical slice / cross-layer behavior | Outermost useful test — CLI E2E, API integration, Playwright/web-flow E2E, or provider integration |
| Pure logic | Smallest meaningful unit test |
| Refactor | Characterization test at unchanged interface |
| Bug fix | Failing regression test that reproduces the defect |

---

## The AC verification report

Fill at step 5. A blank required cell is a fail.

```markdown
## AC Verification: <SUB-ID>

**AC tier → required surfaces & evidence:**

| AC tier | test-runtime | live-runtime | Evidence in report |
|---|---|---|---|
| `[Behavioral]` unit | required | — | test path + assertion |
| `[Behavioral]` integration / E2E | required | required if it hits the real datastore | test path + assertion |
| `[Visual]` / `[Manual]` | — | **required** (auto-fail if missing) | artifact path under a stable per-subtask path |
| `[Regression]` | matches original test | matches original | test path proving the original failure mode now passes |
| `[Evidence]` | whichever the named command targets | same | concrete proof payload |

Opening the actual URL is the only honest check for `[Visual]`/`[Manual]` — a passing unit on mocked data does not satisfy them.

Template:
| # | AC | Tier | Tool | Result | Evidence | Seed (test / live) |
|---|----|------|------|--------|----------|---------------------|
| 1 | <verbatim AC> | behavioral\|visual\|manual\|evidence\|regression | vitest\|agent-browser\|shell | PASS\|FAIL | <path> | tr: <fixture> / lr: <seed cmd or —> |

**Summary:** <N>/<N> PASS → proceed to commit
```

---

## Subagent spawning

Use the highest-intelligence, highest-effort model. Spawn for Agent Browser flows, long-running smokes, RED design on unfamiliar surfaces, and deep multi-file investigation. Don't spawn for single-file reads or mechanical commands.

**Parallel spawning is mandatory when spawning more than one** — single message, multiple Task calls.

**Brief quality matters more than count.** Always include: inputs (file paths, AC text, URLs); output shape (diff, findings JSON, PASS/FAIL + artifact paths); success criterion; anti-scope (e.g. "do NOT modify production code"). One-line prompts produce shallow work regardless of model.

---

## Commit recipe

1. Commit the work to git, use conventional commits starting with feat: implement <SUB-ID>. If check fails relentlessy fix all issue, never cheat, never use eslint disable and also fix pre-existing issues.

**2. Append to PROGRESS.md:**

```markdown
## <YYYY-MM-DD>

### <SUB-ID>
- **Problem:** <what the subtask addressed>
- **Changes:** <summary>
- **Files:** <list>
```


**Don't create a second tracking-only commit.** If you already committed without PROGRESS.md, `git add` it and `git commit --amend --no-edit`.
