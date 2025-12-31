---
depends: []
---

# Accessibility

WCAG 2.1 Level AA compliance essentials.

## Quick Checklist

### Perceivable
- Images have `alt` text (empty `alt=""` for decorative)
- Color contrast ≥4.5:1 (text), ≥3:1 (large text, UI)
- Text resizable to 200% without breakage
- No info conveyed by color alone

### Operable
- All functionality keyboard accessible
- No keyboard traps
- Visible focus indicators
- Skip links for repeated content

### Understandable
- Page language declared (`<html lang="en">`)
- Labels on form inputs
- Error messages identify the field and describe fix

### Robust
- Valid HTML (no duplicate IDs)
- ARIA used correctly (prefer native HTML)

## Semantic HTML

```html
<!-- Landmarks -->
<header>   <!-- banner -->
<nav>      <!-- navigation -->
<main>     <!-- main content (one per page) -->
<aside>    <!-- complementary -->
<footer>   <!-- contentinfo -->

<!-- Headings - hierarchical, no skipping -->
<h1>Page Title</h1>
  <h2>Section</h2>
    <h3>Subsection</h3>

<!-- Lists for related items -->
<ul>/<ol> for lists, <dl> for definitions

<!-- Buttons vs Links -->
<button> - actions (submit, toggle, open modal)
<a href> - navigation (goes somewhere)
```

## ARIA Basics

Use native HTML first. ARIA is a fallback.

```html
<!-- Labels -->
<button aria-label="Close dialog">×</button>
<input aria-labelledby="label-id" />
<div aria-describedby="hint-id">...</div>

<!-- State -->
<button aria-expanded="false">Menu</button>
<button aria-pressed="true">Bold</button>
<div aria-hidden="true">decorative</div>

<!-- Live regions (dynamic content) -->
<div aria-live="polite">Status updates</div>
<div aria-live="assertive" role="alert">Errors</div>

<!-- Roles (when native element unavailable) -->
<div role="dialog" aria-modal="true">...</div>
<div role="tablist">...</div>
```

## Focus Management

```html
<!-- Make non-interactive focusable (for JS focus) -->
<h1 tabindex="-1">Page loaded</h1>

<!-- Skip link -->
<a href="#main" class="sr-only focus:not-sr-only">
  Skip to content
</a>
<main id="main" tabindex="-1">...</main>
```

Focus order should match visual order. Use `tabindex="0"` sparingly.

## Form Accessibility

```html
<!-- Always label inputs -->
<label for="email">Email</label>
<input id="email" type="email" required aria-describedby="email-hint" />
<span id="email-hint">We'll never share your email</span>

<!-- Error state -->
<input aria-invalid="true" aria-describedby="email-error" />
<span id="email-error" role="alert">Enter a valid email</span>

<!-- Required fields -->
<input aria-required="true" />
<!-- or use HTML required attribute -->
```

## Color Contrast

| Element | Minimum Ratio |
|---------|---------------|
| Normal text | 4.5:1 |
| Large text (18px+ or 14px+ bold) | 3:1 |
| UI components, icons | 3:1 |

Tools: browser DevTools, Contrast Checker extensions

## Screen Reader Only

```css
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  border: 0;
}
```

## Testing

Automated (catches ~30%):
- Storybook a11y addon
- Lighthouse
- axe DevTools extension

Manual (required):
- Keyboard navigation
- Screen reader (VoiceOver, NVDA)
- Zoom to 200%
