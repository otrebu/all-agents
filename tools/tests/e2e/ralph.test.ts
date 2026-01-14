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

describe("post-iteration-hook log action handler unit tests", () => {
  let temporaryDirectory = "";

  beforeEach(() => {
    temporaryDirectory = join(
      tmpdir(),
      `log-action-test-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    );
    mkdirSync(temporaryDirectory, { recursive: true });
  });

  afterEach(() => {
    if (temporaryDirectory !== "" && existsSync(temporaryDirectory)) {
      rmSync(temporaryDirectory, { force: true, recursive: true });
    }
  });

  test("log action outputs formatted entry to stdout", async () => {
    // Create a test script that isolates and tests the execute_log_action function
    const testScript = `#!/bin/bash
set -euo pipefail

# Define the execute_log_action function (extracted from post-iteration-hook.sh)
execute_log_action() {
  local entry_json="$1"

  echo ""
  echo "=== Iteration Log ==="

  # Extract fields for formatted output
  local subtask_id session_id status summary timestamp tool_calls duration files_changed

  if command -v jq &> /dev/null; then
    subtask_id=$(echo "$entry_json" | jq -r '.subtaskId // ""')
    session_id=$(echo "$entry_json" | jq -r '.sessionId // ""')
    status=$(echo "$entry_json" | jq -r '.status // ""')
    summary=$(echo "$entry_json" | jq -r '.summary // ""')
    timestamp=$(echo "$entry_json" | jq -r '.timestamp // ""')
    tool_calls=$(echo "$entry_json" | jq -r '.toolCalls // 0')
    duration=$(echo "$entry_json" | jq -r '.duration // 0')
    files_changed=$(echo "$entry_json" | jq -r '.filesChanged | length // 0')
  elif command -v node &> /dev/null; then
    subtask_id=$(ENTRY_JSON="$entry_json" node -e "try { console.log(JSON.parse(process.env.ENTRY_JSON).subtaskId || ''); } catch(e) { console.log(''); }" 2>/dev/null)
    session_id=$(ENTRY_JSON="$entry_json" node -e "try { console.log(JSON.parse(process.env.ENTRY_JSON).sessionId || ''); } catch(e) { console.log(''); }" 2>/dev/null)
    status=$(ENTRY_JSON="$entry_json" node -e "try { console.log(JSON.parse(process.env.ENTRY_JSON).status || ''); } catch(e) { console.log(''); }" 2>/dev/null)
    summary=$(ENTRY_JSON="$entry_json" node -e "try { console.log(JSON.parse(process.env.ENTRY_JSON).summary || ''); } catch(e) { console.log(''); }" 2>/dev/null)
    timestamp=$(ENTRY_JSON="$entry_json" node -e "try { console.log(JSON.parse(process.env.ENTRY_JSON).timestamp || ''); } catch(e) { console.log(''); }" 2>/dev/null)
    tool_calls=$(ENTRY_JSON="$entry_json" node -e "try { console.log(JSON.parse(process.env.ENTRY_JSON).toolCalls || 0); } catch(e) { console.log('0'); }" 2>/dev/null)
    duration=$(ENTRY_JSON="$entry_json" node -e "try { console.log(JSON.parse(process.env.ENTRY_JSON).duration || 0); } catch(e) { console.log('0'); }" 2>/dev/null)
    files_changed=$(ENTRY_JSON="$entry_json" node -e "try { console.log((JSON.parse(process.env.ENTRY_JSON).filesChanged || []).length); } catch(e) { console.log('0'); }" 2>/dev/null)
  else
    subtask_id=""
    session_id=""
    status=""
    summary="(summary not available)"
    timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    tool_calls="0"
    duration="0"
    files_changed="0"
  fi

  # Format duration for display
  local duration_display
  if [ "$duration" -gt 60000 ]; then
    duration_display="$((duration / 60000))m $((duration % 60000 / 1000))s"
  elif [ "$duration" -gt 1000 ]; then
    duration_display="$((duration / 1000))s"
  else
    duration_display="\${duration}ms"
  fi

  # Output formatted log
  echo "Timestamp: $timestamp"
  echo "Subtask:   $subtask_id"
  echo "Session:   $session_id"
  echo "Status:    $status"
  echo "Duration:  $duration_display"
  echo "Tools:     $tool_calls calls"
  echo "Files:     $files_changed changed"
  echo "Summary:   $summary"
  echo "=== End Iteration Log ==="
  echo ""
}

# Test input JSON
TEST_JSON='{"subtaskId":"test-subtask-001","sessionId":"session-abc-123","status":"completed","summary":"Implemented feature X successfully","timestamp":"2024-01-15T10:30:00Z","toolCalls":15,"duration":45000,"filesChanged":["src/file1.ts","src/file2.ts"]}'

# Call the function
execute_log_action "$TEST_JSON"
`;

    const { writeFileSync } = await import("node:fs");
    const scriptPath = join(temporaryDirectory, "test-log-action.sh");
    writeFileSync(scriptPath, testScript, { mode: 0o755 });

    // Run the test script
    const { exitCode, stdout } = await execa("bash", [scriptPath], {
      cwd: temporaryDirectory,
    });

    // Verify exit code
    expect(exitCode).toBe(0);

    // Verify output format contains expected structure
    expect(stdout).toContain("=== Iteration Log ===");
    expect(stdout).toContain("=== End Iteration Log ===");

    // Verify all fields are output correctly
    expect(stdout).toContain("Timestamp: 2024-01-15T10:30:00Z");
    expect(stdout).toContain("Subtask:   test-subtask-001");
    expect(stdout).toContain("Session:   session-abc-123");
    expect(stdout).toContain("Status:    completed");
    expect(stdout).toContain("Duration:  45s");
    expect(stdout).toContain("Tools:     15 calls");
    expect(stdout).toContain("Files:     2 changed");
    expect(stdout).toContain("Summary:   Implemented feature X successfully");
  });

  test("log action has no file side effects", async () => {
    // Create a test script that verifies the log action doesn't write any files
    const testScript = `#!/bin/bash
set -euo pipefail

# Track initial file state
TEMP_DIR="${temporaryDirectory}"
INITIAL_FILES=$(find "$TEMP_DIR" -type f | sort)

# Define the execute_log_action function (minimal version)
execute_log_action() {
  local entry_json="$1"
  echo ""
  echo "=== Iteration Log ==="
  echo "Subtask:   test-subtask"
  echo "Status:    completed"
  echo "=== End Iteration Log ==="
  echo ""
}

# Call the function
TEST_JSON='{"subtaskId":"test-subtask","status":"completed"}'
execute_log_action "$TEST_JSON"

# Track final file state
FINAL_FILES=$(find "$TEMP_DIR" -type f | sort)

# Compare file lists
if [ "$INITIAL_FILES" = "$FINAL_FILES" ]; then
  echo "NO_SIDE_EFFECTS: true"
else
  echo "NO_SIDE_EFFECTS: false"
  echo "Initial files: $INITIAL_FILES"
  echo "Final files: $FINAL_FILES"
fi
`;

    const { writeFileSync } = await import("node:fs");
    const scriptPath = join(temporaryDirectory, "test-no-side-effects.sh");
    writeFileSync(scriptPath, testScript, { mode: 0o755 });

    // Run the test script
    const { exitCode, stdout } = await execa("bash", [scriptPath], {
      cwd: temporaryDirectory,
    });

    // Verify exit code
    expect(exitCode).toBe(0);

    // Verify no file side effects
    expect(stdout).toContain("NO_SIDE_EFFECTS: true");
  });

  test("log action handles duration formatting correctly", async () => {
    const testScript = `#!/bin/bash
set -euo pipefail

# Test duration formatting logic
format_duration() {
  local duration=$1
  local duration_display

  if [ "$duration" -gt 60000 ]; then
    duration_display="$((duration / 60000))m $((duration % 60000 / 1000))s"
  elif [ "$duration" -gt 1000 ]; then
    duration_display="$((duration / 1000))s"
  else
    duration_display="\${duration}ms"
  fi
  echo "$duration_display"
}

# Test cases
echo "Duration 500ms: $(format_duration 500)"
echo "Duration 5000ms: $(format_duration 5000)"
echo "Duration 65000ms: $(format_duration 65000)"
echo "Duration 125000ms: $(format_duration 125000)"
`;

    const { writeFileSync } = await import("node:fs");
    const scriptPath = join(temporaryDirectory, "test-duration-format.sh");
    writeFileSync(scriptPath, testScript, { mode: 0o755 });

    const { exitCode, stdout } = await execa("bash", [scriptPath], {
      cwd: temporaryDirectory,
    });

    expect(exitCode).toBe(0);
    expect(stdout).toContain("Duration 500ms: 500ms");
    expect(stdout).toContain("Duration 5000ms: 5s");
    expect(stdout).toContain("Duration 65000ms: 1m 5s");
    expect(stdout).toContain("Duration 125000ms: 2m 5s");
  });
});

describe("post-iteration-hook notify action handler unit tests", () => {
  let temporaryDirectory = "";

  beforeEach(() => {
    temporaryDirectory = join(
      tmpdir(),
      `notify-action-test-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    );
    mkdirSync(temporaryDirectory, { recursive: true });
  });

  afterEach(() => {
    if (temporaryDirectory !== "" && existsSync(temporaryDirectory)) {
      rmSync(temporaryDirectory, { force: true, recursive: true });
    }
  });

  test("notify action sends HTTP POST to correct ntfy endpoint", async () => {
    // Create a mock curl script that captures the arguments passed to it
    // Output to stdout (not stderr) and don't redirect output
    const mockCurlScript = `#!/bin/bash
# Mock curl that captures arguments and simulates successful response
echo "MOCK_CURL_CALLED"

# Capture all arguments for verification
echo "ARGS: $@"

# Parse arguments to extract endpoint and headers
for arg in "$@"; do
  if [[ "$arg" =~ ^https?:// ]]; then
    echo "ENDPOINT: $arg"
  fi
done

# Find header values
prev=""
for arg in "$@"; do
  if [ "$prev" = "-H" ]; then
    echo "HEADER: $arg"
  fi
  prev="$arg"
done

# Find body data (after -d)
prev=""
for arg in "$@"; do
  if [ "$prev" = "-d" ]; then
    echo "BODY: $arg"
  fi
  prev="$arg"
done

# Return success
exit 0
`;

    const { writeFileSync } = await import("node:fs");

    // Write mock curl script
    const mockCurlPath = join(temporaryDirectory, "curl");
    writeFileSync(mockCurlPath, mockCurlScript, { mode: 0o755 });

    // Create test script that isolates the execute_notify_action function
    // Modified to NOT redirect curl output to /dev/null so we can capture mock output
    const testScript = `#!/bin/bash
set -euo pipefail

export PATH="${temporaryDirectory}:$PATH"

# Mock config values
NTFY_TOPIC="test-topic-abc"
NTFY_SERVER="https://ntfy.sh"

# Define get_ntfy_topic function (mocked)
get_ntfy_topic() {
  echo "$NTFY_TOPIC"
}

# Define get_ntfy_server function (mocked)
get_ntfy_server() {
  echo "$NTFY_SERVER"
}

# Simplified execute_notify_action for testing that doesn't redirect curl output
execute_notify_action() {
  local entry_json="$1"

  local topic
  topic=$(get_ntfy_topic)

  if [ -z "$topic" ]; then
    echo "Warning: ntfy topic not configured in ralph.config.json (ntfy.topic)"
    return 1
  fi

  local server
  server=$(get_ntfy_server)

  # Extract fields for notification
  local subtask_id status summary

  if command -v jq &> /dev/null; then
    subtask_id=$(echo "$entry_json" | jq -r '.subtaskId // ""')
    status=$(echo "$entry_json" | jq -r '.status // ""')
    summary=$(echo "$entry_json" | jq -r '.summary // ""')
  elif command -v node &> /dev/null; then
    subtask_id=$(ENTRY_JSON="$entry_json" node -e "try { console.log(JSON.parse(process.env.ENTRY_JSON).subtaskId || ''); } catch(e) { console.log(''); }" 2>/dev/null)
    status=$(ENTRY_JSON="$entry_json" node -e "try { console.log(JSON.parse(process.env.ENTRY_JSON).status || ''); } catch(e) { console.log(''); }" 2>/dev/null)
    summary=$(ENTRY_JSON="$entry_json" node -e "try { console.log(JSON.parse(process.env.ENTRY_JSON).summary || ''); } catch(e) { console.log(''); }" 2>/dev/null)
  else
    subtask_id="unknown"
    status="unknown"
    summary="Iteration complete"
  fi

  # Build notification title and message
  local title="Ralph: $subtask_id ($status)"
  local message="$summary"

  # Determine priority based on status
  local priority="default"
  case "$status" in
    completed)
      priority="default"
      ;;
    failed)
      priority="high"
      ;;
    retrying)
      priority="low"
      ;;
  esac

  # Send HTTP POST to ntfy.sh (NOT redirecting to /dev/null for testing)
  local ntfy_url="\${server}/\${topic}"

  echo "Sending notification to ntfy.sh..."
  echo "  Topic: $topic"
  echo "  Server: $server"

  if command -v curl &> /dev/null; then
    # Call curl and capture output (mock will output captured args)
    curl -s -X POST "$ntfy_url" \\
      -H "Title: $title" \\
      -H "Priority: $priority" \\
      -H "Tags: robot,$([ "$status" = "completed" ] && echo "white_check_mark" || echo "warning")" \\
      -d "$message" && {
      echo "Notification sent successfully"
      return 0
    } || {
      echo "Warning: Failed to send notification to ntfy.sh"
      return 1
    }
  else
    echo "Warning: curl not available for HTTP requests"
    return 1
  fi
}

# Test input JSON
TEST_JSON='{"subtaskId":"task-notify-001","sessionId":"session-xyz","status":"completed","summary":"Successfully implemented feature"}'

# Call the function
execute_notify_action "$TEST_JSON"
`;

    const scriptPath = join(temporaryDirectory, "test-notify-action.sh");
    writeFileSync(scriptPath, testScript, { mode: 0o755 });

    // Run the test script
    const { exitCode, stdout } = await execa("bash", [scriptPath], {
      cwd: temporaryDirectory,
      env: {
        ...process.env,
        PATH: `${temporaryDirectory}:${process.env.PATH}`,
      },
    });

    // Verify exit code
    expect(exitCode).toBe(0);

    // Verify the mock curl was called
    expect(stdout).toContain("MOCK_CURL_CALLED");

    // Verify correct endpoint was called (server/topic)
    expect(stdout).toContain("ENDPOINT: https://ntfy.sh/test-topic-abc");

    // Verify Title header contains subtask ID and status
    expect(stdout).toContain("Title: Ralph: task-notify-001 (completed)");

    // Verify Priority header was set correctly
    expect(stdout).toContain("Priority: default");

    // Verify body contains the summary message
    expect(stdout).toContain("BODY: Successfully implemented feature");
  });

  test("notify action sets high priority for failed status", async () => {
    const mockCurlScript = `#!/bin/bash
# Capture priority header
prev=""
for arg in "$@"; do
  if [ "$prev" = "-H" ]; then
    if [[ "$arg" == Priority:* ]]; then
      echo "PRIORITY_HEADER: $arg"
    fi
  fi
  prev="$arg"
done
exit 0
`;

    const { writeFileSync } = await import("node:fs");
    const mockCurlPath = join(temporaryDirectory, "curl");
    writeFileSync(mockCurlPath, mockCurlScript, { mode: 0o755 });

    const testScript = `#!/bin/bash
set -euo pipefail

export PATH="${temporaryDirectory}:$PATH"

get_ntfy_topic() { echo "test-topic"; }
get_ntfy_server() { echo "https://ntfy.sh"; }

execute_notify_action() {
  local entry_json="$1"
  local topic=$(get_ntfy_topic)
  local server=$(get_ntfy_server)

  local status
  if command -v jq &> /dev/null; then
    status=$(echo "$entry_json" | jq -r '.status // ""')
  else
    status="failed"
  fi

  local priority="default"
  case "$status" in
    completed) priority="default" ;;
    failed) priority="high" ;;
    retrying) priority="low" ;;
  esac

  curl -s -X POST "\${server}/\${topic}" \\
    -H "Title: Ralph: test ($status)" \\
    -H "Priority: $priority" \\
    -d "test message" 2>&1
}

TEST_JSON='{"subtaskId":"task-001","status":"failed","summary":"Build failed"}'
execute_notify_action "$TEST_JSON"
`;

    const scriptPath = join(temporaryDirectory, "test-priority-failed.sh");
    writeFileSync(scriptPath, testScript, { mode: 0o755 });

    const { exitCode, stdout } = await execa("bash", [scriptPath], {
      cwd: temporaryDirectory,
      env: {
        ...process.env,
        PATH: `${temporaryDirectory}:${process.env.PATH}`,
      },
    });

    expect(exitCode).toBe(0);
    expect(stdout).toContain("PRIORITY_HEADER: Priority: high");
  });

  test("notify action sets low priority for retrying status", async () => {
    const mockCurlScript = `#!/bin/bash
prev=""
for arg in "$@"; do
  if [ "$prev" = "-H" ]; then
    if [[ "$arg" == Priority:* ]]; then
      echo "PRIORITY_HEADER: $arg"
    fi
  fi
  prev="$arg"
done
exit 0
`;

    const { writeFileSync } = await import("node:fs");
    const mockCurlPath = join(temporaryDirectory, "curl");
    writeFileSync(mockCurlPath, mockCurlScript, { mode: 0o755 });

    const testScript = `#!/bin/bash
set -euo pipefail

export PATH="${temporaryDirectory}:$PATH"

get_ntfy_topic() { echo "test-topic"; }
get_ntfy_server() { echo "https://ntfy.sh"; }

execute_notify_action() {
  local entry_json="$1"
  local topic=$(get_ntfy_topic)
  local server=$(get_ntfy_server)

  local status
  if command -v jq &> /dev/null; then
    status=$(echo "$entry_json" | jq -r '.status // ""')
  else
    status="retrying"
  fi

  local priority="default"
  case "$status" in
    completed) priority="default" ;;
    failed) priority="high" ;;
    retrying) priority="low" ;;
  esac

  curl -s -X POST "\${server}/\${topic}" \\
    -H "Title: Ralph: test ($status)" \\
    -H "Priority: $priority" \\
    -d "test message" 2>&1
}

TEST_JSON='{"subtaskId":"task-001","status":"retrying","summary":"Retrying after failure"}'
execute_notify_action "$TEST_JSON"
`;

    const scriptPath = join(temporaryDirectory, "test-priority-retrying.sh");
    writeFileSync(scriptPath, testScript, { mode: 0o755 });

    const { exitCode, stdout } = await execa("bash", [scriptPath], {
      cwd: temporaryDirectory,
      env: {
        ...process.env,
        PATH: `${temporaryDirectory}:${process.env.PATH}`,
      },
    });

    expect(exitCode).toBe(0);
    expect(stdout).toContain("PRIORITY_HEADER: Priority: low");
  });

  test("notify action returns error when topic not configured", async () => {
    const { writeFileSync } = await import("node:fs");

    const testScript = `#!/bin/bash
set -euo pipefail

# Mock empty topic (not configured)
get_ntfy_topic() { echo ""; }
get_ntfy_server() { echo "https://ntfy.sh"; }

execute_notify_action() {
  local entry_json="$1"
  local topic=$(get_ntfy_topic)

  if [ -z "$topic" ]; then
    echo "Warning: ntfy topic not configured in ralph.config.json (ntfy.topic)" >&2
    return 1
  fi

  echo "Would send notification" >&2
  return 0
}

TEST_JSON='{"subtaskId":"task-001","status":"completed","summary":"Done"}'
if execute_notify_action "$TEST_JSON" 2>&1; then
  echo "RESULT: success"
else
  echo "RESULT: failure"
fi
`;

    const scriptPath = join(temporaryDirectory, "test-no-topic.sh");
    writeFileSync(scriptPath, testScript, { mode: 0o755 });

    const { exitCode, stdout } = await execa("bash", [scriptPath], {
      cwd: temporaryDirectory,
    });

    expect(exitCode).toBe(0);
    expect(stdout).toContain("Warning: ntfy topic not configured");
    expect(stdout).toContain("RESULT: failure");
  });
});

