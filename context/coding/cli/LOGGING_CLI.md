# CLI Logging

Human-readable terminal output for CLI tools.

> **Principles:** See @context/CODING_STYLE.md#logging

**✅ Use for:** CLI tools, terminal apps, interactive commands
**❌ Don't use for:** Services, APIs, web servers → see @context/coding/backend/LOGGING_OBSERVABILITY.md

**DO NOT use pino, winston, or JSON loggers.** CLIs output text for humans, not log aggregators.

## Setup

```bash
pnpm add chalk
pnpm add ora  # Optional: spinners
```

Use @tools/lib/log.ts for logging when available a simple wrapper:

**tools/lib/log.ts:**

```typescript
import chalk from "chalk";

/**
 * CLI logging utilities for human-readable terminal output
 */
const log = {
  dim: (message: string) => {
    console.log(chalk.dim(message));
  },
  error: (message: string) => {
    console.error(chalk.red(`✗ ${message}`));
  },
  header: (message: string) => {
    console.log(chalk.bold.cyan(message));
  },
  info: (message: string) => {
    console.log(chalk.blue(`ℹ ${message}`));
  },
  plain: (message: string) => {
    console.log(message);
  },
  success: (message: string) => {
    console.log(chalk.green(`✓ ${message}`));
  },
  warn: (message: string) => {
    console.warn(chalk.yellow(`⚠ ${message}`));
  },
};

export default log;
```

## Advanced Usage

```typescript
import chalk from "chalk";

// ═══════════════════════════════════════════
// TEXT MODIFIERS
// ═══════════════════════════════════════════

console.log(chalk.bold("Bold text"));
console.log(chalk.dim("Dimmed text"));
console.log(chalk.italic("Italic text"));
console.log(chalk.underline("Underlined text"));
console.log(chalk.strikethrough("Strikethrough text"));
console.log(chalk.inverse("Inverse (swap fg/bg)"));
console.log(chalk.hidden("Hidden text (still selectable)"));
console.log(chalk.overline("Overlined text")); // Not widely supported

// ═══════════════════════════════════════════
// CHAINING MODIFIERS
// ═══════════════════════════════════════════

console.log(chalk.bold.underline("Bold + Underline"));
console.log(chalk.italic.dim.yellow("Italic + Dim + Yellow"));
console.log(chalk.bold.italic.underline.red("Bold + Italic + Underline + Red"));
console.log(chalk.bgBlue.white.bold.underline("Full combo with background"));

// ═══════════════════════════════════════════
// FOREGROUND COLORS
// ═══════════════════════════════════════════

// Standard colors
console.log(chalk.black("black"));
console.log(chalk.red("red"));
console.log(chalk.green("green"));
console.log(chalk.yellow("yellow"));
console.log(chalk.blue("blue"));
console.log(chalk.magenta("magenta"));
console.log(chalk.cyan("cyan"));
console.log(chalk.white("white"));
console.log(chalk.gray("gray / grey"));

// Bright variants
console.log(chalk.redBright("redBright"));
console.log(chalk.greenBright("greenBright"));
console.log(chalk.blueBright("blueBright"));
console.log(chalk.cyanBright("cyanBright"));

// ═══════════════════════════════════════════
// BACKGROUND COLORS
// ═══════════════════════════════════════════

console.log(chalk.bgRed.white(" Background Red "));
console.log(chalk.bgGreen.black(" Background Green "));
console.log(chalk.bgYellow.black(" Background Yellow "));
console.log(chalk.bgBlue.white(" Background Blue "));
console.log(chalk.bgMagenta.white(" Background Magenta "));
console.log(chalk.bgCyan.black(" Background Cyan "));
console.log(chalk.bgWhite.black(" Background White "));
console.log(chalk.bgRedBright.black(" Background Red Bright "));

// ═══════════════════════════════════════════
// HEX, RGB, HSL, ANSI256
// ═══════════════════════════════════════════

// Hex colors
console.log(chalk.hex("#FF6B6B")("Coral via Hex"));
console.log(chalk.hex("#4ECDC4")("Teal via Hex"));
console.log(chalk.bgHex("#2D3436").hex("#DFE6E9")(" Dark bg with light text "));

// RGB colors
console.log(chalk.rgb(255, 107, 107)("Coral via RGB"));
console.log(chalk.bgRgb(46, 204, 113).black(" Green bg via RGB "));

// HSL colors (hue, saturation, lightness)
console.log(chalk.hsl(180, 100, 50)("Cyan via HSL"));
console.log(chalk.bgHsl(280, 100, 50).white(" Purple bg via HSL "));

// ANSI 256 colors
console.log(chalk.ansi256(201)("Hot pink via ANSI256"));
console.log(chalk.bgAnsi256(57).white(" Purple bg via ANSI256 "));

// ═══════════════════════════════════════════
// NESTED STYLES
// ═══════════════════════════════════════════

console.log(
  chalk.red("Red text with", chalk.bold.underline("bold underlined"), "inside")
);

console.log(
  chalk.bgBlue.white(" Start ", chalk.bgRed.bold(" ALERT "), " End ")
);

// ═══════════════════════════════════════════
// TAGGED TEMPLATE LITERALS
// ═══════════════════════════════════════════

console.log(chalk`
{bold.underline.cyan ══════ System Status ══════}

