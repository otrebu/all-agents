# Validation: 008-status-sh-14

## Test: Stats calculation with various diary entries

### Test Setup
Created `iterations-diverse.jsonl` with 10 diverse entries:
- Mixed `status: "success"` and `success: true` patterns
- Mixed `status: "failure"` entries
- Variable toolCalls values (5-35)
- Different subtask IDs and timestamps

### Diary Entries (iterations-diverse.jsonl)
```jsonl
{"status":"success","toolCalls":10,"subtaskId":"task-001","timestamp":"2026-01-14T09:00:00Z"}
{"status":"success","toolCalls":15,"subtaskId":"task-002","timestamp":"2026-01-14T09:30:00Z"}
{"status":"failure","toolCalls":25,"subtaskId":"task-003","timestamp":"2026-01-14T10:00:00Z"}
{"status":"success","toolCalls":12,"subtaskId":"task-004","timestamp":"2026-01-14T10:30:00Z"}
{"status":"success","toolCalls":8,"subtaskId":"task-005","timestamp":"2026-01-14T11:00:00Z"}
{"status":"failure","toolCalls":30,"subtaskId":"task-006","timestamp":"2026-01-14T11:30:00Z"}
{"success":true,"toolCalls":5,"subtaskId":"task-007","timestamp":"2026-01-14T12:00:00Z"}
{"status":"success","toolCalls":20,"subtaskId":"task-008","timestamp":"2026-01-14T12:30:00Z"}
{"status":"success","toolCalls":18,"subtaskId":"task-009","timestamp":"2026-01-14T13:00:00Z"}
{"status":"failure","toolCalls":35,"subtaskId":"task-010","timestamp":"2026-01-14T13:30:00Z"}
```

### Expected Calculations
- **Total iterations:** 10
- **Success count:** 7 (6 with `status: "success"` + 1 with `success: true`)
- **Success rate:** 7/10 = 70.0%
- **Total tool calls:** 10+15+25+12+8+30+5+20+18+35 = 178
- **Avg tool calls:** 178/10 = 17.8

### Test Execution
```bash
mkdir -p /tmp/ralph-test && cd /tmp/ralph-test
mkdir -p logs
cp iterations-diverse.jsonl logs/iterations.jsonl
bash status.sh subtasks.json
```

### Actual Output
```
Iteration Stats
───────────────
  Iterations: 10
  Success rate: 70.0%
  Avg tool calls: 17.8
```

### Verification
- [x] Total iterations: 10 ✓
- [x] Success rate calculated correctly: 70.0% ✓
- [x] Average tool calls calculated correctly: 17.8 ✓
- [x] Both `status: "success"` and `success: true` patterns recognized ✓
- [x] Color coding applied correctly (70% → yellow, between 50-80%) ✓

### Conclusion
**PASSED** - The status.sh script correctly calculates success rate and average tool calls from diverse diary entries.
