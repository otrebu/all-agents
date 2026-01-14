import { getContextRoot } from "@tools/utils/paths";
import addFormats from "ajv-formats";
import Ajv2020 from "ajv/dist/2020";
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { execa } from "execa";
import { existsSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const TOOLS_DIR = join(getContextRoot(), "tools");
const CONTEXT_ROOT = getContextRoot();

describe("ralph E2E", () => {
  let temporaryDirectory = "";

  beforeEach(() => {
    temporaryDirectory = join(
      tmpdir(),
      `ralph-test-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    );
    mkdirSync(temporaryDirectory, { recursive: true });
  });

  afterEach(() => {
    if (temporaryDirectory !== "" && existsSync(temporaryDirectory)) {
      rmSync(temporaryDirectory, { force: true, recursive: true });
    }
  });

  // Help and basic CLI
  test("ralph --help shows usage", async () => {
    const { exitCode, stdout } = await execa(
      "bun",
      ["run", "dev", "ralph", "--help"],
      { cwd: TOOLS_DIR },
    );
    expect(exitCode).toBe(0);
    expect(stdout).toContain("PRD-driven iterative Claude harness");
  });

  test("ralph init --help shows options", async () => {
    const { exitCode, stdout } = await execa(
      "bun",
      ["run", "dev", "ralph", "init", "--help"],
      { cwd: TOOLS_DIR },
    );
    expect(exitCode).toBe(0);
    expect(stdout).toContain("--output");
    expect(stdout).toContain("Create a template PRD file");
  });

  test("ralph run --help shows all options", async () => {
    const { exitCode, stdout } = await execa(
      "bun",
      ["run", "dev", "ralph", "run", "--help"],
      { cwd: TOOLS_DIR },
    );
    expect(exitCode).toBe(0);
    expect(stdout).toContain("--prd");
    expect(stdout).toContain("--progress");
    expect(stdout).toContain("--unlimited");
    expect(stdout).toContain("--interactive");
    expect(stdout).toContain("--dangerous");
  });

  test("ralph run with missing PRD shows error", async () => {
    const prdPath = join(temporaryDirectory, "nonexistent.json");

    const { exitCode, stderr } = await execa(
      "bun",
      ["run", "dev", "ralph", "run", "--prd", prdPath],
      { cwd: TOOLS_DIR, reject: false },
    );

    expect(exitCode).toBe(1);
    expect(stderr).toContain("PRD not found");
  });

  test("ralph init creates template PRD", async () => {
    const prdPath = join(temporaryDirectory, "prd.json");

    const { exitCode, stdout } = await execa(
      "bun",
      ["run", "dev", "ralph", "init", "--output", prdPath],
      { cwd: TOOLS_DIR },
    );

    expect(exitCode).toBe(0);
    expect(stdout).toContain("Created");
    expect(existsSync(prdPath)).toBe(true);

    const rawContent = readFileSync(prdPath, "utf8");
    const content = JSON.parse(rawContent) as {
      features: Array<unknown>;
      name: string;
      testCommand: string;
    };
    expect(content.name).toBe("My Project");
    expect(content.testCommand).toBe("bun test");
    expect(content.features).toHaveLength(1);
  });

  test("ralph init refuses to overwrite existing PRD", async () => {
    const prdPath = join(temporaryDirectory, "prd.json");

    // Create first
    await execa("bun", ["run", "dev", "ralph", "init", "--output", prdPath], {
      cwd: TOOLS_DIR,
    });

    // Try to create again
    const { exitCode, stderr } = await execa(
      "bun",
      ["run", "dev", "ralph", "init", "--output", prdPath],
      { cwd: TOOLS_DIR, reject: false },
    );

    expect(exitCode).toBe(1);
    expect(stderr).toContain("already exists");
  });
});

describe("iteration-summary prompt placeholder substitution", () => {
  let temporaryDirectory = "";

  beforeEach(() => {
    temporaryDirectory = join(
      tmpdir(),
      `placeholder-test-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    );
    mkdirSync(temporaryDirectory, { recursive: true });
  });

  afterEach(() => {
    if (temporaryDirectory !== "" && existsSync(temporaryDirectory)) {
      rmSync(temporaryDirectory, { force: true, recursive: true });
    }
  });

  test("placeholder substitution works in bash context", async () => {
    // Read the iteration-summary.md prompt template
    const promptPath = join(CONTEXT_ROOT, "prompts/iteration-summary.md");

    // Define test values for substitution (simple values without special sed characters)
    const testValues = {
      ITERATION_NUM: "2",
      MILESTONE: "test-milestone",
      SESSION_JSONL_PATH: "tmp-test-session.jsonl",
      STATUS: "success",
      SUBTASK_ID: "task-test-001",
      SUBTASK_TITLE: "Test Subtask Title",
      TASK_REF: "docs-planning-tasks-test.md",
    };

    // Create a bash script that performs the placeholder substitution using sed with | delimiter
    const scriptContent = `#!/bin/bash
set -e

# Read the prompt template
PROMPT_TEMPLATE=$(cat "${promptPath}")

# Substitute placeholders using sed with | delimiter
SUBSTITUTED_PROMPT="$PROMPT_TEMPLATE"
SUBSTITUTED_PROMPT=$(echo "$SUBSTITUTED_PROMPT" | sed "s|{{SUBTASK_ID}}|${testValues.SUBTASK_ID}|g")
SUBSTITUTED_PROMPT=$(echo "$SUBSTITUTED_PROMPT" | sed "s|{{STATUS}}|${testValues.STATUS}|g")
SUBSTITUTED_PROMPT=$(echo "$SUBSTITUTED_PROMPT" | sed "s|{{SESSION_JSONL_PATH}}|${testValues.SESSION_JSONL_PATH}|g")
SUBSTITUTED_PROMPT=$(echo "$SUBSTITUTED_PROMPT" | sed "s|{{SUBTASK_TITLE}}|${testValues.SUBTASK_TITLE}|g")
SUBSTITUTED_PROMPT=$(echo "$SUBSTITUTED_PROMPT" | sed "s|{{MILESTONE}}|${testValues.MILESTONE}|g")
SUBSTITUTED_PROMPT=$(echo "$SUBSTITUTED_PROMPT" | sed "s|{{TASK_REF}}|${testValues.TASK_REF}|g")
SUBSTITUTED_PROMPT=$(echo "$SUBSTITUTED_PROMPT" | sed "s|{{ITERATION_NUM}}|${testValues.ITERATION_NUM}|g")

# Output the substituted prompt
echo "$SUBSTITUTED_PROMPT"
`;

    // Write the test script
    const scriptPath = join(temporaryDirectory, "substitute.sh");
    const { writeFileSync } = await import("node:fs");
    writeFileSync(scriptPath, scriptContent, { mode: 0o755 });

    // Run the script
    const { exitCode, stdout } = await execa("bash", [scriptPath], {
      cwd: temporaryDirectory,
    });

    // Verify the script ran successfully
    expect(exitCode).toBe(0);

    // Verify all placeholders were replaced correctly
    for (const [key, value] of Object.entries(testValues)) {
      // Verify the substituted value appears in the output
      expect(stdout).toContain(value);
      // Verify no unsubstituted placeholders remain (for required fields)
      if (["SESSION_JSONL_PATH", "STATUS", "SUBTASK_ID"].includes(key)) {
        // These appear multiple times in the template, verify substitution happened
        expect(stdout).not.toContain(`\`{{${key}}}\``);
      }
    }

    // Verify specific substitution in the JSON output format section
    expect(stdout).toContain(`"subtaskId": "${testValues.SUBTASK_ID}"`);
  });

  test("placeholder substitution handles paths with slashes", async () => {
    const promptPath = join(CONTEXT_ROOT, "prompts/iteration-summary.md");

    // Test values with paths containing slashes - use # delimiter in sed
    const testValues = {
      SESSION_JSONL_PATH: "/home/user/.claude/projects/test-path/session.jsonl",
      STATUS: "success",
      SUBTASK_ID: "task-015-04",
    };

    // Create a bash script using sed with # as delimiter to handle slashes in paths
    const scriptContent = `#!/bin/bash
set -e

# Read the prompt template
PROMPT_TEMPLATE=$(cat "${promptPath}")

# Substitute placeholders using sed with # delimiter (handles / in paths)
SUBSTITUTED_PROMPT="$PROMPT_TEMPLATE"
SUBSTITUTED_PROMPT=$(echo "$SUBSTITUTED_PROMPT" | sed "s#{{SUBTASK_ID}}#${testValues.SUBTASK_ID}#g")
SUBSTITUTED_PROMPT=$(echo "$SUBSTITUTED_PROMPT" | sed "s#{{STATUS}}#${testValues.STATUS}#g")
SUBSTITUTED_PROMPT=$(echo "$SUBSTITUTED_PROMPT" | sed "s#{{SESSION_JSONL_PATH}}#${testValues.SESSION_JSONL_PATH}#g")

echo "$SUBSTITUTED_PROMPT"
`;

    const scriptPath = join(temporaryDirectory, "substitute-paths.sh");
    const { writeFileSync: writeFile } = await import("node:fs");
    writeFile(scriptPath, scriptContent, { mode: 0o755 });

    const { exitCode, stdout } = await execa("bash", [scriptPath], {
      cwd: temporaryDirectory,
    });

    expect(exitCode).toBe(0);
    expect(stdout).toContain(testValues.SUBTASK_ID);
    expect(stdout).toContain(testValues.SESSION_JSONL_PATH);
    expect(stdout).toContain(`"subtaskId": "${testValues.SUBTASK_ID}"`);
  });
});

describe("subtasks schema validation", () => {
  test("generated subtasks.json validates against schema", () => {
    // Load the schema
    const schemaPath = join(
      CONTEXT_ROOT,
      "docs/planning/schemas/subtasks.schema.json",
    );
    const schemaContent = readFileSync(schemaPath, "utf8");
    const schema = JSON.parse(schemaContent) as object;

    // Load the test output generated by subtasks-auto.md prompt
    const testOutputPath = join(
      CONTEXT_ROOT,
      "docs/planning/milestones/ralph/test-fixtures/subtasks-auto-test-output.json",
    );
    const testOutputContent = readFileSync(testOutputPath, "utf8");
    const testOutput = JSON.parse(testOutputContent) as object;

    // Set up AJV validator with formats (for date-time, etc.)
    const ajv = new Ajv2020({ allErrors: true, strict: false });
    addFormats(ajv);

    // Compile and validate
    const validate = ajv.compile(schema);
    const isValid = validate(testOutput);

    // Log errors if validation fails
    if (!isValid) {
      console.error(
        "Validation errors:",
        JSON.stringify(validate.errors, null, 2),
      );
    }

    expect(isValid).toBe(true);
  });

  test("all test fixture subtasks.json files validate against schema", () => {
    const schemaPath = join(
      CONTEXT_ROOT,
      "docs/planning/schemas/subtasks.schema.json",
    );
    const schemaContent = readFileSync(schemaPath, "utf8");
    const schema = JSON.parse(schemaContent) as object;

    const ajv = new Ajv2020({ allErrors: true, strict: false });
    addFormats(ajv);
    const validate = ajv.compile(schema);

    // Test fixture files that should validate against the schema
    // Note: some legacy fixtures use array format for older tests
    const fixtureFiles = ["subtasks-auto-test-output.json"];

    const existingFixtures = fixtureFiles.filter((fixture) =>
      existsSync(
        join(
          CONTEXT_ROOT,
          "docs/planning/milestones/ralph/test-fixtures",
          fixture,
        ),
      ),
    );

    for (const fixture of existingFixtures) {
      const fixturePath = join(
        CONTEXT_ROOT,
        "docs/planning/milestones/ralph/test-fixtures",
        fixture,
      );

      const fixtureContent = readFileSync(fixturePath, "utf8");
      const fixtureData = JSON.parse(fixtureContent) as object;
      const isValid = validate(fixtureData);

      if (!isValid) {
        console.error(
          `Validation errors for ${fixture}:`,
          JSON.stringify(validate.errors, null, 2),
        );
      }

      expect(isValid).toBe(true);
    }
  });
});
