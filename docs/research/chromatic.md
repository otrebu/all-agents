# Chromatic - Visual Regression Testing for Storybook

> Comprehensive reference documentation for Chromatic, a cloud-based visual testing and review platform built by the maintainers of Storybook.

## Overview

Chromatic is a visual testing platform that automates visual regression testing for UI components and web applications. It captures pixel-perfect snapshots of your UI, compares them to baseline images, and surfaces visual changes for review. Built by the Storybook maintainers, it integrates seamlessly with Storybook while also supporting Playwright and Cypress.

### Key Features

- **Visual Testing**: Automatically detect UI bugs in appearance, layout, fonts, and colors
- **Accessibility Testing**: Detect WCAG violations and compliance issues
- **Interaction Testing**: Verify click, type, hover, and drag behaviors
- **Cross-Browser Testing**: Test in Chrome, Firefox, Safari, and Edge simultaneously
- **Parallel Execution**: All tests run in parallel with unlimited parallelization
- **TurboSnap**: Smart dependency tracking to test only changed components
- **UI Review**: Collaborative review workflow for visual changes in PRs

---

## Installation and Setup

### Prerequisites

- **Storybook 6.5 or later**
- **Node.js 18, 20, or 21** (officially supported LTS versions)
- **Git** installed and available on system path

### Installation

```bash
# npm
npm install --save-dev chromatic

# yarn
yarn add --dev chromatic

# pnpm
pnpm add --save-dev chromatic
```

### Visual Tests Addon (Recommended)

The zero-configuration approach:

```bash
storybook add chromatic
```

This installs `@chromatic-com/storybook`, the official addon that lets you trigger visual tests and view results directly within Storybook.

### Project Setup

