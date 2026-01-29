# Code-Prose Consistency

Patterns for detecting mismatches between documentation prose and code examples: library names, function signatures, parameters, return values, configuration, and error handling.

---

## Quick Reference

- Prose mentions one library, code imports another.
- Text describes `doThing()`, code uses `performThing()`.
- Documentation says "pass user ID", code passes email.
- Text says "returns a list", code expects an object.
- Config in prose differs from config in code examples.
- Documented error handling doesn't match code patterns.

---

## Library/Package Mismatches

### Patterns

| Pattern | Risk | Detection Method |
|---------|------|------------------|
| Prose mentions libX, code imports libY | Wrong dependency installed | Compare prose mentions to imports |
| Different version syntax | Incompatible API calls | Check for version qualifiers |
| Renamed packages | Install failures | Verify package names exist |
| Internal vs external package | Resolution errors | Check import paths |

### Rules

- Every library mentioned in prose should have matching imports in code
- Package names are case-sensitive on some platforms
- When packages are renamed, update all documentation
- Distinguish between npm package names and import names when different

### Example

```markdown
❌ Library mismatch:

Prose: "We use moment.js for date formatting..."
Code: import { format } from 'date-fns';

→ Text mentions moment.js but code uses date-fns

✅ Consistent:

Prose: "We use date-fns for date formatting..."
Code: import { format } from 'date-fns';
```

---

## Function/Method Name Mismatches

### Patterns

| Pattern | Risk | Detection Method |
|---------|------|------------------|
| Prose: `getUserProfile`, Code: `fetchUserProfile` | Reader can't find function | Search for function names |
| CamelCase vs snake_case mismatch | Syntax errors | Compare naming conventions |
| Deprecated name in prose | Using old API | Check if function exists |
| Typo in function name | Runtime errors | Exact string match |

### Rules

- Function names in prose must exactly match code (case-sensitive)
- When renaming functions, update all documentation references
- Use consistent naming convention (camelCase in JS/TS)
- Code examples are authoritative; update prose to match

### Example

```markdown
❌ Function name mismatch:

Prose: "Call getUserProfile() to fetch user data"
Code: const data = await fetchUserProfile(userId);

→ Function name differs: getUserProfile vs fetchUserProfile

✅ Consistent:

Prose: "Call fetchUserProfile() to fetch user data"
Code: const data = await fetchUserProfile(userId);
```

---

## Parameter Mismatches

### Patterns

| Pattern | Risk | Detection Method |
|---------|------|------------------|
| Different parameter names | Confusion about what to pass | Compare parameter descriptions |
| Different parameter order | Swapped arguments | Check signature order |
| Missing required parameters | Runtime errors | Count parameters |
| Extra undocumented parameters | Incomplete documentation | Compare to actual signature |

### Rules

- Parameter names in prose should match code (or clearly map)
- Parameter order must match when positional
- Document all required parameters
- Optional parameters should be marked as optional

### Example

```markdown
❌ Parameter mismatch:

Prose: "Pass the user ID and email to createUser()"
Code: function createUser(email: string, name: string) { ... }

→ Prose says "user ID", code expects "name"; order also differs

✅ Consistent:

Prose: "Pass the email and display name to createUser(email, name)"
Code: function createUser(email: string, name: string) { ... }
```

---

## Return Value Mismatches

### Patterns

| Pattern | Risk | Detection Method |
|---------|------|------------------|
| "Returns a list" vs returns object | Type errors | Compare return descriptions |
| Void vs non-void | Unused/missing return value | Check for return statements |
| Promise vs sync return | Missing await | Check async modifiers |
| Different property names | Property access errors | Compare structure |

### Rules

- Document return type accurately (array, object, primitive, void)
- Async functions return Promises; document the resolved type
- If return structure changes, update all documentation
- Example code should show how to handle the return value

### Example

```markdown
❌ Return value mismatch:

Prose: "getUsers() returns a list of user objects"
Code:
const result = await getUsers();
console.log(result.users); // It returns { users: [...], count: n }

→ Function returns an object with users array, not a direct list

✅ Consistent:

Prose: "getUsers() returns an object with 'users' array and 'count'"
Code:
const result = await getUsers();
console.log(result.users, result.count);
```

---

## Configuration Mismatches

### Patterns

