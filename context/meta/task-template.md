# Task Templates (Human + AI Execution)

All templates include explicit test sections.

---

## 1. Feature Implementation

```markdown
## Feature: [Name]

### Goal
[What the user/system should be able to do]

### Context
[Why this matters, link to spec/ticket]

### Steps
1. [First action to take]
2. [Second action]
3. [Third action]

### Acceptance Criteria
- [ ] [Specific, testable outcome]
- [ ] [Another outcome]

### Test Plan
- [ ] Unit tests for [component]
- [ ] Integration test for [flow]
- [ ] Manual verification: [steps]
- Commands: `pnpm test -- --grep "feature-name"`

### Technical Notes
- Affected areas: [modules/services]
- Dependencies: [external APIs, other tasks]
- Edge cases: [list]

### Out of Scope
- [What this does NOT include]
```

---

## 2. Bug Fix

```markdown
## Bug: [Short description]

### Goal
[Expected behavior after fix]

### Severity
[Critical/High/Medium/Low]

### Reproduction
1. [Step]
2. [Step]
3. Expected: [X] / Actual: [Y]

### Investigation
- Suspected cause: [hypothesis]
- Relevant logs: [snippet or link]

### Acceptance Criteria
- [ ] Bug no longer reproducible
- [ ] Root cause addressed (not just symptom)

### Test Plan
- [ ] Regression test added covering this case
- [ ] Existing tests still pass
- [ ] Manual repro steps now show correct behavior
- Commands: `pnpm test -- path/to/affected.test.ts`

### Scope
- **In:** Fix + regression test
- **Out:** Refactoring unrelated code
```

---

## 3. Refactor / Tech Debt

```markdown
## Refactor: [Area/Module]

### Goal
[What the code should achieve after refactor]

### Motivation
[Why now? What pain is this causing?]

### Current State
- [Brief description]
- Pain points: [list]

### Target State
- [What it should look like]
- Benefits: [maintainability, perf, etc.]

### Acceptance Criteria
- [ ] Behavior unchanged (or changes documented)
- [ ] Code meets target state description
- [ ] No new tech debt introduced

### Test Plan
- [ ] All existing tests pass (no changes to test assertions)
- [ ] Performance benchmark: [before/after if applicable]
- [ ] Code review confirms readability improvement
- Commands: `pnpm test && pnpm typecheck`

### Approach
1. [Step-by-step plan]
2. [Rollback considerations]

### Risk
[High/Medium/Low] - [why]
```

---

## 4. Spike

```markdown
## Spike: [Question to answer]

### Goal
[Decision to be made based on findings]

### Timebox
[X hours/days] - hard stop at [date]

### Context
[Why we need this research, what depends on it]

### Questions
1. [Specific question]
2. [Another question]

### Options to Evaluate
| Option | Pros | Cons | Effort |
|--------|------|------|--------|
| A      |      |      |        |
| B      |      |      |        |

### Acceptance Criteria
- [ ] All questions answered with evidence
- [ ] Recommendation provided with trade-offs
- [ ] Decision documented in [location]

### Test Plan
- [ ] PoC runs successfully (if applicable)
- [ ] Findings reviewed by [stakeholder]

### Deliverables
- [ ] Written summary
- [ ] Trade-off comparison table
- [ ] Proof of concept (if applicable)
```

---

## 5. Integration / Migration

```markdown
## Integration: [System A] → [System B]

### Goal
[What should work after integration]

### Type
[API integration / Data migration / Service consolidation]

### Scope
- Data/functionality: [list]
- Systems affected: [list]
- Users impacted: [count/groups]

### Acceptance Criteria
- [ ] Data integrity verified
- [ ] No service degradation
- [ ] Rollback tested

### Test Plan
- [ ] Dry run migration on staging
- [ ] Data validation queries: `[SQL/commands]`
- [ ] Load test at expected volume
- [ ] Rollback drill completed
- Commands: `./scripts/migrate --dry-run`

### Migration Strategy
- Dual-write period: [dates]
- Cutover plan: [describe]
- Rollback trigger: [conditions]

### Monitoring
- [ ] Alerting configured for [metrics]
- [ ] Dashboard showing [KPIs]
```

---

## Quick Reference

| Type | When to Use | Key Sections |
|------|-------------|--------------|
| Feature | New functionality | + Steps, Technical Notes, Edge Cases |
| Bug | Fixing broken behavior | + Repro Steps, Investigation |
| Refactor | Code improvement | + Current/Target State, Risk |
| Spike | Research → decision | + Timebox, Questions, Options Table |
| Integration | System changes | + Migration Strategy, Monitoring |

---

## Principles

1. **Goal is mandatory** - one sentence, clear outcome
2. **AC drives testing** - each criterion should map to a test
3. **Test Plan is explicit** - not implied, includes runnable commands when possible
4. **Scope boundaries** - "Out of Scope" prevents creep
5. **Works for human or AI** - same format, AI just executes more literally
