# React Error Boundaries: Comprehensive Guide

> **Research Date:** December 2024
> **React Versions Covered:** React 16+ through React 19

Error boundaries are React components that catch JavaScript errors anywhere in their child component tree, log those errors, and display a fallback UI instead of the component tree that crashed. They prevent a single error from breaking the entire application.

---

## Table of Contents

1. [Core Concepts](#core-concepts)
2. [Class Component Pattern](#class-component-pattern)
3. [Lifecycle Methods Deep Dive](#lifecycle-methods-deep-dive)
4. [react-error-boundary Library](#react-error-boundary-library)
5. [Fallback UI Patterns](#fallback-ui-patterns)
6. [Error Recovery Strategies](#error-recovery-strategies)
7. [Integration with Suspense](#integration-with-suspense)
8. [Logging and Reporting](#logging-and-reporting)
9. [Testing Error Boundaries](#testing-error-boundaries)
10. [Granularity Strategies](#granularity-strategies)
11. [React 19 Improvements](#react-19-improvements)
12. [TypeScript Implementation](#typescript-implementation)
13. [Common Patterns from Popular Apps](#common-patterns-from-popular-apps)
14. [Best Practices and Common Mistakes](#best-practices-and-common-mistakes)
15. [Integration with Data Fetching Libraries](#integration-with-data-fetching-libraries)

---

## Core Concepts

### What Error Boundaries Catch

- Errors during **rendering**
- Errors in **lifecycle methods**
- Errors in **constructors** of the entire tree below them
- Errors in `startTransition` callbacks (React 18+)

### What Error Boundaries Do NOT Catch

- **Event handlers** - Use try-catch blocks instead
- **Asynchronous code** (`setTimeout`, `requestAnimationFrame`, Promises)
- **Server-side rendering** errors
- **Errors in the error boundary itself**

> **Key Insight:** Error boundaries catch errors during the render phase. Event handlers don't happen during rendering, so React still knows what to display even if they throw.

---

## Class Component Pattern

Error boundaries **must** be class components because they rely on lifecycle methods not available in function components.

### Basic Implementation

```jsx
import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render shows the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Log error to an analytics service
    console.error('Error caught by boundary:', error);
    console.error('Component stack:', errorInfo.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || <h1>Something went wrong.</h1>;
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
```

### Usage

```jsx
<ErrorBoundary fallback={<p>Something went wrong</p>}>
  <MyComponent />
</ErrorBoundary>
```

---

## Lifecycle Methods Deep Dive

### `static getDerivedStateFromError(error)`

- **Purpose:** Update state to display fallback UI after an error
- **When called:** During the **render phase** (no side effects allowed)
- **Returns:** Object to update state, or `null`
- **Parameter:** `error` - The thrown error (usually an `Error` instance, but can be any value)

```javascript
static getDerivedStateFromError(error) {
  // Must be a pure function - no side effects
  return {
    hasError: true,
    errorMessage: error.message
  };
}
```

### `componentDidCatch(error, errorInfo)`

- **Purpose:** Log error information and perform side effects
- **When called:** During the **commit phase** (side effects are allowed)
- **Parameters:**
  - `error`: The thrown error
  - `errorInfo`: Object containing `componentStack` - a string with the component trace

```javascript
componentDidCatch(error, errorInfo) {
  // Log to external service
  logErrorToService(error, {
    componentStack: errorInfo.componentStack,
    // React 19+ provides owner stack via captureOwnerStack()
  });
}
```

### Development vs Production Behavior

| Environment | Behavior |
|-------------|----------|
| Development | Errors bubble to `window.onerror` after being caught |
| Production | Errors do NOT bubble up after being caught |

---

## react-error-boundary Library

The `react-error-boundary` package provides a modern, hook-friendly approach to error boundaries. It's the recommended solution for functional component codebases.

### Installation

```bash
npm install react-error-boundary
# or
pnpm add react-error-boundary
# or
yarn add react-error-boundary
```

### API Overview

#### 1. Simple Fallback

```jsx
import { ErrorBoundary } from 'react-error-boundary';

<ErrorBoundary fallback={<div>Something went wrong</div>}>
  <MyComponent />
</ErrorBoundary>
```

#### 2. Fallback Render Function

```jsx
import { ErrorBoundary } from 'react-error-boundary';

function fallbackRender({ error, resetErrorBoundary }) {
  return (
    <div role="alert">
      <p>Something went wrong:</p>
      <pre style={{ color: 'red' }}>{error.message}</pre>
      <button onClick={resetErrorBoundary}>Try again</button>
    </div>
  );
}

<ErrorBoundary
  fallbackRender={fallbackRender}
  onReset={(details) => {
    // Reset application state here
  }}
>
  <MyComponent />
</ErrorBoundary>
```

#### 3. Fallback Component

```jsx
import { ErrorBoundary } from 'react-error-boundary';

function ErrorFallback({ error, resetErrorBoundary }) {
  return (
    <div role="alert">
      <h2>Oops! Something went wrong</h2>
      <details>
        <summary>Error details</summary>
        <pre>{error.message}</pre>
      </details>
      <button onClick={resetErrorBoundary}>Try again</button>
    </div>
  );
}

<ErrorBoundary
  FallbackComponent={ErrorFallback}
  onError={(error, info) => {
    // Log to external service
    logError(error, info.componentStack);
  }}
>
  <MyComponent />
</ErrorBoundary>
```

#### 4. useErrorBoundary Hook

Handle async errors and event handler errors:

```jsx
import { useErrorBoundary } from 'react-error-boundary';

function MyComponent() {
  const { showBoundary } = useErrorBoundary();

  async function handleClick() {
    try {
      await riskyOperation();
    } catch (error) {
      // Propagate to nearest error boundary
      showBoundary(error);
    }
  }

  useEffect(() => {
    fetchData()
      .then(setData)
      .catch(showBoundary); // Async errors
  }, []);

  return <button onClick={handleClick}>Do risky thing</button>;
}
```

#### 5. Higher-Order Component

```jsx
import { withErrorBoundary } from 'react-error-boundary';

const MyComponentWithBoundary = withErrorBoundary(MyComponent, {
  fallback: <div>Something went wrong</div>,
  onError: (error, info) => {
    logError(error, info.componentStack);
  },
});
```

### Props Reference

| Prop | Type | Description |
|------|------|-------------|
| `fallback` | `ReactElement` | Static fallback UI element |
| `fallbackRender` | `Function` | Render function receiving `{ error, resetErrorBoundary }` |
| `FallbackComponent` | `Component` | Component receiving `{ error, resetErrorBoundary }` as props |
| `onError` | `Function` | Called when error is caught: `(error, info) => void` |
| `onReset` | `Function` | Called before boundary resets: `(details) => void` |
| `resetKeys` | `Array` | Values that trigger automatic reset when changed |

> **Note:** `ErrorBoundary` is a client component. In Next.js App Router, use `"use client"` directive or pass only serializable props.

---

## Fallback UI Patterns

### User-Friendly Design Principles

1. **Avoid technical jargon** - End users don't care about stack traces
2. **Provide recovery options** - "Try again", "Go home", "Refresh"
3. **Match your design system** - Fallback should feel like part of the app
4. **Be contextual** - Different fallbacks for different parts of the app

### Pattern 1: Simple Retry

```jsx
function SimpleRetryFallback({ error, resetErrorBoundary }) {
  return (
    <div className="error-container">
      <h2>Something went wrong</h2>
      <p>We're sorry for the inconvenience.</p>
      <button onClick={resetErrorBoundary}>Try again</button>
    </div>
  );
}
```

### Pattern 2: Contextual with Navigation

```jsx
function NavigationFallback({ error, resetErrorBoundary }) {
  return (
    <div className="error-container">
      <h2>Unable to load this section</h2>
      <p>This part of the app encountered an issue.</p>
      <div className="button-group">
        <button onClick={resetErrorBoundary}>Retry</button>
        <button onClick={() => window.location.href = '/'}>
          Go to Home
        </button>
      </div>
    </div>
  );
}
```

### Pattern 3: Detailed Error (Development)

```jsx
function DevelopmentFallback({ error, resetErrorBoundary }) {
  const isDev = process.env.NODE_ENV === 'development';

  return (
    <div className="error-container">
      <h2>Something went wrong</h2>
      {isDev && (
        <details>
          <summary>Error Details</summary>
          <pre>{error.message}</pre>
          <pre>{error.stack}</pre>
        </details>
      )}
      <button onClick={resetErrorBoundary}>Try again</button>
    </div>
  );
}
```

### Pattern 4: Placeholder Component

Replace a failed component with a non-interactive placeholder:

```jsx
function WidgetFallback({ error }) {
  return (
    <div className="widget-placeholder">
      <span className="icon">!</span>
      <p>Widget unavailable</p>
    </div>
  );
}
```

---

## Error Recovery Strategies

### 1. Using `resetErrorBoundary`

The simplest approach - user clicks a button to retry:

```jsx
function Fallback({ resetErrorBoundary }) {
  return (
    <button onClick={resetErrorBoundary}>Try again</button>
  );
}
```

### 2. Using `resetKeys` for Automatic Reset

Reset the boundary automatically when certain values change:

```jsx
function App() {
  const [userId, setUserId] = useState(1);

  return (
    <ErrorBoundary
      resetKeys={[userId]}
      onReset={() => {
        // Clear any cached data that might cause the error
      }}
    >
      <UserProfile userId={userId} />
    </ErrorBoundary>
  );
}
```

### 3. Using React Key to Force Reset

Force a complete re-mount by changing the key:

```jsx
function App() {
  const [boundaryKey, setBoundaryKey] = useState(0);

  const handleReset = () => setBoundaryKey(k => k + 1);

  return (
    <ErrorBoundary key={boundaryKey} FallbackComponent={Fallback}>
      <MyComponent />
    </ErrorBoundary>
  );
}
```

### 4. State Reset Pattern

Clear application state before retry:

```jsx
<ErrorBoundary
  FallbackComponent={Fallback}
  onReset={({ reason }) => {
    // Clear cache
    queryClient.clear();
    // Reset local state
    setFormData(initialState);
  }}
>
  <MyComponent />
</ErrorBoundary>
```

---

## Integration with Suspense

Error boundaries and Suspense work together for loading and error states in data fetching:

### Basic Pattern

```jsx
<ErrorBoundary fallback={<ErrorFallback />}>
  <Suspense fallback={<LoadingSpinner />}>
    <AsyncComponent />
  </Suspense>
</ErrorBoundary>
```

### With React.lazy

```jsx
const LazyComponent = React.lazy(() => import('./HeavyComponent'));

function App() {
  return (
    <ErrorBoundary fallback={<p>Failed to load component</p>}>
      <Suspense fallback={<p>Loading...</p>}>
        <LazyComponent />
      </Suspense>
    </ErrorBoundary>
  );
}
```

### How It Works

| Promise State | What Renders |
|---------------|--------------|
| Pending | Suspense fallback (loading) |
| Rejected | Error boundary fallback (error) |
| Resolved | The actual component |

### Nested Boundaries Pattern

```jsx
<ErrorBoundary fallback={<AppError />}>
  <Suspense fallback={<AppLoading />}>
    <ErrorBoundary fallback={<SectionError />}>
      <Suspense fallback={<SectionLoading />}>
        <DataComponent />
      </Suspense>
    </ErrorBoundary>
  </Suspense>
</ErrorBoundary>
```

---

## Logging and Reporting

### Sentry Integration

Sentry provides its own `ErrorBoundary` component:

```jsx
import * as Sentry from '@sentry/react';

<Sentry.ErrorBoundary
  fallback={<ErrorFallback />}
  beforeCapture={(scope) => {
    scope.setTag('section', 'dashboard');
  }}
  onError={(error, componentStack, eventId) => {
    // Additional handling
  }}
>
  <MyApp />
</Sentry.ErrorBoundary>
```

### Custom Error Boundary with Sentry

```jsx
import * as Sentry from '@sentry/react';

class ErrorBoundary extends React.Component {
  componentDidCatch(error, errorInfo) {
    Sentry.withScope((scope) => {
      scope.setExtras({
        componentStack: errorInfo.componentStack,
      });
      Sentry.captureException(error);
    });
  }
  // ... rest of implementation
}
```

### With react-error-boundary and Sentry

```jsx
import { ErrorBoundary } from 'react-error-boundary';
import * as Sentry from '@sentry/react';

<ErrorBoundary
  FallbackComponent={ErrorFallback}
  onError={(error, info) => {
    Sentry.captureException(error, {
      extra: { componentStack: info.componentStack },
    });
  }}
>
  <MyApp />
</ErrorBoundary>
```

### LogRocket Integration

```jsx
import LogRocket from 'logrocket';

<ErrorBoundary
  onError={(error, info) => {
    LogRocket.captureException(error, {
      extra: {
        componentStack: info.componentStack,
      },
    });
  }}
>
  <MyApp />
</ErrorBoundary>
```

---

## Testing Error Boundaries

### Testing Strategy

1. Create a component that intentionally throws
2. Suppress console.error during test
3. Verify fallback UI renders
4. Test recovery mechanisms

### Basic Test with React Testing Library

```jsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ErrorBoundary } from 'react-error-boundary';

// Component that throws
function BrokenComponent() {
  throw new Error('Test error');
}

// Suppress console.error for cleaner test output
beforeEach(() => {
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  console.error.mockRestore();
});

test('renders fallback when child throws', () => {
  render(
    <ErrorBoundary fallback={<div>Something went wrong</div>}>
      <BrokenComponent />
    </ErrorBoundary>
  );

  expect(screen.getByText('Something went wrong')).toBeInTheDocument();
});

test('can recover from error', async () => {
  const user = userEvent.setup();
  let shouldThrow = true;

  function MaybeThrows() {
    if (shouldThrow) {
      throw new Error('Test error');
    }
    return <div>Content loaded</div>;
  }

  render(
    <ErrorBoundary
      fallbackRender={({ resetErrorBoundary }) => (
        <button onClick={resetErrorBoundary}>Retry</button>
      )}
    >
      <MaybeThrows />
    </ErrorBoundary>
  );

  expect(screen.getByText('Retry')).toBeInTheDocument();

  // Fix the error condition
  shouldThrow = false;

  await user.click(screen.getByText('Retry'));

  expect(screen.getByText('Content loaded')).toBeInTheDocument();
});
```

### Testing Custom Error Boundaries

```jsx
test('logs error to service', () => {
  const logSpy = jest.spyOn(errorService, 'log');

  render(
    <ErrorBoundary onError={errorService.log}>
      <BrokenComponent />
    </ErrorBoundary>
  );

  expect(logSpy).toHaveBeenCalledWith(
    expect.any(Error),
    expect.objectContaining({
      componentStack: expect.any(String),
    })
  );
});
```

### React 19 Testing Considerations

React 19 changes console behavior:
- React 18: `console.error` with extended message
- React 19: `console.warn` with extended message

```jsx
// Disable console warnings in React 19 tests
render(<App />, {
  onCaughtError: () => {},
});
```

---

## Granularity Strategies

### Level 1: App-Level (Top-Level)

Catch-all for the entire application:

```jsx
<ErrorBoundary fallback={<FullPageError />}>
  <App />
</ErrorBoundary>
```

**Pros:**
- Prevents complete app crash
- Simple to implement

**Cons:**
- Least granular
- Any error affects entire app
- Poor user experience

### Level 2: Route/Page-Level

Wrap top-level route components:

```jsx
function AppRoutes() {
  return (
    <Routes>
      <Route
        path="/dashboard"
        element={
          <ErrorBoundary fallback={<PageError />}>
            <Dashboard />
          </ErrorBoundary>
        }
      />
      <Route
        path="/settings"
        element={
          <ErrorBoundary fallback={<PageError />}>
            <Settings />
          </ErrorBoundary>
        }
      />
    </Routes>
  );
}
```

### Level 3: Layout/Section-Level (Recommended)

Group related components (like Facebook Messenger):

```jsx
function MessengerApp() {
  return (
    <div className="messenger">
      <ErrorBoundary fallback={<SidebarError />}>
        <Sidebar />
      </ErrorBoundary>

      <ErrorBoundary fallback={<ConversationError />}>
        <ConversationLog />
      </ErrorBoundary>

      <ErrorBoundary fallback={<InputError />}>
        <MessageInput />
      </ErrorBoundary>

      <ErrorBoundary fallback={<InfoPanelError />}>
        <InfoPanel />
      </ErrorBoundary>
    </div>
  );
}
```

### Level 4: Component-Level

Wrap individual high-risk components:

```jsx
function Dashboard() {
  return (
    <div className="dashboard">
      <ErrorBoundary fallback={<ChartError />}>
        <AnalyticsChart />
      </ErrorBoundary>

      <ErrorBoundary fallback={<WidgetError />}>
        <ThirdPartyWidget />
      </ErrorBoundary>

      <ErrorBoundary fallback={<MapError />}>
        <InteractiveMap />
      </ErrorBoundary>
    </div>
  );
}
```

### Choosing the Right Granularity

| Use Case | Recommended Level |
|----------|-------------------|
| Entire app protection | App-level + Section-level |
| Third-party components | Component-level |
| Data visualization | Component-level |
| Related component groups | Section-level |
| Independent sections | Section-level |
| Form sections | Component-level |

### Performance Considerations

> **Warning:** Too many granular boundaries can lead to:
> - Unnecessary re-renders
> - Increased component tree complexity
> - Slight performance overhead

**Best Practice:** Identify "error-sensitive" components and wrap strategically rather than wrapping everything.

---

## React 19 Improvements

React 19 introduces significant improvements to error handling:

### New Root Options

```javascript
import { createRoot } from 'react-dom/client';

const root = createRoot(container, {
  // Called when Error Boundary catches an error
  onCaughtError: (error, errorInfo) => {
    console.log('Caught by boundary:', error);
    console.log('Component stack:', errorInfo.componentStack);
  },

  // Called when error is NOT caught by any Error Boundary
  onUncaughtError: (error, errorInfo) => {
    console.warn('Uncaught error:', error);
    // Errors reported to window.reportError in React 19
  },

  // Called when React automatically recovers from error
  onRecoverableError: (error, errorInfo) => {
    console.log('Recovered from:', error);
  },
});
```

### Improved Error Logging

- **React 18:** Multiple duplicate error messages for caught errors
- **React 19:** Single consolidated error message with all information
- Uncaught errors now reported via `window.reportError`

### Sentry Integration for React 19

```javascript
import * as Sentry from '@sentry/react';
import { createRoot } from 'react-dom/client';

const root = createRoot(container, {
  onCaughtError: Sentry.reactErrorHandler((error, errorInfo) => {
    // Custom handling
  }),
  onUncaughtError: Sentry.reactErrorHandler((error, errorInfo) => {
    // Custom handling
  }),
});
```

---

## TypeScript Implementation

### Custom Error Boundary

```typescript
import React, { Component, ReactNode, ErrorInfo } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.props.onError?.(error, errorInfo);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return this.props.fallback ?? <h1>Something went wrong.</h1>;
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
```

### With Reset Capability

```typescript
import React, { Component, ReactNode, ErrorInfo } from 'react';

interface FallbackProps {
  error: Error;
  resetErrorBoundary: () => void;
}

interface Props {
  children: ReactNode;
  FallbackComponent: React.ComponentType<FallbackProps>;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.props.onError?.(error, errorInfo);
  }

  resetErrorBoundary = (): void => {
    this.props.onReset?.();
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    const { FallbackComponent } = this.props;

    if (this.state.hasError && this.state.error) {
      return (
        <FallbackComponent
          error={this.state.error}
          resetErrorBoundary={this.resetErrorBoundary}
        />
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
```

### Using react-error-boundary with TypeScript

```typescript
import { ErrorBoundary, FallbackProps } from 'react-error-boundary';

function ErrorFallback({ error, resetErrorBoundary }: FallbackProps) {
  return (
    <div role="alert">
      <p>Something went wrong:</p>
      <pre>{error.message}</pre>
      <button onClick={resetErrorBoundary}>Try again</button>
    </div>
  );
}

// Usage
<ErrorBoundary
  FallbackComponent={ErrorFallback}
  onError={(error: Error, info: { componentStack: string }) => {
    logErrorToService(error, info);
  }}
  onReset={(details: { reason: string }) => {
    // Reset state
  }}
>
  <MyComponent />
</ErrorBoundary>
```

---

## Common Patterns from Popular Apps

### Facebook Messenger Pattern

Facebook's approach: Wrap each major UI section independently:

```jsx
function Messenger() {
  return (
    <div className="messenger-layout">
      <ErrorBoundary fallback={<SidebarFallback />}>
        <ConversationList />
      </ErrorBoundary>

      <ErrorBoundary fallback={<ChatFallback />}>
        <ConversationLog />
        <MessageInput />
      </ErrorBoundary>

      <ErrorBoundary fallback={<InfoFallback />}>
        <ContactInfoPanel />
      </ErrorBoundary>
    </div>
  );
}
```

**Result:** If the info panel crashes, users can still send messages.

### Dashboard Widget Pattern

Each widget fails independently:

```jsx
function Dashboard() {
  return (
    <div className="dashboard-grid">
      {widgets.map(widget => (
        <ErrorBoundary
          key={widget.id}
          fallback={<WidgetError widgetName={widget.name} />}
        >
          <Widget {...widget} />
        </ErrorBoundary>
      ))}
    </div>
  );
}
```

### Route-Based Pattern

Different handling per route:

```jsx
function AppRoutes() {
  return (
    <ErrorBoundary fallback={<GlobalError />}>
      <Routes>
        <Route
          path="/checkout"
          element={
            <ErrorBoundary
              fallback={<CheckoutError />}
              onError={logCriticalError}
            >
              <Checkout />
            </ErrorBoundary>
          }
        />
        <Route
          path="/browse"
          element={
            <ErrorBoundary fallback={<BrowseError />}>
              <ProductBrowse />
            </ErrorBoundary>
          }
        />
      </Routes>
    </ErrorBoundary>
  );
}
```

---

## Best Practices and Common Mistakes

### Best Practices

1. **Use react-error-boundary for modern apps**
   - Simpler API, better hooks support, actively maintained

2. **Strategic placement over blanket coverage**
   - Don't wrap everything; identify error-prone areas

3. **Provide recovery options**
   - "Try again" button, navigation to safe pages

4. **Log to external services**
   - Integrate Sentry, LogRocket, or similar

5. **Match fallback UI to design system**
   - Fallbacks should feel like part of the app

6. **Use multiple granularity levels**
   - App-level + section-level + component-level where needed

7. **Test error boundaries**
   - Verify fallback renders and recovery works

### Common Mistakes

1. **Expecting to catch event handler errors**
   ```jsx
   // This error WON'T be caught by error boundary
   <button onClick={() => { throw new Error('Click error'); }}>
     Click me
   </button>

   // Solution: Use try-catch or showBoundary hook
   ```

2. **Expecting to catch async errors**
   ```jsx
   // This error WON'T be caught
   useEffect(() => {
     setTimeout(() => {
       throw new Error('Async error');
     }, 1000);
   }, []);

   // Solution: Use showBoundary from react-error-boundary
   ```

3. **Single app-wide boundary only**
   - Poor UX: One error takes down everything

4. **Throwing errors for control flow**
   - Error boundaries are for unexpected errors, not business logic

5. **Forgetting boundaries can't catch their own errors**
   - Keep error boundary implementation simple and error-free

6. **Technical fallback messages**
   - Users don't care about stack traces; provide helpful options

7. **Too many granular boundaries**
   - Performance overhead; unnecessary complexity

---

## Integration with Data Fetching Libraries

### TanStack Query (React Query)

Use `QueryErrorResetBoundary` for seamless integration:

```jsx
import { QueryErrorResetBoundary } from '@tanstack/react-query';
import { ErrorBoundary } from 'react-error-boundary';

function App() {
  return (
    <QueryErrorResetBoundary>
      {({ reset }) => (
        <ErrorBoundary
          onReset={reset}
          fallbackRender={({ error, resetErrorBoundary }) => (
            <div>
              <p>Error: {error.message}</p>
              <button onClick={resetErrorBoundary}>Retry</button>
            </div>
          )}
        >
          <DataComponent />
        </ErrorBoundary>
      )}
    </QueryErrorResetBoundary>
  );
}

// Component using suspense
function DataComponent() {
  const { data } = useQuery({
    queryKey: ['data'],
    queryFn: fetchData,
    suspense: true, // or throwOnError: true
  });

  return <div>{data}</div>;
}
```

### SWR

```jsx
import useSWR from 'swr';
import { ErrorBoundary } from 'react-error-boundary';

function DataComponent() {
  const { data } = useSWR('/api/data', fetcher, {
    suspense: true,
  });

  return <div>{data}</div>;
}

function App() {
  return (
    <ErrorBoundary fallback={<Error />}>
      <Suspense fallback={<Loading />}>
        <DataComponent />
      </Suspense>
    </ErrorBoundary>
  );
}
```

---

## References

### Official Documentation
- [React Component API - Error Boundaries](https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary)
- [Legacy React Docs - Error Boundaries](https://legacy.reactjs.org/docs/error-boundaries.html)
- [React 19 Release Notes](https://react.dev/blog/2024/12/05/react-19)

### Libraries
- [react-error-boundary GitHub](https://github.com/bvaughn/react-error-boundary)
- [react-error-boundary npm](https://www.npmjs.com/package/react-error-boundary)
- [Sentry React Error Boundary](https://docs.sentry.io/platforms/javascript/guides/react/features/error-boundary/)

### Guides and Tutorials
- [LogRocket: React Error Handling with react-error-boundary](https://blog.logrocket.com/react-error-handling-react-error-boundary/)
- [Smashing Magazine: React Error Handling and Reporting](https://www.smashingmagazine.com/2020/06/react-error-handling-reporting-error-boundary-sentry/)
- [React TypeScript Cheatsheet - Error Boundaries](https://react-typescript-cheatsheet.netlify.app/docs/basic/getting-started/error_boundaries/)

### Testing Resources
- [Testing React Error Boundaries with RTL](https://jshakespeare.com/react-error-boundary-testing-rtl/)
- [Kent C. Dodds React Testing Library Course](https://github.com/kentcdodds/react-testing-library-course)
