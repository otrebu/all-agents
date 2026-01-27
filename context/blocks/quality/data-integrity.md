# Data Integrity

Defensive programming patterns to prevent runtime errors from null references, boundary violations, race conditions, and data validation gaps.

---

## Quick Reference

- Always guard before dereferencing: optional chaining, nullish coalescing, existence checks.
- Check array length before accessing indices. Empty array access is a common bug.
- Async operations must be properly awaited. Missing `await` causes silent failures.
- Validate user input at system boundaries. Trust internal code after validation.
- Use TypeScript strict mode but don't rely on non-null assertions (`!`) to hide problems.

---

## Null/Undefined References

### Patterns

| Pattern | Risk | Safe Alternative |
|---------|------|------------------|
| `user.profile.email` | Crash if user or profile null | `user?.profile?.email` |
| `data[key]` | Undefined if key missing | `data[key] ?? defaultValue` |
| Non-null assertion `!` | Hides potential null | Guard or handle null case |
| Assumed function return | Caller assumes non-null | Document/handle null returns |

### Rules

- Use optional chaining (`?.`) for nested property access
- Use nullish coalescing (`??`) for default values (not `||` which catches falsy)
- Avoid non-null assertions (`!`) in production code—they hide bugs
- When a function can return null, make callers handle it explicitly

### Example

```typescript
// ❌ Unsafe: assumes user always has profile
const email = user.profile.email;

// ❌ Unsafe: || catches empty string/0
const name = user.name || 'Unknown';

// ❌ Unsafe: hides potential null
const id = getUserId()!;

// ✅ Safe: guards against nulls
const email = user?.profile?.email ?? 'no-email@example.com';

// ✅ Safe: only catches null/undefined
const name = user.name ?? 'Unknown';

// ✅ Safe: explicit null handling
const id = getUserId();
if (id === null) throw new Error('User ID required');
```

---

## Array Boundary Conditions

### Patterns

| Pattern | Risk | Safe Alternative |
|---------|------|------------------|
| `items[0]` | Throws if empty | `items.length > 0 ? items[0] : null` |
| `items.pop()` | Undefined if empty | Check length first |
| `items[items.length]` | Off-by-one (undefined) | `items[items.length - 1]` |
| `items[index]` | Negative/large index | Validate `0 <= index < length` |

### Rules

- Always check `length > 0` before accessing first/last elements
- Use `.at(-1)` for last element (handles empty gracefully—returns undefined)
- Validate loop bounds: `for (let i = 0; i < items.length; i++)`
- Be explicit about empty array handling in function contracts

### Example

```typescript
// ❌ Unsafe: crashes on empty array
const first = items[0];
const last = items[items.length - 1];

// ❌ Off-by-one: accesses undefined
for (let i = 0; i <= items.length; i++) {
  process(items[i]); // i === length is out of bounds
}

// ✅ Safe: explicit empty handling
const first = items.length > 0 ? items[0] : null;
const last = items.at(-1); // undefined if empty

// ✅ Safe: correct bounds
for (let i = 0; i < items.length; i++) {
  process(items[i]);
}

// ✅ Safe: functional approach handles empty naturally
const first = items.find(() => true) ?? null;
```

---

## Race Conditions

### Patterns

| Pattern | Risk | Safe Alternative |
|---------|------|------------------|
| Check-then-act | TOCTOU: state changes between check and use | Atomic operations |
| Shared mutable state | Multiple async writers corrupt data | Mutex/lock or immutable updates |
| Missing `await` | Operation proceeds before async completes | Always await promises |
| Mutate during iteration | Skipped/doubled items, crashes | Copy array or use filter/map |

### Rules

- Never assume state remains unchanged between async operations
- Use atomic operations (database transactions, mutexes) for read-modify-write
- Always `await` async operations—missing await is a common silent bug
- Don't mutate arrays/maps while iterating; create new collections instead

### Example

```typescript
// ❌ Race: counter may lose increments
let counter = 0;
async function increment() {
  const current = counter; // Read
  await someAsyncWork();   // Other code may run here!
  counter = current + 1;   // Write (stale value)
}

// ❌ Race: missing await
async function process() {
  saveToDatabase(data); // Not awaited—continues immediately
  sendConfirmation();   // Runs before save completes
}

// ❌ Race: mutating during iteration
for (const item of items) {
  if (shouldRemove(item)) {
    items.splice(items.indexOf(item), 1); // Corrupts iteration
  }
}

// ✅ Safe: atomic increment
await mutex.runExclusive(async () => {
  counter++;
});

// ✅ Safe: properly awaited
async function process() {
  await saveToDatabase(data);
  await sendConfirmation();
}

// ✅ Safe: creates new array
const remaining = items.filter(item => !shouldRemove(item));
```

