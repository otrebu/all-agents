# Technical Drift Analysis

You are an LLM-as-judge analyzing completed Ralph subtasks to detect when code changes have drifted from technical quality standards. Your goal is to identify technical debt and quality issues (not intention alignment—that's intention drift).

## Input Sources

### 1. Completed Subtasks
Read `subtasks.json` to find completed subtasks with `commitHash`:

```json
{
  "id": "SUB-001",
  "taskRef": "TASK-001",
  "title": "Implement user registration endpoint",
  "description": "Create POST /api/auth/register with validation",
  "done": true,
  "completedAt": "2026-01-13T10:30:00Z",
  "commitHash": "abc123def456",
  "sessionId": "session-xyz"
}
```

### 2. Git Diffs
For each completed subtask, read the git diff using the `commitHash`:

```bash
git show <commitHash> --stat
git diff <commitHash>^..<commitHash>
```

### 3. Project Standards
Check for project-specific quality standards:
- `CLAUDE.md` - Project conventions and coding standards
- `.eslintrc.*` / `eslint.config.*` - Linting rules
- `tsconfig.json` - TypeScript strictness
- `.prettierrc*` - Formatting standards
- `docs/coding-standards.md` or similar - Explicit standards documentation

## What to Analyze

### Technical Drift Patterns

**1. Missing Tests**
Code changes that should have tests but don't.

**Example:**
```diff
+ export function calculateTax(amount: number, rate: number): number {
+   return amount * rate;
+ }
```
*Drift:* New utility function with business logic has no corresponding test file.

**Acceptable Variation:**
- Test files exist and cover the functionality
- Change is to configuration or documentation only
- Simple type definitions or interfaces without logic

**2. Inconsistent Patterns**
Code that doesn't follow established patterns in the codebase.

**Example:**
```diff
+ // New file uses callbacks when rest of codebase uses async/await
+ function fetchUser(id, callback) {
+   db.query('SELECT * FROM users WHERE id = ?', [id], (err, result) => {
+     callback(err, result);
+   });
+ }
```
*Drift:* The codebase uses `async/await` everywhere but this new code uses callbacks.

**Acceptable Variation:**
- Pattern is explicitly documented as acceptable for this use case
- Library or framework constraint requires different pattern
- Performance optimization with documented justification

**3. Missing Error Handling**
Critical paths without proper error handling.

**Example:**
```diff
+ async function processPayment(order) {
+   const result = await paymentGateway.charge(order.total);
+   return result.transactionId;
+ }
```
*Drift:* Payment processing (critical path) has no try/catch or error handling.

**Acceptable Variation:**
- Error handling exists at a higher level (documented)
- Errors are intentionally propagated to caller
- Non-critical operation where failure is acceptable

**4. Documentation Gaps**
Public APIs or complex logic without documentation.

**Example:**
```diff
+ export function calculateShippingCost(weight, dimensions, destination, expedited, fragile, insurance) {
+   // 50 lines of complex calculation
+ }
```
*Drift:* Complex function with 6 parameters has no JSDoc or inline comments.

**Acceptable Variation:**
- Internal utility with self-documenting code
- README or external docs cover the API
- Simple pass-through or delegation functions

**5. Type Safety Issues**
Use of `any`, type assertions, or missing types in TypeScript projects.

**Example:**
```diff
+ function processData(data: any): any {
+   return data.items.map((item: any) => item.value);
+ }
```
*Drift:* Multiple `any` types defeat TypeScript's type safety.

**Acceptable Variation:**
- External library without type definitions (and `@ts-ignore` comment)
- Genuinely dynamic data with runtime validation
- Transitional code with TODO comment for future typing

**6. Security Concerns**
Code with potential security issues.

**Example:**
```diff
+ app.get('/user/:id', (req, res) => {
+   const query = `SELECT * FROM users WHERE id = ${req.params.id}`;
+   db.query(query);
+ });
```
*Drift:* SQL injection vulnerability from string interpolation.

**Acceptable Variation:**
- Input is already validated/sanitized at middleware level
- Parameterized queries used (this example should be flagged)
- Test code or fixtures (clearly isolated)

## Don't Over-Flag Guard

**Important:** Do NOT flag as drift:
- Style preferences not documented in project standards
- Minor variations that don't affect functionality
- Code that follows the established patterns in surrounding files
- Changes that are clearly work-in-progress with TODO markers

Check the codebase context. If surrounding code has the same "issue," it's the project's established pattern, not drift.

## Few-Shot Examples

### Example 1: Clear Drift (Flag This)

**Subtask:** "Add user service to fetch user data"
**Project standard:** All services have corresponding test files

**Git Diff:**
```diff
+ // src/services/userService.ts
+ export async function getUserById(id: string): Promise<User> {
+   return db.users.findUnique({ where: { id } });
+ }
+
+ export async function updateUser(id: string, data: Partial<User>): Promise<User> {
+   return db.users.update({ where: { id }, data });
+ }
```

**Judgment:** DRIFT - Missing Tests
- Two new service functions added
- No corresponding `userService.test.ts` file created
- Project has test files for all other services

### Example 2: Acceptable (Don't Flag)

**Subtask:** "Add user service to fetch user data"
**Project standard:** All services have corresponding test files

**Git Diff:**
```diff
+ // src/services/userService.ts
+ export async function getUserById(id: string): Promise<User> {
+   return db.users.findUnique({ where: { id } });
+ }

+ // src/services/__tests__/userService.test.ts
+ describe('userService', () => {
+   test('getUserById returns user', async () => {
+     const user = await getUserById('123');
+     expect(user).toBeDefined();
+   });
+ });
```

**Judgment:** NO DRIFT
- Service function added
- Corresponding test file created
- Follows project patterns

### Example 3: Clear Drift (Flag This)

**Subtask:** "Implement API endpoint for order creation"
**Project standard:** TypeScript strict mode, no `any` types

**Git Diff:**
```diff
+ app.post('/orders', async (req: any, res: any) => {
+   const order: any = req.body;
+   const result = await orderService.create(order);
+   res.json(result);
+ });
```

**Judgment:** DRIFT - Type Safety Issues
- Uses `any` for request, response, and body
- Project uses strict TypeScript
- Other endpoints have proper types

### Example 4: Acceptable (Don't Flag)

**Subtask:** "Implement API endpoint for order creation"
**Project standard:** TypeScript strict mode

**Git Diff:**
```diff
+ import { Request, Response } from 'express';
+ import { CreateOrderDTO, Order } from '../types';
+
+ app.post('/orders', async (req: Request<{}, {}, CreateOrderDTO>, res: Response<Order>) => {
+   const result = await orderService.create(req.body);
+   res.json(result);
+ });
```

**Judgment:** NO DRIFT
- Proper typing for request and response
- DTO type for request body
- Follows project patterns

## Output Format

### 1. Summary to stdout

```markdown
# Technical Drift Analysis

## Subtask: <subtask-id>
**Title:** <subtask title>
**Commit:** <commitHash>
**Date:** <analysis date>

## Project Standards Checked
- Tests: <Yes/No/Not configured>
- Linting: <Yes/No/Not configured>
- TypeScript: <Yes/No/Not configured>
- Documentation: <Yes/No/Not configured>

## Analysis

### Drift Detected: <Yes/No>

<If no drift:>
Code quality meets project standards. No corrective action needed.

<If drift detected:>
### Issues Found

#### 1. <Issue Type>
**Severity:** <High/Medium/Low>
**Evidence:** <Specific code showing the issue>
**Standard:** <What the project standard requires>
**Recommendation:** <How to fix>

## Summary
- **Total issues:** <count>
- **High severity:** <count>
- **Medium severity:** <count>
- **Low severity:** <count>

## Recommendation
<If drift:> See task file created in `docs/planning/tasks/`
<If no drift:> No action required.
```

### 2. Task Files for Technical Issues

When technical drift is detected, create a task file:

**File:** `docs/planning/tasks/tech-<subtask-id>-<date>.md`

```markdown
## Task: Address technical drift in <subtask-id>

**Source:** Technical drift analysis
**Created:** <date>
**Commit:** <commitHash>

### Problem
<Description of the technical issues detected>

### Issues

#### 1. <Issue Type>
**Severity:** <High/Medium/Low>
**Files affected:** <list of files>
**Evidence:**
```
<code snippet>
```
**Fix:** <specific change needed>

### Acceptance Criteria
- [ ] All high-severity issues addressed
- [ ] Medium-severity issues addressed or documented as tech debt
- [ ] Code passes lint checks
- [ ] Tests added where missing
```

## Execution Instructions

1. Read `subtasks.json` to find completed subtasks with `commitHash`
2. Read project standards (CLAUDE.md, lint configs, etc.)
3. For each completed subtask:
   a. Read the git diff: `git show <commitHash> --stat` and `git diff <commitHash>^..<commitHash>`
   b. Check for missing tests (look for corresponding test files)
   c. Check for pattern consistency (compare to surrounding code)
   d. Check for error handling on critical paths
   e. Check for documentation on public APIs
   f. Check for type safety (if TypeScript project)
   g. Check for security concerns
   h. Apply the "Don't Over-Flag" guard
4. Output summary to stdout
5. Create task files for any detected technical drift in `docs/planning/tasks/`

## Configuration

Check `ralph.config.json` for the `techDriftTasks` setting:
- `"auto"` (default): Creates tech drift task files automatically
- `"always"`: Requires user approval before creating task files

**CLI overrides:**
- `--force`: Skip approval even if config says `"always"`
- `--review`: Require approval even if config says `"auto"`

## Important Notes

- **Quality, not intention:** This prompt checks code quality standards, not alignment with planning docs (that's intention drift)
- **Propose only:** Don't modify code directly—only create task files
- **False positives:** When in doubt, don't flag. Some variations are acceptable engineering decisions
- **Context matters:** Consider the project's actual patterns, not ideal patterns
- **Severity matters:** Distinguish between critical issues (security, missing tests for critical code) and minor issues (style preferences)
