---
depends:
  - @context/blocks/quality/coding-style.md
  - @context/blocks/scm/git-gtr.md
---

# Complete Feature

## Process

### 1. Detect Context

Determine if you're in a worktree or the main repo:

```bash
# .git is a file in worktrees, a directory in the main repo
[ -f .git ] && echo "worktree" || echo "main repo"
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

### 7. Merge to Main (via worktree)

Run these commands from the feature worktree — `git gtr run 1` executes in the main repo:

```bash
git gtr run 1 git pull origin main
git gtr run 1 git merge --ff-only $FEATURE_BRANCH
git gtr run 1 git push origin main
```

If FF fails (main moved ahead), rebase feature branch on main first.

> **Important**: Semantic-release creates version commits (`chore(release): x.y.z`) after every push to main. Always pull before pushing to avoid diverged history.

### 8. Clean Up Worktree

Navigate to main repo and remove the worktree. **Do not delete the branch** — keep it for history/reference:

```bash
cd "$(git gtr go 1)" && git gtr rm $FEATURE_BRANCH
```

### 9. Confirm Completion

Output:

- Merged branch: `<feature-branch-name>`
- Push status
- Worktree removed

## Fallback (without git-gtr)

If `git gtr` is unavailable, use the traditional checkout flow for steps 7-8:

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
- **Prefer `git gtr run 1`** over `git checkout main` for merge operations
- **Do not delete branches** — keep them for history/reference
- **DO NOT add AI signatures/co-author footers to commits**

## Example

User: "Finish user-auth feature"

1. On `feature/user-auth` in worktree, `git status` clean
2. `git log --oneline main..HEAD` → 3 commits
3. `git reset --soft main && git commit -m "feat(auth): add user auth" -m "- login/logout\n- session handling"`
4. `git gtr run 1 git pull origin main`
5. `git gtr run 1 git merge --ff-only feature/user-auth && git gtr run 1 git push origin main`
6. `cd "$(git gtr go 1)" && git gtr rm feature/user-auth`
7. Output: "Feature 'user-auth' merged to main, pushed, worktree removed"
