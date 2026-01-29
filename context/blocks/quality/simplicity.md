# Simplicity

Patterns for avoiding over-engineering: YAGNI, premature abstraction, unnecessary complexity, and speculative generality.

---

## Quick Reference

- The right amount of complexity is the minimum needed for current requirements.
- Three similar lines of code is better than a premature abstraction.
- Single implementation? Skip the interface/factory/abstraction.
- "Future-proofing" that adds complexity now is usually wrong.
- When in doubt, keep it simple. Refactor when you actually need flexibility.

---

## YAGNI (You Aren't Gonna Need It)

### Patterns to Avoid

| Pattern | Problem | What to Do Instead |
|---------|---------|-------------------|
| Config options never changed | Dead complexity | Remove unused options |
| "Just in case" parameters | API surface bloat | Add when actually needed |
| Unused extensibility points | Maintenance burden | Delete them |
| Feature flags for permanent features | Cruft accumulation | Remove after rollout |
| Code for hypothetical use cases | Speculative generality | Wait for real requirements |

### Rules

- Only build what current requirements demand
- "Future-proofing" rarely predicts actual future needs
- Adding flexibility later is usually easier than maintaining unused flexibility now
- If a comment says "in case we need..." delete the code

### Example

```typescript
// ❌ YAGNI: Options no one uses
interface LoggerOptions {
  format: 'json' | 'text' | 'xml' | 'csv';    // Only json used
  destination: 'console' | 'file' | 'network'; // Only console used
  compression: boolean;                        // Never enabled
  encryption: boolean;                         // Never enabled
  rotationPolicy: RotationPolicy;             // Never configured
}

// ✅ Simple: Only what's needed
interface LoggerOptions {
  format: 'json' | 'text';
  destination: 'console' | 'file';
}

// ❌ YAGNI: "Just in case" parameter
function formatDate(date: Date, locale?: string, calendar?: string) {
  // locale and calendar never passed by any caller
}

// ✅ Simple: Add parameters when actually needed
function formatDate(date: Date): string {
  return date.toISOString();
}
```

---

## Premature Abstraction

### Warning Signs

| Pattern | Smells Like | Reality |
|---------|-------------|---------|
| Interface with one implementation | "Flexibility" | Unused indirection |
| Factory for one product type | "Extensibility" | Over-engineering |
| Strategy pattern with one strategy | "Clean architecture" | Unnecessary complexity |
| Base class with one subclass | "Inheritance hierarchy" | No hierarchy exists |
| Generic type used once | "Reusability" | No reuse happening |

### Rules

- Wait for the second (or third) use case before abstracting
- If there's only one implementation, you don't need an interface
- Duplication is better than the wrong abstraction
- Abstractions are expensive—they have to earn their keep

### Example

```typescript
// ❌ Premature: Factory for single product
interface IUserService {
  getUser(id: string): Promise<User>;
}

class UserServiceImpl implements IUserService {
  // Only implementation
}

class UserServiceFactory {
  static create(): IUserService {
    return new UserServiceImpl(); // Only ever returns this
  }
}

// ✅ Simple: Direct implementation
class UserService {
  async getUser(id: string): Promise<User> {
    // Implementation
  }
}

// Create directly:
const userService = new UserService();
```

```typescript
// ❌ Premature: Abstract base with one subclass
abstract class BaseProcessor {
  abstract process(data: unknown): void;
  protected validate(data: unknown): boolean { /* ... */ }
}

class JsonProcessor extends BaseProcessor {
  // Only subclass that will ever exist
}

// ✅ Simple: Single class
class JsonProcessor {
  process(data: unknown): void { /* ... */ }
  private validate(data: unknown): boolean { /* ... */ }
}
```

---

## Unnecessary Complexity

### Common Offenders

| Pattern | When It's Overused |
|---------|-------------------|
| Dependency Injection | For dependencies that never change |
| Builder Pattern | For objects with 2-3 properties |
| Visitor Pattern | For simple type switches |
| Event-driven architecture | For synchronous, linear flows |
| Plugin systems | For fixed functionality |

### Indirection Layers

```typescript
// ❌ Unnecessary: A → B → C → D for simple operation
class RequestHandler {
  handle(req: Request): Response {
    return this.processor.process(req);
  }
}

class RequestProcessor {
  process(req: Request): Response {
    return this.executor.execute(req);
  }
}

class RequestExecutor {
  execute(req: Request): Response {
    return this.worker.doWork(req);
  }
}

class Worker {
  doWork(req: Request): Response {
    // Finally, actual logic
  }
}

// ✅ Simple: Handle directly
class RequestHandler {
  handle(req: Request): Response {
    // Just do the work
    const data = parseRequest(req);
    const result = processData(data);
    return new Response(result);
  }
}
```

