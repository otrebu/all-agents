## Task: Add -p/--print Flag to Plan Commands

**Story:** [STORY-005-cli-polish](../stories/STORY-005-cli-polish.md)

### Goal

All `ralph plan` subcommands support `-p/--print` to inspect prompts without executing Claude.

### Context

Currently, only `ralph build` supports the `-p/--print` flag which outputs the prompt that would be sent to Claude without actually executing it. This is valuable for debugging, inspection, and understanding what context will be sent. The `ralph plan` commands (vision, roadmap, stories, tasks, subtasks) are missing this capability, creating an inconsistent developer experience.

The existing implementation in `ralph build` (lines 375, 429-446 in index.ts) provides a good pattern to follow:
- Read the prompt file content
- Read any additional context files (CLAUDE.md, PROGRESS.md, etc.)
- Output all content to stdout in a readable format
- Exit without invoking Claude

### Plan

1. Add `-p, --print` option to `ralph plan vision` command:
   - Add `.option("-p, --print", "Print prompt without executing Claude")`
   - Before `invokeClaude()` call, check `options.print`
   - If true, read and output prompt content, then return early

2. Add `-p, --print` option to `ralph plan roadmap` command:
   - Same pattern as vision
   - Output includes resolved prompt path

3. Add `-p, --print` option to `ralph plan stories` command:
   - Add print option to command definition
   - In action handler, before mode selection, check `options.print`
   - Output prompt content and extraContext (milestone info)
   - Return early without invoking Claude

4. Add `-p, --print` option to `ralph plan tasks` command:
   - Handle all source modes (--story, --milestone, --file, --text)
   - Resolve prompt path using existing `getPromptPath()` helper
   - Output prompt content and source-specific extraContext
   - Return early without invoking Claude

5. Add `-p, --print` option to `ralph plan subtasks` command:
   - Handle all source modes (--milestone, --story, --task, --file, --text, --review)
   - Resolve prompt path using existing `getSubtasksPromptPath()` helper
   - Output prompt content and full extraContext (includes sizing mode)
   - Resolve @path references in prompt content before printing
   - Return early without invoking Claude

6. Create shared helper function `printPromptAndExit()`:
   ```typescript
   function printPromptAndExit(
     sessionName: string,
     promptPath: string,
     extraContext?: string
   ): void {
     console.log(`=== Ralph ${sessionName} Prompt ===\n`);
     console.log(`--- Prompt (${path.basename(promptPath)}) ---`);
     // Read and output prompt content
     // If extraContext, output that section too
     console.log("\n=== End of Prompt ===");
   }
   ```

### Acceptance Criteria

- [ ] `ralph plan vision -p` prints the prompt that would be sent, doesn't execute
- [ ] `ralph plan roadmap -p` prints the prompt, doesn't execute
- [ ] `ralph plan stories -p --milestone X` prints the prompt with resolved milestone context
- [ ] `ralph plan tasks -p --story X` prints the prompt with resolved story context
- [ ] `ralph plan tasks -p --text "desc"` prints the prompt with text context
- [ ] `ralph plan subtasks -p --task X` prints the prompt with resolved `@path` references
- [ ] `ralph plan subtasks -p --milestone X` prints the hierarchy prompt variant
- [ ] Output goes to stdout, suitable for piping (e.g., `ralph plan tasks -p --story X | less`)
- [ ] `-p` flag documented in `--help` output for all plan subcommands
- [ ] Print mode works regardless of `-s/--supervised` or `-H/--headless` flags

### Test Plan

- [ ] Manual: `aaa ralph plan vision -p` outputs prompt content
- [ ] Manual: `aaa ralph plan roadmap -p` outputs prompt content
- [ ] Manual: `aaa ralph plan stories -p --milestone 003-ralph-workflow` outputs prompt with milestone context
- [ ] Manual: `aaa ralph plan tasks -p --story STORY-001` outputs prompt with story context
- [ ] Manual: `aaa ralph plan subtasks -p --task TASK-001` outputs prompt
- [ ] Manual: Pipe output works: `aaa ralph plan vision -p | head -20`
- [ ] Manual: `aaa ralph plan vision --help` shows `-p, --print` flag
- [ ] TypeScript compiles without errors (`bun run typecheck`)

### Scope

- **In:** Adding -p/--print flag to all 5 plan subcommands (vision, roadmap, stories, tasks, subtasks)
- **Out:** Adding print flag to review commands, calibrate commands, or build command (already has it)

### Notes

**Prompt file resolution:**
- `vision`: `context/workflows/ralph/planning/vision-interactive.md`
- `roadmap`: `context/workflows/ralph/planning/roadmap-interactive.md`
- `stories`: Uses `getPromptPath()` which returns `stories-auto.md` or `stories-interactive.md`
- `tasks`: Uses `getPromptPath()` for story mode, or `tasks-milestone.md`/`tasks-from-source.md`
- `subtasks`: Uses `getSubtasksPromptPath()` which returns different prompts based on source type

**@path resolution:**
Some prompts contain `@path` references that get resolved during execution. The print mode should ideally show the resolved content, not raw `@` references. However, the first iteration can show raw references if resolution is complex.

### Related Documentation

- @context/blocks/construct/commander.md
- @context/stacks/cli/cli-bun.md
