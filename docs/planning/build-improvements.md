# Ralph Build Workflow Optimization

## Problem Statement

The current Ralph build workflow wastes **~9 minutes per iteration** on redundant validation. During a single subtask iteration:

- Lint runs 4+ times (~7 minutes total)
- Tests run 3+ times (~1.5 minutes total)
- TypeCheck runs 3+ times (~1 minute total)
- Format check runs 3+ times (~2 minutes total)

### Root Causes

1. **Pre-commit hook runs full validation** on every commit (no file filtering)
2. **Ralph Phase 5 (Validate) duplicates** what the pre-commit hook will run
3. **Tracking-only commits** (PROGRESS.md, subtasks.json) trigger full test suite
4. **No lint-staged integration** - lints ALL files instead of just changed ones
5. **No test filtering** - runs ALL tests even when only docs changed

---

## Implementation Status

### Completed (in ralph-iteration.md)

1. **Phase 5 simplified** - Now runs only specific tests, trusts pre-commit for full validation
2. **Phase 7 uses --no-verify** - Tracking commits skip redundant validation
3. **Error handling improved** - Added jq anti-patterns, pre-flight checks, error recovery

### lint-staged Setup (for target repos)

For setting up lint-staged in a target repository, see:

- **Atomic doc:** @context/blocks/scm/lint-staged-setup.md
- **Skill:** `/setup-lint-staged`

The atomic doc contains:
- Installation steps
- package.json configuration
- Smart pre-commit hook with file detection
- Verification tests
- Rollback plan

---

## Expected Time Savings

| Scenario | Before | After | Savings |
|----------|--------|-------|---------|
| Code commit | ~200s | ~80s | ~120s |
| Tracking commit | ~200s | ~5s | ~195s |
| Full iteration (2 commits) | ~550s | ~85s | **~465s (~8 min)** |

---

## Future Optimizations

### 1. TypeScript incremental compilation

In each `tsconfig.json`, add:

```json
{
  "compilerOptions": {
    "incremental": true,
    "tsBuildInfoFile": "./.tsbuildinfo"
  }
}
```

Add to `.gitignore`:
```
.tsbuildinfo
```

### 2. Parallel validation with concurrently

```bash
pnpm add -D concurrently
```

```json
{
  "scripts": {
    "validate:parallel": "concurrently -g 'pnpm:typecheck' 'pnpm:test'"
  }
}
```

### 3. Affected package filtering (monorepos)

```bash
# Only test packages affected by changes
pnpm --filter '...[HEAD~1]' run test
```

### 4. Vitest watch mode for development

```bash
# During development, use watch mode instead of full runs
pnpm exec vitest --watch
```

---

## Summary

The key insight is **separation of concerns**:

1. **lint-staged** handles formatting/linting of staged files only
2. **Smart pre-commit** skips tests for non-code changes
3. **--no-verify** for tracking commits avoids redundant validation
4. **Ralph workflow** trusts the hooks instead of duplicating checks

This reduces iteration time from **~12 minutes to ~4 minutes** - a 3x improvement.
