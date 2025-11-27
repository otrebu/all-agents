# Script Location vs Working Directory: Best Practices

**Date:** 2025-11-23
**Objective:** Understand best practices, patterns, and code examples for handling script location vs working directory in shell scripts and programming languages

## Summary

The fundamental distinction across all languages: **current working directory (CWD)** reflects where the process was invoked, while **script directory** reflects where the source file physically resides. Best practice universally favors resolving paths relative to script location rather than CWD, avoiding `chdir()` operations, and using language-specific APIs to get the script's absolute path.

## Key Findings

### Core Concepts

- **Working Directory (CWD)**: Where the process/command was invoked from (changeable at runtime)
- **Script Directory**: Where the actual script file is stored (constant per file)
- **Best Practice**: Resolve paths relative to script location, not CWD
- **Anti-pattern**: Changing CWD with `chdir()` or `cd` (hard to debug, side effects)

### Language-Specific Patterns

#### Node.js

**Problem:**
- `process.cwd()` returns where node was invoked
- `__dirname` returns script file's directory
- `.` is relative to `process.cwd()`, except `require()` uses `__dirname`

**Solution:**
```javascript
// Get script directory
const scriptDir = __dirname;

// Resolve paths relative to script
const path = require('path');
const configPath = path.join(__dirname, 'config.json');
const libPath = path.resolve(__dirname, '../lib/module.js');

// DON'T do this (breaks when invoked from elsewhere)
const badPath = './config.json';  // relative to CWD, not script
```

**Key Points:**
- `__dirname` is module-scoped (local to each file)
- `process.cwd()` is global (same for entire process)
- `process.chdir()` can change CWD at runtime
- Use `path.resolve()` or `path.join()` for combining paths

#### Python

**Problem:**
- `os.getcwd()` / `Path.cwd()` returns where python was invoked
- `__file__` returns script path (not always absolute in older versions)

**Solution:**
```python
from pathlib import Path

# Get script directory (recommended)
SCRIPT_DIR = Path(__file__).parent
# or for absolute path (Python 3.9+ __file__ is already absolute)
SCRIPT_DIR = Path(__file__).resolve().parent

# Resolve paths relative to script
config_path = SCRIPT_DIR / 'config.json'
lib_path = (SCRIPT_DIR / '../lib').resolve()

# Legacy approach (os module)
import os
script_dir = os.path.dirname(os.path.abspath(__file__))
config_path = os.path.join(script_dir, 'config.json')

# DON'T do this
os.chdir(Path(__file__).parent)  # Anti-pattern, changes global state
```

**Key Points:**
- `Path(__file__).parent` returns script directory
- `Path.cwd()` is a property of terminal/process, not Python
- CWD changes based on where script is invoked
- Use `Path` objects for cross-platform compatibility
- Avoid `os.chdir()` (global side effects)

#### Bash/Shell

**Problem:**
- `$PWD` or `$(pwd)` returns where shell was invoked
- `$0` can be relative path
- Sourced scripts need `$BASH_SOURCE` instead of `$0`

**Solution:**
```bash
#!/usr/bin/env bash

# Get script directory (for executed scripts)
SCRIPT_DIR="$(dirname "$0")"
# Or absolute path
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# For sourced scripts (use BASH_SOURCE)
SCRIPT_DIR="$(dirname "${BASH_SOURCE[0]}")"
# Absolute version
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Performance-optimized (no subshell)
SCRIPT_DIR="${BASH_SOURCE[0]%/*}"

# Resolve paths relative to script
source "$SCRIPT_DIR/lib/module.sh"
config_file="$SCRIPT_DIR/config.txt"

# DON'T do this (breaks portability)
cd "$SCRIPT_DIR"  # Anti-pattern
source ./lib/module.sh  # Breaks if invoked from elsewhere
```

**Key Points:**
- `$0` = script path as invoked (may be relative)
- `${BASH_SOURCE[0]}` = script path (works when sourced)
- `dirname` extracts directory from path
- Prefer prefixing paths over `cd` (easier to maintain)
- `${BASH_SOURCE[0]%/*}` faster than `$(dirname)` (no subshell)

### Cross-Language Patterns