1. **Sign up** at [chromatic.com/start](https://www.chromatic.com/start) using GitHub, GitLab, Bitbucket, or email
2. **Get your project token** from the Chromatic dashboard
3. **Set up the environment variable**:

```bash
export CHROMATIC_PROJECT_TOKEN=<your-project-token>
```

4. **Add npm script** to `package.json`:

```json
{
  "scripts": {
    "chromatic": "chromatic"
  }
}
```

5. **Run initial build** to establish baselines:

```bash
npx chromatic --project-token <your-project-token>
```

### Configuration File

Create `chromatic.config.json` in your project root:

```json
{
  "projectId": "Project:64cbcde96f99841e8b007d75",
  "buildScriptName": "build-storybook",
  "debug": true,
  "zip": true
}
```

### Files to Gitignore

Add these to `.gitignore`:

```
build-storybook.log
chromatic.log
chromatic-build-*.xml
chromatic-diagnostics.json
```

---

## Visual Snapshot Workflow

### How Visual Testing Works

1. **Capture**: Chromatic renders your stories in standardized cloud browsers
2. **Archive**: Full-page archives (DOM, styling, assets) are captured
3. **Compare**: New snapshots are compared pixel-by-pixel against baselines
4. **Detect**: Visual differences are highlighted for review
5. **Review**: Team members accept or deny changes

### Snapshot Creation

Chromatic creates a snapshot for each:
- Story in your Storybook
- Viewport configuration
- Browser (Chrome, Firefox, Safari, Edge)
- Mode combination

### Running Tests

**In Storybook (with addon)**:
Click the Play button in the sidebar to run visual tests. Changed stories are highlighted in yellow.

**Via CLI**:
```bash
npx chromatic
```

**With options**:
```bash
npx chromatic --project-token=<token> --exit-zero-on-changes
```

---

## Baseline Management

### Understanding Baselines

A baseline is the last approved snapshot of a story. Chromatic maintains baselines independently from your git repository, persisting them through branching and merging.

### Branch-Based Baselines

Each branch maintains its own baseline:

- **New branches** inherit baselines from the commit they branched off
- **Baselines don't auto-update** when changes merge to main
- **Each branch's baseline remains static** until explicitly accepted

### Baseline Calculation

Chromatic follows a two-step process:

1. **Find ancestor builds**: Identify the most recent ancestor commit with a Chromatic build
2. **Determine baseline**: If ancestor snapshot was accepted, use it; if denied/unreviewed, use its baseline instead

### Merge Handling

When merging branches with multiple potential baselines:
- Chromatic selects the **most recent approved change**
- For **squash/rebase merges**, Chromatic uses git provider APIs to detect the situation and applies baselines from the most recent PR head commit

### Best Practices for Multi-Branch Workflows

```bash
# Periodically sync with main to avoid false positives
git merge main

# Auto-accept changes on main branch
npx chromatic --auto-accept-changes=main
```

---

## Review and Approval Process

### Review Workflow

1. **Visual changes detected**: Chromatic flags stories with pixel differences
2. **Side-by-side comparison**: View baseline and new snapshot together
3. **Visual diff overlay**: Pixel-level changes highlighted in color
4. **Comment and discuss**: Drop comment pins on specific UI elements
5. **Accept or deny**: Update baseline or flag as regression

### Review Actions

| Action | Result |
|--------|--------|
| **Accept** | Updates the baseline for future comparisons |
| **Deny** | Marks change as a regression; blocks PR status |
| **Unreviewed** | Requires attention before merging |

### Audit Trail

Every approval, rejection, and rebaseline action is logged with:
- Timestamps
- Reviewer names
- Action history

This is valuable for compliance-sensitive environments.

### UI Tests vs UI Review

| Feature | UI Tests | UI Review |
|---------|----------|-----------|
| **Purpose** | Detect regressions | Review changes before merge |
| **Comparison** | Against baselines | Between head and base branch |
| **Baseline Used** | Yes | No (uses merge base) |

---

## CI/CD Integration

### Supported CI Platforms

- GitHub Actions
- GitLab Pipelines
- Bitbucket Pipelines
- CircleCI
- Travis CI
- Jenkins
- Azure Pipelines
- Semaphore
- Custom CI providers

### GitHub Actions

Create `.github/workflows/chromatic.yml`:

```yaml
name: "Chromatic"

on: push

jobs:
  chromatic:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        with:
          fetch-depth: 0  # Required for baseline comparison

      - name: Setup Node
        uses: actions/setup-node@v4

      - name: Install dependencies
        run: npm ci

      - name: Run Chromatic
        uses: chromaui/action@latest
        with:
          projectToken: ${{ secrets.CHROMATIC_PROJECT_TOKEN }}
```

#### GitHub Action Inputs

```yaml
with:
  projectToken: ${{ secrets.CHROMATIC_PROJECT_TOKEN }}
  exitZeroOnChanges: true  # Don't fail on visual changes
  autoAcceptChanges: "main"  # Auto-accept on main
  onlyChanged: true  # Enable TurboSnap
  skip: "dependabot/**"  # Skip certain branches
  zip: true  # Enable compression for large projects
```

#### GitHub Action Outputs

| Output | Type | Description |
|--------|------|-------------|
| `buildUrl` | string | Link to build results |
| `storybookUrl` | string | Preview URL for branch |
| `changeCount` | number | Tests with visual changes |
| `testCount` | number | Total tests in build |
| `code` | string | Exit code |

### Setting Up Secrets

1. Go to repository **Settings** > **Secrets and variables** > **Actions**
2. Click **New repository secret**
3. Name: `CHROMATIC_PROJECT_TOKEN`
4. Value: Your project token from Chromatic dashboard

### GitLab CI

Create `.gitlab-ci.yml`:

```yaml
image: node:lts

stages:
  - UI_Tests

variables:
  GIT_DEPTH: 0  # Prevent shallow clone issues

cache:
  key: $CI_COMMIT_REF_SLUG-$CI_PROJECT_DIR
  paths:
    - .npm/

before_script:
  - npm ci

Chromatic:
  stage: UI_Tests
  interruptible: true  # Cancel on newer pipeline
  script:
    - npx chromatic
  rules:
    - if: $CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH
```

#### GitLab-Specific Considerations

- Set `GIT_DEPTH: 0` to access full git history
- Use `interruptible: true` to save build minutes
- Store token as masked environment variable

### CircleCI

```yaml
version: 2.1

jobs:
  chromatic:
    docker:
      - image: cimg/node:lts
    steps:
      - checkout
      - run: npm ci
      - run: npx chromatic

workflows:
  version: 2
  test:
    jobs:
      - chromatic
```

---

## GitHub Integration

### PR Status Checks

Chromatic automatically adds status checks to pull requests:

- **UI Tests**: Shows if visual changes were detected
- **UI Review**: Shows review approval status

### Required Checks

Configure in GitHub repository settings to require Chromatic checks before merging:

1. Go to **Settings** > **Branches** > **Branch protection rules**
2. Enable "Require status checks to pass"
3. Select Chromatic checks

### PR Comments

Chromatic can post comments on PRs showing:
- Number of changed components
- Links to visual diffs
- Review status summary

### Forked Repositories

GitHub secrets are repository-level only. For external forks:

```yaml
with:
  projectToken: chpt_xxxx  # Exposed token for forks
```

Note: Contributors can consume snapshot quota with this approach.

---

## Handling Dynamic Content

### Common Causes of False Positives

- Anti-aliasing differences
- Animation timing
- Dynamic data (dates, random IDs)
- Third-party content
- Slow-loading resources

### Ignoring Elements

**Using HTML attributes**:

```tsx
<video data-chromatic="ignore" src={src} controls />
<p className="chromatic-ignore">Published: {new Date().toISOString()}</p>
```

**Using configuration**:

```typescript
// Story level
export const MyStory = {
  parameters: {
    chromatic: {
      ignoreSelectors: ['.dynamic-content', '#timestamp'],
    },
  },
};
```

**Important**: Ignoring affects pixel content but not dimensions. Layout changes still trigger diffs.

### Delay Configuration

Wait for async content before snapshotting:

```typescript
export const AsyncComponent = {
  parameters: {
    chromatic: {
      delay: 1500,  // Wait 1.5 seconds (max: 15000ms)
    },
  },
};
```

### Animation Handling

**CSS Animations**:
Chromatic pauses at the final frame by default.

```typescript
// Pause at first frame instead
parameters: {
  chromatic: {
    pauseAnimationAtEnd: false,
  },
}
```

**JavaScript Animations**:
Use the `isChromatic()` utility:

```typescript
import { isChromatic } from 'chromatic/isChromatic';

// Disable animations in Chromatic
if (isChromatic()) {
  // Skip animation logic
}

// For Framer Motion v10.17.0+
import { MotionGlobalConfig } from 'framer-motion';
MotionGlobalConfig.skipAnimations = isChromatic();
```

**GIFs and Videos**:
Automatically paused at first frame. If a video has a `poster` attribute, that image is used.

---

## Threshold Settings

### diffThreshold Configuration

Control sensitivity for detecting visual changes:

```typescript
// Default: 0.063
parameters: {
  chromatic: {
    diffThreshold: 0.2,  // Less sensitive, fewer false positives
  },
}
```

| Value | Sensitivity | False Positives |
|-------|-------------|-----------------|
| 0.0 | Maximum | High |
| 0.063 | Default | Balanced |
| 0.2 | Reduced | Lower |
| 1.0 | Minimum | Minimal |

### Anti-Aliasing

Chromatic ignores anti-aliased pixels by default. Override when needed:

```typescript
parameters: {
  chromatic: {
    diffIncludeAntiAliasing: true,
  },
}
```

### Setting Thresholds by Framework

**Storybook**:
```typescript
parameters: {
  chromatic: { diffThreshold: 0.2 },
}
```

**Playwright**:
```typescript
test.use({ diffThreshold: 0.2 });
```

**Cypress**:
```javascript
it("test", { env: { diffThreshold: 0.2 } }, () => {
  // test code
});
```

---

## Responsive Design Testing

### Modes API (Recommended)

Define viewports in `.storybook/modes.ts`:

```typescript
export const allModes = {
  mobile: {
    viewport: { width: 320, height: 568 },
  },
  tablet: {
    viewport: { width: 768, height: 1024 },
  },
  desktop: {
    viewport: { width: 1280, height: 800 },
  },
};
```

Apply to stories:

```typescript
import { allModes } from '../.storybook/modes';

export const ResponsiveComponent = {
  parameters: {
    chromatic: {
      modes: {
        mobile: allModes.mobile,
        tablet: allModes.tablet,
        desktop: allModes.desktop,
      },
    },
  },
};
```

### Viewport Constraints

- Width: 200 to 2560 pixels
- Maximum pixels per snapshot: 25,000,000
- Use `cropToViewport: true` to restrict height

### Legacy Viewports API

Still supported but deprecated:

```typescript
parameters: {
  chromatic: {
    viewports: [320, 768, 1280],
  },
}
```

---

## TurboSnap

### Overview

TurboSnap accelerates testing by only snapshotting stories affected by code changes, potentially reducing snapshot usage by up to 80%.

### How It Works

1. **Identifies ancestor builds** for baseline comparison
2. **Analyzes git changes** between commits
3. **Traces dependencies** using Webpack/Vite dependency graph
4. **Selectively snapshots** only affected stories

### Enabling TurboSnap

```bash
npx chromatic --only-changed
```

In GitHub Actions:
```yaml
with:
  onlyChanged: true
```

### Full Rebuild Triggers

TurboSnap captures all stories when:

- `package.json` dependencies change without lockfile
- Storybook configuration files change
- Files imported by `preview.js` change
- Static folder contents change
- `--externals` files are modified
- Same commit/branch is re-run
- Infrastructure upgrades occur

### Pricing Impact

- Regular snapshots: Full price
- TurboSnaps (unchanged): 1/5th price

Example: 50 stories, 10 changed = 18 billable snapshots
(10 regular + 40 TurboSnaps = 10 + 8 equivalent)

---

## Pricing and Plans

### Free Plan

- **Cost**: $0/month
- **Snapshots**: 5,000/month
- **Browsers**: Chrome only
- **Features**:
  - Visual tests
  - Unlimited projects and users
  - Git and CI integrations
  - UI version tracking

### Starter Plan

- **Cost**: $179/month
- **Snapshots**: 35,000/month
- **Extra snapshots**: $0.008 each
- **Browsers**: Chrome, Firefox, Safari, Edge
- **Features**:
  - Everything in Free
  - Accessibility tests
  - Accessibility reports
  - Interaction tests
  - TurboSnap
  - UI Review

### Pro Plan

- **Cost**: $399/month
- **Snapshots**: 85,000/month
- **Extra snapshots**: $0.008 each
- **Browsers**: Chrome, Firefox, Safari, Edge
- **Features**:
  - Everything in Starter
  - Custom domain

### Enterprise Plan

- **Cost**: Custom pricing
- **Snapshots**: Unlimited
- **Features**:
  - Everything in Pro
  - Unlimited accessibility usage
  - SSO and custom Git integrations
  - Priority support and SLA
  - Data retention policies
  - Annual billing option

### Open Source

Free tier available for eligible open-source projects.

---

## Alternatives Comparison

### Percy (by BrowserStack)

**Pros**:
- Strong AI-powered change detection
- Excellent CI integration
- SDKs for many frameworks (Rails, React, Vue, Angular, Cypress, TestCafe)
- Free plan: 5,000 screenshots/month

**Cons**:
- Paid plans start at $199/month
- Charges extra for parallel test runs

**Best for**: Teams wanting broad framework support and CI-first workflow

### Applitools

**Pros**:
- Advanced AI/ML algorithms (Applitools Eyes)
- Handles dynamic content intelligently
- Enterprise-grade features
- Cross-platform (web, mobile, desktop)

**Cons**:
- Pricing not publicly listed
- Higher complexity for setup
- Can be expensive for smaller teams

**Best for**: Large enterprises needing AI-powered, scalable testing

### Chromatic vs Competitors

| Feature | Chromatic | Percy | Applitools |
|---------|-----------|-------|------------|
| **Storybook Integration** | Native | SDK | SDK |
| **Parallel Testing** | Unlimited | Extra cost | Included |
| **Baseline Management** | Git-based | Cloud-based | Cloud-based |
| **AI Diffing** | No | Yes | Yes (advanced) |
| **Pricing Transparency** | Yes | Yes | No |
| **Free Tier** | 5,000 snapshots | 5,000 screenshots | Contact sales |

### When to Choose Chromatic

- Component-based UI projects using Storybook
- Teams wanting seamless Storybook integration
- Projects needing unlimited parallel testing
- Budget-conscious teams wanting predictable costs
- Git-centric workflows

---

## Best Practices

### Writing Deterministic Stories

```typescript
// Bad: Random data causes false positives
export const Card = () => <UserCard name={faker.name.fullName()} />;

// Good: Fixed data for consistent snapshots
export const Card = () => <UserCard name="John Doe" />;
```

### Handling Flaky Tests

1. **Use consistent test data** instead of random generators
2. **Ignore dynamic elements** like timestamps
3. **Disable animations** in Storybook for testing
4. **Add appropriate delays** for async content
5. **Use TurboSnap** to reduce unnecessary tests

### Component Isolation

Stories should render components in isolation:

```typescript
// Isolate from external dependencies
export const Button = {
  decorators: [
    (Story) => (
      <ThemeProvider theme={testTheme}>
        <Story />
      </ThemeProvider>
    ),
  ],
};
```

### Multi-Browser Testing

Test critical components across browsers:

```typescript
parameters: {
  chromatic: {
    modes: {
      desktop: { viewport: 1280 },
    },
  },
}
```

Enable browser testing in Chromatic dashboard for Chrome, Firefox, Safari, and Edge.

### Maintaining Clean Baselines

```bash
# Accept changes on main to keep baselines clean
npx chromatic --auto-accept-changes=main

# Skip automated dependency updates
npx chromatic --skip="dependabot/**"
```

### Optimizing for Large Projects

1. **Enable TurboSnap** to test only changed components
2. **Use compression** with `--zip` for faster uploads
3. **Filter branches** to skip non-essential builds
4. **Set appropriate thresholds** to reduce noise

---

## Troubleshooting

### Common Issues

**Build times too long**:
- Enable TurboSnap with `--only-changed`
- Use `--zip` for faster uploads
- Check for unnecessary story re-renders

**Too many false positives**:
- Increase `diffThreshold` value
- Ignore dynamic elements
- Add delays for async content
- Disable animations

**Baselines not matching across branches**:
- Sync with main regularly
- Use `--auto-accept-changes` on main
- Enable squash/rebase merge support

**Snapshots timing out**:
- Default timeout: 15 seconds to render + 15 for interactions
- Add `delay` parameter for slow components
- Optimize component rendering

### Debug Options

```bash
# Enable debug mode
npx chromatic --debug

# Trace changed files (TurboSnap)
npx chromatic --only-changed --trace-changed

# View diagnostics
cat chromatic-diagnostics.json
```

---

## Resources

### Official Documentation

- [Chromatic Docs](https://www.chromatic.com/docs/)
- [Visual Tests Addon](https://www.chromatic.com/docs/visual-tests-addon/)
- [GitHub Actions Guide](https://www.chromatic.com/docs/github-actions/)
- [GitLab Guide](https://www.chromatic.com/docs/gitlab/)
- [Branching and Baselines](https://www.chromatic.com/docs/branching-and-baselines/)
- [TurboSnap Guide](https://www.chromatic.com/docs/turbosnap/)
- [Pricing](https://www.chromatic.com/pricing)

### Community Resources

- [Chromatic Blog](https://www.chromatic.com/blog/)
- [Storybook Visual Testing Docs](https://storybook.js.org/docs/writing-tests/visual-testing)
- [chromaui/action GitHub Repository](https://github.com/chromaui/action)
- [chromaui/chromatic-cli GitHub Repository](https://github.com/chromaui/chromatic-cli)

---

*Last updated: December 2024*
