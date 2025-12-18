---
depends: ["@context/blocks/test/testing.md"]
---

## Unit Testing Patterns

@context/blocks/test/testing.md

### Parameterized Tests

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

### Individual Tests

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

### Hybrid Approach

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
