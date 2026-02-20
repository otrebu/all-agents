# Code Standards

## Quick Reference

- One function, one algorithm. No boolean flags that switch code paths.
- Core functions execute; composition layers select. Use exhaustive `switch` with `never` checks.
- Names are documentation: `timeoutMs`, `priceGBP`, `isValid`, `hasAccess`.
- Comments explain WHY (constraints, trade-offs, gotchas). Never narrate what code does.
- Convenience wrappers are fine IF they're pure delegation with zero logic.
- Duplication beats wrong abstraction. Only DRY when algorithms are truly identical.

---

## Architecture: Decisions at the Edges

Strategy selection happens at application boundaries (route handlers, CLI entry points, config). Core business logic receives already-made decisions and executes them.

### Rules

- NEVER put algorithm selection (`if`/`switch` on type/mode) inside business functions
- Entry points parse input → select strategy → call core → format output
- Use explicit `switch` statements with TypeScript's `never` exhaustiveness check
- Core functions receive dependencies as parameters, never import and select them

### Example

```typescript
// ❌ Decision buried in core
function processPayment(amount: number, method: "stripe" | "paypal") {
  if (method === "stripe") {
    return stripeClient.charge(amount);
  } else {
    return paypalClient.send(amount);
  }
}

// ✅ Core executes, edge selects
type PaymentProcessor = { charge: (amount: number) => Promise<Receipt> };

const processPayment = (processor: PaymentProcessor) => (amount: number) =>
  processor.charge(amount);

// At the edge (route handler, CLI, etc.)
function handlePaymentRoute(req: Request) {
  const processor = selectProcessor(req.body.method); // switch statement here
  return processPayment(processor)(req.body.amount);
}

function selectProcessor(method: "stripe" | "paypal"): PaymentProcessor {
  switch (method) {
    case "stripe":
      return stripeProcessor;
    case "paypal":
      return paypalProcessor;
    default:
      assertNever(method);
  }
}
```

---

## Function Design: Data vs Behavior

**Data variance**: Different values, same algorithm → use parameters.  
**Behavioral variance**: Different algorithms → use separate functions.

### Rules

- NEVER use boolean flags that switch between code paths inside a function
- NEVER use string/enum "type" parameters that trigger internal branching
- Parameters are for values that flow through unchanged: counts, thresholds, IDs, config
- If changing a parameter changes the algorithm (not just inputs), split into separate functions

### Litmus Test

Ask: "If I change this value, does the algorithm change, or just the inputs?"

- Same algorithm → parameterize
- Different algorithm → separate functions

### Example

```typescript
// ❌ Boolean flag switches behavior
function sendNotification(userId: string, message: string, isUrgent: boolean) {
  if (isUrgent) {
    return smsGateway.send(userId, message); // Different algorithm
  }
  return emailService.queue(userId, message); // Different algorithm
}

// ✅ Separate functions for different algorithms
const sendUrgentNotification = (userId: string, message: string) =>
  smsGateway.send(userId, message);

const sendStandardNotification = (userId: string, message: string) =>
  emailService.queue(userId, message);

// ✅ Parameterize when algorithm is the same
function applyDiscount(subtotal: number, discountPercent: number): number {
  return subtotal * (1 - discountPercent); // Same formula, different values
}
```

---

## Naming: Make Implicit Explicit

Names carry enough context that readers rarely need to check implementations.

### Rules

- Booleans: prefix with `is`, `has`, `should`, `can`, `will`
- Functions: verbs describing the action (`fetchUser`, `validateInput`, `calculateTotal`)
- Data/types: nouns describing the thing (`UserProfile`, `orderItems`, `connectionConfig`)
- Include units in numeric names: `timeoutMs`, `maxRetryCount`, `priceInCents`, `distanceKm`
- Include domain context: `apiRateLimitPerSecond` not just `limit`
- Avoid abbreviations unless industry-standard (`id`, `url`, `html`, `api`)

### Example

```typescript
// ❌ Implicit, unclear
const t = 5000;
const flag = true;
function process(data: any, opt: boolean) {}

// ✅ Explicit, self-documenting
const connectionTimeoutMs = 5000;
const hasActiveSubscription = true;
function validateUserInput(
  formData: ContactForm,
  shouldSanitizeHtml: boolean
) {}
```

