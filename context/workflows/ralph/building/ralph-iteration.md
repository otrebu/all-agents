# Ralph Build Iteration

You implement one subtask per iteration via TDD. By the end you ship:

- **one git commit** — implementation + a PROGRESS.md entry, with `Subtask: <SUB-ID>` in the message
- **an AC verification report** — every acceptance criterion ticked off with evidence it actually passes

Don't skip the report. It's what catches the case where tests pass but the live app is broken.

---

## How to do one iteration

In order:

1. **Orient.** Read @CLAUDE.md, run `git status`, read @docs/planning/PROGRESS.md, check the queue with `aaa ralph subtasks list --milestone <name>` and `aaa ralph subtasks next --milestone <name>`. Confirm the assigned subtask is still pending.

2. **Stay in scope.** Ralph assigned you one subtask. Implement that one, then stop. Don't pick up the next one in the same iteration. If the assigned subtask is already `done: true`, stop and report (stale queue).

3. **Investigate.** Read the subtask's `filesToRead` and `taskRef`. Understand the ACs. Figure out what data you'll need on each of the two surfaces (see "Two data surfaces" below).

4. **Bind your RED goal.** Run `/goal` (verbatim template in "Binding RED with /goal" below) and **paste the evaluator's first acknowledgement line into your notes** — that line goes in the verification report. If `/goal` doesn't acknowledge, retry once; if still nothing, take the structural-fallback path and stop after RED for operator review. Do not silently proceed with a test-only RED.

5. **Write a failing test.** Outside-in for vertical slices (CLI E2E, API integration, web flow, provider). Unit-first for pure logic. Characterization test for refactors. Failing regression test for bug fixes. The test must fail because **implementation is missing** — not because **data is missing**. If you find yourself mocking the real surface to make the failure "right", stop and seed the surface instead.

6. **For `[Visual]`/`[Manual]` ACs, seed the real dev DB now.** Not later, not in a side commit. The live URL has to render seeded data before you can claim GREEN — a passing unit test on mocked data does not satisfy a `[Visual]`/`[Manual]` AC. See "Two data surfaces".

7. **Make it pass.** Minimum production code. Same test command as step 5. For cross-layer slices, the outer test going green is the canonical GREEN signal — unit tests passing without the outer test isn't GREEN. Seed data and fixtures the test depends on are part of GREEN, not a sidequest.

8. **Refactor (optional).** Only with real cleanup pressure: duplication, unclear naming, shallow boundary. Tests stay green throughout. Skip if there's no pressure — speculative refactoring is over-engineering.

9. **Verify each AC.** Re-run your subtask-scoped tests. Then fill the verification report (template below). For `[Visual]`/`[Manual]` ACs, spawn a subagent to drive Agent Browser; spawn in parallel if you have more than one. If any AC fails, fix it before committing. Verification commands must be idempotent.

10. **Sync docs if needed.** New CLI command/flag → README. New reusable pattern → context/. Bug fix / refactor / config-only → usually nothing. If you updated docs, add a row for it in the verification report.

11. **Commit once.** Append to PROGRESS.md, stage everything, format staged files, re-stage, commit with `Subtask: <SUB-ID>` in the message. See "Commit recipe" below. Don't make a second tracking-only commit — amend if needed.

12. **Stop.** Ralph decides whether to start the next iteration.

---

## The AC verification report

Fill this in at step 9, before committing. A blank required cell is a fail.

```markdown
## AC Verification: <SUB-ID>

**How RED was bound:**
<paste the /goal evaluator acknowledgement line verbatim,
OR `fallback: <reason>` with `claude --version` output and
`jq '.disableAllHooks' .claude/settings.json` output>

| # | AC | Tier | Tool | Idempotent check | Result | Evidence | Seed (test / live) |
|---|----|------|------|------------------|--------|----------|---------------------|
| 1 | <verbatim AC text> | static\|content\|behavioral | shell\|vitest\|agent-browser | <cmd> | PASS\|FAIL | <path> | tr: <fixture> / lr: <seed cmd or —> |

**Summary:** <N>/<N> PASS → proceed to commit
```

**Per-AC rules:**

