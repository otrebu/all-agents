---
depends:
  - @context/blocks/quality/coding-style.md
  - @context/blocks/scm/git-worktree.md
---

# Complete Feature

## Process

### 1. Detect Context

Determine if you're in a worktree or the main repo, and find the main repo path:

```bash
# .git is a file in worktrees, a directory in the main repo
[ -f .git ] && echo "worktree" || echo "main repo"

# Always resolve the main repo path (first entry in worktree list)
MAIN_REPO=$(git worktree list --porcelain | head -1 | sed 's/worktree //')
```

Also store the current worktree path for cleanup later:

```bash
WORKTREE_DIR=$(pwd)
```

### 2. Verify Current Branch

Run `git branch --show-current`:

- If main/master: Ask which feature branch to merge
- If feature branch: Confirm this branch

### 3. Check Working Directory

Run `git status`:

- Uncommitted changes? Ask: commit or stash?
- Clean? Proceed

### 4. Store Feature Branch Name

```bash
FEATURE_BRANCH=$(git branch --show-current)
```

### 5. Interrogation Checkpoint (Optional)

For non-trivial changes, consider `/dev:interrogate changes` before squashing to surface assumptions and confidence levels.

### 6. Squash Commits

Review commits to summarize, then squash:

```bash
git log --oneline main..HEAD  # see what you're squashing
git reset --soft main         # keeps changes staged, removes commits
git commit -m "feat(scope): summary" -m "- change 1
- change 2"
```

**Commit message format:**
- Title: conventional commit summarizing the feature
- Body: bullet list of key changes from squashed commits
- The `cc-session-id` trailer is automatically added by the prepare-commit-msg hook

### 7. Navigate to Main Repo

**Before merging or pushing**, cd to the main repo. This avoids CWD invalidation — pre-push hooks (builds, etc.) can break the worktree path:

```bash
cd "$MAIN_REPO"
```

### 8. Merge and Push

```bash
git pull origin main
git merge --ff-only $FEATURE_BRANCH
git push origin main
```

If FF fails (main moved ahead), go back to the worktree and rebase on main first.

> **Important**: Semantic-release creates version commits (`chore(release): x.y.z`) after every push to main. Always pull before pushing to avoid diverged history.

### 9. Clean Up Worktree

Already in the main repo from step 7. Remove the worktree, **keep the branch** for history/reference:

```bash
git worktree remove "$WORKTREE_DIR"
git worktree prune
```

### 10. Confirm Completion

Output:

- Merged branch: `<feature-branch-name>`
- Push status
- Worktree removed

## Fallback (without worktrees)

If not using worktrees, use the traditional checkout flow for steps 7-9:

```bash
git checkout main
git pull origin main
git merge --ff-only $FEATURE_BRANCH
git push origin main
```

## Constraints

- Squash commits before merging for clean history
- Use `--ff-only` to ensure linear history
- Pull main before merge
- Verify clean working dir before squash
- Never force push to main
- **cd to main repo before push** — pre-push hooks can invalidate worktree CWD
- **Do not delete branches** — keep them for history/reference
- **DO NOT add AI signatures/co-author footers to commits**

## Example

User: "Finish user-auth feature"

1. On `feature/user-auth` in worktree, `git status` clean
2. `MAIN_REPO=$(git worktree list --porcelain | head -1 | sed 's/worktree //')`
3. `WORKTREE_DIR=$(pwd)`
4. `git log --oneline main..HEAD` → 3 commits
5. `git reset --soft main && git commit -m "feat(auth): add user auth" -m "- login/logout\n- session handling"`
6. `cd "$MAIN_REPO"`
7. `git pull origin main && git merge --ff-only feature/user-auth && git push origin main`
8. `git worktree remove "$WORKTREE_DIR" && git worktree prune`
9. Output: "Feature 'user-auth' merged to main, pushed, worktree removed"
