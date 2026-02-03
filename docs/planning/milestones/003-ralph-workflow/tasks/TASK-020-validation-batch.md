## Task: Batch Validation Integration in Build Loop

**Story:** [STORY-002-prebuild-validation](../stories/STORY-002-prebuild-validation.md)

**Depends on:** [TASK-018-validation-supervised](./TASK-018-validation-supervised.md), [TASK-019-validation-headless](./TASK-019-validation-headless.md)

### Goal

Integrate pre-build validation into the build loop: validate ALL pending subtasks before starting any iterations, report summary, and track skipped subtasks.

### Context

The `--validate-first` flag in `ralph build` is currently a stub at lines 714-718 in build.ts. This task replaces that stub with full batch validation that:
1. Validates all pending subtasks before starting iterations
2. Uses mode-appropriate handlers (supervised vs headless)
3. Reports summary ("Validated 18/20 subtasks. 2 skipped due to misalignment.")
4. Tracks skipped subtasks so the build loop excludes them
5. Fires `onValidationFail` hook for notifications

### Plan

1. Add batch validation orchestrator to `tools/src/commands/ralph/validation.ts`:
   ```typescript
   import { executeHook } from "./hooks";

   /**
    * Result of batch validation
    */
   interface BatchValidationResult {
     /** Number of subtasks that passed validation */
     aligned: number;
     /** Whether all subtasks passed (or were skipped gracefully) */
     success: boolean;
     /** Subtasks that failed validation and should be skipped */
     skippedSubtasks: Array<SkippedSubtask>;
     /** Total number of subtasks validated */
     total: number;
   }

   /**
    * Validate all pending subtasks before starting iterations
    *
    * Runs validation on each pending subtask and collects results.
    * In supervised mode, prompts user for each failure.
    * In headless mode, writes feedback files and marks for skip.
    *
    * @param pendingSubtasks - Array of pending subtasks to validate
    * @param options - Build options (for mode detection)
    * @param milestonePath - Path to milestone directory
    * @param contextRoot - Repository root path
    * @returns BatchValidationResult with aligned count and skipped subtasks
    */
   async function validateAllSubtasks(
     pendingSubtasks: Array<Subtask>,
     options: { mode: "headless" | "supervised"; subtasksPath: string },
     milestonePath: string,
     contextRoot: string,
   ): Promise<BatchValidationResult> {
     const skippedSubtasks: Array<SkippedSubtask> = [];
     let alignedCount = 0;

     console.log(`\n=== Pre-build Validation ===`);
     console.log(`Validating ${pendingSubtasks.length} pending subtasks...\n`);

     for (const subtask of pendingSubtasks) {
       // eslint-disable-next-line no-await-in-loop -- Sequential validation for clear output
       const result = await validateSubtask(
         { milestonePath, subtask, subtasksPath: options.subtasksPath },
         contextRoot,
       );

       if (result.aligned) {
         alignedCount += 1;
         console.log(`  ${subtask.id}: ${chalk.green("aligned")}`);
       } else {
         console.log(`  ${subtask.id}: ${chalk.red("misaligned")} - ${result.reason?.slice(0, 50)}...`);

         // Handle based on mode
         if (options.mode === "supervised") {
           // eslint-disable-next-line no-await-in-loop -- Must wait for user input
           const action = await handleSupervisedValidationFailure(subtask, result);
           if (action === "skip") {
             skippedSubtasks.push({
               feedbackPath: "",  // No feedback file in supervised mode
               issueType: result.issueType,
               reason: result.reason ?? "Unknown",
               subtaskId: subtask.id,
             });
           } else {
             // User chose to continue despite failure
             alignedCount += 1;
           }
         } else {
           // Headless mode: write feedback and skip
           const feedbackPath = handleHeadlessValidationFailure(
             subtask,
             result,
             milestonePath,
           );
           skippedSubtasks.push({
             feedbackPath,
             issueType: result.issueType,
             reason: result.reason ?? "Unknown",
             subtaskId: subtask.id,
           });

           // Fire validation fail hook for notification
           // eslint-disable-next-line no-await-in-loop -- Must await hook
           await executeHook("onValidationFail", {
             message: `Subtask ${subtask.id} failed validation: ${result.reason?.slice(0, 100)}`,
             milestone: getMilestoneFromPath(milestonePath),
             subtaskId: subtask.id,
           });
         }
       }
     }

     // Print summary
     console.log();
     printValidationSummary(pendingSubtasks.length, alignedCount, skippedSubtasks);

     return {
       aligned: alignedCount,
       skippedSubtasks,
       success: skippedSubtasks.length === 0,
       total: pendingSubtasks.length,
     };
   }

   /**
    * Print validation summary
    */
   function printValidationSummary(
     total: number,
     aligned: number,
     skipped: Array<SkippedSubtask>,
   ): void {
     if (skipped.length === 0) {
       console.log(chalk.green(`Validated ${total}/${total} subtasks. All aligned.`));
     } else {
       console.log(chalk.yellow(
         `Validated ${aligned}/${total} subtasks. ${skipped.length} skipped due to misalignment.`
       ));
       console.log();
       console.log("Skipped subtasks:");
       for (const s of skipped) {
         const issueLabel = s.issueType !== undefined ? ` (${formatIssueType(s.issueType)})` : "";
         console.log(`  - ${s.subtaskId}${issueLabel}`);
         if (s.feedbackPath !== "") {
           console.log(`    Feedback: ${s.feedbackPath}`);
         }
       }
     }
     console.log();
   }

   /**
    * Extract milestone name from path
    */
   function getMilestoneFromPath(milestonePath: string): string {
     return path.basename(milestonePath);
   }
   ```

