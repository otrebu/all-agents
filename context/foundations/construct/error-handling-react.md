---
depends:
  - "@context/blocks/quality/error-handling.md"
  - "@context/blocks/construct/react.md"
---

# Error Handling: React Error Boundaries

React error boundaries catch JavaScript errors in child component trees, log them, and display fallback UI.

## References

@context/blocks/quality/error-handling.md

## Install

Dependency: `react-error-boundary`

## Fundamentals

Error boundaries catch errors during:

- Rendering
- Lifecycle methods
- Constructors of child tree

Error boundaries do NOT catch:

- Event handlers (use try/catch)
- Async code (use try/catch or query error handling)
- Server-side rendering
- Errors thrown in the boundary itself

## react-error-boundary

Functional wrapper for error boundaries (no class components needed).

### Basic Usage

```tsx
import { ErrorBoundary, FallbackProps } from "react-error-boundary";

function ErrorFallback({ error, resetErrorBoundary }: FallbackProps) {
  return (
    <div role="alert">
      <p>Something went wrong:</p>
      <pre>{error.message}</pre>
      <button onClick={resetErrorBoundary}>Try again</button>
    </div>
  );
}

<ErrorBoundary FallbackComponent={ErrorFallback}>
  <MyComponent />
</ErrorBoundary>;
```

### With Reset Keys

```tsx
<ErrorBoundary
  FallbackComponent={ErrorFallback}
  onReset={() => setData(null)}
  resetKeys={[data]}
>
  <DataDisplay data={data} />
</ErrorBoundary>
```

When `resetKeys` change, boundary auto-resets.

### Error Logging

```tsx
<ErrorBoundary
  FallbackComponent={ErrorFallback}
  onError={(error, info) => {
    // Send to Sentry, LogRocket, etc.
    logErrorToService(error, info.componentStack);
  }}
>
  <App />
</ErrorBoundary>
```

## Boundary Placement Patterns

### Global Boundary

Catches unhandled errors app-wide. Last resort fallback.

```tsx
// main.tsx
<ErrorBoundary FallbackComponent={AppCrashFallback}>
  <App />
</ErrorBoundary>
```

### Route-Level Boundary

Isolates route failures. Other routes remain functional.

```tsx
// Using TanStack Router
const route = createRoute({
  component: Dashboard,
  errorComponent: RouteErrorFallback,
});
```

### Feature-Level Boundary

Isolates widget/feature failures. Rest of page works.

```tsx
<div className="dashboard">
  <Header />
  <ErrorBoundary fallback={<ChartError />}>
    <ExpensiveChart />
  </ErrorBoundary>
  <Sidebar />
</div>
```

### Form Boundary

Reset on form re-submission.

```tsx
<ErrorBoundary FallbackComponent={FormErrorFallback} resetKeys={[formKey]}>
  <ComplexForm key={formKey} />
</ErrorBoundary>
```

## Suspense Integration

Combine with Suspense for loading + error states.

```tsx
<ErrorBoundary FallbackComponent={ErrorFallback}>
  <Suspense fallback={<Loading />}>
    <LazyComponent />
  </Suspense>
</ErrorBoundary>
```

Order matters: ErrorBoundary outside catches Suspense errors.

## Event Handler Errors

Error boundaries don't catch event handlers. Handle explicitly:

```tsx
function Button() {
  const handleClick = async () => {
    try {
      await riskyOperation();
    } catch (error) {
      // Handle locally or re-throw to boundary
      const message = error instanceof Error ? error.message : String(error);
      showToast(message);
    }
  };

  return <button onClick={handleClick}>Click</button>;
}
```

## Async Error Handling

### With TanStack Query

```tsx
const { data, error, isError } = useQuery({
  queryKey: ["data"],
  queryFn: fetchData,
  throwOnError: true, // Throws to nearest boundary
});
```

### Manual Async

```tsx
const [, setError] = useState<Error | null>(null);

useEffect(() => {
  async function load() {
    try {
      await fetchData();
    } catch (e) {
      setError(() => {
        throw e;
      }); // Throws to boundary
    }
  }
  load();
}, []);
```

## When to Use

| Scenario                 | Boundary Level              |
| ------------------------ | --------------------------- |
| Unhandled app crash      | Global                      |
| Route load failure       | Route                       |
| Third-party widget crash | Feature                     |
| Form submission error    | Feature + resetKeys         |
| API errors               | TanStack Query throwOnError |
| User input validation    | Local state, no boundary    |
