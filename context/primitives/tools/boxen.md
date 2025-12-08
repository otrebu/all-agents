---
depends: []
---

# boxen

Create boxes in terminal output.

## Usage

```typescript
import boxen from "boxen";

console.log(
  boxen("Hello World", {
    padding: 1,
    borderStyle: "round",
    borderColor: "green",
  })
);
```

**Result:**

```
╭─────────────────╮
│                 │
│   Hello World   │
│                 │
╰─────────────────╯
```
