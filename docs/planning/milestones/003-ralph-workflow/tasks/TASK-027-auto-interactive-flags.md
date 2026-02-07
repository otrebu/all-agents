## Task: Expose --auto/--interactive Flags for Subtasks

**Story:** [STORY-005-cli-polish](../stories/STORY-005-cli-polish.md)

### Goal

The `ralph plan subtasks` command exposes `--auto` and `--interactive` flags to explicitly control execution mode, with clear documentation in help output.

### Context

Currently, `ralph plan subtasks` uses different prompts based on the source type:
- `--milestone` or `--story`: Uses `subtasks-from-hierarchy.md` (auto-style, generates all at once)
- `--task`: Uses `subtasks-auto.md` (auto-style for single task)
- `--file`, `--text`, `--review`: Uses `subtasks-from-source.md`

The mode selection is implicit based on source flags. Users cannot override this to use interactive mode when they want to collaborate with Claude on subtask generation. Adding explicit `--auto` and `--interactive` flags would:
1. Make the current default behavior explicit
2. Allow users to choose interactive mode for any source
3. Improve discoverability through `--help` output

### Plan

1. Add mode flags to `ralph plan subtasks` command definition:
   ```typescript
   .option("--auto", "Auto mode: generate subtasks without interaction (default)")
   .option("--interactive", "Interactive mode: collaborate with Claude on subtask generation")
   ```

2. Add mutual exclusion validation in action handler:
   ```typescript
   if (options.auto && options.interactive) {
     console.error("Error: Cannot use --auto and --interactive together");
     process.exit(1);
   }
   ```

3. Determine effective mode:
   ```typescript
   // Explicit flags take precedence, otherwise infer from source type
   const isInteractiveMode = options.interactive === true;
   const isAutoMode = options.auto === true || !isInteractiveMode;
   ```

4. Update `getSubtasksPromptPath()` to accept mode override:
   ```typescript
   function getSubtasksPromptPath(
     contextRoot: string,
     flags: SubtasksSourceFlags,
     forceInteractive?: boolean
   ): string {
     // If interactive requested, use interactive prompt variant
     if (forceInteractive) {
       return path.join(
         contextRoot,
         "context/workflows/ralph/planning/subtasks-interactive.md"
       );
     }
     // ... existing logic for auto prompts
   }
   ```

5. Pass mode to prompt path resolution:
   ```typescript
   const promptPath = getSubtasksPromptPath(
     contextRoot,
     sourceFlags,
     options.interactive === true
   );
   ```

6. Update invocation logic to use correct mode:
   - If `--interactive`, use `invokeClaude()` (interactive session)
   - If `--auto` or default, use `invokeClaudeChat()` (supervised) or `invokeClaudeHeadless()` (headless)

7. Ensure existing `-s/--supervised` and `-H/--headless` flags still work:
   - `--supervised` with `--auto` = supervised auto (watch Claude generate)
   - `--supervised` with `--interactive` = supervised interactive (watch collaboration)
   - `--headless` with `--auto` = headless auto (JSON output)
   - `--headless` with `--interactive` = error or fallback to supervised interactive

### Acceptance Criteria

- [ ] `ralph plan subtasks --auto` explicitly runs in auto mode (same as current default)
- [ ] `ralph plan subtasks --interactive` runs in interactive mode with collaboration
- [ ] `ralph plan subtasks --milestone X --auto` works (auto mode for hierarchy)
- [ ] `ralph plan subtasks --task X --interactive` works (interactive mode for single task)
- [ ] `ralph plan subtasks --auto --interactive` produces error: "Cannot use --auto and --interactive together"
- [ ] `ralph plan subtasks --help` shows `--auto` and `--interactive` flags with descriptions
- [ ] `ralph plan subtasks --headless --interactive` produces helpful error or warning
- [ ] Default behavior unchanged when neither flag specified

### Test Plan

- [ ] Manual: `aaa ralph plan subtasks --help` shows `--auto` and `--interactive` flags
- [ ] Manual: `aaa ralph plan subtasks --auto --interactive` produces mutual exclusion error
- [ ] Manual: `aaa ralph plan subtasks --task TASK-001 --auto -s` runs in supervised auto mode
- [ ] Manual: `aaa ralph plan subtasks --task TASK-001 --interactive` runs interactive session
- [ ] Manual: Omitting both flags keeps existing behavior (auto for most sources)
- [ ] TypeScript compiles without errors (`bun run typecheck`)

### Scope

- **In:** Adding `--auto` and `--interactive` flags to `ralph plan subtasks`, validation, prompt path selection
- **Out:** Adding these flags to other plan commands (vision, roadmap, stories, tasks already have natural modes)

### Notes

**Why only subtasks:**
The other plan commands have clearer mode semantics:
- `vision` is always interactive (Socratic dialogue)
- `roadmap` is always interactive
- `stories` and `tasks` already have `-s/--supervised` and `-H/--headless`

Subtasks is unique because it has multiple source modes that internally select different prompts. Making this explicit improves transparency.

**Interactive prompt:**
If `subtasks-interactive.md` doesn't exist, we may need to create it. The interactive variant would guide Claude to ask clarifying questions about task scope before generating subtasks, rather than generating immediately.

**Mode combinations:**

| Flags | Behavior |
|-------|----------|
| (none) | Auto mode, supervised (default) |
| `--auto` | Auto mode, supervised (explicit) |
| `--interactive` | Interactive mode, supervised |
| `--auto -s` | Auto mode, supervised |
| `--auto -H` | Auto mode, headless |
| `--interactive -s` | Interactive mode, supervised |
| `--interactive -H` | Error or fallback |

### Related Documentation

- @context/blocks/construct/commander.md