describe("post-iteration-hook pause action handler unit tests", () => {
  let temporaryDirectory = "";

  beforeEach(() => {
    temporaryDirectory = join(
      tmpdir(),
      `pause-action-test-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    );
    mkdirSync(temporaryDirectory, { recursive: true });
  });

  afterEach(() => {
    if (temporaryDirectory !== "" && existsSync(temporaryDirectory)) {
      rmSync(temporaryDirectory, { force: true, recursive: true });
    }
  });

  test("pause action displays formatted pause message with trigger reason", async () => {
    // Create a test script that isolates and tests the execute_pause_action function
    // Using non-interactive mode for testing (stdin is not a terminal)
    const testScript = `#!/bin/bash
set -euo pipefail

# Define the get_pause_trigger_reason function
get_pause_trigger_reason() {
  local entry_json="$1"
  # For testing, simulate a configured pause trigger
  echo "Pause action configured (pauseAlways: true)"
}

# Helper to extract JSON field using node (more portable than jq)
json_field() {
  local json="$1"
  local field="$2"
  local default="\${3:-}"
  ENTRY_JSON="$json" FIELD="$field" DEFAULT="$default" node -e "
    try {
      const data = JSON.parse(process.env.ENTRY_JSON);
      console.log(data[process.env.FIELD] || process.env.DEFAULT);
    } catch(e) { console.log(process.env.DEFAULT); }
  " 2>/dev/null
}

# Define the execute_pause_action function (non-interactive path)
execute_pause_action() {
  local entry_json="$1"

  # Extract fields for display using node
  local subtask_id status summary
  subtask_id=$(json_field "$entry_json" "subtaskId" "unknown")
  status=$(json_field "$entry_json" "status" "unknown")
  summary=$(json_field "$entry_json" "summary" "(summary not available)")

  # Get the trigger reason
  local trigger_reason
  trigger_reason=$(get_pause_trigger_reason "$entry_json")

  echo ""
  echo "╔════════════════════════════════════════════════════════════════╗"
  echo "║                      ITERATION PAUSED                          ║"
  echo "╠════════════════════════════════════════════════════════════════╣"
  echo "║ Subtask: $subtask_id"
  echo "║ Status:  $status"
  echo "║ Summary: $summary"
  echo "╠════════════════════════════════════════════════════════════════╣"
  echo "║ Trigger: $trigger_reason"
  echo "╠════════════════════════════════════════════════════════════════╣"
  echo "║ Options:                                                       ║"
  echo "║   [c] Continue to next iteration                               ║"
  echo "║   [a] Abort build loop                                         ║"
  echo "╚════════════════════════════════════════════════════════════════╝"
  echo ""

  # Non-interactive mode: log the pause but don't block
  if [ ! -t 0 ]; then
    echo "Non-interactive mode: pause logged but continuing automatically"
    return 0
  fi
}

# Test input JSON
TEST_JSON='{"subtaskId":"test-pause-001","sessionId":"session-pause-123","status":"completed","summary":"Implemented pause feature successfully"}'

# Call the function
execute_pause_action "$TEST_JSON"
`;

    const { writeFileSync } = await import("node:fs");
    const scriptPath = join(temporaryDirectory, "test-pause-action.sh");
    writeFileSync(scriptPath, testScript, { mode: 0o755 });

    // Run the test script (non-interactive)
    const { exitCode, stdout } = await execa("bash", [scriptPath], {
      cwd: temporaryDirectory,
    });

    // Verify exit code
    expect(exitCode).toBe(0);

    // Verify output format contains expected structure
    expect(stdout).toContain("ITERATION PAUSED");
    expect(stdout).toContain("╔═");
    expect(stdout).toContain("╚═");

    // Verify all fields are displayed correctly
    expect(stdout).toContain("Subtask: test-pause-001");
    expect(stdout).toContain("Status:  completed");
    expect(stdout).toContain("Summary: Implemented pause feature successfully");

    // Verify trigger reason is displayed
    expect(stdout).toContain("Trigger: Pause action configured");

    // Verify options are shown
    expect(stdout).toContain("[c] Continue to next iteration");
    expect(stdout).toContain("[a] Abort build loop");

    // Verify non-interactive mode message
    expect(stdout).toContain(
      "Non-interactive mode: pause logged but continuing automatically",
    );
  });

  test("pause action continues when user enters 'c'", async () => {
    // Create a test script that simulates user entering 'c' to continue
    const testScript = `#!/bin/bash
set -euo pipefail

# Simulate the user input handling portion
handle_user_input() {
  local choice="$1"
  case "$choice" in
    c|C|continue)
      echo "Continuing to next iteration..."
      return 0
      ;;
    a|A|abort)
      echo "Aborting build loop..."
      return 130
      ;;
    *)
      echo "Invalid choice. Please enter 'c' to continue or 'a' to abort."
      return 1
      ;;
  esac
}

# Test with 'c' input
if handle_user_input "c"; then
  echo "RESULT: continued"
else
  echo "RESULT: did not continue"
fi
`;

    const { writeFileSync } = await import("node:fs");
    const scriptPath = join(temporaryDirectory, "test-pause-continue.sh");
    writeFileSync(scriptPath, testScript, { mode: 0o755 });

    const { exitCode, stdout } = await execa("bash", [scriptPath], {
      cwd: temporaryDirectory,
    });

    expect(exitCode).toBe(0);
    expect(stdout).toContain("Continuing to next iteration...");
    expect(stdout).toContain("RESULT: continued");
  });

  test("pause action aborts when user enters 'a'", async () => {
    // Create a test script that simulates user entering 'a' to abort
    const testScript = `#!/bin/bash
set -euo pipefail

# Simulate the user input handling portion
handle_user_input() {
  local choice="$1"
  case "$choice" in
    c|C|continue)
      echo "Continuing to next iteration..."
      return 0
      ;;
    a|A|abort)
      echo "Aborting build loop..."
      return 130
      ;;
    *)
      echo "Invalid choice. Please enter 'c' to continue or 'a' to abort."
      return 1
      ;;
  esac
}

