#!/bin/bash
# Ralph Post-Iteration Hook: Called after each build iteration completes
# Generates iteration summary using Haiku and writes to iteration diary
#
# Usage: post-iteration-hook.sh <subtask-id> <status> <session-id> [subtask-title] [milestone] [task-ref] [iteration-num]
#
# Required Arguments:
#   subtask-id    - The ID of the subtask that was processed
#   status        - The iteration status: "completed", "failed", or "retrying"
#                   (also accepts legacy values: "success" -> "completed", "failure" -> "failed", "partial" -> "retrying")
#   session-id    - The Claude session ID for reading the session log
#
# Optional Arguments:
#   subtask-title - Human-readable title of the subtask
#   milestone     - Name of the parent milestone
#   task-ref      - Reference to the parent task file
#   iteration-num - Current iteration attempt number

set -e

# Normalize status to enum: completed, failed, retrying
# Accepts both new enum values and legacy values for backwards compatibility
normalize_status() {
  local input_status="$1"
  case "$input_status" in
    completed|success)
      echo "completed"
      ;;
    failed|failure)
      echo "failed"
      ;;
    retrying|partial)
      echo "retrying"
      ;;
    *)
      # Unknown status, default to failed for safety
      echo "failed"
      ;;
  esac
}

SUBTASK_ID=$1
RAW_STATUS=$2
SESSION_ID=$3

# Normalize status to proper enum value
STATUS=$(normalize_status "$RAW_STATUS")
SUBTASK_TITLE=${4:-$SUBTASK_ID}
MILESTONE=${5:-""}
TASK_REF=${6:-""}
ITERATION_NUM=${7:-1}

if [ -z "$SUBTASK_ID" ] || [ -z "$RAW_STATUS" ] || [ -z "$SESSION_ID" ]; then
  echo "Error: Missing required arguments"
  echo "Usage: post-iteration-hook.sh <subtask-id> <status> <session-id> [subtask-title] [milestone] [task-ref] [iteration-num]"
  echo "Status must be one of: completed, failed, retrying (or legacy: success, failure, partial)"
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

# Get configured actions array (default: ["log"])
get_actions() {
  if [ ! -f "$CONFIG_PATH" ]; then
    echo '["log"]'
    return
  fi

  local actions
  if command -v jq &> /dev/null; then
    actions=$(jq -c '.hooks.postIteration.actions // ["log"]' "$CONFIG_PATH" 2>/dev/null)
  elif command -v node &> /dev/null; then
    actions=$(NODE_JSON_FILE="$CONFIG_PATH" node << 'NODEJS_SCRIPT'
const fs = require('fs');
try {
  const data = JSON.parse(fs.readFileSync(process.env.NODE_JSON_FILE, 'utf8'));
  const actions = data.hooks?.postIteration?.actions || ['log'];
  console.log(JSON.stringify(actions));
} catch (e) {
  console.log('["log"]');
}
NODEJS_SCRIPT
    )
  else
    actions='["log"]'
  fi

  echo "$actions"
}

