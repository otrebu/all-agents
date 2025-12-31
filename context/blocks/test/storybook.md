---
depends:
  - "@context/blocks/quality/accessibility.md"
---

# Storybook

Build UI components in isolation. Test accessibility with a11y addon.

## Setup

```bash
pnpm dlx storybook@latest init
```

## Writing Stories

```typescript
// Button.stories.tsx
import type { Meta, StoryObj } from "@storybook/react";
import { Button } from "./Button";

const meta: Meta<typeof Button> = {
  component: Button,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof Button>;

export const Primary: Story = {
  args: {
    variant: "primary",
    children: "Click me",
  },
};

export const Secondary: Story = {
  args: {
    variant: "secondary",
    children: "Click me",
  },
};
```

## Commands

```bash
pnpm storybook        # Dev server
pnpm build-storybook  # Static build
```

## Best Practices

- One story file per component
- Cover all variants/states
- Use `args` for props
- Add `tags: ["autodocs"]` for auto-generated docs

## Accessibility Testing

Install addon: `@storybook/addon-a11y`

```typescript
// .storybook/main.ts
const config: StorybookConfig = {
  addons: [
    "@storybook/addon-a11y",
    // ... other addons
  ],
};
```

The a11y panel shows WCAG violations per story. Fix violations before shipping.

For a11y rules: @context/blocks/quality/accessibility.md
