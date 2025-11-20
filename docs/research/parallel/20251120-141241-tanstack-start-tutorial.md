# TanStack Start Tutorial & Getting Started Guide

**Date:** 2025-11-20
**Objective:** TanStack Start: getting started tutorial and implementation guide

## Summary

TanStack Start is a full-stack React framework built on Vite and TanStack Router. It offers type-safe routing, flexible deployment options, and a simpler mental model compared to Next.js—positioning itself as client-first with server functions rather than server-first with client components.

## Findings

### Getting Started Options

- **CLI (fastest)**: `pnpm create @tanstack/start@latest` with interactive prompts for Tailwind, ESLint, etc.
- **Clone examples**: Use `npx gitpick TanStack/router/tree/main/examples/react/start-basic` to clone specific examples
- **From scratch**: Detailed guide available for line-by-line setup (requires Vite, TanStack Router, React)

### Core Architecture

- **Type-safe routing**: Auto-complete for routes + search params validated by Zod
- **Server functions**: Use `createServerFn()` to define server-side logic (e.g., file I/O, DB access)
- **File-based routing**: Routes defined in `src/routes/` directory (e.g., `index.tsx` for `/`)
- **Loader pattern**: Routes export `loader` functions that fetch data, accessible via `Route.useLoaderData()`

### Key Dependencies

```json
{
  "dependencies": [
    "@tanstack/react-start",
    "@tanstack/react-router",
    "react",
    "react-dom"
  ],
  "devDependencies": [
    "vite",
    "@vitejs/plugin-react"
  ]
}
```

### Example Starters

- **start-basic**: Minimal setup
- **start-basic-auth**: Authentication included
- **start-counter**: Server state example
- **start-basic-react-query**: Integrated with TanStack Query
- **start-clerk-basic**: Clerk auth integration
- **start-convex-trellaux**: Convex backend example
- **start-supabase-basic**: Supabase integration

### TypeScript Configuration

Required settings:
```json
{
  "compilerOptions": {
    "jsx": "react-jsx",
    "moduleResolution": "Bundler",
    "module": "ESNext",
    "target": "ES2022",
    "skipLibCheck": true,
    "strictNullChecks": true
  }
}
```

**Note**: Avoid `verbatimModuleSyntax` (causes server bundle leaks)

### Deployment

- **Deploy anywhere**: Vite + Nitro support
- **No vendor lock-in**: Unlike Next.js/Vercel, TanStack Start works with any host
- **Static pre-rendering**: Supported for landing pages (no need for Next.js SSG)

## Analysis

### vs Next.js

**Mental Model:**
- **TanStack Start**: Client-first SPA that queries server functions when needed (server = API returning JSX/JSON)
- **Next.js**: Server-first router where even client components render server-side first

**Trade-offs:**
- **DX**: TanStack Start offers simpler architecture, 100% type-safe routing, faster Vite builds
- **Ecosystem**: Next.js has larger community, more templates, Vercel integrations
- **Scale**: Next.js excels at micro-optimizations (PPR, edge functions) for high-traffic apps
- **Cost**: TanStack Start avoids Vercel vendor lock-in costs

**Recommendation**: Use TanStack Start for SMB/startups prioritizing speed & simplicity. Use Next.js for enterprise apps needing advanced caching/edge optimizations.

### Learning Path

1. **Start with CLI**: `pnpm create @tanstack/start@latest`
2. **Explore routing**: File-based routes, loaders, type-safe navigation
3. **Add server functions**: `createServerFn()` for backend logic
4. **Integrate TanStack Query**: For data fetching patterns
5. **Deploy**: Netlify, Vercel, or any Node.js host

## Sources

- **[TanStack] Getting Started | TanStack Start React Docs**: https://tanstack.com/start/latest/docs/framework/react/getting-started
- **[TanStack] Build a Project from Scratch | TanStack Start React Docs**: https://tanstack.com/start/latest/docs/framework/react/build-from-scratch
- **[TanStack] Quick Start | TanStack Start React Docs**: https://tanstack.com/start/latest/docs/framework/react/quick-start
- **[TanStack] React TanStack Start Start Basic Example**: https://tanstack.com/start/latest/docs/framework/react/examples/start-basic
- **[TanStack] Comparison | TanStack Router & TanStack Start vs Next.js vs React Router / Remix**: https://tanstack.com/router/v1/docs/framework/react/comparison
- **[Reddit] Tanstack Start vs Nextjs : r/reactjs**: https://www.reddit.com/r/reactjs/comments/1h1oacg/tanstack_start_vs_nextjs/
- **[Kyle Gill] Next.js vs TanStack**: https://www.kylegill.com/essays/next-vs-tanstack/
- **[YouTube] Become a TanStack Start Pro in 1 Hour**: https://www.youtube.com/watch?v=s4I4JtOZNgg
- **[YouTube] Learn TanStack Start in 7 Minutes**: https://www.youtube.com/watch?v=WG7x4kG9pFI
- **[LogRocket] A step-by-step guide to building a full-stack app with TanStack Start**: https://blog.logrocket.com/full-stack-app-with-tanstack-start/
- **[LogRocket] TanStack Start vs. Next.js: Choosing the right full-stack React framework**: https://blog.logrocket.com/tanstack-start-vs-next-js-choosing-the-right-full-stack-react-framework/
- **[CodeParrot AI] TanStack for Beginners: A Complete Guide & Tutorial**: https://codeparrot.ai/blogs/tanstack-for-beginners-a-complete-guide-tutorial
- **[Convex] TanStack Start Quickstart**: https://docs.convex.dev/quickstart/tanstack-start
