---
depends: []
---

# TanStack Router

Type-safe routing for React applications.

Install `@tanstack/react-router`

---

## Route Definition

```typescript
import {
  createRouter,
  createRoute,
  createRootRoute,
} from "@tanstack/react-router";

const rootRoute = createRootRoute({
  component: RootLayout,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: Home,
});

const userRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/users/$userId",
  component: UserDetail,
});

const router = createRouter({
  routeTree: rootRoute.addChildren([indexRoute, userRoute]),
});
```

---

## Link Component

```typescript
import { Link } from "@tanstack/react-router";

// Basic
<Link to="/about">About</Link>

// With params
<Link to="/users/$userId" params={{ userId: "123" }}>
  User Profile
</Link>

// With search params
<Link to="/posts" search={{ page: 2, sort: "date" }}>
  Page 2
</Link>

// Active styling
<Link to="/about" activeProps={{ className: "active" }}>
  About
</Link>
```

---

## useNavigate

```typescript
import { useNavigate } from "@tanstack/react-router";

function MyComponent() {
  const navigate = useNavigate();

  // Navigate to path
  navigate({ to: "/dashboard" });

  // With params
  navigate({ to: "/users/$userId", params: { userId: "123" } });

  // With search params
  navigate({ to: "/posts", search: { page: 2 } });

  // Replace history (no back)
  navigate({ to: "/login", replace: true });
}
```

---

## Route Params

```typescript
import { useParams } from "@tanstack/react-router";

// In route: path: "/users/$userId"
const { userId } = useParams({ from: "/users/$userId" });
```

---

## Search Params

```typescript
import { z } from "zod";
import { useSearch } from "@tanstack/react-router";

// Define schema in route
const postsRoute = createRoute({
  path: "/posts",
  validateSearch: z.object({
    page: z.number().default(1),
    sort: z.enum(["date", "title"]).optional(),
  }),
});

// Use in component
function PostsList() {
  const { page, sort } = useSearch({ from: "/posts" });
  // page: number, sort: "date" | "title" | undefined
}
```

---

## Loaders

```typescript
const postsRoute = createRoute({
  path: "/posts",
  loader: async () => {
    const posts = await fetchPosts();
    return { posts };
  },
  component: PostsList,
});

function PostsList() {
  const { posts } = postsRoute.useLoaderData();
  return posts.map((p) => <Post key={p.id} {...p} />);
}
```

---

## beforeLoad (Auth Guard)

```typescript
import { redirect } from "@tanstack/react-router";

const protectedRoute = createRoute({
  path: "/dashboard",
  beforeLoad: ({ context }) => {
    if (!context.auth.isAuthenticated) {
      throw redirect({ to: "/login" });
    }
  },
  component: Dashboard,
});
```

---

## Best Practices

**DO:**

- Use `Link` for declarative navigation
- Use `useNavigate` for imperative (after form submit, etc.)
- Use `from` param for type-safe hooks
- Use Zod for search param validation
- Use `beforeLoad` for auth guards

**DON'T:**

- Navigate in render (use `Navigate` component instead)
- Forget `from` param (loses type safety)
