---
depends:
  - @docs/planning/milestones/004-MULTI-CLI/stories/004-model-registry.md
  - @docs/planning/milestones/004-MULTI-CLI/tasks/TASK-049-static-registry.md
  - @context/blocks/docs/task-template.md
---

## Task: Model Validation Integration

**Story:** [004-model-registry](../stories/004-model-registry.md)

### Goal
Integrate model registry validation into build and review commands to provide helpful errors and suggestions for invalid model selections.

### Context
Currently, model selection likely accepts any string without validation. With the model registry, we can:
1. Validate that selected models exist
2. Ensure models are compatible with the selected provider
3. Suggest alternatives for unknown models
4. Convert user-friendly model IDs to CLI-specific formats

This improves UX by catching errors early and guiding users to valid selections.

### Plan
1. Update `tools/src/commands/ralph/build.ts`:
   - Import model registry functions
   - After parsing options, validate model if provided
   - If model invalid: show error with suggestions, exit
   - If model valid but wrong provider: show provider mismatch error
   - Convert model ID to cliFormat before passing to provider
2. Update `tools/src/commands/ralph/review/index.ts`:
   - Same validation logic as build command
   - Ensure consistency across commands
3. Create validation helper:
   - `validateModelSelection(modelId: string, provider: ProviderType)`
   - Returns: `{ valid: true, cliFormat: string }` or `{ valid: false, error: string, suggestions: string[] }`
4. Handle configuration file models:
   - Validate models from `.aaarc.json` or similar
   - Same error handling as CLI flags
5. Add tests for validation logic:
   - Valid model for provider
   - Invalid model
   - Model for wrong provider
   - Suggestion generation

### Acceptance Criteria
- [x] Build command validates model against registry
- [x] Review command validates model against registry
- [x] Invalid model ID shows error with suggestions
- [x] Model for wrong provider shows helpful error
- [x] Valid model converted to cliFormat for provider invocation
- [x] Validation works for CLI flags and config file
- [x] Suggestions limited to 5 most relevant models
- [x] Error messages include hint to run `refresh-models`

### Test Plan
- [x] Unit tests for validation helper
- [x] Test valid model returns correct cliFormat
- [x] Test invalid model returns suggestions
- [x] Test wrong provider error
- [x] Test suggestion ranking (same provider first)
- [x] Integration test: build with invalid model
- [x] Integration test: build with wrong provider model
- [x] Manual test: error messages are helpful

### Scope
- **In:** Model validation in build/review, validation helper, error messages
- **Out:** Static registry (TASK-049), dynamic discovery (TASK-050), tab completion (TASK-051)

### Notes
**Validation Flow:**
```typescript
// In build.ts or validation helper
const validateModel = (modelId: string, provider: ProviderType) => {
  const model = getModelById(modelId);
  
  if (!model) {
    const suggestions = getAllModels()
      .filter(m => m.provider === provider)
      .map(m => m.id)
      .slice(0, 5);
    
    return {
      valid: false,
      error: `Unknown model '${modelId}' for provider '${provider}'`,
      suggestions
    };
  }
  
  if (model.provider !== provider) {
    return {
      valid: false,
      error: `Model '${modelId}' is for provider '${model.provider}', but current provider is '${provider}'`,
      suggestions: []
    };
  }
  
  return {
    valid: true,
    cliFormat: model.cliFormat
  };
};
```

**Error Message Format:**
```
Error: Unknown model 'gpt-5' for provider 'opencode'

Did you mean:
  - gpt-4o (standard)
  - gpt-4o-mini (cheap)

Run 'aaa ralph refresh-models' to discover new models.
```

**Provider Mismatch Error:**
```
Error: Model 'claude-sonnet-4' is for provider 'claude', but current provider is 'opencode'

For provider 'opencode', try:
  - claude-sonnet-opencode (standard)
  - gpt-4o (standard)
```

**Integration Points:**
- Build command: validate after parsing options, before invoking provider
- Review command: same validation logic
- Config loading: validate when loading model from config file

**CLI Format Conversion:**
The registry stores both user-friendly IDs and CLI-specific formats:
- User selects: `--model gpt-4o`
- Registry converts to: `openai/gpt-4o` (OpenCode format)
- Provider receives CLI format

**Backward Compatibility:**
If no model specified, use provider default (existing behavior). Validation only applies when model is explicitly selected.

**Suggestion Algorithm:**
1. Filter to models for current provider
2. Sort alphabetically
3. Take first 5
4. Future: Could use fuzzy matching for better suggestions

### Related Documentation
- @docs/planning/milestones/004-MULTI-CLI/stories/004-model-registry.md
- @docs/planning/milestones/004-MULTI-CLI/tasks/TASK-049-static-registry.md
