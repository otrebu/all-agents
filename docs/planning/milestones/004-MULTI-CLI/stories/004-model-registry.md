---
depends:
  - @docs/planning/milestones/004-MULTI-CLI/MILESTONE.md
  - @docs/planning/milestones/004-MULTI-CLI/stories/001-provider-foundation.md
  - @docs/planning/milestones/004-MULTI-CLI/stories/002-claude-refactor.md
  - @docs/planning/milestones/004-MULTI-CLI/stories/003-opencode-support.md
  - @context/foundations/quality/gate-standards.md
---

## Story: Model Registry Management

### Narrative
As a ralph user, I want to discover and select from available AI models across different providers so that I can choose the best model for my task without manually managing model IDs.

### Persona
**The Model-Aware Developer** - Someone who wants flexibility to choose models based on cost, capability, or provider preference. They care about:
- Easy discovery of available models
- Tab completion for model selection
- Understanding cost implications (cheap vs standard vs expensive)
- Access to newly released models without code changes
- Consistent model selection experience across providers

### Context
Different providers support different models with varying formats:
- Claude uses native model names (e.g., `claude-sonnet-4-20250514`)
- OpenCode uses provider/model format (e.g., `anthropic/claude-sonnet-4-20250514`)
- New models are released frequently and need to be discoverable

The model registry provides:
1. **Static baseline** - Committed models that always work
2. **Dynamic discovery** - Refreshable models discovered from CLI providers
3. **Tab completion** - Shell completions for model selection
4. **Cost hints** - Cheap/standard/expensive categorization

### Acceptance Criteria
- [ ] Tab completion shows available models for current provider
- [ ] Static baseline models work without refresh
- [ ] `aaa ralph refresh-models` discovers new models from providers
- [ ] `aaa ralph refresh-models --dry-run` shows what would be discovered
- [ ] `aaa ralph refresh-models --provider opencode` refreshes specific provider
- [ ] Unknown model ID shows helpful error with suggestions
- [ ] Model registry merges static + dynamic without duplicates
- [ ] Cost hints guide model selection (cheap/standard/expensive)

### Tasks
- [TASK-049-static-registry](../tasks/TASK-049-static-registry.md) - Create static model registry with baseline models
- [TASK-050-dynamic-discovery](../tasks/TASK-050-dynamic-discovery.md) - Implement `refresh-models` command for dynamic discovery
- [TASK-051-tab-completion](../tasks/TASK-051-tab-completion.md) - Add model tab completion with cost hints
- [TASK-052-model-validation](../tasks/TASK-052-model-validation.md) - Integrate model validation into build/review commands

### Notes
**Model Registry Architecture:**

**Static Baseline (Committed):**
```typescript
// providers/models-static.ts
export const STATIC_MODELS: ModelInfo[] = [
  // Claude models (native to claude CLI)
  { 
    id: 'claude-sonnet-4', 
    provider: 'claude', 
    cliFormat: 'claude-sonnet-4-20250514', 
    costHint: 'standard' 
  },
  { 
    id: 'claude-haiku', 
    provider: 'claude', 
    cliFormat: 'claude-3-5-haiku-latest', 
    costHint: 'cheap' 
  },
  
  // OpenCode models (provider/model format)
  { 
    id: 'gpt-4o', 
    provider: 'opencode', 
    cliFormat: 'openai/gpt-4o', 
    costHint: 'standard' 
  },
  { 
    id: 'claude-sonnet-opencode', 
    provider: 'opencode', 
    cliFormat: 'anthropic/claude-sonnet-4-20250514', 
    costHint: 'standard' 
  },
];
```

**Dynamic Discovery (Generated):**
```typescript
// providers/models-dynamic.ts (auto-generated, committed)
export const DISCOVERED_MODELS: ModelInfo[] = [
  // Discovered 2026-02-05 via `aaa ralph refresh-models`
  { 
    id: 'gemini-2.5-pro', 
    provider: 'opencode', 
    cliFormat: 'google/gemini-2.5-pro-preview-05-06',
    costHint: 'standard',
    discoveredAt: '2026-02-05'
  },
  { 
    id: 'o3-mini', 
    provider: 'opencode', 
    cliFormat: 'openai/o3-mini',
    costHint: 'cheap',
    discoveredAt: '2026-02-05'
  },
];
```