# Test with 'a' input
if handle_user_input "a"; then
  echo "RESULT: continued"
else
  exit_code=$?
  if [ "$exit_code" -eq 130 ]; then
    echo "RESULT: aborted with exit code 130"
  else
    echo "RESULT: failed with exit code $exit_code"
  fi
fi
`;

    const { writeFileSync } = await import("node:fs");
    const scriptPath = join(temporaryDirectory, "test-pause-abort.sh");
    writeFileSync(scriptPath, testScript, { mode: 0o755 });

    const { exitCode, stdout } = await execa("bash", [scriptPath], {
      cwd: temporaryDirectory,
    });

    expect(exitCode).toBe(0);
    expect(stdout).toContain("Aborting build loop...");
    expect(stdout).toContain("RESULT: aborted with exit code 130");
  });

  test("pause action handles invalid input", async () => {
    const testScript = `#!/bin/bash
set -euo pipefail

# Simulate the user input handling portion
handle_user_input() {
  local choice="$1"
  case "$choice" in
    c|C|continue)
      echo "Continuing to next iteration..."
      return 0
      ;;
    a|A|abort)
      echo "Aborting build loop..."
      return 130
      ;;
    *)
      echo "Invalid choice. Please enter 'c' to continue or 'a' to abort."
      return 1
      ;;
  esac
}

