---
depends:
  - "@context/blocks/construct/fast-xml-parser.md"
  - "@context/blocks/construct/zod.md"
tags: []
---

# XML Parsing & Validation with Zod

Parse XML to validated, transformed domain models using fast-xml-parser and Zod.

## References

@context/blocks/construct/fast-xml-parser.md
@context/blocks/construct/zod.md

---

## The Pipeline

```
XML string → fast-xml-parser → unknown → Zod (raw schema → transform → domain schema) → domain model
```

Zod is the single source of truth. Both raw and domain shapes are Zod schemas, connected by `.transform().pipe()`.

---

## XML Parser Configuration

```typescript
import { XMLParser } from 'fast-xml-parser';

const XML_PARSER_CONFIG = {
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  parseTagValue: true,
  trimValues: true,
} as const;

function parseXmlToUnknown(xmlString: string): unknown {
  const parser = new XMLParser(XML_PARSER_CONFIG);
  return parser.parse(xmlString);
}
```

---

## Zod Helper: Array Coercion

XML parsers return single elements as objects, multiple as arrays. Normalise to arrays:

```typescript
import { z } from 'zod';

function coerceToArray<T extends z.ZodTypeAny>(itemSchema: T) {
  return z.preprocess(
    (val) => (Array.isArray(val) ? val : [val]),
    z.array(itemSchema),
  );
}
```

---

## The Pattern

Each domain concept follows this shape:

```typescript
// 1. Raw schema (XML structure)
const FooRawSchema = z.object({ ... });

// 2. Domain schema (what your app uses)
const FooDomainSchema = z.object({ ... });

// 3. Pure transform function
function transformFoo(raw: z.infer<typeof FooRawSchema>): z.infer<typeof FooDomainSchema> {
  return { ... };
}

// 4. Composed schema: validate input → transform → validate output
const FooSchema = FooRawSchema.transform(transformFoo).pipe(FooDomainSchema);

// 5. Types derived from Zod
type FooRaw = z.input<typeof FooSchema>;
type Foo = z.output<typeof FooSchema>;
```

---

## Example: Billing Export

Build schemas leaf-to-root:

```typescript
import { z } from 'zod';
import * as R from 'remeda';

// ============================================================
// Charge (leaf)
// ============================================================

const ChargeRawSchema = z.object({
  '@_id': z.string(),
  Description: z.string(),
  Amount: z.coerce.number(),
  VAT: z.coerce.number(),
  Category: z.string().optional(),
});

const ChargeDomainSchema = z.object({
  id: z.string(),
  description: z.string(),
  category: z.string(),
  netPence: z.number(),
  vatPence: z.number(),
  grossPence: z.number(),
});

function transformCharge(
  raw: z.infer<typeof ChargeRawSchema>,
): z.infer<typeof ChargeDomainSchema> {
  return {
    id: raw['@_id'],
    description: raw.Description,
    category: raw.Category ?? 'Uncategorised',
    netPence: raw.Amount,
    vatPence: raw.VAT,
    grossPence: raw.Amount + raw.VAT,
  };
}

const ChargeSchema = ChargeRawSchema
  .transform(transformCharge)
  .pipe(ChargeDomainSchema);

// ============================================================
// Account
// ============================================================

const AccountRawSchema = z.object({
  '@_number': z.string(),
  '@_parentNumber': z.string().optional(),
  Name: z.string(),
  Charges: z.object({
    Charge: coerceToArray(ChargeRawSchema),
  }),
});

const AccountDomainSchema = z.object({
  number: z.string(),
  parentNumber: z.string().nullable(),
  name: z.string(),
  charges: z.array(ChargeDomainSchema),
  totalNetPence: z.number(),
  totalVatPence: z.number(),
  totalGrossPence: z.number(),
});

function transformAccount(
  raw: z.infer<typeof AccountRawSchema>,
): z.infer<typeof AccountDomainSchema> {
  const charges = R.map(raw.Charges.Charge, transformCharge);

  return {
    number: raw['@_number'],
    parentNumber: raw['@_parentNumber'] || null,
    name: raw.Name,
    charges,
    totalNetPence: R.sumBy(charges, (c) => c.netPence),
    totalVatPence: R.sumBy(charges, (c) => c.vatPence),
    totalGrossPence: R.sumBy(charges, (c) => c.grossPence),
  };
}

const AccountSchema = AccountRawSchema
  .transform(transformAccount)
  .pipe(AccountDomainSchema);

// ============================================================
// BillingExport (root)
// ============================================================

const BillingExportRawSchema = z.object({
  BillingExport: z.object({
    '@_date': z.string(),
    '@_billRun': z.string(),
    Account: coerceToArray(AccountRawSchema),
  }),
});

const BillingExportDomainSchema = z.object({
  date: z.string(),
  billRunId: z.string(),
  accounts: z.array(AccountDomainSchema),
  totalGrossPence: z.number(),
});

function transformBillingExport(
  raw: z.infer<typeof BillingExportRawSchema>,
): z.infer<typeof BillingExportDomainSchema> {
  const root = raw.BillingExport;
  const accounts = R.map(root.Account, transformAccount);

  return {
    date: root['@_date'],
    billRunId: root['@_billRun'],
    accounts,
    totalGrossPence: R.sumBy(accounts, (a) => a.totalGrossPence),
  };
}

const BillingExportSchema = BillingExportRawSchema
  .transform(transformBillingExport)
  .pipe(BillingExportDomainSchema);

type BillingExport = z.output<typeof BillingExportSchema>;
```

---

## Full Pipeline

```typescript
type ParseResult<T> =
  | { success: true; data: T }
  | { success: false; errors: ValidationError[] };

interface ValidationError {
  path: string;
  message: string;
}

function formatZodErrors(zodError: z.ZodError): ValidationError[] {
  return zodError.issues.map((issue) => ({
    path: issue.path.join('.'),
    message: issue.message,
  }));
}

function processBillingXml(xmlString: string): ParseResult<BillingExport> {
  const parsed = parseXmlToUnknown(xmlString);
  const result = BillingExportSchema.safeParse(parsed);

  if (!result.success) {
    return { success: false, errors: formatZodErrors(result.error) };
  }

  return { success: true, data: result.data };
}
```

---

## Why `.pipe()` Matters

```typescript
// Without pipe: trusts your transform function completely
const Risky = RawSchema.transform(transformFn);

// With pipe: validates output shape too
const Safe = RawSchema.transform(transformFn).pipe(DomainSchema);
```

`.pipe()` catches transform bugs at parse time, not when you use the data.

---

## When to Use

- Parsing XML from external systems
- Need validated, typed domain models
- Complex transformations (renaming, aggregations, computed fields)

## When NOT to Use

- Simple XML with no transformation needed
- JSON APIs (use Zod directly)
- Need streaming/SAX parsing (large files)
