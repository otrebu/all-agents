## Task: Add Approval Types to Unified Config

**Story:** [STORY-001-artifact-approvals](../stories/STORY-001-artifact-approvals.md)

### Goal

Add TypeScript types and Zod schemas for artifact-centric approval configuration in the unified config system.

### Context

The artifact-centric approval system needs type definitions before any runtime logic can be implemented. These types define:
- The three approval modes (`auto`, `suggest`, `always`)
- The approval gates (artifact creation events that can trigger approval)
- The configuration structure that lives under `ralph.approvals` in `aaa.config.json`

Types live in `lib/config/types.ts` (single source of truth for all config types) with Zod schemas for runtime validation.

This is the foundation task - all other approval tasks depend on these types existing.

### Plan

1. Add `ApprovalMode` type and Zod schema in `tools/src/lib/config/types.ts`:
   ```typescript
   type ApprovalMode = "auto" | "suggest" | "always";
   const approvalModeSchema = z.enum(["auto", "suggest", "always"]);
   ```

2. Add `ApprovalsConfig` interface and schema with all gates:
   ```typescript
   interface ApprovalsConfig {
     // Artifact creation gates
     createRoadmap?: ApprovalMode;
     createStories?: ApprovalMode;
     createTasks?: ApprovalMode;
     createSubtasks?: ApprovalMode;
     createAtomicDocs?: ApprovalMode;

     // Special gates
     onDriftDetected?: ApprovalMode;
     correctionTasks?: ApprovalMode;
     promptChanges?: ApprovalMode;

     // Global settings
     suggestWaitSeconds?: number;
   }

   const approvalsConfigSchema = z.object({
     createRoadmap: approvalModeSchema.optional(),
     createStories: approvalModeSchema.optional(),
     createTasks: approvalModeSchema.optional(),
     createSubtasks: approvalModeSchema.optional(),
     createAtomicDocs: approvalModeSchema.optional(),
     onDriftDetected: approvalModeSchema.optional(),
     correctionTasks: approvalModeSchema.optional(),
     promptChanges: approvalModeSchema.optional(),
     suggestWaitSeconds: z.number().int().min(0).optional(),
   });
   ```

3. Add `approvals` field to `RalphSection` interface and schema:
   ```typescript
   interface RalphSection {
     approvals?: ApprovalsConfig;
     build?: BuildConfig;
     hooks?: HooksConfig;
     selfImprovement?: SelfImprovementConfig;
   }
   ```

4. Export new types and schemas from `types.ts`

5. Re-export from `lib/config/index.ts`

### Acceptance Criteria

- [ ] `ApprovalMode` type and `approvalModeSchema` exported
- [ ] `ApprovalsConfig` interface includes all 8 gates: `createRoadmap`, `createStories`, `createTasks`, `createSubtasks`, `createAtomicDocs`, `onDriftDetected`, `correctionTasks`, `promptChanges`
- [ ] `ApprovalsConfig` includes `suggestWaitSeconds` optional number field
- [ ] `approvalsConfigSchema` Zod schema validates all fields
- [ ] `RalphSection` includes optional `approvals` field
- [ ] `ralphSectionSchema` includes `approvals` field
- [ ] All new types/schemas exported from `lib/config/index.ts`

### Test Plan

- [ ] TypeScript compiles without errors (`bun run typecheck`)
- [ ] Existing tests pass (`bun test`)

### Scope

- **In:** Type definitions and Zod schemas in `lib/config/types.ts`, exports in `lib/config/index.ts`
- **Out:** Default values, config loading/merging logic, runtime approval checks

### Notes

**Design decisions:**
- Approvals config lives under `ralph` section (not top-level) since it's Ralph-specific
- Simple string modes only (no per-gate override objects) - keeps config readable
- All gates optional - unspecified gates will default to `"suggest"` at runtime (handled in separate task)
- Default `suggestWaitSeconds` is 180 (3 minutes) - applied in defaults, not here

**Gate definitions:**
| Gate | Triggers when... |
|------|------------------|
| `createRoadmap` | Generating roadmap.md |
| `createStories` | Generating story files |
| `createTasks` | Generating task files |
| `createSubtasks` | Generating subtasks.json |
| `createAtomicDocs` | Generating @context docs |
| `onDriftDetected` | Calibration detects drift |
| `correctionTasks` | Creating correction tasks from drift |
| `promptChanges` | Modifying prompt files |
