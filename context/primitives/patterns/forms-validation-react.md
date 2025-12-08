---
depends: []
---

# Forms & Validation

react-hook-form + zod for performant, type-safe forms.

> **Zod reference:** See @primitives/tools/zod.md for schema patterns

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
  age: z.coerce.number().min(18),
  role: z.enum(["admin", "user"]),
});

type FormData = z.infer<typeof schema>;

const { register, handleSubmit } = useForm<FormData>({
  resolver: zodResolver(schema),
});
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

## Field Arrays

```typescript
import { useFieldArray } from "react-hook-form";

const { fields, append, remove } = useFieldArray({
  control,
  name: "items",
});

{
  fields.map((field, index) => (
    <div key={field.id}>
      <input {...register(`items.${index}.name`)} />
      <button onClick={() => remove(index)}>Remove</button>
    </div>
  ));
}
<button onClick={() => append({ name: "" })}>Add</button>;
```

## Controlled Components

```typescript
import { Controller } from "react-hook-form";

<Controller
  name="date"
  control={control}
  render={({ field }) => <DatePicker {...field} />}
/>;
```
