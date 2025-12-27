# React Testing Library - Comprehensive Guide

> Last updated: December 2024

React Testing Library (RTL) is the de facto standard for testing React components. This guide covers philosophy, queries, user events, async utilities, rendering, debugging, and best practices.

## Table of Contents

1. [Philosophy](#philosophy)
2. [Queries](#queries)
3. [User Events](#user-events)
4. [Async Utilities](#async-utilities)
5. [Rendering](#rendering)
6. [Custom Render](#custom-render)
7. [Debugging](#debugging)
8. [Best Practices](#best-practices)
9. [Common Patterns](#common-patterns)

---

## Philosophy

### Core Principle

> "The more your tests resemble the way your software is used, the more confidence they can give you."

React Testing Library encourages testing **behavior, not implementation details**. This approach:

- Makes tests more resilient to refactoring
- Gives confidence that the application works from a user's perspective
- Results in more maintainable tests over time

### Two Users of Your Components

React components have two users:

1. **End users** - See and interact with rendered output
2. **Developers** - Pass props and integrate the component

Your tests should interact with components the same way these users do - through props and rendered output.

### Avoid Implementation Details

Tests that rely on implementation details break when you refactor, even if functionality remains the same. A good test should only fail when:

1. Functionality is intentionally changed
2. Functionality is accidentally broken (regression)

**Bad - Testing implementation:**
```tsx
// Don't do this - testing internal state
expect(component.state.isOpen).toBe(true);
expect(wrapper.find('.dropdown-container')).toHaveLength(1);
```

**Good - Testing behavior:**
```tsx
// Do this - testing what users see
await user.click(screen.getByRole('button', { name: /open menu/i }));
expect(screen.getByRole('menu')).toBeVisible();
```

---

## Queries

### Query Types

RTL provides three types of queries, each with a specific use case:

| Query Type | No Match | Match Found | Use Case |
|------------|----------|-------------|----------|
| `getBy*` | Throws error | Returns element | Default for elements expected to exist |
| `queryBy*` | Returns `null` | Returns element | Asserting element does NOT exist |
| `findBy*` | Rejects promise | Resolves element | Async elements (after API calls, state updates) |

Each type has an "All" variant (`getAllBy*`, `queryAllBy*`, `findAllBy*`) for multiple elements.

### Query Priority

RTL recommends this priority order, based on accessibility and user-centric testing:

#### 1. Accessible to Everyone (Highest Priority)

```tsx
// Best - getByRole (accessible name)
screen.getByRole('button', { name: /submit/i })
screen.getByRole('textbox', { name: /email/i })
screen.getByRole('checkbox', { name: /agree to terms/i })
screen.getByRole('heading', { level: 2 })

// getByLabelText - form fields
screen.getByLabelText(/password/i)

// getByPlaceholderText - when no label exists
screen.getByPlaceholderText('Enter your email')

// getByText - non-interactive elements
screen.getByText(/welcome to our app/i)

// getByDisplayValue - current form values
screen.getByDisplayValue('john@example.com')
```

#### 2. Semantic Queries

```tsx
// getByAltText - images
screen.getByAltText('Company Logo')

// getByTitle - elements with title attribute
screen.getByTitle('Close')
```

#### 3. Test IDs (Last Resort)

```tsx
// Only when other queries aren't possible
screen.getByTestId('custom-chart-component')
```

### `getByRole` Options

The `getByRole` query is the most powerful and accepts several filtering options:

```tsx
// Filter by accessible name
screen.getByRole('button', { name: /submit/i })

// Filter by selected state
screen.getByRole('option', { selected: true })

// Filter by checked state
screen.getByRole('checkbox', { checked: false })

// Filter by pressed state (toggle buttons)
screen.getByRole('button', { pressed: true })

// Filter by expanded state
screen.getByRole('button', { expanded: true })

// Filter heading level
screen.getByRole('heading', { level: 1 })

// Filter by busy state
screen.getByRole('region', { busy: true })

// Include hidden elements (improves performance)
screen.getByRole('button', { hidden: true })
```

### Common Roles Reference

| HTML Element | Implicit Role |
|--------------|---------------|
| `<button>` | `button` |
| `<a href>` | `link` |
| `<input type="text">` | `textbox` |
| `<input type="checkbox">` | `checkbox` |
| `<input type="radio">` | `radio` |
| `<select>` | `combobox` (or `listbox`) |
| `<textarea>` | `textbox` |
| `<h1>` - `<h6>` | `heading` |
| `<ul>`, `<ol>` | `list` |
| `<li>` | `listitem` |
| `<nav>` | `navigation` |
| `<main>` | `main` |
| `<article>` | `article` |
| `<dialog>` | `dialog` |
| `<img>` | `img` |
| `<table>` | `table` |
| `<tr>` | `row` |
| `<td>` | `cell` |

---

## User Events

### Setup (v14+)

`@testing-library/user-event` v14 requires explicit setup and async/await:

```tsx
import userEvent from '@testing-library/user-event'
import { render, screen } from '@testing-library/react'

// Recommended: Create a setup function
function setup(jsx: React.ReactElement) {
  return {
    user: userEvent.setup(),
    ...render(jsx),
  }
}

test('user interaction example', async () => {
  const { user } = setup(<MyComponent />)

  await user.click(screen.getByRole('button'))
})
```

### Click Events

```tsx
// Single click
await user.click(screen.getByRole('button', { name: /submit/i }))

// Double click
await user.dblClick(screen.getByRole('button'))

// Right click
await user.pointer({ keys: '[MouseRight]', target: element })

// Click with modifiers
await user.click(element, { shiftKey: true })
```

### Typing

```tsx
// Type into an input (includes focus/click)
await user.type(screen.getByRole('textbox'), 'Hello World')

// Clear and type
await user.clear(screen.getByRole('textbox'))
await user.type(screen.getByRole('textbox'), 'New value')

// Type with special keys
await user.type(input, 'Hello{Enter}')
await user.type(input, '{Backspace}{Delete}')
```

### Keyboard

```tsx
// Simulate keyboard events directly
await user.keyboard('{Escape}')
await user.keyboard('{Enter}')
await user.keyboard('{Tab}')
await user.keyboard('Hello World')  // Types text

// Modifier keys
await user.keyboard('{Control>}a{/Control}')  // Ctrl+A (select all)
await user.keyboard('{Shift>}abc{/Shift}')    // ABC (uppercase)
```

### Select Options

```tsx
// Select single option
await user.selectOptions(
  screen.getByRole('combobox'),
  screen.getByRole('option', { name: 'Option 1' })
)

// Select multiple options
await user.selectOptions(select, ['option1', 'option2'])

// Deselect option
await user.deselectOptions(select, 'option1')
```

### Other Interactions

```tsx
// Hover
await user.hover(element)
await user.unhover(element)

// Focus
await user.tab()  // Move focus to next element
await user.tab({ shift: true })  // Move focus backwards

// Upload file
const file = new File(['content'], 'file.txt', { type: 'text/plain' })
await user.upload(screen.getByLabelText(/upload/i), file)

// Clipboard
await user.copy()
await user.paste()
await user.cut()
```

### user-event vs fireEvent

Always prefer `user-event` over `fireEvent`:

```tsx
// Bad - fireEvent doesn't simulate full interaction
fireEvent.change(input, { target: { value: 'hello' } })

// Good - user-event simulates real user behavior
await user.type(input, 'hello')
// Triggers: focus, keyDown, keyPress, keyUp, input, change for EACH character
```

---

## Async Utilities

### findBy Queries

`findBy*` queries return a Promise that resolves when the element appears (combines `getBy*` + `waitFor`):

```tsx
// Wait for element to appear (default timeout: 1000ms)
const button = await screen.findByRole('button', { name: /submit/i })

// With custom timeout
const element = await screen.findByText('Loaded!', {}, { timeout: 3000 })
```

### waitFor

Use `waitFor` when you need to wait for any assertion to pass:

```tsx
import { waitFor } from '@testing-library/react'

// Wait for assertion to pass
await waitFor(() => {
  expect(screen.getByText('Success')).toBeInTheDocument()
})

// With options
await waitFor(
  () => expect(mockFn).toHaveBeenCalled(),
  {
    timeout: 3000,      // Max wait time (default: 1000ms)
    interval: 100,      // Check interval (default: 50ms)
  }
)
```

**Important:** Always make an assertion inside `waitFor`:

```tsx
// Bad - empty callback
await waitFor(() => {})

// Good - specific assertion
await waitFor(() => {
  expect(screen.getByRole('alert')).toHaveTextContent('Error!')
})
```

### waitForElementToBeRemoved

Wait for an element to disappear:

```tsx
import { waitForElementToBeRemoved } from '@testing-library/react'

// Wait for loading spinner to disappear
await waitForElementToBeRemoved(() => screen.queryByText('Loading...'))

// Or with existing element reference
const loading = screen.getByText('Loading...')
await waitForElementToBeRemoved(loading)
```

### act()

RTL's `render()`, `fireEvent`, and `user-event` already wrap updates in `act()`. You rarely need it directly:

```tsx
// Usually NOT needed - RTL handles this
import { act } from '@testing-library/react'

// Only use when testing with raw React utilities
await act(async () => {
  // Trigger state update outside RTL
  jest.advanceTimersByTime(1000)
})
```

**Prefer RTL async utilities over act:**

```tsx
// Instead of wrapping in act(), use findBy or waitFor
const element = await screen.findByText('Loaded')
// OR
await waitFor(() => expect(screen.getByText('Loaded')).toBeInTheDocument())
```

---

## Rendering

### Basic Render

```tsx
import { render, screen } from '@testing-library/react'

test('renders component', () => {
  render(<MyComponent prop="value" />)

  expect(screen.getByText('Hello')).toBeInTheDocument()
})
```

### Render Return Values

```tsx
const {
  container,      // The containing DOM node
  baseElement,    // The document.body (or custom base)
  debug,          // Shortcut for screen.debug()
  rerender,       // Re-render with new props
  unmount,        // Unmount the component
  asFragment,     // Returns DocumentFragment for snapshot testing
} = render(<MyComponent />)
```

### Rerender with New Props

```tsx
test('updates when props change', () => {
  const { rerender } = render(<Counter count={0} />)
  expect(screen.getByText('Count: 0')).toBeInTheDocument()

  rerender(<Counter count={5} />)
  expect(screen.getByText('Count: 5')).toBeInTheDocument()
})
```

### Cleanup

RTL automatically cleans up after each test if you're using a testing framework that supports `afterEach` hooks (Jest, Vitest). If not:

```tsx
import { cleanup, render } from '@testing-library/react'

afterEach(cleanup)
```

---

## Custom Render

### Basic Custom Render

Create a custom render function that wraps components with providers:

```tsx
// test-utils.tsx
import { render, RenderOptions } from '@testing-library/react'
import { ThemeProvider } from './theme'
import { AuthProvider } from './auth'
import { QueryClientProvider, QueryClient } from '@tanstack/react-query'

const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </AuthProvider>
    </QueryClientProvider>
  )
}

const customRender = (
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllTheProviders, ...options })

// Re-export everything
export * from '@testing-library/react'
export { customRender as render }
```

### Custom Render with Options

```tsx
// test-utils.tsx
import { render, RenderOptions } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  initialUser?: User
  initialRoute?: string
}

const customRender = (
  ui: React.ReactElement,
  options: CustomRenderOptions = {}
) => {
  const { initialUser, initialRoute = '/', ...renderOptions } = options

  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <MemoryRouter initialEntries={[initialRoute]}>
      <AuthContext.Provider value={{ user: initialUser }}>
        {children}
      </AuthContext.Provider>
    </MemoryRouter>
  )

  return {
    user: userEvent.setup(),
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
  }
}

export { customRender as render }
```

### Using Custom Render

```tsx
// In tests, import from test-utils instead of @testing-library/react
import { render, screen } from './test-utils'

test('authenticated user sees dashboard', async () => {
  const { user } = render(<Dashboard />, {
    initialUser: { name: 'John', role: 'admin' },
    initialRoute: '/dashboard',
  })

  expect(screen.getByText('Welcome, John')).toBeInTheDocument()
})
```

---

## Debugging

### screen.debug()

Print the current DOM to the console:

```tsx
import { screen } from '@testing-library/react'

test('debugging example', () => {
  render(<MyComponent />)

  // Debug entire document
  screen.debug()

  // Debug specific element
  screen.debug(screen.getByRole('button'))

  // Debug multiple elements
  screen.debug(screen.getAllByRole('listitem'))

  // Increase output length (default is 7000 characters)
  screen.debug(undefined, Infinity)
})
```

### prettyDOM()

Get formatted DOM string without logging:

```tsx
import { prettyDOM, render } from '@testing-library/react'

test('prettyDOM example', () => {
  const { container } = render(<MyComponent />)

  // Get formatted string
  const html = prettyDOM(container)
  console.log(html)

  // With max length
  prettyDOM(container, 10000)

  // With formatting options
  prettyDOM(container, undefined, { highlight: false })
})
```

### logRoles()

Print all ARIA roles in the document - helpful for finding the right query:

```tsx
import { logRoles, render } from '@testing-library/react'

test('discovering roles', () => {
  const { container } = render(<MyComponent />)

  logRoles(container)
  // Output:
  // button:
  //   <button>Submit</button>
  // textbox:
  //   <input type="text" />
  // heading:
  //   <h1>Title</h1>
})
```

### logTestingPlaygroundURL()

Generate a URL to explore the DOM in Testing Playground:

```tsx
test('playground URL', () => {
  render(<MyComponent />)

  // Logs a URL you can open in browser
  screen.logTestingPlaygroundURL()
})
```

### ESLint Rule

Avoid committing debug statements:

```json
{
  "rules": {
    "testing-library/no-debugging-utils": "error"
  }
}
```

---

## Best Practices

### What to Test

1. **User flows** - Can users complete their tasks?
2. **Conditional rendering** - Are the right elements shown/hidden?
3. **Form validation** - Are errors displayed correctly?
4. **Data display** - Is fetched data rendered properly?
5. **Accessibility** - Can all users interact with the component?

### What NOT to Test

1. **Implementation details** - Internal state, private methods
2. **Third-party libraries** - They have their own tests
3. **Styling** - Unless critical for functionality
4. **React internals** - Component lifecycle methods

### Test Structure (AAA Pattern)

```tsx
test('user can submit the form', async () => {
  // Arrange
  const onSubmit = jest.fn()
  const { user } = setup(<ContactForm onSubmit={onSubmit} />)

  // Act
  await user.type(screen.getByLabelText(/email/i), 'test@example.com')
  await user.type(screen.getByLabelText(/message/i), 'Hello!')
  await user.click(screen.getByRole('button', { name: /submit/i }))

  // Assert
  expect(onSubmit).toHaveBeenCalledWith({
    email: 'test@example.com',
    message: 'Hello!',
  })
})
```

### Query Best Practices

```tsx
// Prefer regex for flexible matching
screen.getByRole('button', { name: /submit/i })  // Case-insensitive

// Use exact: false for partial matches
screen.getByText('Welcome', { exact: false })  // Matches "Welcome to our app"

// Query by role over test ID
screen.getByRole('button')  // Good
screen.getByTestId('submit-btn')  // Avoid when possible

// Use queryBy only for asserting absence
expect(screen.queryByText('Error')).not.toBeInTheDocument()
```

### Async Best Practices

```tsx
// Use findBy for elements that appear async
const message = await screen.findByText('Success!')

// Use waitFor for non-element assertions
await waitFor(() => {
  expect(mockFunction).toHaveBeenCalled()
})

// Don't use waitFor when findBy works
// Bad
await waitFor(() => screen.getByText('Loaded'))
// Good
await screen.findByText('Loaded')
```

---

## Common Patterns

### Testing Forms

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

function setup(jsx: React.ReactElement) {
  return {
    user: userEvent.setup(),
    ...render(jsx),
  }
}

test('form validation and submission', async () => {
  const handleSubmit = jest.fn()
  const { user } = setup(<LoginForm onSubmit={handleSubmit} />)

  // Test validation
  await user.click(screen.getByRole('button', { name: /login/i }))
  expect(screen.getByText(/email is required/i)).toBeInTheDocument()

  // Fill form
  await user.type(screen.getByLabelText(/email/i), 'user@example.com')
  await user.type(screen.getByLabelText(/password/i), 'password123')

  // Submit
  await user.click(screen.getByRole('button', { name: /login/i }))

  expect(handleSubmit).toHaveBeenCalledWith({
    email: 'user@example.com',
    password: 'password123',
  })
})
```

### Testing Async Data (with MSW)

```tsx
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { render, screen } from '@testing-library/react'

// Setup mock server
const server = setupServer(
  http.get('/api/users', () => {
    return HttpResponse.json([
      { id: 1, name: 'John' },
      { id: 2, name: 'Jane' },
    ])
  })
)

beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

test('loads and displays users', async () => {
  render(<UserList />)

  // Initially shows loading
  expect(screen.getByText(/loading/i)).toBeInTheDocument()

  // Wait for data
  expect(await screen.findByText('John')).toBeInTheDocument()
  expect(screen.getByText('Jane')).toBeInTheDocument()
  expect(screen.queryByText(/loading/i)).not.toBeInTheDocument()
})

test('handles error state', async () => {
  // Override handler for this test
  server.use(
    http.get('/api/users', () => {
      return HttpResponse.json({ error: 'Server error' }, { status: 500 })
    })
  )

  render(<UserList />)

  expect(await screen.findByText(/error/i)).toBeInTheDocument()
})
```

### Testing Modals

```tsx
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

test('opens and closes modal', async () => {
  const user = userEvent.setup()
  render(<App />)

  // Open modal
  await user.click(screen.getByRole('button', { name: /open modal/i }))

  // Find modal and query within it
  const modal = screen.getByRole('dialog')
  expect(modal).toBeInTheDocument()
  expect(within(modal).getByText('Modal Title')).toBeInTheDocument()

  // Close modal
  await user.click(within(modal).getByRole('button', { name: /close/i }))

  // Verify modal is removed
  await waitForElementToBeRemoved(() => screen.queryByRole('dialog'))
})

test('modal closes on escape key', async () => {
  const user = userEvent.setup()
  render(<App />)

  await user.click(screen.getByRole('button', { name: /open modal/i }))
  expect(screen.getByRole('dialog')).toBeInTheDocument()

  await user.keyboard('{Escape}')

  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
})
```

### Testing with React Router

```tsx
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import userEvent from '@testing-library/user-event'

// Custom render with router
const renderWithRouter = (
  ui: React.ReactElement,
  { initialEntries = ['/'] } = {}
) => {
  return {
    user: userEvent.setup(),
    ...render(
      <MemoryRouter initialEntries={initialEntries}>
        {ui}
      </MemoryRouter>
    ),
  }
}

test('navigates to about page', async () => {
  const { user } = renderWithRouter(
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/about" element={<About />} />
    </Routes>
  )

  expect(screen.getByText('Home Page')).toBeInTheDocument()

  await user.click(screen.getByRole('link', { name: /about/i }))

  expect(screen.getByText('About Page')).toBeInTheDocument()
})

test('renders correct page for initial route', () => {
  renderWithRouter(
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/about" element={<About />} />
    </Routes>,
    { initialEntries: ['/about'] }
  )

  expect(screen.getByText('About Page')).toBeInTheDocument()
})
```

### Testing Select/Dropdown

```tsx
test('selects an option', async () => {
  const user = userEvent.setup()
  const onChange = jest.fn()

  render(
    <select aria-label="Country" onChange={onChange}>
      <option value="">Select...</option>
      <option value="us">United States</option>
      <option value="uk">United Kingdom</option>
    </select>
  )

  const select = screen.getByRole('combobox', { name: /country/i })

  await user.selectOptions(select, 'us')

  expect(select).toHaveValue('us')
  expect(onChange).toHaveBeenCalled()
})
```

### Testing Checkbox/Radio

```tsx
test('toggles checkbox', async () => {
  const user = userEvent.setup()
  render(<TermsCheckbox />)

  const checkbox = screen.getByRole('checkbox', { name: /agree to terms/i })

  expect(checkbox).not.toBeChecked()

  await user.click(checkbox)
  expect(checkbox).toBeChecked()

  await user.click(checkbox)
  expect(checkbox).not.toBeChecked()
})

test('selects radio option', async () => {
  const user = userEvent.setup()
  render(<PaymentMethod />)

  const creditCard = screen.getByRole('radio', { name: /credit card/i })
  const paypal = screen.getByRole('radio', { name: /paypal/i })

  await user.click(paypal)

  expect(paypal).toBeChecked()
  expect(creditCard).not.toBeChecked()
})
```

---

## Resources

### Official Documentation

- [Testing Library Docs](https://testing-library.com/docs/)
- [React Testing Library API](https://testing-library.com/docs/react-testing-library/api/)
- [Queries Guide](https://testing-library.com/docs/queries/about/)
- [User Event](https://testing-library.com/docs/user-event/intro/)

### Best Practices

- [Guiding Principles](https://testing-library.com/docs/guiding-principles/)
- [Common Mistakes](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
- [Testing Implementation Details](https://kentcdodds.com/blog/testing-implementation-details)

### Tools

- [Mock Service Worker (MSW)](https://mswjs.io/)
- [Testing Playground](https://testing-playground.com/)
- [ESLint Plugin](https://github.com/testing-library/eslint-plugin-testing-library)

---

## Quick Reference

### Query Cheat Sheet

```tsx
// Elements expected to exist
screen.getByRole('button', { name: /submit/i })
screen.getByLabelText(/email/i)
screen.getByText(/welcome/i)

// Elements that may not exist
screen.queryByRole('alert')  // Returns null if not found

// Async elements
await screen.findByRole('button')  // Returns promise, waits up to 1s

// Multiple elements
screen.getAllByRole('listitem')
screen.queryAllByRole('option')
await screen.findAllByRole('row')
```

### Common Matchers

```tsx
// Presence
expect(element).toBeInTheDocument()
expect(element).not.toBeInTheDocument()

// Visibility
expect(element).toBeVisible()
expect(element).not.toBeVisible()

// Content
expect(element).toHaveTextContent('Hello')
expect(element).toHaveValue('input value')
expect(element).toHaveAttribute('disabled')

// State
expect(checkbox).toBeChecked()
expect(input).toBeDisabled()
expect(input).toBeRequired()
expect(input).toBeValid()
expect(input).toHaveFocus()
```
