---
depends:
  - "@context/blocks/security/better-auth.md"
tags: [react, auth, architecture]
---

# React Auth Boundary

Architecture pattern for cleanly separating authenticated and unauthenticated React app states. Based on Kent C. Dodds' auth pattern.

## Core Pattern

Render entirely different component trees based on auth state:

```typescript
// App.tsx
function App() {
  const user = useUser();
  return user ? <AuthenticatedApp /> : <UnauthenticatedApp />;
}
```

**Not** conditional rendering within a single tree. Two separate apps.

## Code Splitting

Lazy-load each branch so unauthenticated users don't download the full app:

```typescript
const AuthenticatedApp = React.lazy(() => import('./authenticated-app'));
const UnauthenticatedApp = React.lazy(() => import('./unauthenticated-app'));

function App() {
  const user = useUser();
  return (
    <React.Suspense fallback={<FullPageSpinner />}>
      {user ? <AuthenticatedApp /> : <UnauthenticatedApp />}
    </React.Suspense>
  );
}
```

## Auth Provider

Wraps the app. Blocks rendering until auth state is resolved (no flash of wrong UI):

```typescript
function AuthProvider({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuthState();

  if (isLoading) {
    return <FullPageSpinner />;
  }

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
```

Key: the provider **prevents the rest of the app from rendering** until auth state is known. This avoids:
- Flash of login page for authenticated users
- Flash of app content for unauthenticated users
- Race conditions in auth-dependent data fetching

## Component Structure

```
src/
├── app.tsx                    # Auth boundary (switch between trees)
├── auth-provider.tsx          # Auth context + state resolution
├── authenticated-app.tsx      # Full app with routes, layout, nav
├── unauthenticated-app.tsx    # Login page (minimal)
└── components/
    └── full-page-spinner.tsx  # Loading state
```

## UnauthenticatedApp

Minimal - typically just the login page:

```typescript
// unauthenticated-app.tsx
export default function UnauthenticatedApp() {
  return <LoginPage />;
}
```

No router needed. No nav. No layout. Just the login flow.

## AuthenticatedApp

The full application with routing, layout, navigation:

```typescript
// authenticated-app.tsx
export default function AuthenticatedApp() {
  return (
    <AppLayout>
      <Router />
    </AppLayout>
  );
}
```

All routes inside AuthenticatedApp are implicitly protected - they only render when authenticated.

## useUser Hook

Thin wrapper over auth context:

```typescript
function useUser() {
  const context = React.useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useUser must be used within AuthProvider');
  }
  return context.user;
}
```

## When to Use

- **Always** for apps where most functionality requires auth
- The boundary is at the app root, not at individual routes
- Route-level auth checks are unnecessary when the entire tree is auth-gated

## When NOT to Use

- Apps with significant public content (blogs, marketing sites with auth features)
- For those, use route-level protection instead and spread `useUser()` throughout

## Key Principles

1. **Block, don't flash** - resolve auth state before rendering either tree
2. **Separate trees, not conditional routes** - cleaner mental model, better code splitting
3. **Auth provider at the top** - single source of truth for auth state
4. **No router in unauthenticated tree** - login is the only page
