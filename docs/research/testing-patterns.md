# Frontend Testing Patterns

A comprehensive guide to testing frontend applications effectively. Covers what to test, how to test, and common patterns and anti-patterns.

---

## Table of Contents

1. [Testing Philosophy: Implementation vs Behavior](#testing-philosophy-implementation-vs-behavior)
2. [The Frontend Test Pyramid](#the-frontend-test-pyramid)
3. [What to Test (and What NOT to Test)](#what-to-test-and-what-not-to-test)
4. [Unit Testing Patterns](#unit-testing-patterns)
5. [Component Testing Strategies](#component-testing-strategies)
6. [Integration Testing Patterns](#integration-testing-patterns)
7. [Testing Async Operations](#testing-async-operations)
8. [Snapshot Testing: Pros and Cons](#snapshot-testing-pros-and-cons)
9. [Test Data Management](#test-data-management)
10. [Test Organization and Naming](#test-organization-and-naming)
11. [Common Anti-Patterns](#common-anti-patterns)
12. [Coverage Strategies](#coverage-strategies)
13. [Tools and Ecosystem](#tools-and-ecosystem)

---

## Testing Philosophy: Implementation vs Behavior

The fundamental principle of frontend testing:

> "The more your tests resemble the way your software is used, the more confidence they can give you." - Kent C. Dodds

### Behavior Testing (Recommended)

Test what the user experiences, not how the code works internally.

**Benefits:**
- Tests are resilient to refactoring
- Tests serve as documentation of expected behavior
- Lower maintenance burden
- More confidence that the application works for users

```javascript
// GOOD: Testing behavior
test('submits the form when user clicks submit', async () => {
  render(<ContactForm />);

  await userEvent.type(screen.getByLabelText(/name/i), 'John Doe');
  await userEvent.type(screen.getByLabelText(/email/i), 'john@example.com');
  await userEvent.click(screen.getByRole('button', { name: /submit/i }));

  expect(screen.getByText(/thank you/i)).toBeInTheDocument();
});
```

### Implementation Testing (Avoid)

Testing internal state, private methods, or how code achieves results.

**Problems:**
- Tests break during refactoring even when behavior is unchanged
- Creates "false positives" - tests pass even when code is broken
- Dramatically increases maintenance burden
- Tests don't reflect actual user experience

```javascript
// BAD: Testing implementation
test('sets isSubmitting state to true', () => {
  const { result } = renderHook(() => useContactForm());

  act(() => {
    result.current.handleSubmit();
  });

  // Testing internal state - fragile and not user-focused
  expect(result.current.isSubmitting).toBe(true);
});
```

### Key Principle

> "If your code/API delivers the right results, should you really invest your next 3 hours in testing HOW it worked internally?" - Yoni Goldberg

---

## The Frontend Test Pyramid

### Traditional Pyramid

```
        /\
       /  \        E2E Tests (10%)
      /----\       - Few, slow, expensive
     /      \      - Critical user journeys
    /--------\     Integration Tests (20%)
   /          \    - Component interactions
  /------------\   Unit Tests (70%)
 /              \  - Fast, isolated, cheap
/________________\
```

**Recommended Distribution:**
- **70% Unit tests**: Fast feedback, catch logic errors early
- **20% Integration tests**: Verify component interactions
- **10% E2E tests**: Critical user paths only

### Modern Alternatives

#### The Testing Trophy (Kent C. Dodds)

```
       ___
      /   \      E2E (small)
     /     \
    |-------|    Integration (largest)
    |       |
    |-------|    Unit (medium)
    |_______|    Static (TypeScript/ESLint)
```

Emphasizes integration tests as the "sweet spot" - more confidence per test than unit tests, without the cost of E2E.

#### The Testing Honeycomb (Spotify)

For microservices architectures, emphasizes integration testing between services. Services are treated as units, with contract testing ensuring APIs work correctly.

### Choosing Your Strategy

| Application Type | Recommended Focus |
|-----------------|-------------------|
| SaaS Dashboard | Heavy integration tests, visual regression for charts |
| Marketing Site | Fewer unit tests, more visual regression and E2E |
| Auth Flows | Test auth states with deterministic mocks |
| Component Library | Unit tests + visual regression |

---

## What to Test (and What NOT to Test)

### What TO Test

#### 1. User Interactions
```javascript
test('opens modal when clicking the edit button', async () => {
  render(<UserProfile />);

  await userEvent.click(screen.getByRole('button', { name: /edit/i }));

  expect(screen.getByRole('dialog')).toBeInTheDocument();
});
```

#### 2. Component Rendering with Different Props
```javascript
test('displays error message when error prop is provided', () => {
  render(<Input error="Invalid email format" />);

  expect(screen.getByText(/invalid email format/i)).toBeInTheDocument();
});
```

#### 3. Edge Cases and Error States
```javascript
test('shows empty state when no items exist', () => {
  render(<ItemList items={[]} />);

  expect(screen.getByText(/no items found/i)).toBeInTheDocument();
});

test('handles API error gracefully', async () => {
  server.use(
    http.get('/api/users', () => {
      return HttpResponse.json({ error: 'Server error' }, { status: 500 });
    })
  );

  render(<UserList />);

  expect(await screen.findByText(/something went wrong/i)).toBeInTheDocument();
});
```

#### 4. Accessibility
```javascript
test('form inputs are properly labeled', () => {
  render(<ContactForm />);

  expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/message/i)).toBeInTheDocument();
});
```

#### 5. Critical User Workflows
```javascript
test('user can complete checkout flow', async () => {
  render(<CheckoutFlow />);

  await userEvent.click(screen.getByRole('button', { name: /proceed/i }));
  await userEvent.type(screen.getByLabelText(/card number/i), '4242424242424242');
  await userEvent.click(screen.getByRole('button', { name: /pay/i }));

  expect(await screen.findByText(/order confirmed/i)).toBeInTheDocument();
});
```

### What NOT to Test

#### 1. Implementation Details
```javascript
// DON'T: Test internal state
expect(component.state.isOpen).toBe(true);

// DON'T: Test private methods
expect(component.instance().calculateTotal()).toBe(100);

// DON'T: Test props passing
expect(childComponent.props.onClick).toBeDefined();
```

#### 2. Third-Party Library Behavior
```javascript
// DON'T: Test that React renders correctly
// DON'T: Test that Redux dispatches actions
// DON'T: Test that React Query caches data
```

#### 3. CSS Styles (Usually)
```javascript
// DON'T: Test specific CSS values
expect(element).toHaveStyle({ color: '#ff0000' });

// DO: Test visual behavior through accessibility or visual regression
expect(element).toHaveAttribute('aria-hidden', 'true');
```

#### 4. Trivial Code
```javascript
// DON'T: Test getters/setters
// DON'T: Test simple pass-through functions
// DON'T: Test framework-provided functionality
```

### Decision Framework

Ask yourself:
1. **Does this test verify behavior a user cares about?**
2. **Will this test break only when something actually goes wrong?**
3. **Does this test give me confidence to ship?**

If "no" to any of these, reconsider the test.

---

## Unit Testing Patterns

### The AAA Pattern (Arrange-Act-Assert)

```javascript
test('formats currency correctly', () => {
  // Arrange
  const amount = 1234.56;
  const currency = 'USD';

  // Act
  const result = formatCurrency(amount, currency);

  // Assert
  expect(result).toBe('$1,234.56');
});
```

Also known as **Given-When-Then**:
```javascript
describe('formatCurrency', () => {
  it('should format USD amounts with dollar sign and commas', () => {
    // Given
    const amount = 1234.56;

    // When
    const result = formatCurrency(amount, 'USD');

    // Then
    expect(result).toBe('$1,234.56');
  });
});
```

### Testing Utility Functions

```javascript
// utils/validation.ts
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// utils/validation.test.ts
describe('isValidEmail', () => {
  it('returns true for valid email addresses', () => {
    expect(isValidEmail('user@example.com')).toBe(true);
    expect(isValidEmail('user.name@domain.co.uk')).toBe(true);
  });

  it('returns false for invalid email addresses', () => {
    expect(isValidEmail('invalid')).toBe(false);
    expect(isValidEmail('missing@domain')).toBe(false);
    expect(isValidEmail('@nodomain.com')).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(isValidEmail('')).toBe(false);
  });
});
```

### Testing Custom Hooks

```javascript
// hooks/useCounter.ts
export function useCounter(initialValue = 0) {
  const [count, setCount] = useState(initialValue);

  const increment = () => setCount(c => c + 1);
  const decrement = () => setCount(c => c - 1);
  const reset = () => setCount(initialValue);

  return { count, increment, decrement, reset };
}

// hooks/useCounter.test.ts
import { renderHook, act } from '@testing-library/react';
import { useCounter } from './useCounter';

describe('useCounter', () => {
  it('initializes with the provided value', () => {
    const { result } = renderHook(() => useCounter(10));
    expect(result.current.count).toBe(10);
  });

  it('increments the count', () => {
    const { result } = renderHook(() => useCounter(0));

    act(() => {
      result.current.increment();
    });

    expect(result.current.count).toBe(1);
  });

  it('resets to initial value', () => {
    const { result } = renderHook(() => useCounter(5));

    act(() => {
      result.current.increment();
      result.current.increment();
      result.current.reset();
    });

    expect(result.current.count).toBe(5);
  });
});
```

### Testing Data Fetching Hooks

```javascript
// hooks/useUser.test.ts
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useUser } from './useUser';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return ({ children }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('useUser', () => {
  it('returns user data on success', async () => {
    server.use(
      http.get('/api/user/:id', () => {
        return HttpResponse.json({ id: '1', name: 'John' });
      })
    );

    const { result } = renderHook(() => useUser('1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual({ id: '1', name: 'John' });
  });

  it('handles error state', async () => {
    server.use(
      http.get('/api/user/:id', () => {
        return HttpResponse.json({ error: 'Not found' }, { status: 404 });
      })
    );

    const { result } = renderHook(() => useUser('999'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });
});
```

### Best Practices for Unit Tests

1. **Keep tests small** - No longer than 7 statements
2. **One action per test** - Test one thing at a time
3. **Use `it()` for readability** - Forms sentences like "it should calculate total"
4. **Avoid loops and conditionals** - Tests should be deterministic
5. **Don't mock internal functions** - Couples tests to implementation

---

## Component Testing Strategies

### Query Priority (React Testing Library)

Use queries in this order of priority:

```javascript
// 1. Accessible to everyone (BEST)
screen.getByRole('button', { name: /submit/i });
screen.getByLabelText(/email/i);
screen.getByPlaceholderText(/search/i);
screen.getByText(/welcome/i);

// 2. Semantic queries
screen.getByAltText(/profile picture/i);
screen.getByTitle(/close/i);

// 3. Test IDs (escape hatch)
screen.getByTestId('custom-element');
```

### Using `screen` (Always)

```javascript
// DON'T: Destructure from render
const { getByRole } = render(<Button />);
const button = getByRole('button');

// DO: Use screen
render(<Button />);
const button = screen.getByRole('button');
```

**Benefits of `screen`:**
- No need to update destructuring when adding queries
- Consistent API across tests
- Better autocomplete

### User Event over fireEvent

```javascript
// DON'T: Use fireEvent for user interactions
fireEvent.change(input, { target: { value: 'hello' } });
fireEvent.click(button);

// DO: Use userEvent
await userEvent.type(input, 'hello');
await userEvent.click(button);
```

**Why userEvent?**
- Simulates realistic browser events
- Fires events in correct order (focus, keydown, input, etc.)
- Handles edge cases like typing in disabled inputs

### Testing Form Components

```javascript
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

test('submits form with user input', async () => {
  const handleSubmit = vi.fn();
  render(<LoginForm onSubmit={handleSubmit} />);

  // Fill out the form
  await userEvent.type(screen.getByLabelText(/username/i), 'johndoe');
  await userEvent.type(screen.getByLabelText(/password/i), 'secret123');

  // Submit
  await userEvent.click(screen.getByRole('button', { name: /sign in/i }));

  // Assert
  expect(handleSubmit).toHaveBeenCalledWith({
    username: 'johndoe',
    password: 'secret123',
  });
});
```

### Testing Component States

```javascript
describe('Button', () => {
  it('renders in default state', () => {
    render(<Button>Click me</Button>);

    const button = screen.getByRole('button');
    expect(button).toBeEnabled();
    expect(button).toHaveTextContent('Click me');
  });

  it('renders in disabled state', () => {
    render(<Button disabled>Click me</Button>);

    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('renders in loading state', () => {
    render(<Button loading>Click me</Button>);

    expect(screen.getByRole('button')).toBeDisabled();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });
});
```

### Testing with Context Providers

```javascript
// test-utils.tsx
const AllTheProviders = ({ children }) => {
  return (
    <ThemeProvider theme="light">
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          {children}
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
};

const customRender = (ui, options) =>
  render(ui, { wrapper: AllTheProviders, ...options });

export * from '@testing-library/react';
export { customRender as render };

// Component.test.tsx
import { render, screen } from './test-utils';

test('renders with providers', () => {
  render(<MyComponent />);
  // All providers are automatically included
});
```

---

## Integration Testing Patterns

### What is Integration Testing?

Integration tests verify that multiple units work together correctly. In frontend, this typically means:
- Components interacting with each other
- Components working with state management
- Components making API calls
- Page-level functionality

### Component Integration Tests

```javascript
test('cart updates when adding item from product page', async () => {
  render(
    <CartProvider>
      <Header />
      <ProductPage productId="123" />
    </CartProvider>
  );

  // Initially cart is empty
  expect(screen.getByTestId('cart-count')).toHaveTextContent('0');

  // Add item to cart
  await userEvent.click(screen.getByRole('button', { name: /add to cart/i }));

  // Cart updates
  expect(screen.getByTestId('cart-count')).toHaveTextContent('1');
});
```

### API Integration with MSW

Mock Service Worker (MSW) intercepts network requests at the service worker level:

```javascript
// mocks/handlers.ts
import { http, HttpResponse } from 'msw';

export const handlers = [
  http.get('/api/products', () => {
    return HttpResponse.json([
      { id: '1', name: 'Widget', price: 9.99 },
      { id: '2', name: 'Gadget', price: 19.99 },
    ]);
  }),

  http.post('/api/cart', async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({ success: true, itemId: body.productId });
  }),
];

// mocks/server.ts
import { setupServer } from 'msw/node';
import { handlers } from './handlers';

export const server = setupServer(...handlers);

// setupTests.ts
beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// ProductList.test.tsx
test('displays products from API', async () => {
  render(<ProductList />);

  expect(await screen.findByText('Widget')).toBeInTheDocument();
  expect(screen.getByText('Gadget')).toBeInTheDocument();
});

test('handles API error', async () => {
  server.use(
    http.get('/api/products', () => {
      return HttpResponse.json({ error: 'Server error' }, { status: 500 });
    })
  );

  render(<ProductList />);

  expect(await screen.findByText(/error loading products/i)).toBeInTheDocument();
});
```

### Benefits of MSW

1. **Framework agnostic** - Works with any HTTP client
2. **Reusable mocks** - Same handlers for unit, integration, and E2E tests
3. **Production-like** - Your code runs exactly as in production
4. **Network-level** - No patching of fetch/axios
5. **DevTools compatible** - Inspect requests in browser

### Testing Page Flows

```javascript
test('user registration flow', async () => {
  render(<App />);

  // Navigate to registration
  await userEvent.click(screen.getByRole('link', { name: /register/i }));

  // Fill form
  await userEvent.type(screen.getByLabelText(/email/i), 'new@user.com');
  await userEvent.type(screen.getByLabelText(/password/i), 'secure123');
  await userEvent.type(screen.getByLabelText(/confirm password/i), 'secure123');

  // Submit
  await userEvent.click(screen.getByRole('button', { name: /create account/i }));

  // Verify redirect to dashboard
  expect(await screen.findByText(/welcome/i)).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: /dashboard/i })).toBeInTheDocument();
});
```

---

## Testing Async Operations

### Using `findBy` Queries

`findBy` = `getBy` + `waitFor`. Use when element will appear asynchronously.

```javascript
test('loads data asynchronously', async () => {
  render(<UserProfile userId="1" />);

  // Element appears after API call completes
  expect(await screen.findByText('John Doe')).toBeInTheDocument();
});
```

### Using `waitFor`

Use when waiting for assertions that don't involve finding elements:

```javascript
test('calls API on submit', async () => {
  const mockFetch = vi.spyOn(global, 'fetch');
  render(<ContactForm />);

  await userEvent.type(screen.getByLabelText(/message/i), 'Hello');
  await userEvent.click(screen.getByRole('button', { name: /send/i }));

  await waitFor(() => {
    expect(mockFetch).toHaveBeenCalledWith('/api/contact', expect.any(Object));
  });
});
```

### Using `waitForElementToBeRemoved`

```javascript
test('hides loading spinner after data loads', async () => {
  render(<DataTable />);

  // Spinner appears
  expect(screen.getByRole('progressbar')).toBeInTheDocument();

  // Wait for it to disappear
  await waitForElementToBeRemoved(() => screen.queryByRole('progressbar'));

  // Data is now visible
  expect(screen.getByRole('table')).toBeInTheDocument();
});
```

### Common Async Mistakes

#### DON'T: Empty waitFor callbacks
```javascript
// BAD: Waits for event loop tick, not for actual condition
await waitFor(() => {});
expect(mockFn).toHaveBeenCalled();

// GOOD: Wait for specific assertion
await waitFor(() => expect(mockFn).toHaveBeenCalled());
```

#### DON'T: Side effects in waitFor
```javascript
// BAD: fireEvent may run multiple times
await waitFor(() => {
  fireEvent.click(button);
  expect(screen.getByText('clicked')).toBeInTheDocument();
});

// GOOD: Side effects outside waitFor
fireEvent.click(button);
await waitFor(() => {
  expect(screen.getByText('clicked')).toBeInTheDocument();
});
```

#### DON'T: Use waitFor when findBy works
```javascript
// BAD: Verbose
const button = await waitFor(() =>
  screen.getByRole('button', { name: /submit/i })
);

// GOOD: Simpler with better errors
const button = await screen.findByRole('button', { name: /submit/i });
```

### React Query Testing Gotchas

React Query defaults to 3 retries with exponential backoff. Disable in tests:

```javascript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});
```

---

## Snapshot Testing: Pros and Cons

### What is Snapshot Testing?

Snapshot tests capture the rendered output and compare it against a stored "golden" version.

```javascript
test('renders correctly', () => {
  const { container } = render(<Button>Click me</Button>);
  expect(container).toMatchSnapshot();
});
```

### Pros

1. **Quick to create** - Just one line of code
2. **Catches unexpected changes** - Any output change is flagged
3. **Reduces boilerplate** - Eliminates repetitive assertions
4. **Documentation value** - Shows expected output
5. **Easy to update** - Single command updates all snapshots

### Cons

1. **Fragile** - Minor changes cause failures
2. **Snapshot blindness** - Developers blindly approve changes
3. **Lacks context** - Doesn't explain *why* output should be this way
4. **Not TDD-compatible** - Can't write snapshot before code
5. **Large snapshots** - Become impossible to review
6. **False confidence** - Passing doesn't mean correct

### When to Use Snapshots

Good use cases:
- CSS-in-JS style testing
- Small, focused component output
- Serialized data structures
- Configuration objects

Bad use cases:
- Large component trees
- Primary testing strategy
- Dynamic content
- Frequently changing components

### Best Practices

1. **Keep snapshots small and focused**
```javascript
// BAD: Entire page
expect(container).toMatchSnapshot();

// GOOD: Specific element
expect(screen.getByRole('alert')).toMatchSnapshot();
```

2. **Use inline snapshots for small outputs**
```javascript
expect(formatCurrency(1234.56)).toMatchInlineSnapshot(`"$1,234.56"`);
```

3. **Use snapshot-diff for comparisons**
```javascript
const before = render(<Button disabled />);
const after = render(<Button />);

expect(snapshotDiff(before, after)).toMatchSnapshot();
```

4. **Add ESLint rule for snapshot size**
```javascript
// .eslintrc
{
  "plugins": ["jest"],
  "rules": {
    "jest/no-large-snapshots": ["warn", { "maxSize": 50 }]
  }
}
```

---

## Test Data Management

### Factory Functions

```javascript
// factories/user.ts
import { faker } from '@faker-js/faker';

export function createUser(overrides = {}) {
  return {
    id: faker.string.uuid(),
    name: faker.person.fullName(),
    email: faker.internet.email(),
    avatar: faker.image.avatar(),
    createdAt: faker.date.past(),
    ...overrides,
  };
}

// Usage in tests
test('displays user info', () => {
  const user = createUser({ name: 'John Doe' });
  render(<UserCard user={user} />);

  expect(screen.getByText('John Doe')).toBeInTheDocument();
});
```

### Builder Pattern

For more complex objects with optional configurations:

```javascript
// factories/UserBuilder.ts
class UserBuilder {
  private user: User;

  constructor() {
    this.user = createUser();
  }

  withName(name: string) {
    this.user.name = name;
    return this;
  }

  asAdmin() {
    this.user.role = 'admin';
    this.user.permissions = ['read', 'write', 'delete'];
    return this;
  }

  withPosts(count: number) {
    this.user.posts = Array.from({ length: count }, () => createPost());
    return this;
  }

  build() {
    return this.user;
  }
}

// Usage
const adminUser = new UserBuilder()
  .withName('Admin User')
  .asAdmin()
  .withPosts(5)
  .build();
```

### Mock Factory Pattern (TypeScript)

```typescript
// factories/mockFactory.ts
type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export function createMockFactory<T>(defaults: T) {
  return (overrides: DeepPartial<T> = {}): T => {
    return { ...defaults, ...overrides } as T;
  };
}

// Usage
const createProduct = createMockFactory<Product>({
  id: '1',
  name: 'Default Product',
  price: 9.99,
  category: 'general',
});

const expensiveProduct = createProduct({ price: 999.99 });
```

### Benefits of Factories

1. **Immutable** - Each test gets a fresh copy
2. **Self-documenting** - Default values show expected shape
3. **Reusable** - Same factory across all tests
4. **Flexible** - Override only what matters for the test

### Avoid: The Mystery Guest

Don't hide test data in separate files without explicit references:

```javascript
// BAD: What's in testUser? Why does this test pass?
import { testUser } from './fixtures';

test('validates admin', () => {
  expect(isAdmin(testUser)).toBe(true);
});

// GOOD: Data is explicit
test('validates admin', () => {
  const admin = createUser({ role: 'admin' });
  expect(isAdmin(admin)).toBe(true);
});
```

---

## Test Organization and Naming

### File Structure

Two common approaches:

**Co-located tests** (Recommended for component tests):
```
src/
  components/
    Button/
      Button.tsx
      Button.test.tsx
      Button.styles.ts
    Form/
      Form.tsx
      Form.test.tsx
```

**Separate test directory** (Good for integration/E2E):
```
src/
  components/
tests/
  unit/
  integration/
  e2e/
  fixtures/
```

### Naming Conventions

**Files:**
- Use `.test.ts` or `.spec.ts` suffix
- Match source file name: `Button.tsx` -> `Button.test.tsx`
- Use kebab-case for consistency: `user-profile.test.ts`

**Test blocks:**
```javascript
// describe: noun (unit under test)
// it: sentence describing expected behavior

describe('UserProfile', () => {
  describe('when user is logged in', () => {
    it('displays the user name', () => {});
    it('shows the logout button', () => {});
  });

  describe('when user is logged out', () => {
    it('shows the login prompt', () => {});
  });
});
```

### Naming Pattern

Use the pattern: **"[unit] [expected behavior] when [scenario]"**

```javascript
describe('formatCurrency', () => {
  it('returns formatted string when given valid number', () => {});
  it('returns empty string when given null', () => {});
  it('throws error when given invalid currency code', () => {});
});
```

### Grouping Related Tests

```javascript
describe('ShoppingCart', () => {
  // Setup shared across all tests
  let cart;

  beforeEach(() => {
    cart = new ShoppingCart();
  });

  describe('addItem', () => {
    it('increases item count', () => {});
    it('updates total price', () => {});
  });

  describe('removeItem', () => {
    it('decreases item count', () => {});
    it('removes item when quantity reaches zero', () => {});
  });

  describe('checkout', () => {
    it('clears cart after successful checkout', () => {});
    it('throws error when cart is empty', () => {});
  });
});
```

---

## Common Anti-Patterns

### 1. Testing Implementation Details

```javascript
// ANTI-PATTERN
test('sets isLoading state to true', () => {
  const { result } = renderHook(() => useFetch('/api/data'));
  expect(result.current.isLoading).toBe(true);
});

// BETTER: Test user-visible behavior
test('shows loading spinner while fetching', () => {
  render(<DataList />);
  expect(screen.getByRole('progressbar')).toBeInTheDocument();
});
```

### 2. Over-Mocking

```javascript
// ANTI-PATTERN: Mock everything
jest.mock('./utils');
jest.mock('./api');
jest.mock('./hooks');
jest.mock('react-redux');

// BETTER: Mock only external boundaries
// Let real code run, mock only network/time
```

### 3. Using Wrong Query Types

```javascript
// ANTI-PATTERN: Using queryBy for assertions
expect(screen.queryByRole('button')).toBeInTheDocument();

// CORRECT: Use getBy for existence assertions
expect(screen.getByRole('button')).toBeInTheDocument();

// queryBy is for non-existence:
expect(screen.queryByRole('alert')).not.toBeInTheDocument();
```

### 4. Not Waiting for Async Operations

```javascript
// ANTI-PATTERN: Test completes before async operation
test('fetches data', () => {
  render(<AsyncComponent />);
  expect(screen.getByText('data')).toBeInTheDocument(); // Fails!
});

// CORRECT: Wait for async content
test('fetches data', async () => {
  render(<AsyncComponent />);
  expect(await screen.findByText('data')).toBeInTheDocument();
});
```

### 5. Testing Third-Party Libraries

```javascript
// ANTI-PATTERN: Testing that Redux works
test('dispatches action', () => {
  const store = configureStore();
  store.dispatch(increment());
  expect(store.getState().counter).toBe(1);
});

// BETTER: Test your component's behavior
test('increments counter when button clicked', async () => {
  render(<Counter />, { wrapper: StoreProvider });
  await userEvent.click(screen.getByRole('button', { name: /increment/i }));
  expect(screen.getByText('1')).toBeInTheDocument();
});
```

### 6. Sleeping in Tests

```javascript
// ANTI-PATTERN: Arbitrary delays
await new Promise(r => setTimeout(r, 1000));
expect(element).toBeVisible();

// CORRECT: Wait for specific condition
await waitFor(() => expect(element).toBeVisible());
// Or use findBy
const element = await screen.findByRole('alert');
```

### 7. Snapshot Overuse

```javascript
// ANTI-PATTERN: Snapshot everything
test('renders', () => {
  const { container } = render(<EntireApp />);
  expect(container).toMatchSnapshot(); // 5000 lines
});

// BETTER: Targeted assertions
test('renders header with user name', () => {
  render(<Header user={{ name: 'John' }} />);
  expect(screen.getByRole('heading')).toHaveTextContent('John');
});
```

### 8. Shared Mutable State

```javascript
// ANTI-PATTERN: Tests affect each other
let counter = 0;

test('increments counter', () => {
  counter++;
  expect(counter).toBe(1);
});

test('checks counter', () => {
  expect(counter).toBe(0); // Fails! counter is 1
});

// CORRECT: Reset state between tests
beforeEach(() => {
  counter = 0;
});
```

### 9. Brittle Selectors

```javascript
// ANTI-PATTERN: Coupled to DOM structure
const button = container.querySelector('.btn.btn-primary.submit-btn');

// BETTER: Query by role/accessibility
const button = screen.getByRole('button', { name: /submit/i });
```

### 10. Too Many Assertions in One Test

```javascript
// ANTI-PATTERN: Testing multiple behaviors
test('form works', async () => {
  render(<Form />);
  expect(screen.getByRole('form')).toBeInTheDocument();
  await userEvent.type(input, 'test');
  expect(input).toHaveValue('test');
  await userEvent.click(submitBtn);
  expect(mockSubmit).toHaveBeenCalled();
  expect(successMessage).toBeVisible();
});

// BETTER: Separate tests for separate behaviors
test('renders form', () => {});
test('accepts input', () => {});
test('submits form', () => {});
test('shows success message', () => {});
```

---

## Coverage Strategies

### Coverage Metrics

| Metric | Description |
|--------|-------------|
| **Line Coverage** | % of code lines executed |
| **Statement Coverage** | % of statements executed |
| **Branch Coverage** | % of conditional branches taken |
| **Function Coverage** | % of functions called |

### The Coverage Trap

> "You could be hitting a bunch of lines with zero meaningful assertions. Or worse, missing critical paths entirely while your report still looks green."

High coverage doesn't mean:
- Code is bug-free
- All edge cases are tested
- Tests make meaningful assertions

### Meaningful Coverage Strategy

1. **Focus on critical paths first**
```javascript
// Prioritize: authentication, payments, core business logic
// Deprioritize: styling, animations, trivial getters
```

2. **Branch coverage over line coverage**
```javascript
function processPayment(amount, user) {
  if (!user.isVerified) {
    throw new Error('User not verified');
  }
  if (amount <= 0) {
    throw new Error('Invalid amount');
  }
  return chargeUser(user, amount);
}

// Line coverage: 80% with just one test
// Branch coverage: 33% - need to test all paths
```

3. **Consider mutation testing**
```javascript
// Stryker mutates your code and checks if tests catch it
// If mutant survives, your tests missed something
```

### Coverage Tools

**Jest built-in:**
```bash
jest --coverage
```

**Istanbul/nyc:**
```bash
nyc npm test
```

**Vitest:**
```bash
vitest --coverage
```

**SonarQube integration:**
- Aggregates coverage from multiple tools
- Tracks coverage over time
- Enforces quality gates

### Recommended Targets

| Context | Suggested Coverage |
|---------|-------------------|
| Critical business logic | 90%+ |
| UI components | 70-80% |
| Utility functions | 90%+ |
| Overall application | 70-80% |

> "Code coverage in tests is always a controversial topic. The answer is 'it depends'. How tolerant are you to the risk of a bug in the front end?"

### Coverage in CI/CD

```yaml
# Example GitHub Action
- name: Run tests with coverage
  run: npm test -- --coverage

- name: Check coverage threshold
  run: |
    if [ $(jq '.total.lines.pct' coverage/coverage-summary.json) -lt 80 ]; then
      echo "Coverage below 80%"
      exit 1
    fi
```

---

## Tools and Ecosystem

### Test Runners

| Tool | Best For |
|------|----------|
| **Vitest** | Fast, Vite-native, modern |
| **Jest** | React, comprehensive, mature |
| **Bun test** | Bun projects, speed |

### Testing Libraries

| Library | Purpose |
|---------|---------|
| **React Testing Library** | Component testing |
| **@testing-library/user-event** | User interaction simulation |
| **MSW (Mock Service Worker)** | API mocking |

### Assertion Libraries

| Library | Purpose |
|---------|---------|
| **@testing-library/jest-dom** | DOM-specific matchers |
| **Chai** | BDD-style assertions |

### E2E Testing

| Tool | Strengths |
|------|-----------|
| **Playwright** | Cross-browser, modern, fast |
| **Cypress** | Developer experience, debugging |

### Code Quality

| Tool | Purpose |
|------|---------|
| **eslint-plugin-testing-library** | RTL best practices |
| **eslint-plugin-jest** | Jest best practices |
| **eslint-plugin-jest-dom** | jest-dom matchers |

### Visual Regression

| Tool | Approach |
|------|----------|
| **Storybook + Chromatic** | Component-level visual testing |
| **Percy** | Full-page visual snapshots |
| **Playwright visual comparisons** | Built-in screenshot comparison |

---

## Quick Reference

### Query Priority
1. `getByRole` - accessible queries
2. `getByLabelText` - form fields
3. `getByPlaceholderText` - inputs
4. `getByText` - non-interactive elements
5. `getByTestId` - escape hatch

### Async Patterns
- `findBy*` - element appears asynchronously
- `waitFor` - wait for assertion
- `waitForElementToBeRemoved` - element disappears

### Test Structure
```javascript
describe('Component', () => {
  beforeEach(() => {
    // Setup
  });

  it('should [behavior] when [condition]', () => {
    // Arrange
    // Act
    // Assert
  });
});
```

### Key Principles
1. Test behavior, not implementation
2. Query like users (by role, label, text)
3. Use userEvent over fireEvent
4. Keep tests isolated
5. Prefer integration tests for confidence
6. Mock at boundaries (network, time)
7. Maintain readable, focused tests

---

## Sources

- [Producement - Frontend testing focused on behavior](https://producement.com/development/frontend-testing-focused-on-behavior-rather-than-implementation/)
- [Kent C. Dodds - Static vs Unit vs Integration vs E2E Tests](https://kentcdodds.com/blog/static-vs-unit-vs-integration-vs-e2e-tests)
- [Kent C. Dodds - Common mistakes with React Testing Library](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
- [Meticulous - Testing Pyramid for Frontend](https://www.meticulous.ai/blog/testing-pyramid-for-frontend)
- [GitHub - JavaScript Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)
- [Testing Library - Async Methods](https://testing-library.com/docs/dom-testing-library/api-async/)
- [Jest - Snapshot Testing](https://jestjs.io/docs/snapshot-testing)
- [TSH.io - Pros and cons of Jest snapshot tests](https://tsh.io/blog/pros-and-cons-of-jest-snapshot-tests/)
- [Mock Service Worker Documentation](https://mswjs.io/docs/)
- [TanStack Query - Testing](https://tanstack.com/query/v4/docs/react/guides/testing)
- [Storybook - Frontend test coverage](https://storybook.js.org/blog/frontend-test-coverage-with-storybook-9/)
- [Chromatic - Frontend Testing Guide](https://www.chromatic.com/frontend-testing-guide)
- [Netguru - Frontend Testing Guide for 2025](https://www.netguru.com/blog/front-end-testing)
- [DEV Community - React Component Testing Best Practices](https://dev.to/tahamjp/react-component-testing-best-practices-for-2025-2674)
