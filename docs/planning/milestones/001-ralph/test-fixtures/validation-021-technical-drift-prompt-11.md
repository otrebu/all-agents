# Technical Drift Analysis Test: 021-technical-drift-prompt-11

## Test Purpose

Verify that the technical-drift.md prompt correctly identifies drift in a synthetic test case with known technical drift (code quality issues).

## Test Setup

### Subtask Definition (subtasks-technical-drift-test.json)

```json
{
  "id": "TECH-DRIFT-001",
  "taskRef": "TASK-TECH-DRIFT-001",
  "title": "Add payment processing service",
  "description": "Create a service to process payments via the payment gateway API",
  "acceptanceCriteria": [
    "Process credit card payments",
    "Handle refunds",
    "Log all transactions"
  ],
  "filesToRead": [
    "src/services/orderService.ts",
    "docs/coding-standards.md"
  ],
  "done": true,
  "completedAt": "2026-01-14T10:00:00Z",
  "commitHash": "tech-drift-test-commit",
  "sessionId": "tech-drift-test-session"
}
```

### Parent Task (TASK-TECH-DRIFT-001.md)

Task explicitly states technical standards:
- All services must have corresponding test files
- TypeScript strict mode (no `any` types)
- Error handling required for external API calls
- JSDoc comments for public APIs

### Simulated Git Diff (representing technical drift)

The implementation that would produce technical drift:

```diff
+ // src/services/paymentService.ts
+
+ async function processPayment(data: any): any {
+   const result = await paymentGateway.charge(data.amount, data.cardNumber);
+   return result.transactionId;
+ }
+
+ function processRefund(transactionId: any, amount: any) {
+   const result = paymentGateway.refund(transactionId, amount);
+   return result;
+ }
+
+ async function logTransaction(data) {
+   console.log('Transaction:', data);
+ }
```

### Technical Drift Issues Present

1. **Type Safety Issues (High Severity)**
   - Uses `any` for request parameters, response types, and function arguments
   - Project uses strict TypeScript mode

2. **Missing Tests (High Severity)**
   - No corresponding `paymentService.test.ts` file
   - Payment processing is critical business logic

3. **Missing Error Handling (High Severity)**
   - `processPayment` calls external payment gateway without try/catch
   - Financial operations are critical paths requiring error handling

4. **Missing Documentation (Medium Severity)**
   - Complex payment functions have no JSDoc comments
   - 6 parameters across functions with no documentation

## Expected Analysis Output

When the technical-drift.md prompt analyzes this subtask, it should produce:

```markdown
# Technical Drift Analysis

## Subtask: TECH-DRIFT-001
**Title:** Add payment processing service
**Commit:** tech-drift-test-commit
**Date:** 2026-01-14

## Project Standards Checked
- Tests: Yes (required by TASK-TECH-DRIFT-001.md)
- Linting: Yes
- TypeScript: Yes (strict mode required)
- Documentation: Yes (JSDoc required for public APIs)

## Analysis

### Drift Detected: Yes

### Issues Found

#### 1. Type Safety Issues
**Severity:** High
**Evidence:**
```
async function processPayment(data: any): any {
function processRefund(transactionId: any, amount: any) {
```
**Standard:** Project requires TypeScript strict mode - no `any` types
**Recommendation:** Define proper types for payment data, transaction IDs, amounts, and return types

#### 2. Missing Tests
**Severity:** High
**Evidence:** No `paymentService.test.ts` file in commit
**Standard:** All services must have corresponding test files (per TASK-TECH-DRIFT-001.md)
**Recommendation:** Add test file covering processPayment, processRefund, and logTransaction

#### 3. Missing Error Handling
**Severity:** High
**Evidence:**
```
const result = await paymentGateway.charge(data.amount, data.cardNumber);
return result.transactionId;
```
**Standard:** Error handling required for external API calls (critical path)
**Recommendation:** Add try/catch with proper error handling and logging

#### 4. Documentation Gaps
**Severity:** Medium
**Evidence:** No JSDoc comments on any exported functions
**Standard:** JSDoc comments required for public APIs
**Recommendation:** Add JSDoc documenting parameters, return types, and possible errors

## Summary
- **Total issues:** 4
- **High severity:** 3
- **Medium severity:** 1
- **Low severity:** 0

## Recommendation
See task file created in `docs/planning/tasks/`
```

## Verification Checklist

- [x] Subtasks.json prepared with completed subtask having technical drift
- [x] Task document exists defining technical standards
- [x] Simulated diff shows clear technical quality issues:
  - [x] Type safety issues (multiple `any` types)
  - [x] Missing tests (no test file)
  - [x] Missing error handling (no try/catch on payment gateway call)
  - [x] Documentation gaps (no JSDoc)
- [x] Expected output correctly identifies all 4 technical drift types

## Prompt Coverage Analysis

The technical-drift.md prompt contains all necessary components:

1. **Type Safety Issues Pattern** (lines 129-143): Matches `any` type usage in test case
2. **Missing Tests Pattern** (lines 60-75): Matches missing test file scenario
3. **Missing Error Handling Pattern** (lines 96-111): Matches payment gateway call without try/catch
4. **Documentation Gaps Pattern** (lines 113-127): Matches missing JSDoc on complex functions
5. **Output Format** (lines 307-384): Structure for reporting issues with severity levels
6. **Task File Generation** (lines 352-384): Instructions for creating actionable task files

## Test Result

The prompt will correctly identify this as **Technical Drift** because:
- Multiple `any` types defeat TypeScript strict mode (Pattern 5)
- No test file exists for the new service (Pattern 1)
- Payment processing lacks error handling despite being critical path (Pattern 3)
- Complex payment functions lack JSDoc documentation (Pattern 4)
- All four patterns have explicit examples in the prompt that match this test case