---

## Comments: Intent, Not Mechanics

Code shows WHAT. Comments explain WHY.

### Rules

- NEVER narrate implementation steps or restate what code does
- DO document: rationale, constraints from external systems, non-obvious trade-offs, invariants, gotchas
- If you need to explain HOW code works, refactor for clarity instead
- Mark technical debt with explanation of the trade-off

### Example

```typescript
// ❌ Narrates the obvious
// Loop through users and filter active ones
const activeUsers = users.filter((u) => u.isActive);

// ❌ Restates the code
// Set timeout to 30 seconds
const timeoutMs = 30_000;

// ✅ Explains WHY
// Stripe's API has a known race condition where webhooks can arrive before
// the charge object is fully hydrated. 500ms covers 99th percentile latency.
await delay(500);

// ✅ Documents constraint
// Order matters: auth middleware must run before rate limiting
// because rate limits are per-user, not per-IP
app.use(authMiddleware);
app.use(rateLimitMiddleware);

// ✅ Marks trade-off
// TODO: O(n²) but n < 100 in practice. Profile before optimizing.
```

---

## Convenience Facades

DX wrappers over parameterized cores are fine IF they contain zero logic.

### Rules

- Build the flexible, parameterized version first (source of truth)
- Convenience functions MUST be pure delegation: no conditionals, no additional behavior
- Test the core thoroughly; convenience wrappers need only smoke tests

### Example

```typescript
// ✅ Parameterized core (source of truth)
async function httpRequest<T>(config: {
  method: "GET" | "POST" | "PUT" | "DELETE";
  url: string;
  body?: unknown;
  headers?: Record<string, string>;
}): Promise<T> {
  // All logic lives here
}

// ✅ Convenience facades (pure delegation, zero logic)
const get = <T>(url: string) => httpRequest<T>({ method: "GET", url });
const post = <T>(url: string, body: unknown) =>
  httpRequest<T>({ method: "POST", url, body });
const put = <T>(url: string, body: unknown) =>
  httpRequest<T>({ method: "PUT", url, body });
const del = <T>(url: string) => httpRequest<T>({ method: "DELETE", url });
```

---

## Enum & Union Type Conventions

Prefer string union types over the `enum` keyword. Unions are simpler, tree-shake better, and compose naturally with discriminated unions and exhaustive switches.

### Rules

- Default to string unions: `type Status = 'active' | 'idle' | 'error'`
- NEVER use `enum` for simple string sets — unions cover the same ground with less machinery
- Use `as const` objects only when you need runtime iteration or reverse lookups (value to label mapping)
- Store as a plain string column in the DB matching the union literal; parse with Zod on read (`z.enum(['active', 'idle', 'error'])`)
- Exhaustive `switch` + `assertNever` works identically with unions (see Exhaustive Switch pattern above)

### Example

```typescript
// ❌ Unnecessary enum
enum Status {
  Active = 'active',
  Idle = 'idle',
  Error = 'error',
}

// ✅ String union — simpler, tree-shakes, works with discriminated unions
type Status = 'active' | 'idle' | 'error';

// ✅ as const object — when you need runtime iteration or value→label mapping
const STATUS = {
  active: 'Active',
  idle: 'Idle',
  error: 'Error',
} as const;

type Status = keyof typeof STATUS;
// STATUS keys are iterable: Object.keys(STATUS)
// Reverse lookup: STATUS['active'] → 'Active'

// ✅ DB boundary — parse string column back into union
const StatusSchema = z.enum(['active', 'idle', 'error']);
type Status = z.infer<typeof StatusSchema>; // 'active' | 'idle' | 'error'

function parseUserRow(row: unknown) {
  const user = UserRowSchema.parse(row); // status validated as union literal
  return user;
}
```

---

## Anti-Patterns to Avoid

### God Objects

