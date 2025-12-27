# Sentry React - Comprehensive Reference Guide

> Error tracking and performance monitoring for React applications using `@sentry/react`.

---

## Table of Contents

1. [Installation and Setup](#installation-and-setup)
2. [Core Configuration Options](#core-configuration-options)
3. [Error Boundary Integration](#error-boundary-integration)
4. [Breadcrumbs](#breadcrumbs)
5. [Context and Tags](#context-and-tags)
6. [User Identification](#user-identification)
7. [Performance Monitoring](#performance-monitoring)
8. [Web Vitals Tracking](#web-vitals-tracking)
9. [Source Maps Upload](#source-maps-upload)
10. [Release Tracking](#release-tracking)
11. [Environment Configuration](#environment-configuration)
12. [Sampling Strategies](#sampling-strategies)
13. [Privacy Considerations](#privacy-considerations)
14. [React Router Integration](#react-router-integration)
15. [Redux Integration](#redux-integration)
16. [Best Practices](#best-practices)

---

## Installation and Setup

### Installation

```bash
npm install @sentry/react --save
# or
yarn add @sentry/react
# or
bun add @sentry/react
```

### Basic Initialization

Create an `instrument.js` file at your project root and import it **first** in your app's entry point:

```javascript
// instrument.js
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: "https://your-dsn@o0.ingest.sentry.io/0",

  // Environment configuration
  environment: process.env.NODE_ENV,
  release: process.env.npm_package_version,

  // Integrations
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration(),
    Sentry.feedbackIntegration({ colorScheme: "system" }),
  ],

  // Tracing
  tracesSampleRate: 1.0, // Adjust for production
  tracePropagationTargets: ["localhost", /^https:\/\/yourserver\.io\/api/],

  // Session Replay
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,

  // Optional: Enable logs
  enableLogs: true,

  // Optional: Send default PII (off by default)
  sendDefaultPii: false,
});
```

```javascript
// index.js or main.jsx - import instrument first!
import "./instrument";
import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";

const container = document.getElementById("app");
const root = createRoot(container);
root.render(<App />);
```

### React 19 Error Handling

React 19 introduces new error hooks that integrate with Sentry:

```javascript
import * as Sentry from "@sentry/react";
import { createRoot } from "react-dom/client";

const container = document.getElementById("app");
const root = createRoot(container, {
  // Capture uncaught errors (errors not caught by error boundaries)
  onUncaughtError: Sentry.reactErrorHandler(),

  // Capture errors caught by error boundaries
  onCaughtError: Sentry.reactErrorHandler(),

  // Capture recoverable errors (React's internal recovery attempts)
  onRecoverableError: Sentry.reactErrorHandler(),
});

root.render(<App />);
```

**Recommendation**: For finer control, use only `onUncaughtError` and `onRecoverableError` with the hooks, and use `Sentry.ErrorBoundary` instead of `onCaughtError`.

### Verify Your Setup

Test that Sentry is capturing errors:

```jsx
function TestButton() {
  return (
    <button
      type="button"
      onClick={() => {
        throw new Error("Sentry Test Error");
      }}
    >
      Break the world
    </button>
  );
}
```

For tracing verification:

```jsx
<button
  onClick={() => {
    Sentry.startSpan({ op: "test", name: "Example Frontend Span" }, () => {
      setTimeout(() => {
        throw new Error("Test Span Error");
      }, 99);
    });
  }}
>
  Test Tracing
</button>
```

---

## Core Configuration Options

### Essential Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `dsn` | string | - | Data Source Name - where events are sent |
| `debug` | boolean | `false` | Enable debug logging |
| `release` | string | auto-detected | Application version identifier |
| `environment` | string | `"production"` | Deployment environment |
| `enabled` | boolean | `true` | Whether SDK sends events |

### Error Monitoring Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `sampleRate` | number | `1.0` | Error sampling rate (0.0 - 1.0) |
| `beforeSend` | function | - | Modify/filter events before sending |
| `ignoreErrors` | array | `[]` | Error messages to ignore (strings/regex) |
| `denyUrls` | array | `[]` | Script URLs to ignore |
| `allowUrls` | array | `[]` | Only capture errors from these URLs |

### Tracing Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `tracesSampleRate` | number | - | Transaction sampling rate |
| `tracesSampler` | function | - | Dynamic sampling function |
| `tracePropagationTargets` | array | - | URLs to propagate trace headers |
| `beforeSendTransaction` | function | - | Modify/filter transactions |

### Data Handling Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `maxBreadcrumbs` | number | `100` | Maximum breadcrumbs to store |
| `attachStacktrace` | boolean | `false` | Attach stack traces to all messages |
| `normalizeDepth` | number | `3` | Context normalization depth |
| `normalizeMaxBreadth` | number | `1000` | Max properties in objects/arrays |
| `maxValueLength` | number | - | Max string length before truncation |
| `sendDefaultPii` | boolean | `false` | Auto-collect PII (IP, etc.) |

### Session Replay Options

| Option | Type | Description |
|--------|------|-------------|
| `replaysSessionSampleRate` | number | Continuous replay sampling (0-1) |
| `replaysOnErrorSampleRate` | number | Error-triggered replay sampling |

### Full Configuration Example

```javascript
Sentry.init({
  dsn: "https://your-dsn@sentry.io/0",

  // Environment & Release
  environment: process.env.NODE_ENV,
  release: `my-app@${process.env.npm_package_version}`,

  // Debug (disable in production)
  debug: process.env.NODE_ENV === "development",

  // Integrations
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration(),
  ],

  // Sampling
  sampleRate: 1.0,
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,

  // Trace propagation
  tracePropagationTargets: [
    "localhost",
    /^https:\/\/api\.yoursite\.com/,
  ],

  // Data handling
  maxBreadcrumbs: 50,
  normalizeDepth: 5,

  // Filtering
  ignoreErrors: [
    "ResizeObserver loop limit exceeded",
    /^Network request failed/,
  ],

  // Tunneling (bypass ad blockers)
  tunnel: "/sentry-tunnel",

  // Initial scope
  initialScope: {
    tags: { app: "my-react-app" },
  },
});
```

---

## Error Boundary Integration

### Sentry ErrorBoundary Component

Sentry provides a pre-built ErrorBoundary that automatically captures and reports errors:

```jsx
import * as Sentry from "@sentry/react";

function App() {
  return (
    <Sentry.ErrorBoundary
      fallback={<ErrorFallback />}
      showDialog
    >
      <YourComponents />
    </Sentry.ErrorBoundary>
  );
}

function ErrorFallback() {
  return (
    <div className="error-container">
      <h1>Something went wrong</h1>
      <p>We've been notified and are working on a fix.</p>
    </div>
  );
}
```

### ErrorBoundary Props

| Prop | Type | Description |
|------|------|-------------|
| `fallback` | ReactNode or Function | UI to render on error |
| `showDialog` | boolean | Show Sentry feedback widget |
| `dialogOptions` | object | Customize feedback widget |
| `onError` | function | Callback when error occurs |
| `onMount` | function | Called on componentDidMount |
| `onUnmount` | function | Called on componentWillUnmount |
| `beforeCapture` | function | Modify scope before sending |

### Fallback as Function

Access error details and reset functionality in your fallback:

```jsx
<Sentry.ErrorBoundary
  fallback={({ error, componentStack, resetError }) => (
    <div className="error-page">
      <h2>An error occurred</h2>
      <pre>{error.message}</pre>
      <details>
        <summary>Component Stack</summary>
        <pre>{componentStack}</pre>
      </details>
      <button onClick={resetError}>Try again</button>
    </div>
  )}
>
  <App />
</Sentry.ErrorBoundary>
```

### Using beforeCapture

Add context-specific tags before capturing errors:

```jsx
<Sentry.ErrorBoundary
  beforeCapture={(scope, error, componentStack) => {
    scope.setTag("location", "checkout");
    scope.setTag("component", "PaymentForm");
    scope.setLevel("error");
  }}
  fallback={<CheckoutErrorFallback />}
>
  <CheckoutFlow />
</Sentry.ErrorBoundary>
```

### Higher-Order Component (HOC) Pattern

Wrap components with error boundary as an HOC:

```jsx
import * as Sentry from "@sentry/react";

const ProtectedComponent = Sentry.withErrorBoundary(MyComponent, {
  fallback: <p>An error occurred in this component</p>,
  showDialog: true,
});

// Usage
function App() {
  return <ProtectedComponent />;
}
```

### Multiple Error Boundaries

Use multiple boundaries to isolate different parts of your app:

```jsx
function App() {
  return (
    <div className="app">
      <Sentry.ErrorBoundary
        beforeCapture={(scope) => scope.setTag("section", "header")}
        fallback={<HeaderFallback />}
      >
        <Header />
      </Sentry.ErrorBoundary>

      <Sentry.ErrorBoundary
        beforeCapture={(scope) => scope.setTag("section", "main")}
        fallback={<MainContentFallback />}
      >
        <MainContent />
      </Sentry.ErrorBoundary>

      <Sentry.ErrorBoundary
        beforeCapture={(scope) => scope.setTag("section", "sidebar")}
        fallback={<SidebarFallback />}
      >
        <Sidebar />
      </Sentry.ErrorBoundary>
    </div>
  );
}
```

### Manual Error Capture in Custom Boundaries

If you have your own error boundary, use `captureReactException`:

```jsx
import * as Sentry from "@sentry/react";

class CustomErrorBoundary extends React.Component {
  state = { hasError: false };

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Capture with React-specific context
    Sentry.captureReactException(error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return <h1>Something went wrong.</h1>;
    }
    return this.props.children;
  }
}
```

---

## Breadcrumbs

Breadcrumbs create a trail of events leading up to an error, helping you understand what the user did before the issue occurred.

### Automatic Breadcrumbs

The SDK automatically captures:

- **DOM interactions**: Clicks, key presses
- **Console calls**: `console.log`, `console.error`, etc.
- **XHR/Fetch requests**: Network requests and responses
- **Navigation**: URL/route changes
- **UI events**: Form submissions, focus changes

### Manual Breadcrumbs

Add custom breadcrumbs for important user actions:

```javascript
import * as Sentry from "@sentry/react";

// User authentication
function login(user) {
  Sentry.addBreadcrumb({
    category: "auth",
    message: `User ${user.email} logged in`,
    level: "info",
  });
  // ... login logic
}

// E-commerce actions
function addToCart(product) {
  Sentry.addBreadcrumb({
    category: "cart",
    message: `Added ${product.name} to cart`,
    level: "info",
    data: {
      productId: product.id,
      price: product.price,
      quantity: 1,
    },
  });
  // ... cart logic
}

// Navigation tracking
function navigateToPage(pageName) {
  Sentry.addBreadcrumb({
    category: "navigation",
    message: `Navigated to ${pageName}`,
    level: "info",
    data: {
      from: window.location.pathname,
      to: pageName,
    },
  });
}
```

### Breadcrumb Properties

| Property | Type | Description |
|----------|------|-------------|
| `type` | string | Breadcrumb type (default, http, error, etc.) |
| `category` | string | Dotted string (e.g., "ui.click", "auth") |
| `message` | string | Human-readable description |
| `level` | string | Severity: fatal, error, warning, info, debug |
| `timestamp` | number | Unix timestamp (auto-set by SDK) |
| `data` | object | Additional structured data |

### Customizing Breadcrumbs with beforeBreadcrumb

Filter or modify breadcrumbs before they're added:

```javascript
Sentry.init({
  dsn: "...",
  beforeBreadcrumb(breadcrumb, hint) {
    // Filter out noisy UI clicks
    if (breadcrumb.category === "ui.click") {
      const target = hint?.event?.target;
      // Only keep clicks on important elements
      if (!target?.matches("button, a, [data-track]")) {
        return null;
      }
    }

    // Scrub sensitive data from fetch breadcrumbs
    if (breadcrumb.category === "fetch") {
      if (breadcrumb.data?.url?.includes("/api/auth")) {
        breadcrumb.data.body = "[REDACTED]";
      }
    }

    // Limit console breadcrumbs
    if (breadcrumb.category === "console") {
      breadcrumb.message = breadcrumb.message?.substring(0, 200);
    }

    return breadcrumb;
  },
});
```

### Limiting Breadcrumbs

Control the maximum number of stored breadcrumbs:

```javascript
Sentry.init({
  dsn: "...",
  maxBreadcrumbs: 50, // Default is 100
});
```

### Breadcrumb Types and Categories

| Type | Category | Description |
|------|----------|-------------|
| `default` | custom | Custom breadcrumbs |
| `http` | fetch, xhr | Network requests |
| `navigation` | navigation | URL changes |
| `ui` | ui.click, ui.input | User interactions |
| `console` | console | Console logs |
| `error` | - | JavaScript errors |

---

## Context and Tags

### Tags vs Context

- **Tags**: Key-value pairs for filtering and searching in Sentry UI
- **Context**: Rich structured data displayed on event details (not searchable)

### Setting Tags

```javascript
import * as Sentry from "@sentry/react";

// Global tags (apply to all events)
Sentry.setTag("app_version", "2.0.0");
Sentry.setTag("feature_flag", "new_checkout");

// Multiple tags at once
Sentry.setTags({
  environment: "production",
  region: "us-east",
  tier: "premium",
});
```

### Setting Context

```javascript
// Custom context objects
Sentry.setContext("cart", {
  items: 3,
  total: 149.99,
  currency: "USD",
});

Sentry.setContext("subscription", {
  plan: "enterprise",
  seats: 50,
  renewsAt: "2025-06-01",
});

// Device/browser context
Sentry.setContext("browser", {
  name: navigator.userAgent,
  viewport: `${window.innerWidth}x${window.innerHeight}`,
});
```

### Using withScope for Isolated Context

Apply context only to specific events:

```javascript
Sentry.withScope((scope) => {
  scope.setTag("transaction", "payment");
  scope.setLevel("error");
  scope.setContext("payment", {
    amount: 99.99,
    method: "credit_card",
    last4: "4242",
  });

  Sentry.captureException(paymentError);
});
// Context is automatically cleared after withScope
```

### Scope Hierarchy

Sentry uses three scope levels (applied in order):

1. **Global Scope**: Applies to all events
2. **Isolation Scope**: Per-request/session data
3. **Current Scope**: Temporary, local context

```javascript
// Global scope - rarely needed
Sentry.getGlobalScope().setTag("app", "my-react-app");

// Isolation scope - default for most setters
Sentry.setTag("session_id", "abc123");

// Current scope - use withScope for temporary context
Sentry.withScope((scope) => {
  scope.setExtra("debug_info", debugData);
  Sentry.captureMessage("Debug event");
});
```

### Adding Extra Data

```javascript
// Set extra data on current scope
Sentry.setExtra("debug_data", {
  lastAction: "button_click",
  timestamp: Date.now(),
});

// With captured exception
Sentry.captureException(error, {
  extra: {
    attemptedAction: "save_document",
    documentId: "doc-123",
  },
});
```

---

## User Identification

### Setting User Information

Identify users to track which users are affected by issues:

```javascript
import * as Sentry from "@sentry/react";

// After user login
function onLogin(user) {
  Sentry.setUser({
    id: user.id,
    email: user.email,           // Optional
    username: user.username,     // Optional
    ip_address: "{{auto}}",     // Auto-detect
  });
}

// On logout
function onLogout() {
  Sentry.setUser(null);
}
```

### User Object Properties

| Property | Description |
|----------|-------------|
| `id` | Unique identifier (recommended) |
| `email` | User's email address |
| `username` | Display name |
| `ip_address` | IP address or "{{auto}}" for auto-detection |
| `segment` | User segment/cohort |
| Custom | Any additional properties |

### Privacy-Conscious User Tracking

```javascript
// Use hashed/anonymized IDs for privacy
Sentry.setUser({
  id: hashUserId(user.id),
  segment: user.plan, // "free", "pro", "enterprise"
  // Don't include email or PII
});
```

### User with Custom Properties

```javascript
Sentry.setUser({
  id: "12345",
  email: "user@example.com",
  subscription: "premium",
  accountAge: 365,
  features: ["dark_mode", "beta_access"],
});
```

### React Hook for User Identification

```jsx
import { useEffect } from "react";
import * as Sentry from "@sentry/react";

function useIdentifyUser(user) {
  useEffect(() => {
    if (user) {
      Sentry.setUser({
        id: user.id,
        email: user.email,
        username: user.displayName,
      });
    } else {
      Sentry.setUser(null);
    }

    return () => {
      Sentry.setUser(null);
    };
  }, [user?.id]);
}

// Usage in App
function App() {
  const { user } = useAuth();
  useIdentifyUser(user);

  return <AppContent />;
}
```

---

## Performance Monitoring

### Setup

Enable tracing by adding the `browserTracingIntegration`:

```javascript
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: "...",
  integrations: [Sentry.browserTracingIntegration()],
  tracesSampleRate: 1.0, // 100% for development
  tracePropagationTargets: ["localhost", /^https:\/\/api\.yoursite\.com/],
});
```

### Key Concepts

- **Transaction**: A complete operation (page load, navigation, API call)
- **Span**: Individual operations within a transaction (component render, fetch request)

### Automatic Instrumentation

The SDK automatically traces:

- Page loads
- Route navigation (with React Router integration)
- XHR/Fetch requests
- Browser resources (images, scripts)

### Manual Spans

Create custom spans for specific operations:

```javascript
import * as Sentry from "@sentry/react";

async function processData(data) {
  return Sentry.startSpan(
    {
      op: "process",
      name: "Process User Data",
    },
    async (span) => {
      // Nested span
      const validated = await Sentry.startSpan(
        { op: "validate", name: "Validate Input" },
        async () => {
          return validateData(data);
        }
      );

      // Another nested span
      const result = await Sentry.startSpan(
        { op: "transform", name: "Transform Data" },
        async () => {
          return transformData(validated);
        }
      );

      return result;
    }
  );
}
```

### React Profiler Component

Measure component render performance:

```jsx
import * as Sentry from "@sentry/react";

// Wrap components you want to profile
const ProfiledComponent = Sentry.withProfiler(MyComponent);

// Or use as a wrapper
function App() {
  return (
    <Sentry.Profiler name="ExpensiveComponent">
      <ExpensiveComponent />
    </Sentry.Profiler>
  );
}
```

### Span Attributes

Add metadata to spans:

```javascript
Sentry.startSpan(
  {
    op: "db.query",
    name: "Fetch User Orders",
    attributes: {
      "db.system": "postgresql",
      "db.name": "orders",
      "user.id": userId,
    },
  },
  async () => {
    return fetchOrders(userId);
  }
);
```

### Distributed Tracing

Connect frontend and backend traces:

```javascript
Sentry.init({
  dsn: "...",
  integrations: [Sentry.browserTracingIntegration()],
  tracePropagationTargets: [
    "localhost",
    /^https:\/\/api\.yoursite\.com/,
  ],
});
```

This automatically adds `sentry-trace` and `baggage` headers to outgoing requests.

---

## Web Vitals Tracking

Sentry automatically captures Core Web Vitals when using `browserTracingIntegration`.

### Tracked Metrics

| Metric | Description | Good Threshold |
|--------|-------------|----------------|
| **LCP** | Largest Contentful Paint - main content load time | <= 2.5s |
| **FCP** | First Contentful Paint - time to first content | <= 1.8s |
| **CLS** | Cumulative Layout Shift - visual stability | <= 0.1 |
| **INP** | Interaction to Next Paint - responsiveness | <= 200ms |
| **TTFB** | Time to First Byte - server response time | <= 800ms |

### Enabling Web Vitals

Web Vitals are captured automatically with browser tracing:

```javascript
Sentry.init({
  dsn: "...",
  integrations: [
    Sentry.browserTracingIntegration({
      enableInp: true, // Enabled by default in SDK 8.0+
    }),
  ],
  tracesSampleRate: 1.0,
});
```

### Custom Web Vitals Reporting

```javascript
import { onLCP, onFID, onCLS } from "web-vitals";

// Send to Sentry as custom metrics
onLCP((metric) => {
  Sentry.setMeasurement("lcp", metric.value, "millisecond");
});

onCLS((metric) => {
  Sentry.setMeasurement("cls", metric.value, "");
});
```

### Viewing Web Vitals in Sentry

Navigate to **Performance > Web Vitals** in your Sentry dashboard to see:

- Per-page Web Vitals scores
- Distribution of values
- Trends over time
- Drill-down to specific page loads
- Correlation with errors and replays

### Thresholds in Sentry

| Metric | Good | Needs Improvement | Poor |
|--------|------|-------------------|------|
| LCP | <= 2.5s | <= 4s | > 4s |
| INP | <= 200ms | <= 500ms | > 500ms |
| CLS | <= 0.1 | <= 0.25 | > 0.25 |
| FCP | <= 1s | <= 3s | > 3s |

---

## Source Maps Upload

Source maps enable readable stack traces by mapping minified code back to source.

### Automated Setup (Recommended)

Use the Sentry Wizard for automatic configuration:

```bash
npx @sentry/wizard@latest -i sourcemaps
```

The wizard handles:
- Authentication
- Package installation
- Build tool configuration
- CI/CD setup

### Webpack Configuration

```javascript
// webpack.config.js
const { sentryWebpackPlugin } = require("@sentry/webpack-plugin");

module.exports = {
  devtool: "source-map", // Required!
  plugins: [
    sentryWebpackPlugin({
      org: "your-org",
      project: "your-project",
      authToken: process.env.SENTRY_AUTH_TOKEN,

      // Optional: Delete source maps after upload
      sourcemaps: {
        filesToDeleteAfterUpload: ["./dist/**/*.map"],
      },
    }),
  ],
};
```

### Vite Configuration

```javascript
// vite.config.js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { sentryVitePlugin } from "@sentry/vite-plugin";

export default defineConfig({
  build: {
    sourcemap: true, // or "hidden" to not expose in production
  },
  plugins: [
    react(),
    sentryVitePlugin({
      org: "your-org",
      project: "your-project",
      authToken: process.env.SENTRY_AUTH_TOKEN,

      sourcemaps: {
        filesToDeleteAfterUpload: ["./dist/**/*.map"],
      },
    }),
  ],
});
```

### Create React App

For CRA without ejecting, use `craco`:

```javascript
// craco.config.js
const { sentryWebpackPlugin } = require("@sentry/webpack-plugin");

module.exports = {
  webpack: {
    plugins: {
      add: [
        sentryWebpackPlugin({
          org: "your-org",
          project: "your-project",
          authToken: process.env.SENTRY_AUTH_TOKEN,
        }),
      ],
    },
    configure: (config) => {
      config.devtool = "source-map";
      return config;
    },
  },
};
```

### Environment Variables

Set these in your CI/CD environment:

```bash
SENTRY_AUTH_TOKEN=your-auth-token
SENTRY_ORG=your-org
SENTRY_PROJECT=your-project
```

### Security: Deleting Source Maps

To prevent public access to source maps:

```javascript
sentryWebpackPlugin({
  // ...
  sourcemaps: {
    filesToDeleteAfterUpload: ["./dist/**/*.js.map"],
  },
});
```

Or configure your server to deny access to `.map` files.

---

## Release Tracking

Releases help you identify which version introduced a bug and track deployment health.

### Setting Release Version

```javascript
Sentry.init({
  dsn: "...",
  release: "my-app@1.2.3",
  // Or dynamically
  release: `my-app@${process.env.npm_package_version}`,
});
```

### Recommended Versioning Formats

- Semantic: `my-app@1.2.3`
- CalVer: `my-app@2025.01.15`
- Git SHA: `my-app@a1b2c3d4`

### Creating Releases via CLI

```bash
# Create a release
sentry-cli releases new my-app@1.2.3

# Associate commits
sentry-cli releases set-commits my-app@1.2.3 --auto

# Upload source maps
sentry-cli releases files my-app@1.2.3 upload-sourcemaps ./dist

# Finalize release
sentry-cli releases finalize my-app@1.2.3

# Create deployment
sentry-cli releases deploys my-app@1.2.3 new -e production
```

### CI/CD Integration Example (GitHub Actions)

```yaml
# .github/workflows/deploy.yml
- name: Create Sentry Release
  uses: getsentry/action-release@v1
  env:
    SENTRY_AUTH_TOKEN: ${{ secrets.SENTRY_AUTH_TOKEN }}
    SENTRY_ORG: your-org
    SENTRY_PROJECT: your-project
  with:
    environment: production
    version: ${{ github.sha }}
    sourcemaps: "./dist"
```

### Benefits of Release Tracking

- **Issue assignment**: See which release introduced an issue
- **Regression detection**: Identify new issues in a release
- **Release health**: Monitor crash-free sessions
- **Commit integration**: Link errors to commits and authors
- **Deployment tracking**: Know when and where releases are deployed

---

## Environment Configuration

### Setting Environment

```javascript
Sentry.init({
  dsn: "...",
  environment: process.env.NODE_ENV, // "development", "staging", "production"
});
```

### Environment Rules

- Case-sensitive
- No newlines, spaces, or forward slashes
- Maximum 64 characters
- Common values: `development`, `staging`, `production`, `qa`

### Multiple Environments Example

```javascript
const getEnvironment = () => {
  if (window.location.hostname === "localhost") {
    return "development";
  }
  if (window.location.hostname.includes("staging")) {
    return "staging";
  }
  return "production";
};

Sentry.init({
  dsn: "...",
  environment: getEnvironment(),
});
```

### Conditional Configuration by Environment

```javascript
const isProd = process.env.NODE_ENV === "production";

Sentry.init({
  dsn: "...",
  environment: process.env.NODE_ENV,

  // Debug only in development
  debug: !isProd,

  // Higher sampling in development
  tracesSampleRate: isProd ? 0.1 : 1.0,
  replaysSessionSampleRate: isProd ? 0.1 : 0,

  // Only enable replay in production
  integrations: isProd
    ? [Sentry.browserTracingIntegration(), Sentry.replayIntegration()]
    : [Sentry.browserTracingIntegration()],
});
```

### Disabling Sentry in Development

```javascript
Sentry.init({
  dsn: process.env.NODE_ENV === "production" ? "..." : undefined,
  // Or
  enabled: process.env.NODE_ENV === "production",
});
```

---

## Sampling Strategies

### Error Sampling

```javascript
Sentry.init({
  dsn: "...",
  sampleRate: 0.5, // Send 50% of errors
});
```

### Transaction Sampling

#### Uniform Rate

```javascript
Sentry.init({
  dsn: "...",
  tracesSampleRate: 0.1, // 10% of transactions
});
```

#### Dynamic Sampling with tracesSampler

```javascript
Sentry.init({
  dsn: "...",
  tracesSampler: (samplingContext) => {
    const { name, attributes, parentSampled } = samplingContext;

    // Always sample errors
    if (name.includes("error")) {
      return 1.0;
    }

    // Sample important transactions more
    if (name.includes("checkout") || name.includes("payment")) {
      return 0.5;
    }

    // Skip health checks entirely
    if (name.includes("healthcheck") || name.includes("/health")) {
      return 0;
    }

    // Respect parent sampling decision
    if (parentSampled !== undefined) {
      return parentSampled ? 0.5 : 0;
    }

    // Default rate
    return 0.1;
  },
});
```

### Precedence Rules

1. `tracesSampler` (if defined)
2. Parent sampling decision
3. `tracesSampleRate`

### Session Replay Sampling

```javascript
Sentry.init({
  dsn: "...",
  integrations: [Sentry.replayIntegration()],

  // Sample 10% of all sessions
  replaysSessionSampleRate: 0.1,

  // Always capture sessions with errors
  replaysOnErrorSampleRate: 1.0,
});
```

### Profiling Sampling

```javascript
Sentry.init({
  dsn: "...",
  profileSessionSampleRate: 0.1, // 10% of sessions get profiling
  profileLifecycle: "trace", // or "manual"
});
```

### Production Sampling Guidelines

| Type | Development | Staging | Production |
|------|-------------|---------|------------|
| Errors | 1.0 | 1.0 | 1.0 |
| Traces | 1.0 | 0.5 | 0.1 - 0.2 |
| Replays | 0 | 0.5 | 0.1 |
| Profiles | 0 | 0.2 | 0.05 |

---

## Privacy Considerations

### Default PII Handling

By default, Sentry does NOT collect:
- IP addresses
- User cookies
- Request bodies
- Sensitive headers (Authorization, Cookie, etc.)

Enable with caution:

```javascript
Sentry.init({
  dsn: "...",
  sendDefaultPii: true, // Not recommended
});
```

### Using beforeSend for Data Scrubbing

```javascript
Sentry.init({
  dsn: "...",
  beforeSend(event, hint) {
    // Remove user email
    if (event.user) {
      delete event.user.email;
      delete event.user.ip_address;
    }

    // Scrub sensitive request data
    if (event.request) {
      delete event.request.cookies;
      delete event.request.headers?.Cookie;
      delete event.request.headers?.Authorization;

      // Scrub query strings
      if (event.request.query_string) {
        event.request.query_string = "[Filtered]";
      }
    }

    // Scrub sensitive breadcrumb data
    event.breadcrumbs = event.breadcrumbs?.map((breadcrumb) => {
      if (breadcrumb.category === "fetch") {
        if (breadcrumb.data?.url?.includes("/auth")) {
          breadcrumb.data.body = "[Filtered]";
        }
      }
      return breadcrumb;
    });

    return event;
  },
});
```

### beforeSendTransaction for Tracing

```javascript
Sentry.init({
  dsn: "...",
  beforeSendTransaction(event) {
    // Remove sensitive URL parameters
    if (event.transaction) {
      event.transaction = event.transaction.replace(/\/users\/\d+/, "/users/:id");
    }
    return event;
  },
});
```

### beforeBreadcrumb for Breadcrumb Filtering

```javascript
Sentry.init({
  dsn: "...",
  beforeBreadcrumb(breadcrumb, hint) {
    // Filter out sensitive console logs
    if (breadcrumb.category === "console") {
      if (breadcrumb.message?.includes("password") ||
          breadcrumb.message?.includes("token")) {
        return null;
      }
    }

    // Scrub sensitive fetch URLs
    if (breadcrumb.category === "fetch") {
      if (breadcrumb.data?.url?.includes("api-key")) {
        breadcrumb.data.url = breadcrumb.data.url.replace(/api-key=[^&]+/, "api-key=[FILTERED]");
      }
    }

    return breadcrumb;
  },
});
```

### User Privacy Best Practices

```javascript
// Use internal IDs, not emails
Sentry.setUser({
  id: user.internalId, // Not email
});

// Hash sensitive values
Sentry.setTag("user_segment", hashValue(user.segment));

// Use setContext carefully
Sentry.setContext("order", {
  orderId: order.id,
  total: order.total,
  // Don't include: shipping address, payment details
});
```

### Server-Side Data Scrubbing

Configure additional scrubbing in Sentry UI:
1. Go to **Project Settings > Security & Privacy**
2. Enable **Data Scrubbing**
3. Add **Additional Sensitive Fields**

### Sensitive Headers (Auto-Filtered)

Sentry automatically filters these headers:
- `Authorization`
- `Cookie`
- `Set-Cookie`
- Headers containing: `auth`, `token`, `secret`, `password`, `key`, `jwt`, `bearer`

---

## React Router Integration

### React Router v6

```javascript
import * as Sentry from "@sentry/react";
import {
  createBrowserRouter,
  RouterProvider,
} from "react-router-dom";

Sentry.init({
  dsn: "...",
  integrations: [
    Sentry.reactRouterV6BrowserTracingIntegration({
      useEffect: React.useEffect,
      useLocation,
      useNavigationType,
      createRoutesFromChildren,
      matchRoutes,
    }),
  ],
  tracesSampleRate: 1.0,
});

// Wrap your routes
const sentryCreateBrowserRouter = Sentry.wrapCreateBrowserRouter(createBrowserRouter);

const router = sentryCreateBrowserRouter([
  {
    path: "/",
    element: <Root />,
    children: [
      { path: "dashboard", element: <Dashboard /> },
      { path: "users/:userId", element: <UserProfile /> },
    ],
  },
]);

function App() {
  return <RouterProvider router={router} />;
}
```

### React Router v6 with createRoutesFromElements

```javascript
import * as Sentry from "@sentry/react";
import { createBrowserRouter, Route } from "react-router-dom";

const sentryCreateBrowserRouter = Sentry.wrapCreateBrowserRouter(createBrowserRouter);

const router = sentryCreateBrowserRouter(
  createRoutesFromElements(
    <Route path="/" element={<Layout />}>
      <Route index element={<Home />} />
      <Route path="about" element={<About />} />
    </Route>
  )
);
```

### React Router v7 (Library Mode)

```javascript
import * as Sentry from "@sentry/react";
import { createBrowserRouter } from "react-router";

Sentry.init({
  dsn: "...",
  integrations: [
    Sentry.reactRouterV7BrowserTracingIntegration({
      useEffect: React.useEffect,
      useLocation,
      useNavigationType,
      createRoutesFromChildren,
      matchRoutes,
    }),
  ],
});
```

### TanStack Router

```javascript
import * as Sentry from "@sentry/react";
import { createRouter } from "@tanstack/react-router";

const router = createRouter({ routeTree });

Sentry.init({
  dsn: "...",
  integrations: [
    Sentry.tanstackRouterBrowserTracingIntegration(router),
  ],
  tracesSampleRate: 1.0,
});
```

### Error Boundary with React Router

```jsx
import * as Sentry from "@sentry/react";
import { useRouteError } from "react-router-dom";

function RootErrorBoundary() {
  const error = useRouteError();

  return (
    <Sentry.ErrorBoundary fallback={<ErrorPage error={error} />}>
      <Outlet />
    </Sentry.ErrorBoundary>
  );
}

const router = createBrowserRouter([
  {
    path: "/",
    element: <Root />,
    errorElement: <RootErrorBoundary />,
  },
]);
```

---

## Redux Integration

### Basic Setup

```javascript
import * as Sentry from "@sentry/react";
import { configureStore } from "@reduxjs/toolkit";

const sentryReduxEnhancer = Sentry.createReduxEnhancer({
  // Options here
});

const store = configureStore({
  reducer: rootReducer,
  enhancers: (getDefaultEnhancers) =>
    getDefaultEnhancers().concat(sentryReduxEnhancer),
});
```

### With Legacy createStore

```javascript
import { createStore, compose, applyMiddleware } from "redux";

const store = createStore(
  rootReducer,
  compose(
    applyMiddleware(thunk, logger),
    sentryReduxEnhancer
  )
);
```

### Configuration Options

#### actionTransformer

Filter or modify actions before sending:

```javascript
const sentryReduxEnhancer = Sentry.createReduxEnhancer({
  actionTransformer: (action) => {
    // Don't send sensitive actions
    if (action.type === "SET_PASSWORD" || action.type === "SET_TOKEN") {
      return null;
    }

    // Scrub sensitive data from actions
    if (action.type === "UPDATE_USER") {
      return {
        ...action,
        payload: {
          ...action.payload,
          password: "[FILTERED]",
          ssn: "[FILTERED]",
        },
      };
    }

    return action;
  },
});
```

#### stateTransformer

Filter or modify state before sending:

```javascript
const sentryReduxEnhancer = Sentry.createReduxEnhancer({
  stateTransformer: (state) => {
    // Don't send any state
    // return null;

    // Send only specific parts
    return {
      user: {
        id: state.user?.id,
        role: state.user?.role,
        // Don't send: email, password, tokens
      },
      ui: state.ui,
      // Don't send: auth, payments, etc.
    };
  },
});
```

#### configureScopeWithState

Update Sentry scope based on state:

```javascript
const sentryReduxEnhancer = Sentry.createReduxEnhancer({
  configureScopeWithState: (scope, state) => {
    scope.setUser({ id: state.auth.userId });
    scope.setTag("feature_flags", JSON.stringify(state.featureFlags));
    scope.setTag("cart_items", state.cart.items.length);
  },
});
```

#### attachReduxState

Control whether to attach full state (default: true since v7.69.0):

```javascript
const sentryReduxEnhancer = Sentry.createReduxEnhancer({
  attachReduxState: false, // Disable state attachment
});
```

### Increase Normalization Depth

Redux state can be deeply nested:

```javascript
Sentry.init({
  dsn: "...",
  normalizeDepth: 10, // Default is 3
});
```

---

## Best Practices

### 1. Initialize Early

```javascript
// instrument.js - import this FIRST
import * as Sentry from "@sentry/react";

Sentry.init({ /* ... */ });

// index.js
import "./instrument"; // Before any other imports!
import React from "react";
import { createRoot } from "react-dom/client";
```

### 2. Use Environment-Specific Configuration

```javascript
const isProd = process.env.NODE_ENV === "production";

Sentry.init({
  dsn: isProd ? "..." : undefined, // Disable in dev
  environment: process.env.NODE_ENV,
  debug: !isProd,
  tracesSampleRate: isProd ? 0.1 : 1.0,
});
```

### 3. Wrap Critical Components with Error Boundaries

```jsx
function App() {
  return (
    <Sentry.ErrorBoundary fallback={<CriticalError />}>
      <Header />

      <Sentry.ErrorBoundary fallback={<ContentError />}>
        <MainContent />
      </Sentry.ErrorBoundary>

      <Footer />
    </Sentry.ErrorBoundary>
  );
}
```

### 4. Add Meaningful Context

```javascript
// On user actions
Sentry.addBreadcrumb({
  category: "user.action",
  message: "Clicked checkout button",
  level: "info",
});

// On state changes
Sentry.setContext("cart", {
  items: cart.length,
  total: cart.reduce((sum, item) => sum + item.price, 0),
});
```

### 5. Use Tags for Filtering

```javascript
// Component-level tags
Sentry.setTag("page", "checkout");
Sentry.setTag("feature", "new_payment_flow");

// Error-specific tags
Sentry.withScope((scope) => {
  scope.setTag("payment_provider", "stripe");
  Sentry.captureException(paymentError);
});
```

### 6. Protect User Privacy

```javascript
Sentry.init({
  beforeSend(event) {
    // Strip sensitive data
    if (event.user) {
      delete event.user.email;
    }
    return event;
  },
  beforeBreadcrumb(breadcrumb) {
    // Filter sensitive logs
    if (breadcrumb.message?.includes("password")) {
      return null;
    }
    return breadcrumb;
  },
});
```

### 7. Configure Source Maps in CI/CD

```yaml
# Don't expose source maps in production
build:
  sourcemap: "hidden"

# Upload to Sentry
sentry:
  upload-sourcemaps: true
  delete-after-upload: true
```

### 8. Set Up Alerts

In Sentry UI:
- Create alerts for new issues
- Set thresholds for error rates
- Alert on performance regressions
- Monitor release health

### 9. Use Tracing for Full Visibility

```javascript
Sentry.init({
  integrations: [Sentry.browserTracingIntegration()],
  tracesSampleRate: 0.1,
  tracePropagationTargets: [
    "localhost",
    /^https:\/\/api\.yoursite\.com/,
  ],
});
```

### 10. Regular Review and Cleanup

- Review ignored errors periodically
- Update sampling rates based on volume
- Archive resolved issues
- Update release tracking

---

## References

- [Sentry React Documentation](https://docs.sentry.io/platforms/javascript/guides/react/)
- [Sentry React Error Boundary](https://docs.sentry.io/platforms/javascript/guides/react/features/error-boundary/)
- [Sentry Breadcrumbs](https://docs.sentry.io/platforms/javascript/guides/react/enriching-events/breadcrumbs/)
- [Sentry Context](https://docs.sentry.io/platforms/javascript/guides/react/enriching-events/context/)
- [Sentry Performance](https://docs.sentry.io/platforms/javascript/guides/react/performance/)
- [Sentry Web Vitals](https://docs.sentry.io/product/insights/frontend/web-vitals/)
- [Sentry Source Maps](https://docs.sentry.io/platforms/javascript/guides/react/sourcemaps/)
- [Sentry Releases](https://docs.sentry.io/product/releases/)
- [Sentry Sampling](https://docs.sentry.io/platforms/javascript/guides/react/configuration/sampling/)
- [Sentry Sensitive Data](https://docs.sentry.io/platforms/javascript/guides/react/data-management/sensitive-data/)
- [Sentry Redux Integration](https://docs.sentry.io/platforms/javascript/guides/react/features/redux/)
- [Sentry React Router Integration](https://docs.sentry.io/platforms/javascript/guides/react/features/react-router/)
- [@sentry/react on npm](https://www.npmjs.com/package/@sentry/react)
