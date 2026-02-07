import { validateApprovalFlags } from "@tools/commands/ralph/index";
import { describe, expect, spyOn, test } from "bun:test";

describe("validateApprovalFlags", () => {
  test("returns void when neither flag is set", () => {
    expect(() => {
      validateApprovalFlags(false, false);
    }).not.toThrow();
  });

  test("returns void when only one flag is set", () => {
    expect(() => {
      validateApprovalFlags(true, false);
    }).not.toThrow();
    expect(() => {
      validateApprovalFlags(false, true);
    }).not.toThrow();
  });

  test("prints error and exits when both flags are true", () => {
    const errorSpy = spyOn(console, "error").mockImplementation(() => {});
    const exitSpy = spyOn(process, "exit").mockImplementation((code) => {
      throw new Error(`process.exit:${code}`);
    });

    try {
      expect(() => {
        validateApprovalFlags(true, true);
      }).toThrow("process.exit:1");
      expect(errorSpy).toHaveBeenCalledWith(
        "Cannot use --force and --review together",
      );
      expect(exitSpy).toHaveBeenCalledWith(1);
    } finally {
      errorSpy.mockRestore();
      exitSpy.mockRestore();
    }
  });
});
