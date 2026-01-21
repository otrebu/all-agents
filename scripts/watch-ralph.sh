#!/bin/bash
FILE="docs/planning/milestones/ralph-ts-migration/subtasks.json"
while true; do
  clear
  done=$(jq '[.subtasks[] | select(.done)] | length' "$FILE")
  total=$(jq '.subtasks | length' "$FILE")
  next=$(jq -r '[.subtasks[] | select(.done == false)][0] | .id + ": " + .title' "$FILE")
  echo "Done: $done/$total"
  echo "Next: $next"
  sleep 5
done