{green.bold ✓} {underline Server}:     {green Online}
{yellow.bold ⚠} {underline Memory}:     {yellow 78% used}
{red.bold ✗} {underline Database}:   {red.strikethrough Disconnected}

{dim.italic Last updated: ${new Date().toLocaleTimeString()}}
`);

// ═══════════════════════════════════════════
// REUSABLE STYLED FUNCTIONS (THEMES)
// ═══════════════════════════════════════════

const theme = {
  title: chalk.bold.underline.hex("#A78BFA"),
  success: chalk.green.bold,
  warning: chalk.yellow.bold,
  error: chalk.red.bold.underline,
  info: chalk.blueBright,
  muted: chalk.gray.italic,
  highlight: chalk.bgYellow.black.bold,
  code: chalk.bgGray.white,
  link: chalk.cyan.underline,
};

console.log(theme.title("Application Report"));
console.log(theme.success("✓ All tests passed"));
console.log(theme.warning("⚠ Deprecation warnings found"));
console.log(theme.error("✗ Critical error in module"));
console.log(theme.info("ℹ Running in development mode"));
console.log(theme.muted("Last run: 2 minutes ago"));
console.log(theme.highlight(" NEW "), "Feature released");
console.log(theme.code(" npm install chalk "));
console.log(theme.link("https://github.com/chalk/chalk"));

// ═══════════════════════════════════════════
// CONDITIONAL / DYNAMIC STYLING
// ═══════════════════════════════════════════

const statusBadge = (status: "ok" | "warn" | "error") => {
  const styles = {
    ok: chalk.bgGreen.black.bold,
    warn: chalk.bgYellow.black.bold,
    error: chalk.bgRed.white.bold,
  };
  return styles[status](` ${status.toUpperCase()} `);
};

console.log(`Build: ${statusBadge("ok")}`);
console.log(`Lint:  ${statusBadge("warn")}`);
console.log(`Test:  ${statusBadge("error")}`);

// ═══════════════════════════════════════════
// DISABLE COLORS PROGRAMMATICALLY
// ═══════════════════════════════════════════

const plain = new chalk.Instance({ level: 0 }); // No colors
console.log(plain.red("This will NOT be red"));

// Force colors even when not TTY
const forced = new chalk.Instance({ level: 3 }); // TrueColor
console.log(forced.hex("#FF0000")("Forced red"));
```

## With Ora Spinners

```typescript
import ora from "ora";
import chalk from "chalk";

const spinner = ora("Building project...").start();

try {
  await build();
  spinner.succeed(chalk.green("Build complete!"));
} catch (error) {
  spinner.fail(chalk.red("Build failed"));
}
```

## Conditional Verbosity

```typescript
import log from "@lib/log";
const verbose = options.verbose;

// Always show
log.success("Done!");
log.error("Failed");

// Verbose only
if (verbose) {
  log.dim("Debug: processing file.ts");
}
```

## Best Practices

**DO:**

- ✅ `console.log()` for stdout (normal output)
- ✅ `console.error()` for stderr (errors, warnings)
- ✅ @tools/lib/log.ts for logging when available and simple logs
- ✅ chalk for colors
- ✅ ora for spinners/progress
- ✅ Respect `--quiet` and `--verbose` flags

**DON'T:**

- ❌ Output JSON (unless explicit `--json` flag)
- ❌ Use pino/winston
- ❌ Log to files (use stdout/stderr)
