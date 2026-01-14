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

# Get first incomplete subtask ID
get_next_subtask_id() {
  if command -v jq &> /dev/null; then
    jq -r '[.[] | select(.done == false or .done == null)] | .[0].id // ""' "$SUBTASKS_PATH"
  else
    echo ""
  fi
}

# Track retry attempts per subtask
declare -A SUBTASK_ATTEMPTS

iteration=1
while true; do
  remaining=$(count_remaining)

  if [ "$remaining" -eq 0 ]; then
    echo "All subtasks complete!"
    exit 0
  fi

  # Get the next subtask to work on
  current_subtask=$(get_next_subtask_id)

  if [ -z "$current_subtask" ]; then
    echo "Error: Could not determine next subtask"
    exit 1
  fi

  # Track attempts for this specific subtask
  attempts=${SUBTASK_ATTEMPTS[$current_subtask]:-0}
  ((attempts++))
  SUBTASK_ATTEMPTS[$current_subtask]=$attempts

  # Check if we've exceeded max iterations for this subtask
  if [ "$attempts" -gt "$MAX_ITERATIONS" ]; then
    echo "Error: Max iterations ($MAX_ITERATIONS) exceeded for subtask: $current_subtask"
    echo "Subtask failed after $MAX_ITERATIONS attempts"
    exit 1
  fi

  echo "=== Build Iteration $iteration (Subtask: $current_subtask, Attempt: $attempts/$MAX_ITERATIONS, ${remaining} subtasks remaining) ==="

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

  # Check if subtask was completed (count changed)
  new_remaining=$(count_remaining)
  if [ "$new_remaining" -lt "$remaining" ]; then
    # Subtask was completed, reset doesn't apply
    echo "Subtask $current_subtask completed successfully"
  fi

  ((iteration++))
done
