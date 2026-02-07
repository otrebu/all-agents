## Task: Add --calibrate-every CLI flag to build command

**Story:** [STORY-003-auto-calibration](../stories/STORY-003-auto-calibration.md)

### Goal

The `ralph build` command accepts `--calibrate-every <n>` flag that overrides config values and enables auto-calibration during the build loop.

### Context

The build command already has `--calibrate-every <n>` defined in `tools/src/commands/ralph/index.ts` (line 393):
```typescript
.option('--calibrate-every <n>', 'Run calibration every N iterations (0 = disabled)', '0')
```

And it's already being passed to `runBuild()` (line 466):
```typescript
calibrateEvery: Number.parseInt(options.calibrateEvery, 10),
```

The `BuildOptions` type in `tools/src/commands/ralph/types.ts` already has `calibrateEvery: number`.

This task ensures the flag works correctly and integrates with the new `CalibrationConfig` from the config system. The flag value should override config values.

### Plan

1. Update `runBuild()` in `tools/src/commands/ralph/build.ts` to load CalibrationConfig:
   - Import `loadAaaConfig` from `@tools/lib/config`
   - Load config at start of build loop
   - Use CLI flag if provided (> 0), otherwise fall back to config value
2. Add validation for the flag value:
   - Reject values outside 1-100 range (or 0 for disabled)
   - Show clear error message for invalid values
3. Update help text to clarify override behavior:
   - "Run calibration every N iterations (1-100, 0 = disabled, overrides config)"

### Acceptance Criteria

- [ ] `ralph build --calibrate-every 10` runs calibration every 10 iterations
- [ ] `ralph build --calibrate-every 0` disables auto-calibration (even if config enables it)
- [ ] Flag value overrides `calibration.everyNIterations` config value
- [ ] Invalid values (< 0, > 100) show clear error message
- [ ] Help text documents the flag with override behavior

### Test Plan

- [ ] E2E test: `ralph build --calibrate-every 5` with mock subtasks
- [ ] E2E test: flag overrides config value
- [ ] E2E test: invalid value shows error
- [ ] Run `bun run test:e2e` to verify existing tests pass

### Scope

- **In:** CLI flag validation, config fallback logic, help text
- **Out:** Calibration counter implementation (TASK-023), afterMilestone handling (TASK-024)

### Notes

- The existing flag implementation passes the value to `runBuild()`; this task adds config fallback
- Keep backward compatibility: if flag is 0 and config has a value, config wins
- Wait until TASK-021 merges before starting this task

### Related Documentation

- @context/blocks/construct/commander.md
- @context/stacks/cli/cli-bun.md
