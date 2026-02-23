---
depends:
  - "@context/blocks/security/better-auth.md"
  - "@context/blocks/construct/react.md"
---

# Protected Routes (React)

Router-agnostic auth patterns for React apps.

## References

@context/blocks/security/better-auth.md
@context/blocks/construct/react.md

---

## Core Pattern

```
check session → if loading: spinner → if no session: redirect → else: render
```

All implementations follow this flow. Router choice only affects HOW, not WHAT.

---

## React Router

```typescript
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useSession } from "@/lib/auth-client";

function ProtectedRoute() {
  const { data: session, isPending } = useSession();
  const location = useLocation();

  if (isPending) return <LoadingSpinner />;

  if (!session) {
    const returnUrl = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?redirect=${returnUrl}`} replace />;
  }

  return <Outlet />;
}
```

### Router Config

```typescript
import { createBrowserRouter } from "react-router-dom";

const router = createBrowserRouter([
  {
    path: "/",
    element: <Layout />,
    children: [
      { path: "login", element: <LoginPage /> },
      { path: "signup", element: <SignupPage /> },
      {
        element: <ProtectedRoute />,
        children: [
          { path: "dashboard", element: <DashboardPage /> },
          { path: "profile", element: <ProfilePage /> },
          { path: "settings", element: <SettingsPage /> },
        ],
      },
    ],
  },
]);
```

---

## TanStack Router

### Using beforeLoad

```typescript
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

### Using Middleware

```typescript
import { createMiddleware, redirect } from "@tanstack/react-router";
import { auth } from "@/lib/auth";

const authMiddleware = createMiddleware().server(async ({ request }) => {
  const session = await auth.api.getSession({ headers: request.headers });

  if (!session) {
    throw redirect({ to: "/login" });
  }

  return { session };
});

// Apply to route
export const dashboardRoute = createRoute({
  path: "/dashboard",
  component: DashboardPage,
  middleware: [authMiddleware],
});
```

---

## Return URL Pattern

```typescript
function LoginPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const redirectTo = searchParams.get("redirect") || "/dashboard";

  async function handleLogin(email: string, password: string) {
    await authClient.signIn.email(
      { email, password },
      { onSuccess: () => navigate(redirectTo) }
    );
  }
}
```

---

## Role-Based Access

```typescript
type UserRole = "admin" | "editor" | "viewer";

function RequireRole({ role, children }: { role: UserRole; children: ReactNode }) {
  const { data: session, isPending } = useSession();

  if (isPending) return <LoadingSpinner />;

  if (!session || session.user.role !== role) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
}

// Usage
<RequireRole role="admin">
  <AdminDashboard />
</RequireRole>
```

---

## Guest-Only Routes

```typescript
function GuestRoute() {
  const { data: session, isPending } = useSession();

  if (isPending) return <LoadingSpinner />;

  // Redirect authenticated users away from login/signup
  if (session) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}
```

### Router Config

```typescript
{
  element: <GuestRoute />,
  children: [
    { path: "login", element: <LoginPage /> },
    { path: "signup", element: <SignupPage /> },
  ],
}
```

---

## Pitfall: OAuth Callback vs Guest-Only Redirect

Guest-only guards redirect authenticated users away from public routes (e.g. `/login` to `/dashboard`). OAuth callback routes (`/auth/callback`) are also public but **must not be redirected** — they need to complete the PKCE token exchange first.

### The Problem

```typescript
// BAD: lumps all public auth paths together
const PUBLIC_AUTH_PATHS = new Set(["/auth/callback", "/login"]);

function AuthenticatedApp({ pathname }) {
  if (PUBLIC_AUTH_PATHS.has(pathname)) {
    return <Navigate to="/dashboard" replace />;  // callback never runs
  }
  return <Outlet />;
}
```

When the auth server redirects back with `?code=...&state=...`, the browser already has a session cookie. The guest-only guard sees "authenticated + public path" and redirects to `/dashboard` before the callback component mounts. The PKCE exchange never completes, the API JWT is never obtained, and the user loops back to `/login`.

### The Fix

Separate "public auth paths" (used by unauthenticated routing) from "redirect-when-authenticated paths" (used by authenticated routing):

```typescript
const PUBLIC_AUTH_PATHS = new Set(["/auth/callback", "/login"]);
const REDIRECT_WHEN_AUTHENTICATED = new Set(["/login"]);

// UnauthenticatedApp uses PUBLIC_AUTH_PATHS to decide which routes to render
export function isPublicAuthPath(pathname: string): boolean {
  return PUBLIC_AUTH_PATHS.has(pathname);
}

// AuthenticatedApp uses REDIRECT_WHEN_AUTHENTICATED to decide when to redirect
export function shouldRedirectWhenAuthenticated(pathname: string): boolean {
  return REDIRECT_WHEN_AUTHENTICATED.has(pathname);
}
```

### Rule

Any route that performs an async token exchange (OAuth callback, SAML ACS, magic link verification) must be **excluded** from guest-only redirect guards, even when a session cookie already exists.

---

## Layout with Auth State

```typescript
function AppLayout() {
  const { data: session } = useSession();

  return (
    <div>
      <nav>
        {session ? (
          <>
            <Link to="/dashboard">Dashboard</Link>
            <SignOutButton />
          </>
        ) : (
          <>
            <Link to="/login">Sign In</Link>
            <Link to="/signup">Sign Up</Link>
          </>
        )}
      </nav>
      <main>
        <Outlet />
      </main>
    </div>
  );
}
```
