# Performance

Patterns and anti-patterns for application performance: N+1 queries, memory leaks, algorithm complexity, and efficient data structures.

---

## Quick Reference

- Queries in loops are N+1 patterns—batch or eager load instead.
- Clean up event listeners, timers, and subscriptions to prevent memory leaks.
- Use Set/Map for O(1) lookups instead of Array.includes/find for large collections.
- Memoize expensive computations; avoid recalculating on every render/call.
- Virtualize long lists; paginate large result sets from databases.

---

## N+1 Query Patterns

### Patterns

| Pattern | Risk | Safe Alternative |
|---------|------|------------------|
| Query inside loop | N+1 queries (101 for 100 items) | Eager load or batch query |
| Sequential API calls | Multiple round trips | Batch requests or Promise.all |
| Lazy load in render | Query on every component mount | Prefetch or cache |
| Related data fetched separately | Extra queries per relation | JOIN or include relations |

### Rules

- Never execute database queries or API calls inside loops
- Use ORM eager loading: `{ include: { relation: true } }`
- Batch API requests: collect IDs, fetch once, index results by ID
- Profile queries in development; watch for query count explosion

### Example

```typescript
// ❌ N+1: One query per user (100 users = 101 queries)
const users = await db.users.findMany();
for (const user of users) {
  const orders = await db.orders.findMany({ where: { userId: user.id } });
  user.orders = orders;
}

// ❌ N+1: Sequential API calls
for (const id of productIds) {
  const product = await api.getProduct(id); // 100 round trips
  products.push(product);
}

// ✅ Eager loading: 1 query with JOIN
const users = await db.users.findMany({
  include: { orders: true }
});

// ✅ Batch: Collect IDs, single request
const products = await api.getProducts(productIds);
// Or: Promise.all(productIds.map(id => api.getProduct(id)));
```

---

## Memory Leaks

### Patterns

| Pattern | Risk | Safe Alternative |
|---------|------|------------------|
| Event listener without cleanup | Leaks on every mount/unmount | Remove in cleanup function |
| setInterval without clearInterval | Timer continues after unmount | Clear in cleanup |
| Subscription without unsubscribe | Handler accumulates | Unsubscribe on cleanup |
| Growing cache without limit | Unbounded memory growth | LRU cache or max size |
| Closure capturing large object | Prevents garbage collection | Capture only needed values |

### Rules

- Every addEventListener needs a corresponding removeEventListener
- Every setInterval needs clearInterval on cleanup
- Every subscription needs unsubscribe on unmount
- Caches must have eviction policy (LRU, TTL, max size)
- Avoid capturing entire objects in closures when you only need a property

### Example

```typescript
// ❌ Leak: Listener never removed
useEffect(() => {
  window.addEventListener('resize', handleResize);
  // No cleanup!
}, []);

// ❌ Leak: Interval continues after unmount
useEffect(() => {
  setInterval(pollData, 1000);
  // No clearInterval!
}, []);

// ❌ Leak: Unbounded cache growth
const cache = new Map<string, Data>();
function getData(key: string) {
  if (!cache.has(key)) {
    cache.set(key, fetchData(key)); // Never evicted
  }
  return cache.get(key);
}

// ✅ Safe: Cleanup removes listener
useEffect(() => {
  window.addEventListener('resize', handleResize);
  return () => window.removeEventListener('resize', handleResize);
}, []);

// ✅ Safe: Interval cleared
useEffect(() => {
  const id = setInterval(pollData, 1000);
  return () => clearInterval(id);
}, []);

// ✅ Safe: LRU cache with max size
import { LRUCache } from 'lru-cache';
const cache = new LRUCache<string, Data>({ max: 1000 });
```

---

## Algorithm Complexity

### Patterns

| Pattern | Risk | Safe Alternative |
|---------|------|------------------|
| Array.includes in loop | O(n²) | Use Set for O(1) lookup |
| Nested loops over same data | O(n²) or worse | Single pass with index/Map |
| Filter then map then filter | Multiple iterations | Single reduce or chained methods |
| Sort inside loop | O(n² log n) | Sort once outside loop |
| String concat in loop | O(n²) string allocation | Array join or template |

### Rules

- Use Set/Map for existence checks and lookups: O(1) vs O(n)
- Avoid nested loops over large collections—index or sort first
- Memoize expensive computations that are called repeatedly
- Profile hot paths; micro-optimizations elsewhere are premature

### Example

```typescript
// ❌ O(n²): includes() is O(n), inside O(n) loop
const unique = items.filter((item, i) =>
  items.indexOf(item) === i
);

// ❌ O(n²): Nested loop lookup
for (const user of users) {
  const order = orders.find(o => o.userId === user.id);
  // ...
}

// ❌ O(n²): String concatenation in loop
let result = '';
for (const item of items) {
  result += item.name + ', '; // Creates new string each time
}

// ✅ O(n): Set deduplication
const unique = [...new Set(items)];

// ✅ O(n): Index by key, then lookup is O(1)
const orderByUserId = new Map(orders.map(o => [o.userId, o]));
for (const user of users) {
  const order = orderByUserId.get(user.id);
}

// ✅ O(n): Array join
const result = items.map(i => i.name).join(', ');
```

---

## Inefficient Data Structures

### Patterns

| Pattern | Risk | Safe Alternative |
|---------|------|------------------|
| Array for existence check | O(n) every check | Set: O(1) |
| Array for key-value pairs | O(n) lookup | Map: O(1) |
| Object for dynamic keys | Prototype pollution, no size | Map |
| Repeated array spread | O(n) copy each time | push or single spread |

