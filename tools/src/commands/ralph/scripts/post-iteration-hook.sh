#!/bin/bash
# Ralph Post-Iteration Hook: Called after each build iteration completes
# Generates iteration summary using Haiku and writes to iteration diary
#
# Usage: post-iteration-hook.sh <subtask-id> <status> <session-id> [subtask-title] [milestone] [task-ref] [iteration-num]
#
# Required Arguments:
#   subtask-id    - The ID of the subtask that was processed
#   status        - The iteration status: "success", "failure", or "partial"
#   session-id    - The Claude session ID for reading the session log
#
# Optional Arguments:
#   subtask-title - Human-readable title of the subtask
#   milestone     - Name of the parent milestone
#   task-ref      - Reference to the parent task file
#   iteration-num - Current iteration attempt number

set -e

SUBTASK_ID=$1
STATUS=$2
SESSION_ID=$3
SUBTASK_TITLE=${4:-$SUBTASK_ID}
MILESTONE=${5:-""}
TASK_REF=${6:-""}
ITERATION_NUM=${7:-1}

if [ -z "$SUBTASK_ID" ] || [ -z "$STATUS" ] || [ -z "$SESSION_ID" ]; then
  echo "Error: Missing required arguments"
  echo "Usage: post-iteration-hook.sh <subtask-id> <status> <session-id> [subtask-title] [milestone] [task-ref] [iteration-num]"
  exit 1
fi

# Get the repo root (relative to this script location)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../../../.." && pwd)"

CONFIG_PATH="$REPO_ROOT/ralph.config.json"
PROMPT_PATH="$REPO_ROOT/prompts/iteration-summary.md"
DIARY_PATH="$REPO_ROOT/logs/iterations.jsonl"

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
    # Node.js fallback for JSON parsing
    # Pass arguments via environment to avoid escaping issues
    local result
    result=$(NODE_JSON_FILE="$file" NODE_JSON_QUERY="$query" NODE_JSON_DEFAULT="$default" node << 'NODEJS_SCRIPT'
const fs = require('fs');
try {
  const data = JSON.parse(fs.readFileSync(process.env.NODE_JSON_FILE, 'utf8'));
  const query = process.env.NODE_JSON_QUERY;
  const defaultVal = process.env.NODE_JSON_DEFAULT;
  const parts = query.replace(/^\./, '').split('.');
  let val = data;
  for (const part of parts) {
    if (val === undefined || val === null) break;
    val = val[part];
  }
  if (val !== undefined && val !== null) {
    if (Array.isArray(val)) {
      console.log(JSON.stringify(val));
    } else {
      console.log(val);
    }
  } else {
    console.log(defaultVal);
  }
} catch (e) {
  console.log(process.env.NODE_JSON_DEFAULT);
}
NODEJS_SCRIPT
    )
    echo "$result"
  else
    echo "$default"
  fi
}

# Read hook configuration from ralph.config.json
read_hook_config() {
  local config_key="$1"
  local default_value="$2"

  if [ ! -f "$CONFIG_PATH" ]; then
    echo "$default_value"
    return
  fi

  local value
  value=$(json_query "$CONFIG_PATH" ".$config_key" "$default_value")
  echo "$value"
}

# Check if hook is enabled (default: true)
is_hook_enabled() {
  local enabled
  enabled=$(read_hook_config "hooks.postIteration.enabled" "true")
  [ "$enabled" = "true" ]
}

# Get Haiku model to use for summary generation
get_haiku_model() {
  read_hook_config "hooks.postIteration.model" "haiku"
}

# Get diary file path from config or use default
get_diary_path() {
  local path
  path=$(read_hook_config "hooks.postIteration.diaryPath" "$DIARY_PATH")
  echo "$path"
}

