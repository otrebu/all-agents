import { execa } from "execa";
import { beforeAll, describe, expect, it } from "vitest";

async function checkGitHubAuth(): Promise<boolean> {
  const hasEnvToken =
    (process.env.GITHUB_TOKEN !== undefined && process.env.GITHUB_TOKEN !== "") ||
    (process.env.GH_TOKEN !== undefined && process.env.GH_TOKEN !== "");

  if (hasEnvToken) return true;

  try {
    await execa`gh auth status`;
    return true;
  } catch {
    return false;
  }
}

function hasParallelApiKey(): boolean {
  return (
    (process.env.PARALLEL_API_KEY !== undefined && process.env.PARALLEL_API_KEY !== "") ||
    (process.env.AAA_PARALLEL_API_KEY !== undefined && process.env.AAA_PARALLEL_API_KEY !== "")
  );
}

describe("Error handling E2E", () => {
  describe("parallel-search errors", () => {
    // This test can only run when API key is NOT set
    // Skip with message when key is present
    beforeAll(() => {
      if (hasParallelApiKey()) {
        console.log(
          "\n⏭️  Skipping 'missing API key' test - PARALLEL_API_KEY is set.\n" +
          "   To run: unset PARALLEL_API_KEY\n"
        );
      }
    });

    it.skipIf(hasParallelApiKey())(
      "should fail gracefully without API key",
      async () => {
        const { exitCode, stdout } = await execa(
          "bun",
          ["run", "dev", "parallel-search", "--objective", "test query"],
          { reject: false }
        );

        expect(exitCode).toBe(1);
        expect(stdout).toContain("PARALLEL_API_KEY");
      }
    );
  });

  describe("gh-search errors", () => {
    beforeAll(async () => {
      const hasAuth = await checkGitHubAuth();
      if (!hasAuth) {
        throw new Error(
          "GitHub authentication required.\n\n" +
          "Run one of:\n" +
          "  gh auth login\n" +
          "  export GITHUB_TOKEN=your-token\n"
        );
      }
    });

    it("should handle no results gracefully", async () => {
      const { exitCode, stdout } = await execa(
        "bun",
        ["run", "dev", "gh-search", "xyzzy123nonexistent987gibberish"],
        { timeout: 60_000 }
      );

      expect(exitCode).toBe(0);
      expect(stdout).toContain("Try a different query");
    }, 60_000);

    it("should require query argument", async () => {
      const { exitCode, stderr } = await execa(
        "bun",
        ["run", "dev", "gh-search"],
        { reject: false }
      );

      expect(exitCode).toBe(1);
      expect(stderr).toContain("missing required argument");
    });
  });

  describe("CLI argument errors", () => {
    it("parallel-search: should require --objective", async () => {
      const { exitCode, stderr } = await execa(
        "bun",
        ["run", "dev", "parallel-search"],
        { reject: false }
      );

      expect(exitCode).toBe(1);
      expect(stderr).toContain("required option");
      expect(stderr).toContain("--objective");
    });
  });
});