| Pattern | Risk | Detection Method |
|---------|------|------------------|
| Different timeout values | Unexpected behavior | Compare numeric values |
| Different key names | Config not applied | Compare key strings |
| Different file paths | File not found | Compare path strings |
| Different default values | Unexpected defaults | Compare stated vs actual |

### Rules

- Configuration values in prose must match code exactly
- Use single source of truth for config; reference it
- When defaults change, update all documentation
- Units should be explicit (milliseconds vs seconds)

### Example

```markdown
❌ Configuration mismatch:

Prose: "Set timeout to 30 seconds in the config"
Code: { timeout: 60000 } // 60 seconds in milliseconds

→ Prose says 30s, code shows 60s (60000ms)

✅ Consistent:

Prose: "Set timeout to 60 seconds (60000ms) in the config"
Code: { timeout: 60000 }
```

---

## Variable/Constant Naming

### Patterns

| Pattern | Risk | Detection Method |
|---------|------|------------------|
| Prose: `MAX_RETRIES`, Code: `maxRetryCount` | Reference errors | Compare constant names |
| Environment variable mismatch | Config not loaded | Compare env var names |
| Different casing conventions | Inconsistent style | Compare naming patterns |

### Rules

- Constant names must match exactly between prose and code
- Environment variables are case-sensitive
- When renaming, update all references
- Be explicit about where constants are defined

### Example

```markdown
❌ Variable name mismatch:

Prose: "The MAX_RETRIES constant controls retry attempts"
Code: const maxRetryCount = 3;

→ Different names: MAX_RETRIES vs maxRetryCount

✅ Consistent:

Prose: "The maxRetryCount constant controls retry attempts"
Code: const maxRetryCount = 3;
```

---

## API Endpoint Mismatches

### Patterns

| Pattern | Risk | Detection Method |
|---------|------|------------------|
| Different URL paths | 404 errors | Compare endpoint URLs |
| Different HTTP methods | 405 errors | Compare GET/POST/PUT/DELETE |
| Different API versions | Deprecated behavior | Compare version prefixes |
| Query vs path parameter | Malformed requests | Compare parameter encoding |

### Rules

- API URLs must match exactly (path, version, method)
- Document whether parameters go in path, query, or body
- When API changes version, update all examples
- Include full URL in examples for clarity

### Example

```markdown
❌ API endpoint mismatch:

Prose: "GET /api/v2/users to list users"
Code: fetch('/api/v1/user')

→ Version mismatch (v2 vs v1) and path mismatch (users vs user)

✅ Consistent:

Prose: "GET /api/v2/users to list users"
Code: fetch('/api/v2/users')
```

---

## Error Handling Mismatches

### Patterns

| Pattern | Risk | Detection Method |
|---------|------|------------------|
| Different error types | Uncaught exceptions | Compare error class names |
| Different error messages | Wrong diagnostics | Compare message strings |
| Different handling patterns | Unhandled errors | Compare try/catch usage |
| Missing error cases | Runtime crashes | Check for undocumented errors |

### Rules

- Document all error types a function can throw
- Error messages in prose should match code
- Show proper error handling in examples
- Document recovery strategies for each error type

### Example

```markdown
❌ Error handling mismatch:

Prose: "Throws UserNotFoundException when user not found"
Code:
if (!user) {
  throw new NotFoundError('User does not exist');
}

→ Different error class (UserNotFoundException vs NotFoundError)

✅ Consistent:

Prose: "Throws NotFoundError when user not found"
Code:
if (!user) {
  throw new NotFoundError('User does not exist');
}
```

---

## Severity Definitions

| Severity | Criteria | Example |
|----------|----------|---------|
| **Critical** | Breaks functionality: wrong endpoints, wrong signatures, incompatible types | API returns object but docs say array |
| **Moderate** | Causes confusion: naming mismatches, conflicting explanations | Function named differently in prose vs code |
| **Minor** | Stylistic difference: doesn't affect functionality | Config value comment says "ms" but code works |

---

## Summary: Checklist

When reviewing documentation for code-prose consistency:

- [ ] Library/package names in prose match imports in code
- [ ] Function names match exactly (case-sensitive)
- [ ] Parameter names, order, and types match
- [ ] Return type descriptions match actual returns
- [ ] Configuration values match between prose and code
- [ ] Variable/constant names match exactly
- [ ] API endpoints match (path, version, method)
- [ ] Error types and messages match
