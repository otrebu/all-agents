#!/bin/bash
# Ralph: Fixed iteration Claude harness
# Usage: ralph.sh <iterations> <prd> <progress> <perm-flag>

set -e

ITERATIONS=$1
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

for ((i=1; i<=ITERATIONS; i++)); do
  echo "--- Iteration $i/$ITERATIONS ---"

  result=$(claude $PERM_FLAG -p "$PROMPT" "@${PRD}" "@${PROGRESS}")

  if [[ "$result" == *"<complete/>"* ]]; then
    echo "PRD complete!"
    exit 0
  fi
done

echo "Completed $ITERATIONS iterations"
