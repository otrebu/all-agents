## Task: Improve Help Text Consistency Across Commands

**Story:** [STORY-005-cli-polish](../stories/STORY-005-cli-polish.md)

**Depends on:** [TASK-026-print-flag-plan-commands](./TASK-026-print-flag-plan-commands.md), [TASK-027-auto-interactive-flags](./TASK-027-auto-interactive-flags.md)

### Goal

All ralph commands have consistent, professional help text with uniform flag descriptions and examples for complex commands.

### Context

The ralph CLI has grown organically with different command authors and patterns. This leads to inconsistencies that make the CLI harder to learn:

1. **Mode flag inconsistencies:**
   - Some commands use `-s, --supervised` with different descriptions
   - Some say "watch chat, can intervene" vs just "Supervised mode"
   - `--headless` descriptions vary: "JSON output + file logging" vs "Headless mode"

2. **Missing examples:**
   - Complex commands like `plan subtasks` with many source options lack usage examples
   - The `--cascade` flag behavior is complex but not illustrated

3. **Flag grouping:**
   - Source flags (--milestone, --story, --task, --file, --text) aren't visually grouped
   - Mode flags (--supervised, --headless, --auto, --interactive) aren't consistently ordered

### Plan

1. Audit all ralph commands and document current help text:
   - `ralph build`
   - `ralph plan` (vision, roadmap, stories, tasks, subtasks)
   - `ralph review` (stories, roadmap, gap/*)
   - `ralph status`
   - `ralph milestones`
   - `ralph calibrate` (intention, technical, improve, all)

2. Define standard flag descriptions:
   ```typescript
   const FLAG_DESCRIPTIONS = {
     supervised: "Supervised mode: watch execution, can intervene",
     headless: "Headless mode: JSON output with file logging",
     print: "Print prompt without executing (dry run)",
     force: "Skip all approval prompts",
     review: "Require all approval prompts",
     cascade: "Continue to target level after completion",
     auto: "Auto mode: generate without interaction (default)",
     interactive: "Interactive mode: collaborate with Claude",
   };
   ```

3. Update mode flag descriptions across all commands:
   - `ralph build`: `-s, --supervised`, `-H, --headless`
   - `ralph plan stories`: `-s, --supervised`, `-H, --headless`
   - `ralph plan tasks`: `-s, --supervised`, `-H, --headless`
   - `ralph plan subtasks`: `-s, --supervised`, `-H, --headless`, `--auto`, `--interactive`
   - `ralph review` subcommands: `-H, --headless`
   - `ralph calibrate` subcommands: `--force`, `--review`

4. Ensure consistent flag ordering in command definitions:
   ```typescript
   // Standard order: source flags, then mode flags, then behavior flags
   .option("--milestone <path>", "Milestone as source")
   .option("--story <path>", "Story as source")
   .option("--task <path>", "Task as source")
   .option("--file <path>", "File as source")
   .option("--text <string>", "Text description as source")
   .option("-s, --supervised", FLAG_DESCRIPTIONS.supervised)
   .option("-H, --headless", FLAG_DESCRIPTIONS.headless)
   .option("-p, --print", FLAG_DESCRIPTIONS.print)
   .option("--cascade <target>", FLAG_DESCRIPTIONS.cascade)
   ```

5. Add examples section for complex commands using Commander's `.addHelpText()`:
   ```typescript
   .addHelpText('after', `
   Examples:
     $ aaa ralph plan subtasks --milestone 003-ralph-workflow
     $ aaa ralph plan subtasks --task TASK-001 --size small
     $ aaa ralph plan subtasks --text "Add dark mode" --output-dir 003-ralph-workflow
   `)
   ```

6. Add examples to these commands:
   - `ralph build` (cascade example)
   - `ralph plan tasks` (story vs milestone vs text)
   - `ralph plan subtasks` (hierarchy vs alternative sources)

7. Review and update top-level command descriptions:
   - `ralph`: Keep concise but clarify the workflow stages
   - `ralph plan`: "Planning tools: vision, roadmap, stories, tasks, subtasks"
   - `ralph review`: "Review planning artifacts for quality and gaps"
   - `ralph calibrate`: "Run calibration checks on completed work"

### Acceptance Criteria

- [ ] All commands show consistent flag descriptions for `-s/--supervised`
- [ ] All commands show consistent flag descriptions for `-H/--headless`
- [ ] All commands show consistent flag descriptions for `-p/--print`
- [ ] Mode flags (`--supervised`, `--headless`, `--auto`, `--interactive`) documented consistently
- [ ] `ralph plan subtasks --help` shows Examples section
- [ ] `ralph plan tasks --help` shows Examples section
- [ ] `ralph build --help` shows Examples section with cascade usage
- [ ] Flag ordering is consistent: source flags, mode flags, behavior flags
- [ ] No duplicate or contradictory flag descriptions
- [ ] `ralph --help` shows all subcommands with clear descriptions

### Test Plan

- [ ] Manual: Review `aaa ralph build --help` for consistency
- [ ] Manual: Review `aaa ralph plan subtasks --help` for consistency and examples
- [ ] Manual: Review `aaa ralph plan tasks --help` for consistency and examples
- [ ] Manual: Review `aaa ralph calibrate intention --help` for consistency
- [ ] Manual: Compare `-s` description across all commands that have it
- [ ] Manual: Verify examples in help text are valid commands
- [ ] TypeScript compiles without errors (`bun run typecheck`)

### Scope

- **In:** Flag descriptions, flag ordering, examples in help text, command descriptions
- **Out:** Adding new functionality, changing command behavior, refactoring command structure

### Notes

**Commander.js help customization:**
- `.option(flags, description)` - standard flag help
- `.addHelpText('after', text)` - add text after generated help
- `.addHelpText('before', text)` - add text before generated help
- `.description(text)` - command description

**Standard abbreviations:**
- `-s` = supervised (not `--supervised` alone)
- `-H` = headless (capital H to distinguish from `-h` for help)
- `-p` = print/preview
- No abbreviation for `--auto`, `--interactive`, `--cascade`, `--force`, `--review`

**Future consideration:**
Consider extracting flag definitions to a shared constants file if the CLI grows further. This would ensure new commands automatically get consistent descriptions.

### Related Documentation

- @context/blocks/construct/commander.md
- @context/stacks/cli/cli-bun.md