---

## Data Validation

### Patterns

| Pattern | Risk | Safe Alternative |
|---------|------|------------------|
| `parseInt(input)` | NaN propagates silently | Check `isNaN()` after parsing |
| Implicit type coercion | `"5" + 1 === "51"` | Explicit parsing/validation |
| Partial validation | Edge cases slip through | Validate complete schema |
| Deep object access | Missing nested fields | Schema validation (Zod, etc.) |

### Rules

- Validate at system boundaries (API endpoints, file reads, user input)
- Use schema validation (Zod, io-ts) for complex structures
- Check parsed numbers for NaN: `const n = parseInt(s); if (isNaN(n)) ...`
- Don't trust data shape until validated—even from "trusted" sources

### Example

```typescript
// ❌ Unsafe: NaN propagates
const age = parseInt(req.body.age);
await saveUser({ age }); // May save NaN

// ❌ Unsafe: coercion surprise
const total = price + quantity; // "10" + 5 === "105"

// ❌ Unsafe: partial validation
if (data.email) {
  sendTo(data.email); // Email format not validated
}

// ✅ Safe: explicit validation
const age = parseInt(req.body.age, 10);
if (isNaN(age) || age < 0 || age > 150) {
  throw new ValidationError('Invalid age');
}

// ✅ Safe: schema validation
import { z } from 'zod';
const UserInput = z.object({
  email: z.string().email(),
  age: z.number().int().min(0).max(150),
});
const validated = UserInput.parse(req.body); // Throws on invalid
```

---

## Object/Map Access

### Patterns

| Pattern | Risk | Safe Alternative |
|---------|------|------------------|
| `obj[key]` | Undefined if key missing | `obj[key] ?? default` or `'key' in obj` |
| `Object.keys(obj).forEach` | Prototype pollution | `Object.hasOwn(obj, key)` |
| `delete obj[key]; use(obj[key])` | Undefined after delete | Don't use after delete |

### Rules

- Check key existence before access: `'key' in obj` or `Object.hasOwn(obj, key)`
- Prefer `Map` over plain objects for dynamic keys (no prototype pollution risk)
- Use `Object.hasOwn()` instead of `hasOwnProperty` for safety
- Be explicit about what happens when keys don't exist

### Example

```typescript
// ❌ Unsafe: assumes key exists
const value = config[userProvidedKey];

// ❌ Unsafe: prototype pollution vector
for (const key in userObject) {
  process(userObject[key]); // May include __proto__
}

// ✅ Safe: explicit existence check
const value = Object.hasOwn(config, key) ? config[key] : defaultValue;

// ✅ Safe: Map has no prototype issues
const config = new Map<string, string>();
const value = config.get(key) ?? defaultValue;

// ✅ Safe: guards against prototype properties
for (const key of Object.keys(userObject)) {
  process(userObject[key]);
}
```

---

## Common Gotchas

### Falsy vs Nullish

```typescript
// || catches all falsy: 0, '', false, null, undefined
const port = config.port || 3000; // Bug: 0 becomes 3000

// ?? catches only null/undefined
const port = config.port ?? 3000; // Correct: 0 stays 0
```

### Array Methods on Non-Arrays

```typescript
// Some APIs return null instead of empty array
const items = getItems(); // Might be null
items.map(process); // Crash

// Safe: default to empty array
const items = getItems() ?? [];
items.map(process); // Works
```

### Async Iteration

```typescript
// ❌ forEach doesn't await
items.forEach(async (item) => {
  await process(item); // Runs all in parallel, uncontrolled
});

// ✅ Use for...of for sequential
for (const item of items) {
  await process(item);
}

// ✅ Use Promise.all for parallel with control
await Promise.all(items.map(item => process(item)));
```

---

## Summary: Checklist

Before shipping code, verify:

- [ ] Null/undefined paths have guards (optional chaining, nullish coalescing)
- [ ] Array access checks length first
- [ ] All async operations are awaited
- [ ] User input is validated at boundaries
- [ ] Object key access handles missing keys
- [ ] No mutations during iteration
- [ ] parseInt/parseFloat results checked for NaN