```typescript
// ❌ Accumulates unrelated options
function createUser(options: {
  name: string;
  email: string;
  sendWelcomeEmail: boolean; // Behavioral flag
  notificationPreference: string; // Unrelated concern
  analyticsId?: string; // Unrelated concern
  theme: "light" | "dark"; // UI concern in domain function
}) {}

// ✅ Focused configuration, separate concerns
function createUser(profile: UserProfile): User {}
function sendWelcomeEmail(user: User): void {}
function setNotificationPreference(
  userId: string,
  pref: NotificationPref
): void {}
```

### Wrong Abstraction

```typescript
// ❌ Premature DRY - these look similar but vary independently
function processEntity(
  entity: User | Product | Order,
  type: "user" | "product" | "order"
) {
  if (type === "user") {
    /* user-specific logic */
  } else if (type === "product") {
    /* product-specific logic */
  } else {
    /* order-specific logic */
  }
}

// ✅ Separate functions - duplication is better than wrong abstraction
function processUser(user: User) {}
function processProduct(product: Product) {}
function processOrder(order: Order) {}

// If they share code, extract a utility they both call
function validateTimestamp(ts: Date): boolean {} // Shared utility
```

### Stringly-Typed APIs

```typescript
// ❌ Behavior depends on magic strings
function handleEvent(eventType: string, payload: unknown) {
  if (eventType === "user.created") {
  } else if (eventType === "user.deleted") {
  }
}

// ✅ Discriminated union makes it type-safe
type AppEvent =
  | { type: "user.created"; user: User }
  | { type: "user.deleted"; userId: string };

function handleEvent(event: AppEvent) {
  switch (event.type) {
    case "user.created":
      return onUserCreated(event.user);
    case "user.deleted":
      return onUserDeleted(event.userId);
    default:
      assertNever(event);
  }
}
```

---

## TypeScript Patterns

### Exhaustive Switch (Decisions at the Edges)

Use in composition layers for strategy selection. Compiler catches missing cases.

```typescript
function assertNever(x: never): never {
  throw new Error(`Unexpected value: ${x}`);
}

type Status = "pending" | "approved" | "rejected";

function handleStatus(status: Status): string {
  switch (status) {
    case "pending":
      return "Waiting for review";
    case "approved":
      return "Ready to proceed";
    case "rejected":
      return "Please resubmit";
    default:
      return assertNever(status); // Compiler error if case missed
  }
}
```

### Boundary Validation (Decisions at the Edges)

Validation is a decision—do it at system boundaries, not scattered through core logic.

```typescript
import { z } from "zod";

// Define shape expectations at the boundary
const CreateOrderInput = z.object({
  customerId: z.string().uuid(),
  items: z
    .array(
      z.object({
        productId: z.string().uuid(),
        quantity: z.number().int().positive(),
      })
    )
    .nonempty(),
  discountCode: z.string().optional(),
});

type CreateOrderInput = z.infer<typeof CreateOrderInput>;

// ✅ Boundary: parse unknown input, handle validation errors
function createOrderHandler(req: Request) {
  const input = CreateOrderInput.parse(req.body); // Throws if invalid
  return createOrder(input);
}

// ✅ Core: receives validated data, no defensive checks needed
function createOrder(input: CreateOrderInput): Order {
  // Trust the types - validation already happened at the edge
}
```

### Config Objects with `satisfies` (Make Implicit Explicit)

Type-check config without losing literal inference.

```typescript
const config = {
  apiUrl: "https://api.example.com",
  timeoutMs: 5000,
  retryCount: 3,
} satisfies Readonly<ApiConfig>;
// Gets type checking AND preserves literal types
```

---

## Testing Expectations

- Each strategy tested in isolation
- Composition layer tested with mocked strategies
- Core functions: thorough unit tests
- Convenience wrappers: smoke tests only (they're pure delegation)
- When splitting a function with boolean flags, test count becomes additive not multiplicative

---

## Summary: Decision Framework

When writing a new function, ask:

1. **Am I selecting between algorithms?** → Move selection to composition layer
2. **Does this parameter change the algorithm or just inputs?** → Split if algorithm changes
3. **Can I understand this without reading the implementation?** → Rename if not
4. **Am I commenting WHAT instead of WHY?** → Delete or refactor
5. **Is this abstraction forced?** → Prefer duplication over wrong abstraction
