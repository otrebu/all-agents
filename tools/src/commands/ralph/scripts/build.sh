#!/bin/bash
# Ralph Build: Subtask iteration loop using ralph-iteration.md prompt
# Usage: build.sh <subtasks-path> <max-iterations> [interactive] [validate-first] [perm-flag]

set -e

SUBTASKS_PATH=$1
MAX_ITERATIONS=${2:-3}
INTERACTIVE=${3:-false}
VALIDATE_FIRST=${4:-false}
PERM_FLAG=${5:---dangerously-skip-permissions}

# Get the repo root (relative to this script location)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../../../.." && pwd)"

PROMPT_PATH="$REPO_ROOT/context/workflows/ralph/building/ralph-iteration.md"
VALIDATION_PROMPT_PATH="$REPO_ROOT/context/workflows/ralph/building/pre-build-validation.md"
CONFIG_PATH="$REPO_ROOT/ralph.config.json"

# Read hook configuration from ralph.config.json
read_hook_config() {
  local hook_name="$1"
  local default_actions="$2"

  if [ ! -f "$CONFIG_PATH" ]; then
    echo "$default_actions"
    return
  fi

  if command -v jq &> /dev/null; then
    local actions
    actions=$(jq -r ".hooks.$hook_name.actions // empty" "$CONFIG_PATH" 2>/dev/null)
    if [ -n "$actions" ] && [ "$actions" != "null" ]; then
      echo "$actions"
    else
      echo "$default_actions"
    fi
  else
    echo "$default_actions"
  fi
}

# Execute hook actions based on configuration
execute_hook() {
  local hook_name="$1"
  local context="$2"
  local default_actions="$3"

  echo "=== Triggering hook: $hook_name ==="

  local actions
  actions=$(read_hook_config "$hook_name" "$default_actions")

  # Parse actions array and execute each action
  if command -v jq &> /dev/null && [ -f "$CONFIG_PATH" ]; then
    # Get actions as newline-separated list
    local action_list
    action_list=$(jq -r ".hooks.$hook_name.actions // [\"log\"] | .[]" "$CONFIG_PATH" 2>/dev/null)

    if [ -z "$action_list" ]; then
      action_list="log"
    fi

    while IFS= read -r action; do
      case "$action" in
        log)
          echo "[Hook:$hook_name] $context"
          ;;
        notify)
          # Read ntfy configuration and send notification
          local ntfy_topic
          local ntfy_server
          ntfy_topic=$(jq -r '.ntfy.topic // empty' "$CONFIG_PATH" 2>/dev/null)
          ntfy_server=$(jq -r '.ntfy.server // "https://ntfy.sh"' "$CONFIG_PATH" 2>/dev/null)

          if [ -n "$ntfy_topic" ] && [ "$ntfy_topic" != "your-ntfy-topic" ]; then
            echo "[Hook:$hook_name] Sending notification to $ntfy_server/$ntfy_topic"
            curl -s -X POST "$ntfy_server/$ntfy_topic" \
              -H "Title: Ralph Build: $hook_name" \
              -d "$context" 2>/dev/null || echo "[Hook:$hook_name] Notification failed"
          else
            echo "[Hook:$hook_name] notify action: ntfy topic not configured"
          fi
          ;;
        pause)
          echo "[Hook:$hook_name] Pausing for user intervention..."
          read -p "Press Enter to continue or Ctrl+C to abort: "
          ;;
        *)
          echo "[Hook:$hook_name] Unknown action: $action"
          ;;
      esac
    done <<< "$action_list"
  else
    # Fallback: just log if jq not available
    echo "[Hook:$hook_name] $context"
  fi
}

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

# Run pre-build validation if requested
run_pre_build_validation() {
  echo "=== Running Pre-Build Validation ==="

  if [ ! -f "$VALIDATION_PROMPT_PATH" ]; then
    echo "Error: Pre-build validation prompt not found: $VALIDATION_PROMPT_PATH"
    exit 1
  fi

  # Get the next subtask to validate
  local subtask_id
  subtask_id=$(get_next_subtask_id)

  if [ -z "$subtask_id" ]; then
    echo "No pending subtasks to validate"
    return 0
  fi

  echo "Validating subtask: $subtask_id"

  # Build validation prompt with subtask context
  local VALIDATION_PROMPT="Execute pre-build validation check.

Follow the instructions in @${VALIDATION_PROMPT_PATH}

Subtasks file: @${SUBTASKS_PATH}
Subtask to validate: ${subtask_id}

Context files:
@${REPO_ROOT}/CLAUDE.md
@${REPO_ROOT}/docs/planning/PROGRESS.md

Output JSON with format: {\"aligned\": true/false, \"reason\": \"...\" (if aligned is false)}"

  # Run Claude for validation (capture output for result check)
  local validation_output
  validation_output=$(claude $PERM_FLAG --output-format json -p "$VALIDATION_PROMPT" 2>&1) || {
    echo "Pre-build validation failed to execute"
    echo "$validation_output"
    exit 1
  }

  echo "Validation output:"
  echo "$validation_output"

  # Check validation result - look for aligned: false in the output
  if echo "$validation_output" | grep -q '"aligned"[[:space:]]*:[[:space:]]*false'; then
    echo ""
    echo "Pre-build validation FAILED: Subtask is not aligned"
    echo "Please review the validation output and fix alignment issues before building."
    exit 1
  fi

  echo ""
  echo "Pre-build validation PASSED: Subtask is aligned"
  echo ""
}

if [ "$VALIDATE_FIRST" = "true" ]; then
  run_pre_build_validation
fi

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

    # Trigger onMaxIterationsExceeded hook
    execute_hook "onMaxIterationsExceeded" \
      "Subtask '$current_subtask' failed after $MAX_ITERATIONS attempts" \
      '["log", "notify", "pause"]'

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

  # Run Claude with the prompt (capture JSON output for session_id extraction)
  echo "Invoking Claude..."
  CLAUDE_OUTPUT=$(claude $PERM_FLAG --output-format json -p "$PROMPT" 2>&1) || {
    echo "Claude invocation failed on iteration $iteration"
    echo "$CLAUDE_OUTPUT"
    exit 1
  }

  # Display the output (Claude's response is in the result field for JSON output)
  echo "$CLAUDE_OUTPUT"

  # Extract session_id from Claude's JSON output
  SESSION_ID=""
  if command -v jq &> /dev/null; then
    # Try to extract session_id from the JSON output
    SESSION_ID=$(echo "$CLAUDE_OUTPUT" | jq -r '.session_id // empty' 2>/dev/null || echo "")
  fi

  # Export session_id for hooks
  if [ -n "$SESSION_ID" ]; then
    export RALPH_SESSION_ID="$SESSION_ID"
    echo "Session ID captured: $SESSION_ID"
  else
    echo "Note: Could not extract session_id from Claude output"
  fi

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