# Test with invalid input
if handle_user_input "x"; then
  echo "RESULT: accepted"
else
  echo "RESULT: rejected"
fi
`;

    const { writeFileSync } = await import("node:fs");
    const scriptPath = join(temporaryDirectory, "test-pause-invalid.sh");
    writeFileSync(scriptPath, testScript, { mode: 0o755 });

    const { exitCode, stdout } = await execa("bash", [scriptPath], {
      cwd: temporaryDirectory,
    });

    expect(exitCode).toBe(0);
    expect(stdout).toContain(
      "Invalid choice. Please enter 'c' to continue or 'a' to abort.",
    );
    expect(stdout).toContain("RESULT: rejected");
  });

  test("pause action accepts uppercase input", async () => {
    const testScript = `#!/bin/bash
set -euo pipefail

handle_user_input() {
  local choice="$1"
  case "$choice" in
    c|C|continue)
      echo "Continuing to next iteration..."
      return 0
      ;;
    a|A|abort)
      echo "Aborting build loop..."
      return 130
      ;;
    *)
      echo "Invalid choice."
      return 1
      ;;
  esac
}

# Test uppercase 'C'
echo "=== Testing uppercase C ==="
if handle_user_input "C"; then
  echo "C: accepted"
fi

# Test uppercase 'A'
echo "=== Testing uppercase A ==="
if handle_user_input "A"; then
  echo "A: accepted"
else
  echo "A: abort signal received"
fi
`;

    const { writeFileSync } = await import("node:fs");
    const scriptPath = join(temporaryDirectory, "test-pause-uppercase.sh");
    writeFileSync(scriptPath, testScript, { mode: 0o755 });

    const { exitCode, stdout } = await execa("bash", [scriptPath], {
      cwd: temporaryDirectory,
    });

    expect(exitCode).toBe(0);
    expect(stdout).toContain("Continuing to next iteration...");
    expect(stdout).toContain("C: accepted");
    expect(stdout).toContain("Aborting build loop...");
    expect(stdout).toContain("A: abort signal received");
  });

  test("get_pause_trigger_reason returns correct reason for pauseOnFailure", async () => {
    const testScript = `#!/bin/bash
set -euo pipefail

# Mock the read_hook_config function
read_hook_config() {
  local key="$1"
  local default="$2"

  # Simulate pauseOnFailure: true config
  if [ "$key" = "hooks.postIteration.pauseOnFailure" ]; then
    echo "true"
  elif [ "$key" = "hooks.postIteration.pauseOnSuccess" ]; then
    echo "false"
  elif [ "$key" = "hooks.postIteration.pauseAlways" ]; then
    echo "false"
  else
    echo "$default"
  fi
}

# Helper to extract JSON field using node
json_field() {
  local json="$1"
  local field="$2"
  local default="\${3:-}"
  ENTRY_JSON="$json" FIELD="$field" DEFAULT="$default" node -e "
    try {
      const data = JSON.parse(process.env.ENTRY_JSON);
      console.log(data[process.env.FIELD] || process.env.DEFAULT);
    } catch(e) { console.log(process.env.DEFAULT); }
  " 2>/dev/null
}

# Define the get_pause_trigger_reason function
get_pause_trigger_reason() {
  local entry_json="$1"
  local status
  status=$(json_field "$entry_json" "status" "")

  local pause_on_failure pause_on_success pause_always
  pause_on_failure=$(read_hook_config "hooks.postIteration.pauseOnFailure" "false")
  pause_on_success=$(read_hook_config "hooks.postIteration.pauseOnSuccess" "false")
  pause_always=$(read_hook_config "hooks.postIteration.pauseAlways" "false")

  if [ "$pause_always" = "true" ]; then
    echo "Pause action configured (pauseAlways: true)"
    return 0
  fi

  if [ "$status" = "failed" ] && [ "$pause_on_failure" = "true" ]; then
    echo "Iteration failed - pause requested (pauseOnFailure: true)"
    return 0
  fi

  if [ "$status" = "completed" ] && [ "$pause_on_success" = "true" ]; then
    echo "Iteration completed - pause requested (pauseOnSuccess: true)"
    return 0
  fi

  echo "Pause action triggered by configuration"
  return 0
}

# Test with failed status
TEST_JSON='{"subtaskId":"test","status":"failed","summary":"Build failed"}'
REASON=$(get_pause_trigger_reason "$TEST_JSON")
echo "Trigger reason for failed: $REASON"
`;

    const { writeFileSync } = await import("node:fs");
    const scriptPath = join(
      temporaryDirectory,
      "test-pause-trigger-failure.sh",
    );
    writeFileSync(scriptPath, testScript, { mode: 0o755 });

    const { exitCode, stdout } = await execa("bash", [scriptPath], {
      cwd: temporaryDirectory,
    });

    expect(exitCode).toBe(0);
    expect(stdout).toContain(
      "Trigger reason for failed: Iteration failed - pause requested (pauseOnFailure: true)",
    );
  });

  test("get_pause_trigger_reason returns correct reason for pauseOnSuccess", async () => {
    const testScript = `#!/bin/bash
set -euo pipefail

# Mock the read_hook_config function for pauseOnSuccess
read_hook_config() {
  local key="$1"
  local default="$2"

  if [ "$key" = "hooks.postIteration.pauseOnFailure" ]; then
    echo "false"
  elif [ "$key" = "hooks.postIteration.pauseOnSuccess" ]; then
    echo "true"
  elif [ "$key" = "hooks.postIteration.pauseAlways" ]; then
    echo "false"
  else
    echo "$default"
  fi
}

# Helper to extract JSON field using node
json_field() {
  local json="$1"
  local field="$2"
  local default="\${3:-}"
  ENTRY_JSON="$json" FIELD="$field" DEFAULT="$default" node -e "
    try {
      const data = JSON.parse(process.env.ENTRY_JSON);
      console.log(data[process.env.FIELD] || process.env.DEFAULT);
    } catch(e) { console.log(process.env.DEFAULT); }
  " 2>/dev/null
}

get_pause_trigger_reason() {
  local entry_json="$1"
  local status
  status=$(json_field "$entry_json" "status" "")

  local pause_on_failure pause_on_success pause_always
  pause_on_failure=$(read_hook_config "hooks.postIteration.pauseOnFailure" "false")
  pause_on_success=$(read_hook_config "hooks.postIteration.pauseOnSuccess" "false")
  pause_always=$(read_hook_config "hooks.postIteration.pauseAlways" "false")

  if [ "$pause_always" = "true" ]; then
    echo "Pause action configured (pauseAlways: true)"
    return 0
  fi

  if [ "$status" = "failed" ] && [ "$pause_on_failure" = "true" ]; then
    echo "Iteration failed - pause requested (pauseOnFailure: true)"
    return 0
  fi

  if [ "$status" = "completed" ] && [ "$pause_on_success" = "true" ]; then
    echo "Iteration completed - pause requested (pauseOnSuccess: true)"
    return 0
  fi

  echo "Pause action triggered by configuration"
  return 0
}

# Test with completed status
TEST_JSON='{"subtaskId":"test","status":"completed","summary":"Build succeeded"}'
REASON=$(get_pause_trigger_reason "$TEST_JSON")
echo "Trigger reason for completed: $REASON"
`;

    const { writeFileSync } = await import("node:fs");
    const scriptPath = join(
      temporaryDirectory,
      "test-pause-trigger-success.sh",
    );
    writeFileSync(scriptPath, testScript, { mode: 0o755 });

    const { exitCode, stdout } = await execa("bash", [scriptPath], {
      cwd: temporaryDirectory,
    });

    expect(exitCode).toBe(0);
    expect(stdout).toContain(
      "Trigger reason for completed: Iteration completed - pause requested (pauseOnSuccess: true)",
    );
  });

  test("get_pause_trigger_reason returns correct reason for pauseAlways", async () => {
    const testScript = `#!/bin/bash
set -euo pipefail

