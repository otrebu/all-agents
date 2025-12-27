# React Accessibility Patterns

Comprehensive reference for building accessible React applications. Covers focus management, ARIA attributes, keyboard navigation, semantic HTML, and testing strategies.

---

## Table of Contents

1. [Focus Management](#focus-management)
2. [Skip Links](#skip-links)
3. [Focus Trapping](#focus-trapping)
4. [ARIA Attributes in JSX](#aria-attributes-in-jsx)
5. [Live Regions](#live-regions)
6. [Accessible Forms](#accessible-forms)
7. [Accessible Modals and Dialogs](#accessible-modals-and-dialogs)
8. [Accessible Dropdowns and Menus](#accessible-dropdowns-and-menus)
9. [Keyboard Navigation Patterns](#keyboard-navigation-patterns)
10. [Semantic HTML in React](#semantic-html-in-react)
11. [The useId Hook](#the-useid-hook)
12. [eslint-plugin-jsx-a11y](#eslint-plugin-jsx-a11y)
13. [Testing Accessibility](#testing-accessibility)
14. [React-Specific Gotchas](#react-specific-gotchas)
15. [Accessible Component Libraries](#accessible-component-libraries)
16. [Resources](#resources)

---

## Focus Management

Focus management is critical for keyboard and screen reader users. When React components switch templates or content changes dynamically, focus can be lost, causing confusion.

### The Problem

When React replaces DOM elements (e.g., switching from view to edit mode), the previously focused element no longer exists. This leaves keyboard and assistive technology users without a visual or programmatic cue of where focus went.

### Using useRef for Focus Control

Create refs to target specific DOM elements:

```jsx
import { useRef, useState } from 'react';

function EditableItem({ name, onSave }) {
  const [isEditing, setIsEditing] = useState(false);
  const [newName, setNewName] = useState(name);

  const editFieldRef = useRef(null);
  const editButtonRef = useRef(null);

  return isEditing ? (
    <form onSubmit={(e) => { e.preventDefault(); onSave(newName); setIsEditing(false); }}>
      <input
        ref={editFieldRef}
        type="text"
        value={newName}
        onChange={(e) => setNewName(e.target.value)}
      />
      <button type="submit">Save</button>
    </form>
  ) : (
    <div>
      <span>{name}</span>
      <button ref={editButtonRef} onClick={() => setIsEditing(true)}>
        Edit <span className="visually-hidden">{name}</span>
      </button>
    </div>
  );
}
```

### Managing Focus Transitions with useEffect

```jsx
import { useEffect, useRef, useState } from 'react';

// Custom hook to track previous values
function usePrevious(value) {
  const ref = useRef();
  useEffect(() => {
    ref.current = value;
  });
  return ref.current;
}

function EditableItem({ name }) {
  const [isEditing, setIsEditing] = useState(false);
  const editFieldRef = useRef(null);
  const editButtonRef = useRef(null);

  // Track previous editing state
  const wasEditing = usePrevious(isEditing);

  useEffect(() => {
    if (!wasEditing && isEditing) {
      // Just entered edit mode - focus the input
      editFieldRef.current?.focus();
    } else if (wasEditing && !isEditing) {
      // Just exited edit mode - focus the edit button
      editButtonRef.current?.focus();
    }
  }, [wasEditing, isEditing]);

  // ... rest of component
}
```

### Focus After Content Deletion

When items are deleted from a list, focus the list heading:

```jsx
function TaskList({ tasks }) {
  const listHeadingRef = useRef(null);
  const prevTaskLength = usePrevious(tasks.length);

  useEffect(() => {
    if (tasks.length < prevTaskLength) {
      listHeadingRef.current?.focus();
    }
  }, [tasks.length, prevTaskLength]);

  return (
    <>
      <h2 id="list-heading" tabIndex={-1} ref={listHeadingRef}>
        {tasks.length} tasks remaining
      </h2>
      <ul>
        {tasks.map(task => <TaskItem key={task.id} {...task} />)}
      </ul>
    </>
  );
}
```

### Key Principles

- **tabIndex={-1}**: Makes elements focusable via JavaScript but not via Tab key
- **tabIndex={0}**: Adds element to natural tab order
- **Avoid tabIndex > 0**: Disrupts natural DOM order; move elements in DOM instead
- **Focus visible elements**: Always ensure focused elements have visible focus indicators

---

## Skip Links

Skip links allow keyboard users to bypass repetitive navigation and jump to main content.

### Basic Implementation

```jsx
function SkipLink() {
  return (
    <a
      href="#main-content"
      className="skip-link"
    >
      Skip to main content
    </a>
  );
}

function App() {
  return (
    <>
      <SkipLink />
      <header>
        <nav aria-label="Main navigation">
          {/* Navigation links */}
        </nav>
      </header>
      <main id="main-content" tabIndex={-1}>
        {/* Main content */}
      </main>
    </>
  );
}
```

### Skip Link Styling

```css
.skip-link {
  position: absolute;
  left: -9999px;
  z-index: 999;
  padding: 1em;
  background-color: #000;
  color: #fff;
  text-decoration: none;
}

.skip-link:focus {
  left: 50%;
  transform: translateX(-50%);
  top: 0;
}
```

### Using Reach UI SkipNav

```bash
npm install @reach/skip-nav
```

```jsx
import { SkipNavLink, SkipNavContent } from "@reach/skip-nav";
import "@reach/skip-nav/styles.css";

function App() {
  return (
    <>
      <SkipNavLink />
      <header>{/* Navigation */}</header>
      <SkipNavContent>
        <main>{/* Main content */}</main>
      </SkipNavContent>
    </>
  );
}
```

### WCAG Requirement

WCAG 2.4.1 requires a mechanism to skip blocks of content repeated on multiple pages.

---

## Focus Trapping

Focus trapping confines keyboard navigation within a modal or dialog, preventing users from accidentally interacting with background content.

### Using focus-trap-react

```bash
npm install focus-trap-react
```

```jsx
import FocusTrap from 'focus-trap-react';

function Modal({ isOpen, onClose, children }) {
  if (!isOpen) return null;

  return (
    <FocusTrap
      focusTrapOptions={{
        initialFocus: '#first-input',
        onDeactivate: onClose,
        clickOutsideDeactivates: true,
        escapeDeactivates: true,
        returnFocusOnDeactivate: true,
      }}
    >
      <div role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <h2 id="modal-title">Modal Title</h2>
        <input id="first-input" type="text" />
        <button onClick={onClose}>Close</button>
        {children}
      </div>
    </FocusTrap>
  );
}
```

### focus-trap-react Options

| Option | Description |
|--------|-------------|
| `initialFocus` | Element to focus when trap activates (CSS selector or element) |
| `fallbackFocus` | Fallback if no focusable elements found |
| `escapeDeactivates` | Deactivate trap on Escape key (default: true) |
| `clickOutsideDeactivates` | Deactivate on outside click |
| `returnFocusOnDeactivate` | Return focus to triggering element |
| `allowOutsideClick` | Allow clicks outside while trap is active |

### Manual Focus Trap Implementation

```jsx
function useFocusTrap(ref) {
  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const focusableElements = element.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    function handleKeyDown(e) {
      if (e.key !== 'Tab') return;

      if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault();
        lastElement.focus();
      } else if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault();
        firstElement.focus();
      }
    }

    element.addEventListener('keydown', handleKeyDown);
    firstElement?.focus();

    return () => element.removeEventListener('keydown', handleKeyDown);
  }, [ref]);
}
```

---

## ARIA Attributes in JSX

All `aria-*` HTML attributes are fully supported in JSX. Unlike most React props, ARIA attributes use hyphen-case (kebab-case), not camelCase.

### Syntax in JSX

```jsx
<input
  type="text"
  aria-label={labelText}
  aria-required="true"
  aria-invalid={hasError}
  aria-describedby="input-error"
  onChange={handleChange}
  value={inputValue}
/>
```

### Commonly Used ARIA Attributes

| Attribute | Purpose | Example |
|-----------|---------|---------|
| `aria-label` | Accessible name when no visible text | `aria-label="Close menu"` |
| `aria-labelledby` | References visible label element | `aria-labelledby="section-title"` |
| `aria-describedby` | References additional description | `aria-describedby="password-hint"` |
| `aria-hidden` | Hides from assistive technology | `aria-hidden="true"` |
| `aria-expanded` | Indicates expandable state | `aria-expanded={isOpen}` |
| `aria-controls` | References controlled element | `aria-controls="menu-list"` |
| `aria-haspopup` | Indicates popup/menu presence | `aria-haspopup="menu"` |
| `aria-pressed` | Toggle button state | `aria-pressed={isActive}` |
| `aria-disabled` | Indicates disabled state | `aria-disabled={!isEnabled}` |
| `aria-current` | Current item in set | `aria-current="page"` |
| `aria-live` | Live region announcements | `aria-live="polite"` |
| `aria-atomic` | Announce entire region | `aria-atomic="true"` |
| `aria-invalid` | Validation state | `aria-invalid={!!errors}` |
| `aria-required` | Required field | `aria-required="true"` |

### The First Rule of ARIA

> "No ARIA is better than bad ARIA."

**Prefer semantic HTML over ARIA.** Use native elements like `<button>`, `<nav>`, `<header>` instead of `<div role="button">`.

```jsx
// Preferred - semantic HTML
<button onClick={handleClick}>Submit</button>

// Avoid - div with role (requires extra work)
<div
  role="button"
  tabIndex={0}
  onClick={handleClick}
  onKeyDown={(e) => e.key === 'Enter' && handleClick()}
>
  Submit
</div>
```

### Dynamic ARIA with React State

```jsx
function Accordion({ title, children }) {
  const [isOpen, setIsOpen] = useState(false);
  const contentId = useId();

  return (
    <div>
      <button
        aria-expanded={isOpen}
        aria-controls={contentId}
        onClick={() => setIsOpen(!isOpen)}
      >
        {title}
      </button>
      <div
        id={contentId}
        hidden={!isOpen}
        role="region"
        aria-labelledby={/* button id */}
      >
        {children}
      </div>
    </div>
  );
}
```

### Avoid Redundant ARIA

```jsx
// Bad - redundant aria-label
<button aria-label="Submit form">Submit form</button>

// Good - let visible text be the accessible name
<button>Submit form</button>

// Good - use aria-label only when no visible text
<button aria-label="Close">
  <CloseIcon aria-hidden="true" />
</button>
```

---

## Live Regions

Live regions announce dynamic content changes to screen reader users.

### aria-live Values

| Value | Behavior |
|-------|----------|
| `polite` | Waits for user to be idle before announcing |
| `assertive` | Interrupts immediately (use sparingly) |
| `off` | No announcements |

### Basic Live Region

```jsx
function StatusMessage({ message }) {
  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      className="sr-only"
    >
      {message}
    </div>
  );
}
```

### Live Region Best Practices

1. **Region must exist before content changes**: Mount the container first, then update content

```jsx
function Announcer() {
  const [announcement, setAnnouncement] = useState('');

  // The empty div is already in the DOM
  // Screen readers will announce when content appears
  return (
    <div aria-live="polite" aria-atomic="true">
      {announcement}
    </div>
  );
}
```

2. **Use role shortcuts**:

```jsx
// role="status" implies aria-live="polite"
<div role="status">{statusMessage}</div>

// role="alert" implies aria-live="assertive"
<div role="alert">{errorMessage}</div>
```

3. **Form validation announcements**:

```jsx
function FormField({ error }) {
  return (
    <div>
      <input aria-invalid={!!error} aria-describedby="field-error" />
      {error && (
        <p id="field-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
```

### Announcer Hook Pattern

```jsx
import { useCallback, useState } from 'react';

function useAnnouncer() {
  const [message, setMessage] = useState('');

  const announce = useCallback((text, priority = 'polite') => {
    setMessage(''); // Clear first to ensure re-announcement
    setTimeout(() => setMessage(text), 100);
  }, []);

  const Announcer = () => (
    <div
      aria-live="polite"
      aria-atomic="true"
      className="sr-only"
    >
      {message}
    </div>
  );

  return { announce, Announcer };
}
```

---

## Accessible Forms

### Labeling Inputs

Always associate labels with inputs using `htmlFor`:

```jsx
function FormField({ label, id, type = 'text', ...props }) {
  return (
    <div>
      <label htmlFor={id}>{label}</label>
      <input id={id} type={type} {...props} />
    </div>
  );
}
```

### Using useId for Unique IDs

```jsx
import { useId } from 'react';

function FormField({ label }) {
  const id = useId();
  const errorId = `${id}-error`;
  const descriptionId = `${id}-description`;

  return (
    <div>
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        aria-describedby={`${descriptionId} ${errorId}`}
      />
      <p id={descriptionId}>Helper text here</p>
      <p id={errorId} role="alert"></p>
    </div>
  );
}
```

### Error Handling with ARIA

```jsx
function EmailInput({ register, errors }) {
  const id = useId();
  const errorId = `${id}-error`;

  return (
    <div>
      <label htmlFor={id}>Email</label>
      <input
        id={id}
        type="email"
        aria-invalid={errors.email ? 'true' : 'false'}
        aria-describedby={errors.email ? errorId : undefined}
        aria-required="true"
        {...register('email', { required: 'Email is required' })}
      />
      {errors.email && (
        <p id={errorId} role="alert">
          {errors.email.message}
        </p>
      )}
    </div>
  );
}
```

### Accessible Form with React Hook Form

```jsx
import { useForm } from 'react-hook-form';

function ContactForm() {
  const { register, handleSubmit, formState: { errors } } = useForm();

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <div>
        <label htmlFor="name">Name</label>
        <input
          id="name"
          aria-invalid={!!errors.name}
          aria-describedby={errors.name ? 'name-error' : undefined}
          {...register('name', { required: 'Name is required' })}
        />
        {errors.name && (
          <p id="name-error" role="alert">{errors.name.message}</p>
        )}
      </div>

      <div>
        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          aria-invalid={!!errors.email}
          aria-describedby={errors.email ? 'email-error' : undefined}
          {...register('email', {
            required: 'Email is required',
            pattern: {
              value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
              message: 'Invalid email address'
            }
          })}
        />
        {errors.email && (
          <p id="email-error" role="alert">{errors.email.message}</p>
        )}
      </div>

      <button type="submit">Submit</button>
    </form>
  );
}
```

### Grouping Related Fields

```jsx
<fieldset>
  <legend>Shipping Address</legend>
  <div>
    <label htmlFor="street">Street</label>
    <input id="street" />
  </div>
  <div>
    <label htmlFor="city">City</label>
    <input id="city" />
  </div>
</fieldset>
```

### Form Best Practices

- **Never rely on placeholders alone** - they disappear and have poor screen reader support
- **Use descriptive button text** - "Submit Application" instead of "Submit"
- **Mark required fields** - both visually and with `aria-required`
- **Announce errors immediately** - use `role="alert"` for validation messages
- **Avoid tooltips for essential info** - not accessible on touch devices

---

## Accessible Modals and Dialogs

### Essential Modal Requirements

1. **Focus moves to dialog on open**
2. **Focus is trapped within dialog**
3. **Escape key closes dialog**
4. **Focus returns to trigger on close**
5. **Background content is inert**
6. **Proper ARIA attributes**

### Manual Modal Implementation

```jsx
import { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';

function Modal({ isOpen, onClose, title, children }) {
  const modalRef = useRef(null);
  const triggerRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      // Store trigger element
      triggerRef.current = document.activeElement;
      // Focus modal
      modalRef.current?.focus();
      // Prevent body scroll
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleClose = useCallback(() => {
    onClose();
    // Return focus to trigger
    triggerRef.current?.focus();
  }, [onClose]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') {
      handleClose();
    }
  }, [handleClose]);

  if (!isOpen) return null;

  return createPortal(
    <>
      <div
        className="modal-backdrop"
        onClick={handleClose}
        aria-hidden="true"
      />
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        tabIndex={-1}
        onKeyDown={handleKeyDown}
      >
        <h2 id="modal-title">{title}</h2>
        {children}
        <button onClick={handleClose}>Close</button>
      </div>
    </>,
    document.body
  );
}
```

### Using Radix UI Dialog

```bash
npm install @radix-ui/react-dialog
```

```jsx
import * as Dialog from '@radix-ui/react-dialog';

function AccessibleDialog() {
  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>
        <button>Open Dialog</button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content className="dialog-content">
          <Dialog.Title>Dialog Title</Dialog.Title>
          <Dialog.Description>
            Optional description for screen readers.
          </Dialog.Description>

          {/* Dialog content */}

          <Dialog.Close asChild>
            <button>Close</button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
```

### Using Headless UI Dialog

```bash
npm install @headlessui/react
```

```jsx
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react';

function AccessibleDialog({ isOpen, onClose }) {
  return (
    <Dialog open={isOpen} onClose={onClose}>
      <div className="dialog-backdrop" aria-hidden="true" />
      <div className="dialog-container">
        <DialogPanel>
          <DialogTitle>Deactivate account</DialogTitle>
          <p>Are you sure you want to deactivate your account?</p>

          <button onClick={onClose}>Cancel</button>
          <button onClick={handleDeactivate}>Deactivate</button>
        </DialogPanel>
      </div>
    </Dialog>
  );
}
```

### Customizing Focus Behavior (Radix)

```jsx
<Dialog.Content
  onOpenAutoFocus={(event) => {
    // Focus a specific element instead of first focusable
    event.preventDefault();
    customInputRef.current?.focus();
  }}
  onCloseAutoFocus={(event) => {
    // Customize where focus returns
    event.preventDefault();
    alternateButtonRef.current?.focus();
  }}
>
  {/* Content */}
</Dialog.Content>
```

---

## Accessible Dropdowns and Menus

### Keyboard Navigation Requirements

| Key | Action |
|-----|--------|
| Enter/Space | Open menu, activate item |
| Escape | Close menu |
| Arrow Down | Next item |
| Arrow Up | Previous item |
| Home | First item |
| End | Last item |
| A-Z | Jump to item starting with letter |

### Using Headless UI Menu

```jsx
import { Menu, MenuButton, MenuItems, MenuItem } from '@headlessui/react';

function DropdownMenu() {
  return (
    <Menu>
      <MenuButton>Options</MenuButton>
      <MenuItems>
        <MenuItem>
          {({ active }) => (
            <button className={active ? 'bg-blue-500' : ''}>
              Edit
            </button>
          )}
        </MenuItem>
        <MenuItem>
          {({ active }) => (
            <button className={active ? 'bg-blue-500' : ''}>
              Delete
            </button>
          )}
        </MenuItem>
      </MenuItems>
    </Menu>
  );
}
```

### Using React Aria Menu

```jsx
import { MenuTrigger, Button, Menu, MenuItem } from 'react-aria-components';

function DropdownMenu() {
  return (
    <MenuTrigger>
      <Button aria-label="Actions">
        <MoreIcon />
      </Button>
      <Menu onAction={(key) => alert(key)}>
        <MenuItem id="edit">Edit</MenuItem>
        <MenuItem id="duplicate">Duplicate</MenuItem>
        <MenuItem id="delete">Delete</MenuItem>
      </Menu>
    </MenuTrigger>
  );
}
```

### Menu with Sections and Descriptions

```jsx
<Menu>
  <MenuSection>
    <Header>Actions</Header>
    <MenuItem textValue="Copy">
      <Text slot="label">Copy</Text>
      <Text slot="description">Copy to clipboard</Text>
      <Keyboard>Cmd+C</Keyboard>
    </MenuItem>
    <MenuItem textValue="Paste">
      <Text slot="label">Paste</Text>
      <Text slot="description">Paste from clipboard</Text>
      <Keyboard>Cmd+V</Keyboard>
    </MenuItem>
  </MenuSection>
  <Separator />
  <MenuSection>
    <Header>Danger Zone</Header>
    <MenuItem id="delete">Delete</MenuItem>
  </MenuSection>
</Menu>
```

### Important: No Interactive Elements in Menu Items

> "Interactive elements (e.g. buttons) within menu items are not allowed. This will break keyboard and screen reader navigation."

---

## Keyboard Navigation Patterns

### Roving Tabindex

For grouped controls like toolbars, use roving tabindex so the group is a single Tab stop, with arrow keys navigating within.

```jsx
import { useState, useRef } from 'react';

function Toolbar({ items }) {
  const [focusedIndex, setFocusedIndex] = useState(0);
  const itemRefs = useRef([]);

  const handleKeyDown = (e, index) => {
    let newIndex = index;

    switch (e.key) {
      case 'ArrowRight':
        newIndex = (index + 1) % items.length;
        break;
      case 'ArrowLeft':
        newIndex = (index - 1 + items.length) % items.length;
        break;
      case 'Home':
        newIndex = 0;
        break;
      case 'End':
        newIndex = items.length - 1;
        break;
      default:
        return;
    }

    e.preventDefault();
    setFocusedIndex(newIndex);
    itemRefs.current[newIndex]?.focus();
  };

  return (
    <div role="toolbar" aria-label="Formatting options">
      {items.map((item, index) => (
        <button
          key={item.id}
          ref={(el) => (itemRefs.current[index] = el)}
          tabIndex={focusedIndex === index ? 0 : -1}
          onKeyDown={(e) => handleKeyDown(e, index)}
          onFocus={() => setFocusedIndex(index)}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
```

### Using react-roving-tabindex

```bash
npm install react-roving-tabindex
```

```jsx
import { RovingTabIndexProvider, useRovingTabIndex } from 'react-roving-tabindex';

function ToolbarButton({ children, disabled }) {
  const ref = useRef(null);
  const [tabIndex, focused, handleKeyDown, handleClick] = useRovingTabIndex(
    ref,
    disabled
  );

  return (
    <button
      ref={ref}
      tabIndex={tabIndex}
      onKeyDown={handleKeyDown}
      onClick={handleClick}
    >
      {children}
    </button>
  );
}

function Toolbar() {
  return (
    <RovingTabIndexProvider>
      <div role="toolbar">
        <ToolbarButton>Bold</ToolbarButton>
        <ToolbarButton>Italic</ToolbarButton>
        <ToolbarButton>Underline</ToolbarButton>
      </div>
    </RovingTabIndexProvider>
  );
}
```

### Keyboard-Accessible Click Handlers

When using click handlers on non-button elements, add keyboard support:

```jsx
// Bad - not keyboard accessible
<div onClick={handleClick}>Click me</div>

// Good - keyboard accessible
<div
  role="button"
  tabIndex={0}
  onClick={handleClick}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  }}
>
  Click me
</div>

// Best - use a button
<button onClick={handleClick}>Click me</button>
```

### Handling Outside Clicks Accessibly

Click-outside patterns break keyboard accessibility. Use blur/focus instead:

```jsx
function Dropdown({ trigger, children }) {
  const [isOpen, setIsOpen] = useState(false);
  const timeoutRef = useRef(null);

  const handleBlur = () => {
    timeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 0);
  };

  const handleFocus = () => {
    clearTimeout(timeoutRef.current);
  };

  return (
    <div onBlur={handleBlur} onFocus={handleFocus}>
      <button
        aria-haspopup="true"
        aria-expanded={isOpen}
        onClick={() => setIsOpen(!isOpen)}
      >
        {trigger}
      </button>
      {isOpen && <div role="menu">{children}</div>}
    </div>
  );
}
```

---

## Semantic HTML in React

### Landmark Elements

Use semantic elements that map to ARIA landmarks:

| Element | ARIA Role | Purpose |
|---------|-----------|---------|
| `<header>` | `banner` | Page header (when direct child of body) |
| `<nav>` | `navigation` | Navigation sections |
| `<main>` | `main` | Primary page content (only one) |
| `<aside>` | `complementary` | Related content |
| `<footer>` | `contentinfo` | Page footer (when direct child of body) |
| `<section>` | `region` | Generic section (needs accessible name) |
| `<article>` | `article` | Self-contained content |
| `<form>` | `form` | Form (when has accessible name) |

```jsx
function Layout({ children }) {
  return (
    <>
      <header>
        <nav aria-label="Main">
          {/* Primary navigation */}
        </nav>
      </header>
      <main>{children}</main>
      <aside aria-label="Related content">
        {/* Sidebar */}
      </aside>
      <footer>
        <nav aria-label="Footer">
          {/* Footer navigation */}
        </nav>
      </footer>
    </>
  );
}
```

### React Fragments for Semantic Structure

Use Fragments to avoid breaking semantic HTML with wrapper divs:

```jsx
// Bad - breaks table semantics
function TableRow({ data }) {
  return (
    <div> {/* This breaks the table! */}
      <tr>
        <td>{data.name}</td>
        <td>{data.value}</td>
      </tr>
    </div>
  );
}

// Good - Fragment preserves structure
function TableRow({ data }) {
  return (
    <>
      <tr>
        <td>{data.name}</td>
        <td>{data.value}</td>
      </tr>
    </>
  );
}

// Good for description lists
function DefinitionItem({ term, description }) {
  return (
    <>
      <dt>{term}</dt>
      <dd>{description}</dd>
    </>
  );
}
```

### Heading Hierarchy

Maintain proper heading levels (h1-h6) without skipping:

```jsx
// Bad - skips h2
<main>
  <h1>Page Title</h1>
  <h3>Section Title</h3> {/* Should be h2 */}
</main>

// Good - proper hierarchy
<main>
  <h1>Page Title</h1>
  <section>
    <h2>Section Title</h2>
    <h3>Subsection Title</h3>
  </section>
</main>
```

### Accessible Tables

```jsx
function DataTable({ data, caption }) {
  return (
    <table>
      <caption>{caption}</caption>
      <thead>
        <tr>
          <th scope="col">Name</th>
          <th scope="col">Email</th>
          <th scope="col">Role</th>
        </tr>
      </thead>
      <tbody>
        {data.map((row) => (
          <tr key={row.id}>
            <th scope="row">{row.name}</th>
            <td>{row.email}</td>
            <td>{row.role}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

---

## The useId Hook

React 18's `useId` generates unique IDs for accessibility attributes, safe for SSR.

### Basic Usage

```jsx
import { useId } from 'react';

function FormField({ label, type = 'text' }) {
  const id = useId();

  return (
    <div>
      <label htmlFor={id}>{label}</label>
      <input id={id} type={type} />
    </div>
  );
}
```

### Multiple Related IDs

```jsx
function FormFieldWithError({ label, error, hint }) {
  const id = useId();
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;

  return (
    <div>
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        aria-describedby={`${hint ? hintId : ''} ${error ? errorId : ''}`.trim() || undefined}
        aria-invalid={!!error}
      />
      {hint && <p id={hintId}>{hint}</p>}
      {error && <p id={errorId} role="alert">{error}</p>}
    </div>
  );
}
```

### Why useId Over Hardcoded IDs

- **Component reuse**: Same component rendered multiple times needs unique IDs
- **SSR compatibility**: IDs match between server and client
- **No collisions**: React guarantees uniqueness within the tree

### Rules

- Call at top level of component (not in loops/conditions)
- Do not use for list keys (use data IDs instead)
- IDs are stable across re-renders

---

## eslint-plugin-jsx-a11y

Static AST checker for accessibility issues in JSX.

### Installation

```bash
npm install eslint-plugin-jsx-a11y --save-dev
```

### Configuration (Flat Config - ESLint 9+)

```javascript
// eslint.config.js
import jsxA11y from 'eslint-plugin-jsx-a11y';

export default [
  jsxA11y.flatConfigs.recommended,
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    rules: {
      // Customize rules as needed
      'jsx-a11y/no-autofocus': 'warn',
    },
  },
];
```

### Configuration (Legacy .eslintrc)

```json
{
  "plugins": ["jsx-a11y"],
  "extends": ["plugin:jsx-a11y/recommended"],
  "rules": {
    "jsx-a11y/no-autofocus": "warn"
  }
}
```

### Key Rules

| Rule | Purpose |
|------|---------|
| `alt-text` | Images must have alt text |
| `anchor-has-content` | Anchors must have content |
| `click-events-have-key-events` | onClick needs keyboard handler |
| `heading-has-content` | Headings must have content |
| `html-has-lang` | HTML element needs lang attribute |
| `interactive-supports-focus` | Interactive elements must be focusable |
| `label-has-associated-control` | Labels must be associated with inputs |
| `mouse-events-have-key-events` | Mouse events need keyboard equivalents |
| `no-noninteractive-element-interactions` | Non-interactive elements shouldn't have handlers |
| `no-noninteractive-tabindex` | Only interactive elements should have tabindex |
| `no-static-element-interactions` | Static elements with handlers need roles |
| `role-has-required-aria-props` | ARIA roles must have required properties |
| `tabindex-no-positive` | tabIndex should not be positive |

### Custom Component Mapping

```json
{
  "settings": {
    "jsx-a11y": {
      "components": {
        "CustomButton": "button",
        "CustomInput": "input",
        "CustomLink": "a"
      },
      "polymorphicPropName": "as"
    }
  }
}
```

---

## Testing Accessibility

### React Testing Library Approach

Testing Library encourages testing through accessibility interfaces:

```jsx
import { render, screen } from '@testing-library/react';

test('button is accessible', () => {
  render(<Button>Submit</Button>);

  // Query by role - tests accessibility
  expect(screen.getByRole('button', { name: /submit/i })).toBeInTheDocument();
});

test('form field has accessible label', () => {
  render(<EmailInput label="Email address" />);

  // getByLabelText verifies label association
  expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
});
```

### Common Queries by Role

```jsx
// Buttons
screen.getByRole('button', { name: /submit/i });

// Links
screen.getByRole('link', { name: /learn more/i });

// Form controls
screen.getByRole('textbox', { name: /email/i });
screen.getByRole('checkbox', { name: /agree/i });
screen.getByRole('combobox', { name: /country/i });

// Headings
screen.getByRole('heading', { name: /welcome/i, level: 1 });

// Regions
screen.getByRole('navigation', { name: /main/i });
screen.getByRole('dialog', { name: /confirm/i });

// States
screen.getByRole('button', { pressed: true });
screen.getByRole('checkbox', { checked: true });
```

### Using jest-axe for Automated Checks

```bash
npm install jest-axe --save-dev
```

```jsx
import { axe, toHaveNoViolations } from 'jest-axe';

expect.extend(toHaveNoViolations);

test('component has no accessibility violations', async () => {
  const { container } = render(<MyComponent />);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});
```

### @axe-core/react for Development

```bash
npm install @axe-core/react --save-dev
```

```jsx
// In development entry point
if (process.env.NODE_ENV === 'development') {
  import('@axe-core/react').then((axe) => {
    axe.default(React, ReactDOM, 1000);
  });
}
```

Violations appear in browser DevTools console during development.

### Testing Focus Management

```jsx
test('focus moves to modal when opened', async () => {
  const { getByRole, getByText } = render(<ModalExample />);

  // Open modal
  await userEvent.click(getByText('Open Modal'));

  // Check focus moved to modal
  expect(getByRole('dialog')).toHaveFocus();
});

test('focus returns to trigger when modal closes', async () => {
  const { getByRole, getByText } = render(<ModalExample />);
  const openButton = getByText('Open Modal');

  await userEvent.click(openButton);
  await userEvent.click(getByText('Close'));

  expect(openButton).toHaveFocus();
});
```

### Screen Reader Testing

Automated tests catch 30-50% of issues. Manual testing with screen readers is essential:

| Screen Reader | Platform | Browser |
|---------------|----------|---------|
| NVDA | Windows | Firefox, Chrome |
| JAWS | Windows | Chrome, Edge |
| VoiceOver | macOS/iOS | Safari |
| TalkBack | Android | Chrome |

---

## React-Specific Gotchas

### 1. Click Handlers on Non-Interactive Elements

```jsx
// Problematic - not keyboard accessible
<div onClick={handleClick}>Click me</div>

// Solution - add keyboard support or use button
<button onClick={handleClick}>Click me</button>
```

### 2. Missing Labels on Inputs

```jsx
// Problematic
<input type="text" placeholder="Enter name" />

// Solution
<label htmlFor="name">Name</label>
<input id="name" type="text" />
```

### 3. Using Divs Instead of Semantic Elements

```jsx
// Problematic
<div className="nav">{/* links */}</div>

// Solution
<nav aria-label="Main">{/* links */}</nav>
```

### 4. Fragments Breaking Structure

```jsx
// Problematic - Fragment between ul and li
function ListItems() {
  return (
    <div> {/* Breaks list semantics */}
      <li>Item 1</li>
      <li>Item 2</li>
    </div>
  );
}

// Solution
function ListItems() {
  return (
    <>
      <li>Item 1</li>
      <li>Item 2</li>
    </>
  );
}
```

### 5. Client-Side Routing Without Announcements

```jsx
// In your router setup
useEffect(() => {
  // Announce page changes to screen readers
  const announcement = document.getElementById('route-announcer');
  if (announcement) {
    announcement.textContent = `Navigated to ${document.title}`;
  }
}, [location]);

// In your layout
<div id="route-announcer" aria-live="polite" className="sr-only" />
```

### 6. Images Without Alt Text

```jsx
// Problematic
<img src="logo.png" />

// Decorative image
<img src="decorative.png" alt="" />

// Meaningful image
<img src="chart.png" alt="Sales increased 50% in Q4" />
```

### 7. Missing Focus Styles

```css
/* Never do this without replacement */
*:focus { outline: none; }

/* Provide visible focus indicators */
*:focus-visible {
  outline: 2px solid #005fcc;
  outline-offset: 2px;
}
```

### 8. autoFocus Misuse

`autoFocus` can disorient screen reader users. Use sparingly and only when it improves UX:

```jsx
// Acceptable - search page
<input autoFocus type="search" aria-label="Search" />

// Problematic - on every page load
<input autoFocus type="text" /> {/* Avoid */}
```

### 9. Color as Only Indicator

```jsx
// Problematic - relies only on color
<span style={{ color: 'red' }}>Error</span>

// Solution - add icon and/or text
<span style={{ color: 'red' }}>
  <ErrorIcon aria-hidden="true" /> Error: Invalid email
</span>
```

### 10. Dynamic Content Without Announcements

```jsx
// Problematic - screen readers won't notice
{isLoading && <Spinner />}

// Solution - announce loading state
<div aria-live="polite">
  {isLoading && <span>Loading...</span>}
</div>
```

---

## Accessible Component Libraries

### Radix UI Primitives

Unstyled, accessible primitives with full keyboard support and ARIA.

```bash
npm install @radix-ui/react-dialog @radix-ui/react-dropdown-menu
```

Key features:
- WAI-ARIA compliant
- Full keyboard navigation
- Focus management built-in
- Customizable focus behavior

### Headless UI

Completely unstyled, accessible components for Tailwind CSS.

```bash
npm install @headlessui/react
```

Components: Dialog, Disclosure, Listbox, Menu, Popover, RadioGroup, Switch, Tabs, Combobox

### React Aria (Adobe)

Low-level hooks and components implementing WAI-ARIA patterns.

```bash
npm install react-aria-components
```

Features:
- Internationalization built-in
- Comprehensive keyboard support
- Touch device support
- High-quality ARIA implementation

### Reach UI

Accessible foundation components from React Training.

```bash
npm install @reach/dialog @reach/menu-button
```

---

## Resources

### Official Documentation

- [React Accessibility Docs](https://legacy.reactjs.org/docs/accessibility.html)
- [MDN ARIA Documentation](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA)
- [WAI-ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)

### Tools

- [eslint-plugin-jsx-a11y](https://github.com/jsx-eslint/eslint-plugin-jsx-a11y) - Static JSX linting
- [axe-core](https://github.com/dequelabs/axe-core) - Accessibility testing engine
- [@axe-core/react](https://www.npmjs.com/package/@axe-core/react) - React development auditing
- [jest-axe](https://github.com/nickcolley/jest-axe) - Jest accessibility matchers

### Component Libraries

- [Radix UI](https://www.radix-ui.com/) - Unstyled accessible primitives
- [Headless UI](https://headlessui.com/) - Tailwind-focused accessible components
- [React Aria](https://react-aria.adobe.com/) - Adobe's accessibility hooks/components
- [Reach UI](https://reach.tech/) - Accessible React components

### Learning Resources

- [The A11Y Project](https://www.a11yproject.com/) - Community-driven accessibility resource
- [WebAIM](https://webaim.org/) - Web accessibility organization
- [Inclusive Components](https://inclusive-components.design/) - Pattern library
- [Deque University](https://dequeuniversity.com/) - Accessibility training

### Testing Tools

- [WAVE](https://wave.webaim.org/) - Web accessibility evaluation
- [Lighthouse](https://developers.google.com/web/tools/lighthouse) - Chrome DevTools auditing
- [axe DevTools](https://www.deque.com/axe/devtools/) - Browser extension

### Screen Readers

- [NVDA](https://www.nvaccess.org/) - Free Windows screen reader
- [VoiceOver](https://www.apple.com/accessibility/vision/) - macOS/iOS built-in
- [JAWS](https://www.freedomscientific.com/products/software/jaws/) - Windows commercial
- [ChromeVox](https://www.chromevox.com/) - Chrome extension

---

## Quick Reference Checklist

### Before Shipping

- [ ] All images have appropriate alt text
- [ ] All form inputs have associated labels
- [ ] Color is not the only means of conveying information
- [ ] Focus indicators are visible
- [ ] Page has proper heading hierarchy
- [ ] Interactive elements are keyboard accessible
- [ ] Modals trap focus and return focus on close
- [ ] Dynamic content changes are announced
- [ ] Skip links are provided for navigation
- [ ] Document language is set
- [ ] No positive tabindex values
- [ ] ARIA attributes are used correctly
- [ ] axe/Lighthouse reports no critical issues
- [ ] Tested with at least one screen reader
