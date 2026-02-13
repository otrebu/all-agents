---
depends:
  - @context/blocks/quality/coding-style.md
  - @context/blocks/scm/git-worktree.md
---

# Start Feature

## Overview

Creates a feature worktree following the `feature/<slug>` naming convention. Analyzes feature descriptions to generate concise, descriptive branch names and creates an isolated worktree for development.

## Process

### 1. Parse Feature Description

Extract 2-4 key words that capture the essence of the feature from the description.

**Branch naming rules:**

- Format: `feature/<slug>`
- Slug: 2-4 words, kebab-case
- Extract core concept from description
- Avoid redundant words: "feature", "new", "add"

**Examples:**

- "user authentication" → `feature/user-auth`
- "dark mode toggle" → `feature/dark-mode`
- "add pagination to table component" → `feature/table-pagination`
- "refactor the api client" → `feature/api-refactor`

### 2. Create Worktree

Derive the worktree directory from the repo root, following the `<repo>-worktrees/` convention:

```bash
REPO_ROOT=$(git rev-parse --show-toplevel)
WORKTREE_DIR="${REPO_ROOT}-worktrees/feature-<slug>"
git worktree add "$WORKTREE_DIR" -b feature/<slug>
```

This creates an isolated worktree branching from the current HEAD. No need to handle uncommitted changes — worktrees don't affect each other.

**If worktree already exists:** Skip creation, resolve the path and proceed to navigation.

### 3. Navigate to Worktree

```bash
cd "$WORKTREE_DIR"
```

### 4. Confirm Ready

Output format:

- Branch name: `feature/<slug>`
- Worktree path: the absolute path
- Action taken: "Created worktree for..." or "Navigated to existing worktree..."
- Ready message: "Ready to work on [feature description]"

## Fallback (without worktrees)

If worktrees aren't suitable (e.g., shallow clone), use the traditional checkout flow:

```bash
git checkout main
git pull origin main
git checkout -b feature/<slug>
```

## Constraints

- **Never** create branches outside the `feature/` prefix
- Branch names **must** be lowercase kebab-case
- If description is unclear or empty, **ask** for clarification before proceeding
- **Prefer worktree** (`git worktree add`) over checkout (`git checkout -b`)
- Worktree folder convention: `<repo>-worktrees/<branch-slug>/`

## Example Usage

**User request:** "Start feature for user profile editing"

**Process:**

1. Extract key words: "user", "profile", "editing" → "user-profile-edit"
2. Compute path: `WORKTREE_DIR="${REPO_ROOT}-worktrees/feature-user-profile-edit"`
3. Create: `git worktree add "$WORKTREE_DIR" -b feature/user-profile-edit`
4. Navigate: `cd "$WORKTREE_DIR"`
5. Confirm: "Created worktree for `feature/user-profile-edit`. Ready to work on user profile editing."
