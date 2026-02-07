## Task: Invoke Validation Prompt in Build Loop

**Story:** [STORY-002-prebuild-validation](../stories/STORY-002-prebuild-validation.md)

**Depends on:** [TASK-016-validation-types](./TASK-016-validation-types.md)

### Goal

Implement the core validation invocation logic that calls Claude with the pre-build-validation prompt, enforces a 60-second timeout, and handles graceful degradation when parent chain files are missing.

### Context

The `--validate-first` flag in `ralph build` is currently a stub (lines 714-718 in build.ts). This task implements the actual Claude invocation for pre-build validation. The validation prompt is at `context/workflows/ralph/building/pre-build-validation.md`.

Key requirements:
- 60-second timeout per subtask validation
- Graceful degradation when taskRef or storyRef files don't exist
- Use Haiku model for fast, cheap validation (not full Opus)

### Plan

1. Add validation invocation function to `tools/src/commands/ralph/validation.ts`:
   ```typescript
   import { existsSync, readFileSync } from "node:fs";
   import path from "node:path";

   import type { Subtask } from "./types";
   import { invokeClaudeHaiku } from "./claude";

   /**
    * Default timeout for validation prompt (60 seconds)
    */
   const VALIDATION_TIMEOUT_MS = 60_000;

   /**
    * Path to pre-build validation prompt relative to context root
    */
   const VALIDATION_PROMPT_PATH = "context/workflows/ralph/building/pre-build-validation.md";

   /**
    * Validate a single subtask against its parent chain
    *
    * Invokes the pre-build-validation prompt with:
    * - Subtask definition (always present)
    * - Parent Task file (if taskRef exists and file found)
    * - Parent Story file (if Task has storyRef and file found)
    *
    * @param context - Validation context with subtask and paths
    * @param contextRoot - Repository root path
    * @returns ValidationResult from parsing Claude's response
    */
   async function validateSubtask(
     context: ValidationContext,
     contextRoot: string,
   ): Promise<ValidationResult> {
     const { milestonePath, subtask, subtasksPath } = context;

     console.log(`[Validation] Validating ${subtask.id}: ${subtask.title}`);

     // Build the prompt with context
     const prompt = buildValidationPrompt(subtask, milestonePath, contextRoot);

     // Invoke Haiku with timeout handling
     const startTime = Date.now();
     const result = invokeClaudeHaiku({
       prompt,
       timeout: VALIDATION_TIMEOUT_MS,
     });

     const elapsedMs = Date.now() - startTime;

     // Handle timeout
     if (result === null && elapsedMs >= VALIDATION_TIMEOUT_MS - 1000) {
       console.warn(`[Validation:${subtask.id}] Timed out after ${Math.round(elapsedMs / 1000)}s, proceeding as aligned`);
       return { aligned: true };
     }

     // Handle other failures
     if (result === null) {
       console.warn(`[Validation:${subtask.id}] Invocation failed, proceeding as aligned`);
       return { aligned: true };
     }

     // Parse response
     return parseValidationResponse(result, subtask.id);
   }
   ```

