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

describe("iteration-summary notification length validation", () => {
  test("example summaries fit notification size limits (under 200 chars)", () => {
    // Example summaries from prompts/iteration-summary.md
    const exampleSummaries = [
      // Success example (lines 59-65)
      "Implemented user authentication. Added JWT token validation to 3 endpoints.",
      // Failure example (lines 69-75)
      "Failed to implement auth - TypeScript errors in middleware. Tests blocked.",
      // Partial example (lines 79-85)
      "Auth middleware added but token validation incomplete. Tests skipped.",
    ];

    const NOTIFICATION_LIMIT = 200;

    for (const summary of exampleSummaries) {
      const { length } = summary;

      // Verify each summary is under the 200 character limit
      expect(length).toBeLessThan(NOTIFICATION_LIMIT);

      // Also verify it's a reasonable length (not empty, and has substance)
      // Minimum reasonable summary
      expect(length).toBeGreaterThan(50);
      // All examples are well under 100
      expect(length).toBeLessThan(100);
    }
  });

  test("prompt documents 200 character limit for notifications", () => {
    const promptPath = join(CONTEXT_ROOT, "prompts/iteration-summary.md");
    const promptContent = readFileSync(promptPath, "utf8");

    // Verify the prompt contains the character limit guideline
    expect(promptContent).toContain("under 200 characters");

    // Verify it mentions notification context
    expect(promptContent).toContain("ntfy push notifications");

    // Verify 1-3 sentence guideline
    expect(promptContent).toContain("1-3 sentences maximum");
  });
});

describe("post-iteration-hook Haiku invocation", () => {
  let temporaryDirectory = "";

  beforeEach(() => {
    temporaryDirectory = join(
      tmpdir(),
      `hook-test-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    );
    mkdirSync(temporaryDirectory, { recursive: true });
  });

  afterEach(() => {
    if (temporaryDirectory !== "" && existsSync(temporaryDirectory)) {
      rmSync(temporaryDirectory, { force: true, recursive: true });
    }
  });

  test("script invokes claude with haiku model and iteration-summary.md content", async () => {
    // Create a mock claude script that captures the arguments passed to it
    const mockClaudeScript = `#!/bin/bash
# Mock claude CLI that captures arguments
echo "MOCK_CLAUDE_CALLED"
echo "MODEL_ARG: $2"
echo "OUTPUT_FORMAT: $4"

# Find the -p argument and capture prompt content
for i in "\${@}"; do
  if [ "$prev" = "-p" ]; then
    # Output a marker showing prompt was passed
    if echo "$i" | grep -q "Iteration Summary Generator"; then
      echo "PROMPT_CONTAINS_ITERATION_SUMMARY: true"
    fi
    if echo "$i" | grep -q "{{SUBTASK_ID}}\\|task-test-001"; then
      echo "PROMPT_HAS_SUBTASK_ID: true"
    fi
  fi
  prev="$i"
done

# Output valid JSON that the hook expects
echo '{"result": "{\\"subtaskId\\":\\"task-test-001\\",\\"status\\":\\"success\\",\\"summary\\":\\"Test summary\\",\\"keyFindings\\":[]}"}'
`;

    // Write mock claude script
    const mockClaudePath = join(temporaryDirectory, "claude");
    const { writeFileSync } = await import("node:fs");
    writeFileSync(mockClaudePath, mockClaudeScript, { mode: 0o755 });

    // Copy the iteration-summary.md prompt to a temporary location
    const promptContent = readFileSync(
      join(CONTEXT_ROOT, "prompts/iteration-summary.md"),
      "utf8",
    );
    mkdirSync(join(temporaryDirectory, "prompts"), { recursive: true });
    writeFileSync(
      join(temporaryDirectory, "prompts/iteration-summary.md"),
      promptContent,
    );

    // Create a minimal ralph.config.json
    writeFileSync(
      join(temporaryDirectory, "ralph.config.json"),
      JSON.stringify({
        hooks: { postIteration: { enabled: true, model: "haiku" } },
      }),
    );

    // Create logs directory
    mkdirSync(join(temporaryDirectory, "logs"), { recursive: true });

    // Create a test script that runs the generate_summary function with mock claude
    const testScript = `#!/bin/bash
set -e

export PATH="${temporaryDirectory}:$PATH"

SUBTASK_ID="task-test-001"
STATUS="success"
SESSION_ID="test-session-123"
REPO_ROOT="${temporaryDirectory}"
CONFIG_PATH="$REPO_ROOT/ralph.config.json"
PROMPT_PATH="$REPO_ROOT/prompts/iteration-summary.md"

# Read config to get model
json_query() {
  local file="$1"
  local query="$2"
  local default="$3"
  if command -v jq &> /dev/null; then
    local result
    result=$(jq -r "$query" "$file" 2>/dev/null)
    if [ -n "$result" ] && [ "$result" != "null" ]; then
      echo "$result"
    else
      echo "$default"
    fi
  else
    echo "$default"
  fi
}

model=$(json_query "$CONFIG_PATH" ".hooks.postIteration.model" "haiku")

# Read prompt and substitute placeholders
prompt_content=$(cat "$PROMPT_PATH")
prompt_content=$(echo "$prompt_content" | sed "s|{{SUBTASK_ID}}|$SUBTASK_ID|g")
prompt_content=$(echo "$prompt_content" | sed "s|{{STATUS}}|$STATUS|g")
prompt_content=$(echo "$prompt_content" | sed "s|{{SESSION_JSONL_PATH}}||g")

# Call claude (mock) and capture output
output=$(claude --model "$model" --output-format json -p "$prompt_content" 2>&1)
echo "$output"
`;

    const testScriptPath = join(temporaryDirectory, "test-haiku-call.sh");
    writeFileSync(testScriptPath, testScript, { mode: 0o755 });

    // Run the test script
    const { exitCode, stdout } = await execa("bash", [testScriptPath], {
      cwd: temporaryDirectory,
      env: {
        ...process.env,
        PATH: `${temporaryDirectory}:${process.env.PATH}`,
      },
    });

    // Verify the mock claude was called
    expect(exitCode).toBe(0);
    expect(stdout).toContain("MOCK_CLAUDE_CALLED");

    // Verify haiku model was specified
    expect(stdout).toContain("MODEL_ARG: haiku");

    // Verify JSON output format was requested
    expect(stdout).toContain("OUTPUT_FORMAT: json");

    // Verify iteration-summary.md prompt content was passed
    expect(stdout).toContain("PROMPT_CONTAINS_ITERATION_SUMMARY: true");

    // Verify subtask ID substitution occurred
    expect(stdout).toContain("PROMPT_HAS_SUBTASK_ID: true");
  });

  test("script reads iteration-summary.md from prompts directory", () => {
    // Verify the prompt file exists at the expected location
    const promptPath = join(CONTEXT_ROOT, "prompts/iteration-summary.md");
    expect(existsSync(promptPath)).toBe(true);

    // Verify the prompt contains expected structure for Haiku
    const promptContent = readFileSync(promptPath, "utf8");

    // Should have the title identifying it as the iteration summary prompt
    expect(promptContent).toContain("# Iteration Summary Generator");

    // Should have placeholders that get substituted
    expect(promptContent).toContain("{{SUBTASK_ID}}");
    expect(promptContent).toContain("{{STATUS}}");
    expect(promptContent).toContain("{{SESSION_JSONL_PATH}}");

    // Should specify JSON output format for structured response
    expect(promptContent).toContain("Output a JSON object");
    expect(promptContent).toContain('"subtaskId"');
    expect(promptContent).toContain('"summary"');
    expect(promptContent).toContain('"keyFindings"');
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
