#!/bin/bash
# Ralph: Interactive Claude harness (prompts after each iteration)
# Usage: ralph-interactive.sh <ignored> <prd> <progress> <perm-flag>

set -e

PRD=$2
PROGRESS=$3
PERM_FLAG=$4

PROMPT="You are implementing features from a PRD.

Read @${PRD} for features and @${PROGRESS} for history.

PRD FORMAT: Array of features with { id, category, description, steps, passes }
- passes: false = not implemented, true = verified working

WORKFLOW:
1. Find first feature with passes: false
2. Implement ONLY that single feature based on description
3. Verify using the steps (these are verification/test steps)
4. Update PRD: set passes to true only if ALL steps verify
5. Append to progress file: date, feature id, what changed
6. Commit: git commit -m 'feat(id): description'

CRITICAL: After completing ONE feature, STOP IMMEDIATELY.
Do NOT continue to the next feature.
Output <complete/> ONLY if ALL features have passes: true."

i=1
while true; do
  echo "--- Iteration $i (interactive) ---"

  result=$(claude $PERM_FLAG -p "$PROMPT" "@${PRD}" "@${PROGRESS}")

  if [[ "$result" == *"<complete/>"* ]]; then
    echo "PRD complete!"
    exit 0
  fi

  echo ""
  read -p "Continue? [y/n/d=diff/p=prd/g=log]: " choice
  case $choice in
    n|N) echo "Stopped by user"; exit 0 ;;
    d|D) git diff ;;
    p|P) cat "$PRD" ;;
    g|G) git log --oneline -10 ;;
  esac

  ((i++))
done