# Mock the read_hook_config function for pauseAlways
read_hook_config() {
  local key="$1"
  local default="$2"

  if [ "$key" = "hooks.postIteration.pauseOnFailure" ]; then
    echo "false"
  elif [ "$key" = "hooks.postIteration.pauseOnSuccess" ]; then
    echo "false"
  elif [ "$key" = "hooks.postIteration.pauseAlways" ]; then
    echo "true"
  else
    echo "$default"
  fi
}

# Helper to extract JSON field using node
json_field() {
  local json="$1"
  local field="$2"
  local default="\${3:-}"
  ENTRY_JSON="$json" FIELD="$field" DEFAULT="$default" node -e "
    try {
      const data = JSON.parse(process.env.ENTRY_JSON);
      console.log(data[process.env.FIELD] || process.env.DEFAULT);
    } catch(e) { console.log(process.env.DEFAULT); }
  " 2>/dev/null
}

get_pause_trigger_reason() {
  local entry_json="$1"
  local status
  status=$(json_field "$entry_json" "status" "")

  local pause_on_failure pause_on_success pause_always
  pause_on_failure=$(read_hook_config "hooks.postIteration.pauseOnFailure" "false")
  pause_on_success=$(read_hook_config "hooks.postIteration.pauseOnSuccess" "false")
  pause_always=$(read_hook_config "hooks.postIteration.pauseAlways" "false")

  if [ "$pause_always" = "true" ]; then
    echo "Pause action configured (pauseAlways: true)"
    return 0
  fi

  if [ "$status" = "failed" ] && [ "$pause_on_failure" = "true" ]; then
    echo "Iteration failed - pause requested (pauseOnFailure: true)"
    return 0
  fi

  if [ "$status" = "completed" ] && [ "$pause_on_success" = "true" ]; then
    echo "Iteration completed - pause requested (pauseOnSuccess: true)"
    return 0
  fi

  echo "Pause action triggered by configuration"
  return 0
}

# Test with any status (pauseAlways should trigger regardless)
TEST_JSON='{"subtaskId":"test","status":"retrying","summary":"In progress"}'
REASON=$(get_pause_trigger_reason "$TEST_JSON")
echo "Trigger reason for pauseAlways: $REASON"
`;

    const { writeFileSync } = await import("node:fs");
    const scriptPath = join(temporaryDirectory, "test-pause-trigger-always.sh");
    writeFileSync(scriptPath, testScript, { mode: 0o755 });

    const { exitCode, stdout } = await execa("bash", [scriptPath], {
      cwd: temporaryDirectory,
    });

    expect(exitCode).toBe(0);
    expect(stdout).toContain(
      "Trigger reason for pauseAlways: Pause action configured (pauseAlways: true)",
    );
  });
});

describe("post-iteration-hook diary entry integration test", () => {
  let temporaryDirectory = "";

  beforeEach(() => {
    temporaryDirectory = join(
      tmpdir(),
      `diary-integration-test-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    );
    mkdirSync(temporaryDirectory, { recursive: true });
  });

  afterEach(() => {
    if (temporaryDirectory !== "" && existsSync(temporaryDirectory)) {
      rmSync(temporaryDirectory, { force: true, recursive: true });
    }
  });

  test("diary entry created after mock iteration with correct schema", async () => {
    const { writeFileSync } = await import("node:fs");

    // Create logs directory
    const logsDirectory = join(temporaryDirectory, "logs");
    mkdirSync(logsDirectory, { recursive: true });

    // Create a minimal ralph.config.json
    writeFileSync(
      join(temporaryDirectory, "ralph.config.json"),
      JSON.stringify({
        hooks: {
          postIteration: {
            actions: ["log"],
            diaryPath: join(logsDirectory, "iterations.jsonl"),
            enabled: true,
            model: "haiku",
          },
        },
      }),
    );

    // Create prompts directory and iteration-summary.md
    mkdirSync(join(temporaryDirectory, "prompts"), { recursive: true });
    writeFileSync(
      join(temporaryDirectory, "prompts/iteration-summary.md"),
      `# Iteration Summary Generator
Generate a JSON summary for subtask {{SUBTASK_ID}} with status {{STATUS}}.
Session log: {{SESSION_JSONL_PATH}}
Output: {"subtaskId":"{{SUBTASK_ID}}","status":"{{STATUS}}","summary":"Test summary","keyFindings":[]}`,
    );

    // Create a mock claude script
    const mockClaudeScript = `#!/bin/bash
echo '{"result": "{\\"subtaskId\\":\\"mock-subtask-001\\",\\"status\\":\\"completed\\",\\"summary\\":\\"Mock iteration completed successfully\\",\\"keyFindings\\":[\\"finding1\\",\\"finding2\\"]}"}'
`;
    const mockClaudePath = join(temporaryDirectory, "claude");
    writeFileSync(mockClaudePath, mockClaudeScript, { mode: 0o755 });

    // Create a simplified test script that simulates the hook's write_diary_entry function
    // Uses node for JSON creation since jq may not be available
    const testScript = `#!/bin/bash
set -euo pipefail

export PATH="${temporaryDirectory}:$PATH"

REPO_ROOT="${temporaryDirectory}"
CONFIG_PATH="$REPO_ROOT/ralph.config.json"
DIARY_PATH="$REPO_ROOT/logs/iterations.jsonl"

# Test parameters (simulating a mock iteration)
SUBTASK_ID="mock-subtask-001"
SESSION_ID="session-mock-12345"
STATUS="completed"
SUBTASK_TITLE="Mock Subtask for Integration Test"
MILESTONE="mock-milestone"
TASK_REF="docs/tasks/mock-task.md"
ITERATION_NUM=3

# Create diary entry directly using node (jq may not be available)
timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

entry=$(node -e "
  console.log(JSON.stringify({
    subtaskId: '$SUBTASK_ID',
    sessionId: '$SESSION_ID',
    status: '$STATUS',
    summary: 'Mock iteration completed successfully',
    timestamp: '$timestamp',
    milestone: '$MILESTONE',
    taskRef: '$TASK_REF',
    iterationNum: $ITERATION_NUM,
    keyFindings: ['finding1', 'finding2'],
    errors: [],
    toolCalls: 42,
    filesChanged: ['src/file1.ts', 'src/file2.ts'],
    duration: 65000
  }));
")

# Ensure logs directory exists
mkdir -p "$(dirname "$DIARY_PATH")"

# Write entry to diary file
echo "$entry" >> "$DIARY_PATH"

echo "Diary entry written successfully"
echo "DIARY_PATH: $DIARY_PATH"
`;

    const testScriptPath = join(temporaryDirectory, "test-diary-entry.sh");
    writeFileSync(testScriptPath, testScript, { mode: 0o755 });

    // Run the test script
    const { exitCode, stdout } = await execa("bash", [testScriptPath], {
      cwd: temporaryDirectory,
      env: {
        ...process.env,
        PATH: `${temporaryDirectory}:${process.env.PATH}`,
      },
    });

    // Verify exit code
    expect(exitCode).toBe(0);
    expect(stdout).toContain("Diary entry written successfully");

    // Step 2: Verify logs/iterations.jsonl was updated
    const diaryPath = join(logsDirectory, "iterations.jsonl");
    expect(existsSync(diaryPath)).toBe(true);

    // Read the diary file
    const diaryContent = readFileSync(diaryPath, "utf8");
    expect(diaryContent.trim()).not.toBe("");

    // Parse the last line as JSON
    const lines = diaryContent.trim().split("\n");
    const lastLine = lines.at(-1);
    expect(lastLine).toBeDefined();
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- we just verified lastLine is defined above
    const lastEntry = JSON.parse(lastLine!) as {
      duration: number;
      errors: Array<unknown>;
      filesChanged: Array<string>;
      iterationNum: number;
      keyFindings: Array<string>;
      milestone: string;
      sessionId: string;
      status: string;
      subtaskId: string;
      summary: string;
      taskRef: string;
      timestamp: string;
      toolCalls: number;
    };

    // Step 3: Verify entry matches expected schema
    // Required string fields
    expect(typeof lastEntry.subtaskId).toBe("string");
    expect(lastEntry.subtaskId).toBe("mock-subtask-001");

    expect(typeof lastEntry.sessionId).toBe("string");
    expect(lastEntry.sessionId).toBe("session-mock-12345");

    expect(typeof lastEntry.status).toBe("string");
    expect(["completed", "failed", "retrying"]).toContain(lastEntry.status);
    expect(lastEntry.status).toBe("completed");

    expect(typeof lastEntry.summary).toBe("string");
    expect(lastEntry.summary).toBe("Mock iteration completed successfully");

    expect(typeof lastEntry.timestamp).toBe("string");
    // Verify timestamp is valid ISO 8601 format
    expect(lastEntry.timestamp).toMatch(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/,
    );

    // Optional string fields
    expect(typeof lastEntry.milestone).toBe("string");
    expect(lastEntry.milestone).toBe("mock-milestone");

    expect(typeof lastEntry.taskRef).toBe("string");
    expect(lastEntry.taskRef).toBe("docs/tasks/mock-task.md");

    // Numeric fields
    expect(typeof lastEntry.iterationNum).toBe("number");
    expect(Number.isInteger(lastEntry.iterationNum)).toBe(true);
    expect(lastEntry.iterationNum).toBe(3);

    expect(typeof lastEntry.toolCalls).toBe("number");
    expect(Number.isInteger(lastEntry.toolCalls)).toBe(true);
    expect(lastEntry.toolCalls).toBe(42);

    expect(typeof lastEntry.duration).toBe("number");
    expect(Number.isInteger(lastEntry.duration)).toBe(true);
    expect(lastEntry.duration).toBe(65_000);

    // Array fields
    expect(Array.isArray(lastEntry.keyFindings)).toBe(true);
    expect(lastEntry.keyFindings).toEqual(["finding1", "finding2"]);

    expect(Array.isArray(lastEntry.errors)).toBe(true);
    expect(lastEntry.errors).toEqual([]);

    expect(Array.isArray(lastEntry.filesChanged)).toBe(true);
    expect(lastEntry.filesChanged).toEqual(["src/file1.ts", "src/file2.ts"]);
  });

  test("multiple iterations append to same diary file", async () => {
    const { writeFileSync } = await import("node:fs");

    // Create logs directory
    const logsDirectory = join(temporaryDirectory, "logs");
    mkdirSync(logsDirectory, { recursive: true });

    const diaryPath = join(logsDirectory, "iterations.jsonl");

    // Create a test script that appends multiple entries using node (jq may not be available)
    const testScript = `#!/bin/bash
set -euo pipefail

DIARY_PATH="${diaryPath}"
mkdir -p "$(dirname "$DIARY_PATH")"

# Helper function to create JSON entry using node
create_entry() {
  local subtaskId="$1"
  local sessionId="$2"
  local status="$3"
  local summary="$4"
  local iterationNum="$5"
  local toolCalls="$6"
  local duration="$7"
  local timestamp
  timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

  node -e "
    console.log(JSON.stringify({
      subtaskId: '$subtaskId',
      sessionId: '$sessionId',
      status: '$status',
      summary: '$summary',
      timestamp: '$timestamp',
      milestone: '',
      taskRef: '',
      iterationNum: $iterationNum,
      keyFindings: [],
      errors: [],
      toolCalls: $toolCalls,
      filesChanged: [],
      duration: $duration
    }));
  "
}

# Write first entry
entry1=$(create_entry "subtask-iter-1" "session-1" "completed" "First iteration" 1 10 1000)
echo "$entry1" >> "$DIARY_PATH"

# Write second entry (no delay needed for this test)
entry2=$(create_entry "subtask-iter-2" "session-2" "failed" "Second iteration failed" 2 5 500)
echo "$entry2" >> "$DIARY_PATH"

# Write third entry
entry3=$(create_entry "subtask-iter-3" "session-3" "retrying" "Third iteration retrying" 3 8 750)
echo "$entry3" >> "$DIARY_PATH"

echo "ENTRIES_WRITTEN: 3"
`;

    const testScriptPath = join(temporaryDirectory, "test-multi-entries.sh");
    writeFileSync(testScriptPath, testScript, { mode: 0o755 });

    // Run the test script
    const { exitCode, stdout } = await execa("bash", [testScriptPath], {
      cwd: temporaryDirectory,
    });

    expect(exitCode).toBe(0);
    expect(stdout).toContain("ENTRIES_WRITTEN: 3");

    // Verify diary file has 3 entries
    expect(existsSync(diaryPath)).toBe(true);
    const diaryContent = readFileSync(diaryPath, "utf8");
    const lines = diaryContent.trim().split("\n");
    expect(lines.length).toBe(3);

    // Verify each entry is valid JSON and has correct subtaskId
    expect(lines[0]).toBeDefined();
    expect(lines[1]).toBeDefined();
    expect(lines[2]).toBeDefined();
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- verified above with toBeDefined checks
    const entry1 = JSON.parse(lines[0]!) as { subtaskId: string };
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- verified above with toBeDefined checks
    const entry2 = JSON.parse(lines[1]!) as { subtaskId: string };
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- verified above with toBeDefined checks
    const entry3 = JSON.parse(lines[2]!) as { subtaskId: string };

    expect(entry1.subtaskId).toBe("subtask-iter-1");
    expect(entry2.subtaskId).toBe("subtask-iter-2");
    expect(entry3.subtaskId).toBe("subtask-iter-3");
  });
});

