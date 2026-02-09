---
depends: []
---

# Agent Browser

Headless browser CLI for AI agents (by Vercel Labs). Rust-first with Node.js fallback.

## Quick Start

```bash
agent-browser open example.com
agent-browser snapshot -i              # Interactive elements with refs
agent-browser click @e2                # Click by ref
agent-browser fill @e3 "test@test.com" # Fill by ref
agent-browser get text @e1             # Read text
agent-browser screenshot page.png
agent-browser close
```

## Core Commands

```bash
# Navigation
agent-browser open <url>              # Navigate (aliases: goto, navigate)
agent-browser back                    # Go back
agent-browser forward                 # Go forward
agent-browser reload                  # Reload page
agent-browser close                   # Close browser (aliases: quit, exit)

# Interaction
agent-browser click <sel>             # Click element
agent-browser dblclick <sel>          # Double-click
agent-browser fill <sel> <text>       # Clear and fill
agent-browser type <sel> <text>       # Type into element
agent-browser press <key>             # Press key (Enter, Tab, Control+a)
agent-browser keydown <key>           # Hold key down
agent-browser keyup <key>             # Release key
agent-browser hover <sel>             # Hover element
agent-browser focus <sel>             # Focus element
agent-browser select <sel> <val>      # Select dropdown option
agent-browser check <sel>             # Check checkbox
agent-browser uncheck <sel>           # Uncheck checkbox
agent-browser scroll <dir> [px]       # Scroll (up/down/left/right)
agent-browser scrollintoview <sel>    # Scroll element into view
agent-browser drag <src> <tgt>        # Drag and drop
agent-browser upload <sel> <files>    # Upload files
agent-browser download <url> [path]   # Download file

# Capture
agent-browser screenshot [path]       # Screenshot (--full for full page; base64 to stdout if no path)
agent-browser pdf <path>              # Save as PDF
agent-browser snapshot                # Accessibility tree with refs
agent-browser eval <js>               # Run JavaScript
```

## Selectors (Priority Order)

### 1. Semantic Locators (no snapshot needed)

Best for AI — find elements by meaning, not DOM structure:

```bash
agent-browser find role button click --name "Submit"
agent-browser find text "Sign In" click
agent-browser find label "Email" fill "test@test.com"
agent-browser find placeholder "Search..." fill "query"
agent-browser find alt "Logo" click
agent-browser find title "Close" click
agent-browser find testid "submit-btn" click

# Positional
agent-browser find first ".item" click
agent-browser find last ".item" click
agent-browser find nth 2 "a" text
```

### 2. @refs from Snapshot (deterministic, for complex pages)

```bash
agent-browser snapshot -i   # Get interactive elements with refs
# Output:
# - textbox "Email" [ref=e1]
# - textbox "Password" [ref=e2]
# - button "Sign In" [ref=e3]

agent-browser fill @e1 "user@example.com"
agent-browser fill @e2 "password"
agent-browser click @e3
```

### 3. CSS Selectors (when you know the DOM)

```bash
agent-browser click "#submit-button"
agent-browser fill "#email" "test@test.com"
```

## Snapshot Options

```bash
agent-browser snapshot            # Full accessibility tree
agent-browser snapshot -i         # Interactive elements only (recommended)
agent-browser snapshot -c         # Compact output
agent-browser snapshot -d 3       # Limit depth to 3
agent-browser snapshot -s "#main" # Scope to CSS selector
agent-browser snapshot --json     # JSON output for programmatic use
```

## Get Info

```bash
agent-browser get text <sel>          # Text content
agent-browser get html <sel>          # innerHTML
agent-browser get value <sel>         # Input value
agent-browser get attr <sel> <attr>   # Attribute value
agent-browser get title               # Page title
agent-browser get url                 # Current URL
agent-browser get count <sel>         # Count matching elements
agent-browser get box <sel>           # Bounding box
agent-browser get styles <sel>        # Computed styles
```

## Check State

```bash
agent-browser is visible <sel>    # Check if visible
agent-browser is enabled <sel>    # Check if enabled
agent-browser is checked <sel>    # Check if checked
```

## Wait Patterns

```bash
agent-browser wait <sel>                   # Wait for element
agent-browser wait 2000                    # Wait milliseconds
agent-browser wait --text "Success"        # Wait for text
agent-browser wait --url "**/dashboard"    # Wait for URL pattern
agent-browser wait --load networkidle      # Wait for network idle
agent-browser wait --fn "window.ready"     # Wait for JS condition
```

## Session Management

Each session = isolated browser instance (cookies, history, auth state).

```bash
agent-browser --session guide-test open http://localhost:3001
agent-browser --session guide-test snapshot -i
agent-browser --session guide-test click @e2

# Or via env var
AGENT_BROWSER_SESSION=guide-test agent-browser click "#btn"

# List/show sessions
agent-browser session list
agent-browser session
```

## State Persistence

```bash
# Save auth state after login
agent-browser state save auth.json

# Load in future sessions
agent-browser state load auth.json
```

## Network

```bash
agent-browser network route <url>                # Intercept
agent-browser network route <url> --abort        # Block
agent-browser network route <url> --body <json>  # Mock response
agent-browser network unroute [url]              # Remove routes
agent-browser network requests                   # View tracked requests
agent-browser network requests --filter api      # Filter requests
```

## Cookies & Storage

```bash
agent-browser cookies
agent-browser cookies set name value
agent-browser cookies clear
agent-browser storage local
agent-browser storage local key
agent-browser storage local set k v
agent-browser storage local clear
```

## Debug

```bash
agent-browser trace start [path]       # Start recording trace
agent-browser trace stop [path]        # Stop and save trace
agent-browser console                  # View console messages
agent-browser console --clear          # Clear console
agent-browser errors                   # View page errors
agent-browser errors --clear           # Clear errors
agent-browser highlight <sel>          # Highlight element
agent-browser record start ./demo.webm # Start video recording
agent-browser record stop              # Stop recording
agent-browser record restart ./new.webm
```

## Standard AI Workflow

```bash
# 1. Navigate
agent-browser --session test open https://app.example.com/login

# 2. Snapshot interactive elements
agent-browser --session test snapshot -i
# - textbox "Email" [ref=e1]
# - textbox "Password" [ref=e2]
# - button "Sign In" [ref=e3]

# 3. Interact
agent-browser --session test fill @e1 "user@example.com"
agent-browser --session test fill @e2 "password"
agent-browser --session test click @e3

# 4. Wait for result
agent-browser --session test wait --url "**/dashboard"

# 5. Verify
agent-browser --session test snapshot -i
agent-browser --session test screenshot dashboard.png

# 6. Save state for reuse
agent-browser --session test state save auth.json
```

## Anti-Patterns

| Don't | Do Instead |
|-------|------------|
| Use `curl` for HTTP | `agent-browser open <url>` for all browser/HTTP |
| Reuse @refs across page changes | Re-snapshot after every navigation/action that changes the page |
| Snapshot full tree on large pages | Use `snapshot -i` (interactive only) or `-s "#scope"` |
| Hardcode CSS selectors | Prefer `find role`/`find text`/`find label` semantic locators |
| Skip waits after navigation | Always `wait --load networkidle` or `wait --url` after page changes |

## When to Use

| Scenario | agent-browser | Alternative |
|----------|--------------|-------------|
| AI agent web automation | Yes | - |
| Guide/demo validation | Yes | - |
| E2E test suites | Maybe | Playwright |
| API-only testing | No | curl/httpie |
| Static page scraping | Maybe | curl + cheerio |

agent-browser = AI agent browser automation, guide validation, interactive testing.
