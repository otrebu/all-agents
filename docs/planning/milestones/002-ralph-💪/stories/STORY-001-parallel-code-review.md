# Plan: Code Review System Enhancement (Article-Inspired)

Based on article "I Stopped Reading Code. My Code Reviews Got Better."

## Relationship to Ralph

Code Review is **complementary** to Ralph, not overlapping:
- **Ralph:** Build with quality from the start (autonomous iterations)
- **Code Review:** Verify quality before merging (ad-hoc review)

**Reuse from Ralph:** Trust gradient invocation, diary pattern, display utils, CLI patterns
**Truly new:** 12 specialized agents, parallel execution, synthesis, triage, auto-fix, interrogation

---

## Gap Analysis

| Article Suggestion | Current State | Gap |
|---|---|---|
| 13 parallel specialized reviewers | 1 `coding-style-reviewer` | 🔴 BIG |
| Triage system (fix/skip/false-positive) | Priority pyramid, no interactive tool | 🔴 GAP |
| 50/50 Rule (lessons learned files) | Friction analysis exists, not per-codebase | 🟡 PARTIAL |
| Interrogation over reading code | None | 🔴 GAP |

---

## 1. Parallel Multi-Agent Code Review

**Goal:** 12 specialized reviewers in parallel, findings synthesized.

### Agents (`.claude/agents/code-review/`)

| Agent | Focus |
|-------|-------|
| `security-reviewer` | Injection, auth, secrets, XSS |
| `data-integrity-reviewer` | Null checks, boundaries, race conditions |
| `error-handling-reviewer` | Swallowed exceptions, recovery |
| `test-coverage-reviewer` | Missing tests, edge cases |
| `over-engineering-reviewer` | YAGNI, premature abstraction |
| `performance-reviewer` | N+1, memory leaks, algorithms |
| `accessibility-reviewer` | WCAG (frontend only) |
| `documentation-reviewer` | Missing/outdated docs |
| `maintainability-reviewer` | Coupling, naming, SRP (evolves from `coding-style-reviewer`) |
| `dependency-reviewer` | Outdated deps, vulnerabilities |
| `intent-alignment-reviewer` | Code matches requirements |
| `synthesizer` | Aggregates, dedupes, ranks findings |

### Finding Schema

```typescript
interface Finding {
  id: string;               // hash of file+line+description
  reviewer: string;         // agent name
  severity: 'critical' | 'high' | 'medium' | 'low';
  file: string;
  line?: number;
  description: string;
  suggestedFix?: string;    // optional code snippet
  confidence: number;       // 0-1
}
```

### Modes

**Skill (Claude Code):**
```
/dev:code-review                → Always interactive (you're in chat)
```

**CLI:**
```
aaa review                      → Asks: supervised or headless?
aaa review --supervised         → Autopilot, can stop manually
aaa review --headless           → Fully autonomous, auto-fix, logs
aaa review --headless --dry-run → Preview without fixing
aaa review status               → Show review diary
```

---

## 2. Code Review + Triage with Trust Gradient

**Goal:** Same trust modes as Ralph - headless, supervised, chat (skill).

### Trust Gradient Modes

| Mode | Where | Behavior |
|------|-------|----------|
| **Interactive** | `/dev:code-review` (skill) | Human in loop, always |
| **Supervised** | `aaa review --supervised` | Autopilot, can stop manually |
| **Headless** | `aaa review --headless` | Fully autonomous, auto-fix |

### CLI Command: `aaa review`

```bash
aaa review                      # Asks: supervised or headless?
aaa review --supervised         # Autopilot, can stop manually
aaa review --headless           # Fully autonomous, auto-fix
aaa review --headless --dry-run # Preview without fixing
aaa review status               # Show review diary
```

### Headless Mode Behavior

1. Run parallel reviewer agents
2. Synthesize findings
3. Auto-triage: categorize by severity/confidence
4. **Auto-fix** triaged issues
5. **Log everything to `logs/reviews.jsonl`**

Use `--dry-run` to preview without fixing.

