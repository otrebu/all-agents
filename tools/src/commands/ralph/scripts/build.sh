#!/bin/bash
# Ralph Build: Subtask iteration loop using ralph-iteration.md prompt
# Usage: build.sh <subtasks-path> <max-iterations> [interactive] [perm-flag]

set -e

SUBTASKS_PATH=$1
MAX_ITERATIONS=${2:-3}
INTERACTIVE=${3:-false}
PERM_FLAG=${4:---dangerously-skip-permissions}

# Get the repo root (relative to this script location)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../../../.." && pwd)"

PROMPT_PATH="$REPO_ROOT/context/workflows/ralph/building/ralph-iteration.md"

if [ ! -f "$PROMPT_PATH" ]; then
  echo "Error: Prompt file not found: $PROMPT_PATH"
  exit 1
fi

if [ ! -f "$SUBTASKS_PATH" ]; then
  echo "Error: Subtasks file not found: $SUBTASKS_PATH"
  exit 1
fi

# Count remaining subtasks (done: false)
count_remaining() {
  # Use jq to count subtasks with done: false
  if command -v jq &> /dev/null; then
    jq '[.[] | select(.done == false or .done == null)] | length' "$SUBTASKS_PATH"
  else
    # Fallback: rough grep count
    grep -c '"done": *false' "$SUBTASKS_PATH" 2>/dev/null || echo "0"
  fi
}

iteration=1
while [ $iteration -le $MAX_ITERATIONS ]; do
  remaining=$(count_remaining)

  if [ "$remaining" -eq 0 ]; then
    echo "All subtasks complete!"
    exit 0
  fi

  echo "=== Build Iteration $iteration/$MAX_ITERATIONS (${remaining} subtasks remaining) ==="

  # Build the prompt including context files
  PROMPT="Execute one iteration of the Ralph build loop.

Follow the instructions in @${PROMPT_PATH}

Subtasks file: @${SUBTASKS_PATH}

Context files:
@${REPO_ROOT}/CLAUDE.md
@${REPO_ROOT}/docs/planning/PROGRESS.md

After completing ONE subtask:
1. Update subtasks.json with done: true, completedAt, commitHash, sessionId
2. Append to PROGRESS.md
3. Create the commit
4. STOP - do not continue to the next subtask"

  # Run Claude with the prompt
  echo "Invoking Claude..."
  claude $PERM_FLAG -p "$PROMPT" || {
    echo "Claude invocation failed on iteration $iteration"
    exit 1
  }

  # Interactive mode: pause for user confirmation
  if [ "$INTERACTIVE" = "true" ]; then
    echo ""
    read -p "Continue to next iteration? (y/n): " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
      echo "Stopped by user"
      exit 0
    fi
  fi

  ((iteration++))
done

echo "Reached max iterations ($MAX_ITERATIONS)"
remaining=$(count_remaining)
if [ "$remaining" -gt 0 ]; then
  echo "Warning: ${remaining} subtasks still incomplete"
  exit 1
fi
