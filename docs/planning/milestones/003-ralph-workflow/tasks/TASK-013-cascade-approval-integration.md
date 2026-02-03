## Task: Cascade Approval Integration

**Story:** [STORY-001-artifact-approvals](../stories/STORY-001-artifact-approvals.md)

**Depends on:**
- [TASK-009-approval-config-loading](./TASK-009-approval-config-loading.md)
- [TASK-010-approval-evaluation](./TASK-010-approval-evaluation.md)
- [TASK-011-cli-approval-flags](./TASK-011-cli-approval-flags.md)
- [TASK-012-tty-approval-prompt](./TASK-012-tty-approval-prompt.md)

### Goal

Wire approval evaluation into cascade execution so each planning level checks approval gates before proceeding.

### Context

With evaluation logic, config loading, CLI flags, and TTY prompting in place, we need to integrate everything into the cascade orchestration. Before executing each planning level, cascade should:
1. Determine which approval gate applies to that level
2. Call `evaluateApproval()` with the gate, config, and context
3. Dispatch to the appropriate handler based on the returned action
4. Either proceed, abort, or exit with special handling

This task wires up the flow. The `"notify-wait"` and `"exit-unstaged"` actions will have placeholder implementations that log TODO and use fallback behavior - full implementations come in subsequent tasks.

### Plan

1. Add imports at top of `tools/src/commands/ralph/cascade.ts`:
   ```typescript
   import { loadAaaConfig } from "@tools/lib/config";
   import type { ApprovalGate, ApprovalsConfig } from "@tools/lib/config";
   import {
     type ApprovalAction,
     type ApprovalContext,
     evaluateApproval,
     promptApproval,
   } from "./approvals";
   ```

2. Add `levelToGate()` mapping function:
   ```typescript
   /**
    * Map cascade level to its approval gate
    *
    * Planning levels have approval gates; execution levels don't.
    * Calibrate has its own gates (onDriftDetected) handled separately.
    */
   function levelToGate(level: CascadeLevelName): ApprovalGate | null {
     const mapping: Record<CascadeLevelName, ApprovalGate | null> = {
       roadmap: "createRoadmap",
       stories: "createStories",
       tasks: "createTasks",
       subtasks: "createSubtasks",
       build: null,
       calibrate: null,
     };
     return mapping[level];
   }
   ```

3. Update `CascadeFromOptions` interface:
   ```typescript
   interface CascadeFromOptions {
     calibrateEvery?: number;
     contextRoot: string;
     forceFlag?: boolean;
     headless?: boolean;
     reviewFlag?: boolean;
     subtasksPath: string;
   }
   ```

4. Add `buildApprovalContext()` helper:
   ```typescript
   /**
    * Build ApprovalContext from cascade options
    */
   function buildApprovalContext(options: CascadeFromOptions): ApprovalContext {
     return {
       forceFlag: options.forceFlag ?? false,
       isTTY: process.stdin.isTTY === true && options.headless !== true,
       reviewFlag: options.reviewFlag ?? false,
     };
   }
   ```

5. Add `ApprovalResult` type and `checkApprovalGate()` function:
   ```typescript
   /**
    * Result of an approval gate check
    */
   type ApprovalResult = "aborted" | "continue" | "exit-unstaged";

   /**
    * Check approval gate before executing a cascade level
    *
    * @param level - Cascade level to check
    * @param config - Approval configuration (from aaa.config.json)
    * @param context - Runtime context (TTY state, CLI flags)
    * @returns Action result: continue, aborted, or exit-unstaged
    */
   async function checkApprovalGate(
     level: CascadeLevelName,
     config: ApprovalsConfig | undefined,
     context: ApprovalContext
   ): Promise<ApprovalResult> {
     const gate = levelToGate(level);

     // No gate for this level (e.g., build) - continue
     if (gate === null) {
       return "continue";
     }

     const action = evaluateApproval(gate, config, context);

     switch (action) {
       case "write":
         // Auto-approved, proceed
         return "continue";

       case "prompt": {
         // TTY + always mode: show prompt
         const summary = `Proceeding with ${level} level`;
         const approved = await promptApproval(gate, summary);
         return approved ? "continue" : "aborted";
       }

       case "notify-wait":
         // TODO TASK-014: Send notification, wait suggestWaitSeconds
         console.log(`[Approval] notify-wait for ${gate} - continuing (not yet implemented)`);
         return "continue";

       case "exit-unstaged":
         // TODO TASK-015: Create checkpoint, write unstaged, write feedback
         console.log(`[Approval] exit-unstaged for ${gate} - exiting (not yet implemented)`);
         return "exit-unstaged";

       default:
         return "continue";
     }
   }
   ```

