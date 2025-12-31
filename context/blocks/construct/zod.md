---
depends: []
---

# Zod

Type-safe schema validation with TypeScript inference.

## Setup

```bash
pnpm add zod
```

## Basic Schemas

```typescript
import { z } from "zod";

// Primitives
const str = z.string();
const num = z.number();
const bool = z.boolean();
const date = z.date();

// Objects
const userSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  age: z.number().int().positive(),
  role: z.enum(["admin", "user"]),
});

// Type inference
type User = z.infer<typeof userSchema>;
```

## Validation

```typescript
// Parse (throws on invalid)
const user = userSchema.parse(data);

// Safe parse (returns result object)
const result = userSchema.safeParse(data);
if (result.success) {
  console.log(result.data);
} else {
  console.log(result.error.issues);
}
```

## Common Patterns

```typescript
// Optional with default
z.string().optional().default("");

// Nullable
z.string().nullable();

// Transformations
z.string().transform((str) => str.toLowerCase());
z.string().transform((str) => parseInt(str, 10));

// Refinement (custom validation)
z.string().refine((str) => str.length > 0, "Required");
z.number().refine((num) => num % 2 === 0, "Must be even");

// Coercion (auto-convert types)
z.coerce.number(); // "42" → 42
z.coerce.boolean(); // "true" → true
z.coerce.date(); // "2024-01-01" → Date
```

## Nested & Complex Types

```typescript
// Nested objects
const addressSchema = z.object({
  street: z.string(),
  city: z.string(),
  zip: z.string().regex(/^\d{5}$/),
});

const personSchema = z.object({
  name: z.string(),
  address: addressSchema,
});

// Arrays
z.array(z.string()).min(1).max(10);
z.string().array(); // Same as above

// Unions
z.union([z.string(), z.number()]);
z.string().or(z.number()); // Shorthand

// Discriminated unions (recommended for tagged types)
const eventSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("click"), x: z.number(), y: z.number() }),
  z.object({ type: z.literal("scroll"), offset: z.number() }),
]);

// Records
z.record(z.string(), z.number()); // { [key: string]: number }

// Tuples
z.tuple([z.string(), z.number()]); // [string, number]
```

## Schema Composition

```typescript
// Extend
const baseUser = z.object({ id: z.string(), email: z.string() });
const adminUser = baseUser.extend({ permissions: z.array(z.string()) });

// Merge
const merged = schemaA.merge(schemaB);

// Pick / Omit
const userWithoutId = userSchema.omit({ id: true });
const justEmail = userSchema.pick({ email: true });

// Partial / Required
const partialUser = userSchema.partial(); // All optional
const requiredUser = partialSchema.required(); // All required

// Passthrough (allow unknown keys)
const looseSchema = userSchema.passthrough();

// Strict (error on unknown keys)
const strictSchema = userSchema.strict();
```

## Error Handling

```typescript
const result = schema.safeParse(data);

if (!result.success) {
  // Formatted errors
  const formatted = result.error.format();
  // { email: { _errors: ["Invalid email"] } }

  // Flat array
  const issues = result.error.issues;
  // [{ path: ["email"], message: "Invalid email", code: "invalid_string" }]

  // First error only
  const first = result.error.issues[0]?.message;
}
```

## Custom Error Messages

```typescript
z.string().min(1, "Required");
z.string().email("Invalid email format");
z.number().positive("Must be positive");

// Object-level errors
z.object({
  password: z.string(),
  confirm: z.string(),
}).refine((data) => data.password === data.confirm, {
  message: "Passwords don't match",
  path: ["confirm"],
});
```

## Best Practices

**DO:**
- Use `z.infer<typeof schema>` for type extraction
- Use `safeParse` in APIs, `parse` when you want exceptions
- Use discriminated unions for tagged types (better performance)
- Use `coerce` for form/query string data

**DON'T:**
- Create schemas inside render functions (expensive)
- Use `.refine()` when built-in validators exist
- Forget to handle errors from `safeParse`