**Model Info Interface:**
```typescript
interface ModelInfo {
  id: string;                    // User-friendly ID for selection
  provider: ProviderType;        // Which provider this model belongs to
  cliFormat: string;             // Format required by CLI
  costHint: 'cheap' | 'standard' | 'expensive';
  discoveredAt?: string;         // ISO date for dynamic models
  description?: string;          // Optional description
}
```

**Merged Registry:**
```typescript
// providers/models.ts
import { STATIC_MODELS } from './models-static';
import { DISCOVERED_MODELS } from './models-dynamic';

export const getAllModels = (): ModelInfo[] => {
  // Static takes precedence over dynamic (in case of ID conflicts)
  const staticIds = new Set(STATIC_MODELS.map(m => m.id));
  const uniqueDynamic = DISCOVERED_MODELS.filter(m => !staticIds.has(m.id));
  return [...STATIC_MODELS, ...uniqueDynamic];
};

export const getModelsForProvider = (provider: ProviderType): ModelInfo[] => {
  return getAllModels().filter(m => m.provider === provider);
};

export const getModelById = (id: string): ModelInfo | undefined => {
  return getAllModels().find(m => m.id === id);
};

// Tab completion helpers
export const getModelCompletions = (): string[] => {
  return [...new Set(getAllModels().map(m => m.id))].sort();
};

export const getModelCompletionsForProvider = (provider: ProviderType): string[] => {
  return getModelsForProvider(provider).map(m => m.id).sort();
};
```

**Refresh Command:**
```typescript
// CLI command: aaa ralph refresh-models
interface RefreshOptions {
  dryRun?: boolean;              // Show what would be discovered
  provider?: ProviderType;       // Refresh specific provider only
}

const refreshModels = async (options: RefreshOptions): Promise<void> => {
  const providersToRefresh = options.provider 
    ? [options.provider]
    : ['opencode', 'codex', 'gemini']; // Providers that support discovery
  
  const discovered: ModelInfo[] = [];
  
  for (const provider of providersToRefresh) {
    if (provider === 'opencode') {
      const models = await discoverOpencodeModels();
      discovered.push(...models);
    }
    // Add other providers as they're implemented
  }
  
  if (options.dryRun) {
    console.log('Would discover models:');
    discovered.forEach(m => console.log(`  ${m.id} -> ${m.cliFormat}`));
    return;
  }
  
  // Update models-dynamic.ts file
  await updateDynamicModelsFile(discovered);
  console.log(`Discovered ${discovered.length} new models`);
};

// OpenCode model discovery
const discoverOpencodeModels = async (): Promise<ModelInfo[]> => {
  // Run: opencode models --json
  // Parse output to extract available models
  // Map to ModelInfo format
  return [];
};
```

**Static Baseline Models:**

**Claude Models:**
| ID | CLI Format | Cost Hint |
|----|------------|-----------|
| claude-sonnet-4 | claude-sonnet-4-20250514 | standard |
| claude-haiku | claude-3-5-haiku-latest | cheap |
| claude-opus-4 | claude-opus-4-20250514 | expensive |

**OpenCode Models (Static):**
| ID | CLI Format | Cost Hint |
|----|------------|-----------|
| gpt-4o | openai/gpt-4o | standard |
| gpt-4o-mini | openai/gpt-4o-mini | cheap |
| claude-sonnet-opencode | anthropic/claude-sonnet-4-20250514 | standard |
| claude-haiku-opencode | anthropic/claude-3-5-haiku-latest | cheap |

**Cost Hint Guidelines:**
- **cheap**: Haiku, GPT-4o-mini, O3-mini - Good for quick tasks, prototyping
- **standard**: Sonnet, GPT-4o, Gemini Pro - Balanced cost/performance
- **expensive**: Opus, GPT-4.5 - Use for complex reasoning, code generation

