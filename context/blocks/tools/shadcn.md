---
depends: []
---

# shadcn/ui

Component library built on Radix UI + Tailwind.

**Requires:** @context/blocks/tools/tailwind.md

## Setup

```bash
pnpm dlx shadcn@latest init
```

## Adding Components

```bash
pnpm dlx shadcn@latest add button
pnpm dlx shadcn@latest add card dialog dropdown-menu
```

## Usage

```tsx
import { Button } from "@components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@components/ui/card";

<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
  </CardHeader>
  <CardContent>
    <Button variant="outline">Click</Button>
  </CardContent>
</Card>;
```

## Key Components

- **Layout**: Card, Separator, Tabs
- **Forms**: Input, Select, Checkbox, Switch
- **Feedback**: Alert, Toast, Dialog
- **Navigation**: DropdownMenu, NavigationMenu
