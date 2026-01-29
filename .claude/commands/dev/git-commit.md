---
allowed-tools: Bash(git status), Bash(git diff:*), Bash(git add:*), Bash(git commit -m:*), Bash(git pull:*), Bash(git log:*), Bash(git reset:*)
argument-hint: [all|<files>]
description: Create conventional commit
model: haiku
---

## Context

- Status: !`git status --short`
- Diff: !`git diff HEAD`

## Task

Follow @context/workflows/commit.md

If `$ARGUMENTS` empty → ask: all changes or specific files?