### Supervised Mode Behavior

1. Run parallel reviewer agents
2. Synthesize findings
3. Show findings, pause
4. Human picks: FIX / SKIP / FALSE POSITIVE
5. Apply selected fixes, log decisions

### Chat Mode (Skill)

- Invoke via `/dev:code-review` in Claude Code
- Fully interactive, human sees everything
- No CLI needed

### Diary Format (`logs/reviews.jsonl`)

```json
{
  "timestamp": "2025-01-25T10:00:00Z",
  "mode": "headless",
  "findings": 12,
  "fixed": 8,
  "skipped": 3,
  "falsePositives": 1,
  "decisions": [
    { "id": "abc", "severity": "critical", "action": "fix", "confidence": 0.95 }
  ]
}
```

---

## 3. Lessons = Just Docs (No Graduation Ceremony)

**Key Insight:** If a lesson is worth documenting, put it where it belongs. NOW.

### context/ vs docs/ (Simple)

| Location | Contains | Organized By | Scope |
|----------|----------|--------------|-------|
| `context/` | Reusable knowledge | SWEBOK domains | Cross-project |
| `docs/` | Project specifics | App layers (backend, frontend) | This project |

### Where Lessons Go (Decision Tree)

```
Is this project-specific?
├── YES → docs/{relevant-folder}/
│         "Our API uses snake_case because legacy DB"
│
└── NO, it's reusable
    ├── About a tool? → context/blocks/{domain}/
    │   Add "Gotchas" section to existing doc
    │
    ├── About combining tools? → context/foundations/{domain}/
    │
    └── About a process? → context/workflows/
```

**No staging area. No graduation. Just put it where it belongs.**

### How Project Docs Extend Context

```markdown
# docs/backend/API_CONVENTIONS.md

## Error Handling
We return: { code: string, message: string }

See @context/blocks/quality/error-handling.md for philosophy.

## Project Additions (not in context)
- Custom error codes in src/errors/codes.ts
- Middleware in src/middleware/error-handler.ts
```

### Example: "Bun test hangs with ESM mocks"

1. Project-specific? **No** (affects any Bun project)
2. About a tool? **Yes** (Bun test runner)
3. → Add to `context/blocks/test/bun-test.md` under "Gotchas"

**Done.** No pipeline. Lesson is in the right place forever.

### Reviewers Read `docs/` Before Reviewing

No separate PROJECT_LESSONS.md needed - `docs/` already has project-specific knowledge:
- `docs/backend/` → API conventions, gotchas
- `docs/frontend/` → Component patterns, gotchas
- etc.

Reviewers scan relevant `docs/` to avoid false positives on known patterns.

### What This Removes

- ~~`context/lessons/`~~ - No separate lessons folder
- ~~`docs/lessons/`~~ - No separate lessons folder
- ~~Graduation pipeline~~ - Just put it where it belongs
- ~~`aaa lessons` CLI~~ - Not needed

---

## 4. Interrogation Workflow

**Goal:** Ask AI "why" instead of reading code. Surface assumptions & confidence.

**New Command:** `/dev:interrogate [changes|commit|pr]`

**Core Questions:**
1. What was the hardest decision?
2. What alternatives did you reject?
3. What are you least confident about?

**Modes:**
- `--quick` - Just the 3 critical questions
- `--skeptical` - Extra validation for AI-generated code

**Output Format:** Structured table with confidence levels, rejected alternatives, assumptions.

**Integration:**
- Update `complete-feature.md` - interrogation checkpoint
- Update `dev-lifecycle-simple.md` - pre-merge checklist
- Optional git hook reminder for substantial changes

---

## Implementation Order

| Phase | Deliverable | Effort |
|-------|-------------|--------|
| 1 | Interrogation workflow (quick win) | Small |
| 2 | 4 core agents + synthesizer | Medium |
| 3 | Update existing `/dev:code-review` + workflow | Small |
| 4 | `aaa review` CLI with trust gradient | Medium |
| 5 | Add more agents when gaps found | As needed |