# Determine session JSONL path from session ID
get_session_jsonl_path() {
  # Claude stores sessions at ~/.claude/projects/<encoded-path>/<sessionId>.jsonl
  # The encoded path can be base64-encoded or a dash-separated path format
  local encoded_path
  encoded_path=$(echo -n "$REPO_ROOT" | base64 -w 0 2>/dev/null || echo -n "$REPO_ROOT" | base64)

  local session_path="$HOME/.claude/projects/$encoded_path/${SESSION_ID}.jsonl"

  if [ -f "$session_path" ]; then
    echo "$session_path"
    return
  fi

  # Try alternative path encoding: dash-separated (e.g., -home-otrebu-dev-all-agents)
  local dash_encoded_path
  dash_encoded_path=$(echo "$REPO_ROOT" | sed 's|/|-|g')
  local dash_session_path="$HOME/.claude/projects/$dash_encoded_path/${SESSION_ID}.jsonl"

  if [ -f "$dash_session_path" ]; then
    echo "$dash_session_path"
    return
  fi

  # Also check common locations
  for check_path in \
    "$HOME/.claude/projects/${SESSION_ID}.jsonl" \
    "$HOME/.claude/sessions/${SESSION_ID}.jsonl"; do
    if [ -f "$check_path" ]; then
      echo "$check_path"
      return
    fi
  done

  # Last resort: search in ~/.claude/projects for the session ID
  local found_path
  found_path=$(find "$HOME/.claude/projects" -name "${SESSION_ID}.jsonl" -type f 2>/dev/null | head -1)
  if [ -n "$found_path" ] && [ -f "$found_path" ]; then
    echo "$found_path"
    return
  fi

  # If we can't find it, return empty and handle gracefully
  echo ""
}

# Count tool calls from session JSONL
# Tool calls are entries with "type":"tool_use"
count_tool_calls() {
  local session_jsonl_path
  session_jsonl_path=$(get_session_jsonl_path)

  if [ -z "$session_jsonl_path" ] || [ ! -f "$session_jsonl_path" ]; then
    echo "0"
    return
  fi

  # Count lines containing "type":"tool_use"
  local count
  count=$(grep -c '"type":"tool_use"' "$session_jsonl_path" 2>/dev/null || echo "0")
  echo "$count"
}

# Generate summary using Haiku
generate_summary() {
  local session_jsonl_path
  session_jsonl_path=$(get_session_jsonl_path)

  local model
  model=$(get_haiku_model)

  # Read the prompt template and substitute placeholders
  if [ ! -f "$PROMPT_PATH" ]; then
    echo '{"subtaskId":"'"$SUBTASK_ID"'","status":"'"$STATUS"'","summary":"Prompt template not found","keyFindings":[]}'
    return
  fi

  # Build prompt with substitutions
  local prompt_content
  prompt_content=$(cat "$PROMPT_PATH")

  # Substitute placeholders (using sed for compatibility)
  prompt_content=$(echo "$prompt_content" | sed \
    -e "s|{{SUBTASK_ID}}|$SUBTASK_ID|g" \
    -e "s|{{STATUS}}|$STATUS|g" \
    -e "s|{{SESSION_JSONL_PATH}}|$session_jsonl_path|g" \
    -e "s|{{SUBTASK_TITLE}}|$SUBTASK_TITLE|g" \
    -e "s|{{MILESTONE}}|$MILESTONE|g" \
    -e "s|{{TASK_REF}}|$TASK_REF|g" \
    -e "s|{{ITERATION_NUM}}|$ITERATION_NUM|g")

  # Call Claude with Haiku model
  local summary_output
  if command -v claude &> /dev/null; then
    summary_output=$(claude --model "$model" --output-format json -p "$prompt_content" 2>/dev/null) || {
      # On failure, return minimal JSON
      echo '{"subtaskId":"'"$SUBTASK_ID"'","status":"'"$STATUS"'","summary":"Summary generation failed","keyFindings":[]}'
      return
    }

    # Extract just the result content from Claude's JSON output
    if command -v jq &> /dev/null; then
      local result
      result=$(echo "$summary_output" | jq -r '.result // empty' 2>/dev/null)
      if [ -n "$result" ]; then
        # Try to parse the result as JSON (it might be inside a code block)
        local parsed
        parsed=$(echo "$result" | grep -oP '\{[^}]+\}' | head -1 2>/dev/null || echo "$result")
        echo "$parsed"
      else
        echo "$summary_output"
      fi
    else
      echo "$summary_output"
    fi
  else
    # Claude CLI not available, return minimal JSON
    echo '{"subtaskId":"'"$SUBTASK_ID"'","status":"'"$STATUS"'","summary":"Claude CLI not available","keyFindings":[]}'
  fi
}

