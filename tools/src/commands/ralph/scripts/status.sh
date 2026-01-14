#!/bin/bash
# Ralph Status: Display current build progress and statistics
# Usage: status.sh [subtasks-path]

set -e

SUBTASKS_PATH=${1:-subtasks.json}

# Get the repo root - try git first, fall back to subtasks directory, then script location
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Determine project root based on subtasks location or git root
if [ -d "$(dirname "$SUBTASKS_PATH")/.git" ] || git rev-parse --show-toplevel &>/dev/null 2>&1; then
  REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
else
  # Use directory containing subtasks.json as project root
  SUBTASKS_DIR="$(cd "$(dirname "$SUBTASKS_PATH")" 2>/dev/null && pwd || pwd)"
  REPO_ROOT="$SUBTASKS_DIR"
fi

CONFIG_PATH="$REPO_ROOT/ralph.config.json"
DIARY_PATH="$REPO_ROOT/logs/iterations.jsonl"

# ANSI color codes
BOLD='\033[1m'
DIM='\033[2m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# JSON query helper - uses jq if available, falls back to Node.js
json_query() {
  local file="$1"
  local query="$2"
  local default="$3"

  if [ ! -f "$file" ]; then
    echo "$default"
    return
  fi

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
        // Parse simple jq-like queries
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

# Get subtask counts using jq or node
get_subtask_stats() {
  local subtasks_file="$1"

  if [ ! -f "$subtasks_file" ]; then
    echo "0 0"
    return
  fi

  if command -v jq &> /dev/null; then
    local total done_count
    total=$(jq 'length' "$subtasks_file" 2>/dev/null || echo "0")
    done_count=$(jq '[.[] | select(.done == true)] | length' "$subtasks_file" 2>/dev/null || echo "0")
    echo "$done_count $total"
  elif command -v node &> /dev/null; then
    node -e "
      const fs = require('fs');
      try {
        const data = JSON.parse(fs.readFileSync('$subtasks_file', 'utf8'));
        const total = data.length;
        const done = data.filter(s => s.done === true).length;
        console.log(done + ' ' + total);
      } catch (e) {
        console.log('0 0');
      }
    " 2>/dev/null
  else
    echo "0 0"
  fi
}

# Get milestone from subtasks (tries taskRef path first, then milestone field)
get_milestone() {
  local subtasks_file="$1"

  if [ ! -f "$subtasks_file" ]; then
    echo ""
    return
  fi

  if command -v jq &> /dev/null; then
    # First try to extract milestone from taskRef path
    local milestone
    milestone=$(jq -r '
      (.[0].taskRef // "") |
      if . != "" then
        split("/") | if length > 3 then .[3] else "" end
      else
        ""
      end
    ' "$subtasks_file" 2>/dev/null)

    if [ -z "$milestone" ] || [ "$milestone" = "" ] || [ "$milestone" = "null" ]; then
      # Fall back to milestone field
      milestone=$(jq -r '.[0].milestone // ""' "$subtasks_file" 2>/dev/null)
    fi

    if [ "$milestone" = "null" ] || [ -z "$milestone" ]; then
      echo ""
    else
      echo "$milestone"
    fi
  elif command -v node &> /dev/null; then
    node -e "
      const fs = require('fs');
      try {
        const data = JSON.parse(fs.readFileSync('$subtasks_file', 'utf8'));
        if (data.length === 0) { console.log(''); process.exit(0); }

        // Try taskRef path first (e.g., 'docs/planning/milestones/ralph/tasks/001.md')
        const taskRef = data[0].taskRef || '';
        if (taskRef) {
          const parts = taskRef.split('/');
          const msIdx = parts.indexOf('milestones');
          if (msIdx >= 0 && parts.length > msIdx + 1) {
            console.log(parts[msIdx + 1]);
            process.exit(0);
          }
        }

        // Fall back to milestone field
        console.log(data[0].milestone || '');
      } catch (e) {
        console.log('');
      }
    " 2>/dev/null
  else
    echo ""
  fi
}

# Get last completed subtask
get_last_completed() {
  local subtasks_file="$1"

  if [ ! -f "$subtasks_file" ]; then
    echo ""
    return
  fi

  if command -v jq &> /dev/null; then
    jq -r '
      [.[] | select(.done == true and .completedAt != null)] |
      sort_by(.completedAt) |
      last |
      if . then "\(.id)|\(.completedAt)" else "" end
    ' "$subtasks_file" 2>/dev/null || echo ""
  elif command -v node &> /dev/null; then
    node -e "
      const fs = require('fs');
      try {
        const data = JSON.parse(fs.readFileSync('$subtasks_file', 'utf8'));
        const completed = data.filter(s => s.done && s.completedAt);
        if (completed.length === 0) { console.log(''); process.exit(0); }
        completed.sort((a, b) => new Date(a.completedAt) - new Date(b.completedAt));
        const last = completed[completed.length - 1];
        console.log(last.id + '|' + last.completedAt);
      } catch (e) {
        console.log('');
      }
    " 2>/dev/null
  else
    echo ""
  fi
}

# Get next pending subtask
get_next_subtask() {
  local subtasks_file="$1"

  if [ ! -f "$subtasks_file" ]; then
    echo ""
    return
  fi

  if command -v jq &> /dev/null; then
    jq -r '[.[] | select(.done == false or .done == null)] | .[0] | if . then "\(.id)|\(.title // .description // "")" else "" end' "$subtasks_file" 2>/dev/null || echo ""
  elif command -v node &> /dev/null; then
    node -e "
      const fs = require('fs');
      try {
        const data = JSON.parse(fs.readFileSync('$subtasks_file', 'utf8'));
        const pending = data.filter(s => !s.done);
        if (pending.length === 0) { console.log(''); process.exit(0); }
        const next = pending[0];
        console.log((next.id || '') + '|' + (next.title || next.description || ''));
      } catch (e) {
        console.log('');
      }
    " 2>/dev/null
  else
    echo ""
  fi
}

# Calculate success rate from iteration diary
get_diary_stats() {
  local diary_file="$1"

  if [ ! -f "$diary_file" ]; then
    echo "N/A N/A 0"
    return
  fi

  if command -v jq &> /dev/null; then
    # Process JSONL line by line
    local total=0 success=0 total_tools=0
    while IFS= read -r line; do
      if [ -n "$line" ]; then
        ((total++)) || true
        local status tools
        status=$(echo "$line" | jq -r '.status // .success // ""' 2>/dev/null)
        tools=$(echo "$line" | jq -r '.toolCalls // 0' 2>/dev/null)

        if [ "$status" = "success" ] || [ "$status" = "true" ]; then
          ((success++)) || true
        fi
        if [ -n "$tools" ] && [ "$tools" != "null" ]; then
          total_tools=$((total_tools + tools))
        fi
      fi
    done < "$diary_file"

    if [ "$total" -eq 0 ]; then
      echo "N/A N/A 0"
    else
      local rate avg_tools
      rate=$(echo "scale=1; $success * 100 / $total" | bc 2>/dev/null || echo "0")
      avg_tools=$(echo "scale=1; $total_tools / $total" | bc 2>/dev/null || echo "0")
      echo "${rate}% ${avg_tools} $total"
    fi
  elif command -v node &> /dev/null; then
    node -e "
      const fs = require('fs');
      try {
        const lines = fs.readFileSync('$diary_file', 'utf8').trim().split('\n').filter(l => l);
        if (lines.length === 0) { console.log('N/A N/A 0'); process.exit(0); }

        let success = 0, totalTools = 0;
        for (const line of lines) {
          try {
            const entry = JSON.parse(line);
            if (entry.status === 'success' || entry.success === true) success++;
            if (typeof entry.toolCalls === 'number') totalTools += entry.toolCalls;
          } catch (e) {}
        }

        const rate = (success * 100 / lines.length).toFixed(1);
        const avgTools = (totalTools / lines.length).toFixed(1);
        console.log(rate + '% ' + avgTools + ' ' + lines.length);
      } catch (e) {
        console.log('N/A N/A 0');
      }
    " 2>/dev/null
  else
    echo "N/A N/A 0"
  fi
}

# Format timestamp for display
format_timestamp() {
  local ts="$1"
  if [ -z "$ts" ]; then
    echo "N/A"
    return
  fi

  # Try to format with date command
  if date --version &>/dev/null 2>&1; then
    # GNU date
    date -d "$ts" "+%Y-%m-%d %H:%M" 2>/dev/null || echo "$ts"
  else
    # BSD date (macOS)
    date -j -f "%Y-%m-%dT%H:%M:%S" "${ts%%.*}" "+%Y-%m-%d %H:%M" 2>/dev/null || \
    date -j -f "%Y-%m-%dT%H:%M:%SZ" "$ts" "+%Y-%m-%d %H:%M" 2>/dev/null || \
    echo "$ts"
  fi
}

# Main output
echo ""
echo -e "${BOLD}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}║                      Ralph Build Status                      ║${NC}"
echo -e "${BOLD}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Config status
echo -e "${BOLD}Configuration${NC}"
echo -e "─────────────"
if [ -f "$CONFIG_PATH" ]; then
  echo -e "  Config: ${GREEN}Found${NC} (ralph.config.json)"
else
  echo -e "  Config: ${DIM}Not found${NC}"
fi
echo ""

# Subtasks status
echo -e "${BOLD}Subtasks Queue${NC}"
echo -e "──────────────"

if [ ! -f "$SUBTASKS_PATH" ]; then
  echo -e "  ${DIM}No subtasks file found at: $SUBTASKS_PATH${NC}"
  echo -e "  ${DIM}Run 'aaa ralph init' or create subtasks.json to get started.${NC}"
else
  # Get milestone
  milestone=$(get_milestone "$SUBTASKS_PATH")
  if [ -n "$milestone" ]; then
    echo -e "  Milestone: ${CYAN}$milestone${NC}"
  fi

  # Get counts
  stats=$(get_subtask_stats "$SUBTASKS_PATH")
  done_count=$(echo "$stats" | cut -d' ' -f1)
  total=$(echo "$stats" | cut -d' ' -f2)

  if [ "$total" -eq 0 ]; then
    echo -e "  ${DIM}No subtasks defined (empty queue)${NC}"
  else
    remaining=$((total - done_count))

    # Progress bar
    if [ "$total" -gt 0 ]; then
      pct=$((done_count * 100 / total))
      filled=$((pct / 5))
      empty=$((20 - filled))
      bar=""
      for ((i=0; i<filled; i++)); do bar+="█"; done
      for ((i=0; i<empty; i++)); do bar+="░"; done
      echo -e "  Progress: [${GREEN}${bar}${NC}] ${done_count}/${total} (${pct}%)"
    fi

    # Last completed
    last_completed=$(get_last_completed "$SUBTASKS_PATH")
    if [ -n "$last_completed" ]; then
      last_id=$(echo "$last_completed" | cut -d'|' -f1)
      last_ts=$(echo "$last_completed" | cut -d'|' -f2)
      formatted_ts=$(format_timestamp "$last_ts")
      echo -e "  Last done: ${GREEN}$last_id${NC} (${DIM}$formatted_ts${NC})"
    fi

    # Next subtask
    next_subtask=$(get_next_subtask "$SUBTASKS_PATH")
    if [ -n "$next_subtask" ]; then
      next_id=$(echo "$next_subtask" | cut -d'|' -f1)
      next_title=$(echo "$next_subtask" | cut -d'|' -f2-)
      echo -e "  Next up:   ${YELLOW}$next_id${NC}"
      if [ -n "$next_title" ]; then
        # Truncate long titles
        if [ ${#next_title} -gt 50 ]; then
          next_title="${next_title:0:47}..."
        fi
        echo -e "             ${DIM}$next_title${NC}"
      fi
    else
      if [ "$done_count" -eq "$total" ]; then
        echo -e "  Next up:   ${GREEN}All complete!${NC}"
      fi
    fi
  fi
fi
echo ""

# Iteration diary stats
echo -e "${BOLD}Iteration Stats${NC}"
echo -e "───────────────"

if [ ! -f "$DIARY_PATH" ]; then
  echo -e "  ${DIM}No iteration diary found at: logs/iterations.jsonl${NC}"
else
  diary_stats=$(get_diary_stats "$DIARY_PATH")
  success_rate=$(echo "$diary_stats" | cut -d' ' -f1)
  avg_tools=$(echo "$diary_stats" | cut -d' ' -f2)
  total_iterations=$(echo "$diary_stats" | cut -d' ' -f3)

  if [ "$total_iterations" -eq 0 ]; then
    echo -e "  ${DIM}No iterations recorded yet${NC}"
  else
    echo -e "  Iterations: ${BLUE}$total_iterations${NC}"
    if [ "$success_rate" != "N/A" ]; then
      # Color code success rate - convert to integer for comparison
      rate_num="${success_rate%\%}"
      rate_int=$(printf "%.0f" "$rate_num" 2>/dev/null || echo "0")
      if [ "$rate_int" -ge 80 ] 2>/dev/null; then
        echo -e "  Success rate: ${GREEN}$success_rate${NC}"
      elif [ "$rate_int" -ge 50 ] 2>/dev/null; then
        echo -e "  Success rate: ${YELLOW}$success_rate${NC}"
      else
        echo -e "  Success rate: ${RED}$success_rate${NC}"
      fi
    fi
    if [ "$avg_tools" != "N/A" ]; then
      echo -e "  Avg tool calls: ${BLUE}$avg_tools${NC}"
    fi
  fi
fi

echo ""
