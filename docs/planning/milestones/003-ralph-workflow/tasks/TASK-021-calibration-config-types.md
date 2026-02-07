## Task: Add CalibrationConfig types and schema to config system

**Story:** [STORY-003-auto-calibration](../stories/STORY-003-auto-calibration.md)

### Goal

CalibrationConfig types and Zod schema are added to the unified config system, enabling config-driven auto-calibration settings.

### Context

The story requires a `calibration` config block in `aaa.config.json`:
```json
{
  "calibration": {
    "everyNIterations": 10,
    "afterMilestone": true
  }
}
```

Currently, the config system in `tools/src/lib/config/types.ts` has BuildConfig with `calibrateEvery` but no dedicated CalibrationConfig block. The story calls for a top-level `calibration` block separate from `ralph.build`.

This task adds the types; subsequent tasks integrate them into the build loop.

### Plan

1. Add `CalibrationConfig` interface to `tools/src/lib/config/types.ts`:
   - `everyNIterations?: number` (0 = disabled, 1-100 reasonable)
   - `afterMilestone?: boolean` (trigger calibration when all subtasks complete)
2. Add `calibrationConfigSchema` Zod schema with validation:
   - `everyNIterations`: `z.number().int().min(0).max(100).optional()`
   - `afterMilestone`: `z.boolean().optional()`
3. Add `calibration?: CalibrationConfig` to `AaaConfig` interface
4. Add `calibration: calibrationConfigSchema.optional()` to `aaaConfigSchema`
5. Export new types and schema from `tools/src/lib/config/index.ts`
6. Add `DEFAULT_CALIBRATION` to `tools/src/lib/config/defaults.ts`

### Acceptance Criteria

- [ ] `CalibrationConfig` interface exists with `everyNIterations` and `afterMilestone` fields
- [ ] `calibrationConfigSchema` validates field types and ranges
- [ ] `AaaConfig` includes optional `calibration` field
- [ ] Types and schema exported from `@tools/lib/config`
- [ ] Default values exported as `DEFAULT_CALIBRATION`
- [ ] TypeScript compilation passes

### Test Plan

- [ ] Add unit test for `calibrationConfigSchema` validation (valid/invalid values)
- [ ] Test that `loadAaaConfig()` correctly parses calibration block
- [ ] Verify schema rejects `everyNIterations` values outside 0-100 range
- [ ] Run `bun run typecheck` to verify compilation

### Scope

- **In:** CalibrationConfig types, schema, defaults, exports
- **Out:** CLI flag integration, build loop integration, config loading changes

### Notes

- Keep field names matching story spec (`everyNIterations`, `afterMilestone`)
- The existing `ralph.build.calibrateEvery` will be deprecated in favor of `calibration.everyNIterations` (but keep backward compat for now)
- Follow existing patterns in types.ts (interface + schema + export)

### Related Documentation

- @context/blocks/construct/zod.md
- @context/stacks/cli/cli-bun.md