| Language | Working Directory | Script Directory | Recommended Approach |
|----------|------------------|------------------|---------------------|
| Node.js | `process.cwd()` | `__dirname` | `path.join(__dirname, 'file')` |
| Python | `Path.cwd()` / `os.getcwd()` | `Path(__file__).parent` | `SCRIPT_DIR / 'file'` |
| Bash | `$PWD` / `$(pwd)` | `$(dirname "${BASH_SOURCE[0]}")` | `"$SCRIPT_DIR/file"` |
| Go | N/A (binaries) | N/A | Embed assets or use flags |

## Analysis

### When to Use Script Directory vs CWD

**Use Script Directory For:**
- Loading config files bundled with script
- Accessing templates/assets/data files alongside code
- Sourcing/importing other modules in project structure
- Any path that should be "relative to the script itself"

**Use CWD For:**
- Processing user-provided files
- Output files meant for user's current location
- CLI tools that operate on "current directory"
- When user expects paths relative to where they ran command

**Example Scenarios:**

```python
# Script directory: load bundled config
config = SCRIPT_DIR / 'default_config.yaml'

# CWD: process user's files
input_file = Path.cwd() / sys.argv[1]  # User provides relative path
output_file = Path.cwd() / 'results.txt'  # Save in user's location
```

### Why Avoid `chdir()` / `cd`

**Problems:**
1. **Global state mutation**: Affects all subsequent file operations
2. **Hard to debug**: Path resolution becomes implicit
3. **Breaks composability**: Can't call script from another script reliably
4. **Race conditions**: In threaded environments (Python threading)
5. **Unexpected side effects**: Relative imports break, subprocess inherit CWD

**Exception:** Only acceptable at top of main entry point before any other code:
```python
# Acceptable ONLY at script entry point
if __name__ == '__main__':
    os.chdir(Path(__file__).parent)
    # Now all paths can be relative...
```

### Best Practices Summary

1. **Establish BASE_DIR constant early:**
   ```python
   BASE_DIR = Path(__file__).resolve().parent
   ```

2. **Always prefix paths with BASE_DIR:**
   ```python
   config = BASE_DIR / 'config.yaml'
   lib = BASE_DIR / 'lib' / 'utils.py'
   ```

3. **Never rely on CWD for script internals:**
   ```python
   # BAD: breaks when invoked from elsewhere
   config = Path('config.yaml')

   # GOOD: explicit, portable
   config = BASE_DIR / 'config.yaml'
   ```

4. **Use language path APIs:**
   - Node.js: `path.join()`, `path.resolve()`
   - Python: `pathlib.Path` (not string concatenation)
   - Bash: `dirname`, proper quoting

5. **Document assumptions:**
   ```python
   # This script must be run from project root
   # OR
   # This script works from any directory
   ```

### Common Gotchas

**Node.js:**
- `require('./file')` is relative to current file, but `fs.readFile('./file')` is relative to CWD
- Solution: Always use `__dirname` for file I/O

**Python:**
- `__file__` may be relative in older Python (pre-3.9)
- Solution: Always use `Path(__file__).resolve()`

**Bash:**
- `$0` is path as typed by user (might be symlink)
- Solution: Use `readlink -f` or `realpath` if symlinks matter

**All Languages:**
- Relative paths in sourced/imported modules resolve relative to that module, not the entry point
- Solution: Each module should use its own `__dirname` / `__file__` / `$BASH_SOURCE`

## Practical Examples

### Node.js: Multi-file Project

```javascript
// src/index.js
const path = require('path');
const loadConfig = require('./lib/config');

// Get root directory (parent of src/)
const ROOT_DIR = path.join(__dirname, '..');

// Load config relative to root
const config = loadConfig(path.join(ROOT_DIR, 'config.json'));

// lib/config.js
const fs = require('fs');
const path = require('path');

module.exports = function loadConfig(configPath) {
  // configPath is absolute, passed from caller
  return JSON.parse(fs.readFileSync(configPath, 'utf8'));
};
```

### Python: Sourcing Adjacent Modules

```python
# scripts/process_data.py
from pathlib import Path
import sys

# Add project root to path
PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

# Now can import from project root
from lib.utils import sanitize

# Load data file next to script
data_file = Path(__file__).parent / 'data.csv'
```

### Bash: Sourcing Library Files

```bash
#!/usr/bin/env bash
# scripts/deploy.sh

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Source utilities from lib/
source "$SCRIPT_DIR/../lib/logging.sh"
source "$SCRIPT_DIR/../lib/aws.sh"

# Load config from project root
CONFIG_FILE="$PROJECT_ROOT/deploy.conf"
```

