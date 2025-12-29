---
depends: []
---

# React Hook Form

Type-safe form handling with schema validation.

---

## Basic Setup

```typescript
import { useForm } from "react-hook-form";

type FormData = { email: string; password: string };

function LoginForm() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>();

  const onSubmit = (data: FormData) => console.log(data);

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input {...register("email", { required: "Email required" })} />
      {errors.email && <span>{errors.email.message}</span>}

      <input type="password" {...register("password", { minLength: 8 })} />
      {errors.password && <span>Min 8 chars</span>}

      <button type="submit">Submit</button>
    </form>
  );
}
```

---

## Zod Integration

```typescript
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const schema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(8, "Min 8 characters"),
});

type FormData = z.infer<typeof schema>;

function LoginForm() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    await api.login(data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input {...register("email")} />
      {errors.email && <span>{errors.email.message}</span>}

      <input type="password" {...register("password")} />
      {errors.password && <span>{errors.password.message}</span>}

      <button disabled={isSubmitting}>
        {isSubmitting ? "Loading..." : "Submit"}
      </button>
    </form>
  );
}
```

---

## formState

```typescript
const {
  formState: {
    errors, // Field errors object
    isSubmitting, // Form is submitting
    isValid, // All fields valid (needs mode: "onChange")
    isDirty, // Any field modified
    dirtyFields, // Which fields modified
    isSubmitted, // Form submitted at least once
  },
} = useForm();
```

---

## Validation Modes

```typescript
useForm({
  mode: "onSubmit", // Default - validate on submit
  mode: "onChange", // Validate on every change
  mode: "onBlur", // Validate on blur
  mode: "onTouched", // Validate on first blur, then onChange
  mode: "all", // Validate on blur + change
});
```

---

## Server Errors

```typescript
const { setError, clearErrors } = useForm();

// Set server error on field
setError("email", {
  type: "server",
  message: "Email already exists",
});

// Set root error (form-level)
setError("root", {
  type: "server",
  message: "Invalid credentials",
});

// Access root error
{
  errors.root && <div>{errors.root.message}</div>;
}
```

---

## Common Patterns

```typescript
// Default values
useForm({
  defaultValues: { email: "", password: "" },
});

// Reset form
const { reset } = useForm();
reset(); // Reset to defaults
reset({ email: "new@email.com" }); // Reset with new values

// Watch values
const { watch } = useForm();
const email = watch("email"); // Subscribe to field
const all = watch(); // Subscribe to all

// Controlled input (rare)
import { Controller } from "react-hook-form";
<Controller
  name="date"
  control={control}
  render={({ field }) => <DatePicker {...field} />}
/>;
```

---

## Best Practices

**DO:**

- Use `zodResolver` for schema validation
- Use `isSubmitting` to disable submit button
- Use `setError` for server-side errors
- Define schema outside component

**DON'T:**

- Create schema inside render (expensive)
- Use `Controller` when `register` works
- Forget to show `errors.root` for form-level errors