### Rules

- Count the layers between "request comes in" and "work happens"
- If a class just delegates to another class, consider removing it
- Complex patterns are for complex problems—simple problems need simple solutions
- Enterprise patterns in non-enterprise contexts are a code smell

---

## Over-Configurability

### Signs of Over-Configuration

| Signal | Problem |
|--------|---------|
| Config file with 50+ options | Most never touched |
| Feature flags for everything | Combinatorial explosion |
| Every behavior is pluggable | No one writes plugins |
| "Flexible" API for simple tasks | Common case is hard |

### Rules

- Hardcode values that will never change
- Remove config options that have never been changed in production
- Design for the common case first; make it easy
- Extensibility points should be earned by actual extension needs

### Example

```typescript
// ❌ Over-configurable
interface CacheOptions {
  enabled: boolean;          // Always true
  ttlMs: number;            // Always 3600000
  maxSize: number;          // Always 1000
  evictionPolicy: 'lru' | 'lfu' | 'fifo';  // Always 'lru'
  compressionEnabled: boolean;  // Always false
  encryptionEnabled: boolean;   // Always false
  namespace: string;            // Always 'default'
  onEvict?: (key: string) => void;  // Never used
  serializer?: Serializer;      // Never provided
  logger?: Logger;              // Never provided
}

// ✅ Simple: Only configurable options
interface CacheOptions {
  ttlMs?: number;    // Sometimes customized
  maxSize?: number;  // Sometimes customized
}

const DEFAULT_TTL = 3600000;
const DEFAULT_SIZE = 1000;
```

---

## The Simplicity Test

Before adding abstraction, ask:

### 1. How Many Implementations?

```
Implementations = 1  → No abstraction needed
Implementations = 2  → Maybe abstract (look for true commonality)
Implementations = 3+ → Abstraction probably justified
```

### 2. Who Benefits?

```
"Future me might need..."    → YAGNI, don't add it
"Users might want to..."     → Talk to users first
"It's more flexible..."      → Flexibility for what?
"It's the proper pattern..." → Is the pattern serving you?
```

### 3. What's the Cost?

```
Every abstraction has costs:
- More files to navigate
- More indirection to trace
- More concepts to understand
- More code to maintain
- More tests to write
```

### 4. The Reversal Test

```
"If I didn't have this abstraction and needed it,
 how hard would it be to add?"

Easy to add later → Don't add now
Hard to add later → Consider adding now
```

---

## Refactoring Toward Simplicity

### Removing Unused Abstractions

```typescript
// Before: Interface with single implementation
interface IRepository { /* ... */ }
class SqlRepository implements IRepository { /* ... */ }

// After: Just the class
class SqlRepository { /* ... */ }
```

### Inlining Trivial Utilities

```typescript
// Before: Utility function called once
function formatUserDisplay(user: User): string {
  return `${user.firstName} ${user.lastName}`;
}

// After: Inline at the single call site
const displayName = `${user.firstName} ${user.lastName}`;
```

### Flattening Hierarchies

```typescript
// Before: Deep class hierarchy
class Animal { }
class Mammal extends Animal { }
class Dog extends Mammal { }

// After: Simple classes (if behaviors don't overlap)
class Dog {
  bark(): void { /* ... */ }
  eat(): void { /* ... */ }
}
```

---

## When Complexity IS Justified

Not all complexity is bad. Justified complexity:

| Situation | Why It's Justified |
|-----------|-------------------|
| Library/framework code | Must support diverse use cases |
| Public API | Backwards compatibility matters |
| Performance-critical paths | Optimization may require complexity |
| Known future requirements | (Actually known, not speculated) |
| Regulatory/compliance needs | Non-negotiable requirements |

### The Key Difference

```
Unjustified: "We might need this someday"
Justified:   "We have a concrete requirement/constraint"
```

---

## Summary: Checklist

Before adding complexity, verify:

- [ ] More than one implementation exists (or definitely will)
- [ ] The abstraction is serving a current need
- [ ] Simpler alternatives were considered and rejected
- [ ] The cost (files, indirection, maintenance) is worth it
- [ ] Configuration options are actually used
- [ ] The complexity would be hard to add later if needed

**Default stance:** Start simple. Add complexity only when forced by real requirements.
