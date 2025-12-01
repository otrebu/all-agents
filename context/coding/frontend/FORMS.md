# Forms & Validation

react-hook-form + zod for performant, type-safe forms.

## Setup

Install react-hook-form zod @hookform/resolvers

## Basic Form

```typescript
import { useForm } from "react-hook-form";

const {
  register,
  handleSubmit,
  formState: { errors },
} = useForm();

<form onSubmit={handleSubmit(onSubmit)}>
  <input {...register("email", { required: true })} />
  {errors.email && <span>Required</span>}
</form>;
```

## With Zod Validation

```typescript
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

const schema = z.object({
  email: z.string().email(),
  age: z.number().min(18),
  role: z.enum(["admin", "user"]),
});

type FormData = z.infer<typeof schema>;

const { register, handleSubmit } = useForm<FormData>({
  resolver: zodResolver(schema),
});
```

## Zod Patterns

```typescript
// Optional with default
z.string().optional().default("");

// Transform
z.string().transform((s) => s.toLowerCase());

// Refinement
z.string().refine((s) => s.length > 0, "Required");

// Nested objects
z.object({
  address: z.object({
    street: z.string(),
    city: z.string(),
  }),
});

// Arrays
z.array(z.string()).min(1);
```

## Form State

```typescript
const {
  formState: {
    errors, // Field errors
    isSubmitting,
    isDirty,
    isValid,
  },
  reset, // Reset form
  setValue, // Set field value
  watch, // Watch field changes
} = useForm();
```
