# Doc Analysis Component

Tiered documentation analysis for Ralph planning workflows. Matches input context to relevant atomic documentation, identifies gaps, and optionally triggers deep analysis.

## Overview

Three tiers, escalating in cost/depth:

| Tier | Model | Purpose | When to Use |
|------|-------|---------|-------------|
| T1 | Haiku | Index lookup | Always (fast, cheap) |
| T2 | Sonnet | Gap creation | When T1 finds missing docs |
| T3 | Opus | Deep analysis | Large planning efforts, new domains |

## Tier 1: Index Lookup (Haiku)

Fast lookup against `context/README.md` index. Returns paths to relevant atomic docs.

### Trigger

Always runs before generating planning artifacts (subtasks, stories, tasks).

### Process

1. **Extract keywords** from input:
   - Tool/library names (prisma, vitest, react)
   - Capabilities (testing, auth, logging)
   - Artifact types (cli, api, web)

2. **Search index** in `context/README.md`:
   - Match against block names in `context/blocks/`
   - Match against foundation names in `context/foundations/`
   - Match against stack names in `context/stacks/`

3. **Return matches**:
   ```json
   {
     "matches": [
       { "concept": "prisma", "path": "context/blocks/construct/prisma.md" },
       { "concept": "testing", "path": "context/foundations/test/test-unit-vitest.md" }
     ],
     "missing": [
       { "concept": "diary module", "reason": "No docs for review/diary subsystem" }
     ]
   }
   ```

### Implementation Reference

See @context/workflows/ralph/planning/task-doc-lookup.md for detailed patterns:
- Stack heuristics (UI → web stack, API → api stack)
- Foundation coverage patterns (forms, errors, themes)
- Search strategy (glob patterns, index queries)

## Tier 2: Gap Creation (Sonnet)

Creates missing atomic documentation flagged by T1.

### Trigger

When T1 returns non-empty `missing` array with critical gaps.

### Process

1. **Filter for critical gaps**:
   - Skip well-known libraries (npm docs sufficient)
   - Prioritize docs needed by multiple artifacts
   - Skip if existing doc covers 80%+ of concept

2. **Spawn atomic-doc-creator** for each gap:
   ```
   Invoke @.claude/agents/atomic-doc-creator.md with:
     - Topic: <concept>
     - Context: <reason from T1>
     - Suggested Layer: (inferred from concept type)
   ```

3. **Return created paths**:
   ```json
   {
     "created": [
       { "concept": "diary module", "path": "context/blocks/tools/diary.md" }
     ]
   }
   ```

### Implementation Reference

See @.claude/agents/atomic-doc-creator.md for:
- Layer determination (block/foundation/stack)
- Document structure requirements
- [REVIEW] flag handling

## Tier 3: Deep Analysis (Opus)

Parallel multi-agent analysis for comprehensive documentation planning.

### Trigger

Invoked explicitly via `/doc-analyze --deep` or when:
- Planning large documentation efforts (multiple blocks/foundations/stacks)
- Exploring a new domain comprehensively
- Cross-validation of findings is needed

### The 4-Agent Strategy

Two axes, two directions each = 4 perspectives:

|  | Tool-centric | Problem-centric |
|---|---|---|
| **Top-down** | Stack→foundations→blocks | Problems→what docs solve them |
| **Bottom-up** | Blocks→foundations→stacks | Features→what problems they address |

### Agent Prompts

**Agent 1: Stack→Down (tools)**
```
Given these stacks [list], what foundations and blocks do they require?
Derive requirements downward. Consider: build, styling, state, routing, testing.
```

**Agent 2: Block→Up (tools)**
```
Given these blocks [list], what foundations can we compose?
What stacks do those enable? Think compositionally.
Include research on [specific topic needing investigation].
```

**Agent 3: Problem→Down (features)**
```
Given these problems [P1-PN], what documentation solves each?
Map to stacks/foundations/blocks. Identify gaps.
```

**Agent 4: Feature→Up (features)**
```
Given these features [list], what problems do they solve?
Find over-documented (features without problems) and under-documented (problems without features).
```

### Optional: 5th Gap Explorer Agent

Add when scope is large or domain is new:

```
Audit the full plan for gaps in: DX, error handling, performance,
accessibility, i18n, forms, data viz, real-time, deployment, monitoring.
```

### Synthesis Process

After agents complete:

1. **Find convergence** - What all agents agree on
2. **Note divergence** - Insights unique to each perspective
3. **Identify challenges** - Questions raised (e.g., "Is SSR needed?")
4. **Merge findings** - Single prioritized doc list

### Output Format

```markdown
## Doc Analysis: <domain>

### Convergence (all agents agree)
- [list of docs needed]

### Divergent Insights
- Agent 1: [unique finding]
- Agent 2: [unique finding]
...

### Open Questions
- [questions for human input]

### Recommended Doc Plan
1. [prioritized doc list]
2. ...
```

### Constraints

- Use `model: opus` for all agents
- Launch all 4 (or 5) agents in parallel (single message)
- Synthesize before presenting to user

## Integration Points

This component is used by:

| Workflow | Tier Used | Integration |
|----------|-----------|-------------|
| `subtasks-from-source.md` | T1, T2 | Phase 1b (Doc Lookup) and Phase 6b (Doc Linking) |
| `stories-auto.md` | T1 | Before generating stories (future) |
| `tasks-auto.md` | T1, T2 | Via task-doc-lookup.md |
| `/doc-analyze` skill | T1, T2, T3 | Direct invocation |
| `/context:plan-multi-agent` | T3 | Deep analysis mode |

## Invocation Patterns

### From Planning Workflows

```
# T1 only (fast lookup)
→ doc-analysis.md --tier 1 --input "Add JWT authentication"

# T1 + T2 (with gap filling)
→ doc-analysis.md --tier 2 --input "Add JWT authentication"

# Full analysis
→ doc-analysis.md --tier 3 --domain "frontend" --with-gap-analysis
```

### Skill Invocation

```
/doc-analyze frontend                    # T1 + T2
/doc-analyze frontend --deep             # T3 (full Opus analysis)
/doc-analyze --gap-analysis              # T3 with gap explorer
```

## Example Usage

### Subtask Generation

```
Input: "Add error logging to diary functions"

T1 (Haiku):
  - Search: "error handling", "logging", "diary"
  - Found: context/blocks/quality/error-handling.md
  - Missing: No diary-specific doc

T2 (Sonnet):
  - Critical gap: "diary module" (multiple subtasks touch diary)
  - Spawn atomic-doc-creator → creates context/blocks/tools/diary.md

Output for subtasks:
  - filesToRead: [
      "context/blocks/quality/error-handling.md",
      "context/blocks/tools/diary.md [CREATED]"
    ]
```

### Deep Planning Session

```
/doc-analyze frontend --deep

T3 (Opus):
  - 4 agents analyze React, forms, state management, testing
  - Convergence: Need form validation, error boundaries
  - Divergence: SSR discussion (Agent 1 vs Agent 3)
  - Open: "What auth provider will be used?"

Output: Prioritized doc plan with phases
```
