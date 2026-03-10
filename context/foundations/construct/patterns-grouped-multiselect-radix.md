---
depends:
  - "@context/blocks/construct/react.md"
  - "@context/blocks/construct/tailwind.md"
  - "@context/blocks/construct/shadcn.md"
  - "@context/blocks/quality/audit-log-filter-ux.md"
tags: []
---

# Grouped Multi-Select Filter Pattern (Radix + CVA + Tailwind)

Build a reusable grouped multi-select dropdown filter component using Radix UI Popover as the dropdown primitive, CVA for theme-agnostic variant slots, and Tailwind for layout utilities.

## References

- @context/blocks/construct/react.md
- @context/blocks/construct/tailwind.md
- @context/blocks/construct/shadcn.md — existing `cn()` utility and Radix integration pattern
- @context/blocks/quality/audit-log-filter-ux.md — UX requirements this component satisfies

---

## Installation

If `@radix-ui/react-popover` is not yet installed (Radix Dialog and Tabs are already present — Popover follows the same integration pattern):

```bash
pnpm add @radix-ui/react-popover class-variance-authority
```

`clsx` and `tailwind-merge` (for `cn()`) are already present via shadcn at `lib/utils.ts`.

---

## Data Structure

```ts
export interface FilterOption {
  value: string
  label: string
}

export interface OptionGroup {
  label: string          // e.g. "Auth", "User", "Structure"
  options: FilterOption[]
}
```

---

## Component Architecture

```
<GroupedMultiSelect>
  ├── Radix Popover.Root
  │   ├── Popover.Trigger  → styled trigger button
  │   │   ├── label text
  │   │   ├── badge count "(3)"  — when value.length > 0
  │   │   └── chevron icon (rotates when open)
  │   └── Popover.Portal → Popover.Content
  │       ├── search input (typeahead — client-side filter)
  │       ├── scrollable option list
  │       │   └── per group: header (select-all checkbox) + option rows
  │       └── Apply button (commits staged → committed)
  └── active filter chips (rendered below trigger bar)
      └── per active value: dismissible Badge
```

---

## Props Interface

```ts
export interface GroupedMultiSelectProps {
  value: string[]                          // committed (applied) selection
  onChange: (value: string[]) => void
  groups: OptionGroup[]
  label: string                            // trigger label, e.g. "Action Type"
  placeholder?: string                     // search placeholder, default "Search…"
  disabled?: boolean
  triggerClassName?: string                // theme classes for trigger button
  contentClassName?: string                // theme classes for dropdown panel
  chipClassName?: string                   // theme classes for active chips
}
```

---

## CVA Variant Slots

CVA manages structural variants. Consumers inject theme classes — no colors are hardcoded here.

```ts
import { cva, type VariantProps } from "class-variance-authority"

export const triggerVariants = cva(
  "inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded transition-colors",
  {
    variants: {
      appearance: {
        default: "",   // consumer supplies theme classes, e.g. "border border-border bg-surface hover:bg-muted"
        active: "",    // consumer supplies, e.g. "border-2 border-primary bg-primary/10"
        disabled: "opacity-50 pointer-events-none",
      },
    },
    defaultVariants: { appearance: "default" },
  }
)

export const contentVariants = cva(
  "z-50 min-w-[220px] max-w-xs rounded p-0 shadow-md outline-none",
  {
    variants: {
      appearance: {
        default: "",   // consumer supplies, e.g. "bg-surface border border-border"
      },
    },
    defaultVariants: { appearance: "default" },
  }
)

// chipVariants follows the same pattern — base: "inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full"
// appearance.default: "" — consumer supplies, e.g. "bg-primary/15 text-primary border border-primary/30"
```

To apply a theme, extend these CVA definitions in your feature layer — do not pass raw className strings into variant slots.

---

## Internal State

Two distinct selection states implement the batch-apply pattern from @context/blocks/quality/audit-log-filter-ux.md:

```ts
const [open, setOpen] = useState(false)
const [search, setSearch] = useState("")
const [staged, setStaged] = useState<string[]>(value)  // in-progress, not yet applied

// Re-sync staged when popover opens so re-opening reflects committed state
useEffect(() => {
  if (open) setStaged(value)
}, [open, value])
```

---

## Typeahead Filtering

```ts
const lowerSearch = search.toLowerCase().trim()

const filteredGroups = useMemo(() =>
  groups
    .map(group => ({
      ...group,
      options: lowerSearch
        ? group.options.filter(o => o.label.toLowerCase().includes(lowerSearch))
        : group.options,
    }))
    .filter(group => group.options.length > 0),   // hide empty groups
  [groups, search]
)
```

---

## Group Select-All Logic