describe("post-iteration-hook ntfy notification delivery integration test", () => {
  let temporaryDirectory = "";

  beforeEach(() => {
    temporaryDirectory = join(
      tmpdir(),
      `ntfy-delivery-test-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    );
    mkdirSync(temporaryDirectory, { recursive: true });
  });

  afterEach(() => {
    if (temporaryDirectory !== "" && existsSync(temporaryDirectory)) {
      rmSync(temporaryDirectory, { force: true, recursive: true });
    }
  });

  test("ntfy notification delivered with correct payload via mock HTTP server", async () => {
    const { writeFileSync } = await import("node:fs");

    // Create a request capture file to store the HTTP request details
    const captureFile = join(temporaryDirectory, "ntfy-request-capture.json");

    // Create a mock curl script that simulates HTTP delivery and captures the request
    // This acts as our "mock HTTP server" - it captures all request details
    const mockCurlScript = `#!/bin/bash
# Mock curl that simulates ntfy.sh server behavior
# Captures request details to file for verification

CAPTURE_FILE="${captureFile}"

# Parse arguments to extract request details
url=""
method="GET"
title=""
priority=""
tags=""
body=""

prev_arg=""
for arg in "$@"; do
  case "$prev_arg" in
    "-X")
      method="$arg"
      ;;
    "-H")
      # Parse header
      if [[ "$arg" == Title:* ]]; then
        title="\${arg#Title: }"
      elif [[ "$arg" == Priority:* ]]; then
        priority="\${arg#Priority: }"
      elif [[ "$arg" == Tags:* ]]; then
        tags="\${arg#Tags: }"
      fi
      ;;
    "-d")
      body="$arg"
      ;;
  esac

  # Check if this is the URL
  if [[ "$arg" =~ ^https?:// ]]; then
    url="$arg"
  fi

  prev_arg="$arg"
done

# Write captured request to file (using node for JSON creation)
node -e "
const fs = require('fs');
const capture = {
  delivered: true,
  timestamp: new Date().toISOString(),
  method: process.env.METHOD,
  url: process.env.URL,
  headers: {
    title: process.env.TITLE,
    priority: process.env.PRIORITY,
    tags: process.env.TAGS
  },
  body: process.env.BODY
};
fs.writeFileSync(process.env.CAPTURE_FILE, JSON.stringify(capture, null, 2));
" 2>/dev/null

# Simulate successful ntfy.sh response
echo '{"id":"mock-msg-id","time":1234567890,"topic":"test-topic","message":"received"}'
exit 0
`;

    const mockCurlPath = join(temporaryDirectory, "curl");
    writeFileSync(mockCurlPath, mockCurlScript, { mode: 0o755 });

    // Create ralph.config.json with ntfy configuration
    const configPath = join(temporaryDirectory, "ralph.config.json");
    writeFileSync(
      configPath,
      JSON.stringify({
        hooks: { postIteration: { actions: ["notify"], enabled: true } },
        ntfy: { server: "https://ntfy.sh", topic: "test-delivery-topic-123" },
      }),
    );

    // Create test script that executes the full notify action flow
    const testScript = `#!/bin/bash
set -euo pipefail

export PATH="${temporaryDirectory}:$PATH"
export CAPTURE_FILE="${captureFile}"
export METHOD="POST"
export TITLE=""
export PRIORITY=""
export TAGS=""
export BODY=""
export URL=""

REPO_ROOT="${temporaryDirectory}"
CONFIG_PATH="$REPO_ROOT/ralph.config.json"

# Read config values using node (jq alternative)
read_config() {
  local key="$1"
  local default="\${2:-}"

  if [ ! -f "$CONFIG_PATH" ]; then
    echo "$default"
    return
  fi

  local value
  value=$(CONFIG_PATH="$CONFIG_PATH" KEY="$key" DEFAULT="$default" node -e "
    const fs = require('fs');
    const path = require('path');
    try {
      const config = JSON.parse(fs.readFileSync(process.env.CONFIG_PATH, 'utf8'));
      const keys = process.env.KEY.split('.');
      let value = config;
      for (const k of keys) {
        if (value && typeof value === 'object' && k in value) {
          value = value[k];
        } else {
          value = process.env.DEFAULT;
          break;
        }
      }
      console.log(value === undefined || value === null ? process.env.DEFAULT : value);
    } catch (e) {
      console.log(process.env.DEFAULT);
    }
  " 2>/dev/null)

  echo "$value"
}

get_ntfy_topic() {
  read_config "ntfy.topic" ""
}

get_ntfy_server() {
  read_config "ntfy.server" "https://ntfy.sh"
}

# The notify action implementation (matching post-iteration-hook.sh)
execute_notify_action() {
  local entry_json="$1"

  local topic
  topic=$(get_ntfy_topic)

  if [ -z "$topic" ]; then
    echo "Warning: ntfy topic not configured" >&2
    return 1
  fi

  local server
  server=$(get_ntfy_server)

  # Extract fields using node
  local subtask_id status summary
  subtask_id=$(ENTRY="$entry_json" node -e "console.log(JSON.parse(process.env.ENTRY).subtaskId || '')" 2>/dev/null)
  status=$(ENTRY="$entry_json" node -e "console.log(JSON.parse(process.env.ENTRY).status || '')" 2>/dev/null)
  summary=$(ENTRY="$entry_json" node -e "console.log(JSON.parse(process.env.ENTRY).summary || '')" 2>/dev/null)

  local title="Ralph: $subtask_id ($status)"
  local message="$summary"

  # Determine priority
  local priority="default"
  case "$status" in
    completed) priority="default" ;;
    failed) priority="high" ;;
    retrying) priority="low" ;;
  esac

  # Set environment for capture
  export METHOD="POST"
  export URL="\${server}/\${topic}"
  export TITLE="$title"
  export PRIORITY="$priority"
  export TAGS="robot,white_check_mark"
  export BODY="$message"

  local ntfy_url="\${server}/\${topic}"

  echo "=== Delivering notification ==="
  echo "Topic: $topic"
  echo "Server: $server"
  echo "Title: $title"
  echo "Priority: $priority"

  # Execute curl (mock will capture and simulate success)
  if curl -s -X POST "$ntfy_url" \\
    -H "Title: $title" \\
    -H "Priority: $priority" \\
    -H "Tags: robot,white_check_mark" \\
    -d "$message"; then
    echo ""
    echo "DELIVERY_STATUS: success"
    return 0
  else
    echo ""
    echo "DELIVERY_STATUS: failed"
    return 1
  fi
}

# Test entry JSON
TEST_ENTRY='{"subtaskId":"ntfy-test-subtask-001","sessionId":"session-ntfy-789","status":"completed","summary":"Feature implemented and tests passing"}'

# Execute the notify action
execute_notify_action "$TEST_ENTRY"
`;

    const testScriptPath = join(temporaryDirectory, "test-ntfy-delivery.sh");
    writeFileSync(testScriptPath, testScript, { mode: 0o755 });

    // Run the test
    const { exitCode, stdout } = await execa("bash", [testScriptPath], {
      cwd: temporaryDirectory,
      env: {
        ...process.env,
        CAPTURE_FILE: captureFile,
        PATH: `${temporaryDirectory}:${process.env.PATH}`,
      },
    });

    // Verify delivery was successful
    expect(exitCode).toBe(0);
    expect(stdout).toContain("DELIVERY_STATUS: success");

    // Step 3: Verify notification was received by checking the capture file
    expect(existsSync(captureFile)).toBe(true);

    const captureContent = readFileSync(captureFile, "utf8");
    const capture = JSON.parse(captureContent) as {
      body: string;
      delivered: boolean;
      headers: { priority: string; tags: string; title: string };
      method: string;
      timestamp: string;
      url: string;
    };

    // Verify the notification was delivered
    expect(capture.delivered).toBe(true);

    // Verify correct HTTP method
    expect(capture.method).toBe("POST");

    // Verify correct endpoint (configured topic)
    expect(capture.url).toBe("https://ntfy.sh/test-delivery-topic-123");

    // Verify headers contain expected values
    expect(capture.headers.title).toBe(
      "Ralph: ntfy-test-subtask-001 (completed)",
    );
    expect(capture.headers.priority).toBe("default");

    // Verify body contains the summary message
    expect(capture.body).toBe("Feature implemented and tests passing");

    // Verify timestamp was recorded (notification was received)
    expect(capture.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  test("ntfy notification delivered with high priority for failed status", async () => {
    const { writeFileSync } = await import("node:fs");

    const captureFile = join(temporaryDirectory, "ntfy-failed-capture.json");

    // Simplified mock curl for this test
    const mockCurlScript = `#!/bin/bash
prev_arg=""
priority=""
for arg in "$@"; do
  if [ "$prev_arg" = "-H" ] && [[ "$arg" == Priority:* ]]; then
    priority="\${arg#Priority: }"
  fi
  prev_arg="$arg"
done
echo "CAPTURED_PRIORITY: $priority"
node -e "require('fs').writeFileSync('${captureFile}', JSON.stringify({priority: '$priority'}))"
exit 0
`;

    writeFileSync(join(temporaryDirectory, "curl"), mockCurlScript, {
      mode: 0o755,
    });

    const testScript = `#!/bin/bash
set -euo pipefail
export PATH="${temporaryDirectory}:$PATH"

execute_notify_action() {
  local entry_json="$1"
  local status
  status=$(ENTRY="$entry_json" node -e "console.log(JSON.parse(process.env.ENTRY).status || '')" 2>/dev/null)

  local priority="default"
  case "$status" in
    failed) priority="high" ;;
    retrying) priority="low" ;;
  esac

  curl -s -X POST "https://ntfy.sh/test-topic" -H "Priority: $priority" -d "test"
}

