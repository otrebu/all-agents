---
depends: []
---

# Testing

## Universal Testing Principles

- Update tests when behavior changes, don't force green
- Test names should tell a story
- Tests serve as documentation

## Parameterized vs Individual Tests

### Use Parameterized Tests When:

1. **Testing pure functions with clear input/output mapping**
   - Validation functions (email, phone, etc.)
   - Formatters/parsers
   - Math/calculation functions
2. **Edge cases follow the same pattern**
   - Same assertions, different data
   - Minimal or identical setup/teardown
3. **You want to document expected behavior as data**
   - Test cases serve as specification
   - Easy for non-technical stakeholders to review

Example:

```typescript
test.each([
  { input: "user@example.com", expected: true, case: "valid email" },
  { input: "no-at-sign", expected: false, case: "missing @" },
  { input: "@example.com", expected: false, case: "missing local" },
  { input: "user@", expected: false, case: "missing domain" },
])("email validation: $case", ({ input, expected }) => {
  expect(isValidEmail(input)).toBe(expected);
});
```

### Use Individual Tests When:

1. **Setup/teardown differs significantly per case**

   - Different mocks needed
   - Different database states
   - Different authentication contexts

2. **Assertions vary in complexity or type**
   - Some cases check structure, others check side effects
   - Error vs success paths need different validation
3. **Business scenarios are distinct**

   - Each test tells a different story
   - Test names are descriptive narratives

4. **Debugging needs clarity**
   - Complex async operations
   - Integration tests with multiple steps
   - When failure context matters more than data patterns

Example:

```typescript
test("should create user and send welcome email", async () => {
  vi.mocked(emailService.send).mockResolvedValue({ id: "msg-123" });

  const user = await createUser({ email: "new@example.com" });

  expect(user.id).toBeDefined();
  expect(emailService.send).toHaveBeenCalledWith({
    to: "new@example.com",
    template: "welcome",
  });
});

test("should rollback user creation if email fails", async () => {
  vi.mocked(emailService.send).mockRejectedValue(new Error("SMTP down"));

  await expect(createUser({ email: "new@example.com" })).rejects.toThrow(
    "SMTP down"
  );

  const users = await db.users.findAll();
  expect(users).toHaveLength(0); // rollback verified
});
```

### Decision Tree

```
Is this a pure function with clear input → output?
├─ YES → Are edge cases similar in structure?
│  ├─ YES → Use parameterized tests ✓
│  └─ NO  → Use individual tests
└─ NO  → Does each test need different setup/mocks?
   ├─ YES → Use individual tests ✓
   └─ NO  → Use parameterized tests ✓
```

### Hybrid Approach

Group related scenarios with parameterization, separate distinct scenarios:

```typescript
describe("UserService.updateProfile", () => {
  // Parameterize validation failures
  test.each([
    { field: "email", value: "invalid", error: "Invalid email" },
    { field: "age", value: -5, error: "Age must be positive" },
  ])("rejects invalid $field", async ({ field, value, error }) => {
    await expect(updateProfile({ [field]: value })).rejects.toThrow(error);
  });

  // Separate test for success path with side effects
  test("updates profile and invalidates cache", async () => {
    await updateProfile({ name: "New Name" });

    expect(cache.delete).toHaveBeenCalledWith("user:123");
    expect(auditLog.record).toHaveBeenCalledWith("PROFILE_UPDATED");
  });
});
```

### Key Principle

**Parameterize for data variance, individualize for behavioral variance.**
