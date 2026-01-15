# Ralph Self-Improving Loop: Vision Document

## 1. What Ralph Is

Ralph is a **fixed-iteration Claude harness** (`tools/src/commands/ralph/scripts/ralph.sh`).

**How it works:**
- Takes a PRD (Product Requirements Doc) with features marked `passes: true/false`
- Loops N iterations, each time Claude:
  1. Finds first `passes: false` feature
  2. Implements it
  3. Verifies using test steps
  4. Updates PRD + commits
- Terminates on `<complete/>` or max iterations

**Key insight:** Ralph is stateless between iterations. Context persists via files (PRD, progress, git). Same prompt repeats; Claude sees its own prior work through file changes.

---

## 2. Atomic Docs: The Source of Truth

Atomic docs (`context/`) are **composable, AI-optimized documentation**.

### Three Layers

| Layer | Purpose | Example |
|-------|---------|---------|
| **Blocks** | Single tool/concept | `blocks/construct/tsc.md` |
| **Foundations** | Capabilities (how blocks combine) | `foundations/scm/commit-conventional.md` |
| **Stacks** | Complete project setups | `stacks/cli/cli-bun.md` |

### 8 Domains (SWEBOK-aligned)

`construct` · `test` · `quality` · `security` · `scm` · `ops` · `observe` · `docs`

### Role in Self-Improvement

Atomic docs are the **canonical knowledge base**. When Ralph learns something, it should:
- Update the relevant atomic doc (not create isolated files)
- Follow the domain/naming conventions
- Build compound knowledge over time

This creates **compound engineering**: each learning improves the docs → future Claude sessions benefit → better outputs → more learnings.

---

## 3. Vision: Self-Improving Ralph

### The Loop

```
Ralph runs → logs created → analysis → patterns extracted → atomic docs updated → next Ralph is smarter
```

### Key Mechanisms

**Capture** (during/after loop)
- Log each iteration's output
- Capture original goal vs final state
- Could use hooks or post-loop scripts

**Analyze** (after loop ends)

Three drift types:

1. **Intention Drift** - Did we diverge from the goal?
   - Compare work against PRD/story/roadmap
   - Did we build what was asked?
   - Did scope creep happen?

2. **Technical Drift** - Did we follow the specs?
   - Compare code against atomic docs (`context/`)
   - Compare against CLAUDE.md conventions
   - Did we use the right patterns, tools, structures?

3. **Behavioral Patterns** - Is Claude repeating itself?
   - Same prompting patterns across iterations
   - Same manual steps that could be automated
   - Same mistakes that a guard could prevent
   - → **Opportunity:** Create command/agent/workflow to optimize

**Learn** (extract patterns by type)

| Drift Type | What We Learn | Output |
|------------|---------------|--------|
| Intention | "We kept adding unrequested features" | Workflow: stricter PRD adherence |
| Technical | "We ignored the testing patterns" | Update atomic doc with reminder |
| Behavioral | "We ran `bun test` manually 50 times" | Create `/pre-commit` command |

**Evolve** (update source of truth)

Per drift type:

1. **Intention drift learnings →**
   - Update `context/workflows/` with guardrails
   - Create PRD-checking agent

2. **Technical drift learnings →**
   - Append to relevant atomic doc (`blocks/`, `foundations/`)
   - Add "Gotchas" section with evidence

3. **Behavioral pattern learnings →**
   - Create **command** (if simple action)
   - Create **agent** (if needs judgment)
   - Create **skill** (if multi-step workflow)
   - Add to `context/blocks/observe/ai-patterns.md`

### Feed Forward

Next Ralph loop receives accumulated learnings:
- Pattern memory injected into prompt
- Updated atomic docs automatically available
- Compound improvement over time

---

## 4. Open Questions

- **Capture mechanism?** Hooks during loop vs logs after vs both?
- **New atomic domain?** Should AI patterns live in `observe/` or new `ai/` domain?
- **Behavioral → Tool threshold?** How many repetitions before we create a command/agent?
- **Cross-loop memory?** How long should patterns persist? Decay over time?