**Tab Completion Integration:**

**Shell Completion Setup:**
```typescript
// In CLI completion handlers
const modelCompletions = getModelCompletionsForProvider(selectedProvider);
return modelCompletions.map(id => ({
  name: id,
  description: getModelById(id)?.costHint || 'unknown'
}));
```

**Error Handling:**
```typescript
const selectModel = (modelId: string, provider: ProviderType): string => {
  const model = getModelById(modelId);
  
  if (!model) {
    const suggestions = getAllModels()
      .filter(m => m.provider === provider)
      .map(m => m.id)
      .slice(0, 5);
    
    throw new Error(
      `Unknown model '${modelId}' for provider '${provider}'\n` +
      `Did you mean: ${suggestions.join(', ')}?\n` +
      `Run 'aaa ralph refresh-models' to discover new models.`
    );
  }
  
  if (model.provider !== provider) {
    throw new Error(
      `Model '${modelId}' is for provider '${model.provider}', ` +
      `but current provider is '${provider}'`
    );
  }
  
  return model.cliFormat;
};
```

**Configuration Integration:**
```json
{
  "ralph": {
    "provider": "opencode",
    "model": "gpt-4o",
    "timeouts": {
      "stallMinutes": 10,
      "hardMinutes": 60
    }
  }
}
```

**CLI Usage:**
```bash
# Use model from registry
aaa ralph build --provider opencode --model gpt-4o

# Refresh models from providers
aaa ralph refresh-models

# Dry run - see what would be discovered
aaa ralph refresh-models --dry-run

# Refresh specific provider only
aaa ralph refresh-models --provider opencode

# Tab completion works for model selection
aaa ralph build --provider opencode --model <TAB>
# Shows: gpt-4o, gpt-4o-mini, claude-sonnet-opencode, ...
```

**Testing Requirements:**

**Unit Tests (Deterministic, Fast):**
- Model registry merging logic
- Static + dynamic deduplication
- getModelById lookup
- getModelsForProvider filtering
- Tab completion generation

**Integration Tests:**
- Refresh command with mock provider responses
- File generation for models-dynamic.ts
- Error handling for unknown models

**Manual Testing Checklist:**
- [ ] Tab completion shows merged static + dynamic models
- [ ] `aaa ralph refresh-models` updates dynamic models
- [ ] `aaa ralph refresh-models --dry-run` shows preview
- [ ] `aaa ralph refresh-models --provider opencode` refreshes only opencode
- [ ] Unknown model ID shows helpful error with suggestions
- [ ] Model validation rejects wrong provider models
- [ ] Cost hints display in tab completion

**Files Created:**
- `tools/src/commands/ralph/providers/models-static.ts` - Static baseline models
- `tools/src/commands/ralph/providers/models-dynamic.ts` - Discovered models (generated)
- `tools/src/commands/ralph/providers/models.ts` - Registry merger and helpers

**Files Modified:**
- `tools/src/commands/ralph/build.ts` - Use model registry for validation
- `tools/src/commands/ralph/review/index.ts` - Use model registry for validation
- CLI completion handlers - Add model completions

**Implementation Phases:**

**Phase 1: Static Registry**
1. Create `models-static.ts` with baseline models
2. Create `models.ts` with merge logic
3. Update build/review to validate models

**Phase 2: Dynamic Discovery**
1. Create `models-dynamic.ts` placeholder
2. Implement `refresh-models` command
3. Add provider-specific discovery (starting with opencode)

**Phase 3: Tab Completion**
1. Add model completions to CLI
2. Integrate with shell completion system
3. Add cost hint display

**Risks:**
- Model registry out of date - Mitigation: Refresh command, static baseline always works
- Provider model format changes - Mitigation: Normalize in provider layer
- Large registry impacts performance - Mitigation: Lazy loading, caching

**Success Criteria:**
- Tab completion shows available models
- Refresh command discovers new models
- Unknown model shows helpful error
- Static baseline works without refresh
- New provider can be added with <10 lines of model definitions
