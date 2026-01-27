#!/usr/bin/env bash
# Claude Code Command Evaluation Script
# Matches plan: structured-imagining-manatee.md

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
TMP_DIR=$(mktemp -d)
RESULTS_FILE="$TMP_DIR/results.txt"
PIDS=()

# Persistent results dir
PERSIST_DIR="$ROOT_DIR/.claude/eval-results"
mkdir -p "$PERSIST_DIR"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# JSON Schema for structured evaluation output
EVAL_SCHEMA='{"type":"object","properties":{"verdict":{"enum":["PASS","FAIL","SKIP"]},"score":{"type":"integer","minimum":0,"maximum":10},"reason":{"type":"string"}},"required":["verdict","score","reason"]}'

# Cleanup on exit
cleanup() {
  echo ""
  echo -e "${YELLOW}Cleaning up...${NC}"
  for pid in "${PIDS[@]:-}"; do
    kill "$pid" 2>/dev/null || true
  done
  # Don't remove TMP_DIR immediately - let user inspect if needed
  echo "Temp dir: $TMP_DIR"
}
trap cleanup EXIT

touch "$RESULTS_FILE"

# macOS-compatible timeout
if command -v gtimeout &>/dev/null; then
  timeout_cmd="gtimeout"
elif command -v timeout &>/dev/null; then
  timeout_cmd="timeout"
else
  timeout_cmd=""
fi

run_timeout() {
  local secs=$1
  shift
  if [[ -n "$timeout_cmd" ]]; then
    "$timeout_cmd" "$secs" "$@"
  else
    "$@"
  fi
}

# Async evaluator with JSON schema + retry
evaluate_async() {
  local name="$1"
  local output="$2"
  local criteria="$3"
  local outfile="$TMP_DIR/eval-$name.json"
  local max_retries=2

  for attempt in $(seq 0 $max_retries); do
    local response
    response=$(cat <<EOF | claude -p --model haiku --output-format json --json-schema "$EVAL_SCHEMA" --settings '{"disableAllHooks": true}' 2>/dev/null || echo '{"verdict":"ERROR","score":0,"reason":"Claude call failed"}'
Evaluate this command output. Criteria: $criteria

OUTPUT:
$output

Return JSON with verdict (PASS/FAIL/SKIP), score (0-10), and brief reason.
EOF
)

    local structured verdict
    structured=$(echo "$response" | jq -c '.[-1].structured_output // empty' 2>/dev/null || echo "")
    verdict=$(echo "$structured" | jq -r '.verdict // empty' 2>/dev/null || echo "")

    if [[ "$verdict" =~ ^(PASS|FAIL|SKIP)$ ]]; then
      echo "$structured" > "$outfile"
      return 0
    fi

    [[ $attempt -lt $max_retries ]] && sleep 1
  done

  echo '{"verdict":"ERROR","score":0,"reason":"Evaluation failed after retries"}' > "$outfile"
}

# Run Claude researcher with skill (fires in background)
run_claude_researcher() {
  local name="$1"
  local prompt="$2"
  local allowed_tools="$3"
  local outfile="$TMP_DIR/researcher-$name.out"
  local max_turns="${4:-30}"

  echo "[Researcher: $name] Starting..."
  run_timeout 600 claude -p "$prompt" \
    --allowedTools "$allowed_tools" \
    --max-turns "$max_turns" \
    --settings '{"disableAllHooks": true}' \
    > "$outfile" 2>&1 || echo "ERROR: Claude researcher failed" >> "$outfile"
}

