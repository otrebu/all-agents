#!/bin/bash
# PRD Generator: Transform task markdown files into PRD JSON
# Usage: prd-generate.sh <tasks_dir> <output_file>

set -e

TASKS_DIR=$1
OUTPUT=$2

if [ -z "$TASKS_DIR" ] || [ -z "$OUTPUT" ]; then
  echo "Usage: prd-generate.sh <tasks_dir> <output_file>"
  exit 1
fi

# Build task contents from all matching files
TASKS=""
count=0
for f in "$TASKS_DIR"/[0-9][0-9][0-9]-*.md; do
  [ -f "$f" ] || continue
  TASKS+="--- FILE: $(basename "$f") ---
$(cat "$f")

"
  ((count++))
done

if [ $count -eq 0 ]; then
  echo "No task files found in $TASKS_DIR"
  exit 1
fi

echo "Found $count task files"

# Temp files
PROMPT_FILE=$(mktemp)
RESULT_FILE=$(mktemp)
trap "rm -f $PROMPT_FILE $RESULT_FILE" EXIT

# Write prompt to file
cat > "$PROMPT_FILE" << 'PROMPT_END'
You transform task files into PRD JSON. Output ONLY the JSON array, nothing else.

Format: [{"id": "001-name", "category": "functional", "description": "...", "steps": ["verify step 1", "verify step 2"], "passes": false}]

Rules:
- id: filename without .md (e.g., "001-semantic-release")
- description: synthesize from Goal + Context
- steps: VERIFICATION actions from Acceptance Criteria + Test Plan
- category: functional/backend/frontend/ui/validation/error-handling
- passes: BOOLEAN false

CRITICAL: Output ONLY valid JSON. No explanations, no markdown, no text before or after.

Tasks:
PROMPT_END

# Append tasks
echo "$TASKS" >> "$PROMPT_FILE"

echo "Calling Claude..."

# Call Claude with:
# - --tools "" : Disable tools so Claude just outputs text (key fix!)
# - File redirect < instead of pipe | (better for large input)
# - Output to file > (avoids $() capture issues)
claude -p --tools "" - < "$PROMPT_FILE" > "$RESULT_FILE" 2>&1

# Read result
RESULT=$(cat "$RESULT_FILE")

# Extract JSON (handle code fences and prefixed text)
# First try direct JSON array
JSON=$(echo "$RESULT" | sed -n '/^\[/,/^\]/p')

# If empty, try extracting from ```json block
if [ -z "$JSON" ]; then
  JSON=$(echo "$RESULT" | sed -n '/```json/,/```/p' | sed '1d;$d')
fi

# If still empty, try any ``` block
if [ -z "$JSON" ]; then
  JSON=$(echo "$RESULT" | sed -n '/```/,/```/p' | sed '1d;$d')
fi

# Last resort: grep for array pattern
if [ -z "$JSON" ]; then
  JSON=$(echo "$RESULT" | grep -oE '\[.*\]')
fi

# Validate JSON array
if ! echo "$JSON" | jq -e 'type == "array"' >/dev/null 2>&1; then
  echo "Error: Invalid JSON output"
  echo "Raw output (first 500 chars):"
  echo "$RESULT" | head -c 500
  exit 1
fi

# Fix passes if array (merge into steps, set to false)
JSON=$(echo "$JSON" | jq '[.[] | if (.passes|type)=="array" then .steps=(.steps+.passes)|.passes=false elif (.passes|type)!="boolean" then .passes=false else . end]')

# Write output
echo "$JSON" | jq '.' > "$OUTPUT"
echo "Generated: $OUTPUT ($(echo "$JSON" | jq length) features)"
