---
depends: []
---

# Tailwind CSS

Utility-first CSS framework.

## Setup

See @context/blocks/construct/vite.md for Vite integration.

```bash
pnpm add tailwindcss @tailwindcss/vite
```

## Usage

```tsx
<div className="flex items-center gap-4 p-4 bg-white rounded-lg">
  <span className="text-gray-600 font-medium">Content</span>
</div>
```

## Common Patterns

- **Flexbox**: `flex items-center justify-between gap-4`
- **Grid**: `grid grid-cols-3 gap-6`
- **Spacing**: `p-4 m-2 space-y-4`
- **Colors**: `bg-blue-500 text-white border-gray-200`
- **Responsive**: `sm:flex md:grid lg:hidden`
- **States**: `hover:bg-blue-600 focus:ring-2 disabled:opacity-50`
