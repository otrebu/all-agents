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

**CLI Commands**: Run `aaa --help` and `aaa <cmd> --help` for each command. **Recursively get help for all subcommands** (e.g., `aaa ralph plan --help`, `aaa ralph plan vision --help`).

For commands that use prompts, find the .md file they reference (grep for `.md` in the TS source or workflow references). Known mappings:
- `ralph build` → `context/workflows/ralph/building/ralph-iteration.md`
- `ralph plan vision` → `context/workflows/ralph/planning/vision-interactive.md`
- `ralph plan roadmap` → `context/workflows/ralph/planning/roadmap-interactive.md`
- `ralph plan stories` → `context/workflows/ralph/planning/stories-auto.md`
- `ralph plan tasks` → `context/workflows/ralph/planning/tasks-auto.md`
- `ralph plan subtasks` → `context/workflows/ralph/planning/subtasks-auto.md`
- `ralph review stories` → `context/workflows/ralph/review/stories-interactive.md`
- `ralph review roadmap` → `context/workflows/ralph/review/roadmap-gap-auto.md`
- `ralph review tasks` → `context/workflows/ralph/review/tasks-interactive.md`
- `ralph review subtasks` → `context/workflows/ralph/review/subtasks-interactive.md`
- `ralph calibrate intention` → `context/workflows/ralph/calibration/intention-drift.md`
- `ralph calibrate technical` → `context/workflows/ralph/calibration/technical-drift.md`
- `ralph calibrate improve` → `context/workflows/ralph/calibration/self-improvement.md`
- `aaa review` → `.claude/skills/code-review/SKILL.md`
- `notify` → hooks via `context/workflows/ralph/building/hooks.md`

**Skills/Agents/Commands**: Parse YAML frontmatter from each .md file:
- `name` - display name
- `description` - what it does
- `model` - (agents only) haiku/sonnet/opus

## Data structure

**IMPORTANT**: Flatten subcommands into the main CLI list. Each subcommand is a first-class item:

```js
// BAD - subcommands nested, not navigable
{ name: 'ralph', subcommands: [{ name: 'build', ... }] }

// GOOD - each subcommand is its own item with full metadata
{ name: 'ralph', category: 'ralph', ... },
{ name: 'ralph build', category: 'ralph', promptPath: '...', ... },
{ name: 'ralph plan', category: 'ralph', ... },
{ name: 'ralph plan vision', category: 'ralph', promptPath: '...', ... },
```

This allows:
- Sidebar search to find `ralph plan vision` directly
- Each subcommand shows its own prompt file path
- Navigation breadcrumb: `ralph` → `ralph plan` → `ralph plan vision`

## UI features

1. **Header tabs** - Switch between CLI/Skills/Agents/Commands (keyboard: 1-4)
2. **Sidebar nav** - Grouped by category, searchable (keyboard: / to focus, Esc to clear)
3. **Main content** - Shows selected item with:
   - Name + icon + tag badge
   - Description
   - File path with **"📄 View Source"** button (opens file:// URL in new tab)
   - **Prompt file path** with View Prompt button (if command uses a workflow/prompt .md file)
   - Usage syntax (CLI only)
   - Options table (CLI only)
   - **Clickable subcommands** - Each subcommand card navigates to its own detail view
   - Examples
4. **Subcommands as first-class items** - Subcommands (e.g., `ralph plan vision`) appear in sidebar AND are navigable from parent. Each shows its own:
   - Full usage syntax
   - Options
   - Prompt file path (if applicable)
   - View Source link to implementation
5. **Model badges** - For agents: cyan=haiku, purple=sonnet, pink=opus
6. **Stats row** - On overview pages, show count of items in each section
7. **Prompt output** - Bottom bar with copy button, generates natural language about selected item

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
