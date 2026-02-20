---
depends:
  - "@context/blocks/security/better-auth.md"
  - "@context/blocks/construct/react.md"
  - "@context/blocks/construct/react-hook-form.md"
  - "@context/blocks/construct/zod.md"
  - "@context/blocks/construct/tanstack-router.md"
  - "@context/foundations/security/secrets-env-vite.md"
---

# Better Auth React Integration

Connect Better Auth to React with useSession, forms, and social auth.

## References

@context/blocks/security/better-auth.md
@context/blocks/construct/react-hook-form.md

---

## Client Setup

```typescript
// src/lib/auth-client.ts
import { createAuthClient } from "better-auth/react";
import { config } from "../config";

export const authClient = createAuthClient({
  baseURL: config.apiUrl,
});

export const { signIn, signUp, signOut, useSession } = authClient;
export type Session = typeof authClient.$Infer.Session;
```

---

## useSession Hook

```typescript
function UserProfile() {
  const { data: session, isPending, error } = useSession();

  if (isPending) return <Spinner />;
  if (error) return <div>Error: {error.message}</div>;
  if (!session) return <div>Not logged in</div>;

  return (
    <div>
      <p>Welcome, {session.user.name}</p>
      <p>{session.user.email}</p>
    </div>
  );
}
```

Returns: `{ data: Session | null, isPending: boolean, error: Error | null, refetch }`

---

## Auth Schemas

```typescript
import { z } from "zod";

export const signInSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(1, "Required"),
});

export const signUpSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(8, "Min 8 characters"),
  name: z.string().min(1, "Required"),
});

export type SignInData = z.infer<typeof signInSchema>;
export type SignUpData = z.infer<typeof signUpSchema>;
```

---

## Sign In Form

```typescript
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "@tanstack/react-router";
import { authClient } from "@/lib/auth-client";
import { signInSchema, type SignInData } from "@/lib/auth-schemas";

function SignInForm() {
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<SignInData>({
    resolver: zodResolver(signInSchema),
  });

  const onSubmit = async (data: SignInData) => {
    await authClient.signIn.email(data, {
      onSuccess: () => navigate({ to: "/dashboard" }),
      onError: (ctx) => {
        setError("root", { message: ctx.error.message });
      },
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input type="email" {...register("email")} />
      {errors.email && <p>{errors.email.message}</p>}

      <input type="password" {...register("password")} />
      {errors.password && <p>{errors.password.message}</p>}

      {errors.root && <p className="error">{errors.root.message}</p>}

      <button disabled={isSubmitting}>
        {isSubmitting ? "Signing in..." : "Sign In"}
      </button>
    </form>
  );
}
```

---

## Sign Up Form

```typescript
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "@tanstack/react-router";
import { authClient } from "@/lib/auth-client";
import { signUpSchema, type SignUpData } from "@/lib/auth-schemas";

function SignUpForm() {
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<SignUpData>({
    resolver: zodResolver(signUpSchema),
  });

  const onSubmit = async (data: SignUpData) => {
    await authClient.signUp.email(data, {
      onSuccess: () => navigate({ to: "/dashboard" }),
      onError: (ctx) => {
        setError("root", { message: ctx.error.message });
      },
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input {...register("name")} placeholder="Name" />
      {errors.name && <p>{errors.name.message}</p>}

      <input type="email" {...register("email")} />
      {errors.email && <p>{errors.email.message}</p>}

      <input type="password" {...register("password")} />
      {errors.password && <p>{errors.password.message}</p>}

      {errors.root && <p className="error">{errors.root.message}</p>}

      <button disabled={isSubmitting}>
        {isSubmitting ? "Creating account..." : "Sign Up"}
      </button>
    </form>
  );
}
```

---

## Social Auth

```typescript
function SocialButtons() {
  return (
    <div>
      <button
        onClick={() =>
          authClient.signIn.social({
            provider: "google",
            callbackURL: "/dashboard",
          })
        }
      >
        Continue with Google
      </button>
      <button
        onClick={() =>
          authClient.signIn.social({
            provider: "github",
            callbackURL: "/dashboard",
          })
        }
      >
        Continue with GitHub
      </button>
    </div>
  );
}
```

---

## Sign Out

```typescript
import { useNavigate } from "@tanstack/react-router";
import { authClient } from "@/lib/auth-client";

function SignOutButton() {
  const navigate = useNavigate();

  return (
    <button
      onClick={async () => {
        await authClient.signOut({
          fetchOptions: { onSuccess: () => navigate({ to: "/login" }) },
        });
      }}
    >
      Sign Out
    </button>
  );
}
```

---

## Error Codes

```typescript
type AuthErrorCode =
  | "INVALID_CREDENTIALS"
  | "USER_NOT_FOUND"
  | "EMAIL_ALREADY_IN_USE"
  | "WEAK_PASSWORD"
  | "RATE_LIMITED";

const errorMessages: Record<AuthErrorCode, string> = {
  INVALID_CREDENTIALS: "Email or password is incorrect",
  USER_NOT_FOUND: "No account with this email",
  EMAIL_ALREADY_IN_USE: "Account already exists",
  WEAK_PASSWORD: "Password must be at least 8 characters",
  RATE_LIMITED: "Too many attempts, try again later",
};

function isAuthErrorCode(code: string): code is AuthErrorCode {
  return code in errorMessages;
}

function getAuthErrorMessage(code: string): string {
  return isAuthErrorCode(code) ? errorMessages[code] : "An error occurred";
}
```

---

## TypeScript Inference

```typescript
export type Session = typeof authClient.$Infer.Session;
export type User = Session["user"];

import type { auth } from "./auth";
export type ServerSession = typeof auth.$Infer.Session;
```