2. Add prompt builder that resolves parent chain:
   ```typescript
   /**
    * Build validation prompt with resolved parent chain
    *
    * Resolves taskRef -> Task file -> storyRef -> Story file
    * and includes whatever exists in the prompt context.
    *
    * @param subtask - Subtask to validate
    * @param milestonePath - Path to milestone directory
    * @param contextRoot - Repository root path
    * @returns Full prompt string for Claude
    */
   function buildValidationPrompt(
     subtask: Subtask,
     milestonePath: string,
     contextRoot: string,
   ): string {
     const promptPath = path.join(contextRoot, VALIDATION_PROMPT_PATH);

     if (!existsSync(promptPath)) {
       throw new Error(`Validation prompt not found: ${promptPath}`);
     }

     const basePrompt = readFileSync(promptPath, "utf8");

     // Build context parts
     const contextParts: Array<string> = [];

     // Always include subtask definition
     contextParts.push(`## Subtask Definition\n\n\`\`\`json\n${JSON.stringify(subtask, null, 2)}\n\`\`\``);

     // Resolve parent Task if taskRef exists
     const { storyRef, taskContent } = resolveParentTask(subtask.taskRef, milestonePath);
     if (taskContent !== null) {
       contextParts.push(`## Parent Task\n\n${taskContent}`);
     } else {
       contextParts.push(`## Parent Task\n\n*Not found: ${subtask.taskRef}*`);
     }

     // Resolve parent Story if storyRef exists
     if (storyRef !== null) {
       const storyContent = resolveParentStory(storyRef, milestonePath);
       if (storyContent !== null) {
         contextParts.push(`## Parent Story\n\n${storyContent}`);
       } else {
         contextParts.push(`## Parent Story\n\n*Not found: ${storyRef}*`);
       }
     }

     // Combine prompt with context
     return `${basePrompt}\n\n---\n\n# Validation Input\n\n${contextParts.join("\n\n")}`;
   }

   /**
    * Resolve parent Task file and extract storyRef
    *
    * @returns Object with taskContent and storyRef (if found in Task)
    */
   function resolveParentTask(
     taskRef: string,
     milestonePath: string,
   ): { storyRef: string | null; taskContent: string | null } {
     // Find task file matching pattern TASK-NNN-*.md
     const tasksDir = path.join(milestonePath, "tasks");
     if (!existsSync(tasksDir)) {
       return { storyRef: null, taskContent: null };
     }

     const taskFiles = readdirSync(tasksDir);
     const taskFile = taskFiles.find((f) => f.startsWith(taskRef));
     if (taskFile === undefined) {
       return { storyRef: null, taskContent: null };
     }

     const taskPath = path.join(tasksDir, taskFile);
     const taskContent = readFileSync(taskPath, "utf8");

     // Extract storyRef from Task markdown (look for **Story:** link)
     const storyMatch = taskContent.match(/\*\*Story:\*\*.*\[([^\]]+)\]/);
     const storyRef = storyMatch !== null ? storyMatch[1] : null;

     return { storyRef, taskContent };
   }

   /**
    * Resolve parent Story file
    */
   function resolveParentStory(
     storyRef: string,
     milestonePath: string,
   ): string | null {
     // Find story file matching pattern STORY-NNN-*.md
     const storiesDir = path.join(milestonePath, "stories");
     if (!existsSync(storiesDir)) {
       return null;
     }

     const storyFiles = readdirSync(storiesDir);
     const storyFile = storyFiles.find((f) => f.startsWith(storyRef));
     if (storyFile === undefined) {
       return null;
     }

     const storyPath = path.join(storiesDir, storyFile);
     return readFileSync(storyPath, "utf8");
   }
   ```

3. Export `validateSubtask` and related functions

4. Add necessary imports (`readdirSync` from node:fs)

### Acceptance Criteria

- [ ] `validateSubtask()` invokes Claude Haiku with pre-build-validation prompt
- [ ] Prompt includes subtask JSON definition
- [ ] Prompt includes parent Task content when taskRef resolves to a file
- [ ] Prompt includes parent Story content when Task has storyRef that resolves
- [ ] Missing parent files noted in prompt but don't cause failure
- [ ] Returns `{aligned: true}` on timeout with warning logged
- [ ] Returns `{aligned: true}` on invocation failure with warning logged
- [ ] Parses valid responses using `parseValidationResponse()`
- [ ] Console output shows which subtask is being validated

### Test Plan

- [ ] Unit test: `buildValidationPrompt()` includes subtask JSON
- [ ] Unit test: `buildValidationPrompt()` includes Task content when file exists
- [ ] Unit test: `buildValidationPrompt()` includes Story content when storyRef in Task
- [ ] Unit test: `buildValidationPrompt()` handles missing Task file gracefully
- [ ] Unit test: `buildValidationPrompt()` handles missing Story file gracefully
- [ ] Unit test: `resolveParentTask()` extracts storyRef from Task markdown
- [ ] Unit test: `resolveParentTask()` returns null for missing files
- [ ] Integration test: `validateSubtask()` calls Haiku and parses response
- [ ] Manual test: Run validation on subtask with full parent chain

### Scope

- **In:** Claude invocation, prompt building, parent chain resolution, timeout handling
- **Out:** Mode-specific handling (TASK-018/019), batch validation (TASK-020), build loop integration

### Notes

**Timeout implementation:**
The Haiku invocation function in claude.ts doesn't directly support timeout with Bun.spawnSync. The timeout is passed but may need adjustment if Haiku invocations don't respect it. The caller (validateSubtask) checks elapsed time and treats long-running calls as timeouts.

**Parent chain resolution strategy:**
1. Start with subtask (always available)
2. Look up Task file using taskRef pattern match
3. Extract storyRef from Task's `**Story:**` line
4. Look up Story file using storyRef pattern match

This matches how the planning chain is structured in the milestone.

**Model choice:**
Using Haiku (claude-3-5-haiku-latest) for validation because:
- Fast (typically <10s)
- Cheap ($0.25/1M input, $1.25/1M output vs Opus $15/$75)
- Sufficient capability for alignment checking

### Related Documentation

- @context/workflows/ralph/building/pre-build-validation.md - The validation prompt
- tools/src/commands/ralph/claude.ts - invokeClaudeHaiku function