# Write entry to iteration diary
write_diary_entry() {
  local summary_json="$1"
  local diary_file
  diary_file=$(get_diary_path)

  # Ensure logs directory exists
  mkdir -p "$(dirname "$diary_file")"

  # Extract fields from summary JSON
  local summary=""
  local key_findings="[]"

  if command -v jq &> /dev/null; then
    summary=$(echo "$summary_json" | jq -r '.summary // ""' 2>/dev/null || echo "")
    key_findings=$(echo "$summary_json" | jq -c '.keyFindings // []' 2>/dev/null || echo "[]")
  elif command -v node &> /dev/null; then
    summary=$(node -e "
      try {
        const data = JSON.parse('$summary_json');
        console.log(data.summary || '');
      } catch(e) { console.log(''); }
    " 2>/dev/null)
    key_findings=$(node -e "
      try {
        const data = JSON.parse('$summary_json');
        console.log(JSON.stringify(data.keyFindings || []));
      } catch(e) { console.log('[]'); }
    " 2>/dev/null)
  fi

  # Count tool calls from session log
  local tool_calls
  tool_calls=$(count_tool_calls)

  # Build diary entry JSON
  local timestamp
  timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

  local entry
  if command -v jq &> /dev/null; then
    entry=$(jq -nc \
      --arg subtaskId "$SUBTASK_ID" \
      --arg sessionId "$SESSION_ID" \
      --arg status "$STATUS" \
      --arg summary "$summary" \
      --arg timestamp "$timestamp" \
      --arg milestone "$MILESTONE" \
      --arg taskRef "$TASK_REF" \
      --argjson iterationNum "$ITERATION_NUM" \
      --argjson keyFindings "$key_findings" \
      --argjson errors "[]" \
      --argjson toolCalls "$tool_calls" \
      '{
        subtaskId: $subtaskId,
        sessionId: $sessionId,
        status: $status,
        summary: $summary,
        timestamp: $timestamp,
        milestone: $milestone,
        taskRef: $taskRef,
        iterationNum: $iterationNum,
        keyFindings: $keyFindings,
        errors: $errors,
        toolCalls: $toolCalls
      }')
  else
    # Fallback: construct JSON manually
    entry='{"subtaskId":"'"$SUBTASK_ID"'","sessionId":"'"$SESSION_ID"'","status":"'"$STATUS"'","summary":"'"$summary"'","timestamp":"'"$timestamp"'","milestone":"'"$MILESTONE"'","taskRef":"'"$TASK_REF"'","iterationNum":'"$ITERATION_NUM"',"keyFindings":'"$key_findings"',"errors":[],"toolCalls":'"$tool_calls"'}'
  fi

  # Append to diary file
  echo "$entry" >> "$diary_file"

  echo "Diary entry written to: $diary_file"
}

# Main execution
main() {
  echo "=== Post-Iteration Hook ==="
  echo "Subtask: $SUBTASK_ID"
  echo "Status: $STATUS"
  echo "Session: $SESSION_ID"

  # Check if hook is enabled
  if ! is_hook_enabled; then
    echo "Post-iteration hook is disabled in config"
    exit 0
  fi

  # Read config (for logging/verification)
  echo "Reading config from: $CONFIG_PATH"
  if [ -f "$CONFIG_PATH" ]; then
    echo "Config found"
    local model
    model=$(get_haiku_model)
    echo "Using model: $model"

    local diary
    diary=$(get_diary_path)
    echo "Diary path: $diary"
  else
    echo "Config not found, using defaults"
  fi

  # Generate summary using Haiku
  echo "Generating iteration summary..."
  local summary_json
  summary_json=$(generate_summary)
  echo "Summary: $summary_json"

  # Write to diary
  echo "Writing diary entry..."
  write_diary_entry "$summary_json"

  echo "=== Post-Iteration Hook Complete ==="
}

main
