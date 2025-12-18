---
depends:
  - @context/blocks/quality/coding-style.md
---

# Start Feature

## Overview

Creates or switches to feature branches following the `feature/<slug>` naming convention. Analyzes feature descriptions to generate concise, descriptive branch names and handles branch creation or switching automatically.

## Process

### 1. Check Current Branch

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

### 2. Verify Git Status and Current Branch

Before creating or switching branches, verify current git status:

```bash
git status
```

Ensure working directory is clean or changes are properly handled.

```bash
git branch --show-current
```

Is it already a feature branch? If so ask the user if they want to branch off from here or go back to main branch first.

### 3. Check Branch Existence

Check if the branch already exists:

```bash
git branch --list feature/<slug>
```

### 4. Create or Switch

**If branch doesn't exist:**

```bash
git checkout -b feature/<slug>
```

Confirm: "Created and switched to `feature/<slug>`"

**If branch exists:**

```bash
git checkout feature/<slug>
```

Confirm: "Switched to existing `feature/<slug>`"

### 5. Confirm Ready

Output format:

- Branch name: `feature/<slug>`
- Action taken: "Created and switched to..." or "Switched to existing..."
- Ready message: "Ready to work on [feature description]"

## Constraints

- **Never** create branches outside the `feature/` prefix
- Branch names **must** be lowercase kebab-case
- If description is unclear or empty, **ask** for clarification before proceeding
- **Always** verify current git status before creating/switching branches

## Example Usage

**User request:** "Start feature for user profile editing"

**Process:**

1. Extract key words: "user", "profile", "editing" → "user-profile-edit"
2. Check: `git branch --list feature/user-profile-edit`
3. Create: `git checkout -b feature/user-profile-edit`
4. Confirm: "Created and switched to `feature/user-profile-edit`. Ready to work on user profile editing."
