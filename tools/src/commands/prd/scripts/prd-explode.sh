#!/bin/bash
# PRD Explode: Transform task markdown files into granular PRD features
# Each task explodes into 10-30 atomic features
# Usage: prd-explode.sh <tasks_dir> <output_file>

set -e

TASKS_DIR=$1
OUTPUT=$2

if [ -z "$TASKS_DIR" ] || [ -z "$OUTPUT" ]; then
  echo "Usage: prd-explode.sh <tasks_dir> <output_file>"
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
  ((count++)) || true
done

if [ $count -eq 0 ]; then
  echo "No task files found in $TASKS_DIR"
  exit 1
fi

echo "Found $count task files to explode"

# Temp files
PROMPT_FILE=$(mktemp)
RESULT_FILE=$(mktemp)
trap "rm -f $PROMPT_FILE $RESULT_FILE" EXIT

# Write prompt to file
cat > "$PROMPT_FILE" << 'PROMPT_END'
You EXPLODE task markdown files into many atomic PRD features.

CRITICAL: Each task should produce 10-30 granular features. Break down:
- Each acceptance criterion → 1-3 separate features
- Each test plan item → 1 feature
- Each integration point → 1 feature
- Edge cases implied by context → additional features
- Error handling scenarios → features
- Validation requirements → features

Output ONLY a JSON array. No explanations, no markdown, no text before or after.

Format:
[{
  "id": "{taskId}-{nn}",
  "sourceTask": "{taskId}",
  "category": "functional|backend|frontend|ui|validation|error-handling",
  "description": "Single atomic, testable behavior",
  "steps": ["Verify step 1", "Verify step 2", "Verify step 3"],
  "passes": false
}]

Rules:
- id: {taskId}-{nn} where taskId = filename without .md, nn = 01, 02, 03...
- sourceTask: exact taskId (e.g., "003-import-service")
- description: what to VERIFY, not how to build
- steps: 3-6 VERIFICATION actions (not implementation steps)
- passes: BOOLEAN false (always)
- Each feature must be independently verifiable
- Use categories: functional, backend, frontend, ui, validation, error-handling

Example good feature:
{
  "id": "003-import-service-05",
  "sourceTask": "003-import-service",
  "category": "validation",
  "description": "Duplicate import with same filename+period is skipped",
  "steps": [
    "Import XML file for period 2024-01",
    "Import same XML file again",
    "Verify second import returns skipped status",
    "Verify no duplicate records created"
  ],
  "passes": false
}

Example BAD (too big):
{
  "description": "Import service handles all XML transformations correctly"
}

Tasks to explode:
PROMPT_END

# Append tasks
echo "$TASKS" >> "$PROMPT_FILE"

echo "Calling Claude to explode tasks into granular features..."

# Call Claude with tools disabled for pure text output
claude -p --tools '' - < "$PROMPT_FILE" > "$RESULT_FILE" 2>&1

# Read result
RESULT=$(cat "$RESULT_FILE")

# Extract JSON (handle code fences and prefixed text)
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

# Validate and process JSON using node
JSON_FILE=$(mktemp)
echo "$JSON" > "$JSON_FILE"

PROCESSED=$(node -e "
const fs = require('fs');
const json = fs.readFileSync('$JSON_FILE', 'utf8');
try {
  const arr = JSON.parse(json);
  if (!Array.isArray(arr)) {
    console.error('Error: Not a JSON array');
    process.exit(1);
  }
  // Fix passes if not boolean
  const fixed = arr.map(item => ({
    ...item,
    passes: typeof item.passes === 'boolean' ? item.passes : false
  }));
  // Output stats to stderr, JSON to stdout
  const bySource = {};
  fixed.forEach(f => {
    bySource[f.sourceTask] = (bySource[f.sourceTask] || 0) + 1;
  });
  console.error('');
  console.error('Features per task:');
  Object.entries(bySource).sort().forEach(([k, v]) => {
    console.error(k + ': ' + v + ' features');
  });
  console.log(JSON.stringify(fixed, null, 2));
} catch (e) {
  console.error('Error: Invalid JSON - ' + e.message);
  process.exit(1);
}
" 2>&1)
NODE_EXIT=$?

rm -f "$JSON_FILE"

if [ $NODE_EXIT -ne 0 ]; then
  echo "$PROCESSED"
  echo "Raw output (first 1000 chars):"
  echo "$RESULT" | head -c 1000
  exit 1
fi

# Write output (filter out stderr lines that start with Features/newline)
echo "$PROCESSED" | grep -v "^Features per task:" | grep -v "^$" | grep -v ": [0-9]* features$" > "$OUTPUT"
TOTAL=$(node -e "const d=require('fs').readFileSync('$OUTPUT','utf8');console.log(JSON.parse(d).length)")

# Show stats (already printed to stderr above)
echo "$PROCESSED" | grep -E "(^Features per task:|: [0-9]+ features$|^$)" | head -50
echo ""
echo "Generated: $OUTPUT ($TOTAL total features from $count tasks)"