6. Update `runCascadeFrom()` to integrate approval checks:
   ```typescript
   async function runCascadeFrom(
     start: string,
     target: string,
     options: CascadeFromOptions,
   ): Promise<CascadeFromResult> {
     // Load approval config once at start
     const aaaConfig = loadAaaConfig();
     const approvalConfig = aaaConfig.ralph?.approvals;

     // Build approval context from options
     const approvalContext = buildApprovalContext(options);

     // ... existing validation code ...

     for (const currentLevel of levelsToExecute) {
       // ... existing prompt for continuation code ...

       // NEW: Check approval gate before executing level
       const approvalResult = await checkApprovalGate(
         currentLevel as CascadeLevelName,
         approvalConfig,
         approvalContext
       );

       if (approvalResult === "aborted") {
         return {
           completedLevels,
           error: "Aborted by user at approval prompt",
           stoppedAt: currentLevel,
           success: false,
         };
       }

       if (approvalResult === "exit-unstaged") {
         // Special exit for headless + always mode
         // Artifacts written as unstaged, user will review
         return {
           completedLevels,
           error: null,
           stoppedAt: currentLevel,
           success: false, // Not "successful" completion, but not an error
         };
       }

       // Execute the level
       console.log(`\n=== Running cascade level: ${currentLevel} ===\n`);
       const levelError = await runLevel(currentLevel, runOptions);

       // ... rest of existing code ...
     }
   }
   ```

7. Export `levelToGate` and `ApprovalResult` for testing:
   ```typescript
   export {
     type ApprovalResult,
     // ... existing exports ...
     levelToGate,
   };
   ```

### Acceptance Criteria

- [ ] `levelToGate()` correctly maps:
  - `roadmap` → `"createRoadmap"`
  - `stories` → `"createStories"`
  - `tasks` → `"createTasks"`
  - `subtasks` → `"createSubtasks"`
  - `build` → `null`
  - `calibrate` → `null`
- [ ] `buildApprovalContext()` constructs context from options
- [ ] `checkApprovalGate()` calls `evaluateApproval()` and returns appropriate result
- [ ] `runCascadeFrom()` calls `checkApprovalGate()` before each planning level
- [ ] `"write"` action: level executes immediately
- [ ] `"prompt"` action: `promptApproval()` called, rejection returns `"aborted"`
- [ ] `"notify-wait"` action: logs placeholder message, returns `"continue"`
- [ ] `"exit-unstaged"` action: logs placeholder message, returns `"exit-unstaged"`
- [ ] User abort at prompt returns error "Aborted by user at approval prompt"
- [ ] CLI flags (`forceFlag`, `reviewFlag`) flow through to `ApprovalContext`
- [ ] Config loaded via `loadAaaConfig().ralph?.approvals`

### Test Plan

- [ ] Manual: Set `createStories: "always"` in config, run cascade in TTY → prompt appears
- [ ] Manual: Reject prompt at stories level → cascade aborts with message
- [ ] Manual: Approve prompt → cascade continues to next level
- [ ] Manual: Run with `--force` flag → no prompts appear
- [ ] Manual: Set `createSubtasks: "suggest"`, run headless → logs notify-wait TODO
- [ ] Manual: Set `createTasks: "always"`, run headless → logs exit-unstaged TODO
- [ ] Unit test: `levelToGate()` returns correct gates
- [ ] Unit test: `buildApprovalContext()` constructs context correctly
- [ ] TypeScript compiles without errors (`bun run typecheck`)

### Scope

- **In:** Integration wiring, level-to-gate mapping, context building, action dispatch, placeholder implementations
- **Out:** Full `notify-wait` implementation (TASK-014), full `exit-unstaged` implementation (TASK-015), rich summary generation

### Notes

**Placeholder implementations:**
The `"notify-wait"` and `"exit-unstaged"` actions have placeholder implementations that log messages and use fallback behavior:
- `notify-wait` logs and continues (as if auto-approved)
- `exit-unstaged` logs and returns the special result (cascade stops)

This allows testing the full wiring before implementing the complex handlers.

**Calibrate special handling:**
The calibrate level uses `onDriftDetected` and `correctionTasks` gates, but these are triggered by calibration findings, not by entering the level. That integration is separate from this cascade-level approval check.

**Summary generation:**
Currently the prompt shows a simple "Proceeding with X level" message. Future enhancement: generate richer summaries showing what files will be created. This can be improved later without changing the wiring.

**Exit-unstaged result:**
When `checkApprovalGate()` returns `"exit-unstaged"`, the cascade returns with `success: false` but `error: null`. This distinguishes "user needs to review" from "something went wrong". The caller can check `stoppedAt` to know where to resume with `--from`.