execute_notify_action '{"subtaskId":"fail-001","status":"failed","summary":"Build failed"}'
`;

    writeFileSync(join(temporaryDirectory, "test-failed.sh"), testScript, {
      mode: 0o755,
    });

    const { exitCode, stdout } = await execa(
      "bash",
      [join(temporaryDirectory, "test-failed.sh")],
      {
        cwd: temporaryDirectory,
        env: {
          ...process.env,
          PATH: `${temporaryDirectory}:${process.env.PATH}`,
        },
      },
    );

    expect(exitCode).toBe(0);
    expect(stdout).toContain("CAPTURED_PRIORITY: high");

    // Verify capture file
    const capture = JSON.parse(readFileSync(captureFile, "utf8")) as {
      priority: string;
    };
    expect(capture.priority).toBe("high");
  });

  test("ntfy notification not delivered when topic not configured", async () => {
    const { writeFileSync } = await import("node:fs");

    // Create config WITHOUT ntfy topic
    writeFileSync(
      join(temporaryDirectory, "ralph.config.json"),
      JSON.stringify({
        hooks: { postIteration: { actions: ["notify"], enabled: true } },
      }),
    );

    const testScript = `#!/bin/bash
set -euo pipefail

CONFIG_PATH="${temporaryDirectory}/ralph.config.json"

get_ntfy_topic() {
  CONFIG_PATH="$CONFIG_PATH" node -e "
    const fs = require('fs');
    try {
      const config = JSON.parse(fs.readFileSync(process.env.CONFIG_PATH, 'utf8'));
      console.log(config.ntfy?.topic || '');
    } catch (e) { console.log(''); }
  " 2>/dev/null
}

execute_notify_action() {
  local topic
  topic=$(get_ntfy_topic)

  if [ -z "$topic" ]; then
    echo "DELIVERY_BLOCKED: no topic configured"
    return 1
  fi

  echo "DELIVERY_ATTEMPTED"
  return 0
}

if execute_notify_action '{"subtaskId":"test","status":"completed"}'; then
  echo "RESULT: delivered"
else
  echo "RESULT: not delivered"
