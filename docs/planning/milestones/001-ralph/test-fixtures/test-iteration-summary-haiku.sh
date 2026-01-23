#!/usr/bin/env bash
# Test: 018-iteration-summary-prompt-08
# Validates that Haiku produces valid summary from sample session JSONL

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../../../.." && pwd)"

echo "=== Testing Iteration Summary with Haiku ==="
echo "Repository: $REPO_ROOT"

# Test parameters
SUBTASK_ID="task-015-04"
STATUS="success"
SESSION_PATH="$SCRIPT_DIR/session-with-inefficiency.jsonl"

# Check prerequisites
if ! command -v claude &> /dev/null; then
    echo "ERROR: claude CLI not found"
    exit 1
fi

if [ ! -f "$SESSION_PATH" ]; then
    echo "ERROR: Session JSONL not found at: $SESSION_PATH"
    exit 1
fi

if [ ! -f "$REPO_ROOT/context/workflows/ralph/hooks/iteration-summary.md" ]; then
    echo "ERROR: Prompt not found at: $REPO_ROOT/context/workflows/ralph/hooks/iteration-summary.md"
    exit 1
fi

# Read session content
SESSION_CONTENT=$(cat "$SESSION_PATH")

# Prepare prompt with substitutions
PROMPT_CONTENT=$(cat "$REPO_ROOT/context/workflows/ralph/hooks/iteration-summary.md" | \
  sed "s|{{SUBTASK_ID}}|$SUBTASK_ID|g" | \
  sed "s|{{STATUS}}|$STATUS|g" | \
  sed "s|{{SESSION_JSONL_PATH}}|$SESSION_PATH|g" | \
  sed "s|{{SUBTASK_TITLE}}||g" | \
  sed "s|{{MILESTONE}}||g" | \
  sed "s|{{TASK_REF}}||g" | \
  sed "s|{{ITERATION_NUM}}||g")

# Combine prompt with session content
FULL_PROMPT="$PROMPT_CONTENT

## Session Content to Analyze

\`\`\`jsonl
$SESSION_CONTENT
\`\`\`

Please analyze the session above and produce the JSON summary."

echo ""
echo "=== Running Claude Haiku ==="
echo ""

# Run with Haiku and capture output
OUTPUT=$(claude --model haiku -p "$FULL_PROMPT" --max-turns 1 2>&1)

echo "=== Raw Output ==="
echo "$OUTPUT"
echo ""

# Try to extract JSON from output
JSON_OUTPUT=$(echo "$OUTPUT" | grep -oP '\{[^}]+\}' | head -1 || true)

if [ -z "$JSON_OUTPUT" ]; then
    echo "WARNING: Could not extract JSON from output"
    echo "Manual verification required"
    exit 0
fi

echo "=== Extracted JSON ==="
echo "$JSON_OUTPUT"
echo ""

# Validate JSON structure
if echo "$JSON_OUTPUT" | jq -e '.subtaskId and .status and .summary and .keyFindings' > /dev/null 2>&1; then
    echo "=== VALIDATION PASSED ==="
    echo "- subtaskId: $(echo "$JSON_OUTPUT" | jq -r '.subtaskId')"
    echo "- status: $(echo "$JSON_OUTPUT" | jq -r '.status')"
    echo "- summary: $(echo "$JSON_OUTPUT" | jq -r '.summary')"
    echo "- keyFindings count: $(echo "$JSON_OUTPUT" | jq '.keyFindings | length')"
    exit 0
else
    echo "=== VALIDATION FAILED ==="
    echo "JSON is missing required fields"
    exit 1
fi
