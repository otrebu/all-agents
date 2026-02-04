# lint-staged Setup

Optimized pre-commit validation using lint-staged to only check staged files.

## Why lint-staged Over Shell Scripts

| Concern | lint-staged | Shell script |
|---------|-------------|--------------|
| Spaces in filenames | Handled | Fragile |
| Partial staging | Correct | May check unstaged |
| Auto-fix + re-stage | Built-in | Manual |
| Edge cases | Battle-tested | DIY |

## Installation

```bash
# npm
npm add -D lint-staged

# pnpm
pnpm add -D lint-staged

# bun
bun add -D lint-staged
```

## Configuration

Add to `package.json`:

```json
{
  "lint-staged": {
    "*.{ts,tsx}": [
      "eslint --fix --max-warnings 0",
      "prettier --write"
    ],
    "*.{js,jsx,mjs,cjs}": [
      "eslint --fix --max-warnings 0",
      "prettier --write"
    ],
    "*.{json,md,yml,yaml}": [
      "prettier --write"
    ],
    "*.{css,scss}": [
      "prettier --write"
    ]
  }
}
```

## Helper Scripts

Add to `package.json`:

```json
{
  "scripts": {
    "test:changed": "vitest run --changed HEAD~1",
    "validate:quick": "lint-staged && bun run typecheck",
    "validate:full": "bun run lint && bun run typecheck && bun test"
  }
}
```

**Note:** Adjust `vitest` to your test runner (jest, bun:test, etc.).

## Smart Pre-commit Hook

Replace `.husky/pre-commit` (or your hook runner equivalent):

```bash
#!/bin/sh
set -e

echo "Running pre-commit checks..."

# Get list of staged files
STAGED_FILES=$(git diff --cached --name-only --diff-filter=ACMR)

# Check file types
HAS_CODE=$(echo "$STAGED_FILES" | grep -E '\.(ts|tsx|js|jsx)$' || true)

# Always run lint-staged (fast - only staged files)
echo "Running lint-staged..."
pnpm exec lint-staged

# Only run typecheck if code files changed
if [ -n "$HAS_CODE" ]; then
  echo "Code files changed - running typecheck..."
  pnpm run typecheck
else
  echo "No code changes - skipping typecheck"
fi

# Only run tests if code files changed
if [ -n "$HAS_CODE" ]; then
  echo "Code files changed - running tests..."
  pnpm run test
else
  echo "No code changes - skipping tests"
fi

echo "Pre-commit checks passed!"
```

Make executable:
```bash
chmod +x .husky/pre-commit
```

## Verification

### Test 1: Docs-only commit skips tests

```bash
echo "test" >> README.md
git add README.md
git commit -m "test: docs only commit"
# Should see: "No code changes - skipping tests"
git reset HEAD~1
git checkout README.md
```

### Test 2: Code change runs tests

```bash
# Make a small code change
git add <changed-file>.ts
git commit -m "test: code commit"
# Should see: "Code files changed - running tests..."
```

### Test 3: lint-staged only checks staged files

```bash
# Stage only one file
git add src/some-file.ts
git commit -m "test"
# Lint should only run on src/some-file.ts, not all files
```

## Rollback

If issues arise, revert to a simple pre-commit hook:

```bash
cat > .husky/pre-commit << 'EOF'
#!/bin/sh
pnpm lint:fix && pnpm format:check && pnpm typecheck && pnpm test
EOF
chmod +x .husky/pre-commit
```