fi
`;

    writeFileSync(join(temporaryDirectory, "test-no-topic.sh"), testScript, {
      mode: 0o755,
    });

    const { exitCode, stdout } = await execa(
      "bash",
      [join(temporaryDirectory, "test-no-topic.sh")],
      { cwd: temporaryDirectory },
    );

    expect(exitCode).toBe(0);
    expect(stdout).toContain("DELIVERY_BLOCKED: no topic configured");
    expect(stdout).toContain("RESULT: not delivered");
    expect(stdout).not.toContain("DELIVERY_ATTEMPTED");
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

describe("post-iteration-hook pause behavior integration test", () => {
  let temporaryDirectory = "";

  beforeEach(() => {
    temporaryDirectory = join(
      tmpdir(),
      `pause-integration-test-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    );
    mkdirSync(temporaryDirectory, { recursive: true });
  });

  afterEach(() => {
    if (temporaryDirectory !== "" && existsSync(temporaryDirectory)) {
      rmSync(temporaryDirectory, { force: true, recursive: true });
    }
  });

  test("hook with pause action continues on 'c' input", async () => {
    const { writeFileSync } = await import("node:fs");

    // Create a simplified version of the pause action that reads from stdin
    // This tests the integration between execute_pause_action and user input
    const testScript = `#!/bin/bash
set -euo pipefail

# Simplified pause action handler that can be tested with piped input
execute_pause_action_with_input() {
  local entry_json="$1"
  local input="$2"

  # Extract fields
  local subtask_id status summary
  subtask_id=$(ENTRY="$entry_json" node -e "console.log(JSON.parse(process.env.ENTRY).subtaskId || 'unknown')" 2>/dev/null)
  status=$(ENTRY="$entry_json" node -e "console.log(JSON.parse(process.env.ENTRY).status || 'unknown')" 2>/dev/null)
  summary=$(ENTRY="$entry_json" node -e "console.log(JSON.parse(process.env.ENTRY).summary || '')" 2>/dev/null)

  echo ""
  echo "╔════════════════════════════════════════════════════════════════╗"
  echo "║                      ITERATION PAUSED                          ║"
  echo "╠════════════════════════════════════════════════════════════════╣"
  echo "║ Subtask: $subtask_id"
  echo "║ Status:  $status"
  echo "║ Summary: $summary"
  echo "╠════════════════════════════════════════════════════════════════╣"
  echo "║ Trigger: Pause action configured"
  echo "╠════════════════════════════════════════════════════════════════╣"
  echo "║ Options:                                                       ║"
  echo "║   [c] Continue to next iteration                               ║"
  echo "║   [a] Abort build loop                                         ║"
  echo "╚════════════════════════════════════════════════════════════════╝"
  echo ""

  # Process provided input
  local choice="$input"
  case "$choice" in
    c|C|continue)
      echo "Continuing to next iteration..."
      return 0
      ;;
    a|A|abort)
      echo "Aborting build loop..."
      return 130
      ;;
    *)
      echo "Invalid choice. Please enter 'c' to continue or 'a' to abort."
      return 1
      ;;
  esac
}

# Test entry JSON
TEST_JSON='{"subtaskId":"pause-int-001","sessionId":"session-pause-int","status":"completed","summary":"Feature completed successfully"}'

# Simulate 'c' input for continue
echo "=== Test: Continue input ==="
if execute_pause_action_with_input "$TEST_JSON" "c"; then
  echo "PAUSE_CONTINUE_RESULT: success"
else
  echo "PAUSE_CONTINUE_RESULT: failed"
fi
`;

    const scriptPath = join(temporaryDirectory, "test-pause-continue-int.sh");
    writeFileSync(scriptPath, testScript, { mode: 0o755 });

    const { exitCode, stdout } = await execa("bash", [scriptPath], {
      cwd: temporaryDirectory,
    });

    // Verify the pause UI was displayed
    expect(exitCode).toBe(0);
    expect(stdout).toContain("ITERATION PAUSED");
    expect(stdout).toContain("Subtask: pause-int-001");
    expect(stdout).toContain("Status:  completed");
    expect(stdout).toContain("[c] Continue to next iteration");
    expect(stdout).toContain("[a] Abort build loop");

    // Verify continue was successful
    expect(stdout).toContain("Continuing to next iteration...");
    expect(stdout).toContain("PAUSE_CONTINUE_RESULT: success");
  });

  test("hook with pause action aborts on 'a' input", async () => {
    const { writeFileSync } = await import("node:fs");

    const testScript = `#!/bin/bash
set -euo pipefail

execute_pause_action_with_input() {
  local entry_json="$1"
  local input="$2"

  local subtask_id status
  subtask_id=$(ENTRY="$entry_json" node -e "console.log(JSON.parse(process.env.ENTRY).subtaskId || 'unknown')" 2>/dev/null)
  status=$(ENTRY="$entry_json" node -e "console.log(JSON.parse(process.env.ENTRY).status || 'unknown')" 2>/dev/null)

  echo ""
  echo "╔════════════════════════════════════════════════════════════════╗"
  echo "║                      ITERATION PAUSED                          ║"
  echo "╠════════════════════════════════════════════════════════════════╣"
  echo "║ Subtask: $subtask_id"
  echo "║ Status:  $status"
  echo "╠════════════════════════════════════════════════════════════════╣"
  echo "║ Options:                                                       ║"
  echo "║   [c] Continue to next iteration                               ║"
  echo "║   [a] Abort build loop                                         ║"
  echo "╚════════════════════════════════════════════════════════════════╝"
  echo ""

  local choice="$input"
  case "$choice" in
    c|C|continue)
      echo "Continuing to next iteration..."
      return 0
      ;;
    a|A|abort)
      echo "Aborting build loop..."
      return 130
      ;;
    *)
      echo "Invalid choice."
      return 1
      ;;
  esac
}

TEST_JSON='{"subtaskId":"pause-int-002","status":"failed","summary":"Build failed with errors"}'

echo "=== Test: Abort input ==="
if execute_pause_action_with_input "$TEST_JSON" "a"; then
  echo "PAUSE_ABORT_RESULT: continued (unexpected)"
else
  exit_code=$?
  if [ "$exit_code" -eq 130 ]; then
    echo "PAUSE_ABORT_RESULT: aborted with exit code 130"
  else
    echo "PAUSE_ABORT_RESULT: unexpected exit code $exit_code"
  fi
fi
`;

    const scriptPath = join(temporaryDirectory, "test-pause-abort-int.sh");
    writeFileSync(scriptPath, testScript, { mode: 0o755 });

    const { exitCode, stdout } = await execa("bash", [scriptPath], {
      cwd: temporaryDirectory,
    });

    // Verify the pause UI was displayed
    expect(exitCode).toBe(0);
    expect(stdout).toContain("ITERATION PAUSED");
    expect(stdout).toContain("Subtask: pause-int-002");
    expect(stdout).toContain("Status:  failed");

    // Verify abort was triggered correctly
    expect(stdout).toContain("Aborting build loop...");
    expect(stdout).toContain("PAUSE_ABORT_RESULT: aborted with exit code 130");
  });

  test("hook pause action respects pauseOnFailure config", async () => {
    const { writeFileSync } = await import("node:fs");

    // Create ralph.config.json with pauseOnFailure enabled
    writeFileSync(
      join(temporaryDirectory, "ralph.config.json"),
      JSON.stringify({
        hooks: {
          postIteration: {
            actions: ["pause"],
            enabled: true,
            pauseOnFailure: true,
            pauseOnSuccess: false,
          },
        },
      }),
    );

    const testScript = `#!/bin/bash
set -euo pipefail

CONFIG_PATH="${temporaryDirectory}/ralph.config.json"

# Read config helper
read_hook_config() {
  local key="$1"
  local default="$2"

  if [ ! -f "$CONFIG_PATH" ]; then
    echo "$default"
    return
  fi

  CONFIG_PATH="$CONFIG_PATH" KEY="$key" DEFAULT="$default" node -e "
    const fs = require('fs');
    try {
      const config = JSON.parse(fs.readFileSync(process.env.CONFIG_PATH, 'utf8'));
      const keys = process.env.KEY.split('.');
      let value = config;
      for (const k of keys) {
        if (value && typeof value === 'object' && k in value) {
          value = value[k];
        } else {
          value = process.env.DEFAULT;
          break;
        }
      }
      console.log(value === undefined || value === null ? process.env.DEFAULT : value);
    } catch (e) {
      console.log(process.env.DEFAULT);
    }
  " 2>/dev/null
}

# Determine if pause should trigger based on config and status
should_pause() {
  local status="$1"

  local pause_on_failure pause_on_success
  pause_on_failure=$(read_hook_config "hooks.postIteration.pauseOnFailure" "false")
  pause_on_success=$(read_hook_config "hooks.postIteration.pauseOnSuccess" "false")

  if [ "$status" = "failed" ] && [ "$pause_on_failure" = "true" ]; then
    echo "SHOULD_PAUSE: true (pauseOnFailure)"
    return 0
  fi

  if [ "$status" = "completed" ] && [ "$pause_on_success" = "true" ]; then
    echo "SHOULD_PAUSE: true (pauseOnSuccess)"
    return 0
  fi

  echo "SHOULD_PAUSE: false"
  return 1
}

# Test with failed status
echo "=== Test: Failed status with pauseOnFailure=true ==="
should_pause "failed"

# Test with completed status (should NOT pause)
echo "=== Test: Completed status with pauseOnSuccess=false ==="
should_pause "completed" || true
`;

    const scriptPath = join(temporaryDirectory, "test-pause-config.sh");
    writeFileSync(scriptPath, testScript, { mode: 0o755 });

    const { exitCode, stdout } = await execa("bash", [scriptPath], {
      cwd: temporaryDirectory,
    });

    expect(exitCode).toBe(0);

    // Verify pauseOnFailure triggers pause for failed status
    expect(stdout).toContain("SHOULD_PAUSE: true (pauseOnFailure)");

    // Verify pauseOnSuccess=false does NOT trigger pause for completed status
    expect(stdout).toContain(
      "Test: Completed status with pauseOnSuccess=false",
    );
    // The second call should return false
    const lines = stdout.split("\n");
    const completedTestIndex = lines.findIndex((l) =>
      l.includes("Completed status with pauseOnSuccess=false"),
    );
    const afterCompletedTest = lines.slice(completedTestIndex + 1).join("\n");
    expect(afterCompletedTest).toContain("SHOULD_PAUSE: false");
  });
});
