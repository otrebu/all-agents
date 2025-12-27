# Web Vitals: Performance Metrics Measurement and Optimization

> Comprehensive reference for measuring and optimizing Web Vitals in web applications, with special focus on React applications.

## Table of Contents

1. [Overview](#overview)
2. [Core Web Vitals](#core-web-vitals)
   - [Largest Contentful Paint (LCP)](#largest-contentful-paint-lcp)
   - [Interaction to Next Paint (INP)](#interaction-to-next-paint-inp)
   - [Cumulative Layout Shift (CLS)](#cumulative-layout-shift-cls)
3. [Other Web Vitals](#other-web-vitals)
   - [First Contentful Paint (FCP)](#first-contentful-paint-fcp)
   - [Time to First Byte (TTFB)](#time-to-first-byte-ttfb)
4. [The web-vitals Library](#the-web-vitals-library)
5. [Measuring in React Applications](#measuring-in-react-applications)
6. [Reporting to Analytics](#reporting-to-analytics)
7. [Optimization Strategies](#optimization-strategies)
8. [React-Specific Performance](#react-specific-performance)
9. [Lazy Loading Impact](#lazy-loading-impact)
10. [Third-Party Scripts Impact](#third-party-scripts-impact)
11. [Lighthouse and PageSpeed Insights](#lighthouse-and-pagespeed-insights)
12. [Field Data vs Lab Data](#field-data-vs-lab-data)
13. [Debugging with Attribution](#debugging-with-attribution)

---

## Overview

Web Vitals is a Google initiative to provide unified guidance for quality signals essential to delivering a great user experience on the web. The Core Web Vitals are a subset of Web Vitals that apply to all web pages and are measured in Google Search rankings.

### Quick Reference: Thresholds

| Metric | Good | Needs Improvement | Poor |
|--------|------|-------------------|------|
| **LCP** | ≤ 2.5s | 2.5s - 4s | > 4s |
| **INP** | ≤ 200ms | 200ms - 500ms | > 500ms |
| **CLS** | ≤ 0.1 | 0.1 - 0.25 | > 0.25 |
| **FCP** | ≤ 1.8s | 1.8s - 3s | > 3s |
| **TTFB** | ≤ 800ms | 800ms - 1800ms | > 1800ms |

**Assessment Method**: The 75th percentile of page loads is used for classification. If at least 75% of page views meet the "good" threshold, the site is classified as having "good" performance.

---

## Core Web Vitals

### Largest Contentful Paint (LCP)

**What it measures**: Loading performance - the time from when the page starts loading to when the largest content element (image, video, or text block) is rendered on screen.

**Target**: LCP should occur within 2.5 seconds of when the page first starts loading.

#### LCP Breakdown Framework

LCP consists of four sequential subparts:

1. **Time to First Byte (TTFB)** (~40%): Duration from navigation initiation until receiving HTML's first bytes
2. **Resource Load Delay** (<10%): Time between TTFB and when the LCP resource begins loading
3. **Resource Load Duration** (~40%): Actual transfer time for the LCP resource
4. **Element Render Delay** (<10%): Time between resource completion and element rendering

#### Common LCP Elements

- Hero images
- Large background images
- Main heading text blocks
- Video poster images

#### LCP Optimization Strategies

**1. Eliminate Resource Load Delay**
```html
<!-- Make LCP image discoverable immediately -->
<img src="hero.jpg" fetchpriority="high" alt="Hero image">

<!-- Preload LCP image if not in initial HTML -->
<link rel="preload" as="image" href="hero.jpg" fetchpriority="high">

<!-- NEVER lazy load LCP images -->
<!-- Bad: <img src="hero.jpg" loading="lazy"> -->
```

**2. Reduce Resource Load Duration**
```html
<!-- Use modern image formats -->
<picture>
  <source srcset="hero.avif" type="image/avif">
  <source srcset="hero.webp" type="image/webp">
  <img src="hero.jpg" alt="Hero" fetchpriority="high">
</picture>

<!-- Responsive images -->
<img
  srcset="hero-400.jpg 400w, hero-800.jpg 800w, hero-1200.jpg 1200w"
  sizes="(max-width: 600px) 400px, (max-width: 1200px) 800px, 1200px"
  src="hero-800.jpg"
  alt="Hero"
  fetchpriority="high"
>
```

**3. Eliminate Element Render Delay**
```html
<!-- Inline critical CSS -->
<style>
  .hero { /* critical styles */ }
</style>

<!-- Defer non-critical CSS -->
<link rel="preload" href="styles.css" as="style" onload="this.onload=null;this.rel='stylesheet'">
```

**4. Reduce TTFB**
- Use a CDN
- Implement server-side caching
- Minimize redirects
- Optimize database queries

---

### Interaction to Next Paint (INP)

**What it measures**: Responsiveness - the latency of all user interactions (clicks, taps, keyboard input) throughout the page's lifecycle.

**Target**: Pages should have an INP of 200 milliseconds or less.

> Note: INP replaced First Input Delay (FID) as a Core Web Vital in March 2024.

#### How INP Works

INP tracks three components of interaction latency:

1. **Input delay**: Time before event handlers start running
2. **Processing duration**: Time for all callbacks to execute
3. **Presentation delay**: Time until the next frame appears

For most sites, INP reports the longest interaction. For high-interaction pages, one outlier per 50 interactions is ignored.

#### INP Optimization Strategies

**1. Break Up Long Tasks**
```javascript
// Bad: Long synchronous task
function processLargeDataset(data) {
  data.forEach(item => heavyProcessing(item));
}

// Good: Yield to main thread
async function processLargeDataset(data) {
  for (const item of data) {
    heavyProcessing(item);
    // Yield to allow interactions
    await scheduler.yield?.() ?? new Promise(r => setTimeout(r, 0));
  }
}
```

**2. Use requestIdleCallback for Non-Critical Work**
```javascript
// Defer non-essential work
requestIdleCallback(() => {
  analytics.track('page_view');
  prefetchNextPage();
});
```

**3. Optimize Event Handlers**
```javascript
// Bad: Heavy work in click handler
button.addEventListener('click', () => {
  updateDatabase();      // Heavy
  recalculateLayout();   // Heavy
  updateUI();
});

// Good: Prioritize visual feedback
button.addEventListener('click', () => {
  // Immediate visual feedback
  button.classList.add('clicked');

  // Defer heavy work
  requestAnimationFrame(() => {
    queueMicrotask(() => {
      updateDatabase();
      recalculateLayout();
    });
  });
});
```

**4. Use Web Workers for Heavy Computation**
```javascript
// main.js
const worker = new Worker('heavy-task.js');
worker.postMessage(largeData);
worker.onmessage = (e) => updateUI(e.data);

// heavy-task.js
self.onmessage = (e) => {
  const result = heavyComputation(e.data);
  self.postMessage(result);
};
```

**5. Debounce and Throttle Frequent Events**
```javascript
// Throttle scroll handlers
let ticking = false;
window.addEventListener('scroll', () => {
  if (!ticking) {
    requestAnimationFrame(() => {
      handleScroll();
      ticking = false;
    });
    ticking = true;
  }
});
```

---

### Cumulative Layout Shift (CLS)

**What it measures**: Visual stability - the sum of all unexpected layout shift scores during the page's lifecycle.

**Target**: Pages should maintain a CLS score of 0.1 or less.

#### CLS Calculation

```
Layout Shift Score = Impact Fraction × Distance Fraction
```

- **Impact fraction**: Percentage of viewport affected by unstable elements
- **Distance fraction**: Greatest distance any element moved relative to viewport

#### Common Causes of Layout Shifts

1. Images without dimensions
2. Ads, embeds, and iframes without reserved space
3. Dynamically injected content
4. Web fonts causing FOUT/FOIT
5. Animations that trigger layout

#### CLS Optimization Strategies

**1. Always Set Image Dimensions**
```html
<!-- Always include width and height -->
<img src="photo.jpg" width="800" height="600" alt="Photo">

<!-- Or use CSS aspect-ratio -->
<style>
  .responsive-img {
    width: 100%;
    height: auto;
    aspect-ratio: 16 / 9;
  }
</style>
```

**2. Reserve Space for Dynamic Content**
```css
/* Reserve space for ads */
.ad-container {
  min-height: 250px;
  background: #f0f0f0;
}

/* Reserve space for embeds */
.embed-container {
  position: relative;
  padding-bottom: 56.25%; /* 16:9 aspect ratio */
  height: 0;
  overflow: hidden;
}

.embed-container iframe {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}
```

**3. Optimize Font Loading**
```css
/* Use font-display: swap with matched fallback */
@font-face {
  font-family: 'CustomFont';
  src: url('font.woff2') format('woff2');
  font-display: swap;
}

/* Match fallback font metrics to reduce shift */
@font-face {
  font-family: 'CustomFont-Fallback';
  src: local('Arial');
  size-adjust: 105%;
  ascent-override: 95%;
  descent-override: 22%;
  line-gap-override: 0%;
}

body {
  font-family: 'CustomFont', 'CustomFont-Fallback', sans-serif;
}
```

```html
<!-- Preload critical fonts -->
<link rel="preload" href="font.woff2" as="font" type="font/woff2" crossorigin>
```

**4. Avoid Inserting Content Above Existing Content**
```javascript
// Bad: Inserting at top pushes content down
container.insertBefore(newElement, container.firstChild);

// Good: Append at the end or use transforms
container.appendChild(newElement);

// Or use CSS transforms (don't trigger layout)
element.style.transform = 'translateY(-100px)';
```

**5. Use CSS Containment**
```css
/* Prevent element from affecting others */
.independent-widget {
  contain: layout;
}
```

---

## Other Web Vitals

### First Contentful Paint (FCP)

**What it measures**: The time from navigation to when any content (text, image, SVG, canvas) is first rendered.

**Target**: Sites should have FCP of 1.8 seconds or less.

FCP is a diagnostic metric that supplements LCP. A slow FCP often indicates render-blocking resources.

#### FCP Optimization

```html
<!-- Inline critical CSS -->
<style>
  /* Above-the-fold styles */
  body { margin: 0; font-family: system-ui; }
  .header { /* ... */ }
</style>

<!-- Defer non-critical CSS -->
<link rel="preload" href="styles.css" as="style" onload="this.onload=null;this.rel='stylesheet'">
<noscript><link rel="stylesheet" href="styles.css"></noscript>

<!-- Defer JavaScript -->
<script src="app.js" defer></script>

<!-- Or async for independent scripts -->
<script src="analytics.js" async></script>
```

---

### Time to First Byte (TTFB)

**What it measures**: The time from navigation start until the first byte of the response is received.

**Target**: TTFB should be 800 milliseconds or less (Lighthouse uses 600ms).

#### TTFB Optimization

**1. Use a CDN**
```
Without CDN: 1-4 seconds (server processing)
With CDN:    200-500ms (cached at edge)
```

**2. Implement Caching**
```
# Nginx caching example
location / {
    proxy_cache my_cache;
    proxy_cache_valid 200 1h;
    proxy_cache_use_stale error timeout http_500 http_502 http_503 http_504;
}
```

**3. Optimize Server Response**
- Use server-side caching (Redis, Memcached)
- Optimize database queries
- Use connection pooling
- Enable HTTP/2 or HTTP/3

**4. Minimize Redirects**
```
# Bad: Multiple redirects
http://example.com → https://example.com → https://www.example.com

# Good: Single redirect or none
http://example.com → https://www.example.com
```

**5. Use Resource Hints**
```html
<!-- DNS prefetch for third-party origins -->
<link rel="dns-prefetch" href="https://fonts.googleapis.com">

<!-- Preconnect for critical origins -->
<link rel="preconnect" href="https://cdn.example.com" crossorigin>
```

---

## The web-vitals Library

The `web-vitals` library is Google's official, lightweight (~2KB gzipped) library for measuring Core Web Vitals.

### Installation

```bash
npm install web-vitals
```

### Basic Usage

```javascript
import { onCLS, onINP, onLCP, onFCP, onTTFB } from 'web-vitals';

// Log all Core Web Vitals
onCLS(console.log);
onINP(console.log);
onLCP(console.log);

// Log other Web Vitals
onFCP(console.log);
onTTFB(console.log);
```

### CDN Usage

```html
<script type="module">
  import { onCLS, onINP, onLCP } from 'https://unpkg.com/web-vitals@5?module';

  onCLS(console.log);
  onINP(console.log);
  onLCP(console.log);
</script>
```

### Metric Object Structure

```javascript
{
  name: 'LCP',                    // Metric name
  value: 2500,                    // Current value (ms for timing, score for CLS)
  rating: 'needs-improvement',    // 'good' | 'needs-improvement' | 'poor'
  delta: 2500,                    // Change since last report
  id: 'v3-1234567890',           // Unique ID for aggregating deltas
  entries: [...],                 // Relevant PerformanceEntry objects
  navigationType: 'navigate'      // 'navigate' | 'reload' | 'back_forward' | 'prerender'
}
```

### Report All Changes

```javascript
// Get updates as metric changes (not just final value)
onCLS(console.log, { reportAllChanges: true });
```

### Thresholds Constants

```javascript
import { CLSThresholds, INPThresholds, LCPThresholds } from 'web-vitals';

console.log(CLSThresholds);  // [0.1, 0.25]
console.log(INPThresholds);  // [200, 500]
console.log(LCPThresholds);  // [2500, 4000]
```

### Browser Support

| Metric | Chrome | Firefox | Safari |
|--------|--------|---------|--------|
| CLS | Yes | No | No |
| FCP | Yes | Yes | Yes |
| INP | Yes | No | No |
| LCP | Yes | Yes | Yes |
| TTFB | Yes | Yes | Yes |

---

## Measuring in React Applications

### Create React App (Built-in)

Create React App includes web-vitals by default:

```javascript
// src/reportWebVitals.js (auto-generated)
const reportWebVitals = (onPerfEntry) => {
  if (onPerfEntry && onPerfEntry instanceof Function) {
    import('web-vitals').then(({ onCLS, onINP, onFCP, onLCP, onTTFB }) => {
      onCLS(onPerfEntry);
      onINP(onPerfEntry);
      onFCP(onPerfEntry);
      onLCP(onPerfEntry);
      onTTFB(onPerfEntry);
    });
  }
};

export default reportWebVitals;

// src/index.js
import reportWebVitals from './reportWebVitals';

reportWebVitals(console.log);
// Or send to analytics
reportWebVitals(sendToAnalytics);
```

### Next.js Integration

```javascript
// pages/_app.js (Pages Router)
export function reportWebVitals(metric) {
  console.log(metric);
  // Or send to analytics
}

// app/layout.js (App Router)
'use client';

import { useEffect } from 'react';
import { onCLS, onINP, onLCP } from 'web-vitals';

export function WebVitals() {
  useEffect(() => {
    onCLS(console.log);
    onINP(console.log);
    onLCP(console.log);
  }, []);

  return null;
}
```

### Custom React Hook

```javascript
import { useEffect, useRef } from 'react';
import { onCLS, onINP, onLCP, onFCP, onTTFB } from 'web-vitals';

export function useWebVitals(callback) {
  const savedCallback = useRef(callback);

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    const report = (metric) => savedCallback.current(metric);

    onCLS(report);
    onINP(report);
    onLCP(report);
    onFCP(report);
    onTTFB(report);
  }, []);
}

// Usage
function App() {
  useWebVitals((metric) => {
    console.log(metric.name, metric.value, metric.rating);
  });

  return <div>...</div>;
}
```

---

## Reporting to Analytics

### Send to Google Analytics 4 (gtag.js)

```javascript
import { onCLS, onINP, onLCP, onFCP, onTTFB } from 'web-vitals';

function sendToGA4({ name, delta, value, id }) {
  gtag('event', name, {
    value: delta,                    // Use delta for accurate aggregation
    metric_id: id,                   // Unique ID for this metric instance
    metric_value: value,             // Full metric value
    metric_rating: rating,           // good/needs-improvement/poor
  });
}

onCLS(sendToGA4);
onINP(sendToGA4);
onLCP(sendToGA4);
onFCP(sendToGA4);
onTTFB(sendToGA4);
```

### Send to Custom Analytics Endpoint

```javascript
function sendToAnalytics(metric) {
  const body = JSON.stringify({
    name: metric.name,
    value: metric.value,
    rating: metric.rating,
    delta: metric.delta,
    id: metric.id,
    navigationType: metric.navigationType,
    url: window.location.href,
    timestamp: Date.now(),
  });

  // Use sendBeacon for reliability during page unload
  if (navigator.sendBeacon) {
    navigator.sendBeacon('/api/web-vitals', body);
  } else {
    fetch('/api/web-vitals', {
      method: 'POST',
      body,
      keepalive: true,
    });
  }
}

onCLS(sendToAnalytics);
onINP(sendToAnalytics);
onLCP(sendToAnalytics);
```

### Batch Multiple Metrics

```javascript
const metricsQueue = new Set();

function queueMetric(metric) {
  metricsQueue.add(metric);
}

// Send all queued metrics when page is hidden
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') {
    const metrics = [...metricsQueue];
    if (metrics.length > 0) {
      navigator.sendBeacon('/api/web-vitals', JSON.stringify(metrics));
      metricsQueue.clear();
    }
  }
});

onCLS(queueMetric);
onINP(queueMetric);
onLCP(queueMetric);
```

### Google Tag Manager Integration

```javascript
// Push to dataLayer for GTM
function sendToGTM(metric) {
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({
    event: 'web-vitals',
    webVitalsName: metric.name,
    webVitalsValue: metric.value,
    webVitalsRating: metric.rating,
    webVitalsDelta: metric.delta,
    webVitalsId: metric.id,
  });
}

onCLS(sendToGTM);
onINP(sendToGTM);
onLCP(sendToGTM);
```

---

## Optimization Strategies

### Summary by Metric

| Metric | Key Optimizations |
|--------|------------------|
| **LCP** | Preload LCP resource, use `fetchpriority="high"`, optimize images, reduce TTFB |
| **INP** | Break long tasks, use web workers, optimize event handlers, debounce/throttle |
| **CLS** | Set image dimensions, reserve ad space, optimize font loading, avoid DOM injection |
| **FCP** | Inline critical CSS, defer JS, eliminate render-blocking resources |
| **TTFB** | Use CDN, implement caching, minimize redirects, optimize server |

### Resource Priority Hints

```html
<!-- High priority for LCP image -->
<img src="hero.jpg" fetchpriority="high" alt="Hero">

<!-- Low priority for below-fold images -->
<img src="footer-logo.png" fetchpriority="low" loading="lazy" alt="Logo">

<!-- Preload critical resources -->
<link rel="preload" href="critical.css" as="style">
<link rel="preload" href="hero.jpg" as="image" fetchpriority="high">
<link rel="preload" href="font.woff2" as="font" type="font/woff2" crossorigin>

<!-- Preconnect to required origins -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
```

---

## React-Specific Performance

### Memoization

```javascript
import { memo, useMemo, useCallback } from 'react';

// Memoize expensive components
const ExpensiveComponent = memo(function ExpensiveComponent({ data }) {
  return <div>{/* complex rendering */}</div>;
});

// Memoize expensive calculations
function DataGrid({ items, filter }) {
  const filteredItems = useMemo(() => {
    return items.filter(item => item.category === filter);
  }, [items, filter]);

  return <Grid items={filteredItems} />;
}

// Memoize callbacks passed to children
function Parent() {
  const handleClick = useCallback((id) => {
    // handle click
  }, []);

  return <Child onClick={handleClick} />;
}
```

### When to Use Memoization

Use `useMemo`/`useCallback` when:
- The calculation is noticeably slow
- Dependencies rarely change
- Value is passed to memoized child components

**Do not** use for cheap calculations (adds overhead).

### Code Splitting

```javascript
import { lazy, Suspense } from 'react';

// Lazy load routes
const Dashboard = lazy(() => import('./Dashboard'));
const Settings = lazy(() => import('./Settings'));

function App() {
  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </Suspense>
  );
}

// Lazy load heavy components
const HeavyChart = lazy(() => import('./HeavyChart'));

function Analytics() {
  return (
    <Suspense fallback={<ChartSkeleton />}>
      <HeavyChart data={data} />
    </Suspense>
  );
}
```

### React Server Components (Next.js App Router)

```javascript
// Server Component (default) - no JS sent to client
async function ProductList() {
  const products = await db.query('SELECT * FROM products');

  return (
    <ul>
      {products.map(p => <li key={p.id}>{p.name}</li>)}
    </ul>
  );
}

// Client Component - for interactivity
'use client';

import { useState } from 'react';

function AddToCartButton({ productId }) {
  const [loading, setLoading] = useState(false);

  return (
    <button onClick={() => addToCart(productId)}>
      Add to Cart
    </button>
  );
}
```

**RSC Benefits for Web Vitals:**
- Reduced JavaScript bundle size (up to 62% reduction)
- Faster LCP (up to 65% improvement)
- Better INP (less main thread work)

### Next.js Built-in Optimizations

```javascript
// Optimized images (automatic LCP optimization)
import Image from 'next/image';

function Hero() {
  return (
    <Image
      src="/hero.jpg"
      width={1200}
      height={600}
      priority // Preloads as high priority
      alt="Hero"
    />
  );
}

// Optimized fonts (reduces CLS)
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'] });

export default function Layout({ children }) {
  return (
    <html className={inter.className}>
      <body>{children}</body>
    </html>
  );
}
```

---

## Lazy Loading Impact

### The Problem with LCP Images

**Never lazy load the LCP image.** This is an anti-pattern that delays your most important visual element.

```html
<!-- BAD: Lazy loading LCP image -->
<img src="hero.jpg" loading="lazy" alt="Hero">

<!-- GOOD: Eager load with high priority -->
<img src="hero.jpg" fetchpriority="high" alt="Hero">
```

### Real-World Impact

| Approach | Median 75th Percentile LCP |
|----------|---------------------------|
| Without lazy loading | 2,922 ms |
| With lazy loading | 3,546 ms |

JavaScript-based lazy loading is even worse because it requires downloading and executing JS before images load.

### Best Practices

```html
<!-- Above-the-fold: No lazy loading, high priority -->
<img src="hero.jpg" fetchpriority="high" alt="Hero">
<img src="logo.png" alt="Logo">

<!-- Below-the-fold: Native lazy loading -->
<img src="product1.jpg" loading="lazy" alt="Product 1">
<img src="product2.jpg" loading="lazy" alt="Product 2">
```

### Detecting Lazy-Loaded LCP

The web-vitals attribution build can help identify if your LCP element is lazy-loaded:

```javascript
import { onLCP } from 'web-vitals/attribution';

onLCP((metric) => {
  const lcpEntry = metric.entries[metric.entries.length - 1];
  if (lcpEntry.element?.loading === 'lazy') {
    console.warn('LCP image is lazy-loaded!', lcpEntry.element);
  }
});
```

---

## Third-Party Scripts Impact

### The Scale of the Problem

- 93.59% of web pages include at least one third-party resource
- Median number of external scripts: 20
- Median total size: ~449 KB
- Average blocking time for top 10 third parties: 1.4 seconds

### Impact on Core Web Vitals

| Metric | Impact |
|--------|--------|
| **LCP** | Delays resource loading, blocks rendering |
| **INP** | Blocks main thread, delays interaction handling |
| **CLS** | Ads and widgets may resize, causing shifts |

### Mitigation Strategies

**1. Use async/defer Attributes**
```html
<!-- async: Download in parallel, execute when ready -->
<script src="analytics.js" async></script>

<!-- defer: Download in parallel, execute after HTML parsing -->
<script src="non-critical.js" defer></script>
```

**2. Lazy Load Third-Party Resources**
```javascript
// Load chat widget only when needed
document.getElementById('chat-btn').addEventListener('click', () => {
  const script = document.createElement('script');
  script.src = 'https://chat-widget.com/widget.js';
  document.body.appendChild(script);
});
```

**3. Use Facade Pattern**
```javascript
// Show static image until interaction
function YouTubeFacade({ videoId }) {
  const [loaded, setLoaded] = useState(false);

  if (loaded) {
    return <iframe src={`https://youtube.com/embed/${videoId}`} />;
  }

  return (
    <button onClick={() => setLoaded(true)}>
      <img src={`https://img.youtube.com/vi/${videoId}/hqdefault.jpg`} />
      <span>Play Video</span>
    </button>
  );
}
```

**4. Use Web Workers (Partytown)**
```html
<!-- Move third-party scripts off main thread -->
<script>
  partytown = {
    forward: ['dataLayer.push']
  };
</script>
<script src="/~partytown/partytown.js"></script>
<script type="text/partytown" src="https://analytics.example.com/script.js"></script>
```

**5. Audit and Remove Unnecessary Scripts**

Regularly review third-party scripts and remove those that:
- Are no longer needed
- Have minimal business impact
- Can be replaced with lighter alternatives

---

## Lighthouse and PageSpeed Insights

### PageSpeed Insights

PageSpeed Insights provides both lab and field data:

- **URL**: https://pagespeed.web.dev
- **Field Data**: Real user data from Chrome User Experience Report (CrUX)
- **Lab Data**: Simulated data from Lighthouse

### Lighthouse

Lighthouse is an automated tool for improving web page quality:

```bash
# CLI usage
npx lighthouse https://example.com --view

# Specific categories
npx lighthouse https://example.com --only-categories=performance

# Output formats
npx lighthouse https://example.com --output=json --output-path=./report.json
```

### Lighthouse Performance Metrics

| Metric | Weight | Description |
|--------|--------|-------------|
| First Contentful Paint | 10% | Time to first content |
| Speed Index | 10% | How quickly content is visually displayed |
| Largest Contentful Paint | 25% | Time to largest content element |
| Total Blocking Time | 30% | Sum of long task blocking time (proxy for INP) |
| Cumulative Layout Shift | 25% | Visual stability score |

### Chrome DevTools Performance Panel

1. Open DevTools (F12)
2. Go to Performance tab
3. Click Record and interact with page
4. Analyze timeline for:
   - Long tasks (>50ms)
   - Layout shifts
   - Resource loading waterfall
   - Main thread activity

---

## Field Data vs Lab Data

### Key Differences

| Aspect | Lab Data | Field Data |
|--------|----------|------------|
| **Source** | Simulated (Lighthouse) | Real users (CrUX) |
| **Environment** | Controlled | Variable |
| **Device** | Simulated mobile | Actual devices |
| **Network** | Simulated throttling | Real network conditions |
| **Availability** | Always available | Requires sufficient traffic |
| **Reproducibility** | High | N/A (aggregated) |
| **Use case** | Debugging | Monitoring real experience |

### Chrome User Experience Report (CrUX)

CrUX is Google's public dataset of real user experience data:

```javascript
// CrUX API
const response = await fetch(
  `https://chromeuxreport.googleapis.com/v1/records:queryRecord?key=${API_KEY}`,
  {
    method: 'POST',
    body: JSON.stringify({
      url: 'https://example.com/',
      metrics: ['largest_contentful_paint', 'cumulative_layout_shift', 'interaction_to_next_paint']
    })
  }
);
```

### When to Use Each

**Lab Data (Lighthouse):**
- Debugging specific issues
- Testing before deployment
- Comparing code changes
- Identifying optimization opportunities

**Field Data (CrUX/RUM):**
- Understanding real user experience
- Tracking improvements over time
- Identifying device/network-specific issues
- Google Search ranking (uses field data)

---

## Debugging with Attribution

### The Attribution Build

The attribution build provides diagnostic information to identify performance bottlenecks:

```javascript
import { onCLS, onINP, onLCP } from 'web-vitals/attribution';

onLCP((metric) => {
  console.log('LCP Attribution:', {
    element: metric.attribution.element,
    url: metric.attribution.url,
    timeToFirstByte: metric.attribution.timeToFirstByte,
    resourceLoadDelay: metric.attribution.resourceLoadDelay,
    resourceLoadDuration: metric.attribution.resourceLoadDuration,
    elementRenderDelay: metric.attribution.elementRenderDelay,
  });
});

onINP((metric) => {
  console.log('INP Attribution:', {
    interactionTarget: metric.attribution.interactionTarget,
    interactionType: metric.attribution.interactionType,
    inputDelay: metric.attribution.inputDelay,
    processingDuration: metric.attribution.processingDuration,
    presentationDelay: metric.attribution.presentationDelay,
  });
});

onCLS((metric) => {
  console.log('CLS Attribution:', {
    largestShiftTarget: metric.attribution.largestShiftTarget,
    largestShiftTime: metric.attribution.largestShiftTime,
    largestShiftValue: metric.attribution.largestShiftValue,
    loadState: metric.attribution.loadState,
  });
});
```

### Sending Debug Data to Analytics

```javascript
import { onCLS, onINP, onLCP } from 'web-vitals/attribution';

function getDebugTarget(metric) {
  switch (metric.name) {
    case 'CLS':
      return metric.attribution.largestShiftTarget;
    case 'INP':
      return metric.attribution.interactionTarget;
    case 'LCP':
      return metric.attribution.element;
    default:
      return null;
  }
}

function sendWithDebugInfo(metric) {
  gtag('event', metric.name, {
    value: metric.delta,
    metric_id: metric.id,
    metric_value: metric.value,
    metric_rating: metric.rating,
    debug_target: getDebugTarget(metric),
  });
}

onCLS(sendWithDebugInfo);
onINP(sendWithDebugInfo);
onLCP(sendWithDebugInfo);
```

### Attribution Data Reference

**LCPAttribution:**
- `element`: CSS selector of LCP element
- `url`: URL of LCP resource (if applicable)
- `timeToFirstByte`: TTFB portion of LCP
- `resourceLoadDelay`: Time before resource started loading
- `resourceLoadDuration`: Time to load resource
- `elementRenderDelay`: Time after load to render

**INPAttribution:**
- `interactionTarget`: CSS selector of interaction element
- `interactionType`: 'pointer', 'keyboard'
- `inputDelay`: Time before event handler started
- `processingDuration`: Time in event handlers
- `presentationDelay`: Time after handlers to next paint
- `longAnimationFrameEntries`: Related LoAF entries

**CLSAttribution:**
- `largestShiftTarget`: CSS selector of largest shifting element
- `largestShiftTime`: When largest shift occurred
- `largestShiftValue`: Score of largest shift
- `loadState`: Page load state when shift occurred

---

## References

- [Web Vitals - web.dev](https://web.dev/articles/vitals)
- [Core Web Vitals - Google Search Central](https://developers.google.com/search/docs/appearance/core-web-vitals)
- [web-vitals Library - GitHub](https://github.com/GoogleChrome/web-vitals)
- [Optimize LCP - web.dev](https://web.dev/articles/optimize-lcp)
- [Optimize INP - web.dev](https://web.dev/articles/inp)
- [Optimize CLS - web.dev](https://web.dev/articles/cls)
- [PageSpeed Insights](https://pagespeed.web.dev)
- [Chrome User Experience Report](https://developer.chrome.com/docs/crux)
