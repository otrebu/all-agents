---
depends:
  - @docs/planning/milestones/004-MULTI-CLI/stories/004-model-registry.md
  - @docs/planning/milestones/004-MULTI-CLI/stories/001-provider-foundation.md
  - @context/blocks/docs/task-template.md
---

## Task: Static Model Registry

**Story:** [004-model-registry](../stories/004-model-registry.md)

### Goal
Create the static model registry with baseline models for Claude and OpenCode providers, establishing the foundation for model discovery and selection.

### Context
The model registry has two layers: static (committed, always works) and dynamic (discovered, refreshable). This task creates the static baseline that provides:
1. Guaranteed working models even without discovery
2. Well-known model IDs that users can rely on
3. Cost hints to guide model selection
4. CLI format mapping (different providers use different formats)

Static models are the safety net - they ensure ralph works out of the box without requiring model discovery.

### Plan
1. Create `tools/src/commands/ralph/providers/models-static.ts`:
   - Define `ModelInfo` interface
   - Add Claude models: claude-sonnet-4, claude-haiku, claude-opus-4
   - Add OpenCode models: gpt-4o, gpt-4o-mini, claude-sonnet-opencode, claude-haiku-opencode
   - Include cost hints (cheap/standard/expensive)
   - Include CLI format for each provider's requirements
2. Create `tools/src/commands/ralph/providers/models.ts`:
   - Import static models
   - Create placeholder for dynamic models import
   - Implement `getAllModels()` - merges static + dynamic
   - Implement `getModelsForProvider()` - filter by provider
   - Implement `getModelById()` - lookup by ID
   - Implement `getModelCompletions()` - all model IDs for tab completion
   - Implement `getModelCompletionsForProvider()` - provider-specific completions
3. Add model validation helper:
   - `validateModelForProvider()` - check if model ID works with provider
   - Suggest alternatives for unknown models
4. Export all registry functions for use in CLI commands

### Acceptance Criteria
- [ ] `models-static.ts` exists with baseline models for Claude and OpenCode
- [ ] `ModelInfo` interface defined with id, provider, cliFormat, costHint fields
- [ ] `models.ts` exports registry functions: getAllModels, getModelsForProvider, getModelById
- [ ] Tab completion helpers return sorted model ID lists
- [ ] Static models include cost hints (cheap/standard/expensive)
- [ ] Model validation provides helpful error messages with suggestions
- [ ] Static models work without any dynamic discovery

### Test Plan
- [ ] Unit tests for model registry functions
- [ ] Test static model count and fields
- [ ] Test provider filtering (getModelsForProvider)
- [ ] Test model lookup (getModelById)
- [ ] Test tab completion generation
- [ ] Test validation with known/unknown models
- [ ] Test error messages include suggestions

### Scope
- **In:** Static model definitions, registry functions, validation helpers, tab completion
- **Out:** Dynamic discovery (TASK-050), refresh command (TASK-050), CLI integration (TASK-051, TASK-052)

### Notes
**ModelInfo Interface:**
```typescript
interface ModelInfo {
  id: string;                    // User-friendly ID (e.g., "gpt-4o")
  provider: ProviderType;        // 'claude' | 'opencode' | etc.
  cliFormat: string;             // Format CLI expects (e.g., "openai/gpt-4o")
  costHint: 'cheap' | 'standard' | 'expensive';
  discoveredAt?: string;         // Only for dynamic models
  description?: string;          // Optional description
}
```

**Static Models to Include:**

Claude (native format):
- claude-sonnet-4 → claude-sonnet-4-20250514 (standard)
- claude-haiku → claude-3-5-haiku-latest (cheap)
- claude-opus-4 → claude-opus-4-20250514 (expensive)

OpenCode (provider/model format):
- gpt-4o → openai/gpt-4o (standard)
- gpt-4o-mini → openai/gpt-4o-mini (cheap)
- claude-sonnet-opencode → anthropic/claude-sonnet-4-20250514 (standard)
- claude-haiku-opencode → anthropic/claude-3-5-haiku-latest (cheap)

**Cost Hint Guidelines:**
- **cheap**: Fast, inexpensive models for prototyping and simple tasks
- **standard**: Balanced cost/performance for most use cases
- **expensive**: High-capability models for complex reasoning

**Registry Merge Logic:**
Static models take precedence over dynamic models with the same ID. This prevents discovered models from overriding well-known baseline models.

**Validation Error Format:**
```
Unknown model 'gpt-5' for provider 'opencode'
Did you mean: gpt-4o, gpt-4o-mini?
Run 'aaa ralph refresh-models' to discover new models.
```

**File Structure:**
```
providers/
├── models-static.ts      # This task
├── models-dynamic.ts     # Placeholder (TASK-050)
└── models.ts             # Registry merger (this task)
```

### Related Documentation
- @docs/planning/milestones/004-MULTI-CLI/stories/001-provider-foundation.md
- @docs/planning/milestones/004-MULTI-CLI/stories/004-model-registry.md
