## Story: Updated CLI Help, Completions, and Documentation

### Narrative
As a developer discovering the dry-run feature, I want clear help text, tab completion, and documented examples so that I can learn the feature without trial and error.

### Persona
A developer who is either new to Ralph or hasn't used the `--dry-run` flag before. They rely on `--help` output, tab completion, and README examples to discover and learn features. They expect `--dry-run` to appear in help text with a clear description, to be offered by tab completion in their shell, and to have example output in the README showing what to expect.

### Context
Every new CLI flag needs discoverability support. Without updated help text, completions, and docs, users won't know `--dry-run` exists or how to use it effectively. This is especially important because the preview feature is a safety multiplier - the more people use it, the fewer misconfigurations happen. Good docs also serve CI/automation users who need the JSON output format documented.

### Acceptance Criteria
- [ ] `aaa ralph build --help` shows `--dry-run` with a clear one-line description
- [ ] Tab completion in zsh and fish offers `--dry-run` for all applicable commands
- [ ] README includes example output showing the visual pipeline preview for at least one cascade scenario
- [ ] Help text for `--dry-run` clarifies that it exits without executing and shows the execution plan

### Tasks
- [ ] [021-TASK-cli-help-text](../tasks/021-TASK-cli-help-text.md) - Update CLI help text for --dry-run flag
- [ ] [022-TASK-shell-completions](../tasks/022-TASK-shell-completions.md) - Update shell completions with --dry-run flag
- [ ] [023-TASK-readme-examples](../tasks/023-TASK-readme-examples.md) - Add --dry-run examples to README with visual preview

### Notes
- Shell completions live in `tools/src/commands/completion/zsh.ts` and `fish.ts`
- Maps to WS-05 (Documentation & Completions) from the milestone plan
- README examples can use the visual diagrams from MILESTONE.md as a starting point
