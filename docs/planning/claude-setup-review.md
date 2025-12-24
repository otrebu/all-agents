# .claude/ Setup Review

## 📊 Inventory Overview

| Type | Count | Items |
|------|-------|-------|
| Agents | 2 | gemini-research, parallel-search |
| Commands | 21 | Across dev, meta, context categories |
| Skills | 3 | task-create, brainwriting, dev-work-summary |

---

## 🤖 AGENTS (2)

### gemini-research
**Purpose:** Web research via Gemini CLI with Google Search grounding

**Pros:**
- ✅ Free tier (1000 req/day), huge context (1M tokens)
- ✅ Structured JSON output with citations
- ✅ 3 modes (quick/deep/code) for different needs
- ✅ Mandatory synthesis step → quality reports

**Cons:**
- ⚠️ Requires Gemini CLI installed & configured
- ⚠️ Two-step workflow (run → synthesize) = extra friction
- ⚠️ Output dirs get cluttered with raw JSON

---

### parallel-search
**Purpose:** Multi-angle research via Parallel Search API

**Pros:**
- ✅ Multi-perspective (3-5 queries simultaneously)
- ✅ High char limit (30K) for deep content
- ✅ Multiple processor levels (lite→ultra)

**Cons:**
- ⚠️ Requires API key (`AAA_PARALLEL_API_KEY`)
- ⚠️ Paid service vs Gemini's free tier
- ⚠️ Overlaps with gemini-research purpose

---

## ⚡ COMMANDS (21)

### Dev Workflow (6) — `/dev/`
| Command | Purpose | Notes |
|---------|---------|-------|
| git-commit | Single conventional commit | Uses haiku model 👍 |
| git-multiple-commits | Batch commits | Handles staging + push |
| start-feature | Create feature branch | Naming conventions |
| complete-feature | Merge to main + cleanup | Full workflow |
| code-review | Review code quality | Delegates to workflow doc |
| consistency-check | Docs↔code consistency | Uses subagents for 3+ files |

**Pros:** ✅ Complete git workflow covered, ✅ conventional commits enforced
**Cons:** ⚠️ git-commit vs git-multiple-commits distinction unclear, ⚠️ no rebase/squash command

### Research (3)
| Command | Purpose | Notes |
|---------|---------|-------|
| gh-search | GitHub code search | Pattern finding |
| gemini-research | Web research | Delegates to agent |
| parallel-search | Multi-angle research | Delegates to agent |

**Pros:** ✅ Multiple research sources
**Cons:** ⚠️ Command ≈ Agent duplication (gemini-research, parallel-search exist as both)

### Meta/Infrastructure (6) — `/meta/`
| Command | Purpose | Notes |
|---------|---------|-------|
| create-skill | Make new skill | 6-step process, init script |
| create-command | Make new command | WebFetch for latest docs |
| create-agent | Make new agent | YAML frontmatter |
| create-plugin | Make new plugin | TS script |
| how-to-prompt | Prompting guide | Reference only |
| optimize-prompt | Improve prompts | Reference only |

**Pros:** ✅ Self-extending system, ✅ good scaffolding
**Cons:** ⚠️ how-to-prompt & optimize-prompt just references (not actions)

### Context/Docs (1)
- **atomic-doc** — Create/update atomic documentation
  - ✅ Auto-updates index
  - ✅ Enforces conventions

### Utility (2)
- **create-task** — Task file creation
- **download** — URL→markdown conversion

---

## 🎯 SKILLS (3)

### task-create
**Purpose:** Create structured task files

**Pros:**
- ✅ Standardized template
- ✅ Uses `aaa` CLI integration
- ✅ Good structure (Goal, Context, Plan, Acceptance Criteria)

**Cons:**
- ⚠️ Duplicates create-task command?

---

### brainwriting
**Purpose:** Structured brainstorming with parallel sub-agents (9 agents across 5 rounds)

**Pros:**
- ✅ Unique/powerful — structured ideation
- ✅ Forces divergent thinking (Pragmatist, Out-of-box, Skeptic)
- ✅ Parallel execution = fast
- ✅ Ends with prioritized CORE vs LATER

**Cons:**
- ⚠️ Complex (5 rounds, 9+ agents)
- ⚠️ Overkill for small decisions
- ⚠️ Requires plan mode

---

### dev-work-summary
**Purpose:** Daily work summary across all ~/dev repos

**Pros:**
- ✅ Cross-repo visibility (scans ~/dev)
- ✅ Rich output (commits, changes, stats)
- ✅ Simple bash script = reliable

**Cons:**
- ⚠️ Only "today" (no date range)
- ⚠️ ~/dev hardcoded

---

## 🔄 OVERLAPS

| Overlap | Items | Issue |
|---------|-------|-------|
| **Research duplication** | gemini-research (agent + command), parallel-search (agent + command) | Commands just delegate to agents — redundant |
| **Task creation** | task-create skill ↔ create-task command | Same thing? Different names |
| **Commit commands** | git-commit ↔ git-multiple-commits | When to use which unclear |

---

## 🕳️ GAPS

### Missing Capabilities

1. **Testing commands** — No `/dev/run-tests`, `/dev/test-coverage`
2. **PR workflow** — No `create-pr`, `review-pr` commands (gh CLI exists but no wrapper)
3. **CI/CD integration** — No commands to check/trigger CI
4. **Changelog/release** — No release commands (repo has CHANGELOG but no automation command)
5. **Dependency mgmt** — No `update-deps`, `audit-deps`
6. **Search local** — No dedicated codebase search command (relies on Grep/Glob directly)
7. **Context loading** — No command to load specific context files easily
8. **Date range** — dev-work-summary only does "today"

### Documentation Gaps

1. No index/catalog of all commands/skills/agents
2. Some commands just reference docs without action (how-to-prompt)

---

## 💡 RECOMMENDATIONS

### Quick Wins
1. **Merge duplicates:** Remove command wrappers for agents (gemini-research, parallel-search commands → just use agents)
2. **Clarify commits:** Rename or merge git-commit + git-multiple-commits
3. **Consolidate task:** task-create skill + create-task command → pick one

### Valuable Additions
1. **`/dev/run-tests`** — Run tests with smart detection
2. **`/dev/create-pr`** — PR creation workflow
3. **`/dev/work-summary --since "3 days ago"`** — Date range support
4. **Index file** — `.claude/README.md` listing all commands/skills/agents

### Architecture
- Consider: Commands = user-invocable, Agents = internal subprocesses, Skills = conditional behaviors
- Currently some blur between these roles

---

## Summary Verdict

**Strengths:**
- 🟢 Complete git workflow
- 🟢 Self-extending (meta commands to create more)
- 🟢 Structured brainstorming (brainwriting unique)
- 🟢 Multi-source research

**Weaknesses:**
- 🔴 Overlap/duplication creates confusion
- 🔴 Missing test/PR/CI commands
- 🔴 No catalog/index for discovery

**Rating:** 7/10 — Solid foundation, needs consolidation + filling gaps
