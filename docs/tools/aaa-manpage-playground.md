# aaa Man Page Playground

Prompt for `/playground` to generate an interactive visual reference for the aaa CLI toolkit.

## Usage

```
/playground <paste prompt below>
```

Then open the generated HTML file in browser.

---

## Prompt

```
interactive visual man page for the aaa CLI toolkit

## What to build

A tabbed reference browser for the all-agents toolkit with 4 sections:
1. **CLI Commands** - `aaa` CLI commands from `tools/src/commands/`
2. **Skills** - Claude Code skills from `.claude/skills/*/SKILL.md`
3. **Agents** - Sub-agents from `.claude/agents/**/*.md`
4. **Slash Commands** - From `.claude/commands/**/*.md`

## Data extraction

For each section, read the actual files to extract metadata.

**CLI Commands**: Run `aaa --help` and `aaa <cmd> --help` for each command. For commands that use prompts, find the .md file they reference (grep for `.md` in the TS source). Known mappings:
- `ralph build` → `context/workflows/ralph/building/ralph-iteration.md`
- `ralph plan` → `context/workflows/ralph/planning/`
- `ralph review` → `context/workflows/ralph/review/`
- `ralph calibrate` → `context/workflows/ralph/calibration/`
- `aaa review` → `.claude/skills/code-review/SKILL.md`

**Skills/Agents/Commands**: Parse YAML frontmatter from each .md file:
- `name` - display name
- `description` - what it does
- `model` - (agents only) haiku/sonnet/opus

## UI features

1. **Header tabs** - Switch between CLI/Skills/Agents/Commands (keyboard: 1-4)
2. **Sidebar nav** - Grouped by category, searchable (keyboard: / to focus, Esc to clear)
3. **Main content** - Shows selected item with:
   - Name + icon + tag badge
   - Description
   - File path with **"📄 View Source"** button (opens file:// URL in new tab)
   - Usage syntax (CLI only)
   - Options table (CLI only)
   - Subcommands grid (if applicable)
   - Examples
4. **Model badges** - For agents: cyan=haiku, purple=sonnet, pink=opus
5. **Stats row** - On overview pages, show count of items in each section
6. **Prompt output** - Bottom bar with copy button, generates natural language about selected item

## File path handling

Store BASE_PATH as a JS constant at top of script (detect from repo root or use placeholder). Use relative paths in data, construct full file:// URLs for View Source links:

```js
const BASE_PATH = '/path/to/all-agents/';
// In template:
`<a href="file://${BASE_PATH}${item.path}" target="_blank">📄 View Source</a>`
```

## Visual style

- Dark theme (GitHub dark colors: #0d1117 bg, #c9d1d9 text, #58a6ff accent)
- System font for UI, monospace for code/paths
- Color-coded tags: research=blue, planning=purple, review=yellow, utility=gray, skill=pink, agent=cyan, command=orange
- Subtle borders (#30363d), rounded corners (6-8px), hover states

## Prompt output pattern

Generate contextual prompts like:
- "Tell me about `brainwriting`. Facilitates structured brainstorming... File: .claude/skills/brainwriting/SKILL.md. Triggered by: /brainwriting."
- Only include non-obvious info (skip if no trigger, no model, etc.)

## Output

Save as `aaa-manpage.html` in repo root, then run `open aaa-manpage.html` to view.
```
