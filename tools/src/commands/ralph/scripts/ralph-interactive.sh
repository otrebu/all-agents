#!/bin/bash
# Ralph: Interactive Claude harness (prompts after each iteration)
# Usage: ralph-interactive.sh <ignored> <prd> <progress> <perm-flag>

set -e

PRD=$2
PROGRESS=$3
PERM_FLAG=$4

PROMPT="You are implementing features from a PRD.

Read @${PRD} for features and @${PROGRESS} for history.

WORKFLOW:
1. Find highest-priority pending feature (or in_progress if any)
2. Implement ONLY that single feature
3. Run the testCommand from PRD
4. Update PRD: set status to 'done' only if tests pass
5. Append to progress file: date, feature id, what changed
6. Commit: git commit -m 'feat(id): description'

CRITICAL: After completing ONE feature, STOP IMMEDIATELY.
Do NOT continue to the next feature.
Output <complete/> ONLY if ALL features have status 'done'."

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
