# Progress

## Current Focus

**Story:** none
**Task:** TASK-011 (rename self-improvement modes)
**Status:** in progress

## Session Notes

<!-- Format: ### YYYY-MM-DDTHH:MM:SS: Brief title -->
<!-- **Refs:** link to story/tasks -->
<!-- Keep ~5 sessions, archive older to docs/planning/archive/ -->

### 2026-01-21

#### SUB-012
- **Problem:** selfImprovement.mode used confusing names (always/auto) that didn't clearly convey their meaning
- **Changes:** Renamed mode values to suggest/autofix/off across schema, types, and config default
- **Files:**
  - `docs/planning/schemas/ralph-config.schema.json` - Updated enum and description
  - `tools/src/commands/ralph/types.ts` - Updated SelfImprovementConfig mode union type
  - `tools/src/commands/ralph/config.ts` - Changed default from 'always' to 'suggest'
  - `tools/src/commands/completion/zsh.ts` - Fixed pre-existing lint error (eslint disable for shell template)

