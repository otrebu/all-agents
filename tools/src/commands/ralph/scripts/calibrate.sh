#!/bin/bash
# Ralph Calibrate: Run calibration prompts (intention drift, technical drift, self-improvement)
# Usage: calibrate.sh <subcommand> [options]
#
# Subcommands:
#   intention    - Check for intention drift (code vs planning docs)
#   technical    - Check for technical drift (code quality issues)
#   improve      - Run self-improvement analysis on session logs
#   all          - Run all calibration checks sequentially
#
# Options:
#   --force      - Skip approval even if config says "always"
#   --review     - Require approval even if config says "auto"

set -e

SUBCOMMAND=${1:-""}
shift || true

# Parse options
FORCE_FLAG=false
REVIEW_FLAG=false
while [[ $# -gt 0 ]]; do
  case $1 in
    --force)
      FORCE_FLAG=true
      shift
      ;;
    --review)
      REVIEW_FLAG=true
      shift
      ;;
    *)
      shift
      ;;
  esac
done

# Get the repo root (relative to this script location)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../../../.." && pwd)"

# Prompt paths
INTENTION_DRIFT_PROMPT="$REPO_ROOT/context/workflows/ralph/calibration/intention-drift.md"
TECHNICAL_DRIFT_PROMPT="$REPO_ROOT/context/workflows/ralph/calibration/technical-drift.md"
SELF_IMPROVEMENT_PROMPT="$REPO_ROOT/context/workflows/ralph/calibration/self-improvement.md"

# Default paths
CONFIG_PATH="$REPO_ROOT/ralph.config.json"
DEFAULT_SUBTASKS_PATH="$REPO_ROOT/subtasks.json"
SUBTASKS_PATH=${SUBTASKS_PATH:-$DEFAULT_SUBTASKS_PATH}

# Permission flag for Claude
PERM_FLAG="--dangerously-skip-permissions"

