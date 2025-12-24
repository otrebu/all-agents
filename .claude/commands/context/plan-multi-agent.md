---
allowed-tools: Task, Read, Edit, AskUserQuestion
argument-hint: <domain> [--with-auth] [--gap-analysis]
description: Plan documentation using parallel Opus agents (top-down/bottom-up × tool/problem)
---

# Multi-Agent Documentation Planning

Use parallel Opus subagents to explore documentation needs from multiple perspectives, then synthesize.

## When to Use

- Planning large documentation efforts (multiple blocks/foundations/stacks)
- Exploring a new domain comprehensively
- When you need cross-validation of findings

## The 4-Agent Strategy

Two axes, two directions each = 4 perspectives:

| | Tool-centric | Problem-centric |
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

## Optional: 5th Gap Explorer Agent

Add when scope is large or domain is new:

```
Audit the full plan for gaps in: DX, error handling, performance,
accessibility, i18n, forms, data viz, real-time, deployment, monitoring.
```

## Synthesis Process

After agents complete:

1. **Find convergence** - What all agents agree on
2. **Note divergence** - Insights unique to each perspective
3. **Identify challenges** - Questions raised (e.g., "Is SSR needed?")
4. **Merge findings** - Single prioritized doc list

## Example Usage

```bash
# Basic planning
/context:plan-multi-agent frontend

# With auth research
/context:plan-multi-agent frontend --with-auth

# Full audit
/context:plan-multi-agent frontend --with-auth --gap-analysis
```

## Constraints

- Use `model: opus` for all agents
- Launch all 4 (or 5) agents in parallel (single message)
- Allow 2-5 minutes for completion
- Synthesize before presenting to user

## Output

Update plan file with:
- Agent findings (synthesized)
- Final doc skeleton (blocks, foundations, stacks)
- Implementation phases (ordered by value)
- Deferred items (future scope)
