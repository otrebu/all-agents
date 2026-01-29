# Code-Code Consistency

Patterns for detecting inconsistencies between code examples within the same documentation: style drift, import variations, error handling patterns, type annotations, dependency versions, and initialization approaches.

---

## Quick Reference

- One example uses async/await, another uses callbacks for the same API.
- Different import paths or aliases across examples.
- Try/catch in one example, .catch() in another for similar operations.
- Inconsistent type annotations (string vs String, typed vs untyped).
- Different dependency versions referenced across examples.
- Different ways of instantiating the same object/class.

---

## Style Drift Across Examples

### Patterns

| Pattern | Risk | Detection Method |
|---------|------|------------------|
| Async/await vs Promises | Reader unsure which to use | Compare async patterns |
| Arrow functions vs function declarations | Inconsistent style | Compare function syntax |
| Destructuring vs dot access | Mixed style | Compare property access |
| Template literals vs concatenation | Dated examples | Compare string building |

### Rules

- Choose one async pattern and use it consistently
- Modern syntax (arrow functions, destructuring) should be used throughout
- If showing alternatives, explicitly label them as "Alternative approach"
- Style should match the project's configured linter rules

### Example

```typescript
// ❌ Style drift:

// Example 2.1 (Promise chains)
fetch('/api/users').then(res => res.json()).then(data => {
  console.log(data);
});

// Example 4.3 (async/await)
const res = await fetch('/api/users');
const data = await res.json();
console.log(data);

// → Same API, different patterns, no explanation why

// ✅ Consistent:

// Example 2.1
const res = await fetch('/api/users');
const data = await res.json();
console.log(data);

// Example 4.3
const res = await fetch('/api/users');
const data = await res.json();
console.log(data);

// Or, if showing alternatives deliberately:
// Example 2.1 (async/await - recommended)
// Example 2.2 (Promise chains - alternative for legacy code)
```

---

## Import Inconsistencies

### Patterns

| Pattern | Risk | Detection Method |
|---------|------|------------------|
| Different import paths | Module resolution errors | Compare import strings |
| Named vs default imports | Wrong import type | Compare import syntax |
| Different aliases | Confusion about names | Compare alias usage |
| Relative vs absolute paths | Path resolution issues | Compare path formats |

### Rules

- Use the same import path for the same module across all examples
- Be consistent with named vs default imports
- If using aliases, use the same alias everywhere
- Follow project conventions for absolute vs relative paths

### Example

```typescript
// ❌ Import inconsistencies:

// Example 1
import { format } from 'date-fns';

// Example 2
import dateFormat from 'date-fns/format';

// Example 3
import * as dateFns from 'date-fns';
dateFns.format(...);

// → Three different ways to import the same function

// ✅ Consistent:

// Example 1
import { format } from 'date-fns';

// Example 2
import { format } from 'date-fns';

// Example 3
import { format } from 'date-fns';
```

---

## Error Handling Pattern Inconsistencies

### Patterns

| Pattern | Risk | Detection Method |
|---------|------|------------------|
| Try/catch vs .catch() | Mixed error flow | Compare error handling |
| Throw vs return error | Inconsistent error propagation | Check error returns |
| Specific vs generic catch | Different granularity | Compare catch clauses |
| Logging vs silent failures | Debug difficulty | Check error handling |

### Rules

- Choose one error handling pattern and apply consistently
- With async/await, prefer try/catch over .catch()
- Be explicit about what happens when errors occur
- Show error handling in examples, don't omit it

### Example

```typescript
// ❌ Error handling inconsistency:

// Example 3.1 (try/catch)
try {
  const user = await fetchUser(id);
} catch (error) {
  console.error('Failed:', error);
}

// Example 3.2 (.catch())
fetchUser(id)
  .then(user => process(user))
  .catch(err => console.error('Failed:', err));

// → Same operation, different error handling patterns

// ✅ Consistent:

// Example 3.1
try {
  const user = await fetchUser(id);
  // process user
} catch (error) {
  console.error('Failed to fetch user:', error);
}

// Example 3.2
try {
  const user = await fetchUser(id);
  await process(user);
} catch (error) {
  console.error('Failed to fetch user:', error);
}
```

---

## Type Annotation Inconsistencies

### Patterns

| Pattern | Risk | Detection Method |
|---------|------|------------------|
| `string` vs `String` | Incorrect type usage | Compare type casing |
| Typed vs untyped examples | Inconsistent strictness | Check for type annotations |
| Interface vs type alias | Style inconsistency | Compare type definitions |
| Any vs specific types | Type safety variance | Check for any usage |

### Rules

