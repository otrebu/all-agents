# Recovery: Model Registry Restoration + Discovery Fix

Date: 2026-02-07
Status: **Completed**

## What Happened

### Root Cause

The squash merge `c329808` took an early snapshot of the `feature/multi-cli-abstraction` branch. The branch continued evolving after the squash point — notably, `models-static.ts` was expanded from 7 models to 44 models with current identifiers and fully-qualified IDs. That expansion never landed on main.

### Two Issues

**Issue 1 (primary): Squash merge dropped the expanded model registry.**
- `models-static.ts` on main had 7 outdated models (87 lines)
- The stash (`temp-sub320-isolation`) had 44 current models (316 lines) with fully-qualified IDs
- Any model not in those 7 — like `openai/gpt-5.3-codex` — failed validation

**Issue 2 (secondary): `opencode models --json` has never worked.**
- `refresh-models.ts` spawned `opencode models --json`
- OpenCode v1.1.53 has no `--json` flag (only `--verbose` and `--refresh`)
- Discovery silently failed, `models-dynamic.ts` stayed empty
- This was masked by the expanded static list on the feature branch

### The Failing Command

```bash
aaa ralph build --subtasks docs/planning/milestones/003-ralph-workflow/subtasks.json \
  --headless --provider opencode --model openai/gpt-5.3-codex
```

Failed because `openai/gpt-5.3-codex` was not in the 7-model static registry, and dynamic discovery was broken.

## What Was Done

### Phase 0: Backup stashes
Anchored stashes with `backup/YYYYMMDD-HHMMSS/stash-{0,1}` tags to prevent GC loss.

### Phase 1: Branch
Created `fix/opencode-model-discovery` from latest `main`.

### Phase 2: Restore expanded model registry from stash
Selectively restored 3 files from `stash@{0}`:
- `models-static.ts`: 7 → 44 models (10 Claude + 34 OpenCode, including aliases like `sonnet`, `opus`, `haiku`)
- `refresh-models.ts`: `deriveFriendlyId()` preserves full `provider/model` format
- `models.ts`: improved `REFRESH_HINT` messaging

Did NOT run `git stash apply` (would pull 33 files of unrelated changes).

### Phase 3: Fixed discovery
Changed `opencode models --json` → `opencode models --verbose` and rewrote `parseOpencodeModelsOutput()`:
- Parses the verbose interleaved format (header line + JSON block per model)
- Derives cost hints from `cost.input` field
- Now input is a string (verbose text), not a parsed JSON array

### Phase 4: Added cliFormat fallback
Updated `getModelById()` to match on `cliFormat` in addition to `id`:
```typescript
getAllModels().find((m) => m.id === id || m.cliFormat === id)
```

### Phase 5: Updated tests
Updated 5 test files to match new model IDs and parsing format:
- `refresh-models.test.ts` (verbose string input, deriveFriendlyId tests)
- `model-validation.test.ts` (new model IDs, cliFormat fallback tests)
- `models.test.ts` (44 models, fully-qualified IDs)
- `model-completion.test.ts` (new model ID format)
- `provider-flag.test.ts` (claude-sonnet-4-5)

### Phase 6: Validated
- `bun run typecheck` passes
- `bun run lint` passes
- `bun test` passes (967 pass, 0 fail)
- `bun run dev ralph refresh-models --dry-run` discovers 34 models (all already in static)

## Files Modified

| File | Change |
|------|--------|
| `tools/src/commands/ralph/providers/models-static.ts` | 7 → 44 models with current identifiers |
| `tools/src/commands/ralph/refresh-models.ts` | `--json` → `--verbose` parsing, verbose format parser |
| `tools/src/commands/ralph/providers/models.ts` | cliFormat fallback in `getModelById()`, improved REFRESH_HINT |
| `tools/tests/providers/refresh-models.test.ts` | Verbose parser tests, deriveFriendlyId tests |
| `tools/tests/providers/model-validation.test.ts` | New model IDs, cliFormat fallback tests |
| `tools/tests/providers/models.test.ts` | 44-model counts, fully-qualified IDs |
| `tools/tests/completion/model-completion.test.ts` | Updated completion expectations |
| `tools/tests/e2e/provider-flag.test.ts` | Updated model ID reference |
| `docs/planning/recovering.md` | This document |

## Corrections to Original Analysis

The original `recovering.md` correctly identified that work was lost and that `opencode models --json` didn't work, but:
- Unreachable commits: **65** (not 27 as originally claimed)
- Code/config unreachable commits: **~28** (not 10)
- The stash WAS valuable — specifically for the expanded `models-static.ts` and `deriveFriendlyId` fix
- The fix required both stash restoration AND discovery rewrite (not just one or the other)

## Guardrails

- Stash backups are now anchored with git tags
- Static registry serves as a working baseline even if discovery fails
- Both short-form (`sonnet`) and full-format (`openai/gpt-5.2-codex`) IDs work