# Check if a specific action is enabled
is_action_enabled() {
  local action_name="$1"
  local actions
  actions=$(get_actions)

  if command -v jq &> /dev/null; then
    local found
    found=$(echo "$actions" | jq -r --arg name "$action_name" 'map(select(. == $name or .type == $name)) | length')
    [ "$found" -gt 0 ]
  elif command -v node &> /dev/null; then
    local found
    found=$(ACTION_NAME="$action_name" ACTIONS_JSON="$actions" node -e "
      try {
        const actions = JSON.parse(process.env.ACTIONS_JSON);
        const name = process.env.ACTION_NAME;
        const found = actions.some(a => a === name || (typeof a === 'object' && a.type === name));
        console.log(found ? '1' : '0');
      } catch (e) { console.log('0'); }
    " 2>/dev/null)
    [ "$found" = "1" ]
  else
    # Default: log is enabled
    [ "$action_name" = "log" ]
  fi
}

# Execute log action - writes structured output to stdout and optionally to log file
execute_log_action() {
  local entry_json="$1"

  echo ""
  echo "=== Iteration Log ==="

  # Extract fields for formatted output
  local subtask_id session_id status summary timestamp tool_calls duration files_changed

  if command -v jq &> /dev/null; then
    subtask_id=$(echo "$entry_json" | jq -r '.subtaskId // ""')
    session_id=$(echo "$entry_json" | jq -r '.sessionId // ""')
    status=$(echo "$entry_json" | jq -r '.status // ""')
    summary=$(echo "$entry_json" | jq -r '.summary // ""')
    timestamp=$(echo "$entry_json" | jq -r '.timestamp // ""')
    tool_calls=$(echo "$entry_json" | jq -r '.toolCalls // 0')
    duration=$(echo "$entry_json" | jq -r '.duration // 0')
    files_changed=$(echo "$entry_json" | jq -r '.filesChanged | length // 0')
  elif command -v node &> /dev/null; then
    subtask_id=$(ENTRY_JSON="$entry_json" node -e "try { console.log(JSON.parse(process.env.ENTRY_JSON).subtaskId || ''); } catch(e) { console.log(''); }" 2>/dev/null)
    session_id=$(ENTRY_JSON="$entry_json" node -e "try { console.log(JSON.parse(process.env.ENTRY_JSON).sessionId || ''); } catch(e) { console.log(''); }" 2>/dev/null)
    status=$(ENTRY_JSON="$entry_json" node -e "try { console.log(JSON.parse(process.env.ENTRY_JSON).status || ''); } catch(e) { console.log(''); }" 2>/dev/null)
    summary=$(ENTRY_JSON="$entry_json" node -e "try { console.log(JSON.parse(process.env.ENTRY_JSON).summary || ''); } catch(e) { console.log(''); }" 2>/dev/null)
    timestamp=$(ENTRY_JSON="$entry_json" node -e "try { console.log(JSON.parse(process.env.ENTRY_JSON).timestamp || ''); } catch(e) { console.log(''); }" 2>/dev/null)
    tool_calls=$(ENTRY_JSON="$entry_json" node -e "try { console.log(JSON.parse(process.env.ENTRY_JSON).toolCalls || 0); } catch(e) { console.log('0'); }" 2>/dev/null)
    duration=$(ENTRY_JSON="$entry_json" node -e "try { console.log(JSON.parse(process.env.ENTRY_JSON).duration || 0); } catch(e) { console.log('0'); }" 2>/dev/null)
    files_changed=$(ENTRY_JSON="$entry_json" node -e "try { console.log((JSON.parse(process.env.ENTRY_JSON).filesChanged || []).length); } catch(e) { console.log('0'); }" 2>/dev/null)
  else
    # Fallback: use passed in values
    subtask_id="$SUBTASK_ID"
    session_id="$SESSION_ID"
    status="$STATUS"
    summary="(summary not available)"
    timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    tool_calls="0"
    duration="0"
    files_changed="0"
  fi

  # Format duration for display
  local duration_display
  if [ "$duration" -gt 60000 ]; then
    duration_display="$((duration / 60000))m $((duration % 60000 / 1000))s"
  elif [ "$duration" -gt 1000 ]; then
    duration_display="$((duration / 1000))s"
  else
    duration_display="${duration}ms"
  fi

  # Output formatted log
  echo "Timestamp: $timestamp"
  echo "Subtask:   $subtask_id"
  echo "Session:   $session_id"
  echo "Status:    $status"
  echo "Duration:  $duration_display"
  echo "Tools:     $tool_calls calls"
  echo "Files:     $files_changed changed"
  echo "Summary:   $summary"
  echo "=== End Iteration Log ==="
  echo ""
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

# Get list of files changed in the current iteration
# Uses git diff to find recently modified tracked files
get_files_changed() {
  # Get files that have been modified or added in the working tree
  # Use git diff with staged and unstaged changes
  local changed_files=""

  # Get list of changed files (staged + unstaged)
  if command -v git &> /dev/null && [ -d "$REPO_ROOT/.git" ]; then
    # Get staged files
    local staged
    staged=$(cd "$REPO_ROOT" && git diff --cached --name-only 2>/dev/null | head -50)

    # Get unstaged modified files
    local unstaged
    unstaged=$(cd "$REPO_ROOT" && git diff --name-only 2>/dev/null | head -50)

    # Combine and deduplicate
    changed_files=$(echo -e "$staged\n$unstaged" | sort -u | grep -v '^$' | head -50)
  fi

  # If no git changes found, try to extract from session log
  if [ -z "$changed_files" ]; then
    local session_jsonl_path
    session_jsonl_path=$(get_session_jsonl_path)

    if [ -n "$session_jsonl_path" ] && [ -f "$session_jsonl_path" ]; then
      # Extract file paths from Write and Edit tool calls in the session log
      changed_files=$(grep -oP '"file_path"\s*:\s*"[^"]+"|"path"\s*:\s*"[^"]+"' "$session_jsonl_path" 2>/dev/null | \
        sed 's/"file_path"\s*:\s*"//;s/"path"\s*:\s*"//;s/"$//' | \
        sort -u | head -50)
    fi
  fi

  echo "$changed_files"
}

# Format files changed as JSON array
format_files_changed_json() {
  local files_changed
  files_changed=$(get_files_changed)

  if [ -z "$files_changed" ]; then
    echo "[]"
    return
  fi

  if command -v jq &> /dev/null; then
    # Use jq to properly format as JSON array
    echo "$files_changed" | jq -R -s 'split("\n") | map(select(length > 0))'
  else
    # Manual JSON array construction
    local json_array="["
    local first=true
    while IFS= read -r file; do
      if [ -n "$file" ]; then
        if [ "$first" = true ]; then
          first=false
        else
          json_array+=","
        fi
        # Escape quotes in file path
        file=$(echo "$file" | sed 's/"/\\"/g')
        json_array+="\"$file\""
      fi
    done <<< "$files_changed"
    json_array+="]"
    echo "$json_array"
  fi
}

# Calculate iteration duration in milliseconds from session JSONL
# Returns duration based on first and last timestamps in session log
calculate_duration_ms() {
  local session_jsonl_path
  session_jsonl_path=$(get_session_jsonl_path)

  if [ -z "$session_jsonl_path" ] || [ ! -f "$session_jsonl_path" ]; then
    echo "0"
    return
  fi

  # Extract first and last timestamps from session log
  local first_timestamp last_timestamp

  if command -v jq &> /dev/null; then
    first_timestamp=$(head -1 "$session_jsonl_path" | jq -r '.timestamp // empty' 2>/dev/null)
    last_timestamp=$(tail -1 "$session_jsonl_path" | jq -r '.timestamp // empty' 2>/dev/null)
  else
    # Fallback: extract timestamp with grep/sed
    first_timestamp=$(head -1 "$session_jsonl_path" | grep -oP '"timestamp"\s*:\s*"\K[^"]+' 2>/dev/null | head -1)
    last_timestamp=$(tail -1 "$session_jsonl_path" | grep -oP '"timestamp"\s*:\s*"\K[^"]+' 2>/dev/null | head -1)
  fi

  if [ -z "$first_timestamp" ] || [ -z "$last_timestamp" ]; then
    echo "0"
    return
  fi

  # Convert ISO timestamps to milliseconds and calculate duration
  local start_ms end_ms duration_ms

  if command -v node &> /dev/null; then
    duration_ms=$(node -e "
      try {
        const start = new Date('$first_timestamp').getTime();
        const end = new Date('$last_timestamp').getTime();
        const duration = end - start;
        console.log(Number.isInteger(duration) && duration >= 0 ? duration : 0);
      } catch(e) { console.log(0); }
    " 2>/dev/null)
  elif command -v python3 &> /dev/null; then
    duration_ms=$(python3 -c "
from datetime import datetime
try:
    fmt = '%Y-%m-%dT%H:%M:%S.%fZ'
    fmt_no_ms = '%Y-%m-%dT%H:%M:%SZ'
    try:
        start = datetime.strptime('$first_timestamp', fmt)
    except:
        start = datetime.strptime('$first_timestamp', fmt_no_ms)
    try:
        end = datetime.strptime('$last_timestamp', fmt)
    except:
        end = datetime.strptime('$last_timestamp', fmt_no_ms)
    print(int((end - start).total_seconds() * 1000))
except Exception as e:
    print(0)
" 2>/dev/null)
  else
    # Last resort: use date command (less precise, seconds only)
    # Convert ISO to epoch seconds
    start_ms=$(date -d "$first_timestamp" +%s 2>/dev/null || echo "0")
    end_ms=$(date -d "$last_timestamp" +%s 2>/dev/null || echo "0")
    if [ "$start_ms" != "0" ] && [ "$end_ms" != "0" ]; then
      duration_ms=$(( (end_ms - start_ms) * 1000 ))
    else
      duration_ms=0
    fi
    echo "$duration_ms"
    return
  fi

  echo "${duration_ms:-0}"
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

  # Get files changed
  local files_changed_json
  files_changed_json=$(format_files_changed_json)

  # Calculate iteration duration in milliseconds
  local duration_ms
  duration_ms=$(calculate_duration_ms)

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
      --argjson filesChanged "$files_changed_json" \
      --argjson duration "$duration_ms" \
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
        toolCalls: $toolCalls,
        filesChanged: $filesChanged,
        duration: $duration
      }')
  else
    # Fallback: construct JSON manually
    entry='{"subtaskId":"'"$SUBTASK_ID"'","sessionId":"'"$SESSION_ID"'","status":"'"$STATUS"'","summary":"'"$summary"'","timestamp":"'"$timestamp"'","milestone":"'"$MILESTONE"'","taskRef":"'"$TASK_REF"'","iterationNum":'"$ITERATION_NUM"',"keyFindings":'"$key_findings"',"errors":[],"toolCalls":'"$tool_calls"',"filesChanged":'"$files_changed_json"',"duration":'"$duration_ms"'}'
  fi

  # Append to diary file
  echo "$entry" >> "$diary_file"

  # Output status to stderr and entry JSON to stdout
  echo "Diary entry written to: $diary_file" >&2

  # Return the entry JSON for use by actions
  echo "$entry"
}

# Get ntfy topic from config
get_ntfy_topic() {
  read_hook_config "ntfy.topic" ""
}

# Get ntfy server from config (default: https://ntfy.sh)
get_ntfy_server() {
  read_hook_config "ntfy.server" "https://ntfy.sh"
}

# Execute notify action - sends HTTP POST to ntfy.sh
execute_notify_action() {
  local entry_json="$1"

  local topic
  topic=$(get_ntfy_topic)

  if [ -z "$topic" ]; then
    echo "Warning: ntfy topic not configured in ralph.config.json (ntfy.topic)" >&2
    return 1
  fi

  local server
  server=$(get_ntfy_server)

  # Extract fields for notification
  local subtask_id status summary

  if command -v jq &> /dev/null; then
    subtask_id=$(echo "$entry_json" | jq -r '.subtaskId // ""')
    status=$(echo "$entry_json" | jq -r '.status // ""')
    summary=$(echo "$entry_json" | jq -r '.summary // ""')
  elif command -v node &> /dev/null; then
    subtask_id=$(ENTRY_JSON="$entry_json" node -e "try { console.log(JSON.parse(process.env.ENTRY_JSON).subtaskId || ''); } catch(e) { console.log(''); }" 2>/dev/null)
    status=$(ENTRY_JSON="$entry_json" node -e "try { console.log(JSON.parse(process.env.ENTRY_JSON).status || ''); } catch(e) { console.log(''); }" 2>/dev/null)
    summary=$(ENTRY_JSON="$entry_json" node -e "try { console.log(JSON.parse(process.env.ENTRY_JSON).summary || ''); } catch(e) { console.log(''); }" 2>/dev/null)
  else
    subtask_id="$SUBTASK_ID"
    status="$STATUS"
    summary="Iteration complete"
  fi

  # Build notification title and message
  local title="Ralph: $subtask_id ($status)"
  local message="$summary"

  # Determine priority based on status
  local priority="default"
  case "$status" in
    completed)
      priority="default"
      ;;
    failed)
      priority="high"
      ;;
    retrying)
      priority="low"
      ;;
  esac

  # Send HTTP POST to ntfy.sh
  local ntfy_url="${server}/${topic}"

  echo "Sending notification to ntfy.sh..." >&2
  echo "  Topic: $topic" >&2
  echo "  Server: $server" >&2

  if command -v curl &> /dev/null; then
    curl -s -X POST "$ntfy_url" \
      -H "Title: $title" \
      -H "Priority: $priority" \
      -H "Tags: robot,$([ "$status" = "completed" ] && echo "white_check_mark" || echo "warning")" \
      -d "$message" >/dev/null 2>&1 && {
      echo "Notification sent successfully" >&2
      return 0
    } || {
      echo "Warning: Failed to send notification to ntfy.sh" >&2
      return 1
    }
  elif command -v wget &> /dev/null; then
    wget -q --method=POST "$ntfy_url" \
      --header="Title: $title" \
      --header="Priority: $priority" \
      --header="Tags: robot,$([ "$status" = "completed" ] && echo "white_check_mark" || echo "warning")" \
      --body-data="$message" -O /dev/null 2>&1 && {
      echo "Notification sent successfully" >&2
      return 0
    } || {
      echo "Warning: Failed to send notification to ntfy.sh" >&2
      return 1
    }
  else
    echo "Warning: Neither curl nor wget available for HTTP requests" >&2
    return 1
  fi
}

# Execute configured actions
execute_actions() {
  local entry_json="$1"

  # Execute log action if enabled
  if is_action_enabled "log"; then
    execute_log_action "$entry_json"
  fi

  # Execute notify action if enabled
  if is_action_enabled "notify"; then
    execute_notify_action "$entry_json"
  fi

  # Note: pause action will be implemented in subsequent features
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

    local actions
    actions=$(get_actions)
    echo "Actions: $actions"
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
  local entry_json
  entry_json=$(write_diary_entry "$summary_json")

  # Execute configured actions (log, notify, pause)
  execute_actions "$entry_json"

  echo "=== Post-Iteration Hook Complete ==="
}

main
