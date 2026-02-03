## Story: CLI Consistency

### Narrative

As a developer debugging ralph commands, I want consistent CLI flags across all commands so that I can inspect prompts and control behavior predictably.

### Persona

**Developer debugging or exploring ralph** who wants to understand what happens under the hood.

Situation: "I want to see what prompt `ralph plan stories` will send before it actually runs. I can do this with `ralph build -p` but not with plan commands."

**Functional job:** Inspect and control ralph behavior consistently across all commands.

**Emotional job:** Feel confident and in control, not surprised by what commands do.

### Context

Several small CLI inconsistencies exist (IMPLEMENTATION_STATUS Section 12.2):
- `-p/--print` only works for `build`, not `plan` commands
- `--auto` for subtasks is internal behavior, not exposed as flag

These are low-effort fixes that improve developer experience.

### Acceptance Criteria

**`-p/--print` for plan commands:**
- [ ] `ralph plan stories -p` prints the prompt that would be sent, doesn't execute
- [ ] `ralph plan tasks -p` prints the prompt with resolved `@path` references
- [ ] `ralph plan subtasks -p` prints the prompt
- [ ] Works for all plan subcommands (vision, roadmap, stories, tasks, subtasks)
- [ ] Output goes to stdout, suitable for piping

**`--auto` flag exposure:**
- [ ] `ralph plan subtasks --auto` explicitly runs in auto mode (current default)
- [ ] `ralph plan subtasks --interactive` runs in interactive mode (if supported)
- [ ] Flag documented in `--help` output

**Help text consistency:**
- [ ] All commands show consistent flag descriptions
- [ ] Mode flags (`--supervised`, `--headless`) documented consistently
- [ ] Examples section in `--help` output for complex commands

### Tasks

<!-- Tasks will be generated separately via tasks-auto.md -->
- [ ] Tasks to be defined

### Notes

**Priority:** P2 (nice to have, not blocking)

**Implementation location:** `tools/src/commands/ralph/index.ts`

**Related docs:**
- IMPLEMENTATION_STATUS.md Section 12.2 (Missing Features)
