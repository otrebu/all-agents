---
name: code-review
description: Review code for technical quality and intent alignment.
allowed-tools: Task, Bash, Read, Glob, AskUserQuestion
argument-hint: [--quick] [--intent <description|@file>]
---

# Code Review

@.claude/skills/parallel-code-review/SKILL.md

## Input: $ARGUMENTS

Pass through to the skill:
- `--quick` - Only run security and data-integrity reviewers
- `--intent <description|@file>` - Intent for alignment checking

Execute the parallel code review workflow per the loaded skill.