---

## Files to Create/Modify

**Phase 1 (Interrogation):**
- NEW: `context/workflows/interrogate.md`
- NEW: `.claude/commands/dev/interrogate.md`

**Phase 2 (Reviewer Agents):**
- NEW: `.claude/agents/code-review/security-reviewer.md`
- NEW: `.claude/agents/code-review/data-integrity-reviewer.md`
- NEW: `.claude/agents/code-review/error-handling-reviewer.md`
- NEW: `.claude/agents/code-review/test-coverage-reviewer.md`
- NEW: `.claude/agents/code-review/over-engineering-reviewer.md`
- NEW: `.claude/agents/code-review/performance-reviewer.md`
- NEW: `.claude/agents/code-review/accessibility-reviewer.md`
- NEW: `.claude/agents/code-review/documentation-reviewer.md`
- NEW: `.claude/agents/code-review/dependency-reviewer.md`
- NEW: `.claude/agents/code-review/intent-alignment-reviewer.md`
- NEW: `.claude/agents/code-review/synthesizer.md`
- RENAME: `coding-style-reviewer.md` → `code-review/maintainability-reviewer.md`

**Phase 3 (Skill + Workflow Integration):**
- UPDATE: `context/workflows/code-review.md` - orchestrate parallel agents
- UPDATE: `.claude/commands/dev/code-review.md` - add `--cli` flag
- NEW: `.claude/skills/parallel-code-review/SKILL.md`

**Phase 4 (CLI - Reuse from Ralph):**
- EXTRACT: `tools/lib/claude-invoke.ts` (from `ralph/claude.ts`)
- EXTRACT: `tools/lib/diary.ts` (from `ralph/post-iteration.ts`)
- NEW: `tools/src/commands/review/index.ts` (uses shared lib)
- NEW: `tools/src/commands/review/types.ts` (Finding schema, diary entry)
- REUSE: Display utilities from `ralph/display.ts`

**Phase 5 (Docs + Planning):**
- UPDATE: `context/blocks/docs/atomic-documentation.md` - add "Where Lessons Go" section
- UPDATE: `docs/planning/VISION.md` - add Code Review section (new operational mode alongside Ralph)
- UPDATE: `docs/planning/ROADMAP.md` - add Milestone 5: Code Review System

---

---

## VISION.md Updates

Add new section after "3. Operational Modes" or as 3.4:

### 3.4 Code Review Mode

Parallel multi-agent code review with trust gradient. Same execution modes as Ralph.

| Mode | Command | Behavior |
|------|---------|----------|
| Interactive | `/dev:code-review` | Human in loop (skill) |
| Supervised | `aaa review --supervised` | Autopilot, can stop |
| Headless | `aaa review --headless` | Auto-triage, auto-fix |

**12 Specialized Reviewers:** security, data-integrity, error-handling, test-coverage, over-engineering, performance, accessibility, documentation, maintainability, dependency, intent-alignment + synthesizer.

**Interrogation Workflow:** `/dev:interrogate` - ask AI "why" instead of reading code.

---

## ROADMAP.md Updates

Add after Milestone 4:

### 5. code-review: Parallel Multi-Agent Review System

**Outcome:** Users can run comprehensive code review with 12 specialized agents in parallel

**Key deliverables:**
- 12 reviewer agents + synthesizer
- `aaa review` CLI with --supervised and --headless modes
- `/dev:code-review` skill for interactive mode
- `/dev:interrogate` workflow
- Diary logging to `logs/reviews.jsonl`

**Dependencies:** full-integration (milestone 4)

---

## Verification

1. **Interrogation:** `/dev:interrogate changes` → structured output with 3 questions
2. **Skill review:** `/dev:code-review` → interactive, human in loop
3. **Supervised CLI:** `aaa review --supervised` → autopilot, can stop
4. **Headless CLI:** `aaa review --headless` → auto-fix, logs to `logs/reviews.jsonl`
5. **Lessons:** Project-specific → `docs/`, reusable → `context/blocks/` gotchas
