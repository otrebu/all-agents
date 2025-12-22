---
tags: []
---

# fast-xml-parser

Pure JS/TS library for validating, parsing, and building XML. Zero native deps, works in Node.js and browsers.

**License**: MIT | **Types**: Included

## Installation

Install fast-xml-parser

## Basic Usage

```typescript
import { XMLParser, XMLBuilder, XMLValidator } from "fast-xml-parser";

const xml = `
<root>
  <user id="1">
    <name>John</name>
    <active>true</active>
  </user>
</root>`;

// Parse XML → JS Object
const parser = new XMLParser();
const obj = parser.parse(xml);
// { root: { user: { name: 'John', active: 'true' } } }

// Build JS Object → XML
const builder = new XMLBuilder();
const newXml = builder.build(obj);
```

## Parsing with Options

Attributes ignored by default. Enable + customize:

```typescript
const parser = new XMLParser({
  ignoreAttributes: false, // Include attributes (default: true)
  attributeNamePrefix: "@_", // Prefix for attribute keys
  allowBooleanAttributes: true, // Allow attrs without values
  parseTagValue: true, // Parse numbers/booleans in text
  parseAttributeValue: true, // Parse numbers/booleans in attrs
  trimValues: true, // Trim whitespace
  processEntities: true, // Handle XML entities
});

const result = parser.parse(`<root a="nice" checked><item>value</item></root>`);
// { root: { '@_a': 'nice', '@_checked': true, item: 'value' } }
```

## Common Parser Options

| Option                | Default   | Description                                   |
| --------------------- | --------- | --------------------------------------------- |
| `ignoreAttributes`    | `true`    | Skip XML attributes                           |
| `attributeNamePrefix` | `'@_'`    | Prefix for attribute keys                     |
| `textNodeName`        | `'#text'` | Key for text content when mixed with children |
| `parseTagValue`       | `true`    | Convert `"123"` → `123`, `"true"` → `true`    |
| `trimValues`          | `true`    | Trim whitespace from values                   |
| `stopNodes`           | `[]`      | Tags to not parse (e.g., `["*.script"]`)      |
| `preserveOrder`       | `false`   | Maintain tag order in output                  |
| `processEntities`     | `true`    | Decode XML entities                           |

## XML Syntax Validation

`XMLValidator` checks **syntax only** (well-formedness), not object structure:

```typescript
import { XMLValidator } from "fast-xml-parser";

const result = XMLValidator.validate(xmlString);

if (result === true) {
  console.log("Valid XML syntax");
} else {
  console.error(`Invalid: ${result.err.msg} at line ${result.err.line}`);
}
```

## Object Shape Validation

`XMLParser.parse()` returns `unknown`. No XSD/schema support.

Use Zod, Valibot, or ArkType for runtime object validation.

## Building XML

```typescript
import { XMLBuilder } from "fast-xml-parser";

const obj = {
  root: {
    "@_version": "1.0",
    item: [
      { "@_id": "1", "#text": "First" },
      { "@_id": "2", "#text": "Second" },
    ],
  },
};

const builder = new XMLBuilder({
  ignoreAttributes: false,
  format: true, // Pretty print
  indentBy: "  ", // Indent string
  suppressEmptyNode: true, // <tag/> instead of <tag></tag>
});

const xml = builder.build(obj);
```

## CDATA & Comments

```typescript
const parser = new XMLParser({
  cdataPropName: "__cdata",
  commentPropName: "__comment",
});
```

## Stop Nodes (Unparsed Content)

Raw content for tags like `<script>`:

```typescript
const parser = new XMLParser({
  stopNodes: ["*.script", "*.style", "root.rawData"],
});
```

## Resources

- [GitHub](https://github.com/NaturalIntelligence/fast-xml-parser)
- [Documentation](https://github.com/NaturalIntelligence/fast-xml-parser/blob/master/docs/v4/2.XMLparseOptions.md)
