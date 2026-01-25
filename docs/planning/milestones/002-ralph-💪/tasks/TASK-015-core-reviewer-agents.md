## Task: Core Reviewer Agents + Synthesizer

**Story:** [STORY-001-parallel-code-review](../stories/STORY-001-parallel-code-review.md)

### Goal
Create 4 core specialized reviewer agents and a synthesizer agent that can run in parallel and aggregate findings.

### Context
Phase 2 of the Parallel Code Review story. The article recommends 12 specialized reviewers, but we start with 4 core ones that provide the most value:
1. **security-reviewer** - Injection, auth, secrets, XSS
2. **data-integrity-reviewer** - Null checks, boundaries, race conditions
3. **error-handling-reviewer** - Swallowed exceptions, recovery
4. **test-coverage-reviewer** - Missing tests, edge cases

Plus a **synthesizer** that aggregates, dedupes, and ranks findings from all reviewers.

### Plan
1. Define Finding interface in a shared types file at `.claude/agents/code-review/types.ts`:
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
2. Create `.claude/agents/code-review/` directory structure
3. Create `security-reviewer.md` agent:
   - Focus on OWASP Top 10, injection, auth, secrets exposure
   - Output findings in JSON format
4. Create `data-integrity-reviewer.md` agent:
   - Focus on null checks, array bounds, race conditions
   - Output findings in JSON format
5. Create `error-handling-reviewer.md` agent:
   - Focus on swallowed exceptions, missing catch blocks, recovery paths
   - Output findings in JSON format
6. Create `test-coverage-reviewer.md` agent:
   - Focus on missing tests, untested branches, edge cases
   - Output findings in JSON format
7. Create `synthesizer.md` agent:
   - Accept findings from multiple reviewers
   - Dedupe similar findings across reviewers
   - Rank by severity × confidence
   - Output consolidated report

### Acceptance Criteria
- [ ] Finding interface documented in shared types
- [ ] 4 core reviewer agents exist in `.claude/agents/code-review/`
- [ ] Each reviewer outputs findings in consistent JSON format
- [ ] Synthesizer agent can aggregate findings from multiple inputs
- [ ] Synthesizer dedupes and ranks findings correctly

### Test Plan
- [ ] Manual: Invoke each reviewer on a test file with known issues
- [ ] Manual: Invoke synthesizer with mock findings from multiple reviewers
- [ ] Verify deduplication works (same issue found by 2 reviewers = 1 finding)

### Scope
- **In:** 4 core reviewer agents, synthesizer agent, Finding interface
- **Out:** Other reviewer agents (will be added later), CLI integration, parallel execution

### Notes
The reviewers are designed to run in parallel via the Task tool. Each reviewer:
- Reads the diff/changed files
- Applies domain-specific rules
- Outputs findings in JSON format
- Does NOT attempt to fix anything (that's triage's job)

### Related Documentation
- @.claude/agents/coding-style-reviewer.md (existing agent pattern)
- @context/workflows/code-review.md (existing review workflow)
