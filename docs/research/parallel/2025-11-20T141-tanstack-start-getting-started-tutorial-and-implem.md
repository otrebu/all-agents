# Parallel Search Results

**Query:** TanStack Start: getting started tutorial and implementation guide
**Results:** 15
**Execution:** 3.8s

**Top Domains:**
- tanstack.com: 5 results (33%)
- www.youtube.com: 2 results (13%)
- blog.logrocket.com: 2 results (13%)
- www.reddit.com: 1 results (7%)
- www.kylegill.com: 1 results (7%)

---

## 1. [Getting Started | TanStack Start React Docs](https://tanstack.com/start/latest/docs/framework/react/getting-started)

**URL:** https://tanstack.com/start/latest/docs/framework/react/getting-started
**Domain:** tanstack.com

**Excerpt:**

Last updated before: 2025-11-19
[TanStack](/)

[Start v0 v0](/start)

Search...

\+ K

[](https://x.com/tan_stack) [](https://bsky.app/profile/tanstack.com) [](https://instagram.com/tan_stack)

Auto

[Log In](/login)

# Getting Started

Copy Markdown

[## Migrate an existing project from another framework]()

* [Start a new project from scratch]() to quickly learn how Start works (see below)
* Refer to a migration guide for your specific framework:
  
    + [Next.js](/start/latest/docs/framework/react/migrate-from-next-js)
    + Remix 2 / React Router 7 "Framework Mode" (coming soon!)

[## Start a new project from scratch]()

Choose one of the following options to start building a _new_ TanStack Start project:

* [TanStack Start CLI](/start/latest/docs/framework/react/quick-start) \- Just run npm create @tanstack/start@latest . Local, fast, and optionally customizable
* [TanStack Builder](#) (coming soon!) - A visual interface to configure new TanStack projects with a few clicks
* [Quick Start Examples](/start/latest/docs/framework/react/quick-start) Download or clone one of our official examples
* [Build a project from scratch](/start/latest/docs/framework/react/build-from-scratch) \- A guide to building a TanStack Start project line-by-line, file-by-file.

[## Next Steps]()

Unless you chose to build a project from scratch, you can now move on to the [Routing](/start/latest/docs/framework/react/guide/routing) guide to learn how to use TanStack Start!

[Edit on GitHub](https://github.com/tanstack/router/edit/main/docs/start/framework/react/getting-started.md)

### On this page

* [Migrate an existing project from another framework]( "migrate-an-existing-project-from-another-framework")
* [Start a new project from scratch]( "start-a-new-project-from-scratch")
* [Next Steps]( "next-steps")

[Overview](/start/latest/docs/framework/react/overview)

[Quick Start](/start/latest/docs/framework/react/quick-start)

[Partners](/partners) [Become a Partner](https://docs.google.com/document/d/1Hg2MzY2TU6U3hFEZ3MLe2oEOM3JS4-eByti3kdJU3I8)

[](https://coderabbit.link/tanstack?utm_source=tanstack&via=tanstack) [](https://www.cloudflare.com?utm_source=tanstack) [](https://ag-grid.com/react-data-grid/?utm_source=reacttable&utm_campaign=githubreacttable) [](https://netlify.com?utm_source=tanstack) [](https://neon.tech?utm_source=tanstack) [](https://workos.com?utm_source=tanstack) [](https://go.clerk.com/wOwHtuJ) [](https://convex.dev?utm_source=tanstack) [](https://electric-sql.com) [](https://sentry.io?utm_source=tanstack) [](https://www.prisma.io/?utm_source=tanstack&via=tanstack) [](https://strapi.link/tanstack-start) [](https://www.unkey.com/?utm_source=tanstack)


---

## 2. [Build a Project from Scratch | TanStack Start React Docs](https://tanstack.com/start/latest/docs/framework/react/build-from-scratch)

**URL:** https://tanstack.com/start/latest/docs/framework/react/build-from-scratch
**Domain:** tanstack.com

**Excerpt:**

Last updated before: 2025-11-19
[TanStack](/)

[Start v0 v0](/start)

Search...

\+ K

[](https://x.com/tan_stack) [](https://bsky.app/profile/tanstack.com) [](https://instagram.com/tan_stack)

Auto

[Log In](/login)

# Build a Project from Scratch

Copy Markdown

Note

If you chose to quick start with an example or cloned project, you can skip this guide and move on to the [Routing](/start/latest/docs/framework/react/guide/routing) guide. _So you want to build a TanStack Start project from scratch?_

This guide will help you build a **very** basic TanStack Start web application.
Together, we will use TanStack Start to:

* Serve an index page
* Display a counter
* Increment the counter on the server and client

[Here is what that will look like](https://stackblitz.com/github/tanstack/router/tree/main/examples/react/start-counter)

Let's create a new project directory and initialize it. shell

```
mkdir myApp
cd myApp
npm init -y
```

```
mkdir myApp
cd myApp
npm init -y
```

Note

> We use npm in all of these examples, but you can use your package manager of choice instead. [## TypeScript Configuration]()

We highly recommend using TypeScript with TanStack Start.
Create a tsconfig.json file with at least the following settings:

json

```
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

```
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

Note

> Enabling verbatimModuleSyntax can result in server bundles leaking into client bundles. It is recommended to keep this option disabled. [## Install Dependencies]()

TanStack Start is powered by [Vite](https://vite.dev/) and [TanStack Router](https://tanstack.com/router) and requires them as dependencies.
To install them, run:

shell

```
npm i @tanstack/react-start @tanstack/react-router
```

```
npm i @tanstack/react-start @tanstack/react-router
```

We also need vite as a devDependency:

shell

```
npm i -D vite
```

```
npm i -D vite
```

You'll also need React:

shell

```
npm i react react-dom
```

```
npm i react react-dom
```

As well as React's Vite plugin:

shell

```
npm i -D @vitejs/plugin-react
```

```
npm i -D @vitejs/plugin-react
```

Alternatively, you can also use @vitejs/plugin-react-oxc or @vitejs/plugin-react-swc .
 ... 
<HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  )
}
```

[## Writing Your First Route]()

Now that we have the basic templating setup, we can write our first route. This is done by creating a new file in the src/routes directory.
 ... 
</button>
  )
}
```

```
// src/routes/index.tsx
import * as fs from 'node:fs'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'

const filePath = 'count.txt'

async function readCount() {
  return parseInt(
    await fs.promises.readFile(filePath, 'utf-8').catch(() => '0'),
  )
}

const getCount = createServerFn({
  method: 'GET',
}).handler(() => {
  return readCount()
})

const updateCount = createServerFn({ method: 'POST' })
  .inputValidator((d: number) => d)
  .handler(async ({ data }) => {
    const count = await readCount()
    await fs.promises.writeFile(filePath, `${count + data}`)
  })

export const Route = createFileRoute('/')({
  component: Home,
  loader: async () => await getCount(),
})

function
Home() {
  const router = useRouter()
  const state = Route.useLoaderData()

  return (
    <button
      type="button"
      onClick={() => {
        updateCount({ data: 1 }).then(() => {
          router.invalidate()
        })
      }}
    >
      Add 1 to {state}? </button>
  )
}
```

That's it! 🤯 You've now set up a TanStack Start project and written your first route. 🎉

You can now run npm run dev to start your server and navigate to http://localhost:3000 to see your route in action. You want to deploy your application? Check out the [hosting guide](/start/latest/docs/framework/react/guide/hosting) .
[Edit on GitHub](https://github.com/tanstack/router/edit/main/docs/start/framework/react/build-from-scratch.md)

### On this page

* [TypeScript Configuration]( "typescript-configuration")
* [Install Dependencies]( "install-dependencies")
* [Update Configuration Files]( "update-configuration-files")
* [Add the Basic Templating]( "add-the-basic-templating")
* [The Router Configuration]( "the-router-configuration")
* [The Root of Your Application]( "the-root-of-your-application")
* [Writing Your First Route]( "writing-your-first-route")

[Quick Start](/start/latest/docs/framework/react/quick-start)

[Migrate from Next.js](/start/latest/docs/framework/react/migrate-from-next-js)

[Partners](/partners) [Become a

---

## 3. [Tanstack Start vs Nextjs : r/reactjs - Reddit](https://www.reddit.com/r/reactjs/comments/1h1oacg/tanstack_start_vs_nextjs/)

**URL:** https://www.reddit.com/r/reactjs/comments/1h1oacg/tanstack_start_vs_nextjs/
**Domain:** www.reddit.com

**Excerpt:**

Last updated before: 2025-06-27
Skip to main content
Open menu Open navigation
Go to Reddit Home
r/reactjs
A chip A close button Get App Get the Reddit app
Log In Log in to Reddit
Expand user menu Open settings menu
Go to reactjs
r/reactjs
r/reactjs
A community for discussing anything related to the React UI framework and its ecosystem. Join the Reactiflux Discord (reactiflux.com) for additional React discussion and help.
Members Online •
sjrhee
Tanstack Start vs Nextjs
Discussion
Like Tanner said, he will use react query to query RSC as an api. He minds RSC is just an api but returning JSX, not JSON. It will be then so easy to think the architectural mental model for thinking creating SPA and querying RSC if we need server power. Still be small community to find resources, but will be great DX especially it has 100 type safety router.
On the other hand, Nextjs is server first router that even runs client component server first and then client. Still I don’t like Client component can’t import server component, RSC response is big that cause re-rending the whole RSC page even though very small portion is changed, but it has a huuuge comunity that so easy to find starting template and we can even create it with V0. Still they might try to vendor lock to host Next app to Vercel if we want to use Partial Pre-rendering though.
So what is your thought if you are going to start new project? It may depends on what project you are going to, but in generously. I would choose Tanstack Start because it will be so easy to architect application that think of SPA and query to get RSC if need it. It also supports static pre-rending, so just make some landing page static as well. No need Next’s SSG. I may want Next’s partial pre-rending, but needs to compare with Vercel hosting cost.
Read more
Share
Share
Related Answers Section
Related Answers
Comparison of Tanstack Start and Next.js
Differences between Next.js and React
React Query vs Tanstack Query
Best practices for using React Query with RSC
Tanstack Start features and server functions
New to Reddit?
Create your account and connect with a world of communities.
Continue with Email
Continue With Phone Number
By continuing, you agree to our User Agreement and acknowledge that you understand the Privacy Policy .
Public
Anyone can view, post, and comment to this community
Reddit Rules Privacy Policy User Agreement Accessibility Reddit, Inc. © 2025. All rights reserved.
Expand Navigation
Collapse Navigation
* &nbsp; * &nbsp; * &nbsp;

---

## 4. [Quick Start | TanStack Start React Docs](https://tanstack.com/start/latest/docs/framework/react/quick-start)

**URL:** https://tanstack.com/start/latest/docs/framework/react/quick-start
**Domain:** tanstack.com

**Excerpt:**

Last updated before: 2025-11-19
[TanStack](/)

[Start v0 v0](/start)

Search...

\+ K

[](https://x.com/tan_stack) [](https://bsky.app/profile/tanstack.com) [](https://instagram.com/tan_stack)

Auto

[Log In](/login)

# Quick Start

Copy Markdown

[## Impatient?]()

The fastest way to get a Start project up and running is with the cli. Just run

```
pnpm create @tanstack/start@latest
```

```
pnpm create @tanstack/start@latest
```

or

```
npm create @tanstack/start@latest
```

```
npm create @tanstack/start@latest
```

depending on your package manager of choice. You'll be prompted to add things like Tailwind, eslint, and a ton of other options.

You can also clone and run the [Basic](https://github.com/TanStack/router/tree/main/examples/react/start-basic) example right away with the following commands:

bash

```
npx gitpick TanStack/router/tree/main/examples/react/start-basic start-basic
cd start-basic
npm install
npm run dev
```

```
npx gitpick TanStack/router/tree/main/examples/react/start-basic start-basic
cd start-basic
npm install
npm run dev
```

If you'd like to use a different example, you can replace start-basic above with the slug of the example you'd like to use from the list below.

Once you've cloned the example you want, head back to the [Routing](/start/latest/docs/framework/react/guide/routing) guide to learn how to use TanStack Start!

[## Examples]()

TanStack Start has load of examples to get you started. Pick one of the examples below to get started!

* [Basic](https://github.com/TanStack/router/tree/main/examples/react/start-basic) (start-basic)
* [Basic + Auth](https://github.com/TanStack/router/tree/main/examples/react/start-basic-auth) (start-basic-auth)
* [Counter](https://github.com/TanStack/router/tree/main/examples/react/start-counter) (start-counter)
* [Basic + React Query](https://github.com/TanStack/router/tree/main/examples/react/start-basic-react-query) (start-basic-react-query)
* [Clerk Auth](https://github.com/TanStack/router/tree/main/examples/react/start-clerk-basic) (start-clerk-basic)
* [Convex + Trellaux](https://github.com/TanStack/router/tree/main/examples/react/start-convex-trellaux) (start-convex-trellaux)
* [Supabase](https://github.com/TanStack/router/tree/main/examples/react/start-supabase-basic) (start-supabase-basic)
* [Trellaux](https://github.com/TanStack/router/tree/main/examples/react/start-trellaux) (start-trellaux)
* [WorkOS](https://github.com/TanStack/router/tree/main/examples/react/start-workos) (start-workos)
* [Material UI](https://github.com/TanStack/router/tree/main/examples/react/start-material-ui) (start-material-ui)

[### Stackblitz]()

Each example above has an embedded stackblitz preview to find the one that feels like a good starting point

[### Quick Deploy]()

To quickly deploy an example, click the **Deploy to Netlify** button on an example's page to both clone and deploy the example to Netlify.

[### Manual Deploy]()

To manually clone and deploy the example to anywhere else you'd like, use the following commands replacing EXAMPLE\_SLUG with the slug of the example you'd like to use from above:

bash

```
npx gitpick TanStack/router/tree/main/examples/react/EXAMPLE_SLUG my-new-project
cd my-new-project
npm install
npm run dev
```

```
npx gitpick TanStack/router/tree/main/examples/react/EXAMPLE_SLUG my-new-project
cd my-new-project
npm install
npm run dev
```

Once you've clone or deployed an example, head back to the [Routing](/start/latest/docs/framework/react/guide/routing) guide to learn how to use TanStack Start!

[## Other Router Examples]()

While not Start-specific examples, these may help you understand more about how TanStack Router works:

[Edit on GitHub](https://github.com/tanstack/router/edit/main/docs/start/framework/react/quick-start.md)

### On this page

* [Impatient?]( "impatient")
* [Examples]( "examples")
* [Stackblitz]( "stackblitz")
* [Quick Deploy]( "quick-deploy")
* [Manual Deploy]( "manual-deploy")
* [Other Router Examples]( "other-router-examples")

[Getting Started](/start/latest/docs/framework/react/getting-started)

[Build from Scratch](/start/latest/docs/framework/react/build-from-scratch)

[Partners](/partners) [Become a Partner](https://docs.google.com/document/d/1Hg2MzY2TU6U3hFEZ3MLe2oEOM3JS4-eByti3kdJU3I8)

[](https://coderabbit.link/tanstack?utm_source=tanstack&via=tanstack) [](https://www.cloudflare.com?utm_source=tanstack) [](https://ag-grid.com/react-data-grid/?utm_source=reacttable&utm_campaign=githubreacttable) [](https://netlify.com?utm_source=tanstack) [](https://neon.tech?utm_source=tanstack) [](https://workos.com?utm_source=tanstack) [](https://go.clerk.com/wOwHtuJ) [](https://convex.dev?utm_source=tanstack) [](https://electric-sql.com) [](https://sentry.io?utm_source=tanstack) [](https://www.prisma.io/?utm_source=tanstack&via=tanstack) [](https://strapi.link/tanstack-start) [](https://www.unkey.com/?utm_source=tanstack)


---

## 5. [Next.js vs TanStack - Kyle Gill](https://www.kylegill.com/essays/next-vs-tanstack/)

**URL:** https://www.kylegill.com/essays/next-vs-tanstack/
**Domain:** www.kylegill.com

**Excerpt:**

Last updated: 20250318
kg. kg. [Home](/) [About](/about) [Essays](/essays) [Projects](/projects) [Contact](/contact)

# Next.js vs TanStack

Kyle Gill, Software Engineer, Particl

Last updated

> See [this post](https://jaredpalmer.com/blog/gatsby-vs-nextjs) for inspiration. > 
> 

Over the past few months, I’ve moved as much code as possible away from [Next.js](https://nextjs.org/) . While I see why people are attracted to it and its growing ecosystem, I am no longer sipping the KoolAid. [TanStack](https://tanstack.com/) , while not perfect either, provides better abstractions that are more than adequate for the vast majority of projects. In this post, I am going to share my personal opinions about the two projects as they relate to making web applications. ## []() What is Next.js good at?
Before I discuss its shortcomings, I want to share where I think Next.js excels by sharing my recent experience with it. At [Particl](https://particl.com) , we took a bet on where the ecosystem was moving for our web properties. Vercel had hired up many of the React core team ( [around 25% of it](https://react.dev/community/team) ), and was hiring open source maintainers aggressively. It looked like Next.js would see continuing support and would feature the most integrations with the latest packages. For that reason, we chose Next.js to build our web app, as well as our website (when we moved off of Webflow).
### []() Everything OOTB

Getting set up was not difficult, adding support for most package was a breeze, and there were integration guides for everything from [MUI](https://mui.com/material-ui/integrations/nextjs/) , to [Markdoc](https://markdoc.dev/docs/nextjs) , as well as more enterprise stuff like [DataDog real-user monitoring](https://docs.datadoghq.com/real_user_monitoring/guide/monitor-your-nextjs-app-with-rum/?tab=npm) . The speed with which you can get setup out of the box is great, and other ancillary tools often just work™️ with it. If you want Jest, someone from the Next.js team has already merged [a native plugin](https://nextjs.org/blog/next-12-1) that gets things configured semi-magically.
The marketing lingo labels Next.js “The React Framework for the Web”, and it’s definitely one of the easiest ways to get a React app up and running out there. ### []() High-scale optimization

Next.js is also great at the **really high scale** use cases, with the ability to surgically tweak the rendering pattern of individual pages across your app. You don’t have to inflate your build times to render millions of pages, you can render them on demand with server-side rendering (SSR). Authenticated routes can stay client-side (CSR) if you want. You can shave off milliseconds with advanced APIs like partial pre-rendering (PPR), edge functions, and caching. Other packages like streaming and selective hydration can make your app feel snappier and precisely isolate performance bottlenecks.
 ... 
### []() Scale

For some use cases, I can see the justification for micro-performance improvements. For small to mid-sized startups I really don’t need much more than a server and a client. I’m okay with a couple hundred extra milliseconds while we find product-market fit. _But the users! How dare you!_

Our customers buy our software because it solves their problem. Our customers want their problem solved in seconds, instead of days or weeks. At our size, saving an extra 100ms is a premature optimization. ### []() Financial incentives

Because [incentives rule everything around me](https://perell.com/podcast/patrick-mckenzie-internet-famous/) , I understand the marketing dollars get poured into selling cloud software.
 ... 
Turbopack itself favors the app directory, and lacks implementation of some optimizations for the pages directory. I imagine they’ll get there someday, but when you have 2 codebases to maintain, it makes sense that one has to be the 2nd priority. ## []() TanStack + Vite is simple and elegant

You really don’t need to much. You can deploy anywhere, get code that compiles fast, and is a delight to work with. TanStack Router gives me auto-complete on any page in my app, **including search params that are validated by Zod** .
 ... 
```
const { isPending, error, data } = useQuery({

queryKey: ['repoData'],

queryFn: () =>

fetch('https://api.github.com/repos/TanStack/query').then((res) =>

res.json(),

),

})
```

Each of these have their own built-in dev tools (imagine that)! When I need them, more advanced APIs are available and they always feel like an extension of the current API, on one of these plain functions. TanStack doesn’t make money when I deploy with its APIs, and I feel like I can grok the entire API surface. Then there’s Vite, it’s fast, gets out of the way, and just works. It’s most of the good parts of Next.js, without the baggage. There is a growing ecosystem and no company selling it as a cloud service (yet).

---

## 6. [Become a TanStack Start Pro in 1 Hour - YouTube](https://www.youtube.com/watch?v=s4I4JtOZNgg)

**URL:** https://www.youtube.com/watch?v=s4I4JtOZNgg
**Domain:** www.youtube.com

**Excerpt:**

Last updated: 20250923
TanStack Start Full Course 2025 | Become a TanStack Start Pro in 1 Hour

Tap to unmute

2x

Search Copy link Info Shopping

If playback doesn't begin shortly, try restarting your device. •

You're signed out

Videos you watch may be added to the TV's watch history and influence TV recommendations. To avoid this, cancel and sign in to YouTube on your computer.
Cancel Confirm

Up next

Live

Upcoming

Cancel Play Now

[Build and Deploy a Fully Responsive Modern Website using ReactJS and Tailwind CSS 2:35:01](https://www.youtube.com/watch?v=yS7B1W2SwaU)

[NextJS 16 SEO Crash Course - Metadata, Robots, Sitemap, OpenGraph... 44:19](https://www.youtube.com/watch?v=cgq_HsDduSQ)

[PedroTech](https://www.youtube.com/channel/UC8S4rDRZn6Z_StJ-hh7ph8g)

Subscribe

Subscribed

Web development tutorials for everyone. Learn ReactJS, NextJS, GraphQL, Express, MongoDB and more! Join PedroTech to master full-stack development and build real-world applications. Want to Become Tech Job Ready?

---

## 7. [A step-by-step guide to building a full-stack app with ...](https://blog.logrocket.com/full-stack-app-with-tanstack-start/)

**URL:** https://blog.logrocket.com/full-stack-app-with-tanstack-start/
**Domain:** blog.logrocket.com

**Excerpt:**

Last updated: 20250930
Here’s a sneak peek of what the final application will look like:

You can check out the live site on [Vercel](https://reciped-fet4cwwq1-david4473s-projects.vercel.app/) , and if you’d like to dive deeper, the complete project is available on my [GitHub repository](https://github.com/david4473/Reciped) . To get started, you’ll need:

* Node.js installed on your machine
* Basic knowledge of Typescript, React, and Tanstack Start

## Getting Start-ed

The fastest way to get going with TanStack Start is by using one of the example starter projects available on the [Quick Start](https://tanstack.com/start/latest/docs/framework/react/quick-start) page of the documentation.

---

## 8. [TanStack for Beginners: A Complete Guide & Tutorial - CodeParrot AI](https://codeparrot.ai/blogs/tanstack-for-beginners-a-complete-guide-tutorial)

**URL:** https://codeparrot.ai/blogs/tanstack-for-beginners-a-complete-guide-tutorial
**Domain:** codeparrot.ai

**Excerpt:**

Last updated: 20250313
✅ **Deploy anywhere** – Works with Vite and Nitro, making deployment smooth. ### 🚀 Setting Up TanStack Start

Let’s quickly set up a project with TanStack Start. #### **1️⃣ Install TanStack Start**

Run the following command to create a new project:

```
npx create-tanstack-app@latest
```

You'll be prompted to choose the libraries you want to include. Select TanStack Query, Router, and Table if you want a complete setup. #### **2️⃣ Navigate to Your Project & Install Dependencies**

After installation, go to your project directory and install dependencies:

```
cd my-tanstack-app
npm install
npm run dev
```

This will start a development server, and your app will be ready to go!

---

## 9. [TanStack Start vs. Next.js: Choosing the right full-stack React ...](https://blog.logrocket.com/tanstack-start-vs-next-js-choosing-the-right-full-stack-react-framework/)

**URL:** https://blog.logrocket.com/tanstack-start-vs-next-js-choosing-the-right-full-stack-react-framework/
**Domain:** blog.logrocket.com

**Excerpt:**

Last updated: 20250627
To get started, developers typically use the Quick Start approach by cloning an example project from the official TanStack Router repository:

```
npx gitpick TanStack/router/tree/main/examples/react/start-basic start-basic
cd start-basic
npm install
npm run dev
```

Note: `gitpick` is an official tool that lets you clone only a specific folder from a GitHub repo. Alternatively, you can set up a TanStack Start project from scratch, which involves a more hands-on approach and gives full control for customization. For a detailed, step-by-step guide on this process, refer to the [introduction to the TanStack Start framework](https://blog.logrocket.com/tanstack-start-overview/) article. * * *

* * *

## Should you choose TanStack Start or Next JS?

---

## 10. [React TanStack Start Start Basic Example](https://tanstack.com/start/latest/docs/framework/react/examples/start-basic)

**URL:** https://tanstack.com/start/latest/docs/framework/react/examples/start-basic
**Domain:** tanstack.com

**Excerpt:**

Last updated before: 2025-11-19
'~/components/NotFound'
import appCss from '~/styles/app.css?url'
import { seo } from '~/utils/seo'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      ...seo({
        title:
          'TanStack Start | Type-Safe, Client-First, Full-Stack React Framework',
        description: `TanStack Start is a type-safe, client-first, full-stack React framework.

---

## 11. [TanStack Start Quickstart | Convex Developer Hub](https://docs.convex.dev/quickstart/tanstack-start)

**URL:** https://docs.convex.dev/quickstart/tanstack-start
**Domain:** docs.convex.dev

**Excerpt:**

Last updated before: 2025-11-15
To use Clerk with Convex and TanStack Start, see the [TanStack Start + Clerk guide](/client/tanstack/tanstack-start/clerk)

* * *

Learn how to query data from Convex in a TanStack Start site. 1. Create a TanStack Start site
   
   Create a TanStack Start app using the `create-start-app` command:
   
   ```
   npx create-start-app@latest
   ```
2. Install the Convex client and server library
   
   To get started with Convex install the `convex` package and a few React Query-related packages. ```
   npm install convex @convex-dev/react-query @tanstack/react-router-with-query @tanstack/react-query
   ```
3. Update app/routes/\_\_root.tsx
   
   Add a `QueryClient` to the router context to make React Query usable anywhere in the TanStack Start site.

---

## 12. [Comparison | TanStack Router & TanStack Start vs Next.js vs React ...](https://tanstack.com/router/v1/docs/framework/react/comparison)

**URL:** https://tanstack.com/router/v1/docs/framework/react/comparison
**Domain:** tanstack.com

**Excerpt:**

Last updated before: 2025-11-16
[TanStack](/)

[Router v1 v1](/router)

Search...

\+ K

[](https://x.com/tan_stack) [](https://bsky.app/profile/tanstack.com) [](https://instagram.com/tan_stack)

Auto

[Log In](/login)

# Comparison | TanStack Router & TanStack Start vs Next.js vs React Router / Remix

Copy Markdown

Choosing a routing solution? This side‑by‑side comparison highlights key features, trade‑offs, and common use cases to help you quickly evaluate how each option fits your project’s needs. While we aim to provide an accurate and fair comparison, please note that this table may not capture every nuance or recent update of each library. We recommend reviewing the official documentation and trying out each solution to make the most informed decision for your specific use case.

---

## 13. [Learn TanStack Start in 7 Minutes - YouTube](https://www.youtube.com/watch?v=WG7x4kG9pFI)

**URL:** https://www.youtube.com/watch?v=WG7x4kG9pFI
**Domain:** www.youtube.com

**Excerpt:**

Last updated: 20250225
Learn TanStack Start in 7 Minutes

Search Watch later Share Copy link Info Shopping

Tap to unmute

2x

If playback doesn't begin shortly, try restarting your device.

•

You're signed out

Videos you watch may be added to the TV's watch history and influence TV recommendations. To avoid this, cancel and sign in to YouTube on your computer.

Cancel Confirm

Video unavailable

Share

Include playlist

An error occurred while retrieving sharing information. Please try again later.

0:00

0:00 / 6:51 • Watch full video Live

•

•


---

## 14. [TanStack React Start Quickstart (beta)](https://clerk.com/docs/quickstarts/tanstack-react-start)

**URL:** https://clerk.com/docs/quickstarts/tanstack-react-start
**Domain:** clerk.com

**Excerpt:**

Last updated: 20251030
## Before you start

* [Set up a Clerk application](/docs/getting-started/quickstart/setup-clerk)
* [Create a TanStack React Start application](https://tanstack.com/start/latest/docs/framework/react/getting-started)

## Example repository

* [TanStack React Start Quickstart Repo](https://github.com/clerk/clerk-tanstack-react-start-quickstart)

## [Install `@clerk/tanstack-react-start`]()

The [Clerk TanStack React Start SDK](/docs/reference/tanstack-react-start/overview) gives you access to prebuilt components, React hooks, and helpers to make user authentication easier.
 ... 
Your ID is { state .userId}!</ h1 > }
```

## [Create your first user]()

Run your project with the following command:

npm

yarn

pnpm

bun

terminal

```
npm run dev
```

terminal

```
yarn dev
```

terminal

```
pnpm dev
```

terminal

```
bun dev
```

Visit your app's homepage at [http://localhost:3000 ⁠](http://localhost:3000) . Sign up to create your first user. ## [Next steps]()

### [Core concepts](/docs/getting-started/core-concepts)

Before building your application, it's important to understand the core concepts and objects that drive Clerk's powerful authentication and user management system.

---

## 15. [Why developers are leaving Next.js for TanStack Start, and loving it](https://appwrite.io/blog/post/why-developers-leaving-nextjs-tanstack-start)

**URL:** https://appwrite.io/blog/post/why-developers-leaving-nextjs-tanstack-start
**Domain:** appwrite.io

**Excerpt:**

Last updated: 20251024
They're using it for **production apps** , internal dashboards, and even company websites. A few examples mentioned in community threads:

* A **real-time quiz app** built for an event, where switching from React Router 7 to TanStack Start fixed hydration issues right before launch. * A **multi-language analytics dashboard** powered by Laravel on the backend and TanStack Start on the frontend, praised for its easy SSR setup. * **Startups and indie projects** migrating from Next.js because they wanted more predictable code and simpler local hosting options. Many devs say TanStack Start lets them **scale from side projects to production** without losing control or adding complexity. ## [Why this shift matters](#)

This shift isn't just about replacing one framework with another.

---
