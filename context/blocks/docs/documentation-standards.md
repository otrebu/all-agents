# Documentation Standards

Patterns for code documentation: JSDoc/TSDoc comments, README structure, changelog maintenance, and inline documentation.

---

## Quick Reference

- Export = Document: Every exported function/class/type needs JSDoc.
- READMEs explain what and why; code shows how.
- Changelog every user-facing change; group by Added/Changed/Fixed.
- Complex logic needs "why" comments; obvious code is self-documenting.
- Keep docs next to code; outdated docs are worse than none.

---

## JSDoc/TSDoc Comments

### What to Document

| Symbol | Required? | Contents |
|--------|-----------|----------|
| Exported function | Yes | Params, return, throws, example |
| Exported class | Yes | Purpose, constructor params, key methods |
| Exported type/interface | Yes | Purpose, field descriptions |
| Public method | Yes | Same as function |
| Private/internal | No | Only if complex |
| Constants | Only if non-obvious | What it represents |

### Rules

- Document all exports—they're your public API
- Include @param for each parameter with type and meaning
- Include @returns describing what's returned
- Include @throws if function can throw
- Include @example for non-trivial usage
- Use @deprecated with migration path

### Example

```typescript
// ❌ Missing documentation on export
export function createClient(options: ClientOptions): ApiClient {
  // ...
}

// ❌ Incomplete: no param descriptions, no example
/**
 * Creates a client.
 */
export function createClient(options: ClientOptions): ApiClient {
  // ...
}

// ✅ Complete JSDoc
/**
 * Creates a configured API client for making authenticated requests.
 *
 * @param options - Configuration options for the client
 * @param options.baseUrl - Base URL for all API requests
 * @param options.timeout - Request timeout in milliseconds (default: 30000)
 * @param options.retries - Number of retry attempts on failure (default: 3)
 * @returns Configured client instance ready for requests
 * @throws {ConfigError} If baseUrl is invalid
 *
 * @example
 * ```typescript
 * const client = createClient({
 *   baseUrl: 'https://api.example.com',
 *   timeout: 5000,
 * });
 * const user = await client.get('/users/1');
 * ```
 */
export function createClient(options: ClientOptions): ApiClient {
  // ...
}
```

---

## Type Documentation

### What to Document

| Type | Document |
|------|----------|
| Interface with many fields | Field purposes, required vs optional |
| Union type | What each variant represents |
| Generic type | Type parameters and constraints |
| Complex type | Simplified explanation, example usage |

### Example

```typescript
// ❌ Complex type with no explanation
export type AsyncHandler<T, E> = (input: T) => Promise<Result<T, E>>;

// ✅ Documented type
/**
 * Handler for async operations with typed error handling.
 *
 * @typeParam T - The input and success result type
 * @typeParam E - The error type (defaults to Error)
 *
 * @example
 * ```typescript
 * const handler: AsyncHandler<User, ValidationError> = async (user) => {
 *   const valid = await validate(user);
 *   return valid ? { ok: true, value: user } : { ok: false, error: new ValidationError() };
 * };
 * ```
 */
export type AsyncHandler<T, E = Error> = (input: T) => Promise<Result<T, E>>;

// ❌ Interface fields unexplained
export interface BuildConfig {
  entry: string;
  output: string;
  minify: boolean;
  sourcemap: boolean | 'inline' | 'external';
}

// ✅ Fields documented
/**
 * Configuration for the build process.
 */
export interface BuildConfig {
  /** Entry point file path (relative to project root) */
  entry: string;

  /** Output directory for built files */
  output: string;

  /** Enable minification for production builds */
  minify: boolean;

  /**
   * Sourcemap generation mode:
   * - true: Generate separate .map files
   * - 'inline': Embed sourcemap in output
   * - 'external': Generate but don't link
   * - false: No sourcemaps
   */
  sourcemap: boolean | 'inline' | 'external';
}
```

---

## README Structure

### Required Sections

| Section | Purpose |
|---------|---------|
| Title + badges | Name, status, version |
| Description | One paragraph: what it does, why use it |
| Installation | How to install |
| Quick Start | Minimal working example |
| Usage | Common use cases with examples |
| API Reference | Link to docs or inline for small APIs |
| Configuration | Options, environment variables |
| Contributing | How to contribute |
| License | License type |

### Rules

- Lead with value: what problem does this solve?
- Show don't tell: working code examples
- Keep examples minimal but complete
- Update on every user-facing change
- Test code examples in CI if possible

### Example Structure

