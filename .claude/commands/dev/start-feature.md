---
name: dev:start-feature
description: Create or switch to feature branches with proper naming conventions. Use when user wants to start working on a new feature, start a feature. Generates feature/branch-name patterns from descriptions, checks existence, and creates/switches accordingly.
allowed-tools: Bash(git status:*), Bash(git branch:*), Bash(git checkout:*), Bash(git fetch:*)
argument-hint: <feature-description>
---

If `$ARGUMENTS` empty → ask: "What feature are you working on?"

@context/workflows/start-feature.md