```ts
const isAllSelected = (group: OptionGroup) =>
  group.options.every(o => staged.includes(o.value))

const isPartialSelected = (group: OptionGroup) =>
  group.options.some(o => staged.includes(o.value)) && !isAllSelected(group)

function toggleGroup(group: OptionGroup) {
  isAllSelected(group)
    ? setStaged(prev => prev.filter(v => !group.options.some(o => o.value === v)))
    : setStaged(prev => [...prev, ...group.options.map(o => o.value).filter(v => !prev.includes(v))])
}

function toggleOption(optionValue: string) {
  setStaged(prev =>
    prev.includes(optionValue) ? prev.filter(v => v !== optionValue) : [...prev, optionValue]
  )
}
```

---

## Radix Popover Integration

Key Radix wiring points (not a full component — see architecture above for structure):

```tsx
import * as Popover from "@radix-ui/react-popover"

// Root controls open state
<Popover.Root open={open} onOpenChange={setOpen}>

  // Trigger — use asChild to wrap your styled button
  <Popover.Trigger asChild>
    <button className={cn(triggerVariants({ appearance: value.length > 0 ? "active" : "default" }), triggerClassName)}>
      {label}
      {value.length > 0 && <span>({value.length})</span>}
      <ChevronDownIcon className={cn("h-4 w-4 transition-transform", open && "rotate-180")} />
    </button>
  </Popover.Trigger>

  // Portal renders into document.body — avoids overflow/stacking context issues
  <Popover.Portal>
    <Popover.Content align="start" sideOffset={4}
      className={cn(contentVariants(), contentClassName)}
    >
      {/* search, option list, apply button */}
    </Popover.Content>
  </Popover.Portal>

</Popover.Root>
```

Apply button commits and closes:

```tsx
<button onClick={() => { onChange(staged); setOpen(false) }}>
  Apply
</button>
```

---

## Triple Redundancy (per UX spec)

All three signals from @context/blocks/quality/audit-log-filter-ux.md must stay in sync:

| Signal | Implementation |
|--------|----------------|
| Checkmarks in dropdown | `staged` syncs to `value` on open via `useEffect` |
| Badge count on trigger | Render `(n)` when `value.length > 0` |
| Dismissible chips | Rendered from `value`; each calls `onChange(value.filter(...))` |

Chip rendering (outside the Popover):

```tsx
{value.length > 0 && (
  <div className="flex flex-wrap gap-2 mt-2">
    {value.map(v => {
      const optionLabel = groups.flatMap(g => g.options).find(o => o.value === v)?.label ?? v
      return (
        <span key={v} className={cn(chipVariants(), chipClassName)}>
          {optionLabel}
          <button aria-label={`Remove ${optionLabel}`}
            onClick={() => onChange(value.filter(x => x !== v))}>×</button>
        </span>
      )
    })}
  </div>
)}
```

---

## Keyboard Accessibility

Radix Popover provides: `Escape` closes, focus trapping, `Tab`/`Shift+Tab` navigation.

Additional requirements:
- Search input: add `autoFocus` prop (not manual `.focus()`) — Radix handles mounting timing
- Option rows: use `role="button"` — `Enter`/`Space` activate via browser default behavior
- Indeterminate checkbox: set via `ref` callback — React does not support `indeterminate` as a prop:

```tsx
<input type="checkbox" readOnly checked={isAllSelected(group)}
  ref={el => { if (el) el.indeterminate = isPartialSelected(group) }}
  className="pointer-events-none" />
```

---

## File Layout

```
components/
└── grouped-multi-select/
    ├── index.ts
    ├── GroupedMultiSelect.tsx
    ├── grouped-multi-select.variants.ts
    └── grouped-multi-select.types.ts
```

---

## When to Use

- 10+ discrete filter values in a single filter category
- Multiple filter categories with AND logic between them (Action Type AND Actor AND Date Range)
- Enterprise admin personas: discoverability over recall
- Batch apply required to avoid per-tick API calls

## When NOT to Use

- Fewer than 6 flat options — use `<select multiple>` or a radio group
- Developer-facing tooling — prefer free-text query syntax (see @context/blocks/quality/audit-log-filter-ux.md)
- Single-select — use Radix Select or a combobox instead
- Already on PrimeReact — use its `MultiSelect` with `optionGroupLabel` instead

---

## Gotchas

**Indeterminate checkbox:** React does not support `indeterminate` as a JSX prop. Use the `ref` callback pattern shown above.

**Staged vs committed desync:** If the parent changes `value` while the popover is open (e.g. external "Clear all"), `staged` will not update until next open. Accept this trade-off or add `value` to the `useEffect` deps — but this resets in-progress selections.

**Popover portal clipping:** `Popover.Portal` renders into `document.body`. Any ancestor with `overflow: hidden` or `transform` creates a stacking context that will clip the portal. Use the portal to escape these constraints.

**Search focus timing:** Use the `autoFocus` HTML attribute on the search `<input>`. Do not call `.focus()` imperatively after `onOpenChange` — Radix may not have mounted the content DOM node yet.
