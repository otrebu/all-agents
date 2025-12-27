# shadcn/ui Research

> Comprehensive documentation on shadcn/ui - a collection of re-usable components for React applications.
>
> Last updated: December 2024

## Table of Contents

1. [Overview](#overview)
2. [Setup](#setup)
3. [Installation](#installation)
4. [Theming](#theming)
5. [Components](#components)
6. [Customization](#customization)
7. [Form Integration](#form-integration)
8. [Radix Primitives](#radix-primitives)
9. [Accessibility](#accessibility)
10. [Best Practices](#best-practices)

---

## Overview

### What is shadcn/ui?

**"This is not a component library. It is how you build your component library."**

shadcn/ui is a collection of beautifully designed, re-usable components that you **copy and paste** directly into your project. Unlike traditional component libraries:

- **Not an npm package** - You don't install it as a dependency
- **Full ownership** - The code lives in your codebase, giving you 100% control
- **CLI-based** - A Command Line Interface generates component files in your project
- **Customizable** - Edit the component code directly instead of fighting overrides

### Core Philosophy

The "copy-paste" approach is revolutionary because of **ownership**. Since the component code lives in your own codebase:

- You can edit a button's behavior by modifying the button code directly
- No need to override styles or wrap components
- AI tools can read, understand, and improve your components
- No version conflicts or dependency hell

### Built With

shadcn/ui components are built using two best-in-class tools:

| Technology | Purpose |
|------------|---------|
| **Radix UI** | Handles complex logic, accessibility, behavior (dropdown state, dialog overlays, ARIA attributes) |
| **Tailwind CSS** | All styling via utility-first approach |

### Framework Support

- Next.js
- Gatsby
- Remix
- Astro
- Laravel
- Vite

---

## Setup

### Prerequisites

- Node.js 18+
- A React-based project (Next.js, Vite, etc.)
- Tailwind CSS configured

### Initialize shadcn/ui

Run the initialization command:

```bash
npx shadcn@latest init
```

You'll be prompted with configuration questions that create a `components.json` file.

### components.json Configuration

The `components.json` file in your project root controls how shadcn/ui works:

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york",
  "rsc": false,
  "tsx": true,
  "tailwind": {
    "config": "",
    "css": "src/styles/globals.css",
    "baseColor": "neutral",
    "cssVariables": true,
    "prefix": ""
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks"
  },
  "iconLibrary": "lucide"
}
```

### Key Configuration Options

| Option | Description |
|--------|-------------|
| `style` | Visual style for components. Use `new-york` (default style is deprecated) |
| `rsc` | Enable React Server Components support |
| `tsx` | Use TypeScript (`.tsx`) or JavaScript (`.jsx`) |
| `tailwind.config` | Path to `tailwind.config.js`. Leave blank for Tailwind v4 |
| `tailwind.cssVariables` | Use CSS variables (recommended) or utility classes for theming |
| `aliases` | Import path aliases matching your `tsconfig.json` |
| `iconLibrary` | Icon library to use (`lucide` is default) |

### 2025 Updates

- **Tailwind v4 Support**: Full support for `@theme` directive and `@theme inline` option
- **React 19 Compatibility**: All components updated
- **Resolve Anywhere**: Registries can place files anywhere in an app
- **Local Files**: CLI supports local JSON files for components

---

## Installation

### Adding Components

Use the `add` command to add components to your project:

```bash
# Add a single component
npx shadcn@latest add button

# Add multiple components
npx shadcn@latest add button dialog form table

# Add all components
npx shadcn@latest add -a
```

### CLI Options

| Flag | Description |
|------|-------------|
| `-a, --all` | Add all available components |
| `-o, --overwrite` | Overwrite existing files |
| `-y, --yes` | Skip confirmation prompt |

### Registry Support (CLI 3.0+)

Install from multiple registries:

```bash
# From built-in registries
npx shadcn@latest add @v0/dashboard

# From custom registries
npx shadcn@latest add @acme/button @lib/utils @ai/prompt
```

Configure registries in `components.json`:

```json
{
  "registries": {
    "@v0": "https://v0.dev/chat/b/{name}",
    "@acme": "https://registry.acme.com/{name}.json"
  }
}
```

### Component Location

Components are placed in your configured `ui` directory (typically `src/components/ui/`):

```
src/
├── components/
│   └── ui/
│       ├── button.tsx
│       ├── dialog.tsx
│       ├── form.tsx
│       └── ...
├── lib/
│   └── utils.ts
└── ...
```

---

## Theming

### CSS Variables Approach (Recommended)

shadcn/ui uses CSS variables for theming, enabling quick global updates without modifying individual components.

Enable in `components.json`:

```json
{
  "tailwind": {
    "cssVariables": true
  }
}
```

### Base CSS Variables

```css
:root {
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  --primary: 222.2 47.4% 11.2%;
  --primary-foreground: 210 40% 98%;
  --secondary: 210 40% 96.1%;
  --secondary-foreground: 222.2 47.4% 11.2%;
  --muted: 210 40% 96.1%;
  --muted-foreground: 215.4 16.3% 46.9%;
  --accent: 210 40% 96.1%;
  --accent-foreground: 222.2 47.4% 11.2%;
  --destructive: 0 84.2% 60.2%;
  --destructive-foreground: 210 40% 98%;
  --border: 214.3 31.8% 91.4%;
  --input: 214.3 31.8% 91.4%;
  --ring: 222.2 84% 4.9%;
  --radius: 0.5rem;
}

.dark {
  --background: 222.2 84% 4.9%;
  --foreground: 210 40% 98%;
  /* ... dark mode values */
}
```

### Tailwind v4 Theming (2025)

With Tailwind v4, use the `@theme inline` directive and OKLCH color space:

```css
:root {
  --warning: oklch(0.84 0.16 84);
  --warning-foreground: oklch(0.28 0.07 46);
}

.dark {
  --warning: oklch(0.41 0.11 46);
  --warning-foreground: oklch(0.99 0.02 95);
}

@theme inline {
  --color-warning: var(--warning);
  --color-warning-foreground: var(--warning-foreground);
}
```

### Dark Mode

For dark mode, define variables under the `.dark` class. Components automatically adapt based on the presence of this class on a parent element.

### Naming Convention

shadcn/ui uses a `background`/`foreground` convention:

- `--primary` for background color
- `--primary-foreground` for text color on that background

Usage in Tailwind:
```html
<div class="bg-primary text-primary-foreground">...</div>
```

---

## Components

### Available Components

shadcn/ui provides 50+ components:

| Category | Components |
|----------|------------|
| **Layout** | Card, Separator, Aspect Ratio, Resizable, Scroll Area |
| **Forms** | Button, Input, Textarea, Checkbox, Radio Group, Select, Switch, Slider, Form, Field |
| **Feedback** | Alert, Toast, Sonner, Progress, Skeleton, Spinner |
| **Overlay** | Dialog, Sheet, Drawer, Popover, Tooltip, Hover Card |
| **Navigation** | Tabs, Navigation Menu, Menubar, Breadcrumb, Pagination, Sidebar |
| **Data Display** | Table, Data Table, Avatar, Badge, Calendar |
| **Data Entry** | Combobox, Command, Date Picker, Input OTP |

### Button Component

The Button is a great example of shadcn/ui's variant system:

```tsx
import { Button } from "@/components/ui/button"

// Variants
<Button>Default</Button>
<Button variant="secondary">Secondary</Button>
<Button variant="destructive">Destructive</Button>
<Button variant="outline">Outline</Button>
<Button variant="ghost">Ghost</Button>
<Button variant="link">Link</Button>

// Sizes
<Button size="sm">Small</Button>
<Button size="default">Default</Button>
<Button size="lg">Large</Button>
<Button size="icon">Icon</Button>
```

### Dialog Component

```tsx
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

<Dialog>
  <DialogTrigger asChild>
    <Button>Open Dialog</Button>
  </DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Dialog Title</DialogTitle>
      <DialogDescription>
        Dialog description text here.
      </DialogDescription>
    </DialogHeader>
    {/* Dialog content */}
  </DialogContent>
</Dialog>
```

### Data Table

The Data Table uses `@tanstack/react-table` for advanced features:

```tsx
import { DataTable } from "@/components/ui/data-table"
import { columns } from "./columns"

<DataTable columns={columns} data={data} />
```

Features include:
- Sorting
- Filtering
- Pagination
- Row selection
- Column visibility

---

## Customization

### The `cn` Utility Function

The `cn` function is central to shadcn/ui customization:

```typescript
// lib/utils.ts
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

**What it does:**

1. `clsx` - Conditionally constructs className strings
2. `tailwind-merge` - Resolves Tailwind class conflicts

**Usage:**

```tsx
function Button({ className, children }) {
  return (
    <button className={cn('bg-blue-700 px-4 py-2', className)}>
      {children}
    </button>
  );
}

// Caller can override styles
<Button className="bg-red-500">Click Me</Button>
// Result: "bg-red-500 px-4 py-2" (bg-blue-700 is replaced)
```

### Class Variance Authority (CVA)

Components use CVA for type-safe variants:

```tsx
import { cva, type VariantProps } from "class-variance-authority"

const buttonVariants = cva(
  // Base styles
  "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-input bg-background hover:bg-accent",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export function Button({ className, variant, size, ...props }: ButtonProps) {
  return (
    <button
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}
```

### Adding Custom Variants

Extend components by modifying the CVA call:

```tsx
const buttonVariants = cva(
  "...",
  {
    variants: {
      variant: {
        // Existing variants...
        gradient: "bg-gradient-to-r from-purple-500 to-pink-500 text-white",
        glass: "bg-white/10 backdrop-blur-md border border-white/20",
      },
      // ...
    },
  }
)
```

### Three-Layer Architecture

shadcn/ui is built on three layers:

1. **CSS Variables** - Design tokens (colors, spacing, typography)
2. **Tailwind Utilities** - Classes applying variables to components
3. **Component Logic** - React code handling behavior

Most customization happens at layers 1 and 2.

---

## Form Integration

### React Hook Form + Zod

shadcn/ui integrates seamlessly with React Hook Form and Zod:

#### Installation

```bash
npm install react-hook-form zod @hookform/resolvers
npx shadcn@latest add form
```

#### Basic Form Example

```tsx
"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"

// 1. Define schema
const formSchema = z.object({
  username: z.string().min(2, {
    message: "Username must be at least 2 characters.",
  }),
  email: z.string().email({
    message: "Please enter a valid email.",
  }),
})

// 2. Infer types
type FormValues = z.infer<typeof formSchema>

export function ProfileForm() {
  // 3. Initialize form
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: "",
      email: "",
    },
  })

  // 4. Submit handler
  function onSubmit(values: FormValues) {
    console.log(values)
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="username"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Username</FormLabel>
              <FormControl>
                <Input placeholder="johndoe" {...field} />
              </FormControl>
              <FormDescription>
                Your public display name.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input placeholder="john@example.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit">Submit</Button>
      </form>
    </Form>
  )
}
```

#### Advanced Validation with Zod

```tsx
const formSchema = z.object({
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Must contain uppercase letter")
    .regex(/[0-9]/, "Must contain number"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
})

// Async validation
const usernameSchema = z.string().refine(
  async (username) => {
    const exists = await checkUsernameExists(username)
    return !exists
  },
  { message: "Username already taken" }
)
```

### Alternative: Field Component

As of 2025, shadcn/ui recommends the `<Field />` component for simpler forms:

```tsx
import { Field } from "@/components/ui/field"
import { Input } from "@/components/ui/input"

<Field name="email" label="Email">
  <Input type="email" />
</Field>
```

---

## Radix Primitives

### What is Radix UI?

Radix UI provides unstyled, accessible primitives that power shadcn/ui. Maintained by WorkOS, Radix handles:

- Complex state management
- Keyboard navigation
- Focus management
- ARIA attributes
- Screen reader support

### Key Primitives Used

| Primitive | shadcn/ui Component | Features |
|-----------|---------------------|----------|
| Dialog | Dialog, Sheet, Drawer | Focus trapping, escape to close, click outside |
| Dropdown Menu | Dropdown Menu | Arrow key navigation, typeahead, submenus |
| Select | Select | Keyboard selection, search, groups |
| Popover | Popover | Collision detection, positioning |
| Tabs | Tabs | Arrow key navigation, orientation support |
| Tooltip | Tooltip | Delay, positioning, accessibility |
| Accordion | Accordion | Single/multiple expand, keyboard nav |
| Switch | Switch | Toggle state, accessibility labels |

### Architecture

```
┌─────────────────────────────────────┐
│         shadcn/ui Component         │
│    (Styled + Custom Behavior)       │
├─────────────────────────────────────┤
│          Radix Primitive            │
│  (Behavior + Accessibility Logic)   │
├─────────────────────────────────────┤
│           Tailwind CSS              │
│      (Utility-first Styling)        │
└─────────────────────────────────────┘
```

---

## Accessibility

### Built-in A11y Features

shadcn/ui components inherit Radix UI's accessibility:

- **WAI-ARIA Compliant**: All interactive components follow ARIA authoring practices
- **Keyboard Navigation**: Full keyboard support (Tab, Arrow keys, Enter, Escape)
- **Screen Reader Support**: Proper ARIA labels, descriptions, and live regions
- **Focus Management**: Focus trapping in modals, focus restoration

### Component-Specific Features

| Component | Accessibility Features |
|-----------|----------------------|
| **Dialog** | Focus trap, escape to close, aria-modal, aria-labelledby |
| **Dropdown Menu** | Arrow key navigation, typeahead search, role="menu" |
| **Select** | Keyboard selection, aria-expanded, aria-selected |
| **Tabs** | Arrow key navigation, role="tablist", aria-selected |
| **Tooltip** | Delay for screen readers, aria-describedby |
| **Form** | aria-invalid, aria-describedby for errors |

### Best Practices

```tsx
// Always provide accessible labels
<Dialog>
  <DialogContent aria-describedby="dialog-description">
    <DialogTitle>Edit Profile</DialogTitle>
    <DialogDescription id="dialog-description">
      Make changes to your profile here.
    </DialogDescription>
  </DialogContent>
</Dialog>

// Use semantic buttons
<Button aria-label="Close dialog">
  <XIcon />
</Button>

// Provide form field descriptions
<FormField
  control={form.control}
  name="email"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Email</FormLabel>
      <FormControl>
        <Input {...field} aria-describedby="email-description" />
      </FormControl>
      <FormDescription id="email-description">
        We will never share your email.
      </FormDescription>
      <FormMessage role="alert" />
    </FormItem>
  )}
/>
```

---

## Best Practices

### Project Organization

Recommended folder structure:

```
src/
├── components/
│   ├── ui/                 # shadcn/ui components (auto-generated)
│   │   ├── button.tsx
│   │   ├── dialog.tsx
│   │   └── ...
│   ├── forms/              # Form compositions
│   │   ├── login-form.tsx
│   │   └── signup-form.tsx
│   └── layouts/            # Layout components
│       ├── header.tsx
│       └── sidebar.tsx
├── hooks/                  # Custom hooks
│   ├── use-theme.ts
│   └── use-media-query.ts
├── lib/
│   └── utils.ts            # cn() function
├── styles/
│   └── globals.css         # CSS variables, Tailwind imports
└── app/ or pages/
```

### Guiding Principles

1. **Modularity**: Each component should be self-contained
2. **Reusability**: Design components for multiple use cases
3. **Scalability**: Structure should accommodate growth

### Component Extension Pattern

Create wrapper components for app-specific behavior:

```tsx
// components/app-button.tsx
import { Button, ButtonProps } from "@/components/ui/button"
import { Loader2 } from "lucide-react"

interface AppButtonProps extends ButtonProps {
  loading?: boolean
}

export function AppButton({ loading, children, disabled, ...props }: AppButtonProps) {
  return (
    <Button disabled={disabled || loading} {...props}>
      {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {children}
    </Button>
  )
}
```

### Theming Best Practices

1. **Name by purpose, not appearance**: Use `--primary` not `--blue`
2. **Maintain contrast ratios**: Follow WCAG guidelines
3. **Test dark mode**: Ensure all states work in both modes
4. **Use design tokens**: Centralize in CSS variables

### Extending tailwind-merge

For custom theme variables, extend the merge config:

```typescript
// lib/utils.ts
import { clsx, type ClassValue } from "clsx"
import { extendTailwindMerge } from "tailwind-merge"

const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      colors: ["background", "foreground", "primary", "secondary", "muted", "accent", "destructive"]
    }
  }
})

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

### 2025 New Styles

Five new visual styles are available:

| Style | Description |
|-------|-------------|
| **Vega** | Classic look |
| **Nova** | Compact layouts |
| **Maia** | Soft and rounded |
| **Lyra** | Boxy and sharp |
| **Mira** | Dense interfaces |

### Component Library Foundation

Choose between:
- **Radix UI** (default)
- **Base UI** (alternative)

All components are compatible with existing shadcn/ui code.

---

## Sources

- [shadcn/ui Documentation](https://ui.shadcn.com/docs)
- [shadcn/ui Installation](https://ui.shadcn.com/docs/installation)
- [shadcn/ui Theming](https://ui.shadcn.com/docs/theming)
- [shadcn/ui Dark Mode](https://ui.shadcn.com/docs/dark-mode)
- [shadcn/ui Tailwind v4](https://ui.shadcn.com/docs/tailwind-v4)
- [shadcn/ui CLI](https://ui.shadcn.com/docs/cli)
- [shadcn/ui components.json](https://ui.shadcn.com/docs/components-json)
- [shadcn/ui React Hook Form](https://ui.shadcn.com/docs/forms/react-hook-form)
- [shadcn/ui Data Table](https://ui.shadcn.com/docs/components/data-table)
- [shadcn/ui Dialog](https://ui.shadcn.com/docs/components/dialog)
- [shadcn/ui Changelog](https://ui.shadcn.com/docs/changelog)
- [DEV Community - shadcn/ui Overview](https://dev.to/mechcloud_academy/shadcnui-the-component-library-that-isnt-a-library-5b94)
- [WorkOS - shadcn-ui Overview](https://workos.com/blog/shadcn-ui)
- [Vercel Academy - React UI with shadcn/ui](https://vercel.com/academy/shadcn-ui)
- [LogRocket - shadcn/ui Adoption Guide](https://blog.logrocket.com/shadcn-ui-reusable-ui-component-collection/)
- [LogRocket - shadcn CLI 3.0](https://blog.logrocket.com/shadcn-cli-3-0-update-overview/)
- [Wasp - Advanced React Forms](https://wasp.sh/blog/2025/01/22/advanced-react-hook-form-zod-shadcn)
- [Makers Den - React UI Libraries 2025](https://makersden.io/blog/react-ui-libs-2025-comparing-shadcn-radix-mantine-mui-chakra)
- [CVA Documentation](https://cva.style/docs/getting-started/variants)
- [WebDong - cn() Helper Function](https://www.webdong.dev/en/post/tailwind-merge-and-clsx-in-shadcn/)
