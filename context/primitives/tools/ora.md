---
depends: []
---

# ora

Elegant terminal spinners.

## Usage

```typescript
import ora from "ora";

const spinner = ora("Loading...").start();

// ... async work

spinner.succeed("Done!");
// or
spinner.fail("Failed!");
```

## With async

```typescript
const spinner = ora("Fetching data...").start();
try {
  const data = await fetchData();
  spinner.succeed("Data fetched");
} catch (error) {
  spinner.fail("Fetch failed");
}
```
