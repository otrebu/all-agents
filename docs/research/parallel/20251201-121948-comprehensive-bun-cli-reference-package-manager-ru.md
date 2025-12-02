# Parallel Search Results

**Query:** Comprehensive Bun CLI reference: package manager, runtime, bundler, test runner, and workspaces - comparing with Node.js, npm/pnpm, tsc, Vite, Jest/Vitest
**Results:** 15
**Execution:** 2.4s

**Top Domains:**
- www.reddit.com: 4 results (27%)
- bun.com: 2 results (13%)
- dev.to: 2 results (13%)
- betterstack.com: 2 results (13%)
- strapi.io: 1 results (7%)

---

## 1. [bun install](https://bun.com/docs/pm/cli/install)

**URL:** https://bun.com/docs/pm/cli/install
**Domain:** bun.com

**Excerpt:**

[Skip to main content]()

[Bun home page](/docs)

Search...

⌘K

* [Install Bun](https://www.bun.com/docs/installation)

Search...

Navigation

Core Commands

bun install

[Runtime](/docs) [Package Manager](/docs/pm/cli/install) [Bundler](/docs/bundler) [Test Runner](/docs/test) [Guides](/docs/guides) [Reference](https://bun.com/reference) [Blog](https://bun.com/blog) [Feedback](/docs/feedback)

##### Core Commands

* [bun install](/docs/pm/cli/install)
* [bun add](/docs/pm/cli/add)
* [bun remove](/docs/pm/cli/remove)
* [bun update](/docs/pm/cli/update)
* [bunx](/docs/pm/bunx)

##### Publishing & Analysis

* [bun publish](/docs/pm/cli/publish)
* [bun outdated](/docs/pm/cli/outdated)
* [bun why](/docs/pm/cli/why)
* [bun audit](/docs/pm/cli/audit)
* [bun info](/docs/pm/cli/info)

##### Workspace Management

* [Workspaces](/docs/pm/workspaces)
* [Catalogs](/docs/pm/catalogs)
* [bun link](/docs/pm/cli/link)
* [bun pm](/docs/pm/cli/pm)

Core Commands

# bun install

Copy page

Install
packages with Bun’s fast package manager

Copy page

## [​]()

Basic Usage

terminal

Copy

```
bun  install  react bun  install [[email protected]](/cdn-cgi/l/email-protection)  # specific version bun  install  react@latest  # specific tag
```

The `bun` CLI contains a Node.js-compatible package manager designed to be a dramatically faster replacement for `npm` , `yarn` , and `pnpm` . It’s a standalone tool that will work in pre-existing Node.js projects; if your project has a `package.json` , `bun install` can help you speed up your workflow. **⚡️ 25x faster** — Switch from `npm install` to `bun install` in any Node.js project to make your installations up to 25x faster. To install all dependencies of a project:

terminal

Copy

```
bun  install
```

Running `bun install` will:

* **Install** all `dependencies` , `devDependencies` , and `optionalDependencies` . Bun will install `peerDependencies` by default.
* **Run** your project’s `{pre|post}install` and `{pre|post}prepare` scripts at the appropriate time. For security reasons Bun _does not execute_ lifecycle scripts of installed dependencies. * **Write** a `bun.lock` lockfile to the project root. * * *

## [​]()

Logging

To modify logging verbosity:

terminal

Copy

```
bun  install  --verbose  # debug logging bun  install  --silent   # no logging
```

* * *

## [​]()

Lifecycle scripts

Unlike other npm clients, Bun does not execute arbitrary lifecycle scripts like `postinstall` for installed dependencies. Executing arbitrary scripts represents a potential security risk. To tell Bun to allow lifecycle scripts for a particular package, add the package to `trustedDependencies` in your package.json. package.json

Copy

```
{   " name " :  " my-app " ,   " version " :  " 1.0.0 " ,   " trustedDependencies " :  [ " my-trusted-package " ]  }
```

Then re-install the package.
Bun will read this field and run lifecycle scripts for `my-trusted-package` . Lifecycle scripts will run in parallel during installation. To adjust the maximum number of concurrent scripts, use the `--concurrent-scripts` flag. The default is two times the reported cpu count or GOMAXPROCS. terminal

Copy

```
bun  install  --concurrent-scripts  5
```

Bun automatically optimizes postinstall scripts for popular packages (like `esbuild` , `sharp` , etc.) by determining which scripts need to run. To disable these optimizations:

terminal

Copy

```
BUN_FEATURE_FLAG_DISABLE_NATIVE_DEPENDENCY_LINKER = 1  bun  install BUN_FEATURE_FLAG_DISABLE_IGNORE_SCRIPTS = 1  bun  install
```

* * *

## [​]()

Workspaces

Bun supports `"workspaces"` in package.json. For complete documentation refer to [Package manager > Workspaces](/docs/pm/workspaces) .
package.json

Copy

```
{   " name " :  " my-app " ,   " version " :  " 1.0.0 " ,   " workspaces " :  [ " packages/* " ],    " dependencies " :  {     " preact " :  " ^10.5.13 "   } }
```

* * *

## [​]()

Installing dependencies for specific packages

In a monorepo, you can install the dependencies for a subset of packages using the `--filter` flag. terminal

Copy

```
# Install dependencies for all workspaces except `pkg-c` bun  install  --filter  ' !pkg-c ' # Install dependencies for only `pkg-a` in `./packages/pkg-a` bun  install  --filter  ' ./packages/pkg-a '
```

For more information on filtering with `bun install` , refer to [Package Manager > Filtering](/docs/pm/filter)

* * *

## [​]()

Overrides and resolutions

Bun supports npm’s `"overrides"` and Yarn’s `"resolutions"` in `package.json` . These are mechanisms for specifying a version range for _metadependencies_ —the dependencies of your dependencies.
Refer to [Package manager > Overrides and resolutions](/docs/pm/overrides) for complete documentation. package.json

Copy

```
{   " name " :  " my-app " ,   " dependencies " :  {     " foo " :  " ^2.0.0 "   },   " overrides " :  {      " bar " :  " ~4.4.0 "   }  }
```

* * *

## [​]()

Global packages

To install a package globally, use the `-g` / `--global` flag. Typically this is used for installing command-line tools. terminal

Copy

```
bun  install  --global  cowsay  # or `bun install -g cowsay` cowsay  " Bun! " ```

Copy

```
 ______ < Bun! >  ------         \   ^__^          \  (oo)\_______             (__)\       )\/\                 ||----w |                 ||     ||
```

* * *

## [​]()

Production mode

To install in production mode (i.e. without `devDependencies` or `optionalDependencies` ):

terminal

Copy

```
bun  install  --production
```

For reproducible installs, use `--frozen-lockfile` .
This will install the exact versions of each package specified in the lockfile. If your `package.json` disagrees with `bun.lock` , Bun will exit with an error. The lockfile will not be updated. terminal

Copy

```
bun  install  --frozen-lockfile
```

For more information on Bun’s lockfile `bun.lock` , refer to [Package manager > Lockfile](/docs/pm/lockfile) . * * *

## [​]()

Omitting dependencies

To omit dev, peer, or optional dependencies use the `--omit` flag. terminal

Copy

```
# Exclude "devDependencies" from the installation. This will apply to the # root package and workspaces if they exist. Transitive dependencies will # not have "devDependencies". bun  install  --omit  dev # Install only dependencies from "dependencies" bun  install  --omit=dev  --omit=peer  --omit=optional
```

* * *

## [​]()

Dry run

To perform a dry run (i.e.
don’t actually install anything):

terminal

Copy

```
bun  install  --dry-run
```

* * *

## [​]()

Non-npm dependencies

Bun supports installing dependencies from Git, GitHub, and local or remotely-hosted tarballs. For complete documentation refer to [Package manager > Git, GitHub, and tarball dependencies](/docs/pm/cli/add) .
 ... 
It installs exact versions from `bun.lock` and fails if `package.json` doesn’t match the lockfile. To use `bun ci` or `bun install --frozen-lockfile` , you must commit `bun.lock` to version control. And instead of running `bun install` , run `bun ci` . .github/workflows/release.yml

Copy

```
name :  bun-types jobs :   build :     name :  build-app     runs-on :  ubuntu-latest     steps :       -  name :  Checkout repo         uses :  actions/checkout@v4       -  name :  Install bun         uses :  oven-sh/setup-bun@v2       -  name :  Install dependencies         run :  bun ci       -  name :  Build app         run :  bun run build
```

## [​]()

Platform-specific dependencies? bun stores normalized `cpu` and `os` values from npm in the lockfile, along with the resolved packages. It skips downloading, extracting, and installing packages disabled for the current target at runtime.
 ... 
If you install with `--backend=symlink` , Node.js won’t resolve node\_modules of dependencies unless each dependency has its own node\_modules folder or you pass `--preserve-symlinks` to `node` or `bun` . See [Node.js documentation on `--preserve-symlinks`](https://nodejs.org/api/cli.html) . Copy

```
rm  -rf  node_modules bun  install  --backend  symlink bun  --preserve-symlinks  ./my-file.js node  --preserve-symlinks  ./my-file.js  # https://nodejs.org/api/cli.html
```

## [​]()

npm registry metadata

Bun uses a binary format for caching NPM registry responses. This loads much faster than JSON and tends to be smaller on disk. You will see these files in `~/.bun/install/cache/*.npm` . The filename pattern is `${hash(packageName)}.npm` . It’s a hash so that extra directories don’t need to be created for scoped packages. Bun’s usage of `Cache-Control` ignores `Age` .
This improves performance, but means bun may be about 5 minutes out of date to receive the latest package version metadata from npm. ## [​]()

pnpm migration

Bun automatically migrates projects from pnpm to bun. When a `pnpm-lock.yaml` file is detected and no `bun.lock` file exists, Bun will automatically migrate the lockfile to `bun.lock` during installation. The original `pnpm-lock.yaml` file remains unmodified. terminal

Copy

```
bun  install
```

**Note** : Migration only runs when `bun.lock` is absent. There is currently no opt-out flag for pnpm migration.

---

## 2. [Comparing Javascript test frameworks: Jest vs Vitest vs Bun](https://dev.to/kcsujeet/your-tests-are-slow-you-need-to-migrate-to-bun-9hh)

**URL:** https://dev.to/kcsujeet/your-tests-are-slow-you-need-to-migrate-to-bun-9hh
**Domain:** dev.to

**Excerpt:**

[](//forem.com)

### Forem Feed

Follow new Subforems to improve your feed

[](//dev.to)

[](//dev.to)

### [DEV Community](//dev.to)

Follow

A space to discuss and keep up software development and manage your software career

[](//gg.forem.com)

[](//gg.forem.com)

### [Gamers Forem](//gg.forem.com)

Follow

An inclusive community for gaming enthusiasts

[](//future.forem.com)

[](//future.forem.com)

### [Future](//future.forem.com)

Follow

News and discussion of science and technology such as AI, VR, cryptocurrency, quantum computing, and more. [](//music.forem.com)

[](//music.forem.com)

### [Music Forem](//music.forem.com)

Follow

From composing and gigging to gear, hot music takes, and everything in between. [](//vibe.forem.com)

[](//vibe.forem.com)

### [Vibe Coding Forem](//vibe.forem.com)

Follow

Discussing AI software development, and showing off what we're building.
[](//open.forem.com)

[](//open.forem.com)

### [Open Forem](//open.forem.com)

Follow

A general discussion space for the Forem community. If it doesn't have a home elsewhere, it belongs here

[](//popcorn.forem.com)

[](//popcorn.forem.com)

### [Popcorn Movies and TV](//popcorn.forem.com)

Follow

Movie and TV enthusiasm, criticism and everything in-between. [](//dumb.dev.to)

[](//dumb.dev.to)

### [DUMB DEV Community](//dumb.dev.to)

Follow

Memes and software development shitposting

[](//design.forem.com)

[](//design.forem.com)

### [Design Community](//design.forem.com)

Follow

Web design, graphic design and everything in-between

[](//golf.forem.com)

[](//golf.forem.com)

### [Golf Forem](//golf.forem.com)

Follow

A community of golfers and golfing enthusiasts

[](//zeroday.forem.com)

[](//zeroday.forem.com)

### [Security Forem](//zeroday.forem.com)

Follow

Your central hub for all things security.
From ethical hacking and CTFs to GRC and career development, for beginners and pros alike

[](//scale.forem.com)

[](//scale.forem.com)

### [Scale Forem](//scale.forem.com)

Follow

For engineers building software at scale. We discuss architecture, cloud-native, and SRE—the hard-won lessons you can't just Google

[](//core.forem.com)

[](//core.forem.com)

### [Forem Core](//core.forem.com)

Follow

Discussing the core forem open source software project — features, bugs, performance, self-hosting. [](//crypto.forem.com)

[](//crypto.forem.com)

### [Crypto Forem](//crypto.forem.com)

Follow

A collaborative community for all things Crypto—from Bitcoin to protocol development and DeFi to NFTs and market analysis. [](//parenting.forem.com)

[](//parenting.forem.com)

### [Parenting](//parenting.forem.com)

Follow

A place for parents to the share the joys, challenges, and wisdom that come from raising kids. We're here for them and for each other.
[](//maker.forem.com)

[](//maker.forem.com)

### [Maker Forem](//maker.forem.com)

Follow

A community for makers, hobbyists, and professionals to discuss Arduino, Raspberry Pi, 3D printing, and much more.
[](/subforems/new) [](/subforems)

[Skip to content]()

[](/)

[Powered by Algolia](https://www.algolia.com/developers/?utm_source=devto&utm_medium=referral)

[Log in](https://dev.to/enter?signup_subforem=1) [Create account](https://dev.to/enter?signup_subforem=1&state=new-user)

## DEV Community

Add reaction

Like Unicorn Exploding Head Raised Hands Fire

Jump to Comments Save Boost

Moderate

Copy link

Copied to Clipboard

[Share to X](https://twitter.com/intent/tweet?text=%22Comparing%20Javascript%20test%20frameworks%3A%20Jest%20vs%20Vitest%20vs%20Bun%22%20by%20kcsujeet%20%23DEVCommunity%20https%3A%2F%2Fdev.to%2Fkcsujeet%2Fyour-tests-are-slow-you-need-to-migrate-to-bun-9hh) [Share to
LinkedIn](https://www.linkedin.com/shareArticle?mini=true&url=https%3A%2F%2Fdev.to%2Fkcsujeet%2Fyour-tests-are-slow-you-need-to-migrate-to-bun-9hh&title=Comparing%20Javascript%20test%20frameworks%3A%20Jest%20vs%20Vitest%20vs%20Bun&summary=Discover%20how%20switching%20to%20Bun%E2%80%99s%20built-in%20test%20runner%20can%20dramatically%20speed%20up%20your%20JavaScript%20and%20TypeScript%20test%20suites.%20In%20this%20post%2C%20I%20compare%20Jest%2C%20Vitest%2C%20and%20Bun%20using%20my%20Ilamy%20Calendar%20project%2C%20share%20real%20benchmark%20data%2C%20and%20provide%20a%20live%20demo%20so%20you%20can%20try%20it%20yourself.&source=DEV%20Community) [Share to Facebook](https://www.facebook.com/sharer.php?u=https%3A%2F%2Fdev.to%2Fkcsujeet%2Fyour-tests-are-slow-you-need-to-migrate-to-bun-9hh) [Share to Mastodon](https://toot.kytta.dev/?text=https%3A%2F%2Fdev.to%2Fkcsujeet%2Fyour-tests-are-slow-you-need-to-migrate-to-bun-9hh)

[Report
Abuse](/report-abuse)

[](https://media2.dev.to/dynamic/image/width=1000,height=420,fit=cover,gravity=auto,format=auto/https%3A%2F%2Fdev-to-uploads.s3.amazonaws.com%2Fuploads%2Farticles%2F7gurdjbnjkcg7w69actx.png)

[](/kcsujeet)

[kcsujeet](/kcsujeet)

Posted on• Edited on

# Comparing Javascript test frameworks: Jest vs Vitest vs Bun

[\# bunjs](/t/bunjs) [\# jest](/t/jest) [\# vitest](/t/vitest) [\# comparison](/t/comparison)

If you’ve ever felt like running your tests is like waiting for water to boil, you’re not alone. I’ve been there. For my latest project, **[ilamy Calendar](https://ilamy.dev)** ( [intro article here](https://dev.to/kcsujeet/introducing-ilamy-calendar-a-modern-react-calendar-built-for-developers-71p) ), I wanted to keep things simple and stick to _one_ toolchain for everything: runtime, package manager, and testing. That led me to try Bun’s built-in test runner. What happened next surprised me: I wrote some tests, ran the tests and saw my tests run _instantly_ .
I’m talking milliseconds. I’ve used Jest before. I’ve used Vitest too. Jest, in particular, has always felt slow to me — slow enough to grab coffee while waiting for the test suite to finish. But I wanted real numbers to see just how much faster Bun was, so I ran a little experiment. > **Disclaimer** : These benchmarks are only the findings from my specific project. They might differ in your own setup, and the fastest option for me may not be the fastest for you. Everything here is based on my personal experience and opinions. > 
> 

## []() The Experiment

I set up **Jest** , **Vitest** , and **Bun test** in the same project. Then I ran:

* The same 223 tests
* Across 14 files
* Ten times for each runner

No code changes, just swapping the runner. ## []() The Results

Here’s the _average_ runtime across those ten runs:

|Test Runner |Avg.
Time (seconds) |
| --- | --- |
|Bun Test |~2.15s |
|Vitest |~5.3s |
|Jest |~9.8s |

And here’s the raw data for the curious:

### []() Jest:

|Run # |Time (s) |
| --- | --- |
|1 |12\.689 |
|2 |10\.299 |
|3 |9\.521 |
|4 |9\.392 |
|5 |9\.542 |
|6 |10\.265 |
|7 |9\.469 |
|8 |9\.670 |
|9 |9\.584 |
|10 |9\.374 |

Lowest: 9.374 | Highest: 12.689 | Average: 9.980

### []() Vitest:

|Run # |Time (s) |
| --- | --- |
|1 |5\.930 |
|2 |5\.250 |
|3 |5\.320 |
|4 |5\.130 |
|5 |5\.130 |
|6 |5\.180 |
|7 |5\.450 |
|8 |5\.160 |
|9 |5\.270 |
|10 |5\.300 |

Lowest: 5.130 | Highest: 5.930 | Average: 5.312

### []() Bun Test:

|Run # |Time (s) |
| --- | --- |
|1 |2\.160 |
|2 |2\.130 |
|3 |2\.200 |
|4 |2\.130 |
|5 |2\.130 |
|6 |2\.130 |
|7 |2\.160 |
|8 |2\.140 |
|9 |2\.210 |
|10 |2\.140 |

Lowest: 2.130 | Highest: 2.210 | Average: 2.153

The speed difference is so significant that even small projects benefit immediately. When you scale up to hundreds or thousands of tests, the time saved becomes massive.
## []() Try It Yourself — Realtime Demo

I’ve set up a **live demo** where you can run tests with Jest, Vitest, and Bun side-by-side and see the difference for yourself:

💻 **Demo and Source code:** [View on CodeSandbox](https://codesandbox.io/p/devbox/tender-wescoff-dzpx7j)

[](https://media2.dev.to/dynamic/image/width=800%2Cheight=%2Cfit=scale-down%2Cgravity=auto%2Cformat=auto/https%3A%2F%2Fdev-to-uploads.s3.amazonaws.com%2Fuploads%2Farticles%2Fw84k7xzu4bak5id8t2w8.gif)

## []() Migrating to Bun Test

If you’re using Jest or Vitest, migrating is surprisingly easy:

1. **Install Bun**

```
curl  -fsSL  https://bun.sh/install | bash
```

1. **Run your tests**

```
bun  test
```

Most of your Jest-style tests will work out of the box. If you use custom mocks, setup files, or advanced Jest features, you might need minor adjustments, but Bun’s compatibility is improving rapidly. ## []() Final Thoughts

I went into this expecting Bun to be fast. I didn’t expect it to be _this_ fast.
If you care about developer productivity, fast feedback loops, and less time watching spinners, you owe it to yourself to try Bun’s test runner. It might just ruin other test runners for you. ## Top comments (0)

Subscribe

Personal Trusted User

[Create template](/settings/response-templates)

Templates let you quickly answer FAQs or store snippets for re-use. Submit Preview [Dismiss](/404.html)

[Code of Conduct](/code-of-conduct) • [Report abuse](/report-abuse)

Are you sure you want to hide this comment? It will become hidden in your post, but will still be visible via the comment's [permalink](#) . Hide child comments as well

Confirm

For further actions, you may consider blocking this person and/or [reporting abuse](/report-abuse)

[kcsujeet](/kcsujeet)

Follow

Full-Stack Developer. Passionate about building clean, user-focused web apps. Sharing tips, tools, and real-world lessons from over 6 years in dev life.

---

## 3. [Why use Vite when Bun is also a bundler? - Vite vs. Bun](https://dev.to/this-is-learning/why-use-vite-when-bun-is-also-a-bundler-vite-vs-bun-2723)

**URL:** https://dev.to/this-is-learning/why-use-vite-when-bun-is-also-a-bundler-vite-vs-bun-2723
**Domain:** dev.to

**Excerpt:**

[](//forem.com)

### Forem Feed

Follow new Subforems to improve your feed

[](//dev.to)

[](//dev.to)

### [DEV Community](//dev.to)

Follow

A space to discuss and keep up software development and manage your software career

[](//gg.forem.com)

[](//gg.forem.com)

### [Gamers Forem](//gg.forem.com)

Follow

An inclusive community for gaming enthusiasts

[](//future.forem.com)

[](//future.forem.com)

### [Future](//future.forem.com)

Follow

News and discussion of science and technology such as AI, VR, cryptocurrency, quantum computing, and more. [](//music.forem.com)

[](//music.forem.com)

### [Music Forem](//music.forem.com)

Follow

From composing and gigging to gear, hot music takes, and everything in between. [](//vibe.forem.com)

[](//vibe.forem.com)

### [Vibe Coding Forem](//vibe.forem.com)

Follow

Discussing AI software development, and showing off what we're building.
[](//open.forem.com)

[](//open.forem.com)

### [Open Forem](//open.forem.com)

Follow

A general discussion space for the Forem community. If it doesn't have a home elsewhere, it belongs here

[](//popcorn.forem.com)

[](//popcorn.forem.com)

### [Popcorn Movies and TV](//popcorn.forem.com)

Follow

Movie and TV enthusiasm, criticism and everything in-between. [](//dumb.dev.to)

[](//dumb.dev.to)

### [DUMB DEV Community](//dumb.dev.to)

Follow

Memes and software development shitposting

[](//design.forem.com)

[](//design.forem.com)

### [Design Community](//design.forem.com)

Follow

Web design, graphic design and everything in-between

[](//golf.forem.com)

[](//golf.forem.com)

### [Golf Forem](//golf.forem.com)

Follow

A community of golfers and golfing enthusiasts

[](//zeroday.forem.com)

[](//zeroday.forem.com)

### [Security Forem](//zeroday.forem.com)

Follow

Your central hub for all things security.
 ... 
[](//parenting.forem.com)

[](//parenting.forem.com)

### [Parenting](//parenting.forem.com)

Follow

A place for parents to the share the joys, challenges, and wisdom that come from raising kids. We're here for them and for each other.
 ... 
LinkedIn](https://www.linkedin.com/shareArticle?mini=true&url=https%3A%2F%2Fdev.to%2Fthis-is-learning%2Fwhy-use-vite-when-bun-is-also-a-bundler-vite-vs-bun-2723&title=Why%20use%20Vite%20when%20Bun%20is%20also%20a%20bundler%3F%20-%20Vite%20vs.%20Bun&summary=You%20might%20have%20heard%20that%20Bun%20is%20not%20just%20a%20runtime%2C%20but%20also%20a%20bundler.%20So%20you%20might%20wonder%3A%20%20Why%20do...&source=DEV%20Community) [Share to Facebook](https://www.facebook.com/sharer.php?u=https%3A%2F%2Fdev.to%2Fthis-is-learning%2Fwhy-use-vite-when-bun-is-also-a-bundler-vite-vs-bun-2723) [Share to Mastodon](https://toot.kytta.dev/?text=https%3A%2F%2Fdev.to%2Fthis-is-learning%2Fwhy-use-vite-when-bun-is-also-a-bundler-vite-vs-bun-2723)

[Report Abuse](/report-abuse)

[](https://media2.dev.to/dynamic/image/width=1000,height=420,fit=cover,gravity=auto,format=auto/https%3A%2F%2Fdev-to-uploads.s3.amazonaws.com%2Fuploads%2Farticles%2Fxs8ttvnf40y6hczmnxsf.png)

[](/this-is-learning)
[](/redbar0n)

[Magne](/redbar0n) for [This is Learning](/this-is-learning)

Posted on• Edited on

# Why use Vite when Bun is also a bundler? - Vite vs. Bun

[\# vite](/t/vite) [\# bunjs](/t/bunjs) [\# node](/t/node) [\# javascript](/t/javascript)

You might have heard that Bun is not just a runtime, but also a bundler. So you might wonder:

Why do we need Vite or any separate bundler? Couldn't we just make do with Bun? I've collected the relevant tweets and documentation I've come across, to provide a centralized and searchable answer to this question. Since I couldn't find any, and searching on Twitter sucks. ## []() What Vite uses for bundling. [Vite](https://vitejs.dev/) is a fast local development server / bundler-toolkit. Even though it touts that it lets you do unbundled development (by way of [ESM](https://dev.to/iggredible/what-the-heck-are-cjs-amd-umd-and-esm-ikm) ), the devil is in the details.
In production especially, Vite does use a bundler to create the bundle of JS that the client receives. It currently uses [two bundlers](https://github.com/vitejs/vite/discussions/7622) , actually. In your local development environment, Vite uses a bundler called [esbuild](https://esbuild.github.io/) to [pre-bundle dependencies](https://vitejs.dev/guide/dep-pre-bundling.html) and convert them into [ESM](https://dev.to/iggredible/what-the-heck-are-cjs-amd-umd-and-esm-ikm) (to enable quick hot starts and hot reloads when you develop). Since Vite uses ESM when you work (instead of creating and always re-creating a client bundle when you update the code) this is what you've heard as [unbundled development](https://vitejs.dev/guide/why.html) . For production, Vite uses the slower JS-based bundler Rollup to create a small client side JS bundle (for faster download), and for potential plugins that use Rollup's flexible API.
 ... 
## []() Bun is many things, also a bundler. Bun is not just a Node replacement, but a [Zig](https://ziglang.org/) port of esbuild (initially the same fast algorithm), so includes it's own (currently limited) bundler:

But what about the apparent overlap between Bun and Vite? Since you can [use Bun as a bundler](https://shaneosullivan.wordpress.com/2023/05/17/using-bun-js-as-a-bundler/) ( [Bun's author Jarred addressed the issues on HN](https://news.ycombinator.com/item?id=35981662) ). Why is Vite still needed? ## []() The answer: Why Vite is still needed. In short, Vite's creator Evan You answered the question here:

So, you can run [Vite on Bun](https://bun.sh/guides/ecosystem/vite) , no problem. [Bun has fully supported Vite since Bun v0.7](https://github.com/oven-sh/bun/issues/250) .
With the current caveat:

> _While Vite currently works with Bun, it has not been heavily optimized, nor has Vite been adapted to use Bun's bundler, module resolver, or transpiler._
> 
> 

So, currently, the distinction stands that:

**Bun is awesome as a Node.js replacement for the server (as a JS runtime). **

**Vite is great for unbundled fast development, and for flexible and optimal bundling of the JS code in production which is sent to clients over the network** . Vite has API's that many developers love, and thus it already has a [good ecosystem](https://patak.dev/vite/ecosystem.html) . Vite has [Hot Module Reloading (HMR)](https://vitejs.dev/guide/api-hmr.html) , which is important for fast local development. [Bun's HMR](https://bun.sh/docs/runtime/hot) currently has [at least](https://github.com/oven-sh/bun/issues?q=is%3Aissue+is%3Aopen+%22--hot%22+OR+%22hmr%22+OR+%22hot+module%22+) one [open issue](https://github.com/oven-sh/bun/issues/833) .
[Bun's HTTP server doc](https://bun.sh/docs/runtime/hot) currently has a note regarding HMR:

> _Note — In a future version of Bun, support for Vite's import.meta.hot is planned to enable better lifecycle management for hot reloading and to align with the ecosystem._
> 
> 

In short: **Bun won't replace Vite in the near future** . (This might be some famous last words, given Bun's author Jarred's productivity, though!) ## []() The future? It's hard to say for the long term future. But my guess is that people will use Vite with Bun under-the-hood, but that Bun slowly will incorporate a lot of Vite's API's, so that in the end Bun will be all you need in one place. It seems to fit with **[Bun](https://bun.sh/)** 's vision of being _**"a fast JavaScript all-in-one toolkit"**_ , as their landing page states. But my guess is that **[Vite](https://vitejs.dev/)** will still be _**"Next Generation Frontend Tooling"**_ for a while.
If only for all of the projects that will still run on [Node](https://nodejs.org/en) , due to:

* Developer caution and inertia (even Vite is new to many!). * Bun's current compatibility issues and [bugs](https://github.com/oven-sh/bun/issues?q=is%3Aissue+is%3Aopen+label%3Abug+) . * Bun's currently [5%](https://bun.sh/docs/api/node-api) [missing Node API's](https://github.com/oven-sh/bun/issues/158) might be a blocker for some. * The current lack of [Bun support on Edge network environments](https://x.com/RogersKonnor/status/1704136067467579400?s=20) . I.e. [Cloudflare Workers is it's own JS runtime](https://community.cloudflare.com/t/bun-apps-support/406644) that use V8 isolates (like Chrome tabs). Whereas Bun uses JSC instead of V8, and [Bun plans on building it's own Edge network hosting](https://x.com/magnemg/status/1704167759469240467?s=20) , custom hardware distributed globally and all. That may take a while.
Also, [AWS adding Bun as a native runtime](https://twitter.com/thdxr/status/1701570542510191029) is currently [an open question](https://x.com/thdxr/status/1701353443380658667?s=20) , which would be needed to [reduce cold starts](https://x.com/thdxr/status/1701335615118164367?s=20) . **Do you think Bun will replace Vite in the medium to distant future, and if so, why? ** Share your thoughts in the comments. Alternate article titles: Vite vs. Bun comparison. Bun vs. Vite comparison. ## Top comments (11)

Subscribe

Personal Trusted User

[Create template](/settings/response-templates)

Templates let you quickly answer FAQs or store snippets for re-use. Submit Preview [Dismiss](/404.html)

[View full discussion (11 comments)](/this-is-learning/why-use-vite-when-bun-is-also-a-bundler-vite-vs-bun-2723/comments)

[Code of Conduct](/code-of-conduct) • [Report abuse](/report-abuse)

Are you sure you want to hide this comment?

---

## 4. [Bun vs Node.js 2025: Performance, Speed & Developer ...](https://strapi.io/blog/bun-vs-nodejs-performance-comparison-guide)

**URL:** https://strapi.io/blog/bun-vs-nodejs-performance-comparison-guide
**Domain:** strapi.io

**Excerpt:**

[](http://twitter.com/intent/tweet?url=https://strapi.io/blog/bun-vs-nodejs-performance-comparison-guide&text=Bun%20vs%20Node.js%202025:%20Performance,%20Speed%20&%20Developer%20Guide)
* [](mailto:?subject=Bun%20vs%20Node.js%202025:%20Performance,%20Speed%20&%20Developer%20Guide&body=Compare%20Bun%20vs%20Node.js%20performance,%20speed,%20and%20developer%20experience.%20Get%20benchmarks,%20migration%20tips,%20and%20decide%20which%20runtime%20fits%20your%20project.%20https://strapi.io/blog/bun-vs-nodejs-performance-comparison-guide)

You've watched `npm install` stall at 97%, stared at cryptic `ts-node` stack traces, and accepted these delays as inevitable. A growing number of developers are swapping V8 for Bun's JavaScriptCore engine and discovering test suites that start instantly and package installs that finish before your coffee cools.
 ... 
**In brief:**

* Bun delivers 4× HTTP throughput and halves CPU-intensive task completion times compared to Node.js thanks to its JavaScriptCore engine
* Bun consolidates runtime, package manager, bundler, and test runner in a single binary while Node requires separate tools for each function
* Bun runs TypeScript files natively without transpilation, while Node.js requires additional configuration and build steps
* Node.js offers a decade of stability and millions of compatible packages, while Bun has growing but incomplete compatibility with some npm modules
* Choose Node.js for large, existing codebases and enterprise requirements; choose Bun for greenfield projects, serverless functions, and performance-critical applications

## **Bun vs Node.js: Understanding the Contenders**

Both runtimes handle [server-side JavaScript](https://strapi.io/blog/ssr-vs-ssg-in-nextjs-differences-advantages-and-use-cases) , but their approaches to tooling, performance, and developer experience
differ significantly. ### **What is Node.js? **

[Node.js](https://strapi.io/integrations/nodejs-cms) has powered server-side JavaScript since 2009, building an extensive production track record. Running on Google's V8 engine, it excels at event-driven workloads and long-running processes—the foundation for everything from API servers to build pipelines. The npm registry contains over a million packages, giving you dependencies for virtually any task. This ecosystem comes with complexity. Package management requires npm or Yarn, bundling needs Webpack or Rollup, testing relies on Jest or Mocha—each tool brings its own configuration and version considerations. You manage this toolchain because the community support, documentation, and production stories are comprehensive. ### **What is Bun?
**

[Bun](https://bun.com/) consolidates what Node.js spreads across multiple tools: runtime, package manager, bundler, and Jest-compatible [test runner](https://strapi.io/blog/nextjs-testing-guide-unit-and-e2e-tests-with-vitest-and-playwright) in a single binary. Built on WebKit's JavaScriptCore instead of V8, it delivers substantial performance gains. CPU-intensive tasks complete in 1.7 seconds versus Node's 3.4 seconds, according to testing data. Bun runs TypeScript directly without transpilation and starts instantly, which benefits serverless deployments and CI pipelines. The project aims for drop-in Node.js API compatibility while eliminating the configuration overhead that most developers accept as standard practice. ## **Bun vs Node.js: Head-to-Head Comparison**

You can read spec sheets all day, but side-by-side experience is where differences surface. The following sections walk through the points you'll notice the moment you open a terminal or push traffic to production.
Here's a comprehensive overview of the key differences between both runtimes:

|Decision Factor |Node.js (V8) |Bun (JavaScriptCore) |
| --- | --- | --- |
|JavaScript engine |Google V8 |WebKit JavaScriptCore |
|Package manager |npm / Yarn (external) |Integrated `bun install` (npm-compatible) |
|Bundler & transpiler |webpack, esbuild, Rollup (choose one) |Built-in ( `bun build` ) |
|Test runner |Jest, Vitest, Mocha (external) |Built-in ( `bun test` ) |
|[TypeScript execution](https://strapi.io/blog/typescript-vs-javascript-which-one-should-you-use-with-strapi) |Needs `tsc` , `ts-node` , or the new experimental flag |Native, zero-config execution |
|HTTP throughput |~13k req/s |~52k req/s – 4× faster |
|CPU-heavy task time |3,400 ms |1,700 ms – 2× faster |
|Ecosystem maturity |Decade-old, millions of packages |Growing, most npm packages work but not all |

  
### **Key Differentiators**

The most fundamental difference is philosophy: Bun ships with a package manager, bundler, and test
 ... 
### **Runtime Engines**

V8's JIT optimizations have powered Node.js for years, but JavaScriptCore gives Bun a different set of strengths. The impact is immediate in CI jobs and local dev servers: projects that take five seconds to boot under Node often pop up in under two with Bun. Benchmarks [back this up](https://betterstack.com/community/guides/scaling-nodejs/nodejs-vs-deno-vs-bun/) . In an Express-style HTTP test, Bun sustained roughly 52,000 requests per second while Node plateaued at 13,000. CPU-bound work tells the same story: generating and sorting 100,000 numbers finished in 1,700 ms on Bun versus 3,400 ms on Node. Lower memory usage and faster startup make JavaScriptCore ideal for serverless or edge deployments, where cold-start latency translates directly to user wait time. For long-running monoliths the gap narrows—V8's on-the-fly optimizations still shine after hours or days—but the up-front responsiveness can reshape your feedback loop during development.
### **Module Systems**

"Will my existing code run?" is the first migration question. Node today supports both CommonJS ( `require` ) and ECMAScript Modules ( `import` ) but often forces you to juggle `type` fields, file extensions, or `--experimental-modules` flags. Bun aims for drop-in compatibility:

```
1 // math.cjs – CommonJS 2 module . exports = ( a ,  b ) =>  a  +  b ; 3 4 // app.mjs – ESM importing CJS 5 import sum from './math.cjs' ; 6 console . log ( sum ( 2 , 3 ) ) ;
```

Run it with either `node app.mjs` (after the right `package.json` dance) or `bun app.mjs` . Most mixed-format projects behave out of the box in Bun, but edge-case Node APIs—especially native add-ons—can still break. When you hit one, swapping in an ESM-friendly version or isolating that dependency behind a small wrapper keeps the migration incremental. ### **Built-in Tooling**

Node.js provides a runtime and lets the community handle everything else, while Bun ships as a complete JavaScript toolkit.
This difference becomes stark when starting a typical TypeScript [React project](https://strapi.io/blog/how-to-build-a-to-do-list-application-with-strapi-and-react-js) . Node.js embraces the Unix philosophy of specialized tools. Starting a TypeScript React project requires assembling your toolchain piece by piece:

```
1 npm init  - y
 2 npm install react react - dom
 3 npm install  -- save - dev typescript @types / react vite jest
 4 npx tsc  -- init
 5 npx vite
```

You're managing five separate tools (npm, TypeScript, Vite, Jest, React Testing Library), each with its own configuration file, version compatibility matrix, and update cycle.
This modular approach offers advantages:

* **Flexibility** : Swap Vite for Webpack, Jest for Vitest, npm for pnpm
* **Customization** : Fine-tune every tool's behavior through extensive configs
* **Ecosystem depth** : Thousands of plugins, loaders, and transformers available
* **Incremental adoption** : Update tools independently as needed

Bun consolidates these tools into the runtime itself, eliminating the integration tax::

```
1 bun init react - ts  .
2 bun  add react react - dom
 3 bun run dev           #  Vite - style dev server baked  in 4 bun test              #  Jest - like runner ,  zero config
```

The integrated approach delivers immediate benefits:

* **Zero configuration** : TypeScript, JSX, and testing work out of the box
* **Consistent behavior** : No version mismatches between tools
* **Faster operations** : Package installation streams and compiles in parallel
* **Simpler onboarding** : New developers run one command, not five

Package installation finishes sooner— `bun install` streams and compiles packages in parallel, regularly clocking 10× faster than npm in large repos. The absence of configuration sprawl means fewer JSON files, fewer mismatched plugin versions, and quicker onboarding for teammates who just want to ship features. Node.js wins for complex builds requiring custom Webpack loaders, Babel transforms, or enterprise tools like Nx—its plugin ecosystem handles edge cases Bun can't.
 ... 
For advanced scenarios (custom transformers, strict project references) Node's mature tsc ecosystem still offers more knobs to twist, but most teams never need them. Native execution plus faster startup makes Bun a clear fit for type-heavy greenfield services. ### **Performance in Development**

Speed feels different when you're waiting for tests to pass, not just handling production traffic. The development experience reveals distinct performance characteristics between both runtimes. * **Node.js:** Sequential package installations, TypeScript transpilation on every request, and Jest's per-file initialization create noticeable delays. Dev servers parse files on-demand, hot module replacement often triggers full recompiles, and each operation blocks the next. * **Bun:** Parallel package operations, in-memory file processing, and shared test runtime instances eliminate common bottlenecks.

---

## 5. [What is now the state of package managers? : r/node](https://www.reddit.com/r/node/comments/1evtsen/what_is_now_the_state_of_package_managers/)

**URL:** https://www.reddit.com/r/node/comments/1evtsen/what_is_now_the_state_of_package_managers/
**Domain:** www.reddit.com

**Excerpt:**

pnpm works basically identically to npm and takes about 10% the time to build, not to mention disk space, and has an equivalent to nvm baked in.See more

---

## 6. [Bun vs. NPM vs. Yarn: A Comprehensive Guide to JavaScript ...](https://medium.com/@MakeComputerScienceGreatAgain/bun-vs-npm-vs-yarn-a-comprehensive-guide-to-javascript-package-managers-f0ef7a4aabe4)

**URL:** https://medium.com/@MakeComputerScienceGreatAgain/bun-vs-npm-vs-yarn-a-comprehensive-guide-to-javascript-package-managers-f0ef7a4aabe4
**Domain:** medium.com

**Excerpt:**

[Unsplash](https://unsplash.com/?utm_source=medium&utm_medium=referral)

JavaScript has become one of the most popular programming languages in the world, powering everything from small websites to large-scale applications. At the core of JavaScript development is package management — tools that help developers manage libraries, dependencies, and scripts. Three of the most popular package managers are **Bun** , **npm** , and **Yarn** . Each has its strengths and weaknesses, and choosing the right one for your project can significantly impact your workflow and productivity. This article will provide an in-depth comparison of Bun, npm, and Yarn, helping you decide which tool best fits your needs. ## What are Bun, npm, and Yarn? **npm (Node Package Manager)** is the default package manager for Node.js, released in 2010. It allows developers to install and manage dependencies for JavaScript projects, providing a vast repository of packages to use.
 ... 
Learn more about JavaScript package managers here:

[## npm | Home ### We're GitHub, the company behind the npm Registry and npm CLI. We offer those to the community for free, but our day… www.npmjs.com](https://www.npmjs.com/?source=post_page-----f0ef7a4aabe4---------------------------------------)

[## Bun - A fast all-in-one JavaScript runtime ### Bundle, install, and run JavaScript & TypeScript - all in Bun. Bun is a new JavaScript runtime with a native bundler… bun.sh](https://bun.sh/?source=post_page-----f0ef7a4aabe4---------------------------------------)

[## Home page | Yarn ### Yarn, the modern JavaScript package manager yarnpkg.com](https://yarnpkg.com/?source=post_page-----f0ef7a4aabe4---------------------------------------)

[## Node.js - An introduction to the npm package manager ### Node.js® is a JavaScript runtime built on Chrome's V8 JavaScript engine.

---

## 7. [Vitest vs. Jest](https://news.ycombinator.com/item?id=42245442)

**URL:** https://news.ycombinator.com/item?id=42245442
**Domain:** news.ycombinator.com

**Excerpt:**

| |
| --- |
||[](https://news.ycombinator.com) |**[Hacker News](news)** [new](newest) | [past](front) | [comments](newcomments) | <ask> | <show> | <jobs> | <submit> |[login](login?goto=item%3Fid%3D42245442) |
| --- | --- | --- | |
|| |[](vote?id=42245442&how=up&goto=item%3Fid%3D42245442) |[Vitest vs. Jest](https://www.speakeasy.com/post/vitest-vs-jest) ( [speakeasy.com](from?site=speakeasy.com) ) |
| --- | --- | --- |
| |44 points by [ritzaco](user?id=ritzaco) [11 months ago](item?id=42245442) | [hide](hide?id=42245442&goto=item%3Fid%3D42245442) | [past](https://hn.algolia.com/?query=Vitest%20vs.%20Jest&type=story&dateRange=all&sort=byDate&storyText=false&prefix&page=0) | [favorite](fave?id=42245442&auth=1b1788a4c952ab71b54621ef93b2b16686265236) | [37 comments](item?id=42245442) |
| | |
  
|| |[](vote?id=42245650&how=up&goto=item%3Fid%3D42245442) |[mythz](user?id=mythz) [11 months ago](item?id=42245650) | [next]() [[–]](javascript:void\(0\))  
I prefer using bun:test [1] where
 ... 
|
| --- | --- | --- | |
|| |[](vote?id=42245780&how=up&goto=item%3Fid%3D42245442) |[loevborg](user?id=loevborg) [11 months ago](item?id=42245780) | [parent]() | [prev]() | [next]() [[–]](javascript:void\(0\))  
Yes we're using the built-in test runner and it's much better than jest. Jest is full of unneeded magic (= complexity), whereas node:test is straightforward and has a better design. Highly recommended. You can turn off process isolation for extra speedup! |
| --- | --- | --- | |
|| |[](vote?id=42246143&how=up&goto=item%3Fid%3D42245442) |[thecopy](user?id=thecopy) [11 months ago](item?id=42246143) | [root]() | [parent]() | [next]() [[–]](javascript:void\(0\))  
How large is your project? Without process isolation we got 6x speedup vs. jest!

---

## 8. [Build a frontend using Vite and Bun](https://bun.com/docs/guides/ecosystem/vite)

**URL:** https://bun.com/docs/guides/ecosystem/vite
**Domain:** bun.com

**Excerpt:**

[Skip to main content]()

[Bun home page](/docs)

Search...

⌘K

* [Install Bun](https://www.bun.com/docs/installation)

Search...

Navigation

Ecosystem & Frameworks

Build a frontend using Vite and Bun

[Runtime](/docs) [Package Manager](/docs/pm/cli/install) [Bundler](/docs/bundler) [Test Runner](/docs/test) [Guides](/docs/guides) [Reference](https://bun.com/reference) [Blog](https://bun.com/blog) [Feedback](/docs/feedback)

Ecosystem & Frameworks

# Build a frontend using Vite and Bun

Copy page

Copy page

You can use Vite with Bun, but many projects get faster builds & drop hundreds of dependencies by switching to [HTML imports](/docs/bundler/html-static) . * * *

Vite works out of the box with Bun. Get started with one of Vite’s templates.
terminal

Copy

```
bun  create  vite  my-app
```

Copy

```
✔ Select a framework: › React ✔ Select a variant: › TypeScript + SWC Scaffolding project in /path/to/my-app...
```

* * *

Then `cd` into the project directory and install dependencies. terminal

Copy

```
cd  my-app bun  install
```

* * *

Start the development server with the `vite` CLI using `bunx` . The `--bun` flag tells Bun to run Vite’s CLI using `bun` instead of `node` ; by default Bun respects Vite’s `#!/usr/bin/env node` [shebang line](https://en.wikipedia.org/wiki/Shebang_\(Unix\)) . terminal

Copy

```
bunx  --bun  vite
```

* * *

To simplify this command, update the `"dev"` script in `package.json` to the following. package.json

Copy

```
  " scripts " : {     " dev " :  " vite " ,      " dev " :  " bunx --bun vite " ,      " build " :  " vite build " ,     " serve " :  " vite preview "   },   // ...
```

* * *

Now you can start the development server with `bun run dev` .

---

## 9. [Why Bun is so much faster then node?](https://www.reddit.com/r/node/comments/16e19xi/why_bun_is_so_much_faster_then_node/)

**URL:** https://www.reddit.com/r/node/comments/16e19xi/why_bun_is_so_much_faster_then_node/
**Domain:** www.reddit.com

**Excerpt:**

Skip to main content
Open menu Open navigation
Go to Reddit Home
r/node
A chip A close button Get App Get the Reddit app
Log In Log in to Reddit
Expand user menu Open settings menu
Go to node
r/node
r/node
Unofficial Node.js subreddit. Discuss Node.js, JavaScript, TypeScript, and anything else in the Node.js ecosystem!
Members Online •
Professional-League3
Why Bun is so much faster then node?
Why bun is so much faster then node its not like C++ is slower, node is made with c++ and js. Bun is build with zig. Its not like zig is 2 times better then C++. Why there is so much performance gap both are JavaScript and build in Low level language? If WebKit is so better then V8 then why not use it with electron then that would improve electron too right?
Note: I am not thinking about switching to it any time soon till its popular enough. I don't think bun is better just because its fast, i just don't think one is better then the other. I was just curious what made bun faster was it just webkit or zig or the architecture its build in.
Read more
Share
Share
Related Answers Section
Related Answers
Comparison of Bun and Node performance
Bun vs Node.js for real-world applications
Best package managers: pnpm vs npm vs bun
Performance comparison: Deno vs Node vs Bun
Is Bun production ready?
New to Reddit?
Create your account and connect with a world of communities.
Continue with Email
Continue With Phone Number
By continuing, you agree to our User Agreement and acknowledge that you understand the Privacy Policy .
Public
Anyone can view, post, and comment to this community
Top Posts
    * Reddit
reReddit: Top posts of September 9, 2023
    * Reddit
reReddit: Top posts of September 2023
    * Reddit
reReddit: Top posts of 2023


Reddit Rules Privacy Policy User Agreement Accessibility Reddit, Inc. © 2025. All rights reserved.
Expand Navigation
Collapse Navigation
* &nbsp; * &nbsp; * &nbsp;

---

## 10. [npm vs yarn vs pnpm vs bun](https://www.deployhq.com/blog/choosing-the-right-package-manager-npm-vs-yarn-vs-pnpm-vs-bun)

**URL:** https://www.deployhq.com/blog/choosing-the-right-package-manager-npm-vs-yarn-vs-pnpm-vs-bun
**Domain:** www.deployhq.com

**Excerpt:**

[Skip to main content]() [Skip to navigation]()

# Choosing the Right Package Manager: npm vs yarn vs pnpm vs bun

Posted on

[Node](/blog/category/node) , [Open Source](/blog/category/open-source) , [Tips & Tricks](/blog/category/tips) , and [What Is](/blog/category/what-is)

Package managers are essential tools in modern web development, helping developers manage dependencies, scripts, and project configurations. In this post, we'll explore four popular package managers: npm, Yarn, pnpm, and Bun, comparing their features and showing you how to use each one.
 ... 
is a concern
* Performance is critical

## Bonus: Introducing Bun

### What is Bun? Bun is a newer, all-in-one JavaScript runtime and package manager that's gaining significant attention in the web development ecosystem. Created by Jarred Sumner, Bun aims to be a faster, more efficient alternative to Node.js and traditional package managers.
### Bun's Key Features

* **Incredibly Fast** : Built with performance as a top priority
* **Native TypeScript Support** : Runs TypeScript out of the box
* **Compatible with npm** : Directly uses npm packages
* **Built-in Bundler** : Includes a native JavaScript bundler
* **Integrated Package Manager**

### Basic Bun Usage

```
# Install Bun 
curl  -fsSL  https://bun.sh/install | bash

 # Initialize a project 
bun init

 # Install packages 
bun  install  package-name

 # Run scripts 
bun run start

 # Execute files 
bun run index.ts
```

### When to Consider Bun

* High-performance applications
* Projects requiring quick startup times
* Modern JavaScript/TypeScript development
* Experimental and cutting-edge projects

**Note:** While promising, Bun is still relatively new and may not be suitable for all production environments.

---

## 11. [Deno vs. Node.js vs Bun: Full Comparison Guide | Zero To Mastery](https://zerotomastery.io/blog/deno-vs-node-vs-bun-comparison-guide/)

**URL:** https://zerotomastery.io/blog/deno-vs-node-vs-bun-comparison-guide/
**Domain:** zerotomastery.io

**Excerpt:**

Not only that, the transformed package supports both CommonJS and ESM, can work in Node.js, Deno, and browsers, runs tests in both CommonJS and ESM, and it supports TypeScript and JavaScript! * Deno compile now supports npm packages

#### Cons of Deno

* Because it’s relatively ‘new’ at around 6 years old, there isn’t as much community support in comparison to Node, and so it has a much smaller ecosystem. However, they do have ‘Deno by example’, which is a collection of annotated examples of how to use Deno and the various features it provides. It acts as a reference for how to do various things in Deno, but can also be used as a guide to learn about many of the features Deno provides
* Limited utilization of multi-core functions
* Deno can be deployed widely (just not as widely as Node)

### Who uses Deno? A lot of sites use Deno.
It’s nowhere near as many as with Node (for now), but here’s a few you would know:

* Netlify
* Slack
* SupaBase

As you can see, Deno has far fewer flaws and the ability to run TypeScript natively, so why are people still using Node so much? We’ll cover that in a second, but first let’s take a look at the latest kid on the block, Bun, and how that performs. ## What is Bun? Created by Jarred Sumner and using JavaScriptCore instead of V8 like Node and Deno, Bun is an all-in-one JavaScript runtime & toolkit. It’s designed for speed and comes complete with a bundler, [test runner](https://bun.sh/docs/cli/test) , and Node.js-compatible [package manager](https://bun.sh/package-manager) . This means that it allows you to develop, test, run, and bundle both JavaScript and TypeScript projects in one location, and early indications are that it’s incredibly fast, but with a few drawbacks. ### So what are these drawbacks?

---

## 12. [Major improvements after dropping Node+Jest in favor of ...](https://www.reddit.com/r/node/comments/18rdwtu/major_improvements_after_dropping_nodejest_in/)

**URL:** https://www.reddit.com/r/node/comments/18rdwtu/major_improvements_after_dropping_nodejest_in/
**Domain:** www.reddit.com

**Excerpt:**

Jest has a built in --outputFile parameter that allows for saving test results to a JSON file. Bun does not support that yet. Hence, my ...

---

## 13. [Is Bun Ready for Complex Builds Like Vite? : r/bun - Reddit](https://www.reddit.com/r/bun/comments/1ikj6ou/is_bun_ready_for_complex_builds_like_vite/)

**URL:** https://www.reddit.com/r/bun/comments/1ikj6ou/is_bun_ready_for_complex_builds_like_vite/
**Domain:** www.reddit.com

**Excerpt:**

Right now, Bun bundler feels like an "easy to start, hard to finish ... vite will have a rust bundler . it will be as fast/faster than ...

---

## 14. [Node.js vs Deno vs Bun: Comparing JavaScript Runtimes](https://betterstack.com/community/guides/scaling-nodejs/nodejs-vs-deno-vs-bun/)

**URL:** https://betterstack.com/community/guides/scaling-nodejs/nodejs-vs-deno-vs-bun/
**Domain:** betterstack.com

**Excerpt:**

Below is a comparison table that highlights how each runtime handles dependencies:

|Feature |Node.js |Deno |Bun |
| --- | --- | --- | --- |
|Package manager |npm |No dedicated package manager; uses direct URLs, import maps, and JSR |Uses a package manager compatible with Node.js |
|Registry |npm registry |JSR (JavaScript and TypeScript Registry), supports npm packages |Supports npm registry, Git, HTTP, and tarballs |
|Dependency file |`package.json` |Uses `deno.json` for Deno-specific configs, can also use `package.json` for Node.js projects |`package.json` , binary lockfile ( `bun.lockb` ) |
|Packages location |Creates a `node_modules` directory |Installs in a global cache by default, can use `node_modules` if `package.json` is present |Installs in `node_modules` directory, optimized for speed |
|Workspaces support |Supported via npm workspaces |No native workspace support; managed through module imports |Native support via `workspaces` in `package.json` |
|Versioning |Semantic
 ... 
Here’s how they compare:

|Feature |Node.js |Deno |Bun |
| --- | --- | --- | --- |
|REPL |✔️✔️ |✔️✔️ |✖ |
|Formatter |✖ |✔️✔️ |✖ |
|Linter |✖ |✔️✔️ |✖ |
|Test runner |✔️✔️ |✔️✔️ |✔️✔️ |
|Executables |✔️ |✔️✔️ |✔️✔️ |
|Debugger |✔️✔️ |✔️✔️ |✔️✔️ |

Deno leads the pack regarding built-in tooling, offering a REPL, test runner, easy executable creation, and debugger without needing third-party packages. Additionally, Deno includes a built-in linter and formatter, providing a complete development environment out of the box. Node.js follows closely behind with built-in support for a REPL, test runner, executable creation, and debugger. However, it lacks Deno's built-in linter and formatter, requiring you to rely on external tools for those functionalities. Bun, while promising, falls short in this comparison. It offers a test runner, the ability to create executables, and a debugger but lacks a REPL, which is helpful for quick experimentation.

---

## 15. [PNPM vs. Bun Install vs. Yarn Berry](https://betterstack.com/community/guides/scaling-nodejs/pnpm-vs-bun-install-vs-yarn/)

**URL:** https://betterstack.com/community/guides/scaling-nodejs/pnpm-vs-bun-install-vs-yarn/
**Domain:** betterstack.com

**Excerpt:**

PNPM makes your projects more reliable by ensuring packages can only access what they've explicitly listed in package.json. ## What is Bun Install? Bun Install is part of the Bun JavaScript runtime and toolkit. It focuses on making package installation incredibly fast. Developed by Jarred Sumner in 2021, Bun Install uses the Zig programming language for maximum speed. Unlike npm or Yarn, which run on Node.js, Bun has its own JavaScript runtime and native package installer, making it much faster. Bun Install gives you near-instant feedback when installing packages - often 20-30x faster than npm. It works with all npm packages while cutting out the startup and parsing slowdowns that plague JavaScript-based package managers. By 2025, Bun will have become stable enough for production use, with better mono repo support and integration with major development tools. ## What is Yarn Berry? Yarn Berry is the modern version of the Yarn package manager (v2 and beyond).
 ... 
```
# Enable Corepack (built into Node.js 16+)
corepack enable

# Set the project to use a specific Yarn version
yarn set version 4.0.0

# This creates/updates packageManager field in package.json
# Corepack will automatically use this version for all team members
```

PNPM offers focused configuration targeting its unique dependency model, Bun emphasizes minimal configuration with excellent defaults, and Yarn Berry provides the most extensible platform through its comprehensive plugin system. ## Migration and compatibility

Switching between package managers involves different levels of effort depending on your starting point and destination, with each offering different compatibility guarantees. PNPM maintains strong compatibility with the npm ecosystem while enforcing stricter dependency rules:

Copied!

---
