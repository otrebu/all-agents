---
depends:
  - "@context/blocks/construct/data-table-ui.md"
tags: []
---

# Audit Log Filter UX

Recommended UX pattern for filtering 20+ action types across multiple domains in enterprise audit log viewers. Targets structured-dropdown personas (CustomerAdmin, JTAdmin, JTSupport) rather than developer/power-user query-syntax personas.

## Recommended Pattern: Grouped Multi-Select Dropdown with Typeahead

### When to use

- 10+ discrete filter values in a single category (PatternFly threshold for typeahead)
- Multiple filter categories with AND logic between them (Action Type AND Actor AND Date Range)
- Enterprise admin personas who need discoverability over recall (structured dropdown wins over free-text query)
- Products in the billing/admin SaaS space (not developer tooling)

### Layout

```
[ Action Type (n) ] [ Actor ] [ Target ] [ Date Range ]   ← filter bar above table
─────────────────────────────────────────────────────────
[ auth:login × ] [ structure:rename × ]                  ← active filter chips
─────────────────────────────────────────────────────────
| timestamp | actor | action | target | details          |
| ...       | ...   | ...    | ...    | ...              |
```

### Action Type Dropdown

```
┌─────────────────────────┐
│ 🔍 Search actions...    │  ← typeahead input at top
├─────────────────────────┤
│ ☐ Auth (select all)    │  ← group header is a select-all toggle
│   ☑ login              │
│   ☐ logout             │
│   ☐ token-refresh      │
├─────────────────────────┤
│ ☐ User (select all)    │
│   ☑ invite-sent        │
│   ☑ invite-accepted    │
│   ☐ role-changed       │
├─────────────────────────┤
│ ☐ Structure (select all)│
│   ☐ node-created       │
│   ☐ node-renamed       │
└─────────────────────────┘
[ Apply ]                    ← batch apply button inside dropdown
```

**OR logic within Action Type** (login OR logout).
**AND logic between filter categories** (Action Type AND Actor AND Date Range).

### Triple Redundancy for Active Filters

All three must be kept in sync:

1. Checkmarks preserved in dropdown (re-opening shows current selection)
2. Badge count on trigger button: `Action Type (3)`
3. Dismissible chips below filter bar: `auth:login ×`, `user:invite-sent ×`

### Default State

All unselected = show all events. Do not auto-select any domain groups.

## Component Options

| Option | Notes |
|--------|-------|
| PrimeReact `MultiSelect` with `optionGroupLabel` | Fastest to ship; built-in grouping, filter, select-all |
| Custom grouped checkbox popover | Full control; needed if PrimeReact not available |
| PatternFly `Select` with grouped options | If already on PatternFly design system |

PrimeReact example props:

```tsx
<MultiSelect
  options={actionTypeGroups}
  optionGroupLabel="label"
  optionGroupChildren="items"
  filter
  filterPlaceholder="Search actions..."
  showSelectAll={false}      // use per-group select-all instead
  onChange={handleChange}
  panelFooterTemplate={<ApplyButton />}
/>
```

## Supplementary UX Details

**Event detail drawer:** Right-side drawer for event details keeps user in context of the main table. Do not navigate to a detail page.

**Export:** Respect currently active filters when exporting — export exactly what the user sees.

**Batch apply:** Trigger query only on explicit Apply, not on each checkbox tick. Avoids expensive per-selection API round-trips.

**Filter serialization:** See @context/blocks/construct/data-table-ui.md — Filter Serialization section. Use `?actionType=auth:login,user:invite-sent` (comma-separated) or repeated params.

## What NOT to Build in v1

| Pattern | Why to skip for v1 |
|---------|--------------------|
| Free-text query bar (GitHub / Datadog style) | Power-user feature; requires query parsing, bad for discovery-oriented personas |
| Faceted sidebar | High visual cost; appropriate for Datadog-scale event volumes, not typical admin audit logs |
| Single-value dropdowns per attribute | Loses multi-select capability; forces multiple filter bar interactions |

## Competitive Landscape

| Product | Pattern | Persona target |
|---------|---------|----------------|
| GitHub Audit Log | Query-based search | Developers |
| AWS CloudTrail | Attribute dropdowns (single-value) | Ops / compliance |
| Datadog Audit Trail | Faceted sidebar + search | SRE / developer |
| Stripe Dashboard | Inline filter chips | Finance / admin |
| WorkOS Audit Logs | Embedded table with search | Developer / admin |
| HighLevel | Side drawer detail + filters | Business admin |

Admin-facing SaaS (Stripe, WorkOS) converge on structured dropdowns. Developer tools (GitHub, Datadog) use query syntax. For billing management platforms, use structured dropdowns.

## Sources

PatternFly Filter Design Guidelines. Carbon Design System Filtering Patterns. NN/Group: Filter Categories and Values + User Intent Affects Filter Design. Pencil & Paper: Enterprise Filtering UX Patterns.
