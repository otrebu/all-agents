---
depends:
  - @context/blocks/quality/coding-style.md
---

# Complete Feature

## Process

### 1. Verify Current Branch

Run `git branch --show-current`:

- If main/master: Ask which feature branch to merge
- If feature branch: Confirm this branch

### 2. Check Working Directory

Run `git status`:

- Uncommitted changes? Ask: commit or stash?
- Clean? Proceed

### 3. Store Feature Branch Name

```bash
FEATURE_BRANCH=$(git branch --show-current)
```

### 4. Interrogation Checkpoint (Optional)

For non-trivial changes, consider `/dev:interrogate changes` before squashing to surface assumptions and confidence levels.

### 5. Squash Commits

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

### 6. Switch to Main

Determine main branch (`git branch --list main master`), then:

```bash
git checkout main  # or master
```

### 7. Pull Latest

```bash
git pull origin main  # or master
```

> **Important**: Semantic-release creates version commits (`chore(release): x.y.z`) after every push to main. Always pull before pushing to avoid diverged history.

### 8. Fast-Forward Merge

```bash
git merge --ff-only $FEATURE_BRANCH
```

If FF fails (main moved ahead), rebase feature branch on main first.

### 9. Push

```bash
git push origin main  # or master
```

### 10. Confirm Completion

Output:

- Merged branch: `<feature-branch-name>`
- Push status

## Constraints

- Squash commits before merging for clean history
- Use `--ff-only` to ensure linear history
- Pull main before merge
- Verify clean working dir before branch switch
- Never force push to main
- **DO NOT add AI signatures/co-author footers to commits**

## Example

User: "Finish user-auth feature"

1. On `feature/user-auth`, `git status` clean
2. `git log --oneline main..HEAD` → 3 commits
3. `git reset --soft main && git commit -m "feat(auth): add user auth" -m "- login/logout\n- session handling"`
4. `git checkout main && git pull origin main`
5. `git merge --ff-only feature/user-auth && git push origin main`
6. Output: "Feature 'user-auth' merged to main, pushed"
