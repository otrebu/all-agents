# Frontend Documentation Plan - DRAFT

## Constraints (Fixed)

| Aspect | Decision |
|--------|----------|
| Bundler | Vite (Bun noted as future) |
| Package Manager | pnpm (bun noted as future) |
| Routing | Tanstack Router only |
| Styling | Tailwind + shadcn primary |
| Auth | better-auth (https://www.better-auth.com/) |

## Scope (To Document)

- **Rendering:** CSR, SSR, Tanstack Start
- **State:** React Context, Tanstack Query, XState, XState Store
- **Testing:** Vitest, Storybook, MSW, Playwright
- **Structure:** Monorepo pkg, Standalone lib, Monorepo app, Standalone app
- **Styling variants:** Tailwind+shadcn, Tailwind-only, Design tokens

---

## Problems to Solve

### P1: "I need a shared UI library"
**Questions:**
- Should it live in monorepo or be standalone/publishable?
- How do I test components visually?
- How do I document components for consumers?
- How do I handle theming/tokens?

**Variations:**
- `ui-lib-monorepo` - internal shared package
- `ui-lib-standalone` - publishable to npm

### P2: "I need a frontend application"
**Questions:**
- Do I need SSR or is CSR enough?
- Should I use Tanstack Start or plain Vite+React?
- How do I consume a UI library?
- How do I handle routing?

**Variations by rendering:**
- `app-csr` - Client-side only (Vite + React)
- `app-ssr` - Server-side rendering (Tanstack Start? or manual?)
- `app-start` - Full Tanstack Start meta-framework

**Variations by structure:**
- `app-monorepo` - as workspace package
- `app-standalone` - independent project

### P3: "When do I use which state management?"
**Questions:**
- Local component state → ?
- Shared UI state (modals, toasts) → ?
- Complex UI flows (wizards, multi-step) → ?
- Server/async state → ?
- Simple reactive global state → ?

**Decision tree:**
```
Is it server data?
  → YES: Tanstack Query
  → NO: Is it complex flow with states/transitions?
    → YES: XState (full machine)
    → NO: Is it shared across components?
      → YES: Does it change frequently?
        → YES: XState Store (selectors prevent re-renders)
        → NO: React Context (static/DI)
      → NO: useState/useReducer
```

**Quick reference:**
| Scenario | Tool |
|----------|------|
| Theme/locale | Context |
| Auth state | XState Store |
| Shopping cart | XState Store |
| Form wizard | XState (machine) |
| Feature flags | Context |
| Modal state | XState Store |
| API client DI | Context |

### P4: "How do I test frontend code?"
**Questions:**
- Unit tests for utilities/hooks → ?
- Component rendering tests → ?
- Visual regression → ?
- E2E user flows → ?
- API mocking strategy → ?

**Testing matrix:**
| What | Tool | When |
|------|------|------|
| Utils/hooks | Vitest | Always |
| Component logic | Vitest + RTL | Always |
| Component visual | Storybook | UI lib |
| E2E flows | Playwright | Apps |
| API mocking | MSW | Integration + E2E |

### P5: "How do I style consistently?"
**Questions:**
- How do I set up Tailwind?
- How do I customize shadcn?
- How do I create design tokens?
- How do I share styles between packages?

**Variations:**
- `style-tailwind-shadcn` - full shadcn setup
- `style-tailwind-only` - custom components
- `style-tokens` - design token system

### P6: "How do I set up Storybook?"
**Questions:**
- How does it work in monorepo?
- How do I test components in Storybook?
- How do I document props/usage?

### P7: "How do I handle auth and authorization?"
**Questions:**
- How do I add authentication to my app?
- How do I protect routes (client + server)?
- How do I manage session state?
- How do I handle roles/permissions (authz)?
- CSR vs SSR - what's different?

**Variations:**
- `auth-csr` - Client-side app with external auth backend
- `auth-ssr` - Tanstack Start with integrated auth (recommended)

**Tool:** better-auth

---

## Resolved Questions

| Question | Decision |
|----------|----------|
| SSR approach | Tanstack Start only (no manual SSR) |
| XState Store vs Context | Decided - see P3 decision tree above |
| Storybook testing | Both: Storybook for visual, Vitest+RTL for logic |
| Design tokens | Tailwind config + CSS vars |
| Library bundling | Vite library mode |

---

## Stacks Needed

| Stack | Rendering | Structure | Notes |
|-------|-----------|-----------|-------|
| `web-pnpm-vite-react` | CSR | standalone | Basic SPA |
| `web-pnpm-vite-react-monorepo` | CSR | monorepo | SPA in workspace |
| `web-pnpm-tanstack-start` | SSR/hybrid | standalone | Full framework |
| `web-pnpm-tanstack-start-monorepo` | SSR/hybrid | monorepo | Framework in workspace |
| `library-react-pnpm-vite` | n/a | standalone | Publishable UI lib |
| `library-react-pnpm-monorepo` | n/a | monorepo | Internal UI lib |

**Simplified to 3 stacks** (standalone/monorepo variants in same doc):
- `web-pnpm-vite-react` - CSR app
- `web-pnpm-tanstack-start` - SSR/hybrid app (recommended for auth)
- `library-react-pnpm-vite` - UI library

---

## Content Boundaries by Problem

### P1: UI Library
**Boundary:** Component creation, testing, publishing. NOT app-level concerns.

| Doc | Scope | Research? |
|-----|-------|-----------|
| `blocks/test/storybook.md` | ✓ exists | - |
| `foundations/test/test-component-storybook.md` | Visual testing in Storybook | No |
| `foundations/construct/bundle-library-vite.md` | Vite lib mode, exports, types | No |
| `blocks/construct/vite-plugin-dts.md` | .d.ts generation | No |
| `foundations/scm/publish-npm.md` | npm publish workflow | No |
| `blocks/scm/npm-publish.md` | npm CLI reference | No |

### P2: Frontend App
**Boundary:** App structure, routing, code organization. NOT component internals.

| Doc | Scope | Research? |
|-----|-------|-----------|
| `stacks/web/web-pnpm-vite-react.md` | CSR app scaffold | No |
| `stacks/web/web-pnpm-tanstack-start.md` | SSR app scaffold | Yes - Tanstack Start API |
| `foundations/construct/route-tanstack-router.md` | Routing patterns | No |
| `foundations/construct/code-splitting.md` | Lazy loading, chunks | No |
| `foundations/construct/error-handling-react.md` | Error boundaries | No |

### P3: State Management
**Boundary:** When/how to manage state. NOT React basics.

| Doc | Scope | Research? |
|-----|-------|-----------|
| `foundations/construct/state-decision-tree.md` | When to use what | No |
| `blocks/construct/xstate-store.md` | XState Store patterns | No |
| `blocks/construct/immer.md` | Immutable updates | No |
| `foundations/construct/state-server-tanstack-query.md` | Server state patterns | No |
| `foundations/construct/state-complex-xstate.md` | State machine patterns | No |
| `foundations/construct/state-reactive-xstate-store.md` | Reactive store patterns | No |
| `foundations/construct/react-patterns.md` | Hooks anti-patterns, useEffect | No |

**Overlap rules:**
- `state-decision-tree.md` owns "when to use X vs Y"
- `react-patterns.md` owns "how to use hooks correctly"
- Individual state docs own "how to use this specific tool"

### P4: Testing
**Boundary:** Testing strategies and tools. NOT what to test (that's in domain docs).

| Doc | Scope | Research? |
|-----|-------|-----------|
| `blocks/test/vitest.md` | Vitest config, APIs | No |
| `blocks/test/react-testing-library.md` | RTL queries, patterns | No |
| `blocks/test/playwright.md` | Playwright config, APIs | No |
| `blocks/test/msw.md` | MSW handlers, setup | Yes - MSW v2 API |
| `blocks/test/chromatic.md` | Visual regression | No |
| `blocks/test/axe-core.md` | A11y testing | No |
| `foundations/test/test-unit-vitest.md` | Unit test patterns | No |
| `foundations/test/test-component-vitest-rtl.md` | Component test patterns | No |
| `foundations/test/test-e2e-web-playwright.md` | E2E patterns | No |
| `foundations/test/mock-api-msw.md` | API mocking patterns | No |
| `foundations/test/test-visual-chromatic.md` | Visual test workflow | No |

### P5: Styling
**Boundary:** CSS/styling setup. NOT design system.

| Doc | Scope | Research? |
|-----|-------|-----------|
| `blocks/construct/tailwind.md` | ✓ exists | - |
| `blocks/construct/shadcn.md` | ✓ exists | - |
| `blocks/construct/design-tokens.md` | Token concepts | No |
| `foundations/construct/style-tailwind-shadcn.md` | Integration patterns | No |
| `foundations/construct/style-design-tokens.md` | Token implementation | No |

### P6: Storybook
**Boundary:** Storybook-specific. Testing covered in P4.

| Doc | Scope | Research? |
|-----|-------|-----------|
| `blocks/test/storybook.md` | ✓ exists | - |
| `foundations/test/test-component-storybook.md` | Testing in Storybook | No |

### P7: Auth
**Boundary:** Authentication + authorization. NOT session state management (see P3).

| Doc | Scope | Research? |
|-----|-------|-----------|
| `blocks/security/better-auth.md` | better-auth setup | Yes - v1.x API |
| `foundations/security/auth-better-auth.md` | Integration patterns | Yes - v1.x API |
| `foundations/security/auth-protected-routes.md` | Route protection | No |
| `foundations/security/auth-session-react.md` | Session handling | No |

### Cross-Problem
**Boundary:** Observability, quality - applies to all.

| Doc | Scope | Research? |
|-----|-------|-----------|
| `blocks/observe/sentry-react.md` | Error tracking | No |
| `blocks/observe/web-vitals.md` | Performance metrics | No |
| `blocks/construct/rollup-plugin-visualizer.md` | Bundle analysis | No |
| `blocks/construct/tanstack-table.md` | Data tables | No |
| `foundations/quality/accessibility-patterns.md` | A11y patterns | No |

---

## Research Needed (Summary)

| Doc | What to Research |
|-----|------------------|
| `stacks/web/web-pnpm-tanstack-start.md` | Tanstack Start 0.x API, stability |
| `blocks/test/msw.md` | MSW v2 breaking changes |
| `blocks/security/better-auth.md` | better-auth v1.x API |
| `foundations/security/auth-better-auth.md` | better-auth React integration |

### Cross-Reference Strategy
Use inline `@context/` pattern for linking between docs.

---

## Documentation Skeleton (41 docs)

### Tier 1: Blocks to Create (16)

**Test (4):**
```
blocks/test/vitest.md
blocks/test/playwright.md
blocks/test/msw.md
blocks/test/react-testing-library.md
```

**Construct (6):**
```
blocks/construct/xstate-store.md
blocks/construct/design-tokens.md
blocks/construct/vite-plugin-dts.md
blocks/construct/immer.md
blocks/construct/rollup-plugin-visualizer.md
blocks/construct/tanstack-table.md
```

**Security (1):**
```
blocks/security/better-auth.md
```

**Test - Quality (2):**
```
blocks/test/chromatic.md
blocks/test/axe-core.md
```

**Observe (2):**
```
blocks/observe/sentry-react.md
blocks/observe/web-vitals.md
```

**SCM (1):**
```
blocks/scm/npm-publish.md
```

### Tier 2: Foundations to Create (22)

**Construct (8):**
```
foundations/construct/route-tanstack-router.md
foundations/construct/style-tailwind-shadcn.md
foundations/construct/style-design-tokens.md
foundations/construct/state-decision-tree.md
foundations/construct/state-server-tanstack-query.md
foundations/construct/state-complex-xstate.md
foundations/construct/state-reactive-xstate-store.md
foundations/construct/bundle-library-vite.md
foundations/construct/error-handling-react.md
foundations/construct/code-splitting.md
foundations/construct/react-patterns.md
```

**Test (6):**
```
foundations/test/test-unit-vitest.md
foundations/test/test-component-storybook.md
foundations/test/test-component-vitest-rtl.md
foundations/test/test-e2e-web-playwright.md
foundations/test/mock-api-msw.md
foundations/test/test-visual-chromatic.md
```

**Security (3):**
```
foundations/security/auth-better-auth.md
foundations/security/auth-protected-routes.md
foundations/security/auth-session-react.md
```

**Quality (1):**
```
foundations/quality/accessibility-patterns.md
```

**SCM (1):**
```
foundations/scm/publish-npm.md
```

### Tier 3: Stacks to Create (3)

```
stacks/web/web-pnpm-vite-react.md           # CSR SPA
stacks/web/web-pnpm-tanstack-start.md       # SSR (recommended for auth)
stacks/library/library-react-pnpm-vite.md   # UI component library
```

---

## Implementation Order (7 Phases)

### Phase 1: Core Testing (4 docs)
1. `blocks/test/vitest.md`
2. `blocks/test/react-testing-library.md`
3. `foundations/test/test-unit-vitest.md`
4. `foundations/test/test-component-vitest-rtl.md`

### Phase 2: State + Auth Core (8 docs)
5. `blocks/construct/xstate-store.md`
6. `blocks/construct/immer.md`
7. `foundations/construct/state-decision-tree.md`
8. `foundations/construct/react-patterns.md`
9. `blocks/security/better-auth.md`
10. `foundations/security/auth-better-auth.md`
11. `foundations/security/auth-session-react.md`
12. `foundations/security/auth-protected-routes.md`

### Phase 3: Stacks (3 docs)
13. `stacks/web/web-pnpm-vite-react.md`
14. `stacks/web/web-pnpm-tanstack-start.md`
15. `stacks/library/library-react-pnpm-vite.md`

### Phase 4: Quality & DX (5 docs)
16. `foundations/construct/error-handling-react.md`
17. `blocks/test/axe-core.md`
18. `foundations/quality/accessibility-patterns.md`
19. `blocks/construct/rollup-plugin-visualizer.md`
20. `foundations/construct/code-splitting.md`

### Phase 5: Advanced Testing (5 docs)
21. `blocks/test/playwright.md`
22. `blocks/test/msw.md`
23. `foundations/test/test-e2e-web-playwright.md`
24. `foundations/test/mock-api-msw.md`
25. `foundations/test/test-visual-chromatic.md`

### Phase 6: Styling & Publishing (5 docs)
26. `blocks/construct/design-tokens.md`
27. `foundations/construct/style-design-tokens.md`
28. `blocks/construct/vite-plugin-dts.md`
29. `foundations/scm/publish-npm.md`
30. `blocks/scm/npm-publish.md`

### Phase 7: Observability (3 docs)
31. `blocks/observe/sentry-react.md`
32. `blocks/observe/web-vitals.md`
33. `blocks/construct/tanstack-table.md`

---

## Final Totals

| Category | Count |
|----------|-------|
| Blocks | 16 |
| Foundations | 22 |
| Stacks | 3 |
| **Total** | **41 documents** |

### Tiered Approach

**Tier 1 - Core (20 docs):** Must-have for any frontend project
**Tier 2 - Extended (21 docs):** Add as team needs arise

### Scope Validation

- **20 million** possible decision paths without documentation
- First 10 docs eliminate 99.99% of variance
- 41 docs = near-zero variance
- **Conclusion:** 41 docs is justified for AI consistency

---

## Deferred (Nice-to-have for future)
- i18n/RTL support
- Rich text editors
- Charts/data visualization
- Docker for frontend
- Real-time/WebSockets
- Analytics integration
