## git worktree

Parallel working directories from a single repo. Each worktree has its own checked-out branch.

### Folder Convention

```
<repo>/                          # main repo (main branch)
<repo>-feature-user-auth/        # worktree (feature/user-auth branch)
<repo>-feature-dark-mode/        # worktree (feature/dark-mode branch)
```

Worktrees are flat siblings of the main repo, not nested in a container directory.

### Core Commands

```bash
# Create worktree with new branch
git worktree add ../repo-feature-slug -b feature/slug

# Create worktree for existing branch
git worktree add ../repo-feature-slug feature/slug

# List all worktrees
git worktree list

# Remove worktree
git worktree remove ../repo-feature-slug

# Clean up stale references
git worktree prune
```

### Finding the Main Repo

Works correctly from any worktree:

```bash
MAIN_REPO=$(git worktree list --porcelain | head -1 | sed 's/worktree //')
```

### Skip-Worktree for Local Overrides

Hide local changes to tracked files from `git status`. Useful when `context/` is tracked
but locally replaced with a symlink via `aaa setup --project`.

```bash
# Mark file — git ignores local changes
git update-index --skip-worktree context

# Undo — git tracks changes again
git update-index --no-skip-worktree context

# List skip-worktree files
git ls-files -v | grep '^S'
```

Notes:
- Per-file, per-worktree (each worktree has its own index)
- Cannot be set on `git clone` — automated via `aaa setup --project`
- `.gitignore` does NOT work for already-tracked files
- If remote changes the file, you'll get a merge conflict on pull

### Key Rules

- A branch can only be checked out in **one** worktree at a time
- Worktrees share the same `.git` object store — commits are visible across all
- `git worktree list` always shows the correct topology from any worktree
- Delete the branch separately if needed (`git branch -d <branch>`)