# JSON query helper - uses jq if available, falls back to Node.js
json_query() {
  local file="$1"
  local query="$2"
  local default="$3"

  if command -v jq &> /dev/null; then
    local result
    result=$(jq -r "$query" "$file" 2>/dev/null)
    if [ -n "$result" ] && [ "$result" != "null" ]; then
      echo "$result"
    else
      echo "$default"
    fi
  elif command -v node &> /dev/null; then
    local result
    result=$(node -e "
      const fs = require('fs');
      try {
        const data = JSON.parse(fs.readFileSync('$file', 'utf8'));
        const query = '$query';
        const parts = query.replace(/^\\./, '').split('.');
        let val = data;
        for (const part of parts) {
          if (val === undefined || val === null) break;
          val = val[part];
        }
        if (val !== undefined && val !== null) {
          console.log(val);
        } else {
          console.log('$default');
        }
      } catch (e) {
        console.log('$default');
      }
    " 2>/dev/null)
    echo "$result"
  else
    echo "$default"
  fi
}

# Get completed subtasks with commitHash
get_completed_subtasks() {
  if [ ! -f "$SUBTASKS_PATH" ]; then
    echo ""
    return
  fi

  if command -v jq &> /dev/null; then
    jq -c '[.[] | select(.done == true and .commitHash != null)]' "$SUBTASKS_PATH" 2>/dev/null || echo "[]"
  elif command -v node &> /dev/null; then
    node -e "
      const fs = require('fs');
      try {
        const data = JSON.parse(fs.readFileSync('$SUBTASKS_PATH', 'utf8'));
        const completed = data.filter(s => s.done && s.commitHash);
        console.log(JSON.stringify(completed));
      } catch (e) { console.log('[]'); }
    " 2>/dev/null
  else
    echo "[]"
  fi
}

# Determine approval mode
get_approval_mode() {
  local config_setting="auto"

  if [ -f "$CONFIG_PATH" ]; then
    config_setting=$(json_query "$CONFIG_PATH" ".driftTasks" "auto")
  fi

  # CLI overrides
  if [ "$FORCE_FLAG" = "true" ]; then
    echo "force"
  elif [ "$REVIEW_FLAG" = "true" ]; then
    echo "review"
  else
    echo "$config_setting"
  fi
}

# Show help message
show_help() {
  echo "Ralph Calibrate - Run calibration checks on completed subtasks"
  echo ""
  echo "Usage: aaa ralph calibrate <subcommand> [options]"
  echo ""
  echo "Subcommands:"
  echo "  intention    Check for intention drift (code vs planning docs)"
  echo "  technical    Check for technical drift (code quality issues)"
  echo "  improve      Run self-improvement analysis on session logs"
  echo "  all          Run all calibration checks sequentially"
  echo ""
  echo "Options:"
  echo "  --force      Skip approval even if config says 'always'"
  echo "  --review     Require approval even if config says 'auto'"
  echo "  --help       Show this help message"
  echo ""
  echo "Examples:"
  echo "  aaa ralph calibrate intention"
  echo "  aaa ralph calibrate intention --force"
  echo "  aaa ralph calibrate all --review"
  exit 0
}

# Run intention drift check
run_intention_check() {
  echo "=== Running Intention Drift Check ==="

  if [ ! -f "$INTENTION_DRIFT_PROMPT" ]; then
    echo "Error: Intention drift prompt not found: $INTENTION_DRIFT_PROMPT"
    exit 1
  fi

  if [ ! -f "$SUBTASKS_PATH" ]; then
    echo "Error: Subtasks file not found: $SUBTASKS_PATH"
    echo "Please create a subtasks.json file or specify the path with SUBTASKS_PATH environment variable."
    exit 1
  fi

  # Check for completed subtasks
  local completed
  completed=$(get_completed_subtasks)

  if [ "$completed" = "[]" ] || [ -z "$completed" ]; then
    echo "No completed subtasks with commitHash found. Nothing to analyze."
    return 0
  fi

  # Determine approval mode
  local approval_mode
  approval_mode=$(get_approval_mode)
  echo "Approval mode: $approval_mode"

  # Build the prompt
  local PROMPT="Execute intention drift analysis.

Follow the instructions in @${INTENTION_DRIFT_PROMPT}

Subtasks file: @${SUBTASKS_PATH}

Context files:
@${REPO_ROOT}/CLAUDE.md
@${REPO_ROOT}/docs/planning/PROGRESS.md
@${REPO_ROOT}/docs/planning/VISION.md

Approval mode: ${approval_mode}
- If 'auto': Create drift task files automatically
- If 'always' or 'review': Show findings and ask for approval before creating task files
- If 'force': Create drift task files without asking

Analyze all completed subtasks with commitHash and output a summary to stdout.
If drift is detected, create task files in docs/planning/tasks/ as specified in the prompt."

  # Run Claude for analysis
  echo "Invoking Claude for intention drift analysis..."
  claude $PERM_FLAG -p "$PROMPT"

  echo ""
  echo "=== Intention Drift Check Complete ==="
}

# Run technical drift check (placeholder - prompt may not exist yet)
run_technical_check() {
  echo "=== Running Technical Drift Check ==="

  if [ ! -f "$TECHNICAL_DRIFT_PROMPT" ]; then
    echo "Note: Technical drift prompt not found: $TECHNICAL_DRIFT_PROMPT"
    echo "Technical drift checking is not yet implemented."
    return 0
  fi

  if [ ! -f "$SUBTASKS_PATH" ]; then
    echo "Error: Subtasks file not found: $SUBTASKS_PATH"
    echo "Please create a subtasks.json file or specify the path with SUBTASKS_PATH environment variable."
    exit 1
  fi

  local approval_mode
  approval_mode=$(get_approval_mode)

  local PROMPT="Execute technical drift analysis.

Follow the instructions in @${TECHNICAL_DRIFT_PROMPT}

Subtasks file: @${SUBTASKS_PATH}

Context files:
@${REPO_ROOT}/CLAUDE.md

Approval mode: ${approval_mode}

Analyze code quality issues in completed subtasks and output a summary to stdout."

  echo "Invoking Claude for technical drift analysis..."
  claude $PERM_FLAG -p "$PROMPT"

  echo ""
  echo "=== Technical Drift Check Complete ==="
}

# Get sessionIds from completed subtasks
get_completed_session_ids() {
  if [ ! -f "$SUBTASKS_PATH" ]; then
    echo ""
    return
  fi

  if command -v jq &> /dev/null; then
    jq -r '[.[] | select(.done == true and .sessionId != null) | .sessionId] | join(",")' "$SUBTASKS_PATH" 2>/dev/null || echo ""
  elif command -v node &> /dev/null; then
    node -e "
      const fs = require('fs');
      try {
        const data = JSON.parse(fs.readFileSync('$SUBTASKS_PATH', 'utf8'));
        const sessionIds = data
          .filter(s => s.done && s.sessionId)
          .map(s => s.sessionId);
        console.log(sessionIds.join(','));
      } catch (e) { console.log(''); }
    " 2>/dev/null
  else
    echo ""
  fi
}

# Run self-improvement check
run_improve_check() {
  echo "=== Running Self-Improvement Analysis ==="

  if [ ! -f "$SELF_IMPROVEMENT_PROMPT" ]; then
    echo "Error: Self-improvement prompt not found: $SELF_IMPROVEMENT_PROMPT"
    exit 1
  fi

  if [ ! -f "$SUBTASKS_PATH" ]; then
    echo "Error: Subtasks file not found: $SUBTASKS_PATH"
    echo "Please create a subtasks.json file or specify the path with SUBTASKS_PATH environment variable."
    exit 1
  fi

  # Check selfImprovement config
  local self_improve_setting="always"
  if [ -f "$CONFIG_PATH" ]; then
    self_improve_setting=$(json_query "$CONFIG_PATH" ".selfImprovement" "always")
  fi

  if [ "$self_improve_setting" = "never" ]; then
    echo "Self-improvement analysis is disabled in ralph.config.json"
    return 0
  fi

  # Extract sessionIds from completed subtasks
  local session_ids
  session_ids=$(get_completed_session_ids)

  if [ -z "$session_ids" ]; then
    echo "No completed subtasks with sessionId found. Nothing to analyze."
    return 0
  fi

  echo "Found sessionIds: $session_ids"
  echo "Self-improvement mode: $self_improve_setting"

  local PROMPT="Execute self-improvement analysis.

Follow the instructions in @${SELF_IMPROVEMENT_PROMPT}

Subtasks file: @${SUBTASKS_PATH}

Config file: @${CONFIG_PATH}

Session IDs to analyze: ${session_ids}

Self-improvement mode: ${self_improve_setting}
- If 'always': Require user approval before applying changes (propose only)
- If 'auto': Apply changes automatically

Analyze session logs from completed subtasks for inefficiencies and output a summary to stdout.
If improvements are identified, create task files as specified in the prompt."

  echo "Invoking Claude for self-improvement analysis..."
  claude $PERM_FLAG -p "$PROMPT"

  echo ""
  echo "=== Self-Improvement Analysis Complete ==="
}

# Main command dispatch
case "$SUBCOMMAND" in
  intention)
    run_intention_check
    ;;
  technical)
    run_technical_check
    ;;
  improve)
    run_improve_check
    ;;
  all)
    run_intention_check
    echo ""
    run_technical_check
    echo ""
    run_improve_check
    ;;
  --help|-h|help)
    show_help
    ;;
  "")
    echo "Error: No subcommand specified"
    echo ""
    show_help
    ;;
  *)
    echo "Error: Unknown subcommand: $SUBCOMMAND"
    echo ""
    show_help
    ;;
esac
