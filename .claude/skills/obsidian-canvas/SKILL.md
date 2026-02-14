---
name: obsidian-canvas
description: Create Obsidian .canvas files programmatically with correct format. Use when user asks to "create canvas", "make canvas", "canvas file", "obsidian canvas", or needs to generate a .canvas for Obsidian.
allowed-tools: Read, Write, Bash, Glob, Grep
---

# Obsidian Canvas Creator

Create `.canvas` files that Obsidian will accept without stripping groups, edges, or nodes.

## ID Generation

Generate ALL IDs upfront before building JSON. Use 16-char lowercase hex:

```bash
for i in $(seq 1 N); do uuidgen | tr '[:upper:]' '[:lower:]' | tr -d '-' | head -c 16; echo; done
```

Or use a systematic hex pattern for clarity:
```
a1b2c3d4e5f60001  (group 1)
a1b2c3d4e5f60010  (first child of group 1)
a1b2c3d4e5f60011  (second child of group 1)
a1b2c3d4e5f6e001  (edge 1)
```

## Critical Rules

These are non-negotiable. Violating ANY of them causes Obsidian to silently strip nodes:

1. **Every node MUST have `"styleAttributes":{}`** — Obsidian's proprietary field. Without it, nodes (especially groups) get dropped on re-serialization.
2. **Use 16-char hex IDs** — Human-readable IDs like `"group-work"` cause parser issues. Use hex: `"a1b2c3d4e5f60001"`.
3. **Groups BEFORE children in the array** — Nodes are z-indexed by array position. Groups render behind children, so they must appear earlier.
4. **Spatial containment is implicit** — No `children` or `parentId` field exists. A node is "inside" a group purely by having its bounds within the group's bounds. Children must be FULLY contained.
5. **Always include `metadata` block** — `{"version":"1.0-1.0","frontmatter":{}}`. Prevents unnecessary re-serialization.
6. **Edges MUST include `fromSide`/`toSide`** — Despite being optional in the JSON Canvas spec, Obsidian fails to render edges without them. Values: `"top"`, `"right"`, `"bottom"`, `"left"`.
7. **Color is a string** — `"1"` through `"6"` (presets) or `"#RRGGBB"`. Never use integers.
8. **Close the canvas tab before writing** — If the canvas is open in Obsidian, its in-memory state will overwrite your file on auto-save. Warn the user to close it first.
9. **No custom object/array properties on nodes** — Obsidian's custom JSON serializer adds trailing commas for unknown object/array properties, producing invalid JSON. Only `styleAttributes:{}` is safe.

## Node Types Reference

### Common Properties (all nodes)

| Property | Type | Required | Notes |
|----------|------|----------|-------|
| `id` | string | yes | 16-char hex |
| `type` | string | yes | `"text"`, `"group"`, `"file"`, `"link"` |
| `x` | integer | yes | horizontal position (px) |
| `y` | integer | yes | vertical position (px) |
| `width` | integer | yes | width (px) |
| `height` | integer | yes | height (px) |
| `color` | string | no | `"1"`-`"6"` or `"#RRGGBB"` |
| `styleAttributes` | object | **yes** | Always `{}` |

### Text Node

| Property | Type | Notes |
|----------|------|-------|
| `text` | string | Markdown content |

### Group Node

| Property | Type | Notes |
|----------|------|-------|
| `label` | string | Display label |
| `background` | string | Vault-relative path to image |
| `backgroundStyle` | string | `"cover"`, `"ratio"`, or `"repeat"` |

### File Node

| Property | Type | Notes |
|----------|------|-------|
| `file` | string | Vault-relative path |
| `subpath` | string | Optional subpath (e.g. `#heading`) |

### Link Node

| Property | Type | Notes |
|----------|------|-------|
| `url` | string | External URL |

### Edge

| Property | Type | Required | Notes |
|----------|------|----------|-------|
| `id` | string | yes | 16-char hex |
| `fromNode` | string | yes | Source node ID |
| `toNode` | string | yes | Target node ID |
| `fromSide` | string | **yes** | `"top"`, `"right"`, `"bottom"`, `"left"` |
| `toSide` | string | **yes** | `"top"`, `"right"`, `"bottom"`, `"left"` |
| `fromEnd` | string | no | `"none"` or `"arrow"` (default: `"none"`) |
| `toEnd` | string | no | `"none"` or `"arrow"` (default: `"arrow"`) |
| `color` | string | no | Same as node colors |
| `label` | string | no | Text label on edge |

## Color Reference

| Value | Color |
|-------|-------|
| `"1"` | Red |
| `"2"` | Orange |
| `"3"` | Yellow |
| `"4"` | Green |
| `"5"` | Cyan |
| `"6"` | Purple |

Hex values also work: `"#FF0000"`, `"#000000"`, etc.

## Sizing Guide

**Width:** `(character_count * 9) + 40` px, round up to nearest 20.
- 40px = ~20px padding each side
- Bold text: use ~10px/char
- Emojis: count as ~2 chars

**Height:** 60px for single line. 80-90px if text may wrap.

**Group padding:** 20-30px margin on each side. Group label takes ~40px at top, so first child `y` should be group `y + 60` minimum.

## Minimal Working Template

```json
{
	"nodes":[
		{"id":"a1b2c3d4e5f60001","type":"group","x":-20,"y":-20,"width":560,"height":200,"color":"6","label":"My Group","styleAttributes":{}},
		{"id":"a1b2c3d4e5f60010","type":"text","text":"First item","x":30,"y":60,"width":200,"height":60,"styleAttributes":{}},
		{"id":"a1b2c3d4e5f60011","type":"text","text":"Second item","x":280,"y":60,"width":200,"height":60,"styleAttributes":{}}
	],
	"edges":[
		{"id":"a1b2c3d4e5f6e001","fromNode":"a1b2c3d4e5f60010","fromSide":"right","toNode":"a1b2c3d4e5f60011","toSide":"left"}
	],
	"metadata":{
		"version":"1.0-1.0",
		"frontmatter":{}
	}
}
```

## Workflow

1. **Gather content** — Ask user what nodes, groups, and connections they need
2. **Generate IDs** — Run the `uuidgen` one-liner for all needed IDs (or use systematic hex pattern)
3. **Calculate sizing** — Use the width formula per node. Pick consistent heights.
4. **Layout** — Position groups first. Place children within group bounds (with margins). Stack groups vertically with ~60px gaps.
5. **Build JSON** — Groups BEFORE children in `nodes` array. Add `styleAttributes:{}` to every node. Include `metadata`.
6. **Warn user** — Tell them to close the canvas tab in Obsidian if it's open
7. **Write file** — Use the Write tool to create the `.canvas` file
8. **Verify** — Ask user to open in Obsidian and confirm groups/edges persist
