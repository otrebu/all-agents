# WCAG Guidelines - Web Accessibility Standards

> Comprehensive reference for Web Content Accessibility Guidelines (WCAG) 2.1/2.2, covering conformance levels, POUR principles, common violations, and practical implementation guidance.

## Table of Contents

- [Overview](#overview)
- [WCAG Versions and Timeline](#wcag-versions-and-timeline)
- [Conformance Levels (A, AA, AAA)](#conformance-levels-a-aa-aaa)
- [POUR Principles](#pour-principles)
- [Complete Success Criteria Reference](#complete-success-criteria-reference)
- [WCAG 2.2 New Success Criteria](#wcag-22-new-success-criteria)
- [Most Common Violations](#most-common-violations)
- [Keyboard Navigation](#keyboard-navigation)
- [Color Contrast Requirements](#color-contrast-requirements)
- [Form Accessibility](#form-accessibility)
- [Image Alt Text](#image-alt-text)
- [ARIA Usage Guidelines](#aria-usage-guidelines)
- [Focus Management](#focus-management)
- [Screen Reader Considerations](#screen-reader-considerations)
- [Testing Checklist](#testing-checklist)
- [Resources](#resources)

---

## Overview

The **Web Content Accessibility Guidelines (WCAG)** are developed by the World Wide Web Consortium (W3C) Web Accessibility Initiative (WAI). They provide a shared standard for web content accessibility that meets the needs of individuals, organizations, and governments internationally.

### Key Facts

- **WCAG 2.2** was published as a W3C Recommendation on **October 5, 2023**, with an update on December 12, 2024
- Contains **86 success criteria** (9 new in 2.2, 1 removed - SC 4.1.1 Parsing)
- Organized under **4 principles** (POUR) and **13 guidelines**
- Backwards compatible: WCAG 2.2 conformance includes 2.1 and 2.0 conformance
- ISO/IEC 40500:2025 is identical to WCAG 2.2 (October 2023 version)

### Legal Context (2024-2025)

- **European Accessibility Act (EAA)**: In force since June 28, 2025
- **EN 301 549**: Expected to adopt WCAG 2.2 in 2025
- **US DOJ 2024 Rule**: Specifies WCAG 2.1 AA for covered entities
- **2024 Statistics**: 4,605 federal ADA digital accessibility lawsuits filed, with courts increasingly citing WCAG 2.2

### Scope

WCAG covers accessibility for people with:
- Blindness and low vision
- Deafness and hearing loss
- Limited movement
- Speech disabilities
- Photosensitivity
- Cognitive and learning disabilities
- Combinations of these conditions

---

## WCAG Versions and Timeline

| Version | Published | Key Additions |
|---------|-----------|---------------|
| WCAG 1.0 | 1999 | Original 14 guidelines |
| WCAG 2.0 | 2008 | Technology-agnostic, testable criteria, POUR principles |
| WCAG 2.1 | 2018 | Mobile, low vision, cognitive accessibility (+17 criteria) |
| WCAG 2.2 | 2023 | Focus appearance, dragging, authentication (+9 criteria) |
| WCAG 3.0 | In development | Complete restructuring (W3C Working Draft) |

### Backwards Compatibility

Content that conforms to WCAG 2.2 also conforms to WCAG 2.1 and WCAG 2.0. The W3C recommends using WCAG 2.2 to maximize future applicability of accessibility efforts.

---

## Conformance Levels (A, AA, AAA)

WCAG defines three conformance levels representing increasing degrees of accessibility:

### Level A (Minimum) - 30 Criteria

The most basic accessibility requirements. **Failure creates fundamental barriers** that prevent some users from accessing content at all.

**Key Requirements:**
- Alt text for images (1.1.1)
- Captions for prerecorded audio/video (1.2.1, 1.2.2)
- Content structure conveys meaning (1.3.1)
- Full keyboard operability (2.1.1)
- No keyboard traps (2.1.2)
- Page titles (2.4.2)
- Link purpose identifiable in context (2.4.4)
- Language of page defined (3.1.1)
- Error identification (3.3.1)

### Level AA (Standard) - 20 Additional Criteria

The **widely-adopted legal standard** that addresses the most significant and common barriers for the widest range of users.

**Key Requirements:**
- Minimum contrast ratio of **4.5:1** for normal text, **3:1** for large text (1.4.3)
- Text resizable to 200% (1.4.4)
- Multiple ways to find pages (2.4.5)
- Headings and labels are descriptive (2.4.6)
- **Visible focus indicator** (2.4.7)
- Consistent navigation (3.2.3)
- Error suggestions provided (3.3.3)
- Status messages programmatically available (4.1.3)

### Level AAA (Enhanced) - 23 Additional Criteria

The **highest possible conformance level**. Not recommended as a general policy for entire websites because some content types cannot meet all AAA criteria.

**Key Requirements:**
- Enhanced contrast ratio of **7:1** for normal text, **4.5:1** for large text (1.4.6)
- Sign language interpretation for video (1.2.6)
- Extended audio description (1.2.7)
- No timing for interactions (2.2.3)
- Link purpose from link alone (2.4.9)
- Reading level (3.1.5)

### Which Level to Target?

**WCAG 2.2 Level AA** is the current best practice and legal standard:
- Required by DOJ 2024 rule for covered entities
- Referenced in most legal proceedings
- Achievable for most content types
- Provides accessibility for the widest range of users

Consider specific **Level AAA** criteria that fit your content's purpose and user base.

---

## POUR Principles

WCAG is organized around four foundational principles known by the acronym **POUR**:

### 1. Perceivable

> Information and user interface components must be presentable to users in ways they can perceive.

**Guidelines:**
- **1.1 Text Alternatives**: Provide text alternatives for non-text content
- **1.2 Time-based Media**: Provide alternatives for time-based media
- **1.3 Adaptable**: Create content that can be presented in different ways
- **1.4 Distinguishable**: Make it easier to see and hear content

**Key Concepts:**
- If content cannot be seen, it must be able to be heard or felt
- Visual information needs text equivalents for screen readers
- Audio content needs captions or transcripts
- Color alone cannot convey information

### 2. Operable

> User interface components and navigation must be operable.

**Guidelines:**
- **2.1 Keyboard Accessible**: Make all functionality available from a keyboard
- **2.2 Enough Time**: Provide users enough time to read and use content
- **2.3 Seizures and Physical Reactions**: Do not design content that causes seizures
- **2.4 Navigable**: Provide ways to help users navigate and find content
- **2.5 Input Modalities**: Make it easier to operate through various inputs

**Key Concepts:**
- All functionality must work with keyboard alone
- Users must be able to control timing
- Content must not flash more than 3 times per second
- Navigation must be consistent and predictable

### 3. Understandable

> Information and the operation of user interface must be understandable.

**Guidelines:**
- **3.1 Readable**: Make text content readable and understandable
- **3.2 Predictable**: Make web pages appear and operate in predictable ways
- **3.3 Input Assistance**: Help users avoid and correct mistakes

**Key Concepts:**
- Language must be clear and simple
- Navigation and functionality must be consistent
- Error messages must be helpful and specific
- Instructions must be clear

### 4. Robust

> Content must be robust enough to be interpreted reliably by a wide variety of user agents, including assistive technologies.

**Guidelines:**
- **4.1 Compatible**: Maximize compatibility with current and future user agents

**Key Concepts:**
- Valid HTML/CSS
- Proper ARIA implementation
- Compatible with assistive technologies
- Future-proof against technological changes

---

## Complete Success Criteria Reference

### Principle 1: Perceivable

#### Guideline 1.1 - Text Alternatives
| SC | Name | Level |
|----|------|-------|
| 1.1.1 | Non-text Content | A |

#### Guideline 1.2 - Time-based Media
| SC | Name | Level |
|----|------|-------|
| 1.2.1 | Audio-only and Video-only (Prerecorded) | A |
| 1.2.2 | Captions (Prerecorded) | A |
| 1.2.3 | Audio Description or Media Alternative (Prerecorded) | A |
| 1.2.4 | Captions (Live) | AA |
| 1.2.5 | Audio Description (Prerecorded) | AA |
| 1.2.6 | Sign Language (Prerecorded) | AAA |
| 1.2.7 | Extended Audio Description (Prerecorded) | AAA |
| 1.2.8 | Media Alternative (Prerecorded) | AAA |
| 1.2.9 | Audio-only (Live) | AAA |

#### Guideline 1.3 - Adaptable
| SC | Name | Level |
|----|------|-------|
| 1.3.1 | Info and Relationships | A |
| 1.3.2 | Meaningful Sequence | A |
| 1.3.3 | Sensory Characteristics | A |
| 1.3.4 | Orientation | AA |
| 1.3.5 | Identify Input Purpose | AA |
| 1.3.6 | Identify Purpose | AAA |

#### Guideline 1.4 - Distinguishable
| SC | Name | Level |
|----|------|-------|
| 1.4.1 | Use of Color | A |
| 1.4.2 | Audio Control | A |
| 1.4.3 | Contrast (Minimum) | AA |
| 1.4.4 | Resize Text | AA |
| 1.4.5 | Images of Text | AA |
| 1.4.6 | Contrast (Enhanced) | AAA |
| 1.4.7 | Low or No Background Audio | AAA |
| 1.4.8 | Visual Presentation | AAA |
| 1.4.9 | Images of Text (No Exception) | AAA |
| 1.4.10 | Reflow | AA |
| 1.4.11 | Non-text Contrast | AA |
| 1.4.12 | Text Spacing | AA |
| 1.4.13 | Content on Hover or Focus | AA |

### Principle 2: Operable

#### Guideline 2.1 - Keyboard Accessible
| SC | Name | Level |
|----|------|-------|
| 2.1.1 | Keyboard | A |
| 2.1.2 | No Keyboard Trap | A |
| 2.1.3 | Keyboard (No Exception) | AAA |
| 2.1.4 | Character Key Shortcuts | A |

#### Guideline 2.2 - Enough Time
| SC | Name | Level |
|----|------|-------|
| 2.2.1 | Timing Adjustable | A |
| 2.2.2 | Pause, Stop, Hide | A |
| 2.2.3 | No Timing | AAA |
| 2.2.4 | Interruptions | AAA |
| 2.2.5 | Re-authenticating | AAA |
| 2.2.6 | Timeouts | AAA |

#### Guideline 2.3 - Seizures and Physical Reactions
| SC | Name | Level |
|----|------|-------|
| 2.3.1 | Three Flashes or Below Threshold | A |
| 2.3.2 | Three Flashes | AAA |
| 2.3.3 | Animation from Interactions | AAA |

#### Guideline 2.4 - Navigable
| SC | Name | Level |
|----|------|-------|
| 2.4.1 | Bypass Blocks | A |
| 2.4.2 | Page Titled | A |
| 2.4.3 | Focus Order | A |
| 2.4.4 | Link Purpose (In Context) | A |
| 2.4.5 | Multiple Ways | AA |
| 2.4.6 | Headings and Labels | AA |
| 2.4.7 | Focus Visible | AA |
| 2.4.8 | Location | AAA |
| 2.4.9 | Link Purpose (Link Only) | AAA |
| 2.4.10 | Section Headings | AAA |
| 2.4.11 | Focus Not Obscured (Minimum) | AA |
| 2.4.12 | Focus Not Obscured (Enhanced) | AAA |
| 2.4.13 | Focus Appearance | AAA |

#### Guideline 2.5 - Input Modalities
| SC | Name | Level |
|----|------|-------|
| 2.5.1 | Pointer Gestures | A |
| 2.5.2 | Pointer Cancellation | A |
| 2.5.3 | Label in Name | A |
| 2.5.4 | Motion Actuation | A |
| 2.5.5 | Target Size (Enhanced) | AAA |
| 2.5.6 | Concurrent Input Mechanisms | AAA |
| 2.5.7 | Dragging Movements | AA |
| 2.5.8 | Target Size (Minimum) | AA |

### Principle 3: Understandable

#### Guideline 3.1 - Readable
| SC | Name | Level |
|----|------|-------|
| 3.1.1 | Language of Page | A |
| 3.1.2 | Language of Parts | AA |
| 3.1.3 | Unusual Words | AAA |
| 3.1.4 | Abbreviations | AAA |
| 3.1.5 | Reading Level | AAA |
| 3.1.6 | Pronunciation | AAA |

#### Guideline 3.2 - Predictable
| SC | Name | Level |
|----|------|-------|
| 3.2.1 | On Focus | A |
| 3.2.2 | On Input | A |
| 3.2.3 | Consistent Navigation | AA |
| 3.2.4 | Consistent Identification | AA |
| 3.2.5 | Change on Request | AAA |
| 3.2.6 | Consistent Help | A |

#### Guideline 3.3 - Input Assistance
| SC | Name | Level |
|----|------|-------|
| 3.3.1 | Error Identification | A |
| 3.3.2 | Labels or Instructions | A |
| 3.3.3 | Error Suggestion | AA |
| 3.3.4 | Error Prevention (Legal, Financial, Data) | AA |
| 3.3.5 | Help | AAA |
| 3.3.6 | Error Prevention (All) | AAA |
| 3.3.7 | Redundant Entry | A |
| 3.3.8 | Accessible Authentication (Minimum) | AA |
| 3.3.9 | Accessible Authentication (Enhanced) | AAA |

### Principle 4: Robust

#### Guideline 4.1 - Compatible
| SC | Name | Level |
|----|------|-------|
| 4.1.2 | Name, Role, Value | A |
| 4.1.3 | Status Messages | AA |

> Note: SC 4.1.1 Parsing was removed in WCAG 2.2 as modern browsers handle parsing errors gracefully.

---

## WCAG 2.2 New Success Criteria

WCAG 2.2 introduces **9 new success criteria** focusing on:
- Stronger focus visibility
- Better mobile usability (touch targets)
- Improved cognitive accessibility
- More efficient forms
- Alternative authentication methods

### Focus Not Obscured (Minimum) - 2.4.11 (Level AA)

**Requirement:** When a UI component receives keyboard focus, the component is not entirely hidden due to author-created content.

```css
/* Ensure sticky headers/footers don't cover focused elements */
.sticky-header {
  /* Consider z-index and scroll-padding */
}

html {
  scroll-padding-top: 80px; /* Height of sticky header */
}
```

### Focus Not Obscured (Enhanced) - 2.4.12 (Level AAA)

**Requirement:** When a UI component receives keyboard focus, no part of the component is hidden by author-created content.

### Focus Appearance - 2.4.13 (Level AAA)

**Requirement:** Focus indicators must be:
- At least **2 CSS pixels thick**
- Maintain **3:1 contrast ratio** between focused and unfocused states

```css
/* Enhanced focus indicator */
:focus-visible {
  outline: 3px solid #0066cc;
  outline-offset: 2px;
}
```

### Dragging Movements - 2.5.7 (Level AA)

**Requirement:** All functionality using dragging can be achieved with a single pointer without dragging, unless dragging is essential.

```html
<!-- Provide alternative to drag-and-drop -->
<div class="sortable-list">
  <div class="item" draggable="true">
    <span>Item 1</span>
    <button aria-label="Move up">&#x25B2;</button>
    <button aria-label="Move down">&#x25BC;</button>
  </div>
</div>
```

### Target Size (Minimum) - 2.5.8 (Level AA)

**Requirement:** Touch/click targets must be at least **24x24 CSS pixels**.

**Exceptions:**
- Adequate spacing between smaller targets
- Inline links within text
- Essential presentations (maps, diagrams)
- User-agent controlled elements

```css
/* Ensure minimum target size */
button, a, input[type="checkbox"], input[type="radio"] {
  min-width: 24px;
  min-height: 24px;
}

/* Or provide adequate spacing */
.small-buttons button {
  margin: 8px; /* Creates effective 24px touch target */
}
```

### Consistent Help - 3.2.6 (Level A)

**Requirement:** Help mechanisms (contact info, chat, FAQ links) appear in the same relative position on each page.

```html
<!-- Consistent footer help section -->
<footer>
  <nav aria-label="Help">
    <a href="/contact">Contact Us</a>
    <a href="/faq">FAQ</a>
    <button id="chat-widget">Live Chat</button>
  </nav>
</footer>
```

### Redundant Entry - 3.3.7 (Level A)

**Requirement:** Information previously entered by the user must be auto-populated or available for selection, unless re-entry is essential for security.

```html
<!-- Auto-fill shipping address for billing -->
<fieldset>
  <legend>Billing Address</legend>
  <label>
    <input type="checkbox" id="same-as-shipping">
    Same as shipping address
  </label>
  <!-- Address fields auto-populated when checked -->
</fieldset>
```

### Accessible Authentication (Minimum) - 3.3.8 (Level AA)

**Requirement:** Authentication must not require cognitive function tests unless:
- An alternative method exists
- A mechanism helps the user (e.g., copy-paste allowed, password managers work)
- Object recognition uses user-provided images

```html
<!-- Allow paste in password fields -->
<input type="password"
       id="password"
       autocomplete="current-password">
<!-- Do NOT use JavaScript to block paste -->
```

### Accessible Authentication (Enhanced) - 3.3.9 (Level AAA)

**Requirement:** Even object recognition and user-content identification are prohibited; alternatives must be provided.

---

## Most Common Violations

Based on WebAIM's 2024/2025 Million Report analyzing the top 1,000,000 home pages:

### Statistics

- **95.9%** of home pages had detectable WCAG failures
- Average of **56.8 errors per page**
- Pages with ARIA averaged **41% more errors** than those without

### Top 6 Violations

#### 1. Low Contrast Text (81% of pages)

**WCAG:** 1.4.3 Contrast (Minimum)

```css
/* BAD - #777777 on white = 4.47:1 (fails) */
.text-gray {
  color: #777777;
}

/* GOOD - #595959 on white = 7.0:1 (passes AAA) */
.text-gray {
  color: #595959;
}

/* GOOD - #767676 on white = 4.54:1 (passes AA) */
.text-gray {
  color: #767676;
}
```

#### 2. Missing Alt Text (54.5% of pages)

**WCAG:** 1.1.1 Non-text Content

```html
<!-- BAD -->
<img src="product.jpg">

<!-- GOOD - Informative image -->
<img src="product.jpg" alt="Red leather handbag with gold clasp">

<!-- GOOD - Decorative image -->
<img src="decorative-border.png" alt="">
```

#### 3. Missing Form Labels (48.6% of pages)

**WCAG:** 3.3.2 Labels or Instructions

```html
<!-- BAD - No label -->
<input type="email" placeholder="Enter email">

<!-- GOOD - Visible label -->
<label for="email">Email address</label>
<input type="email" id="email">

<!-- GOOD - Hidden label for visual designs -->
<label for="search" class="visually-hidden">Search</label>
<input type="search" id="search" placeholder="Search...">
```

#### 4. Empty Links (44.6% of pages)

**WCAG:** 2.4.4 Link Purpose (In Context)

```html
<!-- BAD - Empty link -->
<a href="/cart"><i class="icon-cart"></i></a>

<!-- GOOD - Accessible link -->
<a href="/cart">
  <i class="icon-cart" aria-hidden="true"></i>
  <span class="visually-hidden">Shopping cart</span>
</a>

<!-- GOOD - aria-label -->
<a href="/cart" aria-label="Shopping cart">
  <i class="icon-cart" aria-hidden="true"></i>
</a>
```

#### 5. Missing Name, Role, or Value (Common)

**WCAG:** 4.1.2 Name, Role, Value

```html
<!-- BAD - Custom button without role -->
<div onclick="submit()">Submit</div>

<!-- GOOD - Native button -->
<button type="submit">Submit</button>

<!-- GOOD - ARIA if custom element required -->
<div role="button" tabindex="0" onclick="submit()"
     onkeydown="if(event.key==='Enter')submit()">
  Submit
</div>
```

#### 6. Keyboard Navigation Issues

**WCAG:** 2.1.1 Keyboard, 2.1.2 No Keyboard Trap

```javascript
// BAD - Click-only handler
element.addEventListener('click', handler);

// GOOD - Keyboard support
element.addEventListener('click', handler);
element.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    handler(e);
  }
});
```

---

## Keyboard Navigation

### SC 2.1.1 Keyboard (Level A)

All functionality must be operable through a keyboard interface without requiring specific timings.

**Requirements:**
- All interactive elements reachable via Tab key
- Buttons and links activated with Enter and/or Space
- Logical and intuitive focus order
- Visible focus indicator on all elements

```html
<!-- Proper keyboard-accessible elements -->
<button>Submit</button>              <!-- Enter/Space activates -->
<a href="/about">About</a>           <!-- Enter activates -->
<input type="text">                  <!-- Receives focus, accepts input -->
<select>...</select>                 <!-- Arrow keys navigate options -->
```

### SC 2.1.2 No Keyboard Trap (Level A)

If focus can move to a component, it must be able to move away using only standard keyboard keys (Tab, Shift+Tab, Escape, arrow keys).

**Common Causes of Keyboard Traps:**
- Hidden elements still in tab order
- Third-party widgets without keyboard support
- Modal dialogs without escape mechanism
- Embedded content (iframes, video players)

```javascript
// Proper modal trap with escape mechanism
const modal = document.getElementById('modal');

modal.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeModal();
    // Return focus to trigger element
    triggerButton.focus();
  }

  // Trap focus within modal
  if (e.key === 'Tab') {
    const focusables = modal.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const first = focusables[0];
    const last = focusables[focusables.length - 1];

    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }
});
```

### Common Keyboard Navigation Patterns

| Element | Key | Action |
|---------|-----|--------|
| All focusable | Tab | Move to next element |
| All focusable | Shift+Tab | Move to previous element |
| Button | Enter/Space | Activate |
| Link | Enter | Follow link |
| Checkbox | Space | Toggle |
| Radio buttons | Arrow keys | Move between options |
| Select | Arrow keys | Navigate options |
| Dialog | Escape | Close |
| Menu | Arrow keys | Navigate items |
| Menu | Enter | Select item |
| Menu | Escape | Close menu |

---

## Color Contrast Requirements

### Text Contrast Ratios

| Level | Text Type | Minimum Ratio |
|-------|-----------|---------------|
| AA | Normal text (<18pt or <14pt bold) | 4.5:1 |
| AA | Large text (>= 18pt or >= 14pt bold) | 3:1 |
| AAA | Normal text | 7:1 |
| AAA | Large text | 4.5:1 |

### Non-text Contrast (SC 1.4.11)

UI components and graphical objects require a minimum **3:1** contrast ratio:
- Form input borders
- Focus indicators
- Icons needed for understanding
- Charts and data visualizations

### Calculating Contrast

```javascript
// Relative luminance formula
function luminance(r, g, b) {
  const [rs, gs, bs] = [r, g, b].map(c => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function contrastRatio(l1, l2) {
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}
```

### Common Accessible Color Combinations

```css
/* Passing AA (4.5:1) for normal text on white (#FFFFFF) */
--text-primary: #595959;     /* 7.0:1 - Passes AAA */
--text-secondary: #767676;   /* 4.54:1 - Passes AA */
--link-color: #0066cc;       /* 5.26:1 - Passes AA */

/* Large text on white (3:1 required) */
--heading-accent: #757575;   /* 4.6:1 - Passes */

/* Avoid these - fail AA */
--fail-gray: #777777;        /* 4.47:1 - FAILS */
--fail-light: #999999;       /* 2.85:1 - FAILS */
```

### Testing Tools

- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
- [Accessible Web Color Contrast Checker](https://accessibleweb.com/color-contrast-checker/)
- Browser DevTools accessibility panels
- Axe browser extension

### Important Notes

- Ratios cannot be rounded up (4.499:1 does not meet 4.5:1)
- Exceptions: logos, decorative text, inactive UI, incidental text
- Consider users with various color vision deficiencies
- Maximum contrast (21:1) is black on white

---

## Form Accessibility

### Labels and Instructions (SC 3.3.2)

Every form input must have an associated label.

```html
<!-- Method 1: Explicit label with for/id -->
<label for="username">Username</label>
<input type="text" id="username" name="username">

<!-- Method 2: Implicit label (wrapping) -->
<label>
  Email address
  <input type="email" name="email">
</label>

<!-- Method 3: aria-labelledby for complex layouts -->
<span id="phone-label">Phone Number</span>
<span id="phone-format">(XXX) XXX-XXXX</span>
<input type="tel"
       aria-labelledby="phone-label phone-format"
       name="phone">

<!-- Method 4: aria-label for icon-only inputs -->
<input type="search"
       aria-label="Search products"
       placeholder="Search...">
```

### Error Identification (SC 3.3.1)

Errors must be identified in text, not just visually.

```html
<div class="form-group">
  <label for="email">Email address</label>
  <input type="email"
         id="email"
         aria-invalid="true"
         aria-describedby="email-error">
  <span id="email-error" class="error" role="alert">
    Please enter a valid email address (e.g., name@example.com)
  </span>
</div>
```

### Error Suggestions (SC 3.3.3)

Provide specific, actionable suggestions for fixing errors.

```html
<!-- BAD - Generic error -->
<span class="error">Invalid input</span>

<!-- GOOD - Specific suggestion -->
<span class="error">
  Password must be at least 8 characters and include
  one uppercase letter, one number, and one symbol.
</span>
```

### Identify Input Purpose (SC 1.3.5)

Use autocomplete attributes for user information fields.

```html
<form>
  <label for="name">Full Name</label>
  <input type="text" id="name" autocomplete="name">

  <label for="email">Email</label>
  <input type="email" id="email" autocomplete="email">

  <label for="tel">Phone</label>
  <input type="tel" id="tel" autocomplete="tel">

  <label for="address">Street Address</label>
  <input type="text" id="address" autocomplete="street-address">

  <label for="cc-number">Credit Card</label>
  <input type="text" id="cc-number" autocomplete="cc-number">
</form>
```

### Required Fields

```html
<!-- Indicate required fields -->
<label for="email">
  Email address <span aria-hidden="true">*</span>
  <span class="visually-hidden">(required)</span>
</label>
<input type="email" id="email" required aria-required="true">

<!-- Legend for required indicator -->
<p class="form-note">
  <span aria-hidden="true">*</span> indicates required field
</p>
```

### Grouping Related Fields

```html
<fieldset>
  <legend>Shipping Address</legend>

  <label for="street">Street</label>
  <input type="text" id="street" autocomplete="shipping street-address">

  <label for="city">City</label>
  <input type="text" id="city" autocomplete="shipping address-level2">

  <label for="zip">ZIP Code</label>
  <input type="text" id="zip" autocomplete="shipping postal-code">
</fieldset>

<fieldset>
  <legend>Payment Method</legend>
  <label>
    <input type="radio" name="payment" value="credit"> Credit Card
  </label>
  <label>
    <input type="radio" name="payment" value="paypal"> PayPal
  </label>
</fieldset>
```

---

## Image Alt Text

### The Alt Text Decision Tree

Based on the W3C WAI Images Tutorial, follow this decision process:

#### 1. Does the image contain text?
- **Text also present as real text nearby** -> Use empty alt (`alt=""`)
- **Text for visual effects only** -> Use empty alt
- **Text serves a function (icon)** -> Alt describes the function
- **Text not present elsewhere** -> Alt includes the text

#### 2. Is the image in a link/button?
- **Yes, and context unclear without it** -> Alt describes the destination/action

#### 3. Does the image contribute meaning?
- **Simple graphic/photo** -> Brief description conveying meaning
- **Complex graph/chart** -> Short alt + detailed description elsewhere
- **Redundant to nearby text** -> Use empty alt

#### 4. Is it purely decorative?
- **Yes** -> Use empty alt (`alt=""`)

### Image Types and Examples

#### Informative Images

```html
<!-- Product photo -->
<img src="handbag.jpg"
     alt="Red leather handbag with gold clasp, 12 inches wide">

<!-- Photo in article -->
<img src="ceo-speaking.jpg"
     alt="CEO Jane Smith presenting quarterly results at the 2024 shareholder meeting">
```

#### Decorative Images

```html
<!-- Decorative divider -->
<img src="divider.png" alt="">

<!-- Background flourish -->
<img src="flourish.svg" alt="" role="presentation">

<!-- CSS background (preferred for decorative) -->
<div style="background-image: url('pattern.png');"></div>
```

#### Functional Images

```html
<!-- Logo link -->
<a href="/">
  <img src="logo.png" alt="Company Name - Home">
</a>

<!-- Icon button -->
<button>
  <img src="search-icon.svg" alt="Search">
</button>

<!-- Social media link -->
<a href="https://twitter.com/company">
  <img src="twitter.svg" alt="Follow us on Twitter">
</a>
```

#### Complex Images

```html
<!-- Chart with detailed description -->
<figure>
  <img src="sales-chart.png"
       alt="Sales growth chart showing 25% increase from 2023 to 2024"
       aria-describedby="chart-description">
  <figcaption id="chart-description">
    Quarterly sales data: Q1 $1.2M, Q2 $1.4M, Q3 $1.5M, Q4 $1.6M,
    representing a total growth of 25% year-over-year.
  </figcaption>
</figure>
```

#### Images of Text

```html
<!-- Quote as image (avoid when possible) -->
<img src="quote.png"
     alt="Innovation distinguishes between a leader and a follower. - Steve Jobs">

<!-- Better: Use styled text -->
<blockquote>
  <p>Innovation distinguishes between a leader and a follower.</p>
  <cite>Steve Jobs</cite>
</blockquote>
```

### Alt Text Best Practices

1. **Be concise**: Typically 125 characters or less
2. **Be specific**: Describe what matters for context
3. **Don't start with "Image of" or "Picture of"**: Screen readers announce it's an image
4. **Include text in images**: If the image contains text, include it in alt
5. **Consider context**: Same image may need different alt text in different contexts
6. **Don't duplicate**: If a caption already describes it, use empty alt

---

## ARIA Usage Guidelines

### The Five Rules of ARIA

#### Rule 1: Don't Use ARIA (If You Don't Have To)

Use native HTML elements whenever possible:

```html
<!-- BAD - Unnecessary ARIA -->
<div role="button" tabindex="0">Click me</div>

<!-- GOOD - Native element -->
<button>Click me</button>

<!-- BAD - Unnecessary ARIA -->
<div role="navigation">...</div>

<!-- GOOD - Native element -->
<nav>...</nav>
```

#### Rule 2: Don't Change Native Semantics

Don't override the inherent meaning of HTML elements:

```html
<!-- BAD - Removes heading semantics -->
<h2 role="presentation">Section Title</h2>

<!-- GOOD - Use appropriate element -->
<span class="styled-heading">Section Title</span>
```

#### Rule 3: All ARIA Controls Must Be Keyboard Operable

ARIA doesn't add behavior, only semantics:

```javascript
// BAD - ARIA role without keyboard support
<div role="button">Submit</div>

// GOOD - Full implementation
<div role="button"
     tabindex="0"
     onclick="submit()"
     onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();submit()}">
  Submit
</div>
```

#### Rule 4: Don't Hide Focusable Elements

Never use `aria-hidden="true"` on focusable elements:

```html
<!-- BAD - Hidden but focusable -->
<div aria-hidden="true">
  <button>Click me</button>
</div>

<!-- GOOD - Properly hidden -->
<div style="display: none;">
  <button>Click me</button>
</div>
```

#### Rule 5: All Interactive Elements Must Have Accessible Names

```html
<!-- BAD - No accessible name -->
<button><i class="icon-search"></i></button>

<!-- GOOD - aria-label -->
<button aria-label="Search">
  <i class="icon-search" aria-hidden="true"></i>
</button>

<!-- GOOD - Visually hidden text -->
<button>
  <i class="icon-search" aria-hidden="true"></i>
  <span class="visually-hidden">Search</span>
</button>
```

### ARIA Landmark Roles

Map to HTML5 semantic elements when possible:

| ARIA Role | HTML5 Element | Purpose |
|-----------|---------------|---------|
| banner | `<header>` (top-level) | Site header, logo, search |
| navigation | `<nav>` | Navigation links |
| main | `<main>` | Primary content |
| complementary | `<aside>` | Supporting content |
| contentinfo | `<footer>` (top-level) | Site footer, copyright |
| search | - | Search functionality |
| form | `<form>` | Form landmark |
| region | `<section>` (with name) | Generic landmark |

```html
<!-- Proper landmark structure -->
<header> <!-- implicit role="banner" -->
  <nav aria-label="Main"> <!-- role="navigation" -->
    ...
  </nav>
</header>

<main> <!-- implicit role="main" -->
  <article>
    <h1>Page Title</h1>
    ...
  </article>
</main>

<aside> <!-- implicit role="complementary" -->
  <h2>Related Links</h2>
  ...
</aside>

<footer> <!-- implicit role="contentinfo" -->
  ...
</footer>
```

### Live Regions

For dynamic content announcements:

```html
<!-- Polite - waits for user idle (most common) -->
<div aria-live="polite">
  <!-- Updated content announced after current activity -->
</div>

<!-- Assertive - interrupts immediately (use sparingly) -->
<div aria-live="assertive" role="alert">
  <!-- Critical alerts only -->
</div>

<!-- Status messages -->
<div role="status">
  <!-- Form submission success, loading states -->
  Form submitted successfully!
</div>

<!-- Error alerts -->
<div role="alert">
  <!-- Immediate attention required -->
  Session expires in 2 minutes!
</div>
```

### Common ARIA Patterns

```html
<!-- Accordion -->
<button aria-expanded="false" aria-controls="panel1">
  Section 1
</button>
<div id="panel1" hidden>
  Panel content
</div>

<!-- Tab interface -->
<div role="tablist">
  <button role="tab" aria-selected="true" aria-controls="tab1-panel">
    Tab 1
  </button>
  <button role="tab" aria-selected="false" aria-controls="tab2-panel">
    Tab 2
  </button>
</div>
<div id="tab1-panel" role="tabpanel" aria-labelledby="tab1">
  Tab 1 content
</div>

<!-- Modal dialog -->
<div role="dialog"
     aria-modal="true"
     aria-labelledby="dialog-title"
     aria-describedby="dialog-desc">
  <h2 id="dialog-title">Confirm Delete</h2>
  <p id="dialog-desc">Are you sure you want to delete this item?</p>
  <button>Cancel</button>
  <button>Delete</button>
</div>
```

---

## Focus Management

### SC 2.4.7 Focus Visible (Level AA)

Any keyboard operable interface must have a visible focus indicator.

```css
/* Never do this without replacement */
*:focus {
  outline: none; /* BAD - removes all focus indicators */
}

/* Default visible focus */
:focus {
  outline: 2px solid #0066cc;
  outline-offset: 2px;
}

/* Use :focus-visible for keyboard-only focus */
:focus:not(:focus-visible) {
  outline: none;
}

:focus-visible {
  outline: 3px solid #0066cc;
  outline-offset: 2px;
  border-radius: 2px;
}
```

### Skip Links (SC 2.4.1 Bypass Blocks)

Allow users to skip repetitive navigation:

```html
<body>
  <a href="#main-content" class="skip-link">
    Skip to main content
  </a>

  <header>
    <nav><!-- Navigation --></nav>
  </header>

  <main id="main-content" tabindex="-1">
    <h1>Page Title</h1>
    <!-- Main content -->
  </main>
</body>
```

```css
.skip-link {
  position: absolute;
  top: -40px;
  left: 0;
  padding: 8px 16px;
  background: #000;
  color: #fff;
  z-index: 100;
}

.skip-link:focus {
  top: 0;
}
```

### Focus Order (SC 2.4.3)

Focus order must be logical and meaningful:

```html
<!-- BAD - Visual order doesn't match DOM order -->
<div style="display: flex; flex-direction: row-reverse;">
  <button>Third visually, first in DOM</button>
  <button>Second</button>
  <button>First visually, last in DOM</button>
</div>

<!-- GOOD - DOM order matches visual order -->
<div style="display: flex;">
  <button>First</button>
  <button>Second</button>
  <button>Third</button>
</div>
```

### Managing Focus in Dynamic Content

```javascript
// After opening a modal, focus the first focusable element
function openModal() {
  modal.hidden = false;
  const firstFocusable = modal.querySelector(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  firstFocusable.focus();
}

// After closing a modal, return focus to trigger
function closeModal() {
  modal.hidden = true;
  triggerButton.focus();
}

// After removing an item, focus the next item or container
function deleteItem(item) {
  const nextItem = item.nextElementSibling || item.previousElementSibling;
  item.remove();
  if (nextItem) {
    nextItem.focus();
  } else {
    container.focus(); // Container needs tabindex="-1"
  }
}

// After adding content, announce or focus appropriately
function addToCart(product) {
  // Update live region for screen reader announcement
  liveRegion.textContent = `${product.name} added to cart`;

  // Optionally focus cart link
  // cartLink.focus();
}
```

### Tabindex Usage

| Value | Behavior |
|-------|----------|
| Not present | Natural tab order for focusable elements |
| `tabindex="0"` | Adds element to tab order |
| `tabindex="-1"` | Focusable via JS, not in tab order |
| `tabindex="1+"` | **Avoid** - Creates unpredictable order |

```html
<!-- Proper use cases -->

<!-- Make non-interactive element focusable for JS -->
<div id="modal-content" tabindex="-1">
  <!-- Focus target after modal opens -->
</div>

<!-- Make custom control focusable -->
<div role="slider" tabindex="0"
     aria-valuemin="0"
     aria-valuemax="100"
     aria-valuenow="50">
</div>

<!-- NEVER use positive tabindex -->
<button tabindex="2">DON'T DO THIS</button>
```

---

## Screen Reader Considerations

### Primary Screen Readers

| Screen Reader | Platform | Primary Browser |
|---------------|----------|-----------------|
| NVDA | Windows | Firefox |
| JAWS | Windows | Chrome |
| VoiceOver | macOS/iOS | Safari |
| TalkBack | Android | Chrome |
| Narrator | Windows | Edge |

### Testing Recommendations

1. **Test with at least two screen readers** (NVDA + VoiceOver covers most users)
2. **Add JAWS for enterprise contexts**
3. **Never use mouse** when testing - screen readers are keyboard-based
4. **Use correct browser pairings** for accurate results

### Navigation Modes

Screen readers have different modes for different content:

| Mode | Purpose | Common Keys |
|------|---------|-------------|
| Browse/Read | Reading content | Arrow keys, H, D, T |
| Focus/Forms | Interactive elements | Tab, Enter, Space |
| Application | Custom widgets | Varies by widget |

### Key Screen Reader Commands

```
# NVDA/JAWS Navigation
H - Next heading
D - Next landmark
T - Next table
F - Next form field
B - Next button
L - Next list
G - Next graphic
1-6 - Next heading level 1-6

# Reading
Down Arrow - Next line
Up Arrow - Previous line
Ctrl + Home - Top of page
Ctrl + End - Bottom of page

# VoiceOver (macOS)
VO + Command + H - Headings rotor
VO + Command + J - Form controls rotor
VO + U - Rotor menu
```

### Content Announcements

Screen readers announce different information for different elements:

```html
<!-- Button: "Submit, button" -->
<button>Submit</button>

<!-- Link: "About Us, link" -->
<a href="/about">About Us</a>

<!-- Heading: "Welcome, heading level 1" -->
<h1>Welcome</h1>

<!-- Image: "Company logo, image" -->
<img src="logo.png" alt="Company logo">

<!-- Form field: "Email, edit, required" -->
<label for="email">Email</label>
<input type="email" id="email" required>
```

### Common Issues

1. **Meaningless link text**: "Click here", "Read more"
2. **Missing form labels**: Screen reader says "edit text, blank"
3. **Images without alt**: Announces filename
4. **Hidden content announced**: Using visibility incorrectly
5. **ARIA conflicts**: Overriding correct native semantics

### Hiding Content from Screen Readers

```css
/* Visually hidden but accessible to screen readers */
.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

/* Hidden from everyone */
.hidden {
  display: none;
}

/* Or */
[hidden] {
  display: none;
}
```

```html
<!-- Hidden from screen readers only -->
<span aria-hidden="true">decorative icon</span>

<!-- Accessible only to screen readers -->
<span class="visually-hidden">Additional context</span>
```

---

## Testing Checklist

### Automated Testing (Catches ~30-40% of Issues)

**Tools:**
- [Axe DevTools](https://www.deque.com/axe/) (browser extension)
- [WAVE](https://wave.webaim.org/) (web-based and extension)
- [Lighthouse](https://developers.google.com/web/tools/lighthouse) (Chrome DevTools)
- [Pa11y](https://pa11y.org/) (CLI)
- [axe-core](https://github.com/dequelabs/axe-core) (npm package for CI/CD)

**Run automated tests:**
- [ ] No axe-core errors at runtime
- [ ] Lighthouse accessibility score > 90
- [ ] No WAVE errors
- [ ] Valid HTML (W3C validator)

### Keyboard Testing

- [ ] Can reach all interactive elements with Tab
- [ ] Can activate buttons with Enter and Space
- [ ] Can activate links with Enter
- [ ] Can navigate form controls
- [ ] No keyboard traps
- [ ] Focus indicator visible on all elements
- [ ] Logical focus order
- [ ] Skip link present and functional
- [ ] Modal dialogs trap focus correctly
- [ ] Escape closes dialogs and returns focus

### Visual Testing

- [ ] Text contrast ratio >= 4.5:1 (normal) or >= 3:1 (large)
- [ ] Non-text contrast ratio >= 3:1
- [ ] Focus indicator contrast >= 3:1
- [ ] Content readable at 200% zoom
- [ ] No horizontal scroll at 320px width (reflow)
- [ ] Color alone doesn't convey information
- [ ] Touch targets >= 24x24 CSS pixels
- [ ] Content visible when text spacing adjusted
- [ ] No content loss on orientation change

### Content Testing

- [ ] All images have appropriate alt text
- [ ] Decorative images have empty alt
- [ ] Page has a unique, descriptive title
- [ ] Headings are properly nested (h1 -> h2 -> h3)
- [ ] Links have meaningful text (not "click here")
- [ ] Language of page is set
- [ ] Error messages are specific and helpful
- [ ] Required fields are indicated

### Forms Testing

- [ ] All inputs have visible labels
- [ ] Labels are programmatically associated
- [ ] Required fields marked and announced
- [ ] Error messages identify the field and issue
- [ ] Suggestions provided for fixing errors
- [ ] Autocomplete attributes on user data fields
- [ ] Related fields grouped with fieldset/legend

### Screen Reader Testing

**Test with NVDA (Windows/Firefox):**
- [ ] Page title announced on load
- [ ] Headings navigation works (H key)
- [ ] Landmarks navigation works (D key)
- [ ] Form fields have labels
- [ ] Images have alt text
- [ ] Links are descriptive
- [ ] Dynamic content announced (live regions)
- [ ] Error messages announced

**Test with VoiceOver (macOS/Safari):**
- [ ] Rotor shows correct headings
- [ ] Rotor shows correct landmarks
- [ ] Forms mode works correctly
- [ ] All interactive elements accessible

### ARIA Testing

- [ ] No duplicate IDs
- [ ] aria-labelledby/describedby reference valid IDs
- [ ] ARIA roles match element behavior
- [ ] Required ARIA attributes present
- [ ] ARIA states updated dynamically
- [ ] Live regions announce appropriately

### Mobile Testing

- [ ] Touch targets >= 44x44 CSS pixels (iOS guideline)
- [ ] Content works in portrait and landscape
- [ ] Pinch zoom not disabled
- [ ] VoiceOver/TalkBack can navigate all content
- [ ] Gestures have alternatives

### Pre-Release Checklist

- [ ] Automated tests pass in CI/CD
- [ ] Manual keyboard testing completed
- [ ] Screen reader testing with 2+ readers
- [ ] Color contrast verified
- [ ] Responsive/zoom testing completed
- [ ] User testing with people with disabilities (if possible)

---

## Resources

### Official W3C Resources

- [WCAG 2.2 Specification](https://www.w3.org/TR/WCAG22/)
- [WCAG 2 Overview](https://www.w3.org/WAI/standards-guidelines/wcag/)
- [What's New in WCAG 2.2](https://www.w3.org/WAI/standards-guidelines/wcag/new-in-22/)
- [Understanding WCAG 2.2](https://www.w3.org/WAI/WCAG22/Understanding/)
- [WCAG Quick Reference](https://www.w3.org/WAI/WCAG22/quickref/)
- [WAI Tutorials](https://www.w3.org/WAI/tutorials/)
- [Images Tutorial](https://www.w3.org/WAI/tutorials/images/)
- [Alt Decision Tree](https://www.w3.org/WAI/tutorials/images/decision-tree/)
- [ARIA Authoring Practices Guide (APG)](https://www.w3.org/WAI/ARIA/apg/)
- [WAI-ARIA Specification](https://www.w3.org/TR/wai-aria-1.2/)

### Testing Tools

- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
- [WAVE Web Accessibility Evaluator](https://wave.webaim.org/)
- [Axe DevTools](https://www.deque.com/axe/)
- [Accessibility Insights](https://accessibilityinsights.io/)
- [Pa11y](https://pa11y.org/)
- [Lighthouse](https://developers.google.com/web/tools/lighthouse)
- [NVDA Screen Reader](https://www.nvaccess.org/)

### Learning Resources

- [WebAIM Articles](https://webaim.org/articles/)
- [The A11Y Project](https://www.a11yproject.com/)
- [MDN Accessibility](https://developer.mozilla.org/en-US/docs/Web/Accessibility)
- [web.dev Accessibility](https://web.dev/learn/accessibility/)
- [Deque University](https://dequeuniversity.com/)
- [Smashing Magazine Accessibility](https://www.smashingmagazine.com/category/accessibility/)

### Research and Statistics

- [WebAIM Million Report](https://webaim.org/projects/million/) - Annual analysis of top 1,000,000 home pages
- [WebAIM Screen Reader Survey](https://webaim.org/projects/screenreadersurvey/) - User preferences and behaviors

---

*Last updated: December 2024*
*WCAG 2.2 version: December 12, 2024 update*
