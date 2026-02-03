## Task: Headless Notify-Wait Handler

**Story:** [STORY-001-artifact-approvals](../stories/STORY-001-artifact-approvals.md)

**Depends on:**
- [TASK-009-approval-config-loading](./TASK-009-approval-config-loading.md) (for `suggestWaitSeconds`)
- [TASK-013-cascade-approval-integration](./TASK-013-cascade-approval-integration.md) (integration point)

### Goal

Implement the `"notify-wait"` action handler for headless suggest mode: send notification, wait configured seconds, then continue.

### Context

When `evaluateApproval()` returns `"notify-wait"` (headless + `"suggest"` mode), the cascade should:
1. Send a notification informing the user what's about to be created
2. Wait for `suggestWaitSeconds` (default 180 = 3 minutes)
3. Continue with artifact creation

This gives users running overnight/CI builds a chance to see what's happening and intervene if needed, while not blocking indefinitely.

### Plan

1. Add `sleep()` helper function to `tools/src/commands/ralph/approvals.ts`:
   ```typescript
   /**
    * Sleep for a given number of milliseconds
    */
   function sleep(ms: number): Promise<void> {
     return new Promise((resolve) => {
       setTimeout(resolve, ms);
     });
   }
   ```

2. Add `handleNotifyWait()` function to `tools/src/commands/ralph/approvals.ts`:
   ```typescript
   import { loadAaaConfig } from "@tools/lib/config";
   import { sendNotification } from "../notify/client";

   /** Default wait time for suggest mode in headless */
   const DEFAULT_SUGGEST_WAIT_SECONDS = 180;

   /**
    * Handle notify-wait action for headless suggest mode
    *
    * Sends notification about pending artifact creation,
    * waits for suggestWaitSeconds, then returns to continue.
    *
    * @param gate - Which approval gate triggered this
    * @param config - Approval configuration (for suggestWaitSeconds)
    * @param summary - Description of what will be created
    */
   async function handleNotifyWait(
     gate: ApprovalGate,
     config: ApprovalsConfig | undefined,
     summary: string
   ): Promise<void> {
     const waitSeconds = config?.suggestWaitSeconds ?? DEFAULT_SUGGEST_WAIT_SECONDS;
     const gateDisplay = formatGateName(gate);

     // Load notify config
     const aaaConfig = loadAaaConfig();
     const notify = aaaConfig.notify;

     // Send notification if enabled and configured
     if (
       notify?.enabled !== false &&
       notify?.server !== undefined &&
       notify?.defaultTopic !== undefined
     ) {
       try {
         await sendNotification({
           message: `${summary}\n\nProceeding in ${waitSeconds} seconds...`,
           priority: "default",
           server: notify.server,
           title: `Ralph: ${gateDisplay}`,
           topic: notify.defaultTopic,
           username: notify.username,
         });
         console.log(`[Approval] Notification sent for ${gateDisplay}`);
       } catch (error) {
         // Log but don't fail on notification error
         const message = error instanceof Error ? error.message : String(error);
         console.warn(`[Approval] Failed to send notification: ${message}`);
       }
     } else {
       console.log(`[Approval] Notifications not configured, skipping notify`);
     }

     // Wait before proceeding
     console.log(`[Approval] Waiting ${waitSeconds}s before proceeding with ${gateDisplay}...`);
     await sleep(waitSeconds * 1000);
     console.log(`[Approval] Wait complete, proceeding`);
   }
   ```

3. Export `handleNotifyWait` and `DEFAULT_SUGGEST_WAIT_SECONDS` from `approvals.ts`:
   ```typescript
   export {
     type ApprovalAction,
     type ApprovalContext,
     DEFAULT_SUGGEST_WAIT_SECONDS,
     evaluateApproval,
     formatGateName,
     handleNotifyWait,
     promptApproval,
   };
   ```

4. Update `checkApprovalGate()` in `tools/src/commands/ralph/cascade.ts` to use handler:
   ```typescript
   case "notify-wait": {
     const summary = `Proceeding with ${level} level`;
     await handleNotifyWait(gate, approvalConfig, summary);
     return "continue";
   }
   ```

5. Add import in `cascade.ts`:
   ```typescript
   import {
     // ... existing imports
     handleNotifyWait,
   } from "./approvals";
   ```

### Acceptance Criteria

- [ ] `handleNotifyWait()` function exported from `approvals.ts`
- [ ] `DEFAULT_SUGGEST_WAIT_SECONDS` constant exported (value: 180)
- [ ] Sends notification with:
  - Title: "Ralph: [Gate Display Name]"
  - Message: summary + "Proceeding in X seconds..."
  - Priority: "default"
- [ ] Uses `config.suggestWaitSeconds` when specified
- [ ] Falls back to 180 seconds when not specified
- [ ] Gracefully handles notification errors (logs warning, continues)
- [ ] Works when notifications disabled (skips notify, still waits)
- [ ] Console output shows wait message with duration
- [ ] Console output shows when wait completes
- [ ] `checkApprovalGate()` in cascade.ts calls handler for `"notify-wait"` action

### Test Plan

- [ ] Manual: Set `createStories: "suggest"` in config, run cascade headless
  - Notification should be sent
  - Console shows "Waiting Xs..."
  - After wait, cascade continues
- [ ] Manual: With `notify.enabled: false` → no notification sent, still waits
- [ ] Manual: Set `suggestWaitSeconds: 5` → waits only 5 seconds
- [ ] Manual: With invalid notify config → warning logged, continues after wait
- [ ] TypeScript compiles without errors (`bun run typecheck`)

### Scope

- **In:** `handleNotifyWait()` function, sleep helper, notification integration, console output
- **Out:** Notification config changes, new notify features, cascade integration changes (already done in TASK-013)

### Notes

**Why continue after notification error:**
If the notification system is down or misconfigured, we shouldn't block the build. The wait period still gives the user time to notice (if monitoring), and the cascade continues rather than failing.

**Console output format:**
```
[Approval] Notification sent for Create Stories
[Approval] Waiting 180s before proceeding with Create Stories...
[Approval] Wait complete, proceeding
```

**Notification message example:**
```
Title: Ralph: Create Stories
Body:
Proceeding with stories level

Proceeding in 180 seconds...
```

**Integration with existing notify system:**
Uses the same `sendNotification()` function and config (`aaa.config.json` notify section) as other Ralph notifications. No new configuration needed.
