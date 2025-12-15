## commander

CLI framework for building command-line commands with options and parameters with parsing and validation.

### Setup

Install `commander`.

### Commander.js Option Syntax → TypeScript Types

Here's a summary of how the option string syntax affects the parsed value:

| Syntax Pattern                  | Example                | Parsed Type                        | Notes                                        |
| ------------------------------- | ---------------------- | ---------------------------------- | -------------------------------------------- |
| **Boolean** (no placeholder)    | `--debug`              | `boolean \| undefined`             | `true` when present, `undefined` when absent |
| **Required value** (`<>`)       | `--port <number>`      | `string \| undefined`              | String value required if option used         |
| **Optional value** (`[]`)       | `--cheese [type]`      | `string \| boolean \| undefined`   | `true` if flag only, `string` if value given |
| **Negatable** (`no-` prefix)    | `--no-sauce`           | `boolean`                          | Default `true`, becomes `false` when used    |
| **Variadic required** (`<...>`) | `--numbers <nums...>`  | `string[] \| undefined`            | Array of strings                             |
| **Variadic optional** (`[...]`) | `--letters [chars...]` | `string[] \| boolean \| undefined` | `true` if flag only, `string[]` if values    |

### Key nuances:

1. **With default value**: removes `undefined` from the union
2. **With `.requiredOption()`**: removes `undefined` (guaranteed at runtime)
3. **`no-` alone** (e.g., only `--no-sauce` defined): defaults to `true`, no way to set `true` explicitly
4. **`no-` paired** (e.g., `--sauce` AND `--no-sauce`): default depends on which is defined first

### TypeScript type examples:

```typescript
interface Options {
  // --debug (boolean)
  debug?: boolean;

  // --port <number> (required value)
  port?: string;

  // --cheese [type] (optional value)
  cheese?: string | boolean;

  // --no-sauce (negatable, defined alone)
  sauce: boolean; // defaults true, no undefined

  // --numbers <nums...> (variadic)
  numbers?: string[];

  // --letters [chars...] (optional variadic)
  letters?: string[] | boolean;
}
```
