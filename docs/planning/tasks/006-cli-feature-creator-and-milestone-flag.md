# Plan: Meta-skill for CLI Feature Creation + --milestone flag

## Two Goals
1. **Meta**: Create reusable skill for adding CLI features (stops repetition)
2. **Concrete**: Use it to add `--milestone` flag to `ralph plan tasks`

---

## Part A: Meta-Skill for CLI Feature Creation

### Problem
Every ralph feature requires updating 5+ files in the same pattern:
- Prompt (source of truth)
- CLI (index.ts)
- Completions (bash/zsh/fish)
- SKILL (thin wrapper)

### Solution: `.claude/commands/meta/cli-feature-creator.md`

**Input:**
- feature-name: e.g., "gap-analysis"
- feature-type: "plan-subcommand" | "top-level" | "flag"
- has-auto-mode: boolean
- required-argument: e.g., "--milestone <name>"

**Output flow:**
```
1. Create prompt → context/workflows/ralph/planning/{feature}[-auto].md
2. Update CLI   → tools/src/commands/ralph/index.ts
3. Update completions → bash.ts, zsh.ts, fish.ts
4. Create SKILL → .claude/skills/ralph-{feature}/SKILL.md (references prompt)
```

**Key principle:** Prompt is source of truth, everything else derives from it.

---

## Part B: --milestone Flag Implementation

### Architecture: Subagent for parallel task generation
- Spawn `task-generator` subagent PER STORY (parallel)
- Faster: 2-3 min vs 10-15 min for 9 stories
- Better quality: smaller context per agent

### Files to Create/Modify

1. **NEW:** `.claude/agents/task-generator.md`
   - Single-story task generator
   - Input: story path, starting task ID
   - Output: task files + summary

2. **UPDATE:** `context/workflows/ralph/planning/tasks-auto.md`
   - Add milestone mode as orchestrator
   - Spawns parallel task-generator agents
   - Keeps single-story mode for `--story`

3. **UPDATE:** `tools/src/commands/ralph/index.ts`
   - Add `--milestone` option to tasks command
   - Make `--story` optional when `--milestone` provided

4. **UPDATE:** Completions (bash/zsh/fish)
   - Add `--milestone` with milestone completion

5. **UPDATE:** `.claude/skills/ralph-plan/SKILL.md`
   - Document `--milestone` mode
   - Keep DRY (reference prompt)

---

## Validation
1. `aaa ralph plan tasks --milestone ralph --auto` → parallel agents
2. Tab: `--milestone <TAB>` shows milestones
3. `--story` mode still works
4. Meta-skill can be used for future features

## Implementation Order
1. Create meta-skill (Part A)
2. Create task-generator agent
3. Update tasks-auto.md as orchestrator
4. CLI + completions + SKILL
