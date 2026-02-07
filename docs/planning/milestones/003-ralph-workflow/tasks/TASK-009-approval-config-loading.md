## Task: Approvals Config Loading

**Story:** [STORY-001-artifact-approvals](../stories/STORY-001-artifact-approvals.md)

**Depends on:** [TASK-008-approval-types](./TASK-008-approval-types.md)

### Goal

Config loading returns approvals section with user overrides merged and `suggestWaitSeconds` defaulted to 180.

### Context

With approval types defined (TASK-008), we need the config loader to:
- Provide sensible defaults for `suggestWaitSeconds`
- Merge user-specified overrides from `aaa.config.json`
- Leave gate fields undefined when not specified (sparse defaults)

The "sparse defaults" approach allows runtime code to distinguish between "user didn't specify" and "user explicitly chose suggest". Runtime evaluation (separate task) will apply `?? "suggest"` fallback.

### Plan

1. Add `DEFAULT_APPROVALS` constant in `tools/src/lib/config/defaults.ts`:
   ```typescript
   export const DEFAULT_APPROVALS: ApprovalsConfig = {
     suggestWaitSeconds: 180,
   };
   ```
   Note: Gate fields (`createRoadmap`, `createStories`, etc.) are intentionally omitted - they default to `undefined` and runtime applies `"suggest"` fallback.

2. Update `DEFAULT_RALPH` in `tools/src/lib/config/defaults.ts` to include approvals:
   ```typescript
   export const DEFAULT_RALPH: RalphSection = {
     approvals: DEFAULT_APPROVALS,
     build: { ... },
     hooks: { ... },
     selfImprovement: { ... },
   };
   ```

3. Update `mergeRalph()` in `tools/src/lib/config/loader.ts` to handle approvals nested merge:
   ```typescript
   function mergeRalph(defaultValue: RalphSection, userValue?: RalphSection): RalphSection {
     if (!userValue) return defaultValue;
     return {
       ...defaultValue,
       ...userValue,
       approvals: userValue.approvals
         ? { ...defaultValue.approvals, ...userValue.approvals }
         : defaultValue.approvals,
       build: userValue.build ? { ... } : defaultValue.build,
       // ... existing merge logic
     };
   }
   ```

4. Export `DEFAULT_APPROVALS` from `tools/src/lib/config/index.ts`:
   ```typescript
   export { DEFAULT_APPROVALS, ... } from "./defaults";
   ```

5. Add unit tests in `tools/tests/lib/config-loader.test.ts`:
   - Test: approvals section merged correctly
   - Test: user-specified gates override undefined defaults
   - Test: `suggestWaitSeconds` defaults to 180
   - Test: partial user config merged with defaults

### Acceptance Criteria

- [ ] `DEFAULT_APPROVALS` exported from `lib/config/defaults.ts` and `lib/config/index.ts`
- [ ] `DEFAULT_APPROVALS` contains only `suggestWaitSeconds: 180` (sparse - no gate defaults)
- [ ] `DEFAULT_RALPH.approvals` equals `DEFAULT_APPROVALS`
- [ ] `mergeRalph()` correctly merges nested `approvals` section
- [ ] `loadAaaConfig().ralph?.approvals` returns merged config
- [ ] User-specified gate values (e.g., `createStories: "always"`) preserved after merge
- [ ] Unspecified gates remain `undefined` after merge (not pre-filled)
- [ ] `suggestWaitSeconds` defaults to 180 when not specified by user

### Test Plan

- [ ] Unit test: `mergeRalph()` merges approvals correctly (follow pattern from existing hooks tests)
- [ ] Unit test: sparse defaults - unspecified gates remain undefined
- [ ] Unit test: user overrides preserved (`createStories: "always"` not clobbered)
- [ ] Unit test: `suggestWaitSeconds` defaults to 180
- [ ] TypeScript compiles without errors (`bun run typecheck`)
- [ ] Existing tests pass (`bun test`)

### Scope

- **In:** `defaults.ts`, `loader.ts` merge logic, `index.ts` exports, `config-loader.test.ts` tests
- **Out:** Runtime gate evaluation (`?? "suggest"` fallback), CLI flags, `commands/ralph/config.ts` (unified loader handles it)

### Notes

**Why sparse defaults:**
- Distinguishes "not specified" from "explicitly suggest"
- Runtime code applies fallback: `config.approvals?.createStories ?? "suggest"`
- Users can detect if a gate was explicitly configured vs defaulted

**Why not update `commands/ralph/config.ts`:**
- `loadRalphConfig()` already delegates to `loadAaaConfig()` and maps the ralph section
- Once types/defaults/merge logic are in place, approvals flow through automatically
- No code changes needed there

**Test pattern to follow:**
See existing `config-loader.test.ts` tests for `ralph.hooks` merging (around lines 78-98) as a template for approvals merge tests.
