# Git Commit (Simple)

Ask user if they want to commit all changes or just some changes, if not clear.
MANDATORY: DO NOT MAKE CHANGES TO FILES AT THIS STAGE UNLESS THE USER APPROVES THEM.
Create a conventional commit message for the changes.

## ❗ No AI Authorship

Never sign commits as author/co-author. No AI signatures.

## Workflow

1. `git status` + `git diff HEAD` - review changes
2. `git add <files>` - stage
3. Commit:

```bash
git commit -m "type(scope): description"
```

## Types

feat | fix | refactor | docs | test | chore

## Rules

- Imperative: "add" not "added"
- 50-72 chars

## Working on Main

This repo uses semantic-release which auto-creates version commits on push to main.

**Always pull before committing to main:**

```bash
git pull origin main
```

**Best practice**: Use feature branches, then merge to main.