### Rules

- Use Set when checking "is X in collection"
- Use Map when looking up values by key
- Prefer Map over Object for dynamic keys (no prototype issues, has .size)
- Avoid repeated array spreading; collect then spread once

### Example

```typescript
// ❌ Slow: O(n) lookup
const seenIds: string[] = [];
for (const item of items) {
  if (!seenIds.includes(item.id)) { // O(n) check
    seenIds.push(item.id);
    process(item);
  }
}

// ❌ Slow: Repeated spread
let result: Item[] = [];
for (const item of items) {
  result = [...result, transform(item)]; // O(n) copy each iteration
}

// ✅ Fast: O(1) lookup
const seenIds = new Set<string>();
for (const item of items) {
  if (!seenIds.has(item.id)) { // O(1) check
    seenIds.add(item.id);
    process(item);
  }
}

// ✅ Fast: Single push or map
const result = items.map(item => transform(item));
// Or: items.forEach(item => result.push(transform(item)));
```

---

## UI Rendering Performance

### Patterns

| Pattern | Risk | Safe Alternative |
|---------|------|------------------|
| Inline arrow in props | New reference every render | useCallback |
| Object literal in props | New reference every render | useMemo or extract |
| Expensive calc in render | Recalculates on every render | useMemo |
| Large list without virtualization | DOM node explosion | Virtual list (react-window) |
| Layout thrashing | Forced synchronous reflow | Batch reads, then writes |

### Rules

- Memoize callbacks passed to children: useCallback
- Memoize expensive computations: useMemo
- Memoize components that receive stable props: React.memo
- Virtualize lists over ~100 items
- Batch DOM reads before writes to avoid layout thrashing

### Example

```typescript
// ❌ New function every render → child re-renders
function Parent() {
  return <Child onClick={() => doSomething(id)} />;
}

// ❌ Expensive calc every render
function Component({ items }) {
  const sorted = items.sort((a, b) => a.date - b.date); // Runs on every render
  return <List data={sorted} />;
}

// ❌ Layout thrashing: read-write-read-write
for (const el of elements) {
  const height = el.offsetHeight; // Read → forces layout
  el.style.height = height * 2 + 'px'; // Write → invalidates layout
}

// ✅ Stable callback reference
const handleClick = useCallback(() => doSomething(id), [id]);
return <Child onClick={handleClick} />;

// ✅ Memoized expensive operation
const sorted = useMemo(
  () => [...items].sort((a, b) => a.date - b.date),
  [items]
);

// ✅ Batch reads, then writes
const heights = elements.map(el => el.offsetHeight); // All reads
elements.forEach((el, i) => {
  el.style.height = heights[i] * 2 + 'px'; // All writes
});
```

---

## Network and I/O

### Patterns

| Pattern | Risk | Safe Alternative |
|---------|------|------------------|
| Overfetching | Bandwidth waste, slower response | GraphQL or field selection |
| No pagination | Memory explosion, slow response | Paginate with limit/offset |
| Sync file operations | Blocks event loop | Async fs operations |
| No request deduplication | Wasted requests | Cache or dedupe layer |
| Large uncompressed payloads | Slow transfers | gzip/brotli compression |

### Rules

- Request only fields you need (select in ORM, fields in API)
- Always paginate large result sets
- Use async file operations in Node.js
- Deduplicate identical requests in flight
- Enable compression for API responses

### Example

```typescript
// ❌ Overfetch: Gets all columns
const users = await db.users.findMany();

// ❌ No pagination: Returns all rows
const allProducts = await db.products.findMany();

// ❌ Sync file read blocks event loop
const data = fs.readFileSync('large-file.json');

// ✅ Select only needed fields
const users = await db.users.findMany({
  select: { id: true, name: true, email: true }
});

// ✅ Paginated results
const products = await db.products.findMany({
  take: 20,
  skip: page * 20
});

// ✅ Async file operations
const data = await fs.promises.readFile('large-file.json');
```

---

## Startup and Bundle Performance

### Patterns

| Pattern | Risk | Safe Alternative |
|---------|------|------------------|
| Import everything at startup | Slow initial load | Lazy/dynamic imports |
| Large dependency for small feature | Bundle bloat | Smaller alternative or lazy load |
| Sync initialization blocking | Delays time-to-interactive | Async initialization |
| No code splitting | Single large bundle | Route-based or feature-based splits |

### Rules

- Lazy load features not needed at startup
- Audit bundle size; remove or replace heavy dependencies
- Use dynamic imports for optional features
- Split by route in SPAs

### Example

```typescript
// ❌ Imports 500KB charting library at startup
import { Chart } from 'heavyweight-charts';

// ❌ Sync init blocks startup
const config = loadConfigSync();
const db = connectDbSync();

// ✅ Lazy load when needed
const ChartComponent = lazy(() => import('./Chart'));

// ✅ Dynamic import for optional feature
async function showChart() {
  const { Chart } = await import('heavyweight-charts');
  new Chart(data);
}

// ✅ Async initialization
const config = await loadConfig();
const db = await connectDb();
```

---

## Summary: Checklist

Before shipping code, verify:

- [ ] No database queries or API calls inside loops (N+1)
- [ ] Event listeners, timers, subscriptions have cleanup
- [ ] Set/Map used for lookups instead of Array.includes/find on large collections
- [ ] No O(n²) algorithms in hot paths
- [ ] Large lists virtualized or paginated
- [ ] Expensive computations memoized
- [ ] Bundle size reasonable; no unnecessary large dependencies
- [ ] Async file operations used (not sync)
