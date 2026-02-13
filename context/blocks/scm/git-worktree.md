## git worktree

Parallel working directories from a single repo. Each worktree has its own checked-out branch.

### Folder Convention

```
<repo>/                          # main repo (main branch)
<repo>-worktrees/
  feature-user-auth/             # worktree (feature/user-auth branch)
  feature-dark-mode/             # worktree (feature/dark-mode branch)
```

### Core Commands

```bash
# Create worktree with new branch
git worktree add ../repo-worktrees/feature-slug -b feature/slug

# Create worktree for existing branch
git worktree add ../repo-worktrees/feature-slug feature/slug

# List all worktrees
git worktree list

# Remove worktree
git worktree remove ../repo-worktrees/feature-slug

# Clean up stale references
git worktree prune
```

### Finding the Main Repo

Works correctly from any worktree:

```bash
MAIN_REPO=$(git worktree list --porcelain | head -1 | sed 's/worktree //')
```

### Key Rules

- A branch can only be checked out in **one** worktree at a time
- Worktrees share the same `.git` object store — commits are visible across all
- `git worktree list` always shows the correct topology from any worktree
- Delete the branch separately if needed (`git branch -d <branch>`)
