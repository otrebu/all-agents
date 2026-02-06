---
depends:
  - @docs/planning/milestones/004-MULTI-CLI/stories/004-model-registry.md
  - @docs/planning/milestones/004-MULTI-CLI/tasks/TASK-049-static-registry.md
  - @context/blocks/docs/task-template.md
---

## Task: Model Tab Completion

**Story:** [004-model-registry](../stories/004-model-registry.md)

### Goal
Integrate model registry with CLI tab completion to provide intelligent model suggestions based on selected provider.

### Context
Tab completion is a key UX feature for CLI tools. For model selection, completions should:
1. Show only models valid for the current provider
2. Include cost hints in descriptions
3. Work with `--model` flag on build/review commands
4. Update dynamically when provider changes

This requires integrating the model registry with the CLI completion system, which may use libraries like `commander` or `yargs` with completion plugins.

### Plan
1. Identify CLI completion system in use:
   - Check `tools/src/commands/ralph/` for completion setup
   - Look for completion handlers or plugins
2. Add model completion handler:
   - Read current `--provider` value from completion context
   - Query model registry for provider-specific models
   - Return completions with model IDs and cost hints
3. Register completions for `--model` flag:
   - `aaa ralph build --model <TAB>`
   - `aaa ralph review --model <TAB>`
   - Other commands that accept `--model`
4. Handle edge cases:
   - No provider specified → show all models
   - Unknown provider → empty completions
   - Provider not in registry → empty completions
5. Add completion for provider flag:
   - `aaa ralph build --provider <TAB>`
   - Show available providers
6. Test completion output format

### Acceptance Criteria
- [ ] Tab completion works for `--model` flag on build/review commands
- [ ] Completions filtered by selected `--provider` value
- [ ] Cost hints shown in completion descriptions
- [ ] Completions include both static and dynamic models
- [ ] Provider tab completion shows available providers
- [ ] Completion works when no provider specified (shows all models)
- [ ] Completion gracefully handles unknown providers

### Test Plan
- [ ] Unit tests for completion generation
- [ ] Test provider-specific filtering
- [ ] Test cost hint inclusion in descriptions
- [ ] Test edge cases: no provider, unknown provider
- [ ] Manual test: `aaa ralph build --model <TAB>` shows models
- [ ] Manual test: `aaa ralph build --provider opencode --model <TAB>` shows OpenCode models
- [ ] Manual test: completions update when provider changes

### Scope
- **In:** Tab completion integration, completion handlers, provider/model completions
- **Out:** Static registry (TASK-049), dynamic discovery (TASK-050), model validation (TASK-052)

### Notes
**Completion System Investigation:**
First, identify how completions are currently implemented:
- Look for `completion` or `completions` in command files
- Check package.json for completion-related dependencies
- Look for `.completion()` calls on command objects

**Completion Handler Pattern:**
```typescript
// Example with commander
program
  .command('build')
  .option('--provider <provider>', 'AI provider', completeProviders)
  .option('--model <model>', 'Model to use', completeModels)
  .action(...);

function completeModels(currentInput: string, { provider }: Options): string[] {
  const models = provider 
    ? getModelCompletionsForProvider(provider)
    : getModelCompletions();
  
  return models.map(id => {
    const model = getModelById(id);
    return {
      name: id,
      description: model?.costHint || 'unknown'
    };
  });
}
```

**Completion Output Format:**
Different completion systems expect different formats:
- Some want array of strings: `['gpt-4o', 'gpt-4o-mini']`
- Some want objects: `[{ name: 'gpt-4o', description: 'standard' }]`
- Some use special syntax: `'gpt-4o:standard'`

Check existing completion implementations for the expected format.

**Provider Completion:**
```typescript
function completeProviders(): string[] {
  return Object.keys(REGISTRY).filter(p => REGISTRY[p].available);
}
```

**Dynamic Updates:**
Completions should reflect the current state of the model registry:
- After `refresh-models`, new models appear in completions
- Static models always available
- Dynamic models available after refresh

**Performance:**
Model lists are small (< 100 models), so completions should be fast. No caching needed initially.

**Testing Completions:**
Many CLI frameworks allow testing completions programmatically:
```typescript
// Example test
const completions = await getCompletions('build --model ');
expect(completions).toContain('gpt-4o');
expect(completions).toContain('claude-sonnet-4');
```

### Related Documentation
- @docs/planning/milestones/004-MULTI-CLI/stories/004-model-registry.md
- @docs/planning/milestones/004-MULTI-CLI/tasks/TASK-049-static-registry.md