- Use lowercase primitives in TypeScript (string, number, boolean)
- Either use types throughout or explicitly note "plain JS" examples
- Pick interface or type and use consistently (prefer interface for objects)
- Avoid `any`; if needed for brevity, use `unknown` or actual types

### Example

```typescript
// ❌ Type annotation inconsistency:

// Example 1 (typed)
function greet(name: string): string {
  return `Hello, ${name}`;
}

// Example 2 (untyped)
function greet(name) {
  return `Hello, ${name}`;
}

// Example 3 (wrong primitive)
function greet(name: String): String {
  return `Hello, ${name}`;
}

// → Same function, inconsistent typing

// ✅ Consistent:

// Example 1
function greet(name: string): string {
  return `Hello, ${name}`;
}

// Example 2
function greet(name: string): string {
  return `Hello, ${name}`;
}
```

---

## Dependency Version Mismatches

### Patterns

| Pattern | Risk | Detection Method |
|---------|------|------------------|
| Different version numbers | API incompatibilities | Compare version strings |
| Outdated versions in some examples | Breaking changes | Check version freshness |
| Version in prose vs package.json | Wrong install | Compare stated versions |

### Rules

- All examples should target the same dependency version
- When upgrading docs, update ALL examples
- If showing version-specific code, label clearly
- Keep dependencies consistent with project's package.json

### Example

```typescript
// ❌ Version mismatch:

// Example 1 (React 18)
const root = createRoot(document.getElementById('root'));
root.render(<App />);

// Example 2 (React 17 pattern in same doc)
ReactDOM.render(<App />, document.getElementById('root'));

// → Two React versions in same documentation

// ✅ Consistent:

// Example 1
const root = createRoot(document.getElementById('root'));
root.render(<App />);

// Example 2
const root = createRoot(document.getElementById('root'));
root.render(<OtherApp />);

// Or, if showing migration:
// React 17 (deprecated pattern):
// ReactDOM.render(<App />, document.getElementById('root'));
// React 18 (current, use this):
// const root = createRoot(document.getElementById('root'));
```

---

## Initialization Pattern Inconsistencies

### Patterns

| Pattern | Risk | Detection Method |
|---------|------|------------------|
| Constructor vs factory function | Confusion about API | Compare instantiation |
| new keyword vs direct call | Runtime errors | Check for new keyword |
| Config object vs parameters | Wrong initialization | Compare call signatures |
| Singleton vs instance | Wrong usage pattern | Check instantiation count |

### Rules

- Use the same initialization pattern for the same class/object
- If a class requires `new`, always use it
- Show the recommended initialization pattern first
- If multiple patterns exist, document which to prefer

### Example

```typescript
// ❌ Initialization inconsistency:

// Example 1 (constructor)
const client = new ApiClient({ baseUrl: '/api' });

// Example 2 (factory)
const client = ApiClient.create({ baseUrl: '/api' });

// Example 3 (no config)
const client = new ApiClient();
client.configure({ baseUrl: '/api' });

// → Three different ways to create the same client

// ✅ Consistent:

// Example 1
const client = new ApiClient({ baseUrl: '/api' });

// Example 2
const client = new ApiClient({ baseUrl: '/api', timeout: 5000 });

// Example 3
const client = new ApiClient({ baseUrl: '/api', retry: true });
```

---

## Severity Definitions

| Severity | Criteria | Example |
|----------|----------|---------|
| **Critical** | Breaking differences: different versions, incompatible patterns | React 17 vs 18 APIs mixed |
| **Moderate** | Confusing differences: reader must guess which is correct | Try/catch vs .catch() for same op |
| **Minor** | Stylistic only: doesn't affect functionality | Arrow vs function declarations |

---

## Edge Cases

### Intentional Variation

When showing alternative approaches deliberately:

```markdown
// Approach 1: Using async/await (recommended for most cases)
const data = await fetchData();

// Approach 2: Using Promises (for compatibility with older code)
fetchData().then(data => { ... });
```

Mark these clearly as "Alternative" or "For comparison" to distinguish from inconsistencies.

### Version-Specific Code

When documentation covers multiple versions:

```markdown
## For React 18+
const root = createRoot(container);
root.render(<App />);

## For React 17 (legacy)
ReactDOM.render(<App />, container);
```

Use clear version labels and recommend the current version.

---

## Summary: Checklist

When reviewing documentation for code-code consistency:

- [ ] Async patterns are consistent (all async/await or all Promises)
- [ ] Import statements use same paths and syntax
- [ ] Error handling uses same pattern throughout
- [ ] Type annotations are consistent (all typed or explicitly plain JS)
- [ ] Dependency versions match across all examples
- [ ] Initialization patterns match for same objects/classes
- [ ] Intentional variations are clearly labeled
