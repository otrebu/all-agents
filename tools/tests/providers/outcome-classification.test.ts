import type {
  AgentResult,
  ProviderFailureReason,
  ProviderType,
} from "@tools/commands/ralph/providers/types";

import {
  createClaudeFailureOutcome,
  createClaudeNullOutcome,
} from "@tools/commands/ralph/providers/claude";
import { mapOpencodeInvocationError } from "@tools/commands/ralph/providers/opencode";
import {
  formatProviderFailureOutcome,
  invokeWithProviderOutcome,
  REGISTRY,
} from "@tools/commands/ralph/providers/registry";
import {
  afterAll,
  afterEach,
  beforeEach,
  describe,
  expect,
  mock,
  test,
} from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

interface OutcomeFixture {
  message: string;
  name: string;
  provider: ProviderType;
  reason: ProviderFailureReason;
  status: "fatal" | "retryable";
}

function loadOutcomeFixtures(): Array<OutcomeFixture> {
  const fixturePath = join(
    import.meta.dir,
    "../fixtures/providers/outcome-classification.json",
  );
  const raw = readFileSync(fixturePath, "utf8");
  return JSON.parse(raw) as Array<OutcomeFixture>;
}

describe("provider failure classifiers", () => {
  const fixtures = loadOutcomeFixtures();

  for (const fixture of fixtures) {
    test(`${fixture.provider} classifies ${fixture.name}`, () => {
      const outcome =
        fixture.provider === "claude"
          ? createClaudeFailureOutcome(new Error(fixture.message))
          : mapOpencodeInvocationError(new Error(fixture.message));

      expect(outcome.provider).toBe(fixture.provider);
      expect(outcome.reason).toBe(fixture.reason);
      expect(outcome.status).toBe(fixture.status);
      expect(outcome.message).toContain(fixture.message.split(" ")[0] ?? "");
    });
  }

  test("formats provider-neutral failure messages", () => {
    const outcome = mapOpencodeInvocationError(
      new Error("OpenCode exited with code 1: API key invalid"),
    );

    const formatted = formatProviderFailureOutcome(outcome);
    expect(formatted).toBe(
      "opencode fatal (auth): OpenCode exited with code 1: API key invalid",
    );
  });

  test("claude null outcome defaults to retryable transport", () => {
    const outcome = createClaudeNullOutcome("headless");

    expect(outcome.provider).toBe("claude");
    expect(outcome.reason).toBe("transport");
    expect(outcome.status).toBe("retryable");
  });
});

describe("invokeWithProviderOutcome", () => {
  const fixtures = loadOutcomeFixtures().filter(
    (fixture) => fixture.provider === "opencode",
  );

  const originalSpawn = Bun.spawn;
  const originalInvoke = REGISTRY.opencode.invoke;

  afterAll(() => {
    Bun.spawn = originalSpawn;
    REGISTRY.opencode.invoke = originalInvoke;
  });

  beforeEach(() => {
    Object.assign(Bun, {
      spawn: mock(() => ({
        exited: Promise.resolve(0),
        stderr: new ReadableStream({
          start(controller) {
            controller.close();
          },
        }),
        stdout: new ReadableStream({
          start(controller) {
            controller.close();
          },
        }),
      })),
    });
  });

  afterEach(() => {
    Bun.spawn = originalSpawn;
    REGISTRY.opencode.invoke = originalInvoke;
  });

  for (const fixture of fixtures) {
    test(`maps ${fixture.name} to normalized outcome`, async () => {
      REGISTRY.opencode.invoke = mock(async () => {
        await Promise.resolve();
        throw new Error(fixture.message);
      });

      const outcome = await invokeWithProviderOutcome("opencode", {
        mode: "headless",
        prompt: "test prompt",
      });

      expect(outcome.status).toBe(fixture.status);

      if (outcome.status === "success") {
        throw new Error("expected failure outcome");
      }

      expect(outcome.reason).toBe(fixture.reason);
      expect(outcome.provider).toBe("opencode");
    });
  }

  test("passes through successful provider results", async () => {
    const result: AgentResult = {
      costUsd: 0.25,
      durationMs: 500,
      result: "ok",
      sessionId: "ses_123",
    };

    REGISTRY.opencode.invoke = mock(async () => {
      await Promise.resolve();
      return result;
    });

    const outcome = await invokeWithProviderOutcome("opencode", {
      mode: "headless",
      prompt: "test prompt",
    });

    expect(outcome.status).toBe("success");

    if (outcome.status !== "success") {
      throw new Error("expected success outcome");
    }

    expect(outcome.result).toEqual(result);
  });
});