```markdown
# Project Name

Short tagline describing the project.

## Installation

\`\`\`bash
npm install project-name
\`\`\`

## Quick Start

\`\`\`typescript
import { thing } from 'project-name';

const result = thing.do({ option: 'value' });
console.log(result);
\`\`\`

## Usage

### Basic Usage

[Example with explanation]

### Advanced Usage

[More complex example]

## API Reference

### `functionName(options)`

Brief description.

**Parameters:**
- `option1` (string): Description
- `option2` (number, optional): Description. Default: 10

**Returns:** Description of return value

**Example:**
\`\`\`typescript
// Example
\`\`\`

## Configuration

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `timeout` | number | 30000 | Request timeout in ms |

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md)

## License

MIT
```

---

## Changelog Maintenance

### Format: Keep a Changelog

```markdown
# Changelog

## [Unreleased]

### Added
- New feature X for doing Y

### Changed
- Updated Z to support W

### Fixed
- Bug where A caused B

### Deprecated
- Method `oldMethod()` - use `newMethod()` instead

### Removed
- Legacy support for X

### Security
- Fixed vulnerability in Y
```

### Rules

- Every user-facing change gets a changelog entry
- Group by type: Added, Changed, Fixed, Deprecated, Removed, Security
- Write for users, not developers: focus on impact
- Link to issues/PRs where helpful
- Date releases using ISO format

### What to Log

| Change Type | Log It? | Example Entry |
|-------------|---------|---------------|
| New feature | Yes | "Added export to CSV functionality" |
| Bug fix (user-visible) | Yes | "Fixed login failing on Safari" |
| Internal refactor | No | — |
| Dependency update (breaking) | Yes | "Updated to React 18" |
| Security fix | Yes | "Fixed XSS vulnerability in comments" |
| API change | Yes | "Changed `create()` to require options" |

---

## Inline Comments

### When to Comment

| Scenario | Comment? | What to Write |
|----------|----------|---------------|
| Complex algorithm | Yes | High-level explanation of approach |
| Non-obvious business rule | Yes | Why this logic exists |
| Workaround for bug | Yes | Link to issue, why it's needed |
| Magic number | Yes | What it represents |
| Obvious code | No | Self-documenting |
| Every line | No | Noise |

### Rules

- Comment the "why", not the "what"
- Reference issues/PRs for workarounds: `// Workaround for #123`
- Extract magic numbers to named constants
- Delete commented-out code; use version control
- TODO comments need context: `// TODO(#456): Optimize after DB migration`

### Example

```typescript
// ❌ Comments stating the obvious
// Increment counter
counter++;

// Check if user is null
if (user === null) { ... }

// ❌ Magic number without explanation
if (retries > 3) { ... }

// ❌ TODO without context
// TODO: fix this later

// ✅ Explaining the "why"
// Cap retries to prevent infinite loops on flaky networks.
// 3 retries with exponential backoff covers ~15 seconds of outage.
const MAX_RETRIES = 3;
if (retries > MAX_RETRIES) { ... }

// ✅ Workaround with reference
// Workaround for Safari bug where Date.parse fails on ISO strings
// without timezone. See https://bugs.webkit.org/show_bug.cgi?id=XXX
const date = new Date(dateString.replace(' ', 'T') + 'Z');

// ✅ Business logic explanation
// Premium users get 30-day grace period per legal agreement (2023 contract).
// Don't change without checking with legal.
const gracePeriodDays = user.isPremium ? 30 : 7;

// ✅ Algorithm explanation
// Use binary search because the list is sorted and can have 100K+ items.
// Linear search was causing noticeable lag in autocomplete.
```

---

## Module Documentation

### File Headers

For non-trivial modules, add a file header:

```typescript
/**
 * @fileoverview User authentication and session management.
 *
 * This module handles:
 * - Password hashing and verification
 * - JWT token creation and validation
 * - Session storage and retrieval
 *
 * @module auth
 */
```

### When to Use

- Entry points (index.ts of a feature)
- Complex modules with multiple responsibilities
- Modules with important constraints or gotchas
- Utilities that could be confused with similar modules

---

## Documentation as Code

### Keep Docs Near Code

| Doc Type | Location |
|----------|----------|
| API docs | JSDoc in source files |
| README | Project root |
| Architecture | `/docs/architecture/` |
| API reference | Generated from JSDoc |
| Changelog | Project root |

### Automation

- Generate API docs from JSDoc: TypeDoc, documentation.js
- Lint docs: markdownlint
- Test code examples: extract and run in CI
- Check links: markdown-link-check

---

## Summary: Checklist

Before shipping code, verify:

- [ ] All exports have JSDoc with params, returns, examples
- [ ] Complex types documented with type params explained
- [ ] README updated for new features/changes
- [ ] Changelog entry for user-facing changes
- [ ] Complex algorithms have "why" comments
- [ ] Magic numbers extracted to named constants
- [ ] Workarounds reference their issues
- [ ] No commented-out code (use version control)
- [ ] TODO comments have context and issue links
