# Vitest Research Documentation

> **Version**: Vitest 2.x / 3.x (2024-2025)
> **Last Updated**: December 2024

Vitest is a next-generation testing framework powered by Vite. It provides a Jest-compatible API with native TypeScript support, ESM-first design, and leverages Vite's blazing fast HMR for instant test feedback.

---

## Table of Contents

1. [Setup and Configuration](#1-setup-and-configuration)
2. [Test API](#2-test-api)
3. [Mocking](#3-mocking)
4. [Coverage](#4-coverage)
5. [Async Testing](#5-async-testing)
6. [Snapshot Testing](#6-snapshot-testing)
7. [Watch Mode and UI](#7-watch-mode-and-ui)
8. [Monorepo and Workspace](#8-monorepo-and-workspace)
9. [Integration with React Testing Library](#9-integration-with-react-testing-library)

---

## 1. Setup and Configuration

### Installation

```bash
# npm
npm install -D vitest

# pnpm
pnpm add -D vitest

# bun
bun add -D vitest
```

### Basic Configuration (`vitest.config.ts`)

Create a `vitest.config.ts` file in your project root. This file takes priority over `vite.config.ts`:

```typescript
import { defineConfig, configDefaults } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,                           // Use describe/it/expect without imports
    environment: 'jsdom',                    // DOM environment for component testing
    css: true,                               // Enable CSS processing
    setupFiles: './vitest.setup.ts',         // Setup file for test configuration
    exclude: [...configDefaults.exclude, '**/e2e/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html']
    }
  }
})
```

### Using with Existing Vite Config

If you already have a `vite.config.ts`, you can add the test configuration directly:

```typescript
/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
  },
})
```

### Merging Configs

Use `mergeConfig` to extend an existing Vite config:

```typescript
import { defineConfig, mergeConfig } from 'vitest/config'
import viteConfig from './vite.config'

export default mergeConfig(viteConfig, defineConfig({
  test: {
    exclude: ['packages/template/*'],
  },
}))
```

### Environment Matching

Assign environments based on file patterns:

```typescript
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environmentMatchGlobs: [
      ['tests/dom/**', 'jsdom'],
      ['**/*.edge.test.ts', 'edge-runtime'],
    ]
  }
})
```

### TypeScript Configuration

For `globals: true`, add types to `tsconfig.json`:

```json
{
  "compilerOptions": {
    "types": ["vitest/globals"]
  }
}
```

**Sources:**
- [Configuring Vitest](https://vitest.dev/config/)
- [Getting Started Guide](https://vitest.dev/guide/)

---

## 2. Test API

### Core Functions

```typescript
import { describe, it, test, expect, beforeEach, afterEach, beforeAll, afterAll } from 'vitest'
```

With `globals: true`, these are available without imports.

### Test Structure

```typescript
describe('Calculator', () => {
  let calculator: Calculator

  beforeAll(() => {
    // Runs once before all tests in this describe block
  })

  beforeEach(() => {
    // Runs before each test
    calculator = new Calculator()
  })

  afterEach(() => {
    // Runs after each test
  })

  afterAll(() => {
    // Runs once after all tests in this describe block
  })

  it('should add two numbers', () => {
    expect(calculator.add(2, 3)).toBe(5)
  })

  test('should subtract two numbers', () => {
    expect(calculator.subtract(5, 3)).toBe(2)
  })
})
```

### Common Matchers

```typescript
// Equality
expect(value).toBe(expected)           // Strict equality (===)
expect(value).toEqual(expected)        // Deep equality
expect(value).toStrictEqual(expected)  // Deep equality + undefined properties

// Truthiness
expect(value).toBeTruthy()
expect(value).toBeFalsy()
expect(value).toBeNull()
expect(value).toBeUndefined()
expect(value).toBeDefined()

// Numbers
expect(value).toBeGreaterThan(3)
expect(value).toBeLessThanOrEqual(10)
expect(value).toBeCloseTo(0.3, 5)      // For floating point

// Strings
expect(string).toMatch(/pattern/)
expect(string).toContain('substring')

// Arrays/Iterables
expect(array).toContain(item)
expect(array).toHaveLength(3)

// Objects
expect(obj).toHaveProperty('key')
expect(obj).toHaveProperty('nested.key', value)

// Exceptions
expect(() => fn()).toThrow()
expect(() => fn()).toThrow('error message')
expect(() => fn()).toThrow(ErrorClass)

// Async
await expect(promise).resolves.toBe(value)
await expect(promise).rejects.toThrow()
```

### Test Modifiers

```typescript
// Skip tests
it.skip('skipped test', () => {})
describe.skip('skipped suite', () => {})

// Run only specific tests
it.only('only this test runs', () => {})
describe.only('only this suite runs', () => {})

// Mark as todo
it.todo('implement later')

// Concurrent tests
it.concurrent('runs in parallel', async () => {})
describe.concurrent('parallel suite', () => {})

// Repeat tests
it.each([
  [1, 1, 2],
  [2, 3, 5],
])('add(%i, %i) = %i', (a, b, expected) => {
  expect(add(a, b)).toBe(expected)
})
```

### Lifecycle Hooks with Cleanup

```typescript
beforeEach(() => {
  const server = setupServer()

  // Return cleanup function (runs as afterEach)
  return () => {
    server.close()
  }
})
```

**Sources:**
- [Test API Reference](https://vitest.dev/api/)
- [Test Context Guide](https://vitest.dev/guide/test-context)

---

## 3. Mocking

### Creating Mock Functions with `vi.fn()`

```typescript
import { vi, expect, it } from 'vitest'

// Basic mock function
const mockFn = vi.fn()

// Mock with implementation
const mockAdd = vi.fn((a, b) => a + b)

// Mock with return value
const mockFn = vi.fn().mockReturnValue(42)

// Mock with resolved value (async)
const mockAsync = vi.fn().mockResolvedValue({ data: 'test' })

// Mock with rejected value
const mockError = vi.fn().mockRejectedValue(new Error('Failed'))

// Sequential return values
const mockSequence = vi.fn()
  .mockReturnValueOnce('first')
  .mockReturnValueOnce('second')
  .mockReturnValue('default')
```

### Mock Function Assertions

```typescript
expect(mockFn).toHaveBeenCalled()
expect(mockFn).toHaveBeenCalledTimes(2)
expect(mockFn).toHaveBeenCalledWith('arg1', 'arg2')
expect(mockFn).toHaveBeenLastCalledWith('lastArg')
expect(mockFn).toHaveBeenNthCalledWith(1, 'firstCallArg')

// Access call information
mockFn.mock.calls           // Array of all call arguments
mockFn.mock.results          // Array of all return values
mockFn.mock.lastCall         // Arguments of last call
```

### Spying with `vi.spyOn()`

```typescript
import { vi } from 'vitest'

const cart = {
  getTotal: () => 100
}

// Spy on existing method
const spy = vi.spyOn(cart, 'getTotal')

// Spy and mock implementation
vi.spyOn(cart, 'getTotal').mockReturnValue(200)

// Spy on async method
vi.spyOn(api, 'fetchData').mockResolvedValue({ items: [] })

// Restore original implementation
spy.mockRestore()
```

### Module Mocking with `vi.mock()`

```typescript
import { vi } from 'vitest'
import { fetchUser } from './api'

// Mock entire module (hoisted to top of file)
vi.mock('./api', () => ({
  fetchUser: vi.fn().mockResolvedValue({ id: 1, name: 'Test' })
}))

// Partial mock - keep some original implementations
vi.mock('./utils', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    formatDate: vi.fn().mockReturnValue('2024-01-01')
  }
})

// Mock with factory function
vi.mock('./config', () => ({
  default: { apiUrl: 'http://test.com' }
}))
```

### Inline Module Mocking

```typescript
// Mock only for specific test
vi.doMock('./module', () => ({
  getValue: () => 'mocked'
}))

// Unmock
vi.doUnmock('./module')
```

### Mocking Globals

```typescript
// Mock global fetch
vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
  json: () => Promise.resolve({ data: 'test' })
}))

// Mock Date
vi.setSystemTime(new Date('2024-01-01'))

// Mock console
vi.spyOn(console, 'log').mockImplementation(() => {})
```

### Resetting Mocks

```typescript
import { vi, beforeEach, afterEach } from 'vitest'

beforeEach(() => {
  vi.clearAllMocks()    // Clear call history
})

afterEach(() => {
  vi.restoreAllMocks()  // Restore original implementations
  vi.resetAllMocks()    // Reset to empty functions
})
```

### Mock Comparison Table

| Method | Use Case | Hoisted | Tracks Calls |
|--------|----------|---------|--------------|
| `vi.fn()` | Create standalone mock function | No | Yes |
| `vi.spyOn()` | Spy on existing object method | No | Yes |
| `vi.mock()` | Mock entire module | Yes | Yes |
| `vi.doMock()` | Inline mock (not hoisted) | No | Yes |

**Sources:**
- [Mocking Guide](https://vitest.dev/guide/mocking)
- [Mock API Reference](https://vitest.dev/api/mock)
- [Vi API Reference](https://vitest.dev/api/vi.html)

---

## 4. Coverage

### Installation

```bash
# V8 coverage (default, faster)
npm install -D @vitest/coverage-v8

# Istanbul coverage (more accurate for source-mapped code)
npm install -D @vitest/coverage-istanbul
```

### Configuration

```typescript
import { defineConfig, coverageConfigDefaults } from 'vitest/config'

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',  // or 'istanbul'

      // Enable coverage
      enabled: true,

      // Reporter types
      reporter: ['text', 'json', 'html', 'lcov'],

      // Output directory
      reportsDirectory: './coverage',

      // Files to include
      include: ['src/**/*.{ts,tsx}'],

      // Files to exclude
      exclude: [
        ...coverageConfigDefaults.exclude,
        '**/types/**',
        '**/*.d.ts',
      ],

      // Coverage thresholds
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },
  },
})
```

### Threshold Configuration

```typescript
coverage: {
  thresholds: {
    // Minimum percentage required
    lines: 80,           // 80% line coverage required
    functions: 90,       // 90% function coverage required
    branches: 70,        // 70% branch coverage required
    statements: 80,      // 80% statement coverage required

    // Maximum uncovered items allowed (negative values)
    lines: -10,          // Max 10 uncovered lines allowed

    // Per-file thresholds
    'src/utils/**.ts': {
      lines: 100,
      functions: 100,
    },
    '**/critical.ts': {
      statements: 100,
    },

    // Fail if below thresholds
    100: true,           // 100% coverage required for matched files
  }
}
```

### Running Coverage

```bash
# Generate coverage report
vitest run --coverage

# Watch mode with coverage
vitest --coverage
```

### V8 vs Istanbul

| Feature | V8 | Istanbul |
|---------|-----|----------|
| Speed | ~10% overhead | ~300% overhead |
| Accuracy | Block-level | Line-level |
| Source Maps | May have issues | Better support |
| Browser Support | V8 engines only | Universal |

**Note**: Since Vitest 3.2, V8 uses AST-based remapping for identical results to Istanbul.

**Sources:**
- [Coverage Guide](https://vitest.dev/guide/coverage)
- [Coverage Config](https://vitest.dev/config/coverage)

---

## 5. Async Testing

### Testing Promises

```typescript
import { it, expect } from 'vitest'

// Using async/await
it('fetches user data', async () => {
  const user = await fetchUser(1)
  expect(user.name).toBe('John')
})

// Using resolves/rejects
it('resolves with user', async () => {
  await expect(fetchUser(1)).resolves.toEqual({ id: 1, name: 'John' })
})

it('rejects with error', async () => {
  await expect(fetchUser(-1)).rejects.toThrow('User not found')
})
```

### Fake Timers

```typescript
import { vi, it, expect, beforeEach, afterEach } from 'vitest'

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()  // Always restore real timers
})

it('executes callback after delay', () => {
  const callback = vi.fn()

  setTimeout(callback, 1000)

  expect(callback).not.toHaveBeenCalled()

  vi.advanceTimersByTime(1000)

  expect(callback).toHaveBeenCalledTimes(1)
})
```

### Async Timer Methods

```typescript
// Run all timers (including async)
await vi.runAllTimersAsync()

// Advance time (including async timers)
await vi.advanceTimersByTimeAsync(5000)

// Advance to next timer
await vi.advanceTimersToNextTimerAsync()

// Run only pending timers
await vi.runOnlyPendingTimersAsync()
```

### Mocking System Time

```typescript
import { vi, it, expect, beforeEach, afterEach } from 'vitest'

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2024-06-15T10:00:00Z'))
})

afterEach(() => {
  vi.useRealTimers()
})

it('uses mocked date', () => {
  expect(new Date().toISOString()).toBe('2024-06-15T10:00:00.000Z')
  expect(Date.now()).toBe(1718445600000)
})
```

### Handling Microtasks with Timers

When testing debounced/async code, flush microtasks before advancing timers:

```typescript
it('handles debounced async operation', async () => {
  const callback = vi.fn()

  debouncedFetch(callback)

  // Flush microtasks first
  await Promise.resolve()

  // Then advance timers
  await vi.advanceTimersByTimeAsync(300)

  expect(callback).toHaveBeenCalled()
})
```

### Waiting for Conditions

```typescript
import { vi } from 'vitest'

// Wait for callback to succeed
await vi.waitFor(() => {
  expect(element).toBeVisible()
}, { timeout: 5000 })

// Wait until condition is true
await vi.waitUntil(() => {
  return document.querySelector('.loaded') !== null
}, { timeout: 3000 })
```

**Sources:**
- [Vi API Reference](https://vitest.dev/api/vi)
- [Mocking Guide](https://vitest.dev/guide/mocking)

---

## 6. Snapshot Testing

### Basic Snapshots

```typescript
import { it, expect } from 'vitest'

it('matches snapshot', () => {
  const user = { id: 1, name: 'John', createdAt: new Date() }
  expect(user).toMatchSnapshot()
})

// First run: creates __snapshots__/file.test.ts.snap
// Subsequent runs: compares against stored snapshot
```

### Inline Snapshots

```typescript
it('matches inline snapshot', () => {
  const result = formatUser({ id: 1, name: 'John' })

  // Vitest will auto-populate the snapshot
  expect(result).toMatchInlineSnapshot(`
    {
      "id": 1,
      "name": "John",
    }
  `)
})
```

### File Snapshots

```typescript
it('matches file snapshot', async () => {
  const html = renderComponent()

  // Save to specific file with custom extension
  await expect(html).toMatchFileSnapshot('./snapshots/component.html')
})
```

### Snapshot with Custom Serializer

```typescript
import { expect } from 'vitest'

// Add custom serializer
expect.addSnapshotSerializer({
  serialize(val, config, indentation, depth, refs, printer) {
    return `User: ${val.name}`
  },
  test(val) {
    return val && typeof val.name === 'string'
  }
})
```

### Updating Snapshots

```bash
# Update all snapshots
vitest run --update

# In watch mode, press 'u' to update failed snapshots
```

### Best Practices

1. **Keep snapshots small and focused** - Large snapshots are hard to review
2. **Use inline snapshots for small outputs** - Easier to review in PRs
3. **Combine with explicit assertions** - Snapshots complement, don't replace assertions
4. **Review snapshot changes carefully** - They should be intentional

```typescript
it('renders user card correctly', () => {
  const { container } = render(<UserCard user={mockUser} />)

  // Explicit assertion for critical behavior
  expect(screen.getByText('John')).toBeInTheDocument()

  // Snapshot for overall structure
  expect(container).toMatchSnapshot()
})
```

**Sources:**
- [Snapshot Guide](https://vitest.dev/guide/snapshot)

---

## 7. Watch Mode and UI

### Watch Mode (Default)

Vitest runs in watch mode by default:

```bash
vitest        # Starts in watch mode
vitest watch  # Explicit watch mode
vitest run    # Single run (no watch)
```

### Watch Mode Commands

While in watch mode, press:

| Key | Action |
|-----|--------|
| `a` | Rerun all tests |
| `f` | Rerun only failed tests |
| `u` | Update snapshots |
| `p` | Filter by filename |
| `t` | Filter by test name pattern |
| `q` | Quit |
| `h` | Show help |

### Test Filtering

```bash
# Filter by filename
vitest user              # Runs tests in files containing "user"

# Filter by test name
vitest -t "should add"   # Runs tests matching pattern

# Run specific file
vitest src/utils.test.ts

# Run by line number (Vitest 3+)
vitest src/utils.test.ts:42

# Run against changed files
vitest --changed         # Uncommitted changes
vitest --changed HEAD~1  # Since last commit
```

### UI Mode

Visual test management interface:

```bash
# Start UI mode
vitest --ui

# Install UI package if needed
npm install -D @vitest/ui
```

Features:
- Visual test hierarchy
- Real-time execution status
- Inline console output and errors
- Click to run specific tests
- Filter by file, pattern, or status
- Test duration display

### Configuration for Watch

```typescript
export default defineConfig({
  test: {
    watch: true,
    watchExclude: ['**/node_modules/**', '**/dist/**'],

    // Only re-run related tests
    isolate: true,

    // Fail fast
    bail: 1,  // Stop after first failure
  }
})
```

**Sources:**
- [CLI Reference](https://vitest.dev/guide/cli)
- [UI Guide](https://vitest.dev/guide/ui)
- [Test Filtering](https://vitest.dev/guide/filtering)

---

## 8. Monorepo and Workspace

### Vitest 3.2+ (Projects Configuration)

The `workspace` feature is deprecated in favor of `projects`:

```typescript
// vitest.config.ts (root)
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    projects: ['packages/*'],
  },
})
```

### Per-Project Configuration

Each package can have its own config:

```typescript
// packages/ui/vitest.config.ts
import { defineConfig, mergeConfig } from 'vitest/config'
import sharedConfig from '../../vitest.shared'

export default mergeConfig(sharedConfig, defineConfig({
  test: {
    environment: 'jsdom',
  },
}))
```

### Shared Configuration Pattern

Create a shared config file (not the root config to avoid circular references):

```typescript
// vitest.shared.ts (root)
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    restoreMocks: true,
    globals: true,
    include: ['**/*.test.ts'],
  },
})
```

```typescript
// packages/api/vitest.config.ts
import { defineConfig, mergeConfig } from 'vitest/config'
import sharedConfig from '../../vitest.shared'

export default mergeConfig(sharedConfig, defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
}))
```

### Vitest 2.x (Legacy Workspace)

```typescript
// vitest.workspace.ts (deprecated in 3.2+)
import { defineWorkspace } from 'vitest/config'

export default defineWorkspace([
  'packages/*',
  {
    test: {
      name: 'unit',
      include: ['**/*.unit.test.ts'],
    },
  },
])
```

### Turborepo Integration

```json
// turbo.json
{
  "pipeline": {
    "test": {
      "dependsOn": ["^build"],
      "outputs": ["coverage/**"]
    }
  }
}
```

```json
// package.json (per package)
{
  "scripts": {
    "test": "vitest run"
  }
}
```

**Sources:**
- [Test Projects Guide](https://vitest.dev/guide/projects)
- [Turborepo + Vitest](https://turborepo.com/docs/guides/tools/vitest)
- [Vitest 3.2 Release](https://vitest.dev/blog/vitest-3-2.html)

---

## 9. Integration with React Testing Library

### Installation

```bash
npm install -D @testing-library/react @testing-library/jest-dom jsdom
# or with happy-dom (faster)
npm install -D @testing-library/react @testing-library/jest-dom happy-dom
```

### Configuration

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',  // or 'happy-dom'
    setupFiles: './vitest.setup.ts',
    css: true,
  },
})
```

### Setup File

```typescript
// vitest.setup.ts
import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// Cleanup after each test
afterEach(() => {
  cleanup()
})
```

### Testing Components

```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { UserProfile } from './UserProfile'

describe('UserProfile', () => {
  it('renders user name', () => {
    render(<UserProfile user={{ name: 'John' }} />)

    expect(screen.getByText('John')).toBeInTheDocument()
  })

  it('calls onUpdate when button clicked', async () => {
    const onUpdate = vi.fn()
    render(<UserProfile user={{ name: 'John' }} onUpdate={onUpdate} />)

    fireEvent.click(screen.getByRole('button', { name: /update/i }))

    expect(onUpdate).toHaveBeenCalledTimes(1)
  })

  it('shows loading state', async () => {
    render(<UserProfile userId={1} />)

    expect(screen.getByText(/loading/i)).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByText('John')).toBeInTheDocument()
    })
  })
})
```

### jsdom vs happy-dom

| Feature | jsdom | happy-dom |
|---------|-------|-----------|
| Speed | Slower | Faster |
| Memory | Higher | Lower |
| Web API Coverage | More complete | Most common APIs |
| Accuracy | More realistic | Sufficient for most tests |
| Newer APIs | Sometimes lagging | Often faster to implement |

**Recommendation**: Start with `happy-dom` for speed, switch to `jsdom` if you encounter compatibility issues.

### Per-File Environment Override

```typescript
// @vitest-environment jsdom
import { render } from '@testing-library/react'

// This test file uses jsdom regardless of global config
```

### Testing Hooks

```typescript
import { renderHook, waitFor } from '@testing-library/react'
import { useCounter } from './useCounter'

it('increments counter', () => {
  const { result } = renderHook(() => useCounter())

  expect(result.current.count).toBe(0)

  act(() => {
    result.current.increment()
  })

  expect(result.current.count).toBe(1)
})
```

### Mocking API Calls in Components

```typescript
import { vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import * as api from './api'
import { UserList } from './UserList'

vi.mock('./api')

it('displays fetched users', async () => {
  vi.mocked(api.fetchUsers).mockResolvedValue([
    { id: 1, name: 'John' },
    { id: 2, name: 'Jane' },
  ])

  render(<UserList />)

  await waitFor(() => {
    expect(screen.getByText('John')).toBeInTheDocument()
    expect(screen.getByText('Jane')).toBeInTheDocument()
  })
})
```

**Sources:**
- [Test Environment Guide](https://vitest.dev/guide/environment)
- [React Testing Library Setup](https://testing-library.com/docs/react-testing-library/setup/)

---

## Quick Reference

### Common CLI Commands

```bash
vitest                    # Watch mode
vitest run                # Single run
vitest run --coverage     # With coverage
vitest --ui               # UI mode
vitest --update           # Update snapshots
vitest --reporter=verbose # Verbose output
vitest --bail 1           # Stop on first failure
```

### Config Template

```typescript
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['**/*.{test,spec}.{ts,tsx}'],
    exclude: ['**/node_modules/**', '**/dist/**'],
    setupFiles: ['./vitest.setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      thresholds: { lines: 80 },
    },
    testTimeout: 10000,
    hookTimeout: 10000,
  },
})
```

### TypeScript Types

```typescript
import type { Mock, MockInstance, SpyInstance } from 'vitest'

const mockFn: Mock<[string], number> = vi.fn()
const spy: SpyInstance<[string], number> = vi.spyOn(obj, 'method')
```
