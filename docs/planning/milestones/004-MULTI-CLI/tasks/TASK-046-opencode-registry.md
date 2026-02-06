---
depends:
  - @docs/planning/milestones/004-MULTI-CLI/stories/003-opencode-support.md
  - @docs/planning/milestones/004-MULTI-CLI/tasks/TASK-045-opencode-implementation.md
  - @context/blocks/docs/task-template.md
---

## Task: OpenCode Registry Integration

**Story:** [003-opencode-support](../stories/003-opencode-support.md)

### Goal
Register the OpenCode provider in the provider registry and update type definitions to enable provider selection.

### Context
After implementing the OpenCode provider (TASK-045), it needs to be registered in the provider registry so users can select it via `--provider opencode`. This involves:
1. Adding OpenCode to the `REGISTRY` record in `providers/registry.ts`
2. Adding `OpencodeConfig` type to `providers/types.ts` (if not already in foundation)
3. Ensuring the provider is discoverable and selectable

The registry acts as the central dispatch point - when a user runs `aaa ralph build --provider opencode`, the registry routes to the correct implementation.

### Plan
1. Update `tools/src/commands/ralph/providers/types.ts`:
   - Add `OpencodeConfig` interface extending `BaseProviderConfig`
   - Include `provider: 'opencode'` discriminator
   - Add optional `model?: string` field for provider/model format
2. Update `tools/src/commands/ralph/providers/registry.ts`:
   - Import `invokeOpencode` from `./opencode`
   - Add `opencode` entry to `REGISTRY` record
   - Set `available: true`, `invoke: invokeOpencode`
   - Set `supportedModes: ['supervised', 'headless-sync', 'headless-async']` (no haiku)
3. Verify provider selection works via `--provider opencode`
4. Verify model configuration accepts provider/model format

### Acceptance Criteria
- [ ] `OpencodeConfig` type defined in `providers/types.ts`
- [ ] OpenCode registered in `REGISTRY` with correct capabilities
- [ ] `aaa ralph build --provider opencode` routes to OpenCode implementation
- [ ] Provider availability check works (binary detection)
- [ ] Supported modes correctly listed (no haiku mode)
- [ ] Model configuration accepts "provider/model" format

### Test Plan
- [ ] Unit test: Registry returns correct provider for 'opencode'
- [ ] Unit test: `OpencodeConfig` type validation
- [ ] Integration test: Provider selection via CLI flag
- [ ] Manual test: `aaa ralph build --provider opencode` works
- [ ] Verify error when opencode binary not available

### Scope
- **In:** Type definitions, registry registration, provider routing
- **Out:** Provider implementation (TASK-045), test fixtures, documentation

### Notes
**Registry Entry Structure:**
```typescript
opencode: {
  available: true,
  invoke: invokeOpencode,
  supportedModes: ['supervised', 'headless-sync', 'headless-async']
}
```

**Type Definition:**
```typescript
interface OpencodeConfig extends BaseProviderConfig {
  provider: 'opencode';
  model?: string;  // provider/model format, e.g., "anthropic/claude-sonnet-4-20250514"
}
```

**Mode Limitations:**
OpenCode does not support 'haiku' mode - only supervised and headless variants. The registry must reflect this accurately.

**Dependency:**
This task depends on TASK-045 (OpenCode implementation) being complete, as it imports the `invokeOpencode` function.

### Related Documentation
- @docs/planning/milestones/004-MULTI-CLI/stories/001-provider-foundation.md
- @docs/planning/milestones/004-MULTI-CLI/stories/003-opencode-support.md
