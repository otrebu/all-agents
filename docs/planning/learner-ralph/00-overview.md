# Learner Ralph: Overview & Comparison

## Vision

Ralph runs → logs created → analysis → patterns extracted → atomic docs updated → next Ralph is smarter

---

## Research Synthesis

### Self-Improving AI Patterns
- **Voyager**: Skill library with executable code, discovery prompts
- **Reflexion**: Verbal RL - verbal feedback as error signals
- **Mem0**: Two-phase (extract→synthesize) memory pipeline
- **Experience Replay**: Store (state, action, reward, next_state) tuples

### Memory Architectures
- **Episodic**: Specific events with timestamps
- **Semantic**: Abstracted knowledge/patterns
- **Procedural**: Skills/how-to-do-things
- **Zettelkasten**: Atomic notes + linking = existing atomic docs!

### Drift Detection
- **ADWIN**: Streaming change detection
- **Cosine Similarity**: >0.8 threshold for doc drift
- **PrefixSpan**: Sequence mining for behavioral patterns
- **Tool-Worthiness**: 5+ occurrences, 3+ steps, 80%+ success

### Codebase Integration Points
- Ralph stop-hook: `.claude/plugins/.../ralph-wiggum/.../hooks/stop-hook.sh`
- Atomic docs: `context/blocks/` with 8 SWEBOK domains
- Friction analyzer pattern: Stage 1 (extract raw) → Stage 2 (abstract patterns)

---

## The 5 Plans

| Plan | Name | Complexity | Time | API Cost | Key Feature |
|------|------|------------|------|----------|-------------|
| 1 | Minimal Learner | Low | 1-2h | $0 | Append-only file |
| 2 | Atomic Doc Learner | Medium | 4-6h | Medium | Sub-agents + atomic docs |
| 3 | Hook-Native Learner | Low-Med | 3-4h | $0 | Passive hook capture |
| 4 | Full Plugin | Med-High | 8-10h | Per use | Commands + full control |
| 5 | Multi-Agent System | High | 8 weeks | High | 6 agents + memory decay |

---

## Comparison Matrix

| Aspect | Plan 1 | Plan 2 | Plan 3 | Plan 4 | Plan 5 |
|--------|--------|--------|--------|--------|--------|
| **Files** | 1 | 3 | 4 | 11+ | 20+ |
| **Analysis Quality** | Keywords | LLM | Heuristics | LLM | Multi-LLM |
| **User Control** | None | Minimal | None | Full | Full |
| **Knowledge Compounding** | Linear | Structured | Linear | Structured | Graph-based |
| **Memory Decay** | Manual | Manual | Manual | Config | Automated |
| **Integration** | Standalone | Atomic docs | Standalone | Plugin | Full system |

---

## Recommendation

**Start**: Plan 1 → Validate concept quickly (1-2 hours)

**Evolve to**: Plan 2 or 4 → Based on value observed

**Aspirational**: Plan 5 → If high-value patterns emerge consistently

All plans share same integration point: `stop-hook.sh` modification.

---

## Critical Files

- `.claude/plugins/.../ralph-wiggum/.../hooks/stop-hook.sh` - Integration point
- `.claude/agents/conversation-friction-analyzer.md` - Pattern for Plan 2+
- `context/blocks/docs/atomic-documentation.md` - Structure for Plan 2+
- `tools/src/commands/ralph/index.ts` - Flag additions for Plan 4+

---

## Plan Files

- [Plan 1: Minimal Learner](./01-plan-minimal.md)
- [Plan 2: Atomic Doc Learner](./02-plan-atomic-doc.md)
- [Plan 3: Hook-Native Learner](./03-plan-hook-native.md)
- [Plan 4: Full Plugin](./04-plan-plugin.md)
- [Plan 5: Multi-Agent System](./05-plan-multi-agent.md)
