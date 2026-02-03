## Task: Headless Mode Validation Handler

**Story:** [STORY-002-prebuild-validation](../stories/STORY-002-prebuild-validation.md)

**Depends on:** [TASK-017-validation-invoke](./TASK-017-validation-invoke.md)

### Goal

Implement the headless mode handler for pre-build validation that writes a feedback file with validation details and marks the subtask for skipping.

### Context

When `ralph build --validate-first` runs in headless mode (no TTY) and validation finds a misaligned subtask, the system should:
1. Write a feedback file to `<milestone>/feedback/` with validation details
2. Skip the subtask (don't attempt to build it)
3. Continue to the next subtask

This enables overnight batch builds where the developer reviews feedback files in the morning.

### Plan

1. Add headless validation handler to `tools/src/commands/ralph/validation.ts`:
   ```typescript
   import { mkdirSync, writeFileSync } from "node:fs";
   import path from "node:path";

   /**
    * Handle validation failure in headless mode
    *
    * Writes a feedback file with validation details for later review.
    * The subtask will be skipped in the build loop.
    *
    * @param subtask - The misaligned subtask
    * @param result - The validation result with reason and suggestion
    * @param milestonePath - Path to milestone directory (for feedback file)
    * @returns Path to the created feedback file
    */
   function handleHeadlessValidationFailure(
     subtask: Subtask,
     result: ValidationResult,
     milestonePath: string,
   ): string {
     // Ensure feedback directory exists
     const feedbackDir = path.join(milestonePath, "feedback");
     mkdirSync(feedbackDir, { recursive: true });

     // Generate filename: YYYY-MM-DD_validation_SUB-XXX.md
     const date = new Date().toISOString().split("T")[0];
     const filename = `${date}_validation_${subtask.id}.md`;
     const filepath = path.join(feedbackDir, filename);

     // Generate feedback content
     const content = generateValidationFeedback(subtask, result);

     // Write file
     writeFileSync(filepath, content, "utf8");
     console.log(`[Validation:${subtask.id}] Wrote feedback: ${filepath}`);

     return filepath;
   }

   /**
    * Generate markdown content for validation feedback file
    *
    * @param subtask - The misaligned subtask
    * @param result - The validation result
    * @returns Markdown string for feedback file
    */
   function generateValidationFeedback(
     subtask: Subtask,
     result: ValidationResult,
   ): string {
     const issueLabel = result.issueType !== undefined
       ? formatIssueType(result.issueType)
       : "Unknown";

     const sections: Array<string> = [];

     // Header
     sections.push(`# Validation Feedback: ${subtask.id}`);
     sections.push("");
     sections.push(`**Generated:** ${new Date().toISOString()}`);
     sections.push(`**Subtask:** ${subtask.id} - ${subtask.title}`);
     sections.push(`**Issue Type:** ${issueLabel}`);
     sections.push(`**Task Reference:** ${subtask.taskRef}`);
     if (subtask.storyRef !== undefined && subtask.storyRef !== null) {
       sections.push(`**Story Reference:** ${subtask.storyRef}`);
     }
     sections.push("");

     // Reason section
     sections.push("## Validation Failure");
     sections.push("");
     sections.push(result.reason ?? "No reason provided.");
     sections.push("");

     // Suggestion section (if available)
     if (result.suggestion !== undefined) {
       sections.push("## Suggested Fix");
       sections.push("");
       sections.push(result.suggestion);
       sections.push("");
     }

     // Original subtask definition
     sections.push("## Subtask Definition");
     sections.push("");
     sections.push("```json");
     sections.push(JSON.stringify(subtask, null, 2));
     sections.push("```");
     sections.push("");

     // Resolution instructions
     sections.push("## How to Resolve");
     sections.push("");
     sections.push("Choose one of the following:");
     sections.push("");
     sections.push("### Option 1: Fix the subtask");
     sections.push("");
     sections.push("Edit `subtasks.json` to address the validation issue:");
     sections.push("");
     sections.push("1. Open `subtasks.json`");
     sections.push(`2. Find subtask \`${subtask.id}\``);
     sections.push("3. Modify the subtask to address the issue");
     sections.push("4. Re-run `ralph build --validate-first`");
     sections.push("");
     sections.push("### Option 2: Skip validation for this subtask");
     sections.push("");
     sections.push("If you understand the issue and want to proceed anyway:");
     sections.push("");
     sections.push("```bash");
     sections.push("# Run build without validation");
     sections.push("aaa ralph build --subtasks <path>");
     sections.push("```");
     sections.push("");
     sections.push("### Option 3: Remove the subtask");
     sections.push("");
     sections.push(`If this subtask shouldn't exist, remove it from \`subtasks.json\`.`);
     sections.push("");
     sections.push("---");
     sections.push("*Generated by Ralph pre-build validation*");
     sections.push("");

     return sections.join("\n");
   }
   ```

2. Add tracking type for skipped subtasks:
   ```typescript
   /**
    * Record of a subtask skipped due to validation failure
    */
   interface SkippedSubtask {
     /** Feedback file path */
     feedbackPath: string;
     /** Validation issue type */
     issueType?: ValidationIssueType;
     /** Validation failure reason */
     reason: string;
     /** Subtask ID */
     subtaskId: string;
   }
   ```

3. Export new types and functions from validation.ts:
   ```typescript
   export {
     // ... existing exports
     type SkippedSubtask,
     generateValidationFeedback,
     handleHeadlessValidationFailure,
   };
   ```

### Acceptance Criteria

- [ ] `handleHeadlessValidationFailure()` creates feedback directory if missing
- [ ] Feedback file written to `<milestone>/feedback/` directory
- [ ] Filename format: `YYYY-MM-DD_validation_<subtask-id>.md`
- [ ] File contains subtask ID and title
- [ ] File contains issue type (formatted nicely)
- [ ] File contains validation reason
- [ ] File contains suggestion when present
- [ ] File contains original subtask JSON
- [ ] File contains resolution instructions with three options
- [ ] Returns path to created feedback file
- [ ] Console output confirms feedback file location

### Test Plan

- [ ] Unit test: `generateValidationFeedback()` includes all required sections
- [ ] Unit test: `generateValidationFeedback()` handles missing optional fields
- [ ] Unit test: `handleHeadlessValidationFailure()` creates feedback directory
- [ ] Unit test: `handleHeadlessValidationFailure()` returns correct path
- [ ] Manual test: Verify feedback file is human-readable
- [ ] Manual test: Verify resolution instructions are actionable

### Scope

- **In:** Feedback file generation, directory creation, markdown formatting
- **Out:** Validation invocation (TASK-017), supervised handler (TASK-018), build loop integration (TASK-020)

### Notes

**Feedback file naming:**
Uses date prefix for chronological sorting when reviewing multiple feedback files. The subtask ID is included to easily identify which subtask failed.

**Resolution instructions:**
Three options provided because different situations call for different responses:
1. Fix the subtask - most common, the subtask definition needs refinement
2. Skip validation - when the issue is understood and accepted
3. Remove subtask - when the subtask was auto-generated incorrectly

**Subtask JSON inclusion:**
The full subtask JSON is included so the feedback file is self-contained. The reviewer doesn't need to cross-reference subtasks.json to understand what was validated.

**Directory structure:**
Feedback files go in `<milestone>/feedback/` which is the same location used by other feedback mechanisms (e.g., exit-unstaged from TASK-015). This keeps all asynchronous review materials in one place.

### Related Documentation

- @context/workflows/ralph/building/pre-build-validation.md - Validation prompt that generates the result
- tools/src/commands/ralph/approvals.ts - Similar feedback file pattern for exit-unstaged
