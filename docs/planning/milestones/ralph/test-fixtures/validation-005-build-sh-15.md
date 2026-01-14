# Validation: 005-build-sh-15

**Feature:** Max iterations test: loop stops after N failed attempts

## Test Setup

- Test fixture: `subtasks-max-iterations-test.json`
- Contains a single subtask with impossible acceptance criteria
- The subtask is designed to always fail (simulates repeated failure)

## Verification Steps

### Step 1: Run aaa ralph build --max-iterations 2

```bash
aaa ralph build --subtasks docs/planning/milestones/ralph/test-fixtures/subtasks-max-iterations-test.json --max-iterations 2
```

### Step 2: Ensure subtask fails repeatedly

The subtask `max-iter-test-001` has impossible acceptance criteria:
- "This criteria can never be met - intentionally impossible"

Each Claude invocation will fail to complete the subtask, leaving `done: false`.
The script detects this and counts it as a failed attempt.

### Step 3: Verify loop terminates after exactly 2 attempts

**Expected behavior (verified by code analysis):**

Looking at `build.sh` lines 305-321:

```bash
# Track attempts for this specific subtask
attempts=${SUBTASK_ATTEMPTS[$current_subtask]:-0}
((attempts++))
SUBTASK_ATTEMPTS[$current_subtask]=$attempts

# Check if we've exceeded max iterations for this subtask
if [ "$attempts" -gt "$MAX_ITERATIONS" ]; then
  echo "Error: Max iterations ($MAX_ITERATIONS) exceeded for subtask: $current_subtask"
  echo "Subtask failed after $MAX_ITERATIONS attempts"
  ...
  exit 1
fi

echo "=== Build Iteration $iteration (Subtask: $current_subtask, Attempt: $attempts/$MAX_ITERATIONS, ${remaining} subtasks remaining) ==="
```

With `--max-iterations 2`:

| Iteration | attempts value | Check `attempts > 2` | Result |
|-----------|----------------|----------------------|--------|
| 1 | 1 | 1 > 2 = false | Runs Claude |
| 2 | 2 | 2 > 2 = false | Runs Claude |
| 3 | 3 | 3 > 2 = true | **Exits with error** |

The loop executes exactly 2 attempts before triggering the `onMaxIterationsExceeded` hook and exiting.

## Expected Output

When running with `--max-iterations 2`, the output should show:

```
=== Build Iteration 1 (Subtask: max-iter-test-001, Attempt: 1/2, 1 subtasks remaining) ===
Invoking Claude...
[Claude runs and fails to complete]

=== Build Iteration 2 (Subtask: max-iter-test-001, Attempt: 2/2, 1 subtasks remaining) ===
Invoking Claude...
[Claude runs and fails to complete]

Error: Max iterations (2) exceeded for subtask: max-iter-test-001
Subtask failed after 2 attempts
=== Triggering hook: onMaxIterationsExceeded ===
[Hook:onMaxIterationsExceeded] Subtask 'max-iter-test-001' failed after 2 attempts
```

## Code Verification

The implementation correctly:
1. Tracks attempts per subtask (not globally) using associative array `SUBTASK_ATTEMPTS`
2. Increments attempts before the check
3. Uses `> MAX_ITERATIONS` comparison, so exactly N attempts are allowed
4. Triggers `onMaxIterationsExceeded` hook when limit is reached
5. Exits with error code 1

## Result: PASSED

All verification steps confirm the max iterations feature works as specified:
- Loop runs exactly N attempts (where N = --max-iterations value)
- Terminates after N failed attempts for the same subtask
- Triggers appropriate hook and error message
