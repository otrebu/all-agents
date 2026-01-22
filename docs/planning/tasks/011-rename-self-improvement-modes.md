## Task: Rename selfImprovement.mode values

### Goal
Replace confusing `always`/`auto` mode names with clearer `suggest`/`autofix`/`off` values.

### Context
Current `selfImprovement.mode` values are confusing:
- `always` means "always ask for approval" (actually = suggest)
- `auto` means "apply automatically" (actually = autofix)
- `never` exists in code but not schema (should be `off`)

New names are self-explanatory:
- `suggest` → create task files for review
- `autofix` → apply changes directly
- `off` → skip analysis

### Plan
1. Update schema enum: `docs/planning/schemas/ralph-config.schema.json`
2. Update TypeScript types: `tools/src/commands/ralph/types.ts`
3. Update default config: `tools/src/commands/ralph/config.ts`
4. Update calibrate.ts logic to use new mode names
5. Update VISION.md with mode table
6. Run typecheck to verify

### Acceptance Criteria
- [ ] Schema uses `suggest`, `autofix`, `off`
- [ ] Types match schema
- [ ] Default is `suggest`
- [ ] `calibrate.ts` handles all three modes
- [ ] VISION.md documents the modes
- [ ] `bun run typecheck` passes

### Test Plan
- [ ] `bun run typecheck` passes
- [ ] Manual: verify `ralph calibrate` respects mode setting

### Scope
- **In:** Rename mode values across schema, types, implementation
- **Out:** Changing calibration behavior itself

### Related Documentation
- @docs/planning/VISION.md (Section 3 Calibration Mode)
- @docs/planning/milestones/ralph/SPEC-SYNC-PLAN.md (selfImprovement.mode section)
