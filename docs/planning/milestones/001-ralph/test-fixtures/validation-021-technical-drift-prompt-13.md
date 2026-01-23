# Technical Drift Analysis Test: 021-technical-drift-prompt-13

## Test Purpose

Verify that the technical-drift.md prompt produces actionable task files for violations, with correct format and content that enables developers to address the issues.

## Test Setup

Uses the same test fixtures from test 021-technical-drift-prompt-11:
- `subtasks-technical-drift-test.json` - Subtask with technical drift
- `TASK-TECH-DRIFT-001.md` - Parent task defining technical standards

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

### Simulated Git Diff (with technical violations)

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

## Expected Task File Output

When violations are detected, the prompt should create a task file at:
`docs/planning/tasks/tech-TECH-DRIFT-001-2026-01-14.md`

### Expected Task File Content

```markdown
## Task: Address technical drift in TECH-DRIFT-001

**Source:** Technical drift analysis
**Created:** 2026-01-14
**Commit:** tech-drift-test-commit

### Problem
The payment processing service implementation deviates from project technical standards. Multiple code quality issues were identified including type safety violations, missing tests, inadequate error handling, and documentation gaps.

### Issues

#### 1. Type Safety Issues
**Severity:** High
**Files affected:** src/services/paymentService.ts
**Evidence:**
```typescript
async function processPayment(data: any): any {
function processRefund(transactionId: any, amount: any) {
async function logTransaction(data) {
```
**Fix:** Define proper TypeScript types for all function parameters and return values:
- Create `PaymentData` type for payment input
- Create `RefundRequest` type for refund parameters
- Use `TransactionResult` for return types
- Add explicit type annotation to `logTransaction` parameter

#### 2. Missing Tests
**Severity:** High
**Files affected:** src/services/paymentService.ts (no corresponding test file)
**Evidence:** No `paymentService.test.ts` file exists
**Fix:** Create `src/services/__tests__/paymentService.test.ts` with tests for:
- `processPayment` - success and failure cases
- `processRefund` - success and failure cases
- `logTransaction` - verify logging behavior

#### 3. Missing Error Handling
**Severity:** High
**Files affected:** src/services/paymentService.ts
**Evidence:**
```typescript
const result = await paymentGateway.charge(data.amount, data.cardNumber);
return result.transactionId;
```
**Fix:** Add try/catch blocks around external API calls:
- Wrap payment gateway calls in try/catch
- Handle specific error types (NetworkError, ValidationError, PaymentError)
- Log errors appropriately before rethrowing or returning error responses

#### 4. Documentation Gaps
**Severity:** Medium
**Files affected:** src/services/paymentService.ts
**Evidence:** No JSDoc comments on any exported functions
**Fix:** Add JSDoc documentation for all exported functions:
- Document parameters and their expected formats
- Document return types and possible error scenarios
- Document any side effects (e.g., logging)

### Acceptance Criteria
- [ ] All high-severity issues addressed
- [ ] Medium-severity issues addressed or documented as tech debt
- [ ] Code passes lint checks
- [ ] Tests added where missing
```

## Verification Checklist

### Task File Existence
- [ ] Task file is created at `docs/planning/tasks/tech-<subtask-id>-<date>.md`
- [ ] File path follows the documented format from technical-drift.md (line 356)

### Task File Structure
- [ ] Contains "Task:" header with subtask ID reference
- [ ] Contains "Source:" field identifying technical drift analysis
- [ ] Contains "Created:" field with analysis date
- [ ] Contains "Commit:" field with the commitHash

### Problem Section
- [ ] Contains "Problem" section describing the drift
- [ ] Problem description summarizes the types of issues found
- [ ] Problem is understandable without reading the full analysis

### Issues Section
- [ ] Each issue has its own numbered subsection
- [ ] Each issue includes:
  - [ ] **Severity:** High/Medium/Low rating
  - [ ] **Files affected:** List of affected files
  - [ ] **Evidence:** Code snippet showing the issue
  - [ ] **Fix:** Specific, actionable remediation steps

### Acceptance Criteria Section
- [ ] Contains acceptance criteria checklist
- [ ] Includes "All high-severity issues addressed" item
- [ ] Includes "Medium-severity issues addressed or documented as tech debt" item
- [ ] Includes "Code passes lint checks" item
- [ ] Includes "Tests added where missing" item

### Content Actionability
- [ ] Each issue fix is specific enough for a developer to implement
- [ ] Fixes reference specific files, types, or patterns to add
- [ ] No vague instructions like "fix the code" or "improve quality"
- [ ] Code examples in evidence are actual snippets from the diff

## Prompt Coverage Analysis

The technical-drift.md prompt specifies task file output format at lines 352-384:

1. **File Location** (line 356): `docs/planning/tasks/tech-<subtask-id>-<date>.md`
2. **Header Format** (line 358): `## Task: Address technical drift in <subtask-id>`
3. **Metadata Fields** (lines 360-362): Source, Created, Commit
4. **Problem Section** (line 365): `<Description of the technical issues detected>`
5. **Issues Format** (lines 367-377):
   - Numbered subsections per issue
   - Severity, Files affected, Evidence, Fix fields
6. **Acceptance Criteria** (lines 379-384):
   - Checklist format with standard items

## Test Result

The prompt produces actionable task files because:

1. **Structured Format**: Uses consistent markdown structure that is easy to parse and track
2. **Specific Evidence**: Includes actual code snippets showing exactly what the problem is
3. **Actionable Fixes**: Each fix describes specific changes to make (types to add, files to create, patterns to follow)
4. **Severity Prioritization**: High severity issues are clearly marked for priority attention
5. **Clear Acceptance Criteria**: Checklist format enables tracking completion
6. **File Traceability**: Task file references subtask ID and commit hash for context

This ensures developers can take the task file and immediately understand what needs to be fixed, where, and how.