## Sources

1. **[What's the difference between process.cwd() vs __dirname?](https://stackoverflow.com/questions/9874382/whats-the-difference-between-process-cwd-vs-dirname)** - Comprehensive explanation of Node.js path resolution with examples
2. **[Difference Between process.cwd() and __dirname in Node.js](https://www.geeksforgeeks.org/node-js/difference-between-process-cwd-and-__dirname-in-node-js/)** - Clear comparison table and use cases
3. **[Need some help understanding current working directory in pathlib](https://stackoverflow.com/questions/65289216/need-some-help-understanding-current-working-directory-in-pathlib)** - Python pathlib CWD vs script location
4. **[How do you properly determine the current script directory?](https://stackoverflow.com/questions/3718657/how-do-you-properly-determine-the-current-script-directory)** - Python `__file__` best practices and edge cases
5. **[How to include bash scripts with relative path?](https://stackoverflow.com/questions/48167083/how-to-include-bash-scripts-with-relative-path)** - Bash sourcing patterns with `BASH_SOURCE`
6. **[The current working dir and other dirs of interest in Nodejs](https://dustinpfister.github.io/2021/03/17/nodejs-process-cwd/)** - Node.js directory resolution tutorial
7. **[pathlib — Object-oriented filesystem paths](https://docs.python.org/3/library/pathlib.html)** - Official Python pathlib documentation
8. **[In scripts, is it better to cd working directory or prefix paths](https://unix.stackexchange.com/questions/722538/in-scripts-is-it-better-to-cd-working-directory-or-prefix-paths)** - Unix best practices discussion
9. **[What is the proper way to relatively source a file? : r/bash](https://www.reddit.com/r/bash/comments/10jipn2/what_is_the_proper_way_to_relatively_source_a_file/)** - Bash sourcing patterns
10. **[How to Get the Current Directory in Python - DataCamp](https://www.datacamp.com/tutorial/python-get-the-current-directory)** - Python CWD tutorial with warnings about `os.chdir()`
11. **[Difference between process.cwd & _ _dirname in NodeJS](https://www.tutorialspoint.com/difference-between-process-cwd-and-dirname-in-nodejs)** - Node.js comparison with examples
12. **[Best practice: change directory or use absolute filepaths? - Reddit](https://www.reddit.com/r/learnprogramming/comments/t0hlwh/best_practice_change_directory_or_use_absolute/)** - Discussion on avoiding `chdir()`
13. **[How to determine the path to a sourced tcsh or bash shell script](https://unix.stackexchange.com/questions/4650/how-to-determine-the-path-to-a-sourced-tcsh-or-bash-shell-script-from-within-the)** - Deep dive on `BASH_SOURCE` array

## Recommendations

1. **Establish script directory constant at top of every script:**
   - Node.js: `const SCRIPT_DIR = __dirname;`
   - Python: `SCRIPT_DIR = Path(__file__).resolve().parent`
   - Bash: `SCRIPT_DIR="$(dirname "${BASH_SOURCE[0]}")"`

2. **Always resolve internal paths relative to script location:**
   - Use `path.join(SCRIPT_DIR, 'file')` (Node.js)
   - Use `SCRIPT_DIR / 'file'` (Python)
   - Use `"$SCRIPT_DIR/file"` (Bash)

3. **Never change CWD unless at entry point of main script:**
   - Avoid `process.chdir()`, `os.chdir()`, `cd` in functions/libraries
   - If needed, do it once at top of main entry point

4. **Document path expectations:**
   - Add comment: "This script works from any directory"
   - Or: "Must be run from project root"

5. **Use absolute paths for cross-module communication:**
   - Pass absolute paths to imported/sourced modules
   - Don't rely on shared CWD assumptions

6. **Test scripts from different directories:**
   ```bash
   # Test from script directory
   ./scripts/myscript.sh

   # Test from parent directory
   scripts/myscript.sh

   # Test from root
   /absolute/path/to/scripts/myscript.sh
   ```

## Next Steps

- Audit existing scripts for CWD dependencies
- Add `BASE_DIR` / `SCRIPT_DIR` constants to all scripts
- Replace relative paths with script-relative paths
- Test scripts when invoked from different directories
- Document path resolution strategy in project README
