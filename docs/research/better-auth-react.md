# Better Auth React Integration

Comprehensive reference for integrating Better Auth with React applications. This guide covers hooks, patterns, TypeScript integration, and best practices.

## Table of Contents

- [Installation and Setup](#installation-and-setup)
- [Creating the Auth Client](#creating-the-auth-client)
- [Core Hooks](#core-hooks)
  - [useSession Hook](#usesession-hook)
- [Authentication Methods](#authentication-methods)
  - [Sign Up](#sign-up)
  - [Sign In](#sign-in)
  - [Sign Out](#sign-out)
  - [Social/OAuth Authentication](#socialoauth-authentication)
- [Protected Routes](#protected-routes)
- [Loading States](#loading-states)
- [Error Handling](#error-handling)
- [TypeScript Integration](#typescript-integration)
- [Session Management](#session-management)
- [Performance Optimization](#performance-optimization)
- [Better Auth UI Components](#better-auth-ui-components)
- [Testing Authenticated Components](#testing-authenticated-components)
- [Best Practices](#best-practices)
- [Common Patterns](#common-patterns)

---

## Installation and Setup

### Install the Package

```bash
npm install better-auth
# or
pnpm add better-auth
# or
bun add better-auth
```

### Project Structure

```
src/
  lib/
    auth.ts          # Server-side auth configuration
    auth-client.ts   # Client-side auth client
  components/
    auth/
      SignInForm.tsx
      SignUpForm.tsx
      UserButton.tsx
      ProtectedRoute.tsx
```

---

## Creating the Auth Client

Import `createAuthClient` from `better-auth/react` for React-specific hooks and functionality.

### Basic Setup

```typescript
// src/lib/auth-client.ts
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  baseURL: "http://localhost:3000", // Your auth server URL
});

// Export individual methods for convenience
export const { signIn, signUp, signOut, useSession } = authClient;
```

### With Same Domain Server

If your auth server operates on the same domain, you can omit the `baseURL`:

```typescript
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient();
```

### With Custom Fetch Options

```typescript
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  baseURL: "http://localhost:3000",
  fetchOptions: {
    credentials: "include",
    // Additional fetch options
  },
});
```

---

## Core Hooks

### useSession Hook

The `useSession` hook provides reactive session data using nanostore under the hood. Changes to the session (such as signing out) are immediately reflected in your UI.

#### Basic Usage

```tsx
import { authClient } from "@/lib/auth-client";

export function User() {
  const { data: session, isPending, error, refetch } = authClient.useSession();

  if (isPending) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error.message}</div>;
  }

  if (!session) {
    return <div>Not logged in</div>;
  }

  return (
    <div>
      <p>Welcome, {session.user.name}!</p>
      <p>Email: {session.user.email}</p>
    </div>
  );
}
```

#### Hook Return Values

| Property    | Type       | Description                               |
|-------------|------------|-------------------------------------------|
| `data`      | `Session`  | The session object containing user info   |
| `isPending` | `boolean`  | Loading state indicator                   |
| `error`     | `Error`    | Error object if session fetch failed      |
| `refetch`   | `function` | Function to manually refetch the session  |

#### Session Object Structure

```typescript
interface Session {
  user: {
    id: string;
    name: string;
    email: string;
    emailVerified: boolean;
    image?: string;
    createdAt: Date;
    updatedAt: Date;
  };
  session: {
    id: string;
    token: string;
    userId: string;
    expiresAt: Date;
    ipAddress?: string;
    userAgent?: string;
  };
}
```

#### Alternative: getSession Method

If you prefer not to use the hook, use the `getSession` method:

```typescript
const { data: session, error } = await authClient.getSession();
```

This is also useful with TanStack Query:

```tsx
import { useQuery } from "@tanstack/react-query";
import { authClient } from "@/lib/auth-client";

export function useSessionQuery() {
  return useQuery({
    queryKey: ["session"],
    queryFn: () => authClient.getSession(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
```

---

## Authentication Methods

### Sign Up

```tsx
import { authClient } from "@/lib/auth-client";

async function handleSignUp(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const name = formData.get("name") as string;

  const { data, error } = await authClient.signUp.email(
    {
      email,
      password, // Minimum 8 characters by default
      name,
      image: undefined, // Optional
      callbackURL: "/dashboard", // Optional redirect after signup
    },
    {
      onRequest: (ctx) => {
        // Show loading indicator
      },
      onSuccess: (ctx) => {
        // Redirect to dashboard
      },
      onError: (ctx) => {
        alert(ctx.error.message);
      },
    }
  );

  if (error) {
    console.error("Sign up failed:", error.message);
  }
}
```

#### Complete Sign Up Form Component

```tsx
import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { useNavigate } from "react-router-dom";

export function SignUpForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);

    await authClient.signUp.email(
      {
        email: formData.get("email") as string,
        password: formData.get("password") as string,
        name: formData.get("name") as string,
      },
      {
        onSuccess: () => {
          navigate("/dashboard");
        },
        onError: (ctx) => {
          setError(ctx.error.message);
          setIsLoading(false);
        },
      }
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <input type="text" name="name" placeholder="Name" required />
      <input type="email" name="email" placeholder="Email" required />
      <input type="password" name="password" placeholder="Password" required minLength={8} />
      {error && <p className="error">{error}</p>}
      <button type="submit" disabled={isLoading}>
        {isLoading ? "Creating account..." : "Sign Up"}
      </button>
    </form>
  );
}
```

### Sign In

```tsx
import { authClient } from "@/lib/auth-client";

async function handleSignIn(email: string, password: string) {
  const { data, error } = await authClient.signIn.email(
    {
      email,
      password,
      callbackURL: "/dashboard", // Optional
      rememberMe: true, // Default is true
    },
    {
      onSuccess: () => {
        console.log("Signed in successfully");
      },
      onError: (ctx) => {
        console.error("Sign in failed:", ctx.error.message);
      },
    }
  );
}
```

#### Complete Sign In Form Component

```tsx
import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { useNavigate } from "react-router-dom";

export function SignInForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);

    await authClient.signIn.email(
      {
        email: formData.get("email") as string,
        password: formData.get("password") as string,
      },
      {
        onSuccess: () => {
          navigate("/dashboard");
        },
        onError: (ctx) => {
          setError(ctx.error.message);
          setIsLoading(false);
        },
      }
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <input type="email" name="email" placeholder="Email" required />
      <input type="password" name="password" placeholder="Password" required />
      {error && <p className="error">{error}</p>}
      <button type="submit" disabled={isLoading}>
        {isLoading ? "Signing in..." : "Sign In"}
      </button>
    </form>
  );
}
```

### Sign Out

```tsx
import { authClient } from "@/lib/auth-client";
import { useNavigate } from "react-router-dom";

export function SignOutButton() {
  const navigate = useNavigate();

  async function handleSignOut() {
    await authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          navigate("/login");
        },
      },
    });
  }

  return <button onClick={handleSignOut}>Sign Out</button>;
}
```

### Social/OAuth Authentication

#### Server Configuration

```typescript
// auth.ts (server-side)
import { betterAuth } from "better-auth";

export const auth = betterAuth({
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      scope: ["email", "profile"],
    },
    github: {
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    },
  },
});
```

#### Client-Side Social Sign In

```tsx
import { authClient } from "@/lib/auth-client";

export function SocialSignIn() {
  const handleGoogleLogin = async () => {
    await authClient.signIn.social({
      provider: "google",
      callbackURL: "/dashboard",
      errorCallbackURL: "/auth/error",
      newUserCallbackURL: "/welcome", // For new registrations
    });
  };

  const handleGithubLogin = async () => {
    await authClient.signIn.social({
      provider: "github",
      callbackURL: "/dashboard",
    });
  };

  return (
    <div>
      <button onClick={handleGoogleLogin}>Continue with Google</button>
      <button onClick={handleGithubLogin}>Continue with GitHub</button>
    </div>
  );
}
```

#### Advanced: Linking Additional Scopes

Request additional OAuth scopes after initial signup:

```typescript
// Request additional Google Drive access
await authClient.linkSocial({
  provider: "google",
  scopes: ["https://www.googleapis.com/auth/drive.file"],
});
```

#### Passing Additional Data Through OAuth

```typescript
await authClient.signIn.social({
  provider: "google",
  additionalData: {
    referralCode: "ABC123",
    source: "landing-page",
  },
});
```

---

## Protected Routes

### React Router Pattern

```tsx
import { Navigate, Outlet } from "react-router-dom";
import { authClient } from "@/lib/auth-client";

export function ProtectedRoute() {
  const { data: session, isPending } = authClient.useSession();

  if (isPending) {
    return <div>Loading...</div>;
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}

// Usage in router configuration
import { createBrowserRouter } from "react-router-dom";

const router = createBrowserRouter([
  {
    path: "/",
    element: <Layout />,
    children: [
      { path: "login", element: <LoginPage /> },
      {
        element: <ProtectedRoute />,
        children: [
          { path: "dashboard", element: <DashboardPage /> },
          { path: "profile", element: <ProfilePage /> },
        ],
      },
    ],
  },
]);
```

### TanStack Router Pattern

```tsx
import { createMiddleware, redirect } from "@tanstack/react-router";
import { auth } from "@/lib/auth";

const authMiddleware = createMiddleware().server(async ({ request }) => {
  const headers = request.headers;
  const session = await auth.api.getSession({ headers });

  if (!session) {
    throw redirect({ to: "/login" });
  }

  return { session };
});

// In route definition
export const dashboardRoute = createRoute({
  path: "/dashboard",
  component: DashboardPage,
  middleware: [authMiddleware],
});
```

### Using beforeLoad in TanStack Router

```tsx
import { createRoute, redirect } from "@tanstack/react-router";
import { auth } from "@/lib/auth";

export const protectedRoute = createRoute({
  id: "protected",
  beforeLoad: async ({ context }) => {
    const session = await auth.api.getSession({
      headers: context.request.headers,
    });

    if (!session) {
      throw redirect({ to: "/login" });
    }

    return { session };
  },
});
```

---

## Loading States

### Global Loading Component

```tsx
import { authClient } from "@/lib/auth-client";

export function AuthLoading({ children }: { children: React.ReactNode }) {
  const { isPending } = authClient.useSession();

  if (isPending) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return <>{children}</>;
}
```

### Skeleton Loading Pattern

```tsx
export function UserProfileSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-12 w-12 bg-gray-200 rounded-full" />
      <div className="h-4 bg-gray-200 rounded w-32 mt-2" />
      <div className="h-3 bg-gray-200 rounded w-48 mt-1" />
    </div>
  );
}

export function UserProfile() {
  const { data: session, isPending } = authClient.useSession();

  if (isPending) {
    return <UserProfileSkeleton />;
  }

  if (!session) {
    return null;
  }

  return (
    <div>
      <img src={session.user.image} alt={session.user.name} />
      <h2>{session.user.name}</h2>
      <p>{session.user.email}</p>
    </div>
  );
}
```

---

## Error Handling

### Response-Based Error Handling

```typescript
const { data, error } = await authClient.signIn.email({
  email: "user@example.com",
  password: "password123",
});

if (error) {
  // Error object structure
  console.error({
    message: error.message,
    status: error.status,      // HTTP status code
    statusText: error.statusText,
  });
}
```

### Callback-Based Error Handling

```typescript
await authClient.signIn.email(
  {
    email: "user@example.com",
    password: "password123",
  },
  {
    onError: (ctx) => {
      // Access error details
      console.error(ctx.error.message);

      // Show user-friendly message
      toast.error(getErrorMessage(ctx.error.code));
    },
  }
);
```

### Using Error Codes

Better Auth provides error code mappings for custom error messages:

```typescript
const authClient = createAuthClient();

// Access error codes
const errorCodes = authClient.$ERROR_CODES;

function getErrorMessage(code: string): string {
  const messages: Record<string, string> = {
    INVALID_CREDENTIALS: "Email or password is incorrect",
    USER_NOT_FOUND: "No account found with this email",
    EMAIL_NOT_VERIFIED: "Please verify your email first",
    RATE_LIMITED: "Too many attempts. Please try again later",
    // Add more as needed
  };

  return messages[code] || "An unexpected error occurred";
}
```

### Error Boundary for Auth Errors

```tsx
import { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class AuthErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Auth error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div>
            <h2>Authentication Error</h2>
            <p>{this.state.error?.message}</p>
            <button onClick={() => window.location.reload()}>
              Reload
            </button>
          </div>
        )
      );
    }

    return this.props.children;
  }
}
```

---

## TypeScript Integration

### Inferring Types from Client

```typescript
// src/lib/auth-client.ts
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient();

// Export inferred types
export type Session = typeof authClient.$Infer.Session;
export type User = typeof authClient.$Infer.Session["user"];
```

### Inferring Types from Server

```typescript
// src/lib/auth.ts (server)
import { betterAuth } from "better-auth";

export const auth = betterAuth({
  database: new Database("database.db"),
});

export type Session = typeof auth.$Infer.Session;
```

### Using inferAdditionalFields Plugin

When server and client are in the same project:

```typescript
import { createAuthClient } from "better-auth/react";
import { inferAdditionalFields } from "better-auth/client/plugins";
import type { auth } from "./auth"; // Server auth config

export const authClient = createAuthClient({
  plugins: [inferAdditionalFields<typeof auth>()],
});
```

For separate projects:

```typescript
import { createAuthClient } from "better-auth/react";
import { inferAdditionalFields } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  plugins: [
    inferAdditionalFields({
      user: {
        role: { type: "string" },
        organizationId: { type: "string" },
      },
    }),
  ],
});
```

### Custom Session Plugin

```typescript
// Server-side
import { customSession } from "better-auth/plugins";

export const auth = betterAuth({
  plugins: [
    customSession(async ({ user, session }) => {
      const roles = await findUserRoles(session.session.userId);
      return {
        roles,
        user: { ...user, fullName: `${user.firstName} ${user.lastName}` },
        session,
      };
    }),
  ],
});

// Client-side
import { customSessionClient } from "better-auth/client/plugins";
import type { auth } from "@/lib/auth";

export const authClient = createAuthClient({
  plugins: [customSessionClient<typeof auth>()],
});

// Now useSession includes custom fields
const { data } = authClient.useSession();
// data.roles is available and typed
```

---

## Session Management

### Session Configuration

```typescript
// Server-side configuration
import { betterAuth } from "better-auth";

export const auth = betterAuth({
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days in seconds
    updateAge: 60 * 60 * 24,     // Refresh after 1 day
  },
});
```

### Listing Active Sessions

```tsx
import { authClient } from "@/lib/auth-client";

export function SessionsManager() {
  const [sessions, setSessions] = useState([]);

  useEffect(() => {
    async function loadSessions() {
      const result = await authClient.listSessions();
      setSessions(result.data || []);
    }
    loadSessions();
  }, []);

  const revokeSession = async (token: string) => {
    await authClient.revokeSession({ token });
    setSessions(sessions.filter((s) => s.token !== token));
  };

  return (
    <div>
      <h2>Active Sessions</h2>
      {sessions.map((session) => (
        <div key={session.id}>
          <p>{session.userAgent}</p>
          <p>{session.ipAddress}</p>
          <button onClick={() => revokeSession(session.token)}>
            Revoke
          </button>
        </div>
      ))}
    </div>
  );
}
```

### Revoking Sessions

```typescript
// Revoke a specific session
await authClient.revokeSession({ token: "session-token" });

// Revoke all other sessions (keep current)
await authClient.revokeOtherSessions();

// Revoke all sessions
await authClient.revokeSessions();

// Revoke sessions during password change
await authClient.changePassword({
  newPassword: "newPassword123",
  currentPassword: "currentPassword123",
  revokeOtherSessions: true,
});
```

---

## Performance Optimization

### Cookie Caching

Reduce database queries by caching session data in signed cookies:

```typescript
// Server-side
export const auth = betterAuth({
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60, // 5 minutes in seconds
      strategy: "compact", // "compact" | "jwt" | "jwe"
    },
  },
});
```

#### Cache Strategies

| Strategy  | Size     | Security  | Readable | Best For         |
|-----------|----------|-----------|----------|------------------|
| `compact` | Smallest | Signed    | Yes      | Performance      |
| `jwt`     | Medium   | Signed    | Yes      | Interoperability |
| `jwe`     | Largest  | Encrypted | No       | Maximum security |

### Bypassing Cookie Cache

```typescript
// Force database refresh
const session = await authClient.getSession({
  query: { disableCookieCache: true },
});
```

### Automatic Cache Refresh

```typescript
session: {
  cookieCache: {
    enabled: true,
    maxAge: 5 * 60,
    refreshCache: true, // Auto-refresh at 80% of maxAge
    // Or custom timing:
    // refreshCache: { updateAge: 60 }
  },
}
```

### React Query Integration

```tsx
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { authClient } from "@/lib/auth-client";

export function useSessionQuery() {
  return useQuery({
    queryKey: ["session"],
    queryFn: () => authClient.getSession(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 60 * 1000, // Refetch every minute
  });
}

// Invalidate on auth actions
export function useSignOut() {
  const queryClient = useQueryClient();

  return async () => {
    await authClient.signOut();
    queryClient.invalidateQueries({ queryKey: ["session"] });
  };
}
```

### Server-Side Caching (Next.js)

```typescript
import { cache } from "react";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

// Cache session per request
export const getSession = cache(async () => {
  return auth.api.getSession({
    headers: await headers(),
  });
});
```

---

## Better Auth UI Components

For rapid implementation, use the `@daveyplate/better-auth-ui` package with shadcn/ui styled components.

### Installation

```bash
npm install @daveyplate/better-auth-ui
```

### AuthUIProvider Setup

```tsx
// src/providers.tsx
import { AuthUIProvider } from "@daveyplate/better-auth-ui";
import { authClient } from "@/lib/auth-client";
import { useNavigate, NavLink } from "react-router-dom";

export function Providers({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();

  return (
    <AuthUIProvider
      authClient={authClient}
      navigate={navigate}
      Link={NavLink}
    >
      {children}
    </AuthUIProvider>
  );
}
```

### SignedIn / SignedOut Components

```tsx
import { SignedIn, SignedOut, UserButton } from "@daveyplate/better-auth-ui";

export function Navbar() {
  return (
    <nav className="flex items-center justify-between px-4 h-14 border-b">
      <h1 className="text-lg font-semibold">My App</h1>
      <div className="flex gap-3 items-center">
        <SignedOut>
          <a href="/auth/sign-in">Sign In</a>
        </SignedOut>
        <SignedOut>
          <a href="/auth/sign-up">Create account</a>
        </SignedOut>
        <SignedIn>
          <UserButton />
        </SignedIn>
      </div>
    </nav>
  );
}
```

### AuthView Component

```tsx
import { useParams } from "react-router-dom";
import { AuthView } from "@daveyplate/better-auth-ui";

export function AuthPage() {
  const { pathname } = useParams();

  return <AuthView pathname={pathname} />;
}

// Supported paths:
// /auth/sign-in
// /auth/sign-up
// /auth/forgot-password
// /auth/reset-password
// /auth/magic-link
// /auth/sign-out
// /auth/settings
// /auth/callback
```

### Available UI Components

- **Authentication**: SignIn, SignUp, ForgotPassword, AuthView
- **User Management**: UserButton, UserAvatar
- **Conditional Rendering**: SignedIn, SignedOut, AuthLoading
- **Account Settings**:
  - ChangeEmailCard
  - ChangePasswordCard
  - DeleteAccountCard
  - UpdateAvatarCard
  - UpdateUsernameCard
  - SessionsCard
  - TwoFactorCard
  - PasskeysCard
- **Organizations**: OrganizationSwitcher, OrganizationMembersCard

---

## Testing Authenticated Components

### Mocking the useSession Hook

```tsx
// __mocks__/auth-client.ts
import { vi } from "vitest";

export const mockSession = {
  user: {
    id: "1",
    email: "test@example.com",
    name: "Test User",
    emailVerified: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  session: {
    id: "session-1",
    token: "mock-token",
    userId: "1",
    expiresAt: new Date(Date.now() + 86400000),
  },
};

export const authClient = {
  useSession: vi.fn(() => ({
    data: mockSession,
    isPending: false,
    error: null,
    refetch: vi.fn(),
  })),
  signIn: {
    email: vi.fn(),
    social: vi.fn(),
  },
  signUp: {
    email: vi.fn(),
  },
  signOut: vi.fn(),
  getSession: vi.fn(() => Promise.resolve({ data: mockSession })),
};
```

### Testing with Vitest

```tsx
import { render, screen } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { UserProfile } from "./UserProfile";

// Mock the auth client
vi.mock("@/lib/auth-client", () => ({
  authClient: {
    useSession: vi.fn(),
  },
}));

import { authClient } from "@/lib/auth-client";

describe("UserProfile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows loading state", () => {
    vi.mocked(authClient.useSession).mockReturnValue({
      data: null,
      isPending: true,
      error: null,
      refetch: vi.fn(),
    });

    render(<UserProfile />);
    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("shows user info when logged in", () => {
    vi.mocked(authClient.useSession).mockReturnValue({
      data: {
        user: { name: "John Doe", email: "john@example.com" },
        session: { id: "1" },
      },
      isPending: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<UserProfile />);
    expect(screen.getByText("John Doe")).toBeInTheDocument();
  });

  it("shows error message on error", () => {
    vi.mocked(authClient.useSession).mockReturnValue({
      data: null,
      isPending: false,
      error: { message: "Session expired" },
      refetch: vi.fn(),
    });

    render(<UserProfile />);
    expect(screen.getByText(/Session expired/)).toBeInTheDocument();
  });
});
```

### Using MSW for API Mocking

```typescript
// src/test/handlers.ts
import { http, HttpResponse } from "msw";

export const handlers = [
  http.get("/api/auth/session", () => {
    return HttpResponse.json({
      user: {
        id: "1",
        email: "test@example.com",
        name: "Test User",
      },
      session: {
        id: "session-1",
        token: "mock-token",
      },
    });
  }),

  http.post("/api/auth/sign-in/email", async ({ request }) => {
    const body = await request.json();
    if (body.email === "test@example.com" && body.password === "password") {
      return HttpResponse.json({ success: true });
    }
    return HttpResponse.json(
      { error: { message: "Invalid credentials" } },
      { status: 401 }
    );
  }),

  http.post("/api/auth/sign-out", () => {
    return HttpResponse.json({ success: true });
  }),
];

// src/test/setup.ts
import { setupServer } from "msw/node";
import { handlers } from "./handlers";

export const server = setupServer(...handlers);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

---

## Best Practices

### 1. Always Invoke Client Methods from Client Side

```typescript
// CORRECT - Call from client component
"use client";
await authClient.signIn.email({ email, password });

// INCORRECT - Don't call client methods from server
// Use auth.api methods instead for server-side
const session = await auth.api.getSession({ headers });
```

### 2. Handle All Loading States

```tsx
function AuthenticatedComponent() {
  const { data: session, isPending, error } = authClient.useSession();

  if (isPending) return <Skeleton />;
  if (error) return <ErrorMessage error={error} />;
  if (!session) return <RedirectToLogin />;

  return <MainContent user={session.user} />;
}
```

### 3. Use Environment Variables for Configuration

```typescript
// .env
VITE_AUTH_URL=http://localhost:3000

// auth-client.ts
export const authClient = createAuthClient({
  baseURL: import.meta.env.VITE_AUTH_URL,
});
```

### 4. Implement Proper Error Messages

```typescript
function getAuthErrorMessage(error: unknown): string {
  if (!error) return "An unexpected error occurred";

  const err = error as { code?: string; message?: string };

  const errorMessages: Record<string, string> = {
    INVALID_CREDENTIALS: "The email or password you entered is incorrect",
    USER_NOT_FOUND: "No account exists with this email address",
    EMAIL_ALREADY_IN_USE: "An account with this email already exists",
    WEAK_PASSWORD: "Password must be at least 8 characters",
    RATE_LIMITED: "Too many attempts. Please wait before trying again",
  };

  return errorMessages[err.code || ""] || err.message || "An error occurred";
}
```

### 5. Secure Cookie Settings in Production

```typescript
// Server-side for production
export const auth = betterAuth({
  advanced: {
    cookiePrefix: "auth",
    useSecureCookies: true, // HTTPS only
  },
});
```

### 6. Prevent Hook Rerenders When Needed

```typescript
// Prevent useSession from rerendering after this call
await authClient.updateUser({
  name: "New Name",
}, {
  disableSignal: true,
});
```

---

## Common Patterns

### User Button with Dropdown

```tsx
import { authClient } from "@/lib/auth-client";
import { useNavigate } from "react-router-dom";

export function UserButton() {
  const { data: session } = authClient.useSession();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);

  if (!session) return null;

  const handleSignOut = async () => {
    await authClient.signOut();
    navigate("/login");
  };

  return (
    <div className="relative">
      <button onClick={() => setIsOpen(!isOpen)}>
        <img
          src={session.user.image || "/default-avatar.png"}
          alt={session.user.name}
          className="w-8 h-8 rounded-full"
        />
      </button>
      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white shadow-lg rounded-md">
          <div className="p-2 border-b">
            <p className="font-medium">{session.user.name}</p>
            <p className="text-sm text-gray-500">{session.user.email}</p>
          </div>
          <button
            onClick={() => navigate("/settings")}
            className="w-full text-left p-2 hover:bg-gray-100"
          >
            Settings
          </button>
          <button
            onClick={handleSignOut}
            className="w-full text-left p-2 hover:bg-gray-100 text-red-500"
          >
            Sign Out
          </button>
        </div>
      )}
    </div>
  );
}
```

### Auth Context Wrapper (Optional)

If you prefer a context-based approach:

```tsx
import { createContext, useContext, ReactNode } from "react";
import { authClient } from "@/lib/auth-client";

type Session = typeof authClient.$Infer.Session;

interface AuthContextType {
  session: Session | null;
  isLoading: boolean;
  error: Error | null;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { data: session, isPending: isLoading, error } = authClient.useSession();

  const signOut = async () => {
    await authClient.signOut();
  };

  return (
    <AuthContext.Provider value={{ session, isLoading, error, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
```

### Redirect After Login Pattern

```tsx
import { useSearchParams, useNavigate } from "react-router-dom";
import { authClient } from "@/lib/auth-client";

export function LoginPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const redirectTo = searchParams.get("redirect") || "/dashboard";

  const handleLogin = async (email: string, password: string) => {
    await authClient.signIn.email(
      { email, password },
      {
        onSuccess: () => {
          navigate(redirectTo);
        },
      }
    );
  };

  // ... form implementation
}

// Protected route redirects to login with return URL
export function ProtectedRoute() {
  const { data: session, isPending } = authClient.useSession();
  const location = useLocation();

  if (isPending) return <Loading />;

  if (!session) {
    const returnUrl = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?redirect=${returnUrl}`} replace />;
  }

  return <Outlet />;
}
```

---

## Resources

- [Better Auth Documentation](https://www.better-auth.com/)
- [Better Auth GitHub Repository](https://github.com/better-auth/better-auth)
- [Better Auth UI Documentation](https://better-auth-ui.com/)
- [Client Documentation](https://www.better-auth.com/docs/concepts/client)
- [TypeScript Documentation](https://www.better-auth.com/docs/concepts/typescript)
- [OAuth Documentation](https://www.better-auth.com/docs/concepts/oauth)
- [Session Management](https://www.better-auth.com/docs/concepts/session-management)
- [Performance Optimization](https://www.better-auth.com/docs/guides/optimizing-for-performance)