- `[Behavioral]` rows: `Idempotent check`, `Evidence`, and `Seed.tr` required. Add `Seed.lr` if the test hits the real datastore.
- `[Visual]` / `[Manual]` rows: `Evidence` is an artifact path under `artifacts/browser/<SUB-ID>/...` or `artifacts/cli/<SUB-ID>/...`. **`Seed.lr` is required** — the real dev surface must hold renderable data. `Seed.lr: —` on a `[Visual]`/`[Manual]` row is an automatic fail.
- `[Evidence]` rows: `Evidence` must be a concrete proof payload.
- `[Regression]` rows: `Idempotent check` + `Evidence` showing the original failure mode now passes.

---

## Two data surfaces

A subtask usually needs data on two distinct surfaces. Naming both prevents the slip where a test passes on mocked data while the live app renders empty.

| Surface | Reads from | Used by | Lives in |
|---|---|---|---|
| **test-runtime** | in-process mocks, fixtures, MSW handlers, in-memory state | automated tests | `tests/fixtures/`, factory helpers, `vi.mock()`, MSW |
| **live-runtime** | the real datastore / session / filesystem the running app talks to | `[Visual]`/`[Manual]` ACs; agent-browser or humans hitting the dev URL | `prisma/seed.ts`, `seeds/`, dev-only seed scripts, dev DB rows |

**AC prefix → required surfaces:**

| AC prefix | test-runtime | live-runtime |
|---|---|---|
| `[Behavioral]` unit | required | not required |
| `[Behavioral]` integration | required | required if it hits the real datastore |
| `[Behavioral]` E2E against real app | not required | **required** |
| `[Visual]` / `[Manual]` | not required | **required** |
| `[Regression]` | matches the original test's surface | matches the original |
| `[Evidence]` | whichever surface the named command targets | same |

