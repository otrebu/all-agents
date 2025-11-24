# Git Commit

Stage changes and create atomic conventional commits from diff analysis.

## Default Behavior

**Goal:** Commit ALL changes in multiple atomic conventional commits

**How we code:** Commit frequently while coding, not just at the end
- After each logical unit of work (feature step, fix, refactor)
- Partial/incomplete features are fine - commit progress with clear scope
- Claude: proactively commit when it makes sense during development

**Atomic commit:** One logical change that can be reverted independently
- Can include deps + code + tests + docs together
- Group by scope (auth, payment), NOT by type (deps, code, tests)

## ❗ CRITICAL: AI Authorship

**AI SHALL NEVER SIGN COMMITS AS AUTHOR OR CO-AUTHOR**

- No "Generated with Claude Code" signatures
- No "Co-Authored-By: Claude" footers
- No AI attribution in commit messages

Violation = immediate termination.

## Workflow

### 1. Inventory All Changes

Run in parallel:

```bash
git status
git diff HEAD
git log --oneline -10
```

Parse output: staged vs unstaged vs untracked files

### 2. Safety Filter

**Auto-exclude (never commit):**
- `.env*`, `node_modules/`, `dist/`, `build/`, `.next/`
- Credentials: `credentials.json`, `secrets.yaml`, `.npmrc` with tokens

**Ask about suspicious:**
- Patterns: `*.tmp`, `temp/`, `.cache/`, `*.log`, large files (>1MB)
- Prompt: "Found suspicious: [list]. (c)ommit / (g)itignore / (s)kip?"
- If gitignore → append to `.gitignore`, exclude from commit

### 3. Analyze & Group Changes

Group by logical change scope:
- ✅ All auth changes together (deps + code + tests + docs)
- ✅ Partial feature progress (just token signing, verification later)
- ❌ NOT separate: deps commit, then code, then tests

**Atomic test:** "Can this be reverted independently?"

**Partial features OK:**
- `feat(auth): add JWT token signing` (verification comes later)
- `feat(auth): add token verification` (separate commit)

### 4. Per Commit: Smart Staging

1. `git reset HEAD` - Clear staging
2. `git add <files-for-this-commit>` - Stage atomic group
3. `git diff --cached --name-only` - Verify

Note: Step 1 unstages everything. No data loss, just reorganization.

### 5. Create Commit

Generate from diff:
- **Type**: feat, fix, refactor, docs, test, chore
- **Scope**: module (singular, lowercase)
- **Description**: imperative, 50-72 chars

**Format (simple):**

```bash
git commit -m "feat(auth): add JWT token signing"
```

**With body (multiple -m flags):**

```bash
git commit -m "feat(auth): add JWT token signing" -m "Implements RS256 algorithm with expiry handling."
```

**Rules:**
- Imperative: "add" not "added"
- Generate from diff, not user's words
- ❗ NEVER add AI signatures
- Atomic: one logical change per commit

### 6. Repeat

Loop steps 4-5 until all safe files committed.

### 7. Push (Optional)

**If user requested push:** Run `git push`
**Otherwise:** Ask "All committed. Push? (y/n)"

If upstream needed: `git push -u origin $(git branch --show-current)`

## Conventional Commit Types

- `feat` - New features (can include deps, tests, docs for that feature)
- `fix` - Bug fixes (can include test updates)
- `refactor` - Code restructuring without behavior change
- `docs` - Documentation only
- `test` - Tests only
- `chore` - Tooling, deps (standalone updates), config

## When to Commit

Commit frequently during development:
- After each logical unit completes
- Before switching contexts (auth → payment)
- Before risky refactors (save working state)

Don't wait for "done" - commit incremental progress.

## Examples

### Example 1: Partial Feature (WIP)

**Scenario:** Working on auth, only token signing done

```
Changes: src/auth.ts (signing only)
Commit: feat(auth): add JWT token signing

Later: src/auth.ts (verification)
Commit: feat(auth): add token verification
```

### Example 2: Complete Feature

**Scenario:** Full authentication feature with everything

```
Changes: package.json, src/auth.ts, src/auth.test.ts, docs/AUTH.md
Commit: feat(auth): add JWT authentication

(ONE commit with deps + code + tests + docs)
```

### Example 3: Multiple Independent Features

**Scenario:** Auth and payment work done in same session

```
Changes: auth files + payment files

Commits:
1. feat(auth): add JWT authentication
2. feat(payment): add Stripe integration
```

### Example 4: Safety Filter

**Scenario:** Mix of safe, dangerous, and suspicious files

```
Files: .env.local, src/config.ts, temp/debug.log

Action:
- .env.local → auto-excluded (never commit)
- temp/debug.log → ask user → picks (g)itignore
- src/config.ts → commit in feat(config): add config loader
```

## Troubleshooting

**Nothing to commit:**
- All changes already committed or no changes exist
- Response: "No changes to commit. Working tree clean."

**Pre-commit hook modified files:**
- Hook changed files after staging
- Re-run step 4 (reset, stage, verify) and retry commit

**Merge conflicts or detached HEAD:**
- Don't auto-commit, requires manual intervention
- Response: "Repository needs manual intervention (conflict/detached HEAD)"

**Large refactors (50+ files):**
- Group by module/directory
- Ask: "Large refactor (X files). Single commit or split by module?"
