## git-gtr (git-worktree-runner)

Worktree management CLI. Wraps `git worktree` with convention-based folder naming and config-driven defaults.

### Core Commands

| Command | Purpose |
|---------|---------|
| `git gtr new <branch>` | Create worktree (folder named after branch) |
| `git gtr go <branch>` | Print worktree path (for `cd`) |
| `git gtr run <branch> <cmd...>` | Execute command in worktree directory |
| `git gtr list` | List all worktrees |
| `git gtr rm <branch>` | Remove worktree (`--delete-branch` to also delete branch) |
| `git gtr clean` | Remove stale worktrees (`--merged` for merged PRs) |
| `git gtr copy <target>` | Copy files from main repo to worktree |
| `git gtr editor <branch>` | Open worktree in editor |
| `git gtr ai <branch>` | Start AI tool in worktree |

### Special ID `1`

`1` always refers to the **main repo root**:

```bash
git gtr go 1              # path to main repo
git gtr run 1 git status  # run command in main repo
git gtr editor 1          # open main repo in editor
```

### Key Config

```bash
git gtr config set gtr.editor.default cursor
git gtr config set gtr.ai.default claude
git gtr config add gtr.copy.include ".env*"
git gtr config add gtr.hook.postCreate "npm install"
```

### Shell Integration

```bash
# Add to ~/.zshrc (or ~/.bashrc)
eval "$(git gtr init zsh)"

# Enables:
gtr cd my-feature          # cd directly into worktree
gtr cd 1                   # cd to main repo
```

### Typical Workflow

```bash
git gtr new feature/user-auth          # create worktree
cd "$(git gtr go feature/user-auth)"   # navigate to it
# ... work ...
git gtr rm feature/user-auth           # remove worktree (keeps branch)
```
