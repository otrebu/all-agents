---
depends:
  - "@context/blocks/security/better-auth.md"
  - "@context/blocks/construct/react.md"
  - "@context/blocks/construct/tanstack-query.md"
---

# Session Handling in React

Manage auth sessions: loading states, caching, refresh, and revocation.

## References

@context/blocks/security/better-auth.md
@context/blocks/construct/react.md
@context/blocks/construct/tanstack-query.md

---

## Loading States Pattern

```typescript
function AuthLoading({ children }: { children: React.ReactNode }) {
  const { isPending } = useSession();

  if (isPending) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner />
      </div>
    );
  }

  return <>{children}</>;
}

// Usage
<AuthLoading>
  <App />
</AuthLoading>
```

---

## With TanStack Query

```typescript
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { authClient } from "@/lib/auth-client";

const STALE_TIME_MS = 5 * 60 * 1000;
const REFETCH_INTERVAL_MS = 60 * 1000;

function useSessionQuery() {
  return useQuery({
    queryKey: ["session"],
    queryFn: () => authClient.getSession(),
    staleTime: STALE_TIME_MS,
    refetchInterval: REFETCH_INTERVAL_MS,
  });
}

// Invalidate on auth actions
function useSignOut() {
  const queryClient = useQueryClient();

  return async () => {
    await authClient.signOut();
    queryClient.invalidateQueries({ queryKey: ["session"] });
  };
}
```

---

## Session Management UI

```typescript
function SessionsManager() {
  const [sessions, setSessions] = useState<Session[]>([]);

  useEffect(() => {
    authClient.listSessions().then(({ data }) => setSessions(data || []));
  }, []);

  const revoke = async (token: string) => {
    await authClient.revokeSession({ token });
    setSessions((sessions) => sessions.filter((sess) => sess.token !== token));
  };

  return (
    <div>
      <h2>Active Sessions</h2>
      {sessions.map((session) => (
        <div key={session.id}>
          <p>{session.userAgent}</p>
          <p>{session.ipAddress}</p>
          <button onClick={() => revoke(session.token)}>Revoke</button>
        </div>
      ))}
    </div>
  );
}
```

---

## Session Actions

```typescript
// Revoke specific session
await authClient.revokeSession({ token: "session-token" });

// Revoke all other sessions (keep current)
await authClient.revokeOtherSessions();

// Revoke all sessions
await authClient.revokeSessions();

// Revoke on password change
await authClient.changePassword({
  currentPassword: "old",
  newPassword: "new",
  revokeOtherSessions: true,
});
```

---

## Server-Side Caching

```typescript
// Better Auth server config
export const auth = betterAuth({
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60, // 5 minutes
      strategy: "compact", // or "jwt", "jwe"
    },
  },
});
```

| Strategy | Size | Security | Use Case |
|----------|------|----------|----------|
| compact | Smallest | Signed | Performance |
| jwt | Medium | Signed | Interop |
| jwe | Largest | Encrypted | Max security |

---

## Bypass Cache

```typescript
// Force database refresh
const session = await authClient.getSession({
  query: { disableCookieCache: true },
});
```

---

## Context Wrapper (Optional)

```typescript
interface AuthContextType {
  session: Session | null;
  isLoading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function AuthProvider({ children }: { children: React.ReactNode }) {
  const { data: session, isPending } = useSession();

  const value = useMemo(
    () => ({
      session,
      isLoading: isPending,
      signOut: () => authClient.signOut(),
    }),
    [session, isPending]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be within AuthProvider");
  return context;
}
```
