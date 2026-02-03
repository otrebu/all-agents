## Task: Approval Evaluation Logic

**Story:** [STORY-001-artifact-approvals](../stories/STORY-001-artifact-approvals.md)

**Depends on:** [TASK-008-approval-types](./TASK-008-approval-types.md), [TASK-009-approval-config-loading](./TASK-009-approval-config-loading.md)

### Goal

Pure function that maps gate + config + context to an action, enabling cascade to decide how to handle each approval checkpoint.

### Context

With types (TASK-008) and config loading (TASK-009) in place, we need the core "brain" that evaluates what action to take at each approval gate. This is a pure function with no side effects - it just answers "what should I do?" based on:
- Which gate is being checked
- User's approval config
- Runtime context (TTY state, CLI flags)

The caller is responsible for executing the action (prompting, notifying, writing files, etc.).

### Plan

1. Add `ApprovalGate` type to `tools/src/lib/config/types.ts`:
   ```typescript
   /**
    * Approval gate names - artifact creation events that can trigger approval
    */
   type ApprovalGate =
     | "createRoadmap"
     | "createStories"
     | "createTasks"
     | "createSubtasks"
     | "createAtomicDocs"
     | "onDriftDetected"
     | "correctionTasks"
     | "promptChanges";

   const approvalGates = [
     "createRoadmap",
     "createStories",
     "createTasks",
     "createSubtasks",
     "createAtomicDocs",
     "onDriftDetected",
     "correctionTasks",
     "promptChanges",
   ] as const;
   ```

2. Export `ApprovalGate` and `approvalGates` from `tools/src/lib/config/index.ts`

3. Create new file `tools/src/commands/ralph/approvals.ts`:
   ```typescript
   import type { ApprovalGate, ApprovalsConfig } from "@tools/lib/config";

   /**
    * Actions that can result from approval evaluation
    */
   type ApprovalAction = "write" | "prompt" | "notify-wait" | "exit-unstaged";

   /**
    * Runtime context for approval evaluation
    */
   interface ApprovalContext {
     /** --force flag: skip all approval prompts */
     forceFlag: boolean;
     /** Whether running in TTY (interactive) mode */
     isTTY: boolean;
     /** --review flag: require all approval prompts */
     reviewFlag: boolean;
   }

   /**
    * Evaluate what action to take for an approval gate
    *
    * Pure function - no side effects. Caller executes the returned action.
    *
    * Action meanings:
    * - "write": proceed immediately, write artifact
    * - "prompt": show Y/n prompt, wait for user response
    * - "notify-wait": send notification, wait suggestWaitSeconds, continue
    * - "exit-unstaged": write as unstaged changes, exit cascade
    */
   function evaluateApproval(
     gate: ApprovalGate,
     config: ApprovalsConfig | undefined,
     context: ApprovalContext
   ): ApprovalAction {
     // 1. CLI overrides take precedence
     if (context.forceFlag) {
       return "write";
     }

     // 2. Get mode for this gate (runtime fallback to "suggest")
     let mode = config?.[gate] ?? "suggest";

     // 3. --review flag overrides mode to "always"
     if (context.reviewFlag) {
       mode = "always";
     }

     // 4. Map mode + TTY state to action
     switch (mode) {
       case "auto":
         return "write";

       case "suggest":
         return context.isTTY ? "write" : "notify-wait";

       case "always":
         return context.isTTY ? "prompt" : "exit-unstaged";

       default:
         // Unknown mode - safe fallback
         return "write";
     }
   }

   export {
     type ApprovalAction,
     type ApprovalContext,
     evaluateApproval,
   };
   ```

4. Add unit tests in `tools/tests/lib/approvals.test.ts`:
   - Test all mode × TTY combinations
   - Test CLI flag overrides
   - Test undefined config fallback

### Acceptance Criteria

- [ ] `ApprovalGate` type exported from `lib/config/types.ts` and `lib/config/index.ts`
- [ ] `approvalGates` const array exported (useful for iteration/validation)
- [ ] `ApprovalAction` type exported from `commands/ralph/approvals.ts`
- [ ] `ApprovalContext` interface exported from `commands/ralph/approvals.ts`
- [ ] `evaluateApproval()` function exported from `commands/ralph/approvals.ts`
- [ ] `--force` flag → always returns `"write"` regardless of mode/TTY
- [ ] `--review` flag → treats mode as `"always"`
- [ ] Unspecified gate (undefined in config) → defaults to `"suggest"` behavior
- [ ] Mode + TTY mapping:
  | Mode | TTY=true | TTY=false |
  |------|----------|-----------|
  | auto | write | write |
  | suggest | write | notify-wait |
  | always | prompt | exit-unstaged |
- [ ] Function is pure (no side effects, no I/O)

### Test Plan

- [ ] Test: `--force` returns `"write"` regardless of mode or TTY state
- [ ] Test: `--review` + TTY → `"prompt"`
- [ ] Test: `--review` + headless → `"exit-unstaged"`
- [ ] Test: `auto` mode → `"write"` for both TTY=true and TTY=false
- [ ] Test: `suggest` + TTY → `"write"`
- [ ] Test: `suggest` + headless → `"notify-wait"`
- [ ] Test: `always` + TTY → `"prompt"`
- [ ] Test: `always` + headless → `"exit-unstaged"`
- [ ] Test: undefined config (null/undefined) → defaults to `"suggest"` behavior
- [ ] Test: specific gate undefined in config → defaults to `"suggest"` behavior
- [ ] TypeScript compiles without errors (`bun run typecheck`)

### Scope

- **In:** Type definitions, pure evaluation function, unit tests
- **Out:** Actual prompting implementation, notification sending, git operations, cascade integration

### Notes

**Why pure function:**
- Easy to test (no mocks needed)
- Caller controls side effects
- Clear separation of "decision" from "execution"

**Why `approvalGates` const array:**
- Enables runtime iteration over all gates
- Useful for validation ("is this a valid gate name?")
- Single source of truth with the type

**Caller responsibility:**
The caller (cascade orchestration) handles:
- `"write"` → proceed to write artifact
- `"prompt"` → call TTY prompting function (separate task)
- `"notify-wait"` → call notify + sleep (separate task)
- `"exit-unstaged"` → call git workflow (separate task)

**Action meanings:**
| Action | Description |
|--------|-------------|
| `write` | Proceed immediately, write artifact |
| `prompt` | Show Y/n prompt in TTY, wait for explicit response |
| `notify-wait` | Send notification, wait `suggestWaitSeconds`, then continue |
| `exit-unstaged` | Write artifacts as unstaged git changes, write feedback file, exit cascade |