main() {
  echo "==========================================="
  echo "  Claude Code Command Evaluation"
  echo "  10 Tests"
  echo "==========================================="
  echo "Root dir: $ROOT_DIR"
  echo "Temp dir: $TMP_DIR"
  echo ""

  # Create subdirs
  mkdir -p "$TMP_DIR"/{downloads,tasks,stories}

  echo "==========================================="
  echo "  Phase 1: Fire All Commands (Parallel)"
  echo "==========================================="
  echo ""

  # --- Test 1: download (2 URLs) ---
  echo -e "${BLUE}[1/11] download${NC} - Firing 2 URL downloads..."
  aaa download "https://docs.github.com/en/get-started" --dir "$TMP_DIR/downloads" > "$TMP_DIR/download1.out" 2>&1 &
  PIDS+=($!)
  aaa download "https://docs.anthropic.com/en/docs/agents-and-tools/claude-code/overview" --dir "$TMP_DIR/downloads" > "$TMP_DIR/download2.out" 2>&1 &
  PIDS+=($!)

  # --- Test 2: gh-search (Claude researcher) ---
  echo -e "${BLUE}[2/11] gh-search${NC} - Firing Claude researcher..."
  run_claude_researcher "gh-search" \
    "Use the Skill tool to run /gh-search with query 'commander typescript CLI patterns'. Find real code examples showing commander.js usage in TypeScript projects. Summarize findings with repo names, stars, and code patterns found." \
    "Skill,Bash(aaa:*),Read" &
  PIDS+=($!)

  # --- Test 3: parallel-search (Claude researcher) ---
  echo -e "${BLUE}[3/11] parallel-search${NC} - Firing Claude researcher..."
  run_claude_researcher "parallel-search" \
    "Use the Skill tool to run /parallel-search with query 'TypeScript best practices 2024'. Gather comprehensive research from multiple sources." \
    "Skill,Bash(aaa:*),Read" &
  PIDS+=($!)

  # --- Test 4: task-create (direct command) ---
  echo -e "${BLUE}[4/10] task-create${NC} - Running aaa task create..."
  aaa task create "eval-test-task" --dir "$TMP_DIR/tasks" > "$TMP_DIR/task-create.out" 2>&1 &
  PIDS+=($!)

  # --- Test 5: story-create (direct command) ---
  echo -e "${BLUE}[5/10] story-create${NC} - Running aaa story create..."
  aaa story create "eval-test-story" --dir "$TMP_DIR/stories" > "$TMP_DIR/story-create.out" 2>&1 &
  PIDS+=($!)

  # --- Test 6: meta:claude-code:create-command (Claude runs skill) ---
  echo -e "${BLUE}[6/10] create-command${NC} - Firing Claude to run skill..."
  run_claude_researcher "create-command" \
    "Create a Claude Code command called 'eval-test-command' for Docker deployment. Use the Skill tool with /meta:claude-code:create-command. IMPORTANT: Do NOT ask any questions - just create a simple command that runs 'docker build && docker push'. Write the file immediately without waiting for user input." \
    "Skill,Read,Write,Glob,Grep" &
  PIDS+=($!)

  # --- Test 7: meta:claude-code:create-agent (Claude runs skill) ---
  echo -e "${BLUE}[7/10] create-agent${NC} - Firing Claude to run skill..."
  run_claude_researcher "create-agent" \
    "Create a Claude Code agent called 'eval-test-agent' for reviewing code. Use the Skill tool with /meta:claude-code:create-agent. Follow the skill's guidance to create the agent file." \
    "Skill,Read,Write,Glob,Grep" &
  PIDS+=($!)

  # --- Test 8: meta:claude-code:create-skill (Claude runs skill) ---
  echo -e "${BLUE}[8/10] create-skill${NC} - Firing Claude to run skill..."
  run_claude_researcher "create-skill" \
    "Create a Claude Code skill called 'eval-test-skill' for git branch cleanup. Use the Skill tool with /meta:claude-code:create-skill. IMPORTANT: Do NOT ask questions or wait for plan approval - immediately create a simple SKILL.md that lists and deletes merged branches. Write files now." \
    "Skill,Read,Write,Bash,Glob,Grep" &
  PIDS+=($!)

  # --- Test 9: meta:create-cursor-rule (Claude runs skill) ---
  echo -e "${BLUE}[9/10] create-cursor-rule${NC} - Firing Claude to run skill..."
  run_claude_researcher "create-cursor-rule" \
    "Create a Cursor rule called 'eval-test-rule' for TypeScript formatting. Use the Skill tool with /meta:create-cursor-rule. Follow the skill's guidance to create the rule file." \
    "Skill,Read,Write,Glob,Grep" &
  PIDS+=($!)

  # --- Test 10: context:atomic-doc (Claude runs skill) ---
  echo -e "${BLUE}[10/10] atomic-doc${NC} - Firing Claude to run skill..."
  run_claude_researcher "atomic-doc" \
    "Create an atomic doc at context/blocks/eval/eval-test-doc.md using /context:atomic-doc skill. IMPORTANT: Do NOT ask questions - immediately create a simple doc with frontmatter (depends: []) and basic content about testing. Write the file now." \
    "Skill,Read,Write,Edit,Glob,Grep" &
  PIDS+=($!)

  echo ""
  echo "==========================================="
  echo "  Phase 2: Waiting for Commands"
  echo "==========================================="
  echo ""

  TIMEOUT=600  # 10 minutes max
  INTERVAL=15
  elapsed=0
  total_cmds=${#PIDS[@]}

  while [[ $elapsed -lt $TIMEOUT ]]; do
    running=0
    for pid in "${PIDS[@]}"; do
      if kill -0 "$pid" 2>/dev/null; then
        ((running++))
      fi
    done

    completed=$((total_cmds - running))
    remaining=$((TIMEOUT - elapsed))
    mins=$((remaining / 60))
    secs=$((remaining % 60))

    echo "[$(date +%H:%M:%S)] $completed/$total_cmds commands complete, $running running, ${mins}m ${secs}s remaining..."

    if [[ $running -eq 0 ]]; then
      echo -e "${GREEN}[$(date +%H:%M:%S)] All commands complete!${NC}"
      break
    fi

    sleep $INTERVAL
    elapsed=$((elapsed + INTERVAL))
  done

  # Kill any stragglers
  for pid in "${PIDS[@]}"; do
    kill "$pid" 2>/dev/null || true
  done
  PIDS=()

  echo ""
  echo "==========================================="
  echo "  Phase 3: Running Evaluators (Parallel)"
  echo "==========================================="
  echo ""

  # --- Eval 1: download ---
  download_files=$(ls -la "$TMP_DIR/downloads"/*.md 2>/dev/null || echo "NO FILES")
  file1_content=$(cat "$TMP_DIR/downloads"/*github*.md 2>/dev/null | head -50 || echo "NOT FOUND")
  file2_content=$(cat "$TMP_DIR/downloads"/*anthropic*.md 2>/dev/null | head -50 || echo "NOT FOUND")
  evaluate_async "download" "Files in downloads dir:
$download_files

GitHub docs content (first 50 lines):
$file1_content

Anthropic docs content (first 50 lines):
$file2_content" "Both URLs should be downloaded as .md files with reasonable content. Score 8-10 if both files exist with content. Score 5-7 if one file exists. FAIL if no files or all empty." &
  PIDS+=($!)

  # --- Eval 2: gh-search ---
  gh_out=$(cat "$TMP_DIR/researcher-gh-search.out" 2>/dev/null | head -200 || echo "NO OUTPUT")
  evaluate_async "gh-search" "$gh_out" "Should return GitHub code search results with repos, stars, code snippets. IGNORE EOPNOTSUPP fs watch errors (environmental). Score 8-10 if shows .ts files with commander patterns. Score 5-7 if results but mostly readme. Score 2-4 if poor results. FAIL only if NO search results at all (just errors)." &
  PIDS+=($!)

  # --- Eval 3: parallel-search ---
  parallel_out=$(cat "$TMP_DIR/researcher-parallel-search.out" 2>/dev/null | head -200 || echo "NO OUTPUT")
  evaluate_async "parallel-search" "$parallel_out" "Should return structured research with sources and URLs. IGNORE any EOPNOTSUPP fs watch errors (environmental issue, not command fault). Score 8-10 if has 5+ sources with findings. Score 5-7 if sparse sources. Score 2-3 if command ran but API error. FAIL only if no research output at all." &
  PIDS+=($!)

  # --- Eval 4: task-create ---
  task_file=$(ls "$TMP_DIR/tasks"/*.md 2>/dev/null | head -1 || echo "")
  if [[ -n "$task_file" && -f "$task_file" ]]; then
    task_content=$(cat "$task_file")
    task_name=$(basename "$task_file")
  else
    task_content="FILE NOT FOUND"
    task_name="N/A"
  fi
  evaluate_async "task-create" "Filename: $task_name

Content:
$task_content" "File should be NNN-kebab-name.md format with '### Goal' and '### Acceptance Criteria'. Score 8-10 if proper naming + both sections. Score 5-7 if file exists but missing sections. FAIL if no file created." &
  PIDS+=($!)

  # --- Eval 6: story-create ---
  story_file=$(ls "$TMP_DIR/stories"/*.md 2>/dev/null | head -1 || echo "")
  if [[ -n "$story_file" && -f "$story_file" ]]; then
    story_content=$(cat "$story_file")
    story_name=$(basename "$story_file")
  else
    story_content="FILE NOT FOUND"
    story_name="N/A"
  fi
  evaluate_async "story-create" "Filename: $story_name

Content:
$story_content" "File should be NNN-kebab-name.md with '### Narrative' and '### Acceptance Criteria'. Template placeholders like 'As a [persona]' ARE VALID - don't require filled content. Score 8-10 if has required sections with user story template. Score 5-7 if missing sections. FAIL only if no file." &
  PIDS+=($!)

  # --- Eval 7: create-command ---
  cmd_file="$ROOT_DIR/.claude/commands/eval-test-command.md"
  if [[ -f "$cmd_file" ]]; then
    cmd_content=$(cat "$cmd_file")
  else
    cmd_content="FILE NOT FOUND at $cmd_file"
  fi
  researcher_log=$(cat "$TMP_DIR/researcher-create-command.out" 2>/dev/null | tail -50 || echo "NO LOG")
  evaluate_async "create-command" "Command file content:
$cmd_content

Researcher log (last 50 lines):
$researcher_log" "Command file should exist at .claude/commands/ with frontmatter (---) and clear instructions. Score 8-10 if well-structured. Score 5-7 if file exists but sparse. FAIL if FILE NOT FOUND." &
  PIDS+=($!)

  # --- Eval 8: create-agent ---
  agent_file="$ROOT_DIR/.claude/agents/eval-test-agent.md"
  if [[ -f "$agent_file" ]]; then
    agent_content=$(cat "$agent_file")
  else
    agent_content="FILE NOT FOUND at $agent_file"
  fi
  researcher_log=$(cat "$TMP_DIR/researcher-create-agent.out" 2>/dev/null | tail -50 || echo "NO LOG")
  evaluate_async "create-agent" "Agent file content:
$agent_content

Researcher log (last 50 lines):
$researcher_log" "Agent file should exist at .claude/agents/ with frontmatter and agent definition. Score 8-10 if well-structured with clear role. Score 5-7 if exists but sparse. FAIL if FILE NOT FOUND." &
  PIDS+=($!)

  # --- Eval 9: create-skill ---
  skill_file="$ROOT_DIR/.claude/skills/eval-test-skill/SKILL.md"
  if [[ -f "$skill_file" ]]; then
    skill_content=$(cat "$skill_file")
  else
    skill_content="FILE NOT FOUND at $skill_file"
  fi
  researcher_log=$(cat "$TMP_DIR/researcher-create-skill.out" 2>/dev/null | tail -50 || echo "NO LOG")
  evaluate_async "create-skill" "Skill file content:
$skill_content

Researcher log (last 50 lines):
$researcher_log" "Skill should exist at .claude/skills/NAME/SKILL.md with frontmatter and workflow. Score 8-10 if well-structured. Score 5-7 if exists but incomplete. FAIL if FILE NOT FOUND." &
  PIDS+=($!)


  # --- Eval 11: create-cursor-rule ---
  rule_file="$ROOT_DIR/.cursor/rules/eval-test-rule.mdc"
  if [[ -f "$rule_file" ]]; then
    rule_content=$(cat "$rule_file")
  else
    rule_content="FILE NOT FOUND at $rule_file"
  fi
  researcher_log=$(cat "$TMP_DIR/researcher-create-cursor-rule.out" 2>/dev/null | tail -50 || echo "NO LOG")
  evaluate_async "create-cursor-rule" "Rule file content:
$rule_content

Researcher log (last 50 lines):
$researcher_log" "Cursor rule should exist at .cursor/rules/ with .mdc extension, frontmatter, globs. Score 8-10 if well-structured. Score 5-7 if exists but sparse. FAIL if FILE NOT FOUND." &
  PIDS+=($!)

  # --- Eval 12: atomic-doc ---
  # Check multiple possible locations (skill may create in different subdirs)
  doc_file=""
  for path in "$ROOT_DIR/context/blocks/eval/eval-test-doc.md" \
              "$ROOT_DIR/context/blocks/test/eval-test-doc.md" \
              "$ROOT_DIR/context/blocks/docs/eval-test-doc.md"; do
    if [[ -f "$path" ]]; then
      doc_file="$path"
      break
    fi
  done
  if [[ -n "$doc_file" ]]; then
    doc_content=$(cat "$doc_file")
  else
    doc_content="FILE NOT FOUND in any expected location (eval/, test/, docs/)"
  fi
  researcher_log=$(cat "$TMP_DIR/researcher-atomic-doc.out" 2>/dev/null | tail -50 || echo "NO LOG")
  evaluate_async "atomic-doc" "Doc file content:
$doc_content

Researcher log (last 50 lines):
$researcher_log" "Atomic doc should exist in context/blocks/ (any subdomain like test/, eval/, docs/ is fine). Score 8-10 if has frontmatter with depends: and content. Score 5-7 if exists but incomplete. FAIL only if content says 'FILE NOT FOUND'." &
  PIDS+=($!)

  echo ""
  echo "==========================================="
  echo "  Phase 4: Waiting for Evaluators"
  echo "==========================================="
  echo ""

  TIMEOUT=180  # 3 minutes for evaluators
  INTERVAL=10
  elapsed=0
  total_evals=10

  while [[ $elapsed -lt $TIMEOUT ]]; do
    completed=$(ls "$TMP_DIR"/eval-*.json 2>/dev/null | wc -l | tr -d ' ')
    remaining=$((TIMEOUT - elapsed))
    mins=$((remaining / 60))
    secs=$((remaining % 60))

    echo "[$(date +%H:%M:%S)] $completed/$total_evals evaluations complete, ${mins}m ${secs}s remaining..."

    if [[ "$completed" -ge "$total_evals" ]]; then
      echo -e "${GREEN}[$(date +%H:%M:%S)] All evaluations complete!${NC}"
      break
    fi

    all_done=true
    for pid in "${PIDS[@]}"; do
      if kill -0 "$pid" 2>/dev/null; then
        all_done=false
        break
      fi
    done

    if $all_done; then
      echo "[$(date +%H:%M:%S)] All evaluator processes finished."
      break
    fi

    sleep $INTERVAL
    elapsed=$((elapsed + INTERVAL))
  done

  for pid in "${PIDS[@]}"; do
    kill "$pid" 2>/dev/null || true
  done

  echo ""
  echo "==========================================="
  echo "  RESULTS SUMMARY"
  echo "==========================================="
  echo ""

  for f in "$TMP_DIR"/eval-*.json; do
    [[ -f "$f" ]] || continue
    name=$(basename "$f" .json | sed 's/eval-//')
    verdict=$(jq -r '.verdict // "ERROR"' "$f" 2>/dev/null || echo "ERROR")
    score=$(jq -r '.score // 0' "$f" 2>/dev/null || echo "0")
    reason=$(jq -r '.reason // "No response"' "$f" 2>/dev/null || echo "No response")
    echo "$name|$verdict|$score|$reason" >> "$RESULTS_FILE"
  done

  if [[ -s "$RESULTS_FILE" ]]; then
    # Sort by test number/name for consistent ordering
    sort "$RESULTS_FILE" | while IFS='|' read -r name verdict score reason; do
      if [[ "$verdict" == "PASS" ]]; then
        printf "${GREEN}%-20s %-6s %2s  %s${NC}\n" "$name" "$verdict" "$score" "$reason"
      elif [[ "$verdict" == "FAIL" ]]; then
        printf "${RED}%-20s %-6s %2s  %s${NC}\n" "$name" "$verdict" "$score" "$reason"
      else
        printf "${YELLOW}%-20s %-6s %2s  %s${NC}\n" "$name" "$verdict" "$score" "$reason"
      fi
    done
  else
    echo "No results recorded."
  fi

  echo ""

  local pass fail skip error total avg_score total_score
  pass=$(awk -F'|' '$2=="PASS"' "$RESULTS_FILE" | wc -l | tr -d ' ')
  fail=$(awk -F'|' '$2=="FAIL"' "$RESULTS_FILE" | wc -l | tr -d ' ')
  skip=$(awk -F'|' '$2=="SKIP"' "$RESULTS_FILE" | wc -l | tr -d ' ')
  error=$(awk -F'|' '$2=="ERROR"' "$RESULTS_FILE" | wc -l | tr -d ' ')
  total=$((pass + fail + skip + error))
  total_score=$(awk -F'|' '{sum+=$3} END {print sum}' "$RESULTS_FILE")
  if [[ $total -gt 0 ]]; then
    avg_score=$((total_score / total))
  else
    avg_score=0
  fi

  echo "-------------------------------------------"
  echo -e "PASS: ${GREEN}$pass${NC} | FAIL: ${RED}$fail${NC} | SKIP: ${YELLOW}$skip${NC} | ERROR: ${YELLOW}$error${NC}"
  echo -e "Total: $total | Avg Score: $avg_score/10"
  echo "-------------------------------------------"

  # Save persistent copy
  PERSIST_FILE="$PERSIST_DIR/$TIMESTAMP.json"
  {
    echo "{"
    echo "  \"timestamp\": \"$TIMESTAMP\","
    echo "  \"summary\": {\"pass\": $pass, \"fail\": $fail, \"skip\": $skip, \"error\": $error, \"avg_score\": $avg_score},"
    echo "  \"results\": ["
    first=true
    for f in "$TMP_DIR"/eval-*.json; do
      [[ -f "$f" ]] || continue
      name=$(basename "$f" .json | sed 's/eval-//')
      content=$(cat "$f")
      if $first; then
        first=false
      else
        echo ","
      fi
      echo "    {\"name\": \"$name\", \"result\": $content}"
    done
    echo ""
    echo "  ]"
    echo "}"
  } > "$PERSIST_FILE"

  echo ""
  echo "Results saved to: $PERSIST_FILE"
  echo "Temp dir (for debugging): $TMP_DIR"

  if [[ "$fail" -gt 0 ]] || [[ "$error" -gt 0 ]]; then
    exit 1
  fi
}

main "$@"