**Rule:** if the subtask has any `[Visual]`/`[Manual]` AC, **both surfaces are seeded by GREEN**. Mocking the fetch boundary satisfies test-runtime only. The agent-browser opens the *live* app — it needs live-runtime data in the real datastore (`pnpm --filter @x exec prisma db seed`, or the project's equivalent).

**Anti-pattern:** marking a `[Visual]`/`[Manual]` AC PASS because the unit test passed. The mocked data never reached the live datastore. Re-check by opening the actual URL before declaring PASS.

---

## Binding RED with /goal

`/goal` is a built-in command (Claude ≥ 2.1.139) that sets a session completion condition an evaluator re-checks after every turn until it holds. Run it verbatim, substituting `<SUB-ID>`:

```
/goal RED state for <SUB-ID>: every [Behavioral] / [Regression] AC has a failing automated test in the transcript; every [Visual] / [Manual] AC has an Agent Browser scaffold at artifacts/browser/<SUB-ID>/... and live-runtime seed data at the real target surface; every [Evidence] AC has its assertion target named. Failure must be for the right reason — missing implementation, not missing data or a test bug. Constraint: no production code may be modified until this holds.
```

Then paste the evaluator's first acknowledgement line into your iteration notes. That line populates the verification report's "How RED was bound" field.

**Structural-fallback path** — only when `claude --version` < 2.1.139 OR `jq '.disableAllHooks' .claude/settings.json` returns `true`: write the same condition verbatim as your in-context objective at the top of the iteration, author RED tests, then **stop after RED for operator review**. Put `fallback: <reason>` plus the version/settings output in the report header as evidence.

---

## Subagent spawning

Spawn a subagent for Agent Browser flows, long-running CLI/provider smokes, RED test design on unfamiliar outer surfaces, and deep codebase investigation across many files. Don't spawn for single-file reads, mechanical commands, or anything under a few minutes — startup tax dominates trivial work.

Shape:

```
Task tool:
  subagent_type: "general-purpose"
  model: <strongest available model in your environment>
  description: "<verb + concrete artifact>"
  prompt: "<self-contained brief>"
```

**Always spawn with the highest-intelligence, highest-effort model available.** The sub-problem is being delegated because it deserves deep reasoning — if it doesn't deserve max effort, it doesn't deserve a subagent.

**Parallel spawning is mandatory when spawning more than one** — single message, multiple Task calls. Sequential (one, wait, one, wait) defeats the purpose.

**Brief quality matters more than count.** Always include: inputs (file paths, AC text, URLs); output shape (file diff, findings JSON, PASS/FAIL + artifact paths); success criterion; anti-scope (e.g. "do NOT modify production code"). One-line prompts produce shallow work regardless of model.

---

## Picking the failing test

| Subtask type | Start with |
|---|---|
| Vertical slice / cross-layer behavior | Outermost useful test — CLI E2E, API integration, Playwright/web-flow E2E, or provider integration |
| Pure logic | Smallest meaningful unit test |
| Refactor | Characterization test at unchanged interface |
| Bug fix | Failing regression test that reproduces the defect |

For the full profile → test mapping (cli_command, web_user_flow, api_endpoint, module, etc.), see @context/workflows/ralph/planning/components/testing-profile-contract.md.

---

## Running tests during validation

Re-run the tests you wrote (now GREEN) plus any extras the AC requires. Scope to your subtask only:

```bash
bun test path/to/your-test.test.ts        # bun
pnpm test path/to/your-test.test.ts       # vitest
pnpm test -- path/to/your-test.test.ts    # jest
```

**Don't run full validation here.** The pre-commit hook handles lint, format, typecheck, and the full test suite — iteration-time runs stay scoped.

---

## Doc sync decision

| Change type | README.md | docs/ | context/ |
|---|---|---|---|
| New CLI command / flag | yes | — | — |
| New workflow | — | yes (project-specific) | yes (if reusable) |
| New pattern / convention | — | — | yes (blocks/ or foundations/) |
| Bug fix / refactor / config-only | — | — | — |

If you updated docs, verify with `grep -q '<feature>' README.md` and add a row to the verification report.

---

## Commit recipe

One commit per iteration, includes implementation + PROGRESS.md update.

**1. Append to PROGRESS.md:**

```markdown
## <YYYY-MM-DD>

### <SUB-ID>
- **Problem:** <what the subtask addressed>
- **Changes:** <summary of implementation>
- **Files:** <list of files created/modified>
```

**2. Stage, format, re-stage, commit:**

```bash
git add <implementation-files> docs/planning/PROGRESS.md

# REQUIRED — pre-commit hook will reject unformatted code
pnpm biome check --write --staged --no-errors-on-unmatched --files-ignore-unknown=true

git add <implementation-files> docs/planning/PROGRESS.md

git commit -m "feat(<SUB-ID>): <brief description>

<longer description if needed>

Subtask: <SUB-ID>"
```

The `cc-session-id` trailer is auto-added by the `prepare-commit-msg` hook. The `Subtask:` trailer is **required** for build-loop traceability.

**Don't create a second tracking-only commit.** The build loop records one commit hash per completed subtask. If you already committed without PROGRESS.md, amend:

```bash
git add docs/planning/PROGRESS.md
git commit --amend --no-edit
```

---

## Troubleshooting

**Test / lint / typecheck failures:** fix the issue and retry. Pre-commit handles full validation; iteration-time runs stay scoped.

**"Sibling tool call errored" (parallel tool failures):** identify the failing command, re-run failed commands sequentially instead of in parallel.

**jq type errors** (e.g. `Cannot index string with string "done"`): verify structure first.

```bash
jq 'type' subtasks.json           # Should be "object"
jq 'keys' subtasks.json           # Should show ["subtasks"]
```

Correct query for `subtasks.json` (root is an object with a `subtasks` array):

```bash
jq '.subtasks[] | select(.done == false)' subtasks.json
```

You shouldn't update `subtasks.json` manually — the build loop auto-marks done. Prefer `aaa ralph subtasks list / next / complete` over raw jq.

**`/goal` evaluator didn't acknowledge:** retry once. If still nothing, run `claude --version` and `jq '.disableAllHooks' .claude/settings.json`. If either fails the precondition, use the structural-fallback path above.

**Pre-commit hook rejects formatting:** run the biome command from the commit recipe, re-stage, re-commit. If still failing, the file extension may not be covered by Biome — check the project's lint config.

**Unclear requirements:** pick the interpretation that fits the AC, note the choice in the PROGRESS.md entry.

**Blocked by missing dependency:** report the block. Don't skip to a different subtask — that violates step 2 (stay in scope).
