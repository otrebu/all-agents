---
depends:
  - @context/blocks/principles/coding-style.md
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

### 4. Switch to Main

Determine main branch (`git branch --list main master`), then:

```bash
git checkout main  # or master
```

### 5. Pull Latest

```bash
git pull origin main  # or master
```

### 6. Merge Feature Branch

```bash
git merge $FEATURE_BRANCH
```

Conflicts? List files via `git status`, wait for user resolution: `git add .` + `git commit`

### 7. Push

```bash
git push origin main  # or master
```

### 8. Delete Feature Branch?

Ask user:

**Local:**

```bash
git branch -d $FEATURE_BRANCH
```

**Remote:**

```bash
git push origin --delete $FEATURE_BRANCH
```

### 9. Confirm Completion

Output:

- Merged branch: `<feature-branch-name>`
- Push status
- Deletion status (if applicable)

## Constraints

- Pull main before merge
- Verify clean working dir before branch switch
- Never force push to main
- User resolves conflicts
- Always ask before deleting branches

## Example

User: "Finish user-auth feature"

1. On `feature/user-auth`, `git status` clean
2. `git checkout main && git pull origin main`
3. `git merge feature/user-auth && git push origin main`
4. Ask: Delete branch? → User confirms
5. Output: "Feature 'user-auth' merged to main, pushed, branch deleted"
