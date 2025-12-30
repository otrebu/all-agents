---
depends:
  - "@context/blocks/test/storybook.md"
---

# Visual Regression Testing with Chromatic

Catch unintended UI changes by comparing Storybook snapshots across commits.

## References

@context/blocks/test/storybook.md

---

## Setup

```bash
# install (dev)
chromatic @chromatic-com/storybook
```

1. Go to [chromatic.com/start](https://www.chromatic.com/start)
2. Sign in with GitHub, create project
3. Copy project token

```bash
# first run (creates baseline)
npx chromatic --project-token=<token>
```

---

## Storybook Integration

Add to `.storybook/main.ts` addons array (see @context/blocks/test/storybook.md for full config):

```typescript
addons: [
  "@storybook/addon-essentials",
  "@chromatic-com/storybook", // visual tests addon
],
```

---

## CI Integration

```yaml
# .github/workflows/chromatic.yml
name: Chromatic

on: push

jobs:
  chromatic:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0 # full history for comparisons

      - uses: actions/setup-node@v4

      - run: npm ci

      - uses: chromaui/action@latest
        with:
          projectToken: ${{ secrets.CHROMATIC_PROJECT_TOKEN }}
```

Add `CHROMATIC_PROJECT_TOKEN` to repo secrets.

### TurboSnap (Cost Optimization)

Only test stories affected by code changes:

```yaml
- uses: chromaui/action@latest
  with:
    projectToken: ${{ secrets.CHROMATIC_PROJECT_TOKEN }}
    onlyChanged: true # TurboSnap - only test affected stories
```

---

## Snapshot Strategies

### Selective Snapshots (Cost Optimization)

```typescript
// .storybook/preview.ts
const preview: Preview = {
  parameters: {
    chromatic: {
      disableSnapshot: true, // off by default
    },
  },
};
```

```typescript
// Enable per-story
export const Primary: Story = {
  parameters: {
    chromatic: { disableSnapshot: false },
  },
};
```

### Viewport Testing

```typescript
export const Responsive: Story = {
  parameters: {
    chromatic: {
      viewports: [320, 768, 1200],
    },
  },
};
```

### Delay for Animations

```typescript
export const Animated: Story = {
  parameters: {
    chromatic: {
      delay: 500, // wait for animation
    },
  },
};
```

### Ignore Dynamic Content

```typescript
// Use data-chromatic="ignore" for truly dynamic content
export const WithDate: Story = {
  render: () => (
    <div>
      <span data-chromatic="ignore">{new Date().toLocaleDateString()}</span>
      <MyComponent />
    </div>
  ),
};

// diffThreshold for minor pixel variations (anti-aliasing, fonts)
export const WithSubpixelVariation: Story = {
  parameters: {
    chromatic: {
      diffThreshold: 0.2,
    },
  },
};
```

---

## Meta-Story Pattern (Cost Reduction)

Combine variants into one story for fewer snapshots:

```typescript
export const AllVariants: Story = {
  render: () => (
    <div style={{ display: "flex", gap: 16 }}>
      <Button variant="primary">Primary</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="ghost">Ghost</Button>
      <Button disabled>Disabled</Button>
    </div>
  ),
  parameters: {
    chromatic: { disableSnapshot: false },
  },
};
```

---

## Review Workflow

1. Push code → Chromatic runs
2. Visual changes detected → PR gets check status
3. Review changes in Chromatic UI
4. Accept (new baseline) or Deny (fix code)
5. PR unblocked after review

---

## Local Development

```bash
# preview what chromatic will capture
npx chromatic --dry-run

# skip CI, just publish
npx chromatic --skip
```

---

## Folder Structure

```
.storybook/
├── main.ts           # addons config
├── preview.ts        # global parameters
└── manager.ts        # UI customization (optional)
src/
└── components/
    ├── Button/
    │   ├── Button.tsx
    │   └── Button.stories.tsx  # chromatic snapshots here
    └── Card/
        ├── Card.tsx
        └── Card.stories.tsx
```

---

## When to Use

| Scenario               | Chromatic | Alternative       |
| ---------------------- | --------- | ----------------- |
| Component library      | Yes       | -                 |
| Design system          | Yes       | -                 |
| UI consistency         | Yes       | -                 |
| Functional testing     | No        | Vitest + RTL      |
| E2E user flows         | No        | Playwright        |
| API testing            | No        | MSW + Vitest      |

## When NOT to Use

- **Logic testing** → @context/foundations/test/test-unit-vitest.md
- **User flows** → @context/foundations/test/test-e2e-web-playwright.md
- **Low-budget projects** → Playwright screenshots (free)