2. Update `runBuild()` in `tools/src/commands/ralph/build.ts` to call batch validation:
   ```typescript
   // Replace the stub at lines 714-718 with:
   if (shouldValidateFirst) {
     const pendingSubtasks = getPendingSubtasks(subtasksFile.subtasks);

     if (pendingSubtasks.length > 0) {
       const milestonePath = path.dirname(subtasksPath);
       const validationResult = await validateAllSubtasks(
         pendingSubtasks,
         { mode, subtasksPath },
         milestonePath,
         contextRoot,
       );

       // Track skipped subtasks by ID for exclusion in build loop
       const skippedIds = new Set(
         validationResult.skippedSubtasks.map((s) => s.subtaskId)
       );

       // Filter pending subtasks to exclude skipped ones
       // This modifies the iteration loop behavior
       skippedSubtaskIds = skippedIds;  // Module-level or pass through options
     }
   }
   ```

3. Update the build loop to skip validated-failed subtasks:
   ```typescript
   // In the main iteration loop, after getting next subtask:
   if (skippedSubtaskIds !== null && skippedSubtaskIds.has(currentSubtask.id)) {
     console.log(`Skipping ${currentSubtask.id} (failed validation)`);
     continue;
   }
   ```

4. Export `validateAllSubtasks` and `BatchValidationResult` from validation.ts

5. Add necessary imports to build.ts:
   ```typescript
   import { validateAllSubtasks } from "./validation";
   ```

### Acceptance Criteria

- [ ] `--validate-first` triggers batch validation before iterations start
- [ ] All pending subtasks validated in sequence
- [ ] Console output shows validation status for each subtask
- [ ] Supervised mode: prompts user for each failure, respects choice
- [ ] Headless mode: writes feedback file, marks for skip
- [ ] Validation summary printed: "Validated X/Y subtasks. Z skipped due to misalignment."
- [ ] Skipped subtasks excluded from build loop iterations
- [ ] `onValidationFail` hook fired for each failure in headless mode
- [ ] Build loop proceeds with aligned subtasks after validation

### Test Plan

- [ ] Unit test: `validateAllSubtasks()` counts aligned/skipped correctly
- [ ] Unit test: `validateAllSubtasks()` calls mode-appropriate handlers
- [ ] Unit test: `printValidationSummary()` formats correctly for all-aligned case
- [ ] Unit test: `printValidationSummary()` formats correctly for some-skipped case
- [ ] E2E test: `ralph build --validate-first` with all-aligned subtasks -> all processed
- [ ] E2E test: `ralph build --validate-first --headless` with misaligned subtask -> feedback file created, subtask skipped
- [ ] Manual test: Supervised mode with misaligned subtask -> prompt appears, can skip or continue
- [ ] Manual test: Headless mode -> notification sent via onValidationFail hook

### Scope

- **In:** Batch orchestration, build loop integration, summary reporting, hook firing, skip tracking
- **Out:** Individual validation logic (TASK-016/017), mode handlers (TASK-018/019)

### Notes

**Validation before ANY iteration:**
The story specifies validating ALL subtasks before starting ANY iterations. This is different from validating each subtask just before its iteration. The batch approach:
- Catches all issues upfront
- Gives complete picture before committing to build time
- Allows user to fix all issues at once rather than iteratively

**Skip tracking approach:**
Using a Set of subtask IDs to track which should be skipped. This is passed to the build loop (either as module-level state or through options) so `getNextSubtask()` can exclude them.

Alternative: Mark subtasks as `skipped: true` in memory (not persisted to file). This keeps the original subtasks.json unchanged.

**Hook firing:**
`onValidationFail` is configured in ralph.config.json and defaults to `["log", "notify"]`. In headless/overnight builds, notifications let the developer know there were issues.

**Graceful degradation:**
If a subtask's validation times out or fails to parse, it's treated as aligned (per TASK-016/017). The batch validation doesn't fail on individual timeout - it proceeds to the next subtask.

### Related Documentation

- @context/workflows/ralph/building/pre-build-validation.md - The validation prompt
- tools/src/commands/ralph/build.ts - Build loop to integrate with
- tools/src/commands/ralph/hooks.ts - Hook execution for notifications
